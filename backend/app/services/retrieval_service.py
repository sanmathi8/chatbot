import os
import threading
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.core.logging import logger
from app.schemas.chat import SourceReference

COLLECTION_NAME = "documind_documents"

class RetrievalService:
    """Service managing ChromaDB vector storage, indexing, and semantic search."""
    _instance: Optional["RetrievalService"] = None
    _lock = threading.Lock()

    def __init__(self):
        self._client = None
        self._collection = None

    @classmethod
    def get_instance(cls) -> "RetrievalService":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _get_collection(self):
        if self._collection is None:
            with self._lock:
                if self._collection is None:
                    import chromadb
                    from chromadb.config import Settings as ChromaSettings
                    
                    settings.CHROMA_DIR.mkdir(parents=True, exist_ok=True)
                    self._client = chromadb.PersistentClient(
                        path=str(settings.CHROMA_DIR),
                        settings=ChromaSettings(anonymized_telemetry=False)
                    )
                    self._collection = self._client.get_or_create_collection(
                        name=COLLECTION_NAME,
                        metadata={"hnsw:space": "cosine"}
                    )
                    logger.info(f"Initialized ChromaDB collection '{COLLECTION_NAME}' at {settings.CHROMA_DIR}")
        return self._collection

    def add_chunks(
        self,
        doc_id: str,
        filename: str,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
        upload_time: str
    ) -> int:
        """Store chunk texts, embeddings, and metadata into ChromaDB."""
        if not chunks or not embeddings:
            return 0

        collection = self._get_collection()
        
        ids: List[str] = []
        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []

        for chunk, emb in zip(chunks, embeddings):
            chunk_idx = chunk["chunk_index"]
            chunk_id = f"{doc_id}_{chunk_idx}"
            ids.append(chunk_id)
            documents.append(chunk["text"])
            
            # Chroma metadata requires values to be str, int, float, or bool
            page_num = chunk.get("page_number")
            meta = {
                "doc_id": doc_id,
                "filename": filename,
                "page_number": int(page_num) if page_num is not None else -1,
                "chunk_index": int(chunk_idx),
                "upload_time": str(upload_time),
                "char_count": int(chunk.get("char_count", len(chunk["text"])))
            }
            metadatas.append(meta)

        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
        logger.info(f"Indexed {len(ids)} chunks for document {doc_id} ({filename}) in ChromaDB.")
        return len(ids)

    def query_similar_chunks(
        self,
        query_embedding: List[float],
        top_k: int = 4,
        similarity_threshold: float = 0.25
    ) -> List[SourceReference]:
        """Query ChromaDB for semantically similar chunks with threshold filtering."""
        collection = self._get_collection()
        count = collection.count()
        if count == 0:
            return []

        actual_k = min(top_k, count)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=actual_k,
            include=["documents", "metadatas", "distances"]
        )

        sources: List[SourceReference] = []
        if not results or not results["ids"] or not results["ids"][0]:
            return []

        ids = results["ids"][0]
        docs = results["documents"][0] if results.get("documents") else []
        metas = results["metadatas"][0] if results.get("metadatas") else []
        distances = results["distances"][0] if results.get("distances") else []

        for chunk_id, doc_text, meta, dist in zip(ids, docs, metas, distances):
            # For cosine distance: distance is in [0, 2]. Similarity = 1 - distance
            similarity = round(max(0.0, 1.0 - float(dist)), 4)
            
            if similarity >= similarity_threshold:
                page_raw = meta.get("page_number", -1)
                page_number = int(page_raw) if page_raw != -1 else None
                
                # Excerpt up to 400 characters for concise display
                excerpt = doc_text[:400] + "..." if len(doc_text) > 400 else doc_text

                sources.append(SourceReference(
                    id=chunk_id,
                    document_id=str(meta.get("doc_id", "")),
                    filename=str(meta.get("filename", "")),
                    page_number=page_number,
                    chunk_index=int(meta.get("chunk_index", 0)),
                    excerpt=excerpt,
                    score=similarity
                ))

        # Sort by highest similarity
        sources.sort(key=lambda s: s.score, reverse=True)
        return sources

    def delete_document_chunks(self, doc_id: str) -> None:
        """Delete all indexed chunks for a given document ID."""
        collection = self._get_collection()
        try:
            collection.delete(where={"doc_id": doc_id})
            logger.info(f"Deleted vector chunks for document ID: {doc_id}")
        except Exception as e:
            logger.warning(f"Error removing chunks for doc {doc_id} from Chroma: {e}")

    def clear_all(self) -> None:
        """Drop and recreate the collection."""
        if self._client is not None:
            try:
                self._client.delete_collection(name=COLLECTION_NAME)
                self._collection = None
                self._get_collection()
                logger.info("ChromaDB collection cleared.")
            except Exception as e:
                logger.error(f"Error clearing ChromaDB collection: {e}")

    def get_status(self) -> Dict[str, Any]:
        """Check vector DB status and total indexed vector count."""
        try:
            collection = self._get_collection()
            count = collection.count()
            return {"status": "ready", "total_chunks": count}
        except Exception as e:
            return {"status": f"error: {str(e)}", "total_chunks": 0}
