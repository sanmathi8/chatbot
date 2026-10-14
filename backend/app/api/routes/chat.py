import uuid
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas.chat import ChatRequest, ChatResponse, SourceReference
from app.services.rag_service import RAGService
from app.services.ollama_service import OllamaService
from app.services.conversation_service import ConversationService
from app.core.exceptions import OllamaServiceError
from app.core.logging import logger

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Ask a question about uploaded documents and receive a grounded answer with source references."""
    conv_id = request.conversation_id or str(uuid.uuid4())
    active_model = request.model or OllamaService.get_active_model()
    
    answer, sources, latency = await RAGService.answer_question(
        question=request.message,
        conversation_id=conv_id,
        model=active_model,
        top_k=request.top_k,
        similarity_threshold=request.similarity_threshold
    )

    # Persist the turn into SQLite
    ConversationService.save_chat_turn(
        conv_id=conv_id,
        user_message=request.message,
        assistant_message=answer,
        sources=sources
    )

    return ChatResponse(
        conversation_id=conv_id,
        message=answer,
        sources=sources,
        model=active_model,
        latency_seconds=latency
    )

@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """Stream response tokens using Server-Sent Events (SSE) while displaying source citations."""
    conv_id = request.conversation_id or str(uuid.uuid4())
    active_model = request.model or OllamaService.get_active_model()

    async def event_generator():
        accumulated_answer = []
        retrieved_sources = []
        
        # Announce conversation ID
        yield f"event: conv_id\ndata: {json.dumps({'conversation_id': conv_id})}\n\n"

        async for chunk_str in RAGService.answer_question_stream(
            question=request.message,
            conversation_id=conv_id,
            model=active_model,
            top_k=request.top_k,
            similarity_threshold=request.similarity_threshold
        ):
            try:
                data = json.loads(chunk_str)
                event_type = data.get("type", "message")
                
                if event_type == "sources":
                    retrieved_sources = data.get("sources", [])
                    yield f"event: sources\ndata: {json.dumps(retrieved_sources)}\n\n"
                elif event_type == "token":
                    token = data.get("token", "")
                    accumulated_answer.append(token)
                    yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
                elif event_type == "error":
                    yield f"event: error\ndata: {json.dumps({'error': data.get('error', 'Inference error')})}\n\n"
                    return
                elif event_type == "done":
                    yield f"event: done\ndata: {json.dumps({'latency': data.get('latency', 0.0)})}\n\n"
            except Exception as e:
                logger.error(f"Streaming parse error: {e}")

        # Save conversation turn
        full_answer = "".join(accumulated_answer)
        if full_answer:
            sources_models = [SourceReference(**s) for s in retrieved_sources]
            ConversationService.save_chat_turn(
                conv_id=conv_id,
                user_message=request.message,
                assistant_message=full_answer,
                sources=sources_models
            )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
