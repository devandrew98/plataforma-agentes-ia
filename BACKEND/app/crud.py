from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas


# =========================================================
# USERS
# =========================================================

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(
    db: Session,
    email: str,
    hashed_password: str,
    provider: str = "local",
    full_name: str | None = None,
):
    user = models.User(
        email=email,
        hashed_password=hashed_password,
        provider=provider,
        full_name=full_name,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Corrida: outra requisição cadastrou o mesmo e-mail em paralelo.
        # A constraint UNIQUE protege o banco; aqui devolvemos erro limpo (400)
        # em vez de deixar virar 500.
        db.rollback()
        raise ValueError("E-mail já cadastrado.")
    db.refresh(user)
    return user


def get_or_create_oauth_user(
    db: Session,
    email: str,
    name: str | None,
    provider: str,
    provider_user_id: str | None = None,
):
    """Localiza o usuário pelo e-mail ou cria um novo vindo de login social."""
    email = (email or "").strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if user:
        # Completa dados que ainda não existem (ex.: nome) sem sobrescrever senha local.
        changed = False
        if name and not user.full_name:
            user.full_name = name
            changed = True
        if provider_user_id and not user.provider_user_id:
            user.provider_user_id = provider_user_id
            changed = True
        # O provedor social já validou o e-mail → considera verificado.
        if not getattr(user, "email_verified", False):
            user.email_verified = True
            changed = True
        if changed:
            db.commit()
            db.refresh(user)
        return user

    user = models.User(
        email=email,
        full_name=name,
        hashed_password=None,  # usuário social não tem senha local
        provider=provider,
        provider_user_id=provider_user_id,
        email_verified=True,  # e-mail já validado pelo provedor social
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Corrida: dois logins sociais simultâneos do mesmo e-mail novo.
        db.rollback()
        existing = db.query(models.User).filter(models.User.email == email).first()
        if existing:
            return existing
        raise
    db.refresh(user)
    return user


def get_agent_by_name(db: Session, name: str, owner_id: int):
    return db.query(models.Agent).filter(
        models.Agent.name == name,
        models.Agent.owner_id == owner_id
    ).first()


def create_agent(db: Session, payload: schemas.AgentCreate, owner_id: int):
    agent = models.Agent(
        name=payload.name,
        description=payload.description or "",
        provider=payload.provider,
        model=payload.model,
        system_prompt=payload.system_prompt,
        status=payload.status,
        flow=payload.flow or {},
        owner_id=owner_id,
    )
    db.add(agent)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Já existe um agente com esse nome.")
    db.refresh(agent)
    return agent


def list_agents(db: Session, user_id: int):
    return db.query(models.Agent).filter(models.Agent.owner_id == user_id).order_by(models.Agent.id.desc()).all()


def get_agent(db: Session, agent_id: int):
    return db.query(models.Agent).filter(models.Agent.id == agent_id).first()


def update_agent(db: Session, agent, payload: schemas.AgentUpdate):
    data = payload.model_dump(exclude_unset=True)

    for field, value in data.items():
        setattr(agent, field, value)

    db.commit()
    db.refresh(agent)
    return agent

def delete_agent(db: Session, agent):
    db.delete(agent)
    db.commit()



def create_conversation(db: Session, agent_id: int, title: str | None = None):
    conversation = models.Conversation(
        agent_id=agent_id,
        title=title,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def list_conversations(db: Session, agent_id: int, limit: int = 50):
    return (
        db.query(models.Conversation)
        .filter(models.Conversation.agent_id == agent_id)
        .order_by(models.Conversation.id.desc())
        .limit(limit)
        .all()
    )


def get_conversation(db: Session, conversation_id: int):
    return (
        db.query(models.Conversation)
        .filter(models.Conversation.id == conversation_id)
        .first()
    )


def delete_conversation(db: Session, conversation_id: int):
    conv = get_conversation(db, conversation_id)
    if not conv:
        return False

    db.delete(conv)
    db.commit()
    return True


# =========================================================
# CHAT MESSAGES / MEMORY
# =========================================================

def add_message(
    db: Session,
    agent_id: int,
    conversation_id: int,
    role: str,
    content: str,
):
    msg = models.ChatMessage(
        agent_id=agent_id,
        conversation_id=conversation_id,
        role=role,
        content=content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_last_messages(
    db: Session,
    agent_id: int,
    conversation_id: int,
    limit: int = 10,
):
    messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.agent_id == agent_id)
        .filter(models.ChatMessage.conversation_id == conversation_id)
        .order_by(models.ChatMessage.id.desc())
        .limit(limit)
        .all()
    )

    return list(reversed(messages))


def clear_messages(
    db: Session,
    agent_id: int,
    conversation_id: int,
):
    (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.agent_id == agent_id)
        .filter(models.ChatMessage.conversation_id == conversation_id)
        .delete()
    )
    db.commit()


# =========================================================
# KB (básico)
# =========================================================

def list_kbs(db: Session, user_id: int):
    return db.query(models.KnowledgeBase).filter(
        models.KnowledgeBase.owner_id == user_id
    ).order_by(models.KnowledgeBase.id.desc()).all()


def create_kb(db: Session, payload: schemas.KBCreate, owner_id: int):
    kb = models.KnowledgeBase(
        name=payload.name,
        description=payload.description or "",
        owner_id=owner_id,
    )
    db.add(kb)
    db.commit()
    db.refresh(kb)
    return kb


def get_kb(db: Session, kb_id: int):
    return db.query(models.KnowledgeBase).filter(models.KnowledgeBase.id == kb_id).first()


def delete_kb(db: Session, kb):
    db.delete(kb)
    db.commit()


def create_kb_document(
    db: Session,
    kb_id: int,
    filename: str,
    content: str = "",
    status: str = "uploaded",
):
    doc = models.KnowledgeBaseDocument(
        kb_id=kb_id,
        filename=filename,
        content=content,
        status=status,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def list_kb_documents(db: Session, kb_id: int):
    return (
        db.query(models.KnowledgeBaseDocument)
        .filter(models.KnowledgeBaseDocument.kb_id == kb_id)
        .order_by(models.KnowledgeBaseDocument.id.desc())
        .all()
    )