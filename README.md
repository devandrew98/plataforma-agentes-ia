# 🤖 Plataforma de Agentes IA

Plataforma **SaaS** para criar, treinar e publicar agentes de inteligência
artificial — com personalidade própria, bases de conhecimento (RAG), fluxos
visuais, memória de conversa e separação total por usuário.

Cada usuário tem sua própria conta e enxerga **apenas os seus** agentes e bases
de conhecimento.

---

## ✨ Principais recursos

- **Contas de usuário com login seguro (JWT)** — cada pessoa vê só os seus dados.
- **Criação de agentes por template** (Vendas, Suporte, Secretária, Marketing…) ou do zero.
- **Prompt de sistema** para definir a personalidade do agente.
- **Bases de conhecimento (RAG)** — suba PDFs/textos e o agente responde com base neles.
- **Construtor de fluxo visual** (arrastar e conectar blocos).
- **Chat de teste com memória** de conversa.
- **Tutorial guiado** dentro da plataforma para quem nunca criou um agente.
- **Modo demonstração** — funciona mesmo sem chave da OpenAI configurada.

---

## 🚀 Como rodar (jeito fácil — Windows)

1. Garanta que tenha instalado:
   - **Node.js 18+** → <https://nodejs.org>
   - **Python 3.11+** → <https://python.org>
2. Dê **dois cliques** no arquivo **`iniciar.bat`** na raiz do projeto.
   - Ele abre o backend e o frontend em duas janelas e o navegador em `http://localhost:3000`.
3. Crie sua conta na tela de login e comece a usar. 🎉

> Na primeira vez, o frontend instala as dependências automaticamente (pode levar alguns minutos).

---

## 🛠️ Como rodar (manual)

### Backend (FastAPI — porta 8000)

```bash
cd BACKEND
python -m venv venv            # apenas na primeira vez
venv\Scripts\activate          # Windows (use: source venv/bin/activate no Linux/Mac)
pip install -r requirements.txt
copy .env.exemplo .env         # configure as variáveis (veja abaixo)
python -m uvicorn app.main:app --reload --port 8000
```

Documentação interativa da API: <http://127.0.0.1:8000/docs>

### Frontend (Next.js — porta 3000)

```bash
cd frontend
npm install
npm run dev
```

App: <http://localhost:3000>

---

## ⚙️ Configuração (`BACKEND/.env`)

Copie `BACKEND/.env.exemplo` para `BACKEND/.env` e preencha:

| Variável          | Descrição                                                                 |
|-------------------|---------------------------------------------------------------------------|
| `OPENAI_API_KEY`  | Chave da OpenAI. **Sem ela, a plataforma roda em modo demonstração.**      |
| `OPENAI_MODEL`    | Modelo de chat (padrão `gpt-4o-mini`).                                     |
| `EMBEDDING_MODEL` | Modelo de embeddings para o RAG.                                          |
| `JWT_SECRET`      | Segredo para assinar os tokens de login. **Troque em produção.**          |
| `DATABASE_URL`    | Opcional. Padrão: SQLite local. Suporta PostgreSQL.                        |

O frontend usa `frontend/.env.local` com `NEXT_PUBLIC_API_URL` (padrão `http://127.0.0.1:8000`).

---

## 🔑 Login social (Google, Facebook, GitHub)

O login social é **opcional** e funciona assim que você cadastrar um app em cada
provedor e colar as credenciais no `BACKEND/.env`. Sem credenciais, os botões
mostram uma mensagem amigável de "ainda não configurado".

Passos gerais para cada provedor:

1. **Crie um app OAuth** no console do provedor.
2. **Cadastre a Redirect URI** exatamente como abaixo (use sua URL pública em produção):

   | Provedor  | Onde criar                                            | Redirect / Callback URI                          |
   |-----------|-------------------------------------------------------|--------------------------------------------------|
   | Google    | console.cloud.google.com → APIs e Serviços → Credenciais | `http://127.0.0.1:8000/auth/google/callback`   |
   | Facebook  | developers.facebook.com → Apps → Login do Facebook    | `http://127.0.0.1:8000/auth/facebook/callback`   |
   | GitHub    | github.com/settings/developers → OAuth Apps           | `http://127.0.0.1:8000/auth/github/callback`     |

3. **Copie o Client ID e o Client Secret** para o `BACKEND/.env`
   (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.).
4. Ajuste `OAUTH_BACKEND_URL` e `FRONTEND_URL` se não estiver usando as portas padrão.
5. Reinicie o backend. Pronto — os botões passam a funcionar.

> Em produção, troque as URLs `127.0.0.1`/`localhost` pelos seus domínios reais
> (ex.: `https://api.suaempresa.com/auth/google/callback`).

---

## 🔐 Como funciona a separação por usuário

- Ao se cadastrar/logar, o backend gera um **token JWT** assinado.
- O frontend guarda o token e o envia em todas as chamadas (`Authorization: Bearer ...`).
- Cada agente e base de conhecimento pertence a um `owner_id`. As consultas
  **filtram sempre pelo usuário autenticado**, então ninguém vê os dados de outro.

---

## 📚 Como criar um agente

Acesse o menu **Tutorial** dentro da plataforma para o passo a passo completo. Em resumo:

1. **Novo Agente** → escolha um template.
2. Ajuste o **prompt de sistema** (a personalidade).
3. (Opcional) Crie uma **Base de Conhecimento**, suba documentos e indexe.
4. Monte o **fluxo visual** no Studio do agente.
5. **Teste** a conversa no chat.
6. Mude o status para **Ativo** e integre aos seus canais.

---

## ☁️ Deploy em produção

A aplicação tem duas partes que podem ser publicadas separadamente.

### Variáveis de ambiente de produção

**Backend** (`BACKEND/.env` ou variáveis do provedor):

| Variável           | Exemplo                                              |
|--------------------|------------------------------------------------------|
| `OPENAI_API_KEY`   | `sk-...`                                              |
| `JWT_SECRET`       | um valor aleatório longo (ex.: `openssl rand -hex 32`) |
| `FRONTEND_ORIGINS` | `https://app.suaempresa.com` (separe múltiplas por vírgula) |
| `DATABASE_URL`     | `postgresql://user:senha@host:5432/banco` (recomendado em produção) |

**Frontend** (variável de build/host):

| Variável              | Exemplo                          |
|-----------------------|----------------------------------|
| `NEXT_PUBLIC_API_URL` | `https://api.suaempresa.com`     |

### Backend (ex.: Render, Railway, Fly.io)

1. Suba a pasta `BACKEND/`.
2. Build: `pip install -r requirements.txt`.
3. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. Defina as variáveis de ambiente acima. Use **PostgreSQL** (`DATABASE_URL`) para os dados não se perderem a cada deploy — as tabelas e migrações leves são criadas automaticamente no start.

### Frontend (ex.: Vercel)

1. Importe a pasta `frontend/`.
2. Defina `NEXT_PUBLIC_API_URL` apontando para a URL pública do backend.
3. A Vercel detecta o Next.js e roda `npm run build` automaticamente.

### ✅ Checklist antes de subir

- [ ] `JWT_SECRET` definido com valor secreto e aleatório (não use o padrão).
- [ ] `FRONTEND_ORIGINS` com o domínio real do frontend (CORS).
- [ ] `NEXT_PUBLIC_API_URL` apontando para o backend público (HTTPS).
- [ ] `DATABASE_URL` de PostgreSQL configurado (persistência).
- [ ] `OPENAI_API_KEY` válida (ou aceitar o modo demonstração).
- [ ] `.env`, `venv/`, `*.db` e `node_modules/` fora do controle de versão (já no `.gitignore`).

---

## 🧱 Estrutura do projeto

```
PLATAFORMA_AGENTES_IA/
├── iniciar.bat            # inicializador (duplo clique no Windows)
├── README.md
├── BACKEND/               # API FastAPI
│   └── app/
│       ├── main.py        # app + rotas + migrações leves
│       ├── auth.py        # JWT + senhas
│       ├── models.py      # tabelas (User, Agent, KB, Conversation...)
│       ├── routers/       # auth, agents, kb
│       ├── conversations/ # chat com memória + RAG
│       └── rag/           # indexação e busca de documentos
└── frontend/              # Next.js (App Router) + Tailwind
    └── src/
        ├── app/(app)/     # área logada (dashboard, agentes, kb, tutorial...)
        ├── app/(public)/  # landing + login
        ├── components/    # UI, flow builder, etc.
        └── lib/services/  # integração com a API
```

---

## 🆘 Problemas comuns

- **A tela aparece sem estilo / "não abre":** verifique se o frontend está rodando
  (`npm run dev`) e acesse `http://localhost:3000`.
- **Erro 401 / volta para o login:** seu token expirou — faça login novamente.
- **O agente responde com "Modo demonstração":** configure `OPENAI_API_KEY` no `BACKEND/.env` e reinicie o backend.
- **Porta ocupada:** feche outros processos nas portas 3000 (frontend) ou 8000 (backend).

---

Feito com 💜 — Plataforma de Agentes IA.
