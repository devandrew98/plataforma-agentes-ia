from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from . import schemas, crud
from .rag.routes import router as rag_router
from .rag.service import retrieve_context_with_sources
from .llm import generate, LLMError

# ✅ IMPORT CORRETO
from .conversations.routes import router as conversations_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Plataforma de Agentes IA", version="1.0.0")
app.include_router(rag_router)
app.include_router(conversations_router)


@app.get("/health")
def health():
    return {"status": "ok"}


# -------------------------
# AGENTS (CRUD)
# -------------------------
@app.post("/agents", response_model=schemas.AgentOut)
def create_agent(payload: schemas.AgentCreate, db: Session = Depends(get_db)):
    if crud.get_agent_by_name(db, payload.name.strip()):
        raise HTTPException(status_code=400, detail="Já existe um agente com esse nome.")
    return crud.create_agent(db, payload)


@app.get("/agents", response_model=list[schemas.AgentOut])
def list_agents(db: Session = Depends(get_db)):
    return crud.list_agents(db)


@app.get("/agents/{agent_id}", response_model=schemas.AgentOut)
def get_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = crud.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")
    return agent


@app.put("/agents/{agent_id}", response_model=schemas.AgentOut)
def update_agent(agent_id: int, payload: schemas.AgentUpdate, db: Session = Depends(get_db)):
    agent = crud.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")
    return crud.update_agent(db, agent, payload)


@app.delete("/agents/{agent_id}")
def delete_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = crud.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")
    crud.delete_agent(db, agent)
    return {"deleted": True}


# -------------------------
# CONVERSATIONS
# -------------------------
@app.post("/agents/{agent_id}/conversations", response_model=schemas.ConversationOut)
def create_conversation(agent_id: int, payload: schemas.ConversationCreate, db: Session = Depends(get_db)):
    agent = crud.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")
    return crud.create_conversation(db, agent_id=agent.id, title=payload.title)


@app.get("/agents/{agent_id}/conversations", response_model=list[schemas.ConversationOut])
def list_conversations(agent_id: int, limit: int = 50, db: Session = Depends(get_db)):
    agent = crud.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")
    return crud.list_conversations(db, agent_id=agent.id, limit=limit)


@app.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_conversation(db, conversation_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")
    return {"deleted": True}


# -------------------------
# CHAT COM AGENTE + RAG + MEMÓRIA (POR CONVERSA)
# -------------------------
@app.post("/agents/{agent_id}/chat")
def chat(agent_id: int, payload: schemas.ChatRequest, db: Session = Depends(get_db)):
    agent = crud.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")

    # 0) Garantir conversation_id
    conversation_id = payload.conversation_id
    if conversation_id is not None:
        conv = crud.get_conversation(db, conversation_id)
        if not conv or conv.agent_id != agent.id:
            raise HTTPException(status_code=404, detail="Conversation não encontrada para este agente.")
    else:
        conv = crud.create_conversation(db, agent_id=agent.id, title=None)
        conversation_id = conv.id

    messages = [{"role": "system", "content": agent.system_prompt}]

    # 1) RAG + fontes
    context, sources = retrieve_context_with_sources(payload.message, agent_id=agent.id, top_k=4)
    if context:
        messages.append({
            "role": "system",
            "content": (
                "Você deve responder usando o CONTEXTO abaixo. "
                "Se o contexto não tiver a resposta, diga claramente que não encontrou no material.\n\n"
                "No final da resposta, inclua uma seção 'Fontes:' listando os arquivos e trechos usados "
                "no formato: - arquivo (trecho X)\n\n"
                "CONTEXTO:\n"
                f"{context}"
            )
        })

    # 2) Memória automática do BD (por conversation)
    if payload.use_memory:
        last_msgs = crud.get_last_messages(db, agent.id, conversation_id=conversation_id, limit=payload.memory_limit)
        for m in last_msgs:
            if m.role in ("user", "assistant"):
                messages.append({"role": m.role, "content": m.content})
    else:
        for m in payload.history:
            if m.role in ("user", "assistant"):
                messages.append({"role": m.role, "content": m.content})

    # 3) Pergunta atual
    messages.append({"role": "user", "content": payload.message})

    # 4) LLM + salvar memória (por conversation)
    try:
        answer = generate(agent.provider, agent.model, messages)

        crud.add_message(db, agent.id, conversation_id, "user", payload.message)
        crud.add_message(db, agent.id, conversation_id, "assistant", answer)

        return {
            "agent_id": agent.id,
            "conversation_id": conversation_id,
            "answer": answer,
            "sources": sources,
            "memory_used": payload.use_memory,
            "memory_limit": payload.memory_limit,
        }
    except LLMError as e:
        raise HTTPException(status_code=500, detail=f"Erro no LLM: {str(e)}")


# -------------------------
# MEMÓRIA: VER / LIMPAR (POR CONVERSA)
# -------------------------
@app.get("/conversations/{conversation_id}/memory", response_model=list[schemas.ChatMessageOut])
def get_conversation_memory(conversation_id: int, limit: int = 20, db: Session = Depends(get_db)):
    conv = crud.get_conversation(db, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")
    return crud.get_last_messages(db, agent_id=conv.agent_id, conversation_id=conv.id, limit=limit)


@app.delete("/conversations/{conversation_id}/memory")
def clear_conversation_memory(conversation_id: int, db: Session = Depends(get_db)):
    conv = crud.get_conversation(db, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")
    crud.clear_messages(db, agent_id=conv.agent_id, conversation_id=conv.id)
    return {"cleared": True}