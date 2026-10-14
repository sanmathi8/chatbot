import pytest
import shutil
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient

from app.core.config import settings
from app.models.database import init_db
from app.main import app

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    # Use temporary directories for testing
    temp_dir = Path(tempfile.mkdtemp(prefix="documind_test_"))
    test_upload_dir = temp_dir / "uploads"
    test_chroma_dir = temp_dir / "chroma"
    test_db_path = temp_dir / "application" / "test_documind.db"

    test_upload_dir.mkdir(parents=True, exist_ok=True)
    test_chroma_dir.mkdir(parents=True, exist_ok=True)
    test_db_path.parent.mkdir(parents=True, exist_ok=True)

    settings.UPLOAD_DIR = test_upload_dir
    settings.CHROMA_DIR = test_chroma_dir
    settings.DB_PATH = test_db_path

    init_db()

    yield

    # Cleanup temp directory
    shutil.rmtree(temp_dir, ignore_errors=True)

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def mock_embedding_service():
    """Mock embedding service that produces deterministic 384-dim dummy vectors."""
    mock = MagicMock()
    # 384 dimensions matches all-MiniLM-L6-v2
    dummy_vec = [0.05] * 384
    mock.embed_query.return_value = dummy_vec
    mock.embed_texts.side_effect = lambda texts: [dummy_vec for _ in texts]
    mock.get_status.return_value = "ready"
    mock.is_loaded.return_value = True

    with patch("app.services.embedding_service.EmbeddingService.get_instance", return_value=mock):
        yield mock

@pytest.fixture
def mock_ollama_service():
    """Mock Ollama service for fast and deterministic testing."""
    with patch("app.services.ollama_service.OllamaService.is_available", new_callable=AsyncMock) as mock_avail, \
         patch("app.services.ollama_service.OllamaService.list_models", new_callable=AsyncMock) as mock_list, \
         patch("app.services.ollama_service.OllamaService.generate", new_callable=AsyncMock) as mock_gen:
        mock_avail.return_value = True
        mock_list.return_value = ["qwen2.5:0.5b", "qwen2.5:3b"]
        mock_gen.return_value = "DocuMind AI is a local document-based RAG chatbot."
        yield {
            "is_available": mock_avail,
            "list_models": mock_list,
            "generate": mock_gen,
        }
