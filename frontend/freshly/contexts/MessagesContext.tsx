import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { api } from '../services/api';

export type ConversationMessage = {
  id: number;
  senderId: string;
  senderName?: string;
  content?: string | null;
  createdAt: string;
};

export type Conversation = {
  id: number;
  itemId?: number | null;
  participant1Id: string;
  participant2Id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  participant1: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  participant2: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  messages: ConversationMessage[];
};

type MessagesState = {
  conversations: Conversation[];
  unreadMap: Record<number, boolean>;
};

type MessagesContextValue = {
  state: MessagesState;
  messages: ConversationMessage[];
  conversations: Conversation[];
  unreadMap: Record<number, boolean>;
  loading: boolean;
  error: unknown;
  addMessage: (message: ConversationMessage) => void;
  updateMessage: (messageId: number, updates: Partial<ConversationMessage>) => void;
  deleteMessage: (messageId: number) => void;
  fetchMessages: (conversationId: number) => Promise<void>;
  fetchConversations: () => Promise<Conversation[]>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
};

const MessagesContext = createContext<MessagesContextValue | undefined>(undefined);

export const MessagesProvider = ({ children }) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const { getToken, userId } = useAuth();

  const addMessage = useCallback((message: ConversationMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback((messageId: number, updates: Partial<ConversationMessage>) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  const deleteMessage = useCallback((messageId: number) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  const fetchMessages = useCallback(async (_conversationId: number) => {
    setLoading(true);
    try {
      // API call here
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await api.get('/messages', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const nextConversations = Array.isArray(response?.data) ? (response.data as Conversation[]) : [];
      setConversations(nextConversations);

      const nextUnreadMap: Record<number, boolean> = {};
      for (const conv of nextConversations) {
        const lastMessage = conv?.messages?.[0];
        nextUnreadMap[conv.id] = Boolean(lastMessage && lastMessage.senderId && lastMessage.senderId !== userId);
      }
      setUnreadMap(nextUnreadMap);
      setError(null);
      return nextConversations;
    } catch (err) {
      setError(err);
      setConversations([]);
      setUnreadMap({});
      return [] as Conversation[];
    } finally {
      setLoading(false);
    }
  }, [getToken, userId]);

  const state: MessagesState = {
    conversations,
    unreadMap,
  };

  const value: MessagesContextValue = {
    state,
    messages,
    conversations,
    unreadMap,
    loading,
    error,
    addMessage,
    updateMessage,
    deleteMessage,
    fetchMessages,
    fetchConversations,
    setConversations,
  };

  return (
    <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages must be used within MessagesProvider');
  }
  return context;
};
