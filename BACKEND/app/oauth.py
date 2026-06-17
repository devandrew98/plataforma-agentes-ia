"""
app/oauth.py
------------
Login social (OAuth2 — authorization code flow) para Google, Facebook e GitHub.

Cada provedor precisa de credenciais (client_id/client_secret) definidas no .env.
Se não estiverem configuradas, o provedor é considerado "indisponível" e o fluxo
redireciona de volta ao login com uma mensagem clara.

Variáveis de ambiente relevantes:
  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
  FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET
  GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
  OAUTH_BACKEND_URL   (base pública do backend, ex.: http://127.0.0.1:8000)
  FRONTEND_URL        (base pública do frontend, ex.: http://localhost:3000)
"""

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode

import requests
from jose import JWTError, jwt

from app.auth import SECRET_KEY, ALGORITHM


BACKEND_URL = (os.getenv("OAUTH_BACKEND_URL") or "http://127.0.0.1:8000").rstrip("/")
FRONTEND_URL = (os.getenv("FRONTEND_URL") or "http://localhost:3000").rstrip("/")


# ---------------------------------------------------------------------------
# Registry de provedores
# ---------------------------------------------------------------------------

PROVIDERS = {
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "scope": "openid email profile",
        "client_id_env": "GOOGLE_CLIENT_ID",
        "client_secret_env": "GOOGLE_CLIENT_SECRET",
        "extra_authorize_params": {"access_type": "online", "prompt": "select_account"},
    },
    "facebook": {
        "authorize_url": "https://www.facebook.com/v18.0/dialog/oauth",
        "token_url": "https://graph.facebook.com/v18.0/oauth/access_token",
        "userinfo_url": "https://graph.facebook.com/me?fields=id,name,email",
        "scope": "email public_profile",
        "client_id_env": "FACEBOOK_CLIENT_ID",
        "client_secret_env": "FACEBOOK_CLIENT_SECRET",
        "extra_authorize_params": {},
    },
    "github": {
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "scope": "read:user user:email",
        "client_id_env": "GITHUB_CLIENT_ID",
        "client_secret_env": "GITHUB_CLIENT_SECRET",
        "extra_authorize_params": {},
    },
}


def is_supported(provider: str) -> bool:
    return provider in PROVIDERS


def get_credentials(provider: str) -> Optional[tuple[str, str]]:
    """Retorna (client_id, client_secret) se configurados, senão None."""
    cfg = PROVIDERS.get(provider)
    if not cfg:
        return None
    client_id = (os.getenv(cfg["client_id_env"]) or "").strip()
    client_secret = (os.getenv(cfg["client_secret_env"]) or "").strip()
    if not client_id or not client_secret:
        return None
    return client_id, client_secret


def redirect_uri(provider: str) -> str:
    base = BACKEND_URL
    # O Facebook não aceita o IP 127.0.0.1 como redirect (exige "localhost" ou
    # HTTPS). Em ambiente local, trocamos 127.0.0.1 por localhost só pra ele.
    # Em produção (domínio https) a troca é inofensiva (no-op).
    if provider == "facebook":
        base = base.replace("127.0.0.1", "localhost")
    return f"{base}/auth/{provider}/callback"


# ---------------------------------------------------------------------------
# State assinado (proteção CSRF, sem armazenamento em servidor)
# ---------------------------------------------------------------------------

def create_state(provider: str) -> str:
    payload = {
        "p": provider,
        "n": secrets.token_urlsafe(16),
        "exp": datetime.utcnow() + timedelta(minutes=10),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_state(state: str, provider: str) -> bool:
    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("p") == provider
    except JWTError:
        return False


# ---------------------------------------------------------------------------
# Fluxo OAuth
# ---------------------------------------------------------------------------

def build_authorize_url(provider: str, client_id: str, state: str) -> str:
    cfg = PROVIDERS[provider]
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri(provider),
        "response_type": "code",
        "scope": cfg["scope"],
        "state": state,
        **cfg.get("extra_authorize_params", {}),
    }
    return f"{cfg['authorize_url']}?{urlencode(params)}"


def exchange_code_for_token(provider: str, code: str, client_id: str, client_secret: str) -> Optional[str]:
    cfg = PROVIDERS[provider]
    data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri(provider),
        "grant_type": "authorization_code",
    }
    headers = {"Accept": "application/json"}
    resp = requests.post(cfg["token_url"], data=data, headers=headers, timeout=15)
    if resp.status_code != 200:
        return None
    try:
        return resp.json().get("access_token")
    except Exception:
        return None


def fetch_user_info(provider: str, access_token: str) -> Optional[dict]:
    """Retorna {'email': str, 'name': str, 'id': str} ou None."""
    cfg = PROVIDERS[provider]
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }
    resp = requests.get(cfg["userinfo_url"], headers=headers, timeout=15)
    if resp.status_code != 200:
        return None

    data = resp.json()

    if provider == "google":
        return {"email": data.get("email"), "name": data.get("name"), "id": data.get("sub")}

    if provider == "facebook":
        return {"email": data.get("email"), "name": data.get("name"), "id": data.get("id")}

    if provider == "github":
        email = data.get("email")
        # No GitHub o e-mail pode ser privado; busca via endpoint de e-mails.
        if not email:
            try:
                emails = requests.get(
                    "https://api.github.com/user/emails", headers=headers, timeout=15
                ).json()
                primary = next(
                    (e for e in emails if e.get("primary") and e.get("verified")),
                    None,
                )
                email = (primary or (emails[0] if emails else {})).get("email")
            except Exception:
                email = None
        return {
            "email": email,
            "name": data.get("name") or data.get("login"),
            "id": str(data.get("id")),
        }

    return None


def frontend_callback_url(token: Optional[str] = None, error: Optional[str] = None) -> str:
    if token:
        return f"{FRONTEND_URL}/auth/callback?{urlencode({'token': token})}"
    return f"{FRONTEND_URL}/login?{urlencode({'error': error or 'oauth_falhou'})}"
