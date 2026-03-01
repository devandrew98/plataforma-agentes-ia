from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# -------------------------
# AGENT
# -------------------------
class AgentBase(BaseModel):
    name: str = Field(..., max_length=120)
    description: Optional[str] = Field(default=None, max_length=255)
    provider: str = Field(default="openai", max_length=50)
    model: str = Field(default="gpt-4o-mini", max_length=120)
    system_prompt: str


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    description: Optional[str] = Field(default=None, max_length=255)
    provider: Optional[str] = Field(default=None, max_length=50)
    model: Optional[str] = Field(default=None, max_length=120)
    system_prompt: Optional[str] = None


class AgentOut(AgentBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# -------------------------
# CONVERSATIONS
# -------------------------
class ConversationCreate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=120)


class ConversationOut(BaseModel):
    id: int
    agent_id: int
    title: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# -------------------------
# CHAT MEMORY
# -------------------------
class ChatMessageOut(BaseModel):
    id: int
    agent_id: int
    conversation_id: int
    role: str
    content: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[HistoryMessage] = Field(default_factory=list)  # fallback
    use_memory: bool = True
    memory_limit: int = 12
    conversation_id: Optional[int] = None  # <- NOVO