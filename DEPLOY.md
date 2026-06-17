# 🚀 Como publicar o ARgent.ai (grátis, para fins acadêmicos)

Vamos usar duas plataformas gratuitas e confiáveis:

- **Backend (FastAPI) → [Render](https://render.com)**
- **Frontend (Next.js) → [Vercel](https://vercel.com)**

Ambas conectam direto ao seu GitHub (`devandrew98/plataforma-agentes-ia`) e
fazem deploy automático a cada `git push`.

> ⏱️ No plano grátis do Render, o backend "dorme" após ~15 min sem uso e demora
> ~30s para acordar na primeira chamada. É normal para demonstração acadêmica.

---

## Passo 0 — Enviar o código para o GitHub

No terminal, dentro da pasta do projeto:

```bash
git add .
git commit -m "Preparar projeto para deploy"
git push origin main
```

---

## Passo 1 — Backend no Render

1. Crie conta em **https://render.com** (pode entrar com o GitHub).
2. **New +** → **Blueprint** → selecione o repositório `plataforma-agentes-ia`.
   - O Render lê o arquivo `render.yaml` e já configura o serviço.
   - (Alternativa manual: **New + → Web Service**, Root Directory = `BACKEND`,
     Build = `pip install -r requirements.txt`,
     Start = `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.)
3. Em **Environment**, preencha:
   | Variável | Valor |
   |----------|-------|
   | `OPENAI_API_KEY` | sua chave da OpenAI |
   | `FRONTEND_URL` | (preencha depois com a URL da Vercel) |
   | `FRONTEND_ORIGINS` | (mesma URL da Vercel) |
   | `OAUTH_BACKEND_URL` | a URL deste backend (ex.: `https://argent-ai-backend.onrender.com`) |
   - `JWT_SECRET` é gerado sozinho. As variáveis de login social/pagamento são opcionais.
4. **Create** e aguarde o build. Ao terminar, copie a URL pública
   (ex.: `https://argent-ai-backend.onrender.com`). Teste: abra `…/health` → deve mostrar `{"status":"ok"}`.

---

## Passo 2 — Frontend na Vercel

1. Crie conta em **https://vercel.com** (entre com o GitHub).
2. **Add New… → Project** → importe `plataforma-agentes-ia`.
3. Em **Root Directory**, selecione **`frontend`**.
4. Em **Environment Variables**, adicione:
   | Variável | Valor |
   |----------|-------|
   | `NEXT_PUBLIC_API_URL` | a URL do backend no Render (ex.: `https://argent-ai-backend.onrender.com`) |
5. **Deploy**. Ao terminar, copie a URL (ex.: `https://argent-ai.vercel.app`).

---

## Passo 3 — Conectar os dois (importante!)

1. Volte ao **Render** → seu serviço → **Environment** e ajuste:
   - `FRONTEND_URL` = a URL da Vercel (ex.: `https://argent-ai.vercel.app`)
   - `FRONTEND_ORIGINS` = a mesma URL da Vercel
   - `OAUTH_BACKEND_URL` = a URL do próprio Render
2. Salve → o Render **redeploya** sozinho. Pronto: frontend e backend conversando.

---

## Passo 4 — Login social em produção (opcional)

Se for usar Google/GitHub/Facebook, **atualize as Redirect URIs** nos provedores
trocando `127.0.0.1:8000` pela URL do backend no Render. Exemplos:

- Google: `https://argent-ai-backend.onrender.com/auth/google/callback`
- GitHub: `https://argent-ai-backend.onrender.com/auth/github/callback`
- Facebook: `https://argent-ai-backend.onrender.com/auth/facebook/callback`

E preencha as variáveis `GOOGLE_CLIENT_ID`, etc. no Render.

---

## Passo 5 — Persistência de dados (opcional, recomendado)

No plano grátis com SQLite, os dados podem ser apagados a cada novo deploy.
Para manter contas e agentes salvos, crie um **PostgreSQL grátis** no Render:

1. **New + → PostgreSQL** (plano Free) → crie.
2. Copie a **Internal Database URL**.
3. No backend, adicione a variável `DATABASE_URL` com esse valor.
   - O código converte `postgres://` → `postgresql://` automaticamente.

---

## Pagamento (Mercado Pago) — opcional

Quando quiser ativar os botões "Assinar": pegue o **Access Token** em
`mercadopago.com.br/developers/panel` e adicione `MERCADOPAGO_ACCESS_TOKEN` no Render.

---

✅ Resumo das URLs finais:
- **App (use esta):** a URL da **Vercel**
- **API:** a URL do **Render**
