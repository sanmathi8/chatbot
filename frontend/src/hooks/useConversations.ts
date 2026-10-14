import { useState, useEffect, useCallback } from 'react';
import type { Conversation, Message } from '../types';
import { ApiService } from '../services/api';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const list = await ApiService.getConversations();
      setConversations(list);
      return list;
    } catch (e) {
      console.error('Failed to load conversations', e);
      return [];
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const detail = await ApiService.getConversation(id);
      setActiveConversationId(id);
      setActiveMessages(detail.messages || []);
    } catch (e) {
      console.error('Failed to load conversation messages', e);
      setActiveMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations().then((list) => {
      if (list.length > 0 && !activeConversationId) {
        // Automatically select the most recent conversation
        loadConversation(list[0].id);
      }
    });
  }, [fetchConversations]);

  const newChat = () => {
    setActiveConversationId(null);
    setActiveMessages([]);
  };

  const deleteConversation = async (id: string) => {
    try {
      await ApiService.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        newChat();
      }
    } catch (e) {
      console.error('Failed to delete conversation', e);
    }
  };

  const renameConversation = async (id: string, newTitle: string) => {
    try {
      const updated = await ApiService.renameConversation(id, newTitle);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c))
      );
    } catch (e) {
      console.error('Failed to rename conversation', e);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  return {
    conversations,
    activeConversationId,
    activeConversation,
    activeMessages,
    setActiveMessages,
    setActiveConversationId,
    isLoading,
    loadConversation,
    newChat,
    deleteConversation,
    renameConversation,
    refreshConversations: fetchConversations,
  };
}
