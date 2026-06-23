"""
app/auth.py
-----------
Utilitários de autenticação JWT para a plataforma.

Como o frontend usa autenticação local (localStorage), o get_current_active_user
retorna um usuário padrão do sistema quando nenhum token JWT é fornecido.
"""

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import bcrypt

from app.database import get_db
from app import models

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------

# Em produção, defina JWT_SECRET no .env. O valor padrão é apenas para dev.
SECRET_KEY = os.getenv("JWT_SECRET", "plataforma-agentes-ia-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 dias

DEFAULT_USER_EMAIL = "admin@plataforma.local"
DEFAULT_USER_PASSWORD = "admin123"

# O admin é sempre considerado verificado (não precisa confirmar e-mail).
ADMIN_EMAIL = (os.getenv("ADMIN_EMAIL") or "andre.rodrigues1022@gmail.com").strip().lower()

# auto_error=False → não lança 401 quando não há token (permite bypass)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


# ---------------------------------------------------------------------------
# Helpers de senha
# ---------------------------------------------------------------------------

def get_password_hash(password: str) -> str:
    # rounds=8 deixa a criptografia ~16x mais rápida que o padrão (12).
    # Essencial em servidores fracos (ex.: plano grátis do Render), onde o
    # bcrypt padrão pode travar o cadastro. Hashes antigos (12) continuam válidos.
    pwd_bytes = password.encode("utf-8")[:72]  # bcrypt limita a 72 bytes
    salt = bcrypt.gensalt(rounds=8)
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ---------------------------------------------------------------------------
# Tokens de ação por e-mail (verificação de conta / redefinição de senha)
# ---------------------------------------------------------------------------

def create_email_action_token(
    email: str,
    purpose: str,
    minutes: int,
    extra: Optional[dict] = None,
) -> str:
    """Cria um token JWT assinado e com validade curta para uma ação específica
    (``purpose``), como ``verify_email`` ou ``reset_password``."""
    to_encode = {
        "sub": (email or "").strip().lower(),
        "purpose": purpose,
        "exp": datetime.utcnow() + timedelta(minutes=minutes),
    }
    if extra:
        to_encode.update(extra)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_email_action_token(token: str, purpose: str) -> Optional[dict]:
    """Valida o token e confere se o ``purpose`` bate. Retorna o payload ou None."""
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    if data.get("purpose") != purpose:
        return None
    return data


def is_email_verified(user) -> bool:
    """O admin é sempre verificado; os demais seguem a flag ``email_verified``."""
    if (getattr(user, "email", "") or "").lower() == ADMIN_EMAIL:
        return True
    return bool(getattr(user, "email_verified", False))


# ---------------------------------------------------------------------------
# Autenticação de usuário
# ---------------------------------------------------------------------------

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        return None
    if not user.hashed_password:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


# ---------------------------------------------------------------------------
# Usuário padrão (dev / sem token)
# ---------------------------------------------------------------------------

def _get_or_create_default_user(db: Session) -> models.User:
    """Retorna (ou cria) o usuário padrão do sistema."""
    user = db.query(models.User).filter(
        models.User.email == DEFAULT_USER_EMAIL
    ).first()

    if not user:
        user = models.User(
            email=DEFAULT_USER_EMAIL,
            hashed_password=get_password_hash(DEFAULT_USER_PASSWORD),
            provider="local",
            email_verified=True,  # usuário de dev já entra verificado
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


# ---------------------------------------------------------------------------
# Dependência principal
# ---------------------------------------------------------------------------

async def get_current_active_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """
    Resolve o usuário da requisição, nesta ordem de prioridade:

    1. Token JWT (cabeçalho ``Authorization: Bearer ...``) — caminho seguro/oficial.
    2. Cabeçalho ``X-User-Email`` — fallback legado para desenvolvimento.
    3. Usuário padrão do sistema — último recurso em ambiente local.

    Um token presente porém inválido/expirado retorna 401 (o frontend
    redireciona para o login automaticamente).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou expiradas.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1) JWT
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if not email:
                raise credentials_exception
        except JWTError:
            raise credentials_exception

        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None:
            raise credentials_exception
        return user

    # 2) Cabeçalho legado X-User-Email (dev / compatibilidade)
    email_header = request.headers.get("x-user-email")
    if email_header:
        email_header = email_header.strip().lower()
        user = db.query(models.User).filter(models.User.email == email_header).first()
        if not user:
            user = models.User(
                email=email_header,
                hashed_password=get_password_hash(DEFAULT_USER_PASSWORD),
                provider="local",
                email_verified=True,  # fallback legado (dev) já entra verificado
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    # 3) Usuário padrão (apenas dev local)
    return _get_or_create_default_user(db)
