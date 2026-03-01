from sqlalchemy.orm import Session
from sqlalchemy import desc
from . import models, schemas


# -------------------------
# AGENTS
# -------------------------
def get_agent(db: Session, agent_id: int):
    return db.query(models.Agent).filter(models.Agent.id == agent_id).first()


def get_agent_by_name(db: Session, name: str):
    return db.query(models.Agent).filter(models.Agent.name == name).first()


def list_agents(db: Session):
    return db.query(models.Agent).order_by(models.Agent.id.desc()).all()


def create_agent(db: Session, payload: schemas.AgentCreate):
    agent = models.Agent(
        name=payload.name.strip(),
        description=payload.description,
        provider=payload.provider,
        model=payload.model,
        system_prompt=payload.system_prompt,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


def update_agent(db: Session, agent: models.Agent, payload: schemas.AgentUpdate):
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if value is not None:
            if key == "name":
                value = value.strip()
            setattr(agent, key, value)
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


def delete_agent(db: Session, agent: models.Agent):
    db.delete(agent)
    db.commit()


# -------------------------
# CONVERSATIONS
# -------------------------
def create_conversation(db: Session, agent_id: int, title: str | None = None):
    conv = models.Conversation(agent_id=agent_id, title=title)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def get_conversation(db: Session, conversation_id: int):
    return db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()


def list_conversations(db: Session, agent_id: int, limit: int = 50):
    return (
        db.query(models.Conversation)
        .filter(models.Conversation.agent_id == agent_id)
        .order_by(desc(models.Conversation.id))
        .limit(limit)
        .all()
    )


def delete_conversation(db: Session, conversation_id: int):
    conv = get_conversation(db, conversation_id)
    if conv:
        db.delete(conv)
        db.commit()
        return True
    return False


# -------------------------
# CHAT MEMORY (por conversation)
# -------------------------
def add_message(db: Session, agent_id: int, conversation_id: int, role: str, content: str):
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


def get_last_messages(db: Session, agent_id: int, conversation_id: int, limit: int = 12):
    rows = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.agent_id == agent_id)
        .filter(models.ChatMessage.conversation_id == conversation_id)
        .order_by(desc(models.ChatMessage.id))
        .limit(limit)
        .all()
    )
    return list(reversed(rows))


def clear_messages(db: Session, agent_id: int, conversation_id: int):
    db.query(models.ChatMessage).filter(
        models.ChatMessage.agent_id == agent_id,
        models.ChatMessage.conversation_id == conversation_id
    ).delete()
    db.commit()
    return True