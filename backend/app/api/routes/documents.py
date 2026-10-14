from fastapi import APIRouter, UploadFile, File, BackgroundTasks, status
from typing import List, Dict, Any
from app.schemas.document import DocumentResponse, DocumentListResponse
from app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """Upload and start asynchronous processing and vector indexing for a document."""
    return await DocumentService.upload_document(file, background_tasks)

@router.get("", response_model=DocumentListResponse)
async def list_documents():
    """List all documents and their indexing statuses."""
    docs = DocumentService.list_documents()
    return DocumentListResponse(documents=docs, total=len(docs))

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str):
    """Get metadata for a single document."""
    return DocumentService.get_document(document_id)

@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(document_id: str):
    """Delete a document and remove all of its indexed chunks from vector storage."""
    DocumentService.delete_document(document_id)
    return {"message": f"Document '{document_id}' successfully deleted."}

@router.delete("", status_code=status.HTTP_200_OK)
async def clear_all_documents():
    """Delete all documents and clear the entire vector database collection."""
    cleared = DocumentService.delete_all_documents()
    return {"message": f"Cleared {cleared} documents from system."}
