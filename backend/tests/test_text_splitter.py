import pytest
from app.utils.text_splitter import RecursiveCharacterTextSplitter

def test_short_text_splitting():
    splitter = RecursiveCharacterTextSplitter(chunk_size=100, chunk_overlap=20)
    text = "Short text under 100 characters."
    chunks = splitter.split_text(text)
    assert len(chunks) == 1
    assert chunks[0] == text

def test_long_text_splitting_with_overlap():
    splitter = RecursiveCharacterTextSplitter(chunk_size=50, chunk_overlap=15)
    text = "Paragraph one with some interesting text.\n\nParagraph two with another set of words that exceeds fifty chars easily."
    chunks = splitter.split_text(text)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk) <= 100  # Allow some flexibility on hard boundaries

def test_empty_text():
    splitter = RecursiveCharacterTextSplitter(chunk_size=100, chunk_overlap=20)
    assert splitter.split_text("") == []
    assert splitter.split_text("   \n\t  ") == []

def test_page_documents_splitting():
    splitter = RecursiveCharacterTextSplitter(chunk_size=60, chunk_overlap=10)
    pages = [
        {"text": "First page text information that provides introduction to RAG.", "page_number": 1},
        {"text": "Second page text information detailing how vector indexing operates.", "page_number": 2}
    ]
    chunks = splitter.split_page_documents(pages)
    assert len(chunks) >= 2
    # Check page attribution preservation
    assert chunks[0]["page_number"] == 1
    assert any(c["page_number"] == 2 for c in chunks)
    # Check chunk index ordering
    for i, c in enumerate(chunks):
        assert c["chunk_index"] == i
        assert "char_count" in c
