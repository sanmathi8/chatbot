import time
import json
from typing import List, Dict, Any, Optional, Tuple, AsyncGenerator
from app.core.config import settings
from app.core.logging import logger
from app.schemas.chat import SourceReference, ChatResponse
from app.services.embedding_service import EmbeddingService
from app.services.retrieval_service import RetrievalService
from app.services.ollama_service import OllamaService
from app.repositories.sqlite_repo import SQLiteRepository

INSUFFICIENT_INFO_MESSAGE = "I couldn't find sufficient information to answer this question from the uploaded documents."

SYSTEM_PROMPT = """You are DocuMind AI, an intelligent, articulate, and helpful document question-answering chatbot.

Your role is to understand the user's query and provide a well-structured, natural, conversational response synthesized from the provided document context.

CORE INSTRUCTIONS:
1. STRICT FORMAT ADAPTATION:
   - If the user asks for bullet points or numbered lists (e.g., "in points", "in 3 or 4 points"), format your response as clear, crisp bullet points matching the requested format/count.
   - If the user asks for brevity/summary, be concise, clear, and direct.
   - If the user asks for detail ("in detail", "explain deeply", "more details"), provide a comprehensive, structured, in-depth explanation with relevant context from the document.
   - If the user asks for comparisons, tables, or step-by-step guides, present the information in that exact structure.

2. CONVERSATIONAL REFINEMENT (DO NOT COPY DIRECT TEXT):
   - Do NOT simply copy-paste raw excerpts or sentences directly from the document.
   - Rephrase, refine, and explain the ideas in your own words, like a modern, intelligent AI chatbot.
   - Use clean Markdown formatting (bolding important concepts, bullet points, headers where appropriate) so the answer is easy to read.

3. STRICT GROUNDING:
   - Ground all statements strictly in the facts provided in the document context.
   - If the document context does NOT contain enough information to answer the question, state clearly and honestly:
     "I couldn't find sufficient information to answer this question from the uploaded documents."
   - Never invent document facts or guess beyond what the context states.
"""

class RAGService:
    """Orchestrates query embedding, chunk retrieval, prompt composition, and LLM inference."""

    @classmethod
    def format_context(cls, sources: List[SourceReference]) -> str:
        """Format retrieved source chunks into structured prompt context."""
        context_parts = []
        for i, s in enumerate(sources, 1):
            page_info = f", Page {s.page_number}" if s.page_number is not None else ""
            context_parts.append(
                f"[Source {i}: {s.filename}{page_info}, Chunk {s.chunk_index}]\n{s.excerpt}"
            )
        return "\n\n---\n\n".join(context_parts)

    @classmethod
    def format_history(cls, conversation_id: Optional[str]) -> str:
        """Fetch and format recent messages from SQLite for multi-turn chat memory."""
        if not conversation_id:
            return ""
        try:
            messages = SQLiteRepository.get_conversation_messages(conversation_id)
            if not messages:
                return ""
            # Keep up to the last 6 messages (3 user + 3 assistant turns)
            recent = messages[-6:]
            history_lines = []
            for m in recent:
                role = "User" if m["role"] == "user" else "Assistant"
                text = m["content"][:300] + ("..." if len(m["content"]) > 300 else "")
                history_lines.append(f"{role}: {text}")
            
            if history_lines:
                return "RECENT CONVERSATION HISTORY (Previous turns in this chat):\n" + "\n".join(history_lines) + "\n\n"
            return ""
        except Exception as e:
            logger.warning(f"Could not load conversation history for {conversation_id}: {e}")
            return ""

    @classmethod
    def retrieve_context(
        cls,
        question: str,
        conversation_id: Optional[str] = None,
        top_k: Optional[int] = None,
        similarity_threshold: Optional[float] = None
    ) -> List[SourceReference]:
        """Embed question and retrieve relevant chunks from ChromaDB with multi-turn query expansion."""
        k = top_k or int(SQLiteRepository.get_setting("top_k", str(settings.TOP_K)))
        threshold = similarity_threshold if similarity_threshold is not None else float(
            SQLiteRepository.get_setting("similarity_threshold", str(settings.SIMILARITY_THRESHOLD))
        )

        embedding_service = EmbeddingService.get_instance()
        retrieval_service = RetrievalService.get_instance()

        search_query = question
        # If follow-up in existing chat is brief or referential, include the previous user query for semantic depth
        referential_triggers = [
            "it", "this", "that", "them", "these", "those",
            "more detail", "in detail", "detail", "detailed",
            "points", "bullet", "bullet points", "in points",
            "second", "third", "tell more", "explain more",
            "continue", "elaborate", "what about", "and", "why", "how so"
        ]
        if conversation_id and (len(question.split()) <= 6 or any(w in question.lower() for w in referential_triggers)):
            try:
                prev_messages = SQLiteRepository.get_conversation_messages(conversation_id)
                last_user_msgs = [m for m in prev_messages if m["role"] == "user"]
                if last_user_msgs:
                    search_query = f"{last_user_msgs[-1]['content']} {question}"
            except Exception:
                pass

        query_emb = embedding_service.embed_query(search_query)
        sources = retrieval_service.query_similar_chunks(
            query_embedding=query_emb,
            top_k=k,
            similarity_threshold=threshold
        )
        return sources

    @classmethod
    def extract_formatting_directives(cls, question: str) -> str:
        """Analyze user query and return explicit instructions to enforce requested format and length."""
        import re
        q_lower = question.lower()
        directives = []

        # 1. Bullet Points / Numbered Lists
        point_match = re.search(r'(\d+)\s*(?:to\s*(\d+))?\s*(?:points|bullets|lines|reasons|features|steps|key points)', q_lower)
        if point_match or any(w in q_lower for w in ["in points", "bullet points", "bullets", "in point", "list format", "as points", "point by point"]):
            count_hint = f" ({point_match.group(0)})" if point_match else ""
            directives.append(
                f"• FORMAT REQUIREMENT: The user explicitly requested bullet points{count_hint}. "
                "You MUST format your answer as a clean bulleted list using '-' for each point. "
                "Do NOT output a block paragraph."
            )

        # 2. Detailed / In-depth
        if any(w in q_lower for w in ["in detail", "more detail", "detailed", "in-depth", "deeply", "elaborate", "explain fully", "thoroughly"]):
            directives.append(
                "• LENGTH & DEPTH: The user requested a detailed explanation. "
                "Provide an in-depth, structured, comprehensive breakdown with clear explanations, subsections, and elaboration based on the context. "
                "Do NOT be brief or superficial."
            )
        # 3. Brief / Short Summary
        elif any(w in q_lower for w in ["briefly", "in brief", "short summary", "concise", "summarize", "quick overview"]):
            directives.append(
                "• LENGTH & DEPTH: The user requested brevity. Be concise, direct, and to the point without filler."
            )

        # 4. Table Format
        if "table" in q_lower or "tabular" in q_lower:
            directives.append(
                "• FORMAT REQUIREMENT: Format the answer as a structured Markdown table."
            )

        # Default fallback directive
        if not directives:
            directives.append("• Structure the answer cleanly using natural paragraphs and markdown formatting.")

        return "\n".join(directives)

    @classmethod
    def build_prompt(cls, context_text: str, question: str, history_text: str = "") -> str:
        """Construct the prompt incorporating context, conversation history, user query, and dynamic formatting rules."""
        directives = cls.extract_formatting_directives(question)
        history_block = f"{history_text}========================================\n" if history_text else ""
        return f"""DOCUMENT CONTEXT:
========================================
{context_text}
========================================
{history_block}
CURRENT USER REQUEST:
{question}

RESPONSE REQUIREMENTS:
{directives}
• CONVERSATIONAL CONTINUITY: If this is an ongoing chat, remember prior context while answering strictly from the document.
• REFINEMENT RULE: Do NOT copy-paste raw text directly from the document. Synthesize and explain the concepts in natural, fluent language like a modern, intelligent AI chatbot.
• FACTUAL GROUNDING: Base your answer strictly on the facts in the document context above. If the context does not contain enough information, state: "I couldn't find sufficient information to answer this question from the uploaded documents."

ANSWER:"""

    @classmethod
    async def answer_question(
        cls,
        question: str,
        conversation_id: Optional[str] = None,
        model: Optional[str] = None,
        top_k: Optional[int] = None,
        similarity_threshold: Optional[float] = None
    ) -> Tuple[str, List[SourceReference], float]:
        """Answer question using RAG pipeline (non-streaming) with conversation history."""
        start_time = time.time()
        sources = cls.retrieve_context(question, conversation_id, top_k, similarity_threshold)

        if not sources:
            latency = round(time.time() - start_time, 2)
            return INSUFFICIENT_INFO_MESSAGE, [], latency

        context_text = cls.format_context(sources)
        history_text = cls.format_history(conversation_id)
        prompt = cls.build_prompt(context_text, question, history_text)

        target_model = model or OllamaService.get_active_model()
        answer = await OllamaService.generate(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            model=target_model
        )

        latency = round(time.time() - start_time, 2)
        return answer, sources, latency

    @classmethod
    async def answer_question_stream(
        cls,
        question: str,
        conversation_id: Optional[str] = None,
        model: Optional[str] = None,
        top_k: Optional[int] = None,
        similarity_threshold: Optional[float] = None
    ) -> AsyncGenerator[str, None]:
        """Answer question using RAG pipeline with streaming SSE tokens and conversation history."""
        start_time = time.time()
        sources = cls.retrieve_context(question, conversation_id, top_k, similarity_threshold)

        # First send metadata (retrieved sources)
        sources_payload = [s.model_dump() for s in sources]
        yield json.dumps({"type": "sources", "sources": sources_payload}) + "\n"

        if not sources:
            yield json.dumps({"type": "token", "token": INSUFFICIENT_INFO_MESSAGE}) + "\n"
            yield json.dumps({"type": "done", "latency": round(time.time() - start_time, 2)}) + "\n"
            return

        context_text = cls.format_context(sources)
        history_text = cls.format_history(conversation_id)
        prompt = cls.build_prompt(context_text, question, history_text)

        target_model = model or OllamaService.get_active_model()
        async for line in OllamaService.generate_stream(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            model=target_model
        ):
            try:
                data = json.loads(line)
                if "error" in data:
                    yield json.dumps({"type": "error", "error": data["error"]}) + "\n"
                    return
                if data.get("done"):
                    yield json.dumps({"type": "done", "latency": round(time.time() - start_time, 2)}) + "\n"
                else:
                    token = data.get("token", "")
                    if token:
                        yield json.dumps({"type": "token", "token": token}) + "\n"
            except Exception:
                continue
