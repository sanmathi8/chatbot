import os
from pathlib import Path
from typing import List, Set
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory is the repository root (DocuMind AI root)
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = ROOT_DIR / "data"

class Settings(BaseSettings):
    APP_NAME: str = "DocuMind AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server configuration
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # File Storage directories
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    CHROMA_DIR: Path = DATA_DIR / "chroma"
    DB_PATH: Path = DATA_DIR / "application" / "documind.db"
    
    # Ollama Local LLM
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    DEFAULT_LLM_MODEL: str = "qwen2.5:0.5b"
    OLLAMA_REQUEST_TIMEOUT: float = 120.0
    
    # Local Embeddings
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # RAG Settings (Configurable at runtime)
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 120
    TOP_K: int = 4
    SIMILARITY_THRESHOLD: float = 0.35  # Cosine similarity threshold (0-1)
    
    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_EXTENSIONS: Set[str] = {".pdf", ".docx", ".txt", ".md"}

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def ensure_directories(self) -> None:
        """Create necessary storage directories if they do not exist."""
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        self.DB_PATH.parent.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.ensure_directories()
