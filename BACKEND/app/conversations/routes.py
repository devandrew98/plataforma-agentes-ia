from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas, crud
from app.auth import get_current_active_user
from app.llm import generate, LLMError
from app.rag.service import retrieve_context_with_sources

router = APIRouter(tags=["Conversations"])


# -------------------------
# CONVERSATIONS
# -------------------------
@router.post("/agents/{agent_id}/conversations", response_model=schemas.ConversationOut)
def create_conversation(
    agent_id: int,
    payload: schemas.ConversationCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_active_user),
):
    agent = crud.get_agent(db, agent_id)
    if not agent or agent.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")

    return crud.create_conversation(db, agent_id=agent.id, title=payload.title)


@router.get("/agents/{agent_id}/conversations", response_model=list[schemas.ConversationOut])
def list_conversations(
    agent_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_active_user),
):
    agent = crud.get_agent(db, agent_id)
    if not agent or agent.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")

    return crud.list_conversations(db, agent_id=agent.id, limit=limit)


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    ok = crud.delete_conversation(db, conversation_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    return {"deleted": True}


# -------------------------
# CHAT COM AGENTE + RAG + MEMÓRIA
# -------------------------
@router.post("/agents/{agent_id}/chat")
def chat(
    agent_id: int,
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_active_user),
):
    agent = crud.get_agent(db, agent_id)
    if not agent or agent.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")

    # garantir conversation_id
    conversation_id = payload.conversation_id

    if conversation_id is not None:
        conv = crud.get_conversation(db, conversation_id)
        if not conv or conv.agent_id != agent.id:
            raise HTTPException(
                status_code=404,
                detail="Conversation não encontrada para este agente."
            )
    else:
        conv = crud.create_conversation(db, agent_id=agent.id, title=None)
        conversation_id = conv.id

    messages = [{"role": "system", "content": agent.system_prompt}]

    from app.flow_runtime import flow_to_instructions
    roteiro = flow_to_instructions(agent.flow)
    if roteiro:
        messages.append({"role": "system", "content": roteiro})

    # RAG + fontes
    context, sources = retrieve_context_with_sources(
        payload.message,
        agent_id=agent.id,
        top_k=4
    )

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

    # memória automática do BD
    if payload.use_memory:
        last_msgs = crud.get_last_messages(
            db,
            agent.id,
            conversation_id=conversation_id,
            limit=payload.memory_limit
        )
        for m in last_msgs:
            if m.role in ("user", "assistant"):
                messages.append({"role": m.role, "content": m.content})
    else:
        for m in payload.history:
            if m.role in ("user", "assistant"):
                messages.append({"role": m.role, "content": m.content})

    # pergunta atual
    messages.append({"role": "user", "content": payload.message})

    # chama LLM e salva memória
    try:
        answer = generate(
            agent.provider,
            agent.model,
            messages,
            api_key=getattr(current_user, "openai_api_key", None),
        )

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
# MEMÓRIA: VER / LIMPAR
# -------------------------
@router.get("/conversations/{conversation_id}/memory", response_model=list[schemas.ChatMessageOut])
def get_conversation_memory(
    conversation_id: int,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    conv = crud.get_conversation(db, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    return crud.get_last_messages(
        db,
        agent_id=conv.agent_id,
        conversation_id=conv.id,
        limit=limit,
    )


@router.delete("/conversations/{conversation_id}/memory")
def clear_conversation_memory(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    conv = crud.get_conversation(db, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    crud.clear_messages(db, agent_id=conv.agent_id, conversation_id=conv.id)
    return {"cleared": True}