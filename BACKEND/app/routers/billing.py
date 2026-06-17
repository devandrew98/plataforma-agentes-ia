"""
app/routers/billing.py
----------------------
Checkout de planos via Mercado Pago (ideal para o Brasil: PIX, boleto, cartão).

Funciona assim que MERCADOPAGO_ACCESS_TOKEN estiver no .env. Sem token, retorna
configured=false (o frontend mostra uma mensagem amigável).

Criar credenciais: https://www.mercadopago.com.br/developers/panel
"""

import os

import requests
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from .. import auth

router = APIRouter(prefix="/billing", tags=["Billing"])

FRONTEND_URL = (os.getenv("FRONTEND_URL") or "http://localhost:3000").rstrip("/")

# Preços definidos no servidor (não confiar no cliente).
PLAN_PRICES = {
    "pro": {"title": "Plano Pro", "price": 49.0},
    "business": {"title": "Plano Business", "price": 149.0},
}


class CheckoutRequest(BaseModel):
    plan: str


@router.post("/checkout")
def create_checkout(payload: CheckoutRequest, current_user=Depends(auth.get_current_active_user)):
    plan = (payload.plan or "").lower().strip()
    info = PLAN_PRICES.get(plan)
    if not info:
        return {"configured": False, "message": "Plano inválido."}

    token = (os.getenv("MERCADOPAGO_ACCESS_TOKEN") or "").strip()
    if not token:
        return {
            "configured": False,
            "message": (
                "Pagamento online ainda não configurado. Para ativar, adicione "
                "MERCADOPAGO_ACCESS_TOKEN no BACKEND/.env."
            ),
        }

    preference = {
        "items": [
            {
                "title": info["title"],
                "quantity": 1,
                "unit_price": info["price"],
                "currency_id": "BRL",
            }
        ],
        "payer": {"email": current_user.email},
        "back_urls": {
            "success": f"{FRONTEND_URL}/dashboard?assinatura=sucesso",
            "failure": f"{FRONTEND_URL}/precos?assinatura=falhou",
            "pending": f"{FRONTEND_URL}/dashboard?assinatura=pendente",
        },
        "auto_return": "approved",
        "metadata": {"plan": plan, "user_id": current_user.id},
    }

    try:
        resp = requests.post(
            "https://api.mercadopago.com/checkout/preferences",
            json=preference,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=20,
        )
        if resp.status_code not in (200, 201):
            return {"configured": False, "message": "Não foi possível criar o checkout. Verifique a credencial."}
        data = resp.json()
        url = data.get("init_point") or data.get("sandbox_init_point")
        if not url:
            return {"configured": False, "message": "Checkout criado, mas sem URL de pagamento."}
        return {"configured": True, "checkout_url": url}
    except Exception:
        return {"configured": False, "message": "Erro ao conectar ao gateway de pagamento."}
