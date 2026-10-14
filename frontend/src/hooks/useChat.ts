import { useState, useRef } from 'react';
import type { Message, SourceReference } from '../types';
import { ApiService } from '../services/api';

interface UseChatProps {
  activeConversationId: string | null;
  onTurnComplete: (convId: string) => Promise<void>;
  setActiveConversationId: (id: string) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useChat({
  activeConversationId,
  onTurnComplete,
  setActiveConversationId,
  setMessages,
}: UseChatProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingToken, setStreamingToken] = useState('');
  const [streamingSources, setStreamingSources] = useState<SourceReference[]>([]);
  const [streamingStatus, setStreamingStatus] = useState<string>('Searching documents...');
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = async (userPrompt: string) => {
    if (!userPrompt.trim() || isGenerating) return;

    // 1. Optimistically append user message
    const tempUserMsgId = `temp_user_${Date.now()}`;
    const userMsg: Message = {
      id: tempUserMsgId,
      conversation_id: activeConversationId || 'pending',
      role: 'user',
      content: userPrompt,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);
    setStreamingToken('');
    setStreamingSources([]);
    setStreamingStatus('Searching ChromaDB vectors...');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let targetConvId = activeConversationId;
    let accumulatedText = '';
    let sourcesReceived: SourceReference[] = [];

    try {
      await ApiService.streamChatMessage(
        userPrompt,
        activeConversationId || undefined,
        {
          onConvId: (id) => {
            targetConvId = id;
            setActiveConversationId(id);
          },
          onSources: (sources) => {
            sourcesReceived = sources;
            setStreamingSources(sources);
            setStreamingStatus('Generating grounded answer...');
          },
          onToken: (token) => {
            accumulatedText += token;
            setStreamingToken((prev) => prev + token);
          },
          onError: (errMsg) => {
            accumulatedText = `⚠️ Error: ${errMsg}`;
            setStreamingToken(accumulatedText);
          },
          onDone: () => {
            setIsGenerating(false);
          },
        },
        { signal: abortController.signal }
      );

      // Finalize assistant message into active messages list
      if (accumulatedText) {
        const asstMsg: Message = {
          id: `asst_${Date.now()}`,
          conversation_id: targetConvId || 'default',
          role: 'assistant',
          content: accumulatedText,
          sources: sourcesReceived,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, asstMsg]);
      }

      if (targetConvId) {
        await onTurnComplete(targetConvId);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Generation stopped by user
        if (accumulatedText) {
          const asstMsg: Message = {
            id: `asst_${Date.now()}`,
            conversation_id: targetConvId || 'default',
            role: 'assistant',
            content: accumulatedText + ' *(generation stopped)*',
            sources: sourcesReceived,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, asstMsg]);
        }
      } else {
        console.error('Chat error', err);
        const errorMsg: Message = {
          id: `error_${Date.now()}`,
          conversation_id: targetConvId || 'default',
          role: 'assistant',
          content: `Unable to complete request: ${err.message || 'Server error'}. Please verify that Ollama is running and responsive.`,
          sources: [],
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsGenerating(false);
      setStreamingToken('');
      setStreamingSources([]);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return {
    sendMessage,
    stopGeneration,
    isGenerating,
    streamingToken,
    streamingSources,
    streamingStatus,
  };
}
