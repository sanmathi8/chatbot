from typing import Optional, List
from pydantic import BaseModel, Field

class SettingsResponse(BaseModel):
    llm_model: str
    available_models: List[str]
    embedding_model: str
    chunk_size: int
    chunk_overlap: int
    top_k: int
    similarity_threshold: float
    max_upload_size_mb: int

class SettingsUpdateRequest(BaseModel):
    llm_model: Optional[str] = None
    chunk_size: Optional[int] = Field(None, ge=100, le=4000)
    chunk_overlap: Optional[int] = Field(None, ge=0, le=1000)
    top_k: Optional[int] = Field(None, ge=1, le=20)
    similarity_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
