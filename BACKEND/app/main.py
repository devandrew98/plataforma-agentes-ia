import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, run_lightweight_migrations
from .routers import agents
from .routers.auth import router as auth_router
from .routers.kb import router as kb_router
from .routers.billing import router as billing_router
from .routers.integrations import router as integrations_router
from .routers.admin import router as admin_router
from .routers.metrics import router as metrics_router
from .routers.public import router as public_router
from .conversations.routes import router as conversations_router

Base.metadata.create_all(bind=engine)
run_lightweight_migrations()

app = FastAPI(title="Plataforma Agentes IA")

# Origens permitidas (CORS). Em desenvolvimento usamos localhost; em produção,
# defina FRONTEND_ORIGINS no .env com as URLs separadas por vírgula, por exemplo:
#   FRONTEND_ORIGINS=https://app.suaempresa.com,https://www.suaempresa.com
_default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
_env_origins = [
    o.strip() for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()
]
# Sempre incluímos os defaults (localhost) + os do .env, sem duplicar.
allowed_origins = list(dict.fromkeys(_default_origins + _env_origins))

# Além das origens exatas, liberamos por regex qualquer subdomínio .vercel.app
# (a Vercel gera várias URLs por projeto: produção, preview e por deploy).
# Pode customizar com FRONTEND_ORIGIN_REGEX no .env.
_origin_regex = os.getenv("FRONTEND_ORIGIN_REGEX") or r"https://.*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(agents.router)
app.include_router(kb_router)
app.include_router(billing_router)
app.include_router(integrations_router)
app.include_router(admin_router)
app.include_router(metrics_router)
app.include_router(public_router)
app.include_router(conversations_router)


@app.get("/health")
def health():
    return {"status": "ok"}