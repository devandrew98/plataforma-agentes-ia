"""
app/routers/metrics.py
----------------------
Métricas reais do painel (dashboard), agregadas por usuário: quantidade de
agentes, agentes ativos, conversas, mensagens trocadas e integrações ativas.

Tudo é filtrado pelos agentes do próprio usuário (multi-tenancy).
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
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

    # Agentes mais usados (por nº de mensagens).
    top_agents = []
    if agent_ids:
        rows = (
            db.query(
                models.Agent.id,
                models.Agent.name,
                func.count(models.ChatMessage.id),
            )
            .outerjoin(models.ChatMessage, models.ChatMessage.agent_id == models.Agent.id)
            .filter(models.Agent.owner_id == uid)
            .group_by(models.Agent.id, models.Agent.name)
            .order_by(func.count(models.ChatMessage.id).desc())
            .limit(5)
            .all()
        )
        top_agents = [{"id": r[0], "name": r[1], "messages": int(r[2])} for r in rows]

    # Consumo de IA (estimativa simples): ~300 tokens por mensagem, preço
    # médio combinado ~US$ 0,0004 / 1k tokens (gpt-4o-mini).
    est_tokens = messages * 300
    est_cost_usd = round(est_tokens / 1000 * 0.0004, 4)

    return {
        "agents": total_agents,
        "active_agents": active_agents,
        "conversations": conversations,
        "messages": messages,
        "user_messages": user_messages,
        "integrations": integrations,
        "top_agents": top_agents,
        "estimated_tokens": est_tokens,
        "estimated_cost_usd": est_cost_usd,
    }


@router.get("/messages-daily")
def messages_daily(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_active_user),
):
    """Série de mensagens por dia (últimos N dias) para o gráfico do dashboard."""
    days = max(1, min(days, 30))
    uid = current_user.id

    agent_ids = [
        row[0]
        for row in db.query(models.Agent.id)
        .filter(models.Agent.owner_id == uid)
        .all()
    ]

    today = datetime.utcnow().date()
    start = today - timedelta(days=days - 1)

    counts: dict[str, int] = {}
    if agent_ids:
        rows = (
            db.query(
                func.date(models.ChatMessage.created_at),
                func.count(models.ChatMessage.id),
            )
            .filter(models.ChatMessage.agent_id.in_(agent_ids))
            .filter(
                models.ChatMessage.created_at
                >= datetime(start.year, start.month, start.day)
            )
            .group_by(func.date(models.ChatMessage.created_at))
            .all()
        )
        for d, c in rows:
            counts[str(d)] = int(c)

    series = []
    for i in range(days):
        day = start + timedelta(days=i)
        key = day.isoformat()
        series.append({"date": key, "count": counts.get(key, 0)})

    return {"days": days, "series": series}
