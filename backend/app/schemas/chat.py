from typing import Optional, List
from pydantic import BaseModel, Field

class SourceReference(BaseModel):
    id: str
    document_id: str
    filename: str
    page_number: Optional[int] = None
    chunk_index: int
    excerpt: str
    score: float

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User question to ask the chatbot")
    conversation_id: Optional[str] = None
    model: Optional[str] = None
    top_k: Optional[int] = Field(None, ge=1, le=20)
    similarity_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)

class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    sources: List[SourceReference]
    model: str
    latency_seconds: float
