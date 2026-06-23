from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import os

from .. import schemas, crud, auth, oauth
from ..database import get_db
from ..email_utils import send_action_email

router = APIRouter(prefix="/auth", tags=["Authentication"])

ADMIN_EMAIL = (os.getenv("ADMIN_EMAIL") or "andre.rodrigues1022@gmail.com").strip().lower()


def _serialize_user(user) -> schemas.UserOut:
    return schemas.UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        company=user.company,
        phone=user.phone,
        provider=user.provider,
        has_openai_key=user.has_openai_key,
        is_admin=(user.email or "").lower() == ADMIN_EMAIL,
        email_verified=auth.is_email_verified(user),
        created_at=user.created_at,
    )


def _send_verification_email(user) -> str:
    """Gera o token de verificação e envia (ou loga) o link. Retorna o link."""
    token = auth.create_email_action_token(user.email, "verify_email", 60 * 48)
    link = f"{oauth.FRONTEND_URL}/verificar-email?token={token}"
    send_action_email(
        user.email,
        "Confirme seu e-mail — ARgent.AI",
        (
            f"Olá!\n\n"
            f"Falta só confirmar seu e-mail para liberar a criação de agentes na ARgent.AI.\n"
            f"Clique no link abaixo para confirmar (válido por 48 horas):\n\n{link}\n\n"
            f"Se você não criou esta conta, ignore esta mensagem."
        ),
    )
    return link


@router.post(
    "/register",
    response_model=schemas.AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    email = (user.email or "").strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="E-mail inválido.")
    if not user.password or len(user.password) < 4:
        raise HTTPException(
            status_code=400,
            detail="A senha precisa ter pelo menos 4 caracteres.",
        )

    existing = crud.get_user_by_email(db, email)
    if existing:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado.")

    try:
        new_user = crud.create_user(
            db,
            email=email,
            hashed_password=auth.get_password_hash(user.password),
            provider="local",
            full_name=(user.name or "").strip() or None,
        )
    except ValueError as e:
        # Corrida de cadastro duplicado (UNIQUE) → resposta limpa.
        raise HTTPException(status_code=400, detail=str(e))

    # Dispara o e-mail de confirmação (best-effort; não bloqueia o cadastro).
    try:
        _send_verification_email(new_user)
    except Exception:
        pass

    access_token = auth.create_access_token(data={"sub": new_user.email})
    return schemas.AuthResponse(
        access_token=access_token,
        user=_serialize_user(new_user),
    )


@router.post("/login", response_model=schemas.AuthResponse)
def login_json(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Login via JSON (usado pelo frontend)."""
    email = (payload.email or "").strip().lower()
    user = auth.authenticate_user(db, email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")

    access_token = auth.create_access_token(data={"sub": user.email})
    return schemas.AuthResponse(
        access_token=access_token,
        user=_serialize_user(user),
    )


@router.post("/token", response_model=schemas.Token)
def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Login via formulário OAuth2 (compatibilidade / Swagger)."""
    user = auth.authenticate_user(db, form_data.username.strip().lower(), form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    access_token = auth.create_access_token(data={"sub": user.email})
    return schemas.Token(access_token=access_token)


@router.get("/me", response_model=schemas.UserOut)
def me(current_user=Depends(auth.get_current_active_user)):
    """Retorna os dados do usuário autenticado (valida o token)."""
    return _serialize_user(current_user)


# ---------------------------------------------------------------------------
# Verificação de e-mail + redefinição de senha
# ---------------------------------------------------------------------------

@router.post("/verify-email", response_model=schemas.UserOut)
def verify_email(payload: schemas.VerifyEmailRequest, db: Session = Depends(get_db)):
    """Confirma o e-mail a partir do token enviado por e-mail."""
    data = auth.decode_email_action_token(payload.token, "verify_email")
    if not data:
        raise HTTPException(status_code=400, detail="Link inválido ou expirado. Solicite um novo.")

    email = (data.get("sub") or "").strip().lower()
    user = crud.get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if not user.email_verified:
        user.email_verified = True
        db.commit()
        db.refresh(user)
    return _serialize_user(user)


@router.post("/resend-verification")
def resend_verification(
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_active_user),
):
    """Reenvia o e-mail de confirmação para o usuário autenticado."""
    if auth.is_email_verified(current_user):
        return {"ok": True, "already_verified": True, "message": "Seu e-mail já está confirmado."}
    try:
        _send_verification_email(current_user)
    except Exception:
        pass
    return {"ok": True, "message": "Enviamos um novo e-mail de confirmação. Verifique sua caixa de entrada."}


@router.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Inicia a redefinição de senha. Não revela se o e-mail existe."""
    email = (payload.email or "").strip().lower()
    user = crud.get_user_by_email(db, email)

    # Só envia se a conta existir E tiver senha local (contas sociais não têm).
    if user and user.hashed_password:
        # Inclui um "selo" do hash atual: assim o link deixa de valer assim que
        # a senha é trocada (token efetivamente de uso único).
        stamp = (user.hashed_password or "")[-12:]
        token = auth.create_email_action_token(
            email, "reset_password", 60, {"st": stamp}
        )
        link = f"{oauth.FRONTEND_URL}/redefinir-senha?token={token}"
        try:
            send_action_email(
                email,
                "Redefinição de senha — ARgent.AI",
                (
                    f"Recebemos um pedido para redefinir a senha da sua conta na ARgent.AI.\n\n"
                    f"Clique no link abaixo para criar uma nova senha (válido por 1 hora):\n\n{link}\n\n"
                    f"Se não foi você, ignore esta mensagem — sua senha continua a mesma."
                ),
            )
        except Exception:
            pass

    return {
        "ok": True,
        "message": "Se houver uma conta com esse e-mail, enviamos um link de redefinição.",
    }


@router.post("/reset-password", response_model=schemas.AuthResponse)
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    """Conclui a redefinição de senha usando o token recebido por e-mail."""
    data = auth.decode_email_action_token(payload.token, "reset_password")
    if not data:
        raise HTTPException(status_code=400, detail="Link inválido ou expirado. Solicite um novo.")

    if not payload.password or len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="A nova senha precisa ter pelo menos 6 caracteres.")

    email = (data.get("sub") or "").strip().lower()
    user = crud.get_user_by_email(db, email)
    if not user or not user.hashed_password:
        raise HTTPException(status_code=400, detail="Não é possível redefinir a senha desta conta.")

    # Token de uso único: confere se o "selo" do hash ainda corresponde.
    if data.get("st") and data.get("st") != (user.hashed_password or "")[-12:]:
        raise HTTPException(status_code=400, detail="Este link já foi utilizado. Solicite um novo.")

    user.hashed_password = auth.get_password_hash(payload.password)
    db.commit()
    db.refresh(user)

    access_token = auth.create_access_token(data={"sub": user.email})
    return schemas.AuthResponse(access_token=access_token, user=_serialize_user(user))


@router.put("/profile", response_model=schemas.UserOut)
def update_profile(
    payload: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_active_user),
):
    """Atualiza dados do perfil do usuário."""
    if payload.name is not None:
        current_user.full_name = payload.name.strip() or None
    if payload.company is not None:
        current_user.company = payload.company.strip() or None
    if payload.phone is not None:
        current_user.phone = payload.phone.strip() or None
    db.commit()
    db.refresh(current_user)
    return _serialize_user(current_user)


@router.put("/api-key", response_model=schemas.UserOut)
def set_api_key(
    payload: schemas.ApiKeyUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_active_user),
):
    """Salva a chave de API própria do usuário (apenas OpenAI por enquanto)."""
    if (payload.provider or "openai").lower() != "openai":
        raise HTTPException(status_code=400, detail="Apenas OpenAI é suportado por enquanto.")
    key = (payload.api_key or "").strip()
    if not key.startswith("sk-"):
        raise HTTPException(status_code=400, detail="Chave inválida. Deve começar com 'sk-'.")
    current_user.openai_api_key = key
    db.commit()
    db.refresh(current_user)
    return _serialize_user(current_user)


@router.delete("/api-key", response_model=schemas.UserOut)
def delete_api_key(
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_active_user),
):
    """Remove a chave de API do usuário (volta a usar a chave global do sistema)."""
    current_user.openai_api_key = None
    db.commit()
    db.refresh(current_user)
    return _serialize_user(current_user)


# ---------------------------------------------------------------------------
# Login social (OAuth2)
# ---------------------------------------------------------------------------

@router.get("/providers")
def list_oauth_providers():
    """Lista quais provedores sociais estão configurados (têm credenciais)."""
    return {
        name: oauth.get_credentials(name) is not None
        for name in oauth.PROVIDERS
    }


@router.get("/{provider}/login")
def oauth_login(provider: str):
    """Inicia o fluxo OAuth redirecionando para o provedor."""
    if not oauth.is_supported(provider):
        return RedirectResponse(oauth.frontend_callback_url(error="provedor_invalido"))

    creds = oauth.get_credentials(provider)
    if not creds:
        return RedirectResponse(
            oauth.frontend_callback_url(error=f"{provider}_nao_configurado")
        )

    client_id, _ = creds
    state = oauth.create_state(provider)
    url = oauth.build_authorize_url(provider, client_id, state)
    return RedirectResponse(url)


@router.get("/{provider}/callback")
def oauth_callback(
    provider: str,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    """Callback do provedor: troca o code por token, cria/loga o usuário."""
    if error or not code:
        return RedirectResponse(oauth.frontend_callback_url(error="acesso_negado"))

    if not oauth.is_supported(provider):
        return RedirectResponse(oauth.frontend_callback_url(error="provedor_invalido"))

    if not state or not oauth.verify_state(state, provider):
        return RedirectResponse(oauth.frontend_callback_url(error="state_invalido"))

    creds = oauth.get_credentials(provider)
    if not creds:
        return RedirectResponse(
            oauth.frontend_callback_url(error=f"{provider}_nao_configurado")
        )

    client_id, client_secret = creds

    access_token = oauth.exchange_code_for_token(provider, code, client_id, client_secret)
    if not access_token:
        return RedirectResponse(oauth.frontend_callback_url(error="falha_ao_autenticar"))

    info = oauth.fetch_user_info(provider, access_token)
    if not info or not info.get("email"):
        return RedirectResponse(oauth.frontend_callback_url(error="sem_email"))

    user = crud.get_or_create_oauth_user(
        db,
        email=info["email"],
        name=info.get("name"),
        provider=provider,
        provider_user_id=info.get("id"),
    )

    app_token = auth.create_access_token(data={"sub": user.email})
    return RedirectResponse(oauth.frontend_callback_url(token=app_token))
