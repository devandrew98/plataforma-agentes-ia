from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("/{conversation_id}/messages")
def list_messages(conversation_id: int, db: Session = Depends(get_db)):
    conversation = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == conversation_id
    ).order_by(models.ChatMessage.created_at.asc()).all()

    return {
        "conversation_id": conversation_id,
        "count": len(messages),
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at
            }
            for m in messages
        ]
    }