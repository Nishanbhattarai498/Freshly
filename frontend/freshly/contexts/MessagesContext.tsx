import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { api } from '../services/api';
import { connectSocket } from '../services/socket';

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

type MessagesProviderProps = {
  children: ReactNode;
};

export const MessagesProvider = ({ children }: MessagesProviderProps) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const { getToken, userId, isLoaded } = useAuth();
  const lastRealtimeRefreshRef = useRef(0);

  const getTokenWithTimeout = useCallback(async (timeoutMs = 7000) => {
    try {
      return await Promise.race<string | null>([
        getToken(),
        new Promise<string | null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
      ]);
    } catch {
      return null;
    }
  }, [getToken]);

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

  const fetchMessages = useCallback(async (conversationId: number) => {
    if (!isLoaded || !userId) {
      setMessages([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = await getTokenWithTimeout();
      const response = await api.get(`/messages/${conversationId}`, {
        timeout: 12000,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const nextMessages = Array.isArray(response?.data?.messages)
        ? (response.data.messages as ConversationMessage[]).slice().reverse()
        : [];
      setMessages(nextMessages);
      setError(null);
    } catch (err) {
      setError(err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [getTokenWithTimeout, isLoaded, userId]);

  const fetchConversations = useCallback(async () => {
    if (!isLoaded || !userId) {
      setConversations([]);
      setUnreadMap({});
      setError(null);
      setLoading(false);
      return [] as Conversation[];
    }

    setLoading(true);
    try {
      const token = await getTokenWithTimeout();
      const response = await api.get('/messages', {
        timeout: 12000,
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
  }, [getTokenWithTimeout, isLoaded, userId]);

  const refreshFromRealtime = useCallback(() => {
    const now = Date.now();
    if (now - lastRealtimeRefreshRef.current < 750) {
      return;
    }
    lastRealtimeRefreshRef.current = now;
    void fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!isLoaded || !userId) return;

    const socket = connectSocket(userId);

    const joinRooms = () => {
      socket.emit('join_user', userId);
      for (const conv of conversations) {
        socket.emit('join_conversation', conv.id);
      }
    };

    const onConnect = () => {
      joinRooms();
      refreshFromRealtime();
    };

    const onRealtimeUpdate = () => {
      refreshFromRealtime();
    };

    socket.on('connect', onConnect);
    socket.on('new_message', onRealtimeUpdate);
    socket.on('conversation_started', onRealtimeUpdate);

    if (socket.connected) {
      joinRooms();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('new_message', onRealtimeUpdate);
      socket.off('conversation_started', onRealtimeUpdate);
    };
  }, [isLoaded, userId, conversations, refreshFromRealtime]);

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
