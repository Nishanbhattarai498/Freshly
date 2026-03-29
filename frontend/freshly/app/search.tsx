import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, UserRound, Package2, Sparkles } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../services/api';
import { useUser } from '@clerk/clerk-expo';
import type { Item } from '../store';

type FoundUser = {
  id: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  role?: 'SHOPKEEPER' | 'CUSTOMER';
  rating?: {
    average: number;
    count: number;
  };
};

const getSearchText = (item: Item) => {
  return [item.title, item.description, item.category, item.location?.address, item.user?.displayName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

export default function SearchScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const { user } = useUser();
  const isDark = colorScheme === 'dark';

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'items' | 'people'>('items');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Vegetables' | 'Fruits' | 'Bakery' | 'Meals' | 'Dairy' | 'Other'>('All');
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<FoundUser[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const itemCategories = ['All', 'Vegetables', 'Fruits', 'Bakery', 'Meals', 'Dairy', 'Other'] as const;

  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const response = await api.get('/items');
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const q = query.trim();
    if (mode !== 'people') return;
    if (q.length < 2) {
      setUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const response = await api.get('/users/search', { params: { q } });
        const nextUsers = Array.isArray(response.data) ? response.data as FoundUser[] : [];
        setUsers(nextUsers.filter((u) => u.id !== user?.id));
      } catch {
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [mode, query, user?.id]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      const matchesQuery = !q || getSearchText(item).includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [categoryFilter, items, query]);

  const startConversation = async (receiverId: string) => {
    try {
      const response = await api.post('/messages/start', { receiverId });
      router.push(`/messages/${response.data.id}`);
    } catch {
      Alert.alert('Chat unavailable', 'Could not open chat right now. Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <LinearGradient
        colors={isDark ? ['#0f172a', '#064e3b'] : ['#e0f2fe', '#dcfce7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-6 pt-14 pb-8 rounded-b-[28px]"
      >
        <Text className="text-3xl font-black text-gray-900 dark:text-white">Discover Nearby</Text>
        <Text className="text-sm text-gray-700 dark:text-gray-200 mt-2">Search food listings and connect with people quickly.</Text>

        <View className="mt-5 flex-row items-center bg-white/85 dark:bg-slate-900/80 border border-white/30 dark:border-slate-700 rounded-2xl px-4 py-3">
          <Search size={18} color={isDark ? '#cbd5e1' : '#0f172a'} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={mode === 'items' ? 'Search items, categories, locations...' : 'Search people by name or email...'}
            placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
            className="flex-1 ml-3 text-[15px] text-gray-900 dark:text-white"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        <View className="mt-4 flex-row">
          <Pressable
            onPress={() => setMode('items')}
            className={`mr-2 px-4 py-2 rounded-full border ${mode === 'items' ? 'bg-emerald-600 border-emerald-600' : 'bg-white/70 dark:bg-slate-900/70 border-slate-300 dark:border-slate-700'}`}
          >
            <Text className={`font-semibold ${mode === 'items' ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>Items</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('people')}
            className={`px-4 py-2 rounded-full border ${mode === 'people' ? 'bg-emerald-600 border-emerald-600' : 'bg-white/70 dark:bg-slate-900/70 border-slate-300 dark:border-slate-700'}`}
          >
            <Text className={`font-semibold ${mode === 'people' ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>People</Text>
          </Pressable>
        </View>

        {mode === 'items' ? (
          <>
            <View className="mt-4 flex-row flex-wrap">
              {itemCategories.map((category) => {
                const active = categoryFilter === category;
                return (
                  <Pressable
                    key={category}
                    onPress={() => setCategoryFilter(category)}
                    className={`mr-2 mb-2 px-4 py-2 rounded-full border ${active ? 'bg-emerald-600 border-emerald-600' : 'bg-white/70 dark:bg-slate-900/70 border-slate-300 dark:border-slate-700'}`}
                  >
                    <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{category}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="text-xs text-gray-700 dark:text-gray-200 mt-1">
              {loadingItems ? 'Loading listings...' : `${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'} found`}
            </Text>
          </>
        ) : (
          <Text className="text-xs text-gray-700 dark:text-gray-200 mt-4">
            {query.trim().length < 2 ? 'Type at least 2 characters to search people.' : `${users.length} people found`}
          </Text>
        )}
      </LinearGradient>

      {mode === 'items' ? (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          ListEmptyComponent={
            <View className="items-center mt-20">
              {loadingItems ? <ActivityIndicator color="#10b981" /> : <Package2 size={42} color={isDark ? '#64748b' : '#94a3b8'} />}
              <Text className="mt-3 text-gray-500 dark:text-gray-400">{loadingItems ? 'Loading items...' : 'No items match your search.'}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(item)/${item.id}`)}
              className="mb-3 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm"
            >
              <View className="flex-row">
                <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/120' }} className="w-24 h-24" />
                <View className="flex-1 p-3">
                  <Text className="font-extrabold text-gray-900 dark:text-white" numberOfLines={1}>{item.title}</Text>
                  <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1" numberOfLines={1}>{item.location?.address || 'Location unavailable'}</Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1" numberOfLines={2}>{item.description || 'No description'}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          ListEmptyComponent={
            <View className="items-center mt-20">
              {loadingUsers ? <ActivityIndicator color="#10b981" /> : <UserRound size={42} color={isDark ? '#64748b' : '#94a3b8'} />}
              <Text className="mt-3 text-gray-500 dark:text-gray-400">{loadingUsers ? 'Searching people...' : 'Type at least 2 characters to find people.'}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/users/${item.id}`)}
              className="mb-3 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm"
            >
              <View className="flex-row items-center">
              <Image source={{ uri: item.avatarUrl || 'https://via.placeholder.com/80' }} className="w-12 h-12 rounded-full" />
              <View className="flex-1 ml-3">
                <Text className="font-bold text-gray-900 dark:text-white" numberOfLines={1}>{item.displayName || 'Unknown user'}</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400" numberOfLines={1}>{item.email || 'No email'}</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {item.role === 'SHOPKEEPER' ? 'Shopkeeper profile' : 'Community member'}
                </Text>
              </View>
              <View className="flex-row items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80">
                <Text className="text-slate-700 dark:text-slate-100 text-xs font-semibold">View profile</Text>
              </View>
              </View>
              <Pressable
                onPress={() => startConversation(item.id)}
                className="mt-3 flex-row items-center self-start px-3 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30"
              >
                <Sparkles size={13} color="#059669" />
                <Text className="ml-1 text-emerald-700 dark:text-emerald-200 text-xs font-semibold">Message</Text>
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
