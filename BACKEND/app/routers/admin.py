"""
app/routers/admin.py
--------------------
Painel de administração — visível apenas para o e-mail definido em ADMIN_EMAIL.
Permite ver estatísticas da plataforma, usuários e solicitações de integração.
"""

import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, auth
from ..database import get_db

router = APIRouter(prefix="/admin", tags=["Admin"])

ADMIN_EMAIL = (os.getenv("ADMIN_EMAIL") or "andre.rodrigues1022@gmail.com").strip().lower()


def require_admin(current_user=Depends(auth.get_current_active_user)):
    if (current_user.email or "").lower() != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador.")
    return current_user


class StatusUpdate(BaseModel):
    status: str


@router.get("/stats")
def stats(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    return {
        "users": db.query(func.count(models.User.id)).scalar() or 0,
        "agents": db.query(func.count(models.Agent.id)).scalar() or 0,
        "active_agents": db.query(func.count(models.Agent.id)).filter(models.Agent.status == "active").scalar() or 0,
        "knowledge_bases": db.query(func.count(models.KnowledgeBase.id)).scalar() or 0,
        "integrations": db.query(func.count(models.Integration.id)).scalar() or 0,
        "pending_requests": db.query(func.count(models.IntegrationRequest.id)).filter(models.IntegrationRequest.status == "pendente").scalar() or 0,
    }


@router.get("/users")
def list_users(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    users = db.query(models.User).order_by(models.User.id.desc()).all()
    result = []
    for u in users:
        agent_count = db.query(func.count(models.Agent.id)).filter(models.Agent.owner_id == u.id).scalar() or 0
        result.append({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "company": u.company,
            "provider": u.provider,
            "agents": agent_count,
            "has_own_key": bool(u.openai_api_key),
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return result


@router.get("/requests")
def list_requests(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    rows = db.query(models.IntegrationRequest).order_by(models.IntegrationRequest.id.desc()).all()
    return [
        {
            "id": r.id,
            "user_email": r.user_email,
            "channel": r.channel,
            "message": r.message,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.patch("/requests/{request_id}")
def update_request(request_id: int, payload: StatusUpdate, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    req = db.query(models.IntegrationRequest).filter(models.IntegrationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")
    req.status = payload.status
    db.commit()
    return {"ok": True, "status": req.status}
