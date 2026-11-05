// IA do curso da Anastasia (Gemini, plano gratuito do Google). Tudo em russo, conteúdo em português do Brasil.
// Modos:
//   chat     -> o "Gabriel" (IA) conversa em português sobre o tema de uma unidade (aba Recursos)
//   feedback -> a professora Esperança corrige a conversa, frase por frase
//   coach    -> a professora Esperança olha o seu progresso e sugere o que fazer
//   prep     -> prepara uma frase do Treino livre (traduz ou corrige)
//   pronfb   -> explica a nota de pronúncia de uma frase do Treino livre
// A chave fica só aqui no servidor, na variável GEMINI_API_KEY da Vercel.

// Quem é a aluna. Edite este texto quando os objetivos dela mudarem.
const ALUNA = `Ученица: Анастасия, молодая девушка из России (Кропоткин). Она учит бразильский португальский почти с нуля (уровень A1), чтобы разговаривать с Габриэлем, бразильцем, с которым у неё отношения на расстоянии. Они общаются сообщениями, голосовыми, звонками и видеозвонками; между ними около 11 500 км и 6 часов разницы во времени.
Габриэль в ответ учит русский, поэтому они помогают друг другу.
Она занимается в своём темпе. Ей нужна подробная проверка произношения: по фразам, что получилось, что нет и какой звук вызвал ошибку, всегда с примерным произношением кириллицей.
Ей удобнее, когда её ведут шаг за шагом, по одной вещи за раз.`;

const ESTILO_PRON = "примерное произношение кириллицей для русских, слоги через дефис, ударный слог ЗАГЛАВНЫМИ, как в курсе: о-бри-ГА-да, ТУ-ду БЕЙН, бом ДЖИ-а, НАУН (R в начале слова и RR пиши как Х, T и D перед «и» как Ч и ДЖ, носовые как -АУН, -ЕЙН)";

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Используй POST." });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "Нужно добавить GEMINI_API_KEY в Vercel, чтобы включить ИИ." });

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const mode = ["chat", "feedback", "coach", "prep", "pronfb"].includes(body.mode) ? body.mode : "chat";
  const clip = (s, n) => String(s == null ? "" : s).slice(0, n);
  const unit = body.unit || {};
  const progress = clip(body.progress, 3000);
  const history = (Array.isArray(body.history) ? body.history : []).slice(-30)
    .map(m => ({ who: m.who === "g" ? "g" : "a", text: clip(m.text, 600), pron: clip(m.pron, 600), pt: clip(m.pt, 600) }))
    .filter(m => m.text.trim());
  const list = (x, n, len) => (Array.isArray(x) ? x : []).slice(0, n).map(v => clip(v, len)).filter(Boolean);
  const frases = list(unit.chunks, 20, 80).join(" | ");
  const anteriores = list(unit.prev, 12, 60).join("; ");
  const gTurns = history.filter(m => m.who === "g").length;

  const unidade = `Модуль ${clip(unit.n, 4)} курса "Português para Anastasia": ${clip(unit.pt, 80)}.
Сцена: ${clip(unit.scene, 400)}
Цель упражнения: ${clip(unit.goal, 300)}
Грамматическая модель модуля: ${clip(unit.patT, 120)}: ${clip(unit.patF, 160)}
Фразы, которые она учит в этом модуле: ${frases}${anteriores ? `\nМодули, которые она уже прошла: ${anteriores}` : ""}`;

  let system, turns;

  if (mode === "prep") {
    system = `Ты учительница Эсперанса, бразильянка, преподаёшь бразильский португальский Анастасии, русской ученице уровня A1. Она написала текст, чтобы потренировать произношение вне модулей курса.

Если текст на русском, переведи его на естественный и простой бразильский португальский, как сказал бы бразилец в обычном разговоре.
Если текст на португальском, исправь орфографию и грамматику, сохранив смысл; если всё правильно, оставь как есть.
Если языки смешаны, пойми намерение и дай фразу на португальском.
Коротко, до 200 символов. Без эмодзи.

Отвечай ВСЕГДА только JSON, без текста до или после:
{"ru": "фраза на бразильском португальском", "pron": "${ESTILO_PRON}", "pt": "перевод на русский", "nota": "если ты перевела или исправила что-то, одна короткая фраза по-русски с объяснением (новое слово и его значение или исправленная ошибка); иначе пустая строка"}
Не используй тире.`;
    turns = [{ role: "user", content: `Текст: ${clip(body.text, 300)}` }];
  } else if (mode === "pronfb") {
    const t = body.target || {}, rs = body.result || {};
    const words = (Array.isArray(rs.words) ? rs.words : []).slice(0, 40).map(w => `${clip(w.w, 40)} (${clip(w.s, 4)})`).join(", ");
    const low = (Array.isArray(rs.low) ? rs.low : []).slice(0, 12).map(x => clip(x, 60)).join("; ");
    system = `Ты учительница Эсперанса, преподаёшь бразильский португальский Анастасии, русской ученице уровня A1. Она попыталась сказать фразу на португальском, и система оценки произношения поставила оценки ниже, от 0 до 100. Помоги ей поправить произношение, по-русски, практично и ободряюще.

Объясни, что получилось хорошо, в чём главная проблема (в каком слове и каком звуке) и как это исправить, используя ${ESTILO_PRON}.
Транскрипция показывает, что поняло распознавание речи: если она отличается от фразы, разница указывает на звук, который получился неправильно. Низкие оценки фонем показывают точный звук.
Если оценка высокая, похвали и дай совет, как звучать естественнее, например про ритм или интонацию.

Отвечай ВСЕГДА только JSON, без текста до или после:
{"analise": "две или три фразы", "passos": ["до 3 коротких конкретных шагов, например: послушай медленно слово X, повтори только слог Y три раза, потом скажи всю фразу"], "foco": "главный звук или правило для тренировки, в нескольких словах, или пустая строка, если фраза принята"}
Не используй тире и эмодзи.`;
    turns = [{ role: "user", content: `Фраза: ${clip(t.ru, 300)}
Примерное произношение: ${clip(t.pr, 300)}
Перевод: ${clip(t.pt, 300)}
Общая оценка: ${clip(rs.score, 4)}${rs.ok ? " (принято)" : ""}${rs.acc != null ? `. Точность ${clip(rs.acc, 4)}, беглость ${clip(rs.flu, 4)}, полнота ${clip(rs.comp, 4)}` : ""}
Распознавание поняло: ${clip(rs.heard, 300)}
Оценка по словам: ${words}${low ? `\nЗвуки с низкой оценкой: ${low}` : ""}` }];
  } else if (mode === "coach") {
    system = `Ты учительница Эсперанса, преподаёшь бразильский португальский Анастасии в курсе "Português para Anastasia". Говори по-русски, тепло и по делу, как тренер, который хорошо знает ученицу.

${ALUNA}

В курсе 12 модулей уровня A1 (в каждом: Сцена, Блоки, Запомни, Модель, Ответы, Практика с шэдоуингом и диалогом вслух, Повторение, Итоги и Экзамен, где нужно 70% для сдачи), разговор с ИИ-Габриэлем и Свободная тренировка во вкладке Ресурсы, интервальное повторение карточек, вкладка Звуки с правилами произношения и проверка произношения через микрофон у всех фраз.

На основе присланного прогресса дай короткие конкретные советы на следующие шаги, связанные с целью разговаривать с Габриэлем. Используй данные: фразы с низкой оценкой, слабые звуки, ошибки последнего разговора, карточки на повторение и текущий модуль. Если данных мало, подскажи, с чего начать.

Отвечай ВСЕГДА только одним JSON-объектом, без текста до или после:
{"saudacao": "короткая мотивирующая фраза со ссылкой на что-то реальное из прогресса", "sugestoes": [{"titulo": "до 6 слов", "texto": "одна или две фразы: что именно сделать и зачем", "acao": "одно из: unit:N (открыть модуль N), cards (повторить карточки), sounds (вкладка Звуки) или пусто"}], "frase": {"ru": "полезная фраза на бразильском португальском, чтобы сказать Габриэлю сегодня", "pron": "${ESTILO_PRON}", "pt": "перевод на русский"}}
Дай от 2 до 4 советов. Не используй тире и эмодзи.`;
    turns = [{ role: "user", content: `Мой прогресс сейчас:\n${progress || "(пока нет данных: я только начинаю)"}\n\nЧто посоветуешь?` }];
  } else {
    system = mode === "chat" ? `Ты ведёшь разговорное упражнение на бразильском португальском в курсе "Português para Anastasia". Ты играешь Габриэля, дружелюбного бразильца, но ведёшь себя как учитель по ту сторону: у упражнения есть начало, середина и конец.

Ученица: Анастасия, русская, уровень A1, учит португальский, чтобы по-настоящему разговаривать с Габриэлем.

${unidade}

Как вести:
1. Оставайся в сцене и цели этого модуля. Каждый твой вопрос должен заставлять её использовать фразы и модель этого модуля.
2. Говори только на простом бразильском португальском, максимум две короткие фразы за раз, со словами этого и прошлых модулей. Один вопрос за раз.
3. Если она уходит от темы, ответь коротко и верни её к упражнению.
4. Разговор короткий: 4–6 её ответов. Когда цель модуля отработана или на её 6-м ответе, естественно попрощайся и поставь "fim": true. До этого "fim": false.
5. Ошибки не прерывают разговор. Никогда не говори по-португальски, что она ошиблась, не проси повторить из-за ошибки и не задавай тот же вопрос заново. Пойми, что она хотела сказать, и продолжай разговор.
6. Исправляй как хороший учитель в живом разговоре: в своём ответе естественно используй правильную форму того, что она сказала (например, если она скажет "eu está bem", можешь ответить "Você está bem? Que bom! Eu também estou bem."), а объяснение ошибки пиши только в поле "dica", которое она читает.
7. Её реплики приходят через распознавание речи: игнорируй пунктуацию, заглавные буквы и отсутствие диакритики (ã, é, ç). Никогда не исправляй запятые, точки, заглавные буквы и надстрочные знаки; исправляй только слова, окончания, порядок и выбор лексики. Проси повторить (Pode repetir, por favor?) только если понять её невозможно.
8. Если она говорит или пишет по-русски, продолжай на простом португальском, используя в ответе то, как это сказать по-португальски, и покажи полную фразу в поле "dica".
9. Используй бразильский вариант (você, a gente, tá), а не европейский. Без эмодзи.

Поля "pron" и "pt" обязательны в КАЖДОМ ответе, без исключений.
Отвечай ВСЕГДА только JSON, без текста до или после:
{"ru": "твоя реплика на бразильском португальском", "pron": "${ESTILO_PRON}", "pt": "перевод на русский", "dica": "если в её последней реплике была ошибка в португальском, короткое исправление по-русски в формате: Ты сказала X. Правильно Y, потому что Z. Если ошибки не было, пустая строка", "dica_ru": "если есть dica, вся её фраза, исправленная на португальском; иначе пустая строка", "dica_pron": "если есть dica, ${ESTILO_PRON} исправленной фразы; иначе пустая строка", "fim": false}`
    : `Ты учительница Эсперанса, преподаёшь бразильский португальский Анастасии в курсе "Português para Anastasia". Она только что сделала голосовое разговорное упражнение с Габриэлем (ИИ) в этом модуле, и теперь ты исправляешь её, по-русски.

${ALUNA}

${unidade}

Исправляй фразу за фразой, как она любит. Никогда не исправляй пунктуацию, заглавные буквы и надстрочные знаки. Учти, что её реплики пришли из автоматического распознавания речи: ошибка в написании может означать неправильно произнесённый звук. Оцени также, использовала ли она фразы и модель модуля.

Отвечай ВСЕГДА только JSON, без текста до или после:
{"elogio": "одна фраза о том, что у неё получилось хорошо", "erros": [{"disse": "что она сказала", "certo": "правильная форма на португальском", "pron": "${ESTILO_PRON}", "som": "звук или правило, из-за которого ошибка, в нескольких словах (например: носовой ão, R в начале, род, спряжение глагола)", "explica": "короткое объяснение по-русски"}], "sugestoes": ["два или три коротких совета, что потренировать сейчас в курсе"], "resumo": "одна фраза о главном фокусе до следующего разговора"}
Максимум 6 ошибок; если ошибок нет, пустой список. Не используй тире.${progress ? `\n\nТекущий прогресс ученицы в курсе, чтобы направить советы:\n${progress}` : ""}`;

    turns = [{ role: "user", content: "[НАЧАЛО] Начни разговор сейчас, как Габриэль." }];
    for (const m of history) {
      const t = m.who === "g"
        ? { role: "user", content: `Анастасия (распознанная речь): ${m.text}` }
        : { role: "model", content: JSON.stringify({ ru: m.text, pron: m.pron || "", pt: m.pt || "", dica: "", dica_ru: "", dica_pron: "", fim: false }) };
      const last = turns[turns.length - 1];
      if (last.role === t.role) last.content += "\n" + t.content; else turns.push(t);
    }
    const tail = mode === "feedback"
      ? "[КОНЕЦ] Разговор окончен. Сделай полный разбор сейчас."
      : turns[turns.length - 1].role === "model" ? "(Анастасия промолчала. Продолжи другим простым вопросом упражнения.)"
      : gTurns >= 6 ? `(Это был её ответ номер ${gTurns}. Закончи сейчас естественным прощанием и "fim": true.)`
      : gTurns > 0 ? `(Ответ ${gTurns} из максимум 6.)` : null;
    if (tail) {
      const last = turns[turns.length - 1];
      if (last.role === "user") last.content += "\n" + tail; else turns.push({ role: "user", content: tail });
    }
  }

  // Na conversa, o modelo leve (mais rápido) vem primeiro; na correção e nas sugestões, o completo.
  const models = (mode === "chat"
    ? [process.env.GEMINI_MODEL_RAPIDO, "gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.5-flash"]
    : [process.env.GEMINI_MODEL, "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash"])
    .filter((m, i, arr) => m && arr.indexOf(m) === i);
  const payload = {
    systemInstruction: { parts: [{ text: system }] },
    contents: turns.map(t => ({ role: t.role, parts: [{ text: t.content }] })),
    generationConfig: { temperature: mode === "chat" ? 0.8 : 0.5, responseMimeType: "application/json", maxOutputTokens: mode === "chat" ? 1024 : 4096 }
  };
  const wait = ms => new Promise(ok => setTimeout(ok, ms));
  const start = Date.now();

  // Chama o Gemini tentando os modelos em ordem. Limite total de 40 segundos.
  async function gemini(modelList, payload, budget) {
    let r = { ok: false }, j = {}, status = 0;
    outer: for (const model of modelList) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const left = budget - (Date.now() - start);
        if (left < 3000) { if (!status) status = 504; break outer; }
        try {
          r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(Math.min(20000, left))
          });
          j = await r.json().catch(() => ({}));
          status = r.status;
        } catch (e) {
          r = { ok: false }; j = {}; status = 504;
          break;
        }
        if (r.ok) break outer;
        if (status === 400 || status === 401 || status === 403) break outer;
        if ((status === 503 || status === 500) && attempt === 0) { await wait(700); continue; }
        break;
      }
    }
    const cand = (j.candidates || [])[0] || {};
    return { ok: r.ok, status, text: ((cand.content || {}).parts || []).map(p => p.text || "").join("") };
  }
  const parseJSON = text => { const a = text.indexOf("{"), b = text.lastIndexOf("}"); try { return JSON.parse(text.slice(a, b + 1)); } catch (e) { return null; } };

  try {
    const g = await gemini(models, payload, 40000);
    if (!g.ok) {
      const status = g.status;
      const why = status === 400 || status === 403 ? "Ключ GEMINI_API_KEY отклонён. Проверь, что он скопирован полностью."
        : status === 404 ? "Модель Gemini не найдена. Укажи GEMINI_MODEL в Vercel."
        : status === 429 ? "Бесплатный лимит Gemini пока исчерпан. Подожди минуту и попробуй снова."
        : status === 503 || status === 500 ? "Gemini сейчас перегружен. Подожди несколько секунд и нажми Попробовать снова."
        : status === 504 ? "Gemini слишком долго отвечает. Нажми Попробовать снова."
        : `ИИ отклонил запрос (код ${status}).`;
      return res.status(502).json({ error: why });
    }
    const text = g.text;
    let out = parseJSON(text);
    if (!out) {
      if (!text.trim()) return res.status(502).json({ error: "ИИ прислал пустой ответ. Попробуй ещё раз." });
      out = mode === "chat" ? { ru: text.trim(), pron: "", pt: "", dica: "", fim: false }
        : mode === "prep" ? { ru: text.trim(), pron: "", pt: "", nota: "" }
        : mode === "pronfb" ? { analise: text.trim(), passos: [], foco: "" }
        : mode === "feedback" ? { elogio: "", erros: [], sugestoes: [], resumo: text.trim() }
        : { saudacao: text.trim(), sugestoes: [] };
    }
    if (mode === "chat" && out && out.ru && (!String(out.pron || "").trim() || !String(out.pt || "").trim())) {
      // Se a fala veio sem pronúncia ou tradução, pede só esses dois campos.
      const f = await gemini(models, {
        systemInstruction: { parts: [{ text: `Для присланной фразы на бразильском португальском дай ${ESTILO_PRON} и перевод на русский. Отвечай только JSON: {"pron": "...", "pt": "..."}. Без тире.` }] },
        contents: [{ role: "user", parts: [{ text: String(out.ru) }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 512 }
      }, 50000);
      const fj = f.ok ? parseJSON(f.text) : null;
      if (fj) { if (!String(out.pron || "").trim()) out.pron = fj.pron || ""; if (!String(out.pt || "").trim()) out.pt = fj.pt || ""; }
    }
    if (mode === "prep") {
      // Garante a frase em português (letras latinas, sem cirílico) mesmo se o modelo usar outro nome de campo.
      const lat = v => typeof v === "string" && /[a-zà-ÿ]/i.test(v) && !/[а-яё]/i.test(v);
      const pick = o => {
        if (!o || typeof o !== "object") return "";
        for (const k of ["ru", "pt_br", "portugues", "frase", "texto", "text"]) if (lat(o[k])) return o[k];
        for (const [k, v] of Object.entries(o)) { if (k === "nota") continue; if (lat(v)) return v; if (v && typeof v === "object") { const r = pick(v); if (r) return r; } }
        return "";
      };
      out.ru = String(pick(out)).trim();
      if (!out.ru) { console.log("prep sem frase em português:", text.slice(0, 800)); return res.status(502).json({ error: "Учительница не смогла составить фразу на португальском. Нажми Подготовить фразу ещё раз." }); }
    }
    return res.status(200).json(out);
  } catch (e) {
    return res.status(502).json({ error: "Сейчас не получается связаться с ИИ." });
  }
};
