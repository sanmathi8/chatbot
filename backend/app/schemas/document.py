from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field

class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    EXTRACTING = "extracting"
    EMBEDDING = "embedding"
    INDEXING = "indexing"
    READY = "ready"
    FAILED = "failed"

class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    file_type: str
    upload_time: str
    status: DocumentStatus
    error_message: Optional[str] = None
    chunk_count: int = 0
    char_count: int = 0

class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int

class ChunkMetadata(BaseModel):
    doc_id: str
    filename: str
    page_number: Optional[int] = None
    chunk_index: int
    upload_time: str
    char_count: int
