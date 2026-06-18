"""
app/routers/metrics.py
----------------------
Métricas reais do painel (dashboard), agregadas por usuário: quantidade de
agentes, agentes ativos, conversas, mensagens trocadas e integrações ativas.

Tudo é filtrado pelos agentes do próprio usuário (multi-tenancy).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, auth
from ..database import get_db

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/overview")
def overview(
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_active_user),
):
    """Resumo numérico para os cards do dashboard."""
    uid = current_user.id

    agent_ids = [
        row[0]
        for row in db.query(models.Agent.id)
        .filter(models.Agent.owner_id == uid)
        .all()
    ]

    total_agents = len(agent_ids)
    active_agents = (
        db.query(models.Agent)
        .filter(models.Agent.owner_id == uid, models.Agent.status == "active")
        .count()
    )

    if agent_ids:
        conversations = (
            db.query(models.Conversation)
            .filter(models.Conversation.agent_id.in_(agent_ids))
            .count()
        )
        messages = (
            db.query(models.ChatMessage)
            .filter(models.ChatMessage.agent_id.in_(agent_ids))
            .count()
        )
        user_messages = (
            db.query(models.ChatMessage)
            .filter(
                models.ChatMessage.agent_id.in_(agent_ids),
                models.ChatMessage.role == "user",
            )
            .count()
        )
    else:
        conversations = messages = user_messages = 0

    integrations = (
        db.query(models.Integration)
        .filter(
            models.Integration.owner_id == uid,
            models.Integration.status == "connected",
        )
        .count()
    )

    return {
        "agents": total_agents,
        "active_agents": active_agents,
        "conversations": conversations,
        "messages": messages,
        "user_messages": user_messages,
        "integrations": integrations,
    }
