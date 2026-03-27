import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Bell, CheckCheck, MessageCircle, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

type AppNotification = {
  id: number;
  message: string;
  type: 'MESSAGE' | 'SYSTEM' | 'FRIEND_REQUEST' | 'FRIEND_ACCEPT';
  read: boolean;
  relatedId?: string | null;
  createdAt?: string;
};

const safeRelativeTime = (value?: string) => {
  if (!value) return 'just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'just now';
  return formatDistanceToNow(date, { addSuffix: true });
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications');
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const openNotification = async (item: AppNotification) => {
    if (!item.read) {
      try {
        await api.put(`/notifications/${item.id}/read`);
        setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, read: true } : p)));
      } catch {
        // Keep UI responsive even if mark-read fails.
      }
    }

    if (item.type === 'MESSAGE' && item.relatedId && /^\d+$/.test(item.relatedId)) {
      router.push(`/messages/${item.relatedId}`);
    }
  };

  const markAllRead = async () => {
    if (!unreadCount || markingAll) return;
    setMarkingAll(true);
    try {
      await api.put('/notifications/read-all');
      setItems((prev) => prev.map((p) => ({ ...p, read: true })));
    } catch {
      // No-op; user can still read individually.
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <LinearGradient
        colors={isDark ? ['#0f172a', '#064e3b'] : ['#dbeafe', '#dcfce7']}
        className="px-5 pt-14 pb-6 rounded-b-[26px]"
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-black text-gray-900 dark:text-white">Notifications</Text>
            <Text className="text-sm text-gray-600 dark:text-gray-300 mt-1">{unreadCount} unread updates</Text>
          </View>
          <Pressable
            onPress={markAllRead}
            className="px-3 py-2 rounded-full border border-emerald-200 dark:border-emerald-700 bg-white/70 dark:bg-slate-900/60"
          >
            <Text className="text-emerald-700 dark:text-emerald-200 text-xs font-bold">{markingAll ? '...' : 'Mark all read'}</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#10b981" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ListEmptyComponent={
            <View className="items-center mt-24">
              <Bell size={46} color={isDark ? '#64748b' : '#94a3b8'} />
              <Text className="mt-3 text-gray-500 dark:text-gray-400">Nothing new right now.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openNotification(item)}
              className={`mb-3 rounded-2xl p-4 border ${item.read ? 'bg-white dark:bg-slate-900 border-gray-100 dark:border-gray-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'}`}
            >
              <View className="flex-row items-start">
                <View className="w-10 h-10 rounded-full items-center justify-center bg-white/80 dark:bg-slate-800/80 mr-3">
                  {item.type === 'MESSAGE' ? <MessageCircle size={18} color="#0ea5e9" /> : <ShieldCheck size={18} color="#10b981" />}
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white font-semibold">{item.message}</Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">{safeRelativeTime(item.createdAt)}</Text>
                </View>
                {item.read ? <CheckCheck size={16} color="#64748b" /> : <View className="w-2 h-2 rounded-full bg-emerald-500 mt-1" />}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
