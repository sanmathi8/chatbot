import type { 
  HealthStatus, 
  DocumentItem, 
  DocumentListResponse, 
  Conversation, 
  ConversationDetail, 
  AppSettings, 
  SourceReference 
} from '../types';

const API_BASE = '/api';

export class ApiService {
  static async getHealth(): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  }

  static async getDocuments(): Promise<DocumentListResponse> {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  }

  static async uploadDocument(file: File): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  }

  static async deleteDocument(docId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${docId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
  }

  static async clearAllDocuments(): Promise<void> {
    const res = await fetch(`${API_BASE}/documents`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear documents');
  }

  static async getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/conversations`);
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  }

  static async createConversation(title?: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    return res.json();
  }

  static async getConversation(id: string): Promise<ConversationDetail> {
    const res = await fetch(`${API_BASE}/conversations/${id}`);
    if (!res.ok) throw new Error('Failed to load conversation');
    return res.json();
  }

  static async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
  }

  static async renameConversation(id: string, title: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to rename conversation');
    return res.json();
  }

  static async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  }

  static async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  }

  static async sendChatMessage(
    message: string,
    conversationId?: string,
    options?: { model?: string; top_k?: number; similarity_threshold?: number }
  ): Promise<{
    conversation_id: string;
    message: string;
    sources: SourceReference[];
    model: string;
    latency_seconds: number;
  }> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        ...options,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Chat request failed' }));
      throw new Error(err.detail || 'Chat request failed');
    }
    return res.json();
  }

  static async streamChatMessage(
    message: string,
    conversationId: string | undefined,
    callbacks: {
      onConvId?: (id: string) => void;
      onSources?: (sources: SourceReference[]) => void;
      onToken?: (token: string) => void;
      onError?: (error: string) => void;
      onDone?: (latency: number) => void;
    },
    options?: { model?: string; top_k?: number; similarity_threshold?: number; signal?: AbortSignal }
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        ...options,
      }),
      signal: options?.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Stream request failed' }));
      throw new Error(err.detail || 'Stream request failed');
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('Failed to read response stream');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        if (!block.trim()) continue;
        const blockLines = block.split('\n');
        let eventType = 'message';
        let dataStr = '';

        for (const line of blockLines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            dataStr = line.slice(6).trim();
          }
        }

        if (dataStr) {
          try {
            const parsed = JSON.parse(dataStr);
            if (eventType === 'conv_id' && callbacks.onConvId) {
              callbacks.onConvId(parsed.conversation_id);
            } else if (eventType === 'sources' && callbacks.onSources) {
              callbacks.onSources(parsed);
            } else if (eventType === 'token' && callbacks.onToken) {
              callbacks.onToken(parsed.token);
            } else if (eventType === 'error' && callbacks.onError) {
              callbacks.onError(parsed.error);
            } else if (eventType === 'done' && callbacks.onDone) {
              callbacks.onDone(parsed.latency);
            }
          } catch (e) {
            console.error('Failed to parse SSE payload', e);
          }
        }
      }
    }
  }
}
