import uuid
import datetime
from typing import List, Dict, Any, Optional
from app.repositories.sqlite_repo import SQLiteRepository
from app.schemas.conversation import ConversationResponse, ConversationDetailResponse, MessageResponse
from app.schemas.chat import SourceReference

class ConversationService:
    """Service managing conversations and persisted chat message history."""

    @classmethod
    def create_conversation(cls, title: Optional[str] = None) -> ConversationResponse:
        conv_id = str(uuid.uuid4())
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        conv_title = title or "New Conversation"
        SQLiteRepository.create_conversation(conv_id, conv_title, now, now)
        return ConversationResponse(
            id=conv_id,
            title=conv_title,
            created_at=now,
            updated_at=now,
            message_count=0
        )

    @classmethod
    def list_conversations(cls) -> List[ConversationResponse]:
        rows = SQLiteRepository.get_all_conversations()
        return [
            ConversationResponse(
                id=r["id"],
                title=r["title"],
                created_at=r["created_at"],
                updated_at=r["updated_at"],
                message_count=r.get("message_count", 0)
            )
            for r in rows
        ]

    @classmethod
    def get_conversation_detail(cls, conv_id: str) -> Optional[ConversationDetailResponse]:
        conv = SQLiteRepository.get_conversation(conv_id)
        if not conv:
            return None
        messages_raw = SQLiteRepository.get_conversation_messages(conv_id)
        
        messages = []
        for m in messages_raw:
            sources_list = [SourceReference(**s) for s in m.get("sources", [])]
            messages.append(MessageResponse(
                id=m["id"],
                conversation_id=m["conversation_id"],
                role=m["role"],
                content=m["content"],
                sources=sources_list,
                created_at=m["created_at"]
            ))

        return ConversationDetailResponse(
            id=conv["id"],
            title=conv["title"],
            created_at=conv["created_at"],
            updated_at=conv["updated_at"],
            messages=messages
        )

    @staticmethod
    def generate_title(prompt: str) -> str:
        """Generate a clean, concise ChatGPT-style title from the user's prompt."""
        import re
        cleaned = prompt.strip()
        # Remove markdown symbols and quotes
        cleaned = re.sub(r'[*_#`"\']', '', cleaned).strip()
        # Remove leading common conversational prefixes
        cleaned = re.sub(
            r'^(can you please|could you please|please|can you|could you|tell me about|what is|what are|explain|describe|give me|give now about|give|summarize|how does|how do|who is|show me)\s+',
            '',
            cleaned,
            flags=re.IGNORECASE
        )
        # Remove trailing punctuation
        cleaned = re.sub(r'^[^\w]+|[^\w\s]+$', '', cleaned).strip()
        if not cleaned:
            cleaned = prompt.strip()[:35]
        
        words = cleaned.split()
        if len(words) > 6:
            words = words[:6]
        title = " ".join(words)
        title = title[0].upper() + title[1:] if title else "Document Discussion"
        if len(title) > 36:
            title = title[:33] + "..."
        return title

    @classmethod
    def save_chat_turn(
        cls,
        conv_id: str,
        user_message: str,
        assistant_message: str,
        sources: List[SourceReference]
    ) -> None:
        """Save a user query and assistant response turn to SQLite, updating conversation."""
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        conv = SQLiteRepository.get_conversation(conv_id)
        
        # If conversation doesn't exist, create it with a clean title
        if not conv:
            title = cls.generate_title(user_message)
            SQLiteRepository.create_conversation(conv_id, title, now, now)
        else:
            # If current title is default, update it with a clean title
            if conv["title"] == "New Conversation":
                new_title = cls.generate_title(user_message)
                SQLiteRepository.update_conversation(conv_id, now, title=new_title)
            else:
                SQLiteRepository.update_conversation(conv_id, now)

        # Insert user message
        user_msg_id = str(uuid.uuid4())
        SQLiteRepository.add_message(user_msg_id, conv_id, "user", user_message, None, now)

        # Insert assistant message
        asst_msg_id = str(uuid.uuid4())
        sources_dicts = [s.model_dump() for s in sources]
        SQLiteRepository.add_message(asst_msg_id, conv_id, "assistant", assistant_message, sources_dicts, now)

    @classmethod
    def rename_conversation(cls, conv_id: str, new_title: str) -> Optional[ConversationResponse]:
        conv = SQLiteRepository.get_conversation(conv_id)
        if not conv:
            return None
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        clean_title = new_title.strip() or "Untitled Chat"
        SQLiteRepository.update_conversation(conv_id, now, title=clean_title)
        conv["title"] = clean_title
        conv["updated_at"] = now
        return ConversationResponse(
            id=conv["id"],
            title=conv["title"],
            created_at=conv["created_at"],
            updated_at=conv["updated_at"],
            message_count=0
        )

    @classmethod
    def delete_conversation(cls, conv_id: str) -> bool:
        return SQLiteRepository.delete_conversation(conv_id)

