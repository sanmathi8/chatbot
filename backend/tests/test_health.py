def test_health_endpoint(client, mock_ollama_service):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["backend_version"] == "1.0.0"
    assert data["ollama_available"] is True
    assert "qwen2.5:0.5b" in data["available_ollama_models"]
    assert "embedding_model" in data
    assert "vector_db_status" in data
