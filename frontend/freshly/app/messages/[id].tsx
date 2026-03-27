import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { api } from '../../services/api';
import { connectSocket } from '../../services/socket';

type ChatMessage = {
  id: number;
  senderId: string;
  conversationId?: number;
  content?: string | null;
  createdAt?: string;
};

type NewMessageEvent = {
  conversation?: {
    id?: number;
  };
  message?: ChatMessage;
};

const getErrorMessage = (e: unknown, fallback: string) => {
  const err = e as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || fallback;
};

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const conversationId = useMemo(() => Number(id), [id]);
  const { getToken, userId, isLoaded } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const loadConversation = useCallback(async () => {
    if (!isLoaded) {
      setLoading(true);
      return;
    }

    if (!conversationId || Number.isNaN(conversationId)) {
      setError('Invalid conversation id.');
      setLoading(false);
      return;
    }

    if (!userId) {
      setError('Login required to view this conversation.');
      setLoading(false);
      return;
    }

    setLoading(true);
    let settled = false;
    const loadingGuard = setTimeout(() => {
      if (!settled) {
        setError('Chat is taking too long to load. Please retry.');
        setLoading(false);
      }
    }, 14000);

    try {
      const token = await getToken();
      if (!token) {
        setError('Session unavailable. Please login again.');
        setLoading(false);
        return;
      }

      const response = await api.get(`/messages/${conversationId}`, {
        timeout: 12000,
        headers: { Authorization: `Bearer ${token}` },
      });
      const nextMessages = Array.isArray(response?.data?.messages) ? (response.data.messages as ChatMessage[]) : [];
      setMessages(nextMessages.reverse());
      setError('');
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load conversation'));
    } finally {
      settled = true;
      clearTimeout(loadingGuard);
      setLoading(false);
    }
  }, [conversationId, getToken, isLoaded, userId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (isLoaded) return;

    const authGuard = setTimeout(() => {
      setError('Authentication is still loading. Please reopen the chat.');
      setLoading(false);
    }, 12000);

    return () => clearTimeout(authGuard);
  }, [isLoaded]);

  useEffect(() => {
    if (!userId || !conversationId || Number.isNaN(conversationId)) return;

    const socket = connectSocket(userId);
    const joinConversation = () => {
      socket.emit('join_conversation', conversationId);
    };

    const onIncomingMessage = (payload: unknown) => {
      const parsedPayload = payload as NewMessageEvent;
      const incomingMessage = parsedPayload?.message;
      const incomingConversationId = parsedPayload?.conversation?.id ?? incomingMessage?.conversationId;

      if (!incomingMessage || Number(incomingConversationId) !== conversationId) return;

      setMessages((prev) => {
        if (prev.some((msg) => msg.id === incomingMessage.id)) return prev;
        return [...prev, incomingMessage];
      });
    };

    socket.on('connect', joinConversation);
    socket.on('new_message', onIncomingMessage);

    if (socket.connected) {
      joinConversation();
    }

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.off('connect', joinConversation);
      socket.off('new_message', onIncomingMessage);
    };
  }, [conversationId, userId]);

  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || sending || !conversationId || Number.isNaN(conversationId)) return;

    setSending(true);
    try {
      const token = await getToken();
      if (!token) {
        setError('Session unavailable. Please login again.');
        return;
      }

      const response = await api.post(
        `/messages/${conversationId}/messages`,
        { content, type: 'TEXT' },
        { timeout: 12000, headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prev) => [...prev, response.data as ChatMessage]);
      setInput('');
      setError('');
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to send message'));
    } finally {
      setSending(false);
    }
  }, [conversationId, getToken, input, sending]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-950">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="px-4 pt-14 pb-3 border-b border-gray-200 dark:border-gray-800">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">Conversation #{conversationId}</Text>
        {error ? <Text className="text-rose-600 mt-1">{error}</Text> : null}
        {error ? (
          <TouchableOpacity onPress={loadConversation} className="mt-2 self-start px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800">
            <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">Retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item, idx) => String(item?.id ?? idx)}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        renderItem={({ item }) => {
          const mine = item?.senderId === userId;
          return (
            <View className={`mb-3 ${mine ? 'items-end' : 'items-start'}`}>
              <View className={`max-w-[85%] px-4 py-2 rounded-2xl ${mine ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-800'}`}>
                <Text className={`${mine ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                  {item?.content || '(media message)'}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="items-center mt-8">
            <Text className="text-gray-500 dark:text-gray-400">No messages yet.</Text>
          </View>
        }
      />

      <View className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex-row items-center">
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message"
          placeholderTextColor="#9ca3af"
          className="flex-1 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white"
        />
        <TouchableOpacity
          className="ml-2 px-4 py-3 rounded-2xl bg-emerald-600"
          onPress={sendMessage}
          disabled={sending}
        >
          <Text className="text-white font-semibold">{sending ? '...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
