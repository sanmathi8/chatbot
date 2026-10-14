from typing import List, Optional
from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    backend_version: str
    ollama_available: bool
    ollama_model: str
    available_ollama_models: List[str]
    embedding_status: str
    embedding_model: str
    vector_db_status: str
    documents_count: int
    ready_documents_count: int
