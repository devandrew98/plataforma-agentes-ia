from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field, ConfigDict


# =========================================================
# AGENTS
# =========================================================

class AgentBase(BaseModel):
    name: str
    description: Optional[str] = ""
    provider: str = "openai"
    model: str = "gpt-4o-mini"
    system_prompt: str = "Você é um assistente útil."
    status: str = "draft"
    flow: Optional[dict[str, Any]] = None


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    system_prompt: Optional[str] = None
    status: Optional[str] = None
    flow: Optional[dict[str, Any]] = None


class AgentOut(AgentBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# KNOWLEDGE BASE
# =========================================================

class KBCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class KBOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: str
    password: Optional[str] = None  # optional for OAuth users
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    provider: str
    has_openai_key: bool = False
    is_admin: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None


class ApiKeyUpdate(BaseModel):
    provider: str = "openai"
    api_key: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    """Resposta padrão de autenticação: token + dados do usuário."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class KBDocumentCreate(BaseModel):
    kb_id: int
    filename: str
    content: Optional[str] = ""
    status: Optional[str] = "uploaded"


class KBDocumentOut(BaseModel):
    id: int
    kb_id: int
    filename: str
    content: Optional[str] = ""
    status: Optional[str] = "uploaded"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# CONVERSATIONS
# =========================================================

class ConversationCreate(BaseModel):
    title: Optional[str] = None


class ConversationOut(BaseModel):
    id: int
    agent_id: int
    title: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# CHAT / MEMORY
# =========================================================

class ChatHistoryItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    conversation_id: Optional[int] = None
    message: str
    history: List[ChatHistoryItem] = Field(default_factory=list)
    use_memory: bool = True
    memory_limit: int = 10


class ChatMessageOut(BaseModel):
    id: Optional[int] = None
    agent_id: Optional[int] = None
    conversation_id: Optional[int] = None
    role: str
    content: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)