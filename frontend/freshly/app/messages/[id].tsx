import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { api } from '../../services/api';

type ChatMessage = {
  id: number;
  senderId: string;
  content?: string | null;
  createdAt?: string;
};

const getErrorMessage = (e: unknown, fallback: string) => {
  const err = e as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || fallback;
};

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const conversationId = useMemo(() => Number(id), [id]);
  const { getToken, userId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const loadConversation = useCallback(async () => {
    if (!conversationId || Number.isNaN(conversationId)) {
      setError('Invalid conversation id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const response = await api.get(`/messages/${conversationId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const nextMessages = Array.isArray(response?.data?.messages) ? (response.data.messages as ChatMessage[]) : [];
      setMessages(nextMessages.reverse());
      setError('');
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load conversation'));
    } finally {
      setLoading(false);
    }
  }, [conversationId, getToken]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      const token = await getToken();
      const response = await api.post(
        `/messages/${conversationId}/messages`,
        { content, type: 'TEXT' },
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
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
