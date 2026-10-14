import json
from typing import Optional, List, Dict, Any
from app.models.database import get_db_connection
from app.schemas.document import DocumentResponse, DocumentStatus
from app.schemas.conversation import ConversationResponse, MessageResponse
from app.schemas.chat import SourceReference
from app.core.logging import logger

class SQLiteRepository:
    """Repository handling all SQLite persistence operations for DocuMind."""

    # ----------------- Documents -----------------
    @staticmethod
    def add_document(doc_id: str, filename: str, file_size: int, file_type: str, file_path: str, upload_time: str, status: str = DocumentStatus.UPLOADED.value) -> None:
        conn = get_db_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO documents (id, filename, file_size, file_type, file_path, upload_time, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                    """,
                    (doc_id, filename, file_size, file_type, file_path, upload_time, status)
                )
        finally:
            conn.close()

    @staticmethod
    def update_document_status(doc_id: str, status: str, error_message: Optional[str] = None, chunk_count: int = 0, char_count: int = 0) -> None:
        conn = get_db_connection()
        try:
            with conn:
                conn.execute(
                    """
                    UPDATE documents
                    SET status = ?, error_message = ?, chunk_count = ?, char_count = ?
                    WHERE id = ?;
                    """,
                    (status, error_message, chunk_count, char_count, doc_id)
                )
        finally:
            conn.close()

    @staticmethod
    def get_document(doc_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM documents WHERE id = ?;", (doc_id,)).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    @staticmethod
    def get_all_documents() -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            rows = conn.execute("SELECT * FROM documents ORDER BY upload_time DESC;").fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    @staticmethod
    def delete_document(doc_id: str) -> bool:
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.execute("DELETE FROM documents WHERE id = ?;", (doc_id,))
                return cursor.rowcount > 0
        finally:
            conn.close()

    @staticmethod
    def delete_all_documents() -> int:
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.execute("DELETE FROM documents;")
                return cursor.rowcount
        finally:
            conn.close()

    # ----------------- Conversations -----------------
    @staticmethod
    def create_conversation(conv_id: str, title: str, created_at: str, updated_at: str) -> None:
        conn = get_db_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO conversations (id, title, created_at, updated_at)
                    VALUES (?, ?, ?, ?);
                    """,
                    (conv_id, title, created_at, updated_at)
                )
        finally:
            conn.close()

    @staticmethod
    def get_all_conversations() -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            rows = conn.execute(
                """
                SELECT c.*, COUNT(m.id) as message_count
                FROM conversations c
                LEFT JOIN messages m ON c.id = m.conversation_id
                GROUP BY c.id
                ORDER BY c.updated_at DESC;
                """
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    @staticmethod
    def get_conversation(conv_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM conversations WHERE id = ?;", (conv_id,)).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    @staticmethod
    def update_conversation(conv_id: str, updated_at: str, title: Optional[str] = None) -> None:
        conn = get_db_connection()
        try:
            with conn:
                if title:
                    conn.execute("UPDATE conversations SET updated_at = ?, title = ? WHERE id = ?;", (updated_at, title, conv_id))
                else:
                    conn.execute("UPDATE conversations SET updated_at = ? WHERE id = ?;", (updated_at, conv_id))
        finally:
            conn.close()

    @staticmethod
    def delete_conversation(conv_id: str) -> bool:
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.execute("DELETE FROM conversations WHERE id = ?;", (conv_id,))
                return cursor.rowcount > 0
        finally:
            conn.close()

    # ----------------- Messages -----------------
    @staticmethod
    def add_message(msg_id: str, conv_id: str, role: str, content: str, sources: Optional[List[Dict[str, Any]]], created_at: str) -> None:
        conn = get_db_connection()
        try:
            sources_json = json.dumps(sources) if sources else None
            with conn:
                conn.execute(
                    """
                    INSERT INTO messages (id, conversation_id, role, content, sources, created_at)
                    VALUES (?, ?, ?, ?, ?, ?);
                    """,
                    (msg_id, conv_id, role, content, sources_json, created_at)
                )
        finally:
            conn.close()

    @staticmethod
    def get_conversation_messages(conv_id: str) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            rows = conn.execute(
                "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC;",
                (conv_id,)
            ).fetchall()
            results = []
            for r in rows:
                item = dict(r)
                if item.get("sources"):
                    try:
                        item["sources"] = json.loads(item["sources"])
                    except Exception:
                        item["sources"] = []
                else:
                    item["sources"] = []
                results.append(item)
            return results
        finally:
            conn.close()

    # ----------------- Runtime Settings -----------------
    @staticmethod
    def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT value FROM settings WHERE key = ?;", (key,)).fetchone()
            return row["value"] if row else default
        finally:
            conn.close()

    @staticmethod
    def set_setting(key: str, value: str) -> None:
        conn = get_db_connection()
        try:
            with conn:
                conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);", (key, str(value)))
        finally:
            conn.close()

    @staticmethod
    def get_all_settings() -> Dict[str, str]:
        conn = get_db_connection()
        try:
            rows = conn.execute("SELECT key, value FROM settings;").fetchall()
            return {r["key"]: r["value"] for r in rows}
        finally:
            conn.close()
