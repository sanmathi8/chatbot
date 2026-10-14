from app.services.conversation_service import ConversationService
from app.schemas.chat import SourceReference

def test_conversation_persistence():
    # Create conversation
    conv = ConversationService.create_conversation("RAG System Design")
    assert conv.id is not None
    assert conv.title == "RAG System Design"

    # Save turn
    mock_sources = [
        SourceReference(
            id="chunk_1",
            document_id="doc_abc",
            filename="rag.pdf",
            page_number=2,
            chunk_index=0,
            excerpt="Vector search retrieves semantically similar passages.",
            score=0.91
        )
    ]
    ConversationService.save_chat_turn(
        conv_id=conv.id,
        user_message="How does vector search work?",
        assistant_message="Vector search uses similarity distance in vector space.",
        sources=mock_sources
    )

    # Fetch detail
    detail = ConversationService.get_conversation_detail(conv.id)
    assert detail is not None
    assert len(detail.messages) == 2
    assert detail.messages[0].role == "user"
    assert detail.messages[0].content == "How does vector search work?"
    assert detail.messages[1].role == "assistant"
    assert len(detail.messages[1].sources) == 1
    assert detail.messages[1].sources[0].filename == "rag.pdf"

    # Delete conversation
    assert ConversationService.delete_conversation(conv.id) is True
    assert ConversationService.get_conversation_detail(conv.id) is None

def test_generate_title():
    t1 = ConversationService.generate_title("Can you please tell me about the OKF Framework in detail?")
    assert "OKF Framework" in t1 or "Okf Framework" in t1

    t2 = ConversationService.generate_title("what is deep learning?")
    assert "Deep learning" in t2 or "Deep Learning" in t2

def test_rename_and_multi_turn(client):
    conv = ConversationService.create_conversation("Initial Title")
    
    # Test PATCH rename endpoint
    res = client.patch(f"/api/conversations/{conv.id}", json={"title": "Updated ChatGPT Title"})
    assert res.status_code == 200
    assert res.json()["title"] == "Updated ChatGPT Title"

    # Multi-turn turns
    ConversationService.save_chat_turn(conv.id, "Turn 1 question", "Turn 1 answer", [])
    ConversationService.save_chat_turn(conv.id, "Turn 2 question", "Turn 2 answer", [])

    detail = ConversationService.get_conversation_detail(conv.id)
    assert len(detail.messages) == 4
    assert detail.messages[0].content == "Turn 1 question"
    assert detail.messages[2].content == "Turn 2 question"

    # Clean up
    ConversationService.delete_conversation(conv.id)

