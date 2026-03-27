import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl, Modal, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../services/api';
import { useUser } from '@clerk/clerk-expo';
import { MessageCircle, Trash2, WifiOff } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket } from '../../services/socket';
import { useMessages } from '../../contexts/MessagesContext';
import { LinearGradient } from 'expo-linear-gradient';

const safeRelativeDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceToNow(date, { addSuffix: true });
};

export default function MessagesTab() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const { colorScheme } = useColorScheme();
  const { state, fetchConversations } = useMessages();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const unreadMap = state.unreadMap;
  const conversations = state.conversations;
  const [socketConnected, setSocketConnected] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // fetchConversations is provided by the MessagesProvider; call it when focused

  useFocusEffect(
    useCallback(() => {
      if (!isLoaded) {
        setLoading(true);
        return () => undefined;
      }

      if (!isSignedIn || !user?.id) {
        setLoading(false);
        setSocketConnected(false);
        return () => undefined;
      }

      const hasExisting = conversations.length > 0;
      if (!hasExisting) setLoading(true);

      let fetchSettled = false;
      const loadingGuard = setTimeout(() => {
        if (!fetchSettled) {
          setLoading(false);
        }
      }, 13000);

      fetchConversations()
        .catch(() => undefined)
        .finally(() => {
          fetchSettled = true;
          clearTimeout(loadingGuard);
          setLoading(false);
        });

      let socket = null;
      socket = connectSocket(user.id);
      setSocketConnected(Boolean(socket?.connected));

      socket.on('connect', () => setSocketConnected(true));
      socket.on('disconnect', () => setSocketConnected(false));

      // polling fallback in case socket is not available
      const poll = setInterval(() => {
        void fetchConversations().catch(() => undefined);
      }, 10000);

      return () => {
        if (socket) {
          socket.off('connect');
          socket.off('disconnect');
        }
        clearTimeout(loadingGuard);
        clearInterval(poll);
      };
    }, [fetchConversations, user?.id, conversations.length, isLoaded, isSignedIn])
  );

  // Provider already registers global socket listeners. No-op here.

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations().catch(() => undefined);
    setRefreshing(false);
  };

  const handleDelete = (conversationId: number) => {
    setDeleteTargetId(conversationId);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId || deleting) return;
    setDeleting(true);
    try {
      try {
        await api.delete(`/messages/${deleteTargetId}`);
      } catch {
        console.log('Backend delete not supported or failed, falling back to local hide');
      }

      const deletedIds = await AsyncStorage.getItem(`deleted_chats_${user?.id}`);
      const currentDeleted: string[] = deletedIds ? JSON.parse(deletedIds) : [];
      const newDeleted = [...currentDeleted, deleteTargetId.toString()];
      await AsyncStorage.setItem(`deleted_chats_${user?.id}`, JSON.stringify(newDeleted));

      await fetchConversations();
      setDeleteModalVisible(false);
      setDeleteTargetId(null);
    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('Could not delete', 'Please try again in a moment.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (isLoaded && !isSignedIn) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950 px-6">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">Login required</Text>
        <Text className="text-sm text-gray-600 dark:text-gray-300 mt-2 text-center">Sign in to view your conversations.</Text>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          className="mt-5 px-5 py-3 rounded-2xl bg-emerald-600"
        >
          <Text className="text-white font-bold">Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      <LinearGradient
        colors={colorScheme === 'dark' ? ['#0f172a', '#0b1220'] : ['#0ea5e9', '#22c55e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pt-14 pb-6 px-6 mb-2 z-10 rounded-b-[24px] shadow-lg"
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-3xl font-extrabold text-white tracking-tight">Messages</Text>
          <View className={`px-3 py-1 rounded-full flex-row items-center ${socketConnected ? 'bg-white/15' : 'bg-white/10'}`}>
            {!socketConnected && <WifiOff size={14} color="#fff" className="mr-1" />}
            <Text className="text-white text-xs font-semibold">{socketConnected ? 'Live' : 'Offline'}</Text>
          </View>
        </View>
      </LinearGradient>

      {!socketConnected && (
        <View className="px-6 -mt-1 mb-3">
          <TouchableOpacity
            onPress={onRefresh}
            className="flex-row items-center justify-between px-4 py-3 rounded-2xl bg-gray-900/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800"
            activeOpacity={0.85}
          >
            <View className="flex-row items-center">
              <WifiOff size={16} color={colorScheme === 'dark' ? '#e2e8f0' : '#0f172a'} />
              <Text className="ml-2 text-sm font-semibold" style={{ color: colorScheme === 'dark' ? '#e2e8f0' : '#0f172a' }}>Reconnect</Text>
            </View>
            <Text className="text-xs" style={{ color: colorScheme === 'dark' ? '#cbd5e1' : '#475569' }}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={10}
        updateCellsBatchingPeriod={50}
        ListEmptyComponent={
          <View className="items-center justify-center mt-20">
            <MessageCircle size={48} color="#e5e7eb" />
            <Text className="text-gray-400 mt-4">No messages yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const candidateUser = item.participant1Id === user?.id ? item.participant2 : item.participant1;
          const otherUser = candidateUser || { displayName: 'Unknown User', avatarUrl: '' };
          const lastMessage = item.messages[0];
          const isPending = item.status === 'PENDING';
          const isReceiver = item.participant2Id === user?.id;
          const isUnread = unreadMap[item.id];

          return (
            <TouchableOpacity
              onPress={() => router.push(`/messages/${item.id}`)}
              className="flex-row items-center mb-3 p-4 rounded-2xl bg-white/90 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm"
              activeOpacity={0.9}
            >
              <View className="w-12 h-12 rounded-full overflow-hidden mr-3 bg-gray-100 dark:bg-gray-800">
                <Image
                  source={{ uri: otherUser.avatarUrl || 'https://via.placeholder.com/40' }}
                  className="w-full h-full"
                />
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className={`text-base ${isUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-800 dark:text-gray-200'}`} numberOfLines={1}>
                    {otherUser.displayName}
                  </Text>
                  {lastMessage && safeRelativeDate(lastMessage.createdAt) ? (
                    <Text className={`text-[11px] ${isUnread ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                      {safeRelativeDate(lastMessage.createdAt)}
                    </Text>
                  ) : null}
                </View>
                <Text
                  className={`text-sm ${isUnread ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-600 dark:text-gray-400'}`}
                  numberOfLines={1}
                >
                  {lastMessage
                    ? `${lastMessage.senderName || (lastMessage.senderId === user?.id ? 'You' : otherUser.displayName)}: ${lastMessage.content || 'Media message'}`
                    : 'Start chatting...'}
                </Text>
                {isPending && isReceiver && (
                  <Text className="text-[11px] text-emerald-600 font-semibold mt-1">Pending</Text>
                )}
              </View>
              {(isPending && isReceiver) || isUnread ? (
                <View className="w-5 h-5 bg-emerald-500 rounded-full ml-2 items-center justify-center shadow">
                  <Text className="text-white text-[10px] font-bold">•</Text>
                </View>
              ) : null}
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                className="ml-3 p-1.5"
              >
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        transparent
        visible={deleteModalVisible}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <Pressable className="flex-1 bg-black/40" onPress={() => setDeleteModalVisible(false)}>
          <Pressable
            className="mt-auto bg-white dark:bg-gray-900 rounded-t-3xl p-6 border-t border-gray-100 dark:border-gray-800"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-extrabold text-gray-900 dark:text-white">Delete conversation?</Text>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <Text className="text-gray-400 text-lg">✕</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-gray-600 dark:text-gray-300 text-sm mb-6">This removes the thread from your inbox. The other person may still keep their copy.</Text>
            <View className="flex-row">
              <TouchableOpacity
                className="flex-1 mr-3 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800"
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text className="text-center font-semibold text-gray-800 dark:text-gray-200">Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-2xl bg-rose-600"
                onPress={confirmDelete}
                disabled={deleting}
              >
                <Text className="text-center font-semibold text-white">{deleting ? 'Deleting...' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}