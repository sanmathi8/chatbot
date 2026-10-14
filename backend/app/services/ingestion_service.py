import os
from pathlib import Path
from typing import Dict, Any, List
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import DocumentProcessingError
from app.schemas.document import DocumentStatus
from app.repositories.sqlite_repo import SQLiteRepository
from app.utils.file_utils import extract_document_text
from app.utils.text_splitter import RecursiveCharacterTextSplitter
from app.services.embedding_service import EmbeddingService
from app.services.retrieval_service import RetrievalService

class IngestionService:
    """Service orchestrating document text extraction, chunking, embedding, and indexing."""

    @classmethod
    def process_document(cls, doc_id: str, file_path: Path, filename: str, upload_time: str) -> None:
        """Execute the ingestion pipeline synchronously or in background task."""
        retrieval_service = RetrievalService.get_instance()
        embedding_service = EmbeddingService.get_instance()

        try:
            # 1. Update status to EXTRACTING
            logger.info(f"[{doc_id}] Step 1/4: Extracting text from {filename}...")
            SQLiteRepository.update_document_status(doc_id, DocumentStatus.EXTRACTING.value)
            ext = file_path.suffix.lower()
            pages_data = extract_document_text(file_path, ext)
            
            total_chars = sum(len(p.get("text", "")) for p in pages_data)
            if total_chars == 0:
                raise DocumentProcessingError("No extractable characters found in document.")

            # 2. Chunking text
            logger.info(f"[{doc_id}] Step 2/4: Chunking text ({total_chars} total characters)...")
            chunk_size = int(SQLiteRepository.get_setting("chunk_size", str(settings.CHUNK_SIZE)))
            chunk_overlap = int(SQLiteRepository.get_setting("chunk_overlap", str(settings.CHUNK_OVERLAP)))
            splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
            chunks = splitter.split_page_documents(pages_data)

            if not chunks:
                raise DocumentProcessingError("Document chunking produced zero chunks.")

            # 3. Update status to EMBEDDING
            logger.info(f"[{doc_id}] Step 3/4: Generating embeddings for {len(chunks)} chunks...")
            SQLiteRepository.update_document_status(doc_id, DocumentStatus.EMBEDDING.value, chunk_count=len(chunks), char_count=total_chars)
            texts_to_embed = [c["text"] for c in chunks]
            embeddings = embedding_service.embed_texts(texts_to_embed)

            # 4. Update status to INDEXING
            logger.info(f"[{doc_id}] Step 4/4: Indexing embeddings in ChromaDB...")
            SQLiteRepository.update_document_status(doc_id, DocumentStatus.INDEXING.value, chunk_count=len(chunks), char_count=total_chars)
            retrieval_service.add_chunks(
                doc_id=doc_id,
                filename=filename,
                chunks=chunks,
                embeddings=embeddings,
                upload_time=upload_time
            )

            # 5. Mark as READY
            SQLiteRepository.update_document_status(
                doc_id=doc_id,
                status=DocumentStatus.READY.value,
                chunk_count=len(chunks),
                char_count=total_chars
            )
            logger.info(f"[{doc_id}] Successfully indexed {filename} ({len(chunks)} chunks).")

        except Exception as e:
            error_msg = str(e)
            logger.error(f"[{doc_id}] Ingestion failed for {filename}: {error_msg}")
            
            # Clean up any partial vector chunks in ChromaDB to avoid leaving incomplete data
            try:
                retrieval_service.delete_document_chunks(doc_id)
            except Exception as cleanup_err:
                logger.warning(f"Error during vector cleanup for {doc_id}: {cleanup_err}")

            # Mark as FAILED in SQLite
            SQLiteRepository.update_document_status(
                doc_id=doc_id,
                status=DocumentStatus.FAILED.value,
                error_message=error_msg
            )
            raise
