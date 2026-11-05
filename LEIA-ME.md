# Português para Anastasia · site do curso

O mesmo curso do Gabriel, ao contrário: interface em russo, conteúdo em português do Brasil, pronúncia aproximada em cirílico, correção de pronúncia em pt-BR (Azure) e a professora Esperança e o "Gabriel" de IA falando russo e português (Gemini).

## Arquivos
- `index.html`: o curso inteiro (12 unidades, cartões, sons, recursos, progresso).
- `api/token.js`: entrega o acesso temporário da Azure (igual ao do curso de russo).
- `api/chat.js`: a IA em russo (Gemini).
- `package.json`: identifica o projeto para a Vercel.

## Variáveis na Vercel (as mesmas chaves do curso de russo)
- `AZURE_SPEECH_KEY`: a Chave 1 da Azure.
- `AZURE_SPEECH_REGION`: `eastus`.
- `GEMINI_API_KEY`: a chave do Gemini.

As 5 horas gratuitas por mês da Azure e o limite gratuito do Gemini são divididos entre os dois sites.

## Para editar o perfil da aluna
Abra `api/chat.js` no GitHub e mude o texto `ALUNA` no começo do arquivo.
