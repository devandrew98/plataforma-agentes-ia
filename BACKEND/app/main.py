from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import agents
from .rag.routes import router as rag_router
from .conversations.routes import router as conversations_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Plataforma Agentes IA")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router)
app.include_router(rag_router)
app.include_router(conversations_router)


@app.get("/health")
def health():
    return {"status": "ok"}