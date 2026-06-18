"""
app/routers/integrations.py
---------------------------
Integrações de canais (WhatsApp) + fluxo de "Solicitar nova integração".

WhatsApp usa a API oficial do Meta (Cloud API). O usuário conecta um agente a um
número informando phone_number_id, access_token e um verify_token (escolhido por
ele). O webhook recebe mensagens e responde automaticamente usando o agente.
Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
"""

import os
from typing import Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models, auth
from ..database import get_db

router = APIRouter(prefix="/integrations", tags=["Integrations"])

ADMIN_EMAIL = (os.getenv("ADMIN_EMAIL") or "andre.rodrigues1022@gmail.com").strip().lower()

# Versão da Graph API do WhatsApp (configurável). O Meta deprecia versões antigas.
GRAPH_VERSION = os.getenv("WHATSAPP_API_VERSION", "v21.0")

# Último status de entrega recebido (diagnóstico): sent/delivered/failed + erros.
_last_wa_status: dict = {}
# Última mensagem recebida + resultado do envio (raio-x do fluxo real).
_last_inbound: dict = {}
# Último POST cru recebido no webhook (qualquer um, mesmo sem match) — diagnóstico.
_last_raw_post: dict = {}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class WhatsAppConfig(BaseModel):
    agent_id: int
    phone_number_id: str
    access_token: str
    verify_token: str


class IntegrationOut(BaseModel):
    id: int
    channel: str
    status: str
    agent_id: Optional[int] = None

    class Config:
        from_attributes = True


class RequestCreate(BaseModel):
    channel: str
    message: Optional[str] = ""


# ---------------------------------------------------------------------------
# Integrações do usuário
# ---------------------------------------------------------------------------

@router.get("", response_model=list[IntegrationOut])
@router.get("/", response_model=list[IntegrationOut])
def list_integrations(db: Session = Depends(get_db), current_user=Depends(auth.get_current_active_user)):
    return (
        db.query(models.Integration)
        .filter(models.Integration.owner_id == current_user.id)
        .order_by(models.Integration.id.desc())
        .all()
    )


@router.post("/whatsapp", response_model=IntegrationOut)
def connect_whatsapp(payload: WhatsAppConfig, db: Session = Depends(get_db), current_user=Depends(auth.get_current_active_user)):
    agent = db.query(models.Agent).filter(models.Agent.id == payload.agent_id).first()
    if not agent or agent.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")

    # uma integração de WhatsApp por número (phone_number_id)
    integ = (
        db.query(models.Integration)
        .filter(
            models.Integration.owner_id == current_user.id,
            models.Integration.channel == "whatsapp",
            models.Integration.agent_id == payload.agent_id,
        )
        .first()
    )
    config = {
        "phone_number_id": payload.phone_number_id.strip(),
        "access_token": payload.access_token.strip(),
        "verify_token": payload.verify_token.strip(),
    }
    if integ:
        integ.config = config
        integ.status = "connected"
    else:
        integ = models.Integration(
            owner_id=current_user.id,
            agent_id=payload.agent_id,
            channel="whatsapp",
            status="connected",
            config=config,
        )
        db.add(integ)
    db.commit()
    db.refresh(integ)
    return integ


@router.delete("/{integration_id}")
def delete_integration(integration_id: int, db: Session = Depends(get_db), current_user=Depends(auth.get_current_active_user)):
    integ = db.query(models.Integration).filter(models.Integration.id == integration_id).first()
    if not integ or integ.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Integração não encontrada.")
    db.delete(integ)
    db.commit()
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Solicitações de nova integração (chegam ao admin)
# ---------------------------------------------------------------------------

@router.post("/requests")
def create_request(payload: RequestCreate, db: Session = Depends(get_db), current_user=Depends(auth.get_current_active_user)):
    req = models.IntegrationRequest(
        user_id=current_user.id,
        user_email=current_user.email,
        channel=payload.channel.strip(),
        message=(payload.message or "").strip(),
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Notifica o admin por e-mail (best-effort; não falha se SMTP não estiver setado).
    try:
        from ..email_utils import send_email

        send_email(
            ADMIN_EMAIL,
            f"[ARgent.ai] Nova solicitação de integração: {req.channel}",
            (
                f"Usuário: {req.user_email}\n"
                f"Canal: {req.channel}\n"
                f"Mensagem: {req.message or '(sem mensagem)'}\n"
                f"ID da solicitação: {req.id}\n"
            ),
        )
    except Exception:
        pass

    return {
        "ok": True,
        "id": req.id,
        "message": "Solicitação enviada! Nossa equipe vai analisar e entrar em contato.",
    }


@router.get("/requests")
def list_requests(db: Session = Depends(get_db), current_user=Depends(auth.get_current_active_user)):
    """Admin vê todas as solicitações; usuário comum vê só as suas."""
    q = db.query(models.IntegrationRequest).order_by(models.IntegrationRequest.id.desc())
    is_admin = (current_user.email or "").lower() == ADMIN_EMAIL
    if not is_admin:
        q = q.filter(models.IntegrationRequest.user_id == current_user.id)
    rows = q.all()
    return {
        "is_admin": is_admin,
        "requests": [
            {
                "id": r.id,
                "user_email": r.user_email,
                "channel": r.channel,
                "message": r.message,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


# ---------------------------------------------------------------------------
# Webhook do WhatsApp (Meta Cloud API)
# ---------------------------------------------------------------------------

@router.get("/whatsapp/webhook")
def whatsapp_verify(request: Request, db: Session = Depends(get_db)):
    """Verificação do webhook pelo Meta (responde o hub.challenge)."""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token:
        # confere se algum agente usa esse verify_token
        integ = (
            db.query(models.Integration)
            .filter(models.Integration.channel == "whatsapp")
            .all()
        )
        for i in integ:
            if (i.config or {}).get("verify_token") == token:
                return PlainTextResponse(challenge or "")
    raise HTTPException(status_code=403, detail="Verificação falhou.")


@router.post("/whatsapp/webhook")
async def whatsapp_incoming(request: Request, db: Session = Depends(get_db)):
    """Recebe mensagens do WhatsApp e responde com o agente vinculado."""
    from ..llm import generate, LLMError
    from ..rag.service import retrieve_context_with_sources
    from .. import crud

    body = await request.json()

    from datetime import datetime as _dt0
    _last_raw_post.clear()
    _last_raw_post.update({"at": _dt0.utcnow().isoformat(), "raw": str(body)[:800]})

    try:
        entry = (body.get("entry") or [])[0]
        change = (entry.get("changes") or [])[0]
        value = change.get("value") or {}

        # Captura status de entrega (sent/delivered/failed) para diagnóstico.
        statuses = value.get("statuses") or []
        if statuses:
            s = statuses[0]
            _last_wa_status.clear()
            _last_wa_status.update({
                "status": s.get("status"),
                "recipient_id": s.get("recipient_id"),
                "errors": s.get("errors"),
                "timestamp": s.get("timestamp"),
            })
            return {"status": "status_logged"}

        phone_number_id = (value.get("metadata") or {}).get("phone_number_id")
        messages = value.get("messages") or []
        if not messages or not phone_number_id:
            return {"status": "ignored"}
        msg = messages[0]
        from_number = msg.get("from")
        text = (msg.get("text") or {}).get("body", "")
        if not text:
            return {"status": "no_text"}
    except Exception:
        return {"status": "bad_payload"}

    # localizar integração pelo phone_number_id — a MAIS RECENTE primeiro
    # (evita pegar uma integração duplicada antiga com token vencido).
    integ = (
        db.query(models.Integration)
        .filter(models.Integration.channel == "whatsapp")
        .order_by(models.Integration.id.desc())
        .all()
    )
    target = next((i for i in integ if (i.config or {}).get("phone_number_id") == phone_number_id), None)
    if not target:
        return {"status": "no_integration"}

    agent = db.query(models.Agent).filter(models.Agent.id == target.agent_id).first()
    if not agent:
        return {"status": "no_agent"}

    owner = db.query(models.User).filter(models.User.id == target.owner_id).first()

    # montar prompt com RAG
    chat = [{"role": "system", "content": agent.system_prompt}]
    context, _ = retrieve_context_with_sources(text, agent_id=agent.id, top_k=4)
    if context:
        chat.append({"role": "system", "content": f"Use o CONTEXTO:\n{context}"})
    chat.append({"role": "user", "content": text})

    try:
        answer = generate(agent.provider, agent.model, chat, api_key=getattr(owner, "openai_api_key", None))
    except LLMError as e:
        answer = f"(erro ao gerar resposta: {e})"

    # enviar resposta via Graph API
    access_token = (target.config or {}).get("access_token")
    send_status = None
    send_info = None
    if not access_token:
        send_info = "sem access_token salvo"
    else:
        try:
            resp = requests.post(
                f"https://graph.facebook.com/{GRAPH_VERSION}/{phone_number_id}/messages",
                headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                json={
                    "messaging_product": "whatsapp",
                    "to": from_number,
                    "type": "text",
                    "text": {"body": answer},
                },
                timeout=20,
            )
            send_status = resp.status_code
            send_info = resp.text[:500]
        except Exception as e:
            send_info = f"excecao: {e}"

    from datetime import datetime as _dt
    _last_inbound.clear()
    _last_inbound.update({
        "from": from_number,
        "text": text,
        "phone_number_id": phone_number_id,
        "agent_id": agent.id,
        "answer_preview": (answer or "")[:120],
        "send_status": send_status,
        "send_info": send_info,
        "at": _dt.utcnow().isoformat(),
    })
    return {"status": "ok", "send_status": send_status, "send_info": send_info}


@router.get("/whatsapp/last-status")
def whatsapp_last_status():
    """Debug: último status de entrega (sent/delivered/failed) recebido do Meta."""
    return _last_wa_status or {"status": "nenhum status recebido ainda"}


@router.get("/whatsapp/debug")
def whatsapp_debug():
    """Raio-x: última mensagem recebida + resultado do envio + último status."""
    return {
        "last_raw_post": _last_raw_post or "NENHUM post recebido do Meta ainda",
        "last_inbound": _last_inbound or "nenhuma mensagem processada ainda",
        "last_status": _last_wa_status or "nenhum status recebido ainda",
    }


@router.post("/whatsapp/subscribe-waba")
def subscribe_waba(waba_id: str, db: Session = Depends(get_db)):
    """Inscreve o app na WABA (faz o Meta repassar as mensagens reais). Usa o
    access_token já salvo na integração. Endpoint utilitário/diagnóstico."""
    integ = (
        db.query(models.Integration)
        .filter(models.Integration.channel == "whatsapp")
        .order_by(models.Integration.id.desc())
        .first()
    )
    if not integ:
        return {"error": "nenhuma integração whatsapp salva"}
    token = (integ.config or {}).get("access_token")
    if not token:
        return {"error": "integração sem access_token"}
    try:
        resp = requests.post(
            f"https://graph.facebook.com/{GRAPH_VERSION}/{waba_id}/subscribed_apps",
            headers={"Authorization": f"Bearer {token}"},
            timeout=20,
        )
        return {"status_code": resp.status_code, "body": resp.text[:500]}
    except Exception as e:
        return {"error": str(e)}
