from typing import Optional, List
from pydantic import BaseModel
from app.schemas.chat import SourceReference

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    sources: List[SourceReference] = []
    created_at: str

class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0

class ConversationDetailResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    messages: List[MessageResponse] = []

class ConversationCreateRequest(BaseModel):
    title: Optional[str] = None

class ConversationUpdateRequest(BaseModel):
    title: str

