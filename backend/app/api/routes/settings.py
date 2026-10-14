from fastapi import APIRouter
from app.core.config import settings
from app.schemas.settings import SettingsResponse, SettingsUpdateRequest
from app.repositories.sqlite_repo import SQLiteRepository
from app.services.ollama_service import OllamaService

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=SettingsResponse)
async def get_settings():
    """Retrieve current runtime configuration and available models."""
    available_models = await OllamaService.list_models()
    active_model = OllamaService.get_active_model()
    
    chunk_size = int(SQLiteRepository.get_setting("chunk_size", str(settings.CHUNK_SIZE)))
    chunk_overlap = int(SQLiteRepository.get_setting("chunk_overlap", str(settings.CHUNK_OVERLAP)))
    top_k = int(SQLiteRepository.get_setting("top_k", str(settings.TOP_K)))
    similarity_threshold = float(SQLiteRepository.get_setting("similarity_threshold", str(settings.SIMILARITY_THRESHOLD)))

    return SettingsResponse(
        llm_model=active_model,
        available_models=available_models,
        embedding_model=settings.EMBEDDING_MODEL_NAME,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        top_k=top_k,
        similarity_threshold=similarity_threshold,
        max_upload_size_mb=settings.MAX_UPLOAD_SIZE_MB
    )

@router.patch("", response_model=SettingsResponse)
async def update_settings(update: SettingsUpdateRequest):
    """Update runtime RAG parameters and model selection."""
    if update.llm_model is not None:
        SQLiteRepository.set_setting("llm_model", update.llm_model)
    if update.chunk_size is not None:
        SQLiteRepository.set_setting("chunk_size", str(update.chunk_size))
    if update.chunk_overlap is not None:
        SQLiteRepository.set_setting("chunk_overlap", str(update.chunk_overlap))
    if update.top_k is not None:
        SQLiteRepository.set_setting("top_k", str(update.top_k))
    if update.similarity_threshold is not None:
        SQLiteRepository.set_setting("similarity_threshold", str(update.similarity_threshold))

    return await get_settings()
