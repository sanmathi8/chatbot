import pytest
from unittest.mock import patch, AsyncMock
from app.schemas.chat import SourceReference
from app.services.rag_service import INSUFFICIENT_INFO_MESSAGE
from app.core.exceptions import OllamaServiceError

def test_empty_chat_message(client):
    response = client.post("/api/chat", json={"message": ""})
    assert response.status_code == 422  # Pydantic validation error for min_length=1

def test_rag_with_no_documents(client, mock_embedding_service):
    # With no documents indexed, ChromaDB returns no chunks, triggering honest fallback
    response = client.post("/api/chat", json={"message": "What is the secret launch code?"})
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == INSUFFICIENT_INFO_MESSAGE
    assert len(data["sources"]) == 0

def test_rag_with_grounded_context(client, mock_embedding_service, mock_ollama_service):
    # Mock retrieval service returning high-relevance source chunk
    mock_sources = [
        SourceReference(
            id="doc1_0",
            document_id="doc1",
            filename="user_manual.pdf",
            page_number=3,
            chunk_index=0,
            excerpt="To reset the system, press and hold the power button for 10 seconds.",
            score=0.92
        )
    ]

    with patch("app.services.rag_service.RAGService.retrieve_context", return_value=mock_sources):
        response = client.post("/api/chat", json={"message": "How do I reset the system?"})
        assert response.status_code == 200
        data = response.json()
        assert len(data["sources"]) == 1
        assert data["sources"][0]["filename"] == "user_manual.pdf"
        assert data["sources"][0]["page_number"] == 3
        assert "reset" in data["sources"][0]["excerpt"].lower()
        assert "conversation_id" in data

def test_ollama_service_error_handling(client, mock_embedding_service):
    mock_sources = [
        SourceReference(
            id="doc1_0",
            document_id="doc1",
            filename="doc.txt",
            page_number=1,
            chunk_index=0,
            excerpt="Some excerpt.",
            score=0.88
        )
    ]
    with patch("app.services.rag_service.RAGService.retrieve_context", return_value=mock_sources), \
         patch("app.services.ollama_service.OllamaService.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = OllamaServiceError("Ollama is not running. Please start Ollama or run 'ollama serve'.")
        response = client.post("/api/chat", json={"message": "Tell me about this document."})
        assert response.status_code == 503
        assert "Ollama is not running" in response.json()["detail"]
