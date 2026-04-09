from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base


# =========================================================
# AGENT
# =========================================================

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, index=True, nullable=False)
    description = Column(String(255), default="")
    provider = Column(String(50), default="openai")
    model = Column(String(120), default="gpt-4o-mini")
    system_prompt = Column(Text, nullable=False, default="Você é um assistente útil.")
    status = Column(String(30), default="draft")
    flow = Column(JSON, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    conversations = relationship(
        "Conversation",
        back_populates="agent",
        cascade="all, delete-orphan",
    )

    messages = relationship(
        "ChatMessage",
        back_populates="agent",
        cascade="all, delete-orphan",
    )


# =========================================================
# KNOWLEDGE BASE
# =========================================================

class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, index=True, nullable=False)
    description = Column(String(255), default="")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    documents = relationship(
        "KnowledgeBaseDocument",
        back_populates="kb",
        cascade="all, delete-orphan",
    )


class KnowledgeBaseDocument(Base):
    __tablename__ = "knowledge_base_documents"

    id = Column(Integer, primary_key=True, index=True)
    kb_id = Column(Integer, ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    content = Column(Text, default="")
    status = Column(String(30), default="uploaded")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    kb = relationship("KnowledgeBase", back_populates="documents")


# =========================================================
# CONVERSATION
# =========================================================

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    agent = relationship("Agent", back_populates="conversations")
    messages = relationship(
        "ChatMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


# =========================================================
# CHAT MESSAGE
# =========================================================

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)

    role = Column(String(20), nullable=False)   # user / assistant / system
    content = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    agent = relationship("Agent", back_populates="messages")
    conversation = relationship("Conversation", back_populates="messages")