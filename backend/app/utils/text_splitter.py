from typing import List, Dict, Any, Optional
import re

class RecursiveCharacterTextSplitter:
    """
    Splits text hierarchically into chunks based on character count with overlap.
    Supports splitting multi-page documents while retaining page attribution.
    """
    def __init__(
        self,
        chunk_size: int = 800,
        chunk_overlap: int = 120,
        separators: Optional[List[str]] = None
    ):
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be smaller than chunk_size")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", "? ", "! ", " ", ""]

    def _split_text_with_separator(self, text: str, separator: str) -> List[str]:
        if not separator:
            return list(text)
        return text.split(separator)

    def _merge_splits(self, splits: List[str], separator: str) -> List[str]:
        docs: List[str] = []
        current_doc: List[str] = []
        total_len = 0

        for s in splits:
            s_len = len(s)
            if not s.strip():
                continue

            join_len = len(separator) if current_doc else 0
            if total_len + s_len + join_len > self.chunk_size:
                if current_doc:
                    doc = separator.join(current_doc).strip()
                    if doc:
                        docs.append(doc)
                    # Keep overlap
                    while current_doc and total_len > self.chunk_overlap:
                        removed = current_doc.pop(0)
                        total_len -= len(removed) + (len(separator) if current_doc else 0)
                
                # If a single split item is still larger than chunk_size, recursively split with smaller separator
                if s_len > self.chunk_size:
                    # Recursive fallback is handled by split_text
                    current_doc.append(s)
                    total_len += s_len
                else:
                    current_doc.append(s)
                    total_len += s_len
            else:
                current_doc.append(s)
                total_len += s_len + join_len

        if current_doc:
            doc = separator.join(current_doc).strip()
            if doc:
                docs.append(doc)

        return docs

    def split_text(self, text: str) -> List[str]:
        """Split a raw text string into chunks."""
        text = text.strip()
        if not text:
            return []
        if len(text) <= self.chunk_size:
            return [text]

        # Find best separator
        chosen_separator = self.separators[-1]
        for sep in self.separators:
            if sep == "":
                chosen_separator = ""
                break
            if sep in text:
                chosen_separator = sep
                break

        splits = self._split_text_with_separator(text, chosen_separator)
        
        # Check if any chunk needs further splitting
        final_chunks: List[str] = []
        accumulated: List[str] = []
        
        for item in splits:
            if len(item) > self.chunk_size:
                # Flush accumulated
                if accumulated:
                    final_chunks.extend(self._merge_splits(accumulated, chosen_separator))
                    accumulated = []
                # Find next separator index
                idx = self.separators.index(chosen_separator) if chosen_separator in self.separators else len(self.separators) - 1
                sub_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=self.chunk_size,
                    chunk_overlap=self.chunk_overlap,
                    separators=self.separators[idx + 1:] if idx + 1 < len(self.separators) else [""]
                )
                final_chunks.extend(sub_splitter.split_text(item))
            else:
                accumulated.append(item)

        if accumulated:
            final_chunks.extend(self._merge_splits(accumulated, chosen_separator))

        return [c.strip() for c in final_chunks if c.strip()]

    def split_page_documents(self, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Takes a list of page dicts: [{'text': '...', 'page_number': 1}, ...]
        Returns chunks with metadata: [{'text': '...', 'page_number': 1, 'chunk_index': 0}, ...]
        """
        chunks_with_meta: List[Dict[str, Any]] = []
        chunk_idx = 0

        for page in pages:
            raw_text = page.get("text", "")
            page_num = page.get("page_number")
            page_chunks = self.split_text(raw_text)

            for chunk in page_chunks:
                chunks_with_meta.append({
                    "text": chunk,
                    "page_number": page_num,
                    "chunk_index": chunk_idx,
                    "char_count": len(chunk)
                })
                chunk_idx += 1

        return chunks_with_meta
