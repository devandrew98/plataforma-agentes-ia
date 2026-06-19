"""
app/routers/public.py
---------------------
Chat público de um agente — SEM autenticação. Só funciona para agentes
"publicados" (status == "active"). É o que permite o link público
(`/chat/{id}`) e o widget embutível em sites de terceiros.

Não expõe o system_prompt nem dados do dono; apenas nome, descrição e a
resposta do agente. As conversas são persistidas (contam nas métricas).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models, crud
from ..database import get_db
from ..llm import generate, LLMError
from ..rag.service import retrieve_context_with_sources

router = APIRouter(prefix="/public", tags=["Public"])


class PublicChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None


def _published_agent(db: Session, agent_id: int):
    agent = db.query(models.Agent).filter(models.Agent.id == agent_id).first()
    if not agent or agent.status != "active":
        return None
    return agent


@router.get("/agents/{agent_id}")
def public_agent(agent_id: int, db: Session = Depends(get_db)):
    """Dados públicos mínimos do agente (para a tela de chat)."""
    agent = _published_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não disponível.")
    return {"id": agent.id, "name": agent.name, "description": agent.description or ""}


@router.post("/agents/{agent_id}/chat")
def public_chat(agent_id: int, payload: PublicChatRequest, db: Session = Depends(get_db)):
    """Conversa pública com o agente publicado (com RAG + memória da conversa)."""
    agent = _published_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não disponível.")

    text = (payload.message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Mensagem vazia.")

    # garante uma conversa (continuidade via conversation_id devolvido)
    conversation_id = payload.conversation_id
    if conversation_id is not None:
        conv = crud.get_conversation(db, conversation_id)
        if not conv or conv.agent_id != agent.id:
            conversation_id = None
    if conversation_id is None:
        conv = crud.create_conversation(db, agent_id=agent.id, title="Chat público")
        conversation_id = conv.id

    messages = [{"role": "system", "content": agent.system_prompt}]

    from ..flow_runtime import flow_to_instructions
    roteiro = flow_to_instructions(agent.flow)
    if roteiro:
        messages.append({"role": "system", "content": roteiro})

    context, sources = retrieve_context_with_sources(text, agent_id=agent.id, top_k=4)
    if context:
        messages.append(
            {
                "role": "system",
                "content": (
                    "Responda usando o CONTEXTO abaixo. Se não houver a resposta, "
                    "diga que não encontrou no material.\n\n" + context
                ),
            }
        )

    for m in crud.get_last_messages(db, agent.id, conversation_id=conversation_id, limit=10):
        if m.role in ("user", "assistant"):
            messages.append({"role": m.role, "content": m.content})

    messages.append({"role": "user", "content": text})

    owner = db.query(models.User).filter(models.User.id == agent.owner_id).first()
    try:
        answer = generate(
            agent.provider,
            agent.model,
            messages,
            api_key=getattr(owner, "openai_api_key", None),
        )
    except LLMError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar resposta: {e}")

    crud.add_message(db, agent.id, conversation_id, "user", text)
    crud.add_message(db, agent.id, conversation_id, "assistant", answer)

    return {"answer": answer, "conversation_id": conversation_id, "sources": sources}
