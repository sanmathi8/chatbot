export type DocumentStatus = 
  | 'uploaded' 
  | 'extracting' 
  | 'embedding' 
  | 'indexing' 
  | 'ready' 
  | 'failed';

export interface DocumentItem {
  id: string;
  filename: string;
  file_size: number;
  file_type: string;
  upload_time: string;
  status: DocumentStatus;
  error_message?: string | null;
  chunk_count: number;
  char_count: number;
}

export interface DocumentListResponse {
  documents: DocumentItem[];
  total: number;
}

export interface SourceReference {
  id: string;
  document_id: string;
  filename: string;
  page_number?: number | null;
  chunk_index: number;
  excerpt: string;
  score: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceReference[];
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface HealthStatus {
  status: string;
  backend_version: string;
  ollama_available: boolean;
  ollama_model: string;
  available_ollama_models: string[];
  embedding_status: string;
  embedding_model: string;
  vector_db_status: string;
  documents_count: number;
  ready_documents_count: number;
}

export interface AppSettings {
  llm_model: string;
  available_models: string[];
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
  similarity_threshold: number;
  max_upload_size_mb: number;
}
