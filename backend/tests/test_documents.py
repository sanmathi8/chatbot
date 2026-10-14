import io
from app.schemas.document import DocumentStatus

def test_upload_document_success(client, mock_embedding_service):
    file_content = b"DocuMind AI is a local document-based RAG chatbot designed for privacy and local intelligence."
    file = io.BytesIO(file_content)
    
    response = client.post(
        "/api/documents/upload",
        files={"file": ("knowledge.txt", file, "text/plain")}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["filename"] == "knowledge.txt"
    assert data["file_type"] == "txt"
    assert "id" in data
    doc_id = data["id"]

    # Verify listing includes it
    list_res = client.get("/api/documents")
    assert list_res.status_code == 200
    docs = list_res.json()["documents"]
    assert any(d["id"] == doc_id for d in docs)

    # Verify get by id
    get_res = client.get(f"/api/documents/{doc_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == doc_id

    # Verify delete document
    del_res = client.delete(f"/api/documents/{doc_id}")
    assert del_res.status_code == 200

    # Verify document is gone
    get_after_del = client.get(f"/api/documents/{doc_id}")
    assert get_after_del.status_code == 404

def test_upload_unsupported_file(client):
    file_content = b"binary content"
    file = io.BytesIO(file_content)
    
    response = client.post(
        "/api/documents/upload",
        files={"file": ("malicious.exe", file, "application/x-msdownload")}
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]

def test_upload_empty_file(client):
    file = io.BytesIO(b"")
    response = client.post(
        "/api/documents/upload",
        files={"file": ("empty.txt", file, "text/plain")}
    )
    assert response.status_code == 422
    assert "empty" in response.json()["detail"].lower()
