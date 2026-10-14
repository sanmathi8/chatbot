from fastapi import APIRouter, HTTPException, status
from typing import List
from app.schemas.conversation import (
    ConversationResponse,
    ConversationDetailResponse,
    ConversationCreateRequest,
    ConversationUpdateRequest
)
from app.services.conversation_service import ConversationService

router = APIRouter(prefix="/conversations", tags=["Conversations"])

@router.get("", response_model=List[ConversationResponse])
async def list_conversations():
    """Retrieve all conversations ordered by recent activity."""
    return ConversationService.list_conversations()

@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(request: ConversationCreateRequest = ConversationCreateRequest()):
    """Create a new conversation session."""
    return ConversationService.create_conversation(title=request.title)

@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(conversation_id: str):
    """Retrieve full message history for a specific conversation."""
    detail = ConversationService.get_conversation_detail(conversation_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return detail

@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def rename_conversation(conversation_id: str, request: ConversationUpdateRequest):
    """Rename a conversation."""
    updated = ConversationService.rename_conversation(conversation_id, request.title)
    if not updated:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return updated

@router.delete("/{conversation_id}", status_code=status.HTTP_200_OK)
async def delete_conversation(conversation_id: str):
    """Delete a conversation and all of its associated messages."""
    deleted = ConversationService.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation successfully deleted"}

