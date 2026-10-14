import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.core.config import settings
from app.models.database import init_db
from app.services.ingestion_service import IngestionService
from app.services.rag_service import RAGService
from app.services.ollama_service import OllamaService
from app.services.document_service import DocumentService
from app.repositories.sqlite_repo import SQLiteRepository

async def test_live_rag():
    print("=" * 60)
    print("Testing DocuMind AI End-to-End RAG Pipeline")
    print("=" * 60)

    # 1. Initialize DB
    init_db()

    # 2. Check Ollama
    is_ollama_up = await OllamaService.is_available()
    print(f"1. Ollama Online: {is_ollama_up}")
    if is_ollama_up:
        models = await OllamaService.list_models()
        print(f"   Available models: {models}")
        active_model = OllamaService.get_active_model()
        print(f"   Active model: {active_model}")

    # 3. Ingest Sample Document
    sample_file = ROOT_DIR / "data" / "sample_documents" / "internship_handbook.txt"
    import uuid
    doc_id = f"test_{uuid.uuid4().hex[:8]}"
    upload_time = "2026-10-14T12:00:00Z"
    
    print(f"\n2. Ingesting sample document: {sample_file.name}")
    SQLiteRepository.add_document(
        doc_id=doc_id,
        filename=sample_file.name,
        file_size=sample_file.stat().st_size,
        file_type="txt",
        file_path=str(sample_file),
        upload_time=upload_time,
        status="uploaded"
    )

    IngestionService.process_document(
        doc_id=doc_id,
        file_path=sample_file,
        filename=sample_file.name,
        upload_time=upload_time
    )

    doc_info = SQLiteRepository.get_document(doc_id)
    print(f"   Document status: {doc_info['status']}")
    print(f"   Indexed chunks: {doc_info['chunk_count']}")

    # 4. Ask Grounded Question
    question = "What is the monthly internship stipend and what are the working hours?"
    print(f"\n3. Asking grounded question: '{question}'")
    answer, sources, latency = await RAGService.answer_question(question)
    print(f"\n[Answer in {latency}s]:\n{answer}")
    print(f"\n[Source Citations]:")
    for s in sources:
        print(f" - {s.filename} (Score: {s.score:.2f}) -> \"{s.excerpt[:120]}...\"")

    # 5. Ask Out-of-Scope Question
    unrelated_q = "What is the capital of Mars and who won the 1994 world cup?"
    print(f"\n4. Asking out-of-scope question: '{unrelated_q}'")
    answer_unrelated, sources_unrelated, latency_unrelated = await RAGService.answer_question(unrelated_q)
    print(f"\n[Answer in {latency_unrelated}s]:\n{answer_unrelated}")
    print(f"Sources retrieved: {len(sources_unrelated)}")

    # 6. Clean up test document
    print(f"\n5. Cleaning up test document...")
    DocumentService.delete_document(doc_id)
    print("   Test document removed from ChromaDB & SQLite.")

    print("\n" + "=" * 60)
    print("ALL LIVE RAG CHECKS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_live_rag())
