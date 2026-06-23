from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


# =========================================================
# USER
# =========================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)  # nome de exibição do usuário
    company = Column(String(255), nullable=True)  # empresa/organização (perfil)
    phone = Column(String(50), nullable=True)  # telefone de contato (perfil)
    hashed_password = Column(String(255), nullable=True)  # nullable for OAuth users
    provider = Column(String(50), default="local")  # e.g., google, facebook, apple, local
    provider_user_id = Column(String(255), nullable=True)  # ID from provider

    # Verificação de e-mail (segurança): conta criada por e-mail/senha começa
    # NÃO verificada e fica bloqueada de criar agentes até confirmar o e-mail.
    # Contas sociais (Google/GitHub) já entram verificadas.
    email_verified = Column(Boolean, default=False, nullable=False)

    # Chave de API própria do usuário (para consumir os próprios créditos)
    openai_api_key = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    agents = relationship("Agent", back_populates="owner", cascade="all, delete-orphan")
    permissions = relationship("AgentPermission", back_populates="user", cascade="all, delete-orphan")

    @property
    def name(self) -> str:
        """Nome de exibição: usa full_name ou cai para o prefixo do e-mail."""
        if self.full_name:
            return self.full_name
        return (self.email or "").split("@")[0]

    @property
    def has_openai_key(self) -> bool:
        return bool(self.openai_api_key)


# =========================================================
# AGENT
# =========================================================

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), index=True, nullable=False)
    description = Column(String(255), default="")
    provider = Column(String(50), default="openai")
    model = Column(String(120), default="gpt-4o-mini")
    system_prompt = Column(Text, nullable=False, default="Você é um assistente útil.")
    status = Column(String(30), default="draft")
    flow = Column(JSON, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Ownership relationship
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    owner = relationship("User", back_populates="agents")

    # Permissions (many‑to‑many) – optional future sharing
    shared_with = relationship("AgentPermission", back_populates="agent", cascade="all, delete-orphan")

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
# AGENT PERMISSION (many‑to‑many linking users and agents)
# =========================================================

class AgentPermission(Base):
    __tablename__ = "agent_permissions"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # role could be "owner", "viewer", "editor" – for now we just store a string
    role = Column(String(20), default="viewer")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    agent = relationship("Agent", back_populates="shared_with")
    user = relationship("User", back_populates="permissions")


# =========================================================
# KNOWLEDGE BASE
# =========================================================

class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), index=True, nullable=False)
    description = Column(String(255), default="")

    # Ownership – each KB belongs to one user
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

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
    chunks = relationship(
        "DocumentChunk",
        back_populates="doc",
        cascade="all, delete-orphan",
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    kb_id = Column(Integer, ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False)
    doc_id = Column(Integer, ForeignKey("knowledge_base_documents.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    doc = relationship("KnowledgeBaseDocument", back_populates="chunks")


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

class Integration(Base):
    """Canal conectado a um agente (ex.: WhatsApp)."""
    __tablename__ = "integrations"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="CASCADE"), nullable=True)
    channel = Column(String(50), nullable=False)  # whatsapp, slack, email...
    status = Column(String(30), default="connected")
    config = Column(JSON, default=dict)  # ex.: {phone_number_id, access_token, verify_token}

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class IntegrationRequest(Base):
    """Solicitação de nova integração feita por um usuário (chega ao admin)."""
    __tablename__ = "integration_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String(255), nullable=True)
    channel = Column(String(120), nullable=False)
    message = Column(Text, default="")
    status = Column(String(30), default="pendente")  # pendente, em_analise, concluida

    created_at = Column(DateTime, default=datetime.utcnow)


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