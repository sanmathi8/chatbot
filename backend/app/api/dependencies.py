# API Dependencies
from app.services.embedding_service import EmbeddingService
from app.services.retrieval_service import RetrievalService

def get_retrieval_service() -> RetrievalService:
    return RetrievalService.get_instance()

def get_embedding_service() -> EmbeddingService:
    return EmbeddingService.get_instance()
