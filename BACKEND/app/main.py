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
allowed_origins = _env_origins or _default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
app.include_router(conversations_router)


@app.get("/health")
def health():
    return {"status": "ok"}