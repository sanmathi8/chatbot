import threading
from typing import List, Optional
from app.core.config import settings
from app.core.logging import logger

class EmbeddingService:
    """Service for local document and query embeddings using SentenceTransformers."""
    _instance: Optional["EmbeddingService"] = None
    _lock = threading.Lock()

    def __init__(self):
        self.model_name = settings.EMBEDDING_MODEL_NAME
        self._model = None
        self._is_loading = False

    @classmethod
    def get_instance(cls) -> "EmbeddingService":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _load_model(self):
        if self._model is None:
            with self._lock:
                if self._model is None:
                    try:
                        self._is_loading = True
                        logger.info(f"Loading local embedding model: {self.model_name}...")
                        from sentence_transformers import SentenceTransformer
                        self._model = SentenceTransformer(self.model_name)
                        logger.info(f"Successfully loaded embedding model: {self.model_name}")
                    except Exception as e:
                        logger.error(f"Error loading embedding model {self.model_name}: {e}")
                        raise
                    finally:
                        self._is_loading = False

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate normalized dense vector embeddings for a list of texts."""
        if not texts:
            return []
        self._load_model()
        embeddings = self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return embeddings.tolist()

    def embed_query(self, query: str) -> List[float]:
        """Generate normalized dense vector embedding for a single query."""
        results = self.embed_texts([query])
        return results[0] if results else []

    def is_loaded(self) -> bool:
        return self._model is not None

    def get_status(self) -> str:
        if self._model is not None:
            return "ready"
        if self._is_loading:
            return "loading"
        return "not_loaded (will load on first request)"
