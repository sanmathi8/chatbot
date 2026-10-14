import os
import uuid
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import UploadFile, BackgroundTasks

from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import DocumentNotFoundError, DocumentProcessingError
from app.schemas.document import DocumentResponse, DocumentStatus
from app.repositories.sqlite_repo import SQLiteRepository
from app.utils.file_utils import validate_file, sanitize_filename
from app.services.ingestion_service import IngestionService
from app.services.retrieval_service import RetrievalService

class DocumentService:
    """Service handling document lifecycle: storage, metadata, ingestion triggering, and deletion."""

    @classmethod
    async def upload_document(cls, file: UploadFile, background_tasks: BackgroundTasks) -> DocumentResponse:
        """Receive, validate, store, and enqueue document for ingestion."""
        original_name = file.filename or "unknown.txt"
        clean_name = sanitize_filename(original_name)
        
        # Read file contents to validate size and persist
        contents = await file.read()
        file_size = len(contents)
        
        # Validate format & size
        ext = validate_file(clean_name, file_size)
        
        doc_id = str(uuid.uuid4())
        upload_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        saved_filename = f"{doc_id}_{clean_name}"
        saved_path = settings.UPLOAD_DIR / saved_filename
        
        # Save to disk
        with open(saved_path, "wb") as f:
            f.write(contents)
            
        logger.info(f"Saved file {original_name} ({file_size} bytes) to {saved_path}")

        # Store in SQLite
        SQLiteRepository.add_document(
            doc_id=doc_id,
            filename=clean_name,
            file_size=file_size,
            file_type=ext.lstrip("."),
            file_path=str(saved_path),
            upload_time=upload_time,
            status=DocumentStatus.UPLOADED.value
        )

        # Enqueue background ingestion processing
        background_tasks.add_task(
            IngestionService.process_document,
            doc_id=doc_id,
            file_path=saved_path,
            filename=clean_name,
            upload_time=upload_time
        )

        return DocumentResponse(
            id=doc_id,
            filename=clean_name,
            file_size=file_size,
            file_type=ext.lstrip("."),
            upload_time=upload_time,
            status=DocumentStatus.UPLOADED,
            error_message=None,
            chunk_count=0,
            char_count=0
        )

    @classmethod
    def get_document(cls, doc_id: str) -> DocumentResponse:
        """Retrieve single document metadata."""
        doc = SQLiteRepository.get_document(doc_id)
        if not doc:
            raise DocumentNotFoundError(doc_id)
        return DocumentResponse(**doc)

    @classmethod
    def list_documents(cls) -> List[DocumentResponse]:
        """List all documents stored in the system."""
        docs = SQLiteRepository.get_all_documents()
        return [DocumentResponse(**d) for d in docs]

    @classmethod
    def delete_document(cls, doc_id: str) -> None:
        """Delete document file, vector embeddings from ChromaDB, and SQLite record."""
        doc = SQLiteRepository.get_document(doc_id)
        if not doc:
            raise DocumentNotFoundError(doc_id)

        # 1. Delete vector embeddings
        RetrievalService.get_instance().delete_document_chunks(doc_id)

        # 2. Delete file from storage
        file_path = Path(doc["file_path"])
        if file_path.exists():
            try:
                file_path.unlink()
                logger.info(f"Removed file from disk: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete file {file_path}: {e}")

        # 3. Delete from SQLite
        SQLiteRepository.delete_document(doc_id)
        logger.info(f"Deleted document {doc_id} successfully.")

    @classmethod
    def delete_all_documents(cls) -> int:
        """Clear all documents, storage files, and vector index."""
        docs = SQLiteRepository.get_all_documents()
        count = len(docs)
        
        # 1. Clear ChromaDB
        RetrievalService.get_instance().clear_all()

        # 2. Delete all upload files
        for doc in docs:
            file_path = Path(doc["file_path"])
            if file_path.exists():
                try:
                    file_path.unlink()
                except Exception:
                    pass

        # 3. Delete all SQLite records
        SQLiteRepository.delete_all_documents()
        logger.info(f"Cleared all {count} documents from system.")
        return count
