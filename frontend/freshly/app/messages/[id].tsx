import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { api } from '../../services/api';
import { connectSocket } from '../../services/socket';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { SendHorizonal } from 'lucide-react-native';

type ChatMessage = {
  id: number;
  senderId: string;
  conversationId?: number;
  content?: string | null;
  createdAt?: string;
};

type ChatUser = {
  id: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

type ConversationPayload = {
  id: number;
  participant1Id: string;
  participant2Id: string;
  participant1?: ChatUser | null;
  participant2?: ChatUser | null;
};

type ConversationResponse = {
  conversation?: ConversationPayload;
  messages?: ChatMessage[];
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
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const conversationId = useMemo(() => {
    const value = Array.isArray(id) ? id[0] : id;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }, [id]);
  const { getToken, userId, isLoaded } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);

  const getTokenWithTimeout = useCallback(async () => {
    const timeoutMs = 9000;
    return await Promise.race<string | null>([
      (async () => {
        try {
          return await getTokenRef.current();
        } catch {
          return null;
        }
      })(),
      new Promise<string | null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  }, []);

  const loadConversation = useCallback(async () => {
    if (!isLoaded) {
      setLoading(true);
      return;
    }

    if (!conversationId) {
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
      const token = await getTokenWithTimeout();
      if (!token) {
        setError('Session unavailable. Please login again.');
        setLoading(false);
        return;
      }

      const response = await api.get(`/messages/${conversationId}`, {
        timeout: 12000,
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = (response?.data || {}) as ConversationResponse;
      const nextMessages = Array.isArray(data.messages) ? data.messages : [];
      const conv = data.conversation;

      if (conv) {
        const fallbackPeerId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
        const peer = conv.participant1Id === userId ? conv.participant2 : conv.participant1;
        setOtherUser({
          id: peer?.id || fallbackPeerId,
          displayName: peer?.displayName || 'Unknown User',
          avatarUrl: peer?.avatarUrl || null,
        });
      } else {
        setOtherUser(null);
      }

      setMessages(nextMessages.reverse());
      setError('');
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load conversation'));
    } finally {
      settled = true;
      clearTimeout(loadingGuard);
      setLoading(false);
    }
  }, [conversationId, getTokenWithTimeout, isLoaded, userId]);

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
    if (!userId || !conversationId) return;

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
    if (!content || sending || !conversationId) return;

    setSending(true);
    try {
      const token = await getTokenWithTimeout();
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
  }, [conversationId, getTokenWithTimeout, input, sending]);

  if (!conversationId && !loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950 px-6">
        <Text className="text-lg font-bold text-slate-900 dark:text-white">Invalid chat</Text>
        <Text className="mt-2 text-center text-slate-600 dark:text-slate-300">This conversation link is not valid.</Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/messages')}
          className="mt-5 px-5 py-3 rounded-2xl bg-emerald-600"
        >
          <Text className="text-white font-semibold">Back to Messages</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
      <LinearGradient
        colors={isDark ? ['#0f172a', '#064e3b'] : ['#dbeafe', '#dcfce7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-5 pt-14 pb-5 rounded-b-[24px]"
      >
        <View className="flex-row items-center">
          <Image
            source={{ uri: otherUser?.avatarUrl || 'https://via.placeholder.com/72' }}
            className="w-12 h-12 rounded-full border border-white/40 dark:border-slate-600"
          />
          <View className="ml-3 flex-1">
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-slate-700 dark:text-slate-200">Freshly Chat</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white mt-0.5" numberOfLines={1}>
              {otherUser?.displayName || 'Conversation'}
            </Text>
          </View>
        </View>
        {error ? <Text className="text-rose-700 dark:text-rose-300 mt-2">{error}</Text> : <Text className="text-slate-600 dark:text-slate-300 mt-2">Real-time messaging is active</Text>}
        {error ? (
          <TouchableOpacity onPress={loadConversation} className="mt-3 self-start px-3 py-2 rounded-xl bg-white/85 dark:bg-slate-900/85 border border-slate-200 dark:border-slate-700">
            <Text className="text-xs font-semibold text-slate-800 dark:text-slate-100">Retry</Text>
          </TouchableOpacity>
        ) : null}
      </LinearGradient>

      <FlatList
        data={messages}
        keyExtractor={(item, idx) => String(item?.id ?? idx)}
        contentContainerStyle={{ padding: 16, paddingBottom: 96, paddingTop: 14 }}
        renderItem={({ item }) => {
          const mine = item?.senderId === userId;
          return (
            <View className={`mb-3 ${mine ? 'items-end' : 'items-start'}`}>
              <View className={`max-w-[86%] px-4 py-2.5 rounded-2xl ${mine ? 'bg-emerald-600 border border-emerald-500' : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
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
          className="flex-1 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
        />
        <TouchableOpacity
          className="ml-2 w-12 h-12 rounded-2xl bg-emerald-600 items-center justify-center"
          onPress={sendMessage}
          disabled={sending}
          activeOpacity={0.88}
        >
          {sending ? <ActivityIndicator size="small" color="#ffffff" /> : <SendHorizonal size={18} color="#ffffff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
