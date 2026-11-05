// Gera um token temporário (10 minutos) da Azure Speech para o navegador.
// A chave fica guardada só aqui no servidor, nas variáveis de ambiente da Vercel.
module.exports = async (req, res) => {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  res.setHeader("Cache-Control", "no-store");

  if (!key || !region) {
    return res.status(500).json({ error: "Configure AZURE_SPEECH_KEY e AZURE_SPEECH_REGION na Vercel." });
  }

  try {
    const r = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": key, "Content-Length": "0" }
    });
    if (!r.ok) {
      return res.status(502).json({ error: `A Azure recusou a chave (código ${r.status}). Confira a chave e a região.` });
    }
    const token = await r.text();
    return res.status(200).json({ token, region });
  } catch (e) {
    return res.status(502).json({ error: "Não foi possível falar com a Azure." });
  }
};
