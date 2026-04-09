from sqlalchemy.orm import Session

from app import models, schemas


# =========================================================
# AGENTS
# =========================================================

def get_agent_by_name(db: Session, name: str):
    return db.query(models.Agent).filter(models.Agent.name == name).first()


def create_agent(db: Session, payload: schemas.AgentCreate):
    agent = models.Agent(
        name=payload.name,
        description=payload.description or "",
        provider=payload.provider,
        model=payload.model,
        system_prompt=payload.system_prompt,
        status=payload.status,
        flow=payload.flow or {},
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


def list_agents(db: Session):
    return db.query(models.Agent).order_by(models.Agent.id.desc()).all()


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


# =========================================================
# CONVERSATIONS
# =========================================================

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

def list_kbs(db: Session):
    return db.query(models.KnowledgeBase).order_by(models.KnowledgeBase.id.desc()).all()


def create_kb(db: Session, payload: schemas.KBCreate):
    kb = models.KnowledgeBase(
        name=payload.name,
        description=payload.description or "",
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