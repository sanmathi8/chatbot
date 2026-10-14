from fastapi import APIRouter
from app.core.config import settings
from app.schemas.health import HealthResponse
from app.services.ollama_service import OllamaService
from app.services.embedding_service import EmbeddingService
from app.services.retrieval_service import RetrievalService
from app.repositories.sqlite_repo import SQLiteRepository
from app.schemas.document import DocumentStatus

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("", response_model=HealthResponse)
async def check_health():
    """Return comprehensive system health and AI model status."""
    ollama_ok = await OllamaService.is_available()
    available_models = await OllamaService.list_models() if ollama_ok else []
    active_model = OllamaService.get_active_model()
    
    embedding_service = EmbeddingService.get_instance()
    retrieval_service = RetrievalService.get_instance()
    
    docs = SQLiteRepository.get_all_documents()
    total_docs = len(docs)
    ready_docs = sum(1 for d in docs if d["status"] == DocumentStatus.READY.value)
    
    vector_status = retrieval_service.get_status().get("status", "unknown")
    
    return HealthResponse(
        status="healthy",
        backend_version=settings.APP_VERSION,
        ollama_available=ollama_ok,
        ollama_model=active_model,
        available_ollama_models=available_models,
        embedding_status=embedding_service.get_status(),
        embedding_model=settings.EMBEDDING_MODEL_NAME,
        vector_db_status=vector_status,
        documents_count=total_docs,
        ready_documents_count=ready_docs
    )
