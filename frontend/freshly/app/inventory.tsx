import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Archive, Clock3, Package, Trash2, ArrowUpRight, CheckCheck } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import type { Item } from '../store';

type InventoryFilter = 'shared' | 'claimed';

const safeDate = (value?: string) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getStatusTone = (status: Item['status']) => {
  switch (status) {
    case 'CLAIMED':
      return { bg: '#fef3c7', text: '#92400e' };
    case 'EXPIRED':
      return { bg: '#ffe4e6', text: '#be123c' };
    case 'DELETED':
      return { bg: '#e5e7eb', text: '#4b5563' };
    default:
      return { bg: '#dcfce7', text: '#166534' };
  }
};

export default function InventoryScreen() {
  const { user } = useUser();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<InventoryFilter>('shared');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchInventory = useCallback(async (mode: InventoryFilter, silent = false) => {
    if (!isSignedIn || !user?.id) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      const params = mode === 'claimed' ? '?type=claimed' : '';
      const response = await api.get(`/items/user/${user.id}${params}`);
      setItems(Array.isArray(response.data) ? response.data.filter(Boolean) : []);
    } catch (error) {
      console.error('Fetch inventory error:', error);
      setItems([]);
      if (!silent) {
        Alert.alert('Unable to load inventory', 'Please try again in a moment.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSignedIn, user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchInventory(filter);
    }, [fetchInventory, filter])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInventory(filter, true);
  }, [fetchInventory, filter]);

  const handleDelete = useCallback((itemId: number) => {
    Alert.alert(
      'Delete listing',
      'This will remove the item from your active inventory.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(itemId);
              await api.delete(`/items/${itemId}`);
              setItems((prev) => prev.filter((item) => item.id !== itemId));
            } catch (error) {
              console.error('Delete inventory item error', error);
              Alert.alert('Delete failed', 'The item could not be removed.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }, []);

  const summary = useMemo(() => {
    const available = items.filter((item) => item.status === 'AVAILABLE').length;
    const claimed = items.filter((item) => item.status === 'CLAIMED').length;
    return {
      total: items.length,
      available,
      claimed,
    };
  }, [items]);

  return (
    <View className="flex-1 bg-[#f4f8f6] dark:bg-[#06131f]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 120, 140) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
            colors={['#10b981']}
          />
        }
      >
        <LinearGradient
          colors={isDark ? ['#08131d', '#103127', '#11384a'] : ['#ffffff', '#e6fbef', '#dcefff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: Math.max(insets.top + 18, 32), paddingHorizontal: 20, paddingBottom: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
        >
          <Text style={{ color: isDark ? '#99f6e4' : '#0f766e', fontSize: 12, fontWeight: '800', letterSpacing: 2.6 }}>INVENTORY</Text>
          <Text style={{ color: isDark ? '#f8fafc' : '#0f172a', fontSize: 31, fontWeight: '900', marginTop: 10, lineHeight: 38 }}>
            Track what you shared and what you claimed.
          </Text>
          <Text style={{ color: isDark ? '#cbd5e1' : '#52606d', marginTop: 12, fontSize: 15, lineHeight: 23 }}>
            Use this space to manage active listings, see pickup status, and quickly jump back into each item.
          </Text>

          <View style={{ flexDirection: 'row', marginTop: 18, gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 24, padding: 14 }}>
              <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }}>TOTAL</Text>
              <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '900', marginTop: 4 }}>{summary.total}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 24, padding: 14 }}>
              <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }}>ACTIVE</Text>
              <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '900', marginTop: 4 }}>{summary.available}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 24, padding: 14 }}>
              <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }}>CLAIMED</Text>
              <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '900', marginTop: 4 }}>{summary.claimed}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#0b1822' : '#ffffff', borderRadius: 24, padding: 6, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }}>
            {[
              { key: 'shared' as const, label: 'Shared', icon: Archive },
              { key: 'claimed' as const, label: 'Claimed', icon: CheckCheck },
            ].map(({ key, label, icon: Icon }) => {
              const active = filter === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setFilter(key)}
                  activeOpacity={0.9}
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    backgroundColor: active ? '#10b981' : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={16} color={active ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569')} />
                  <Text style={{ marginLeft: 8, color: active ? '#ffffff' : (isDark ? '#e2e8f0' : '#334155'), fontWeight: '800' }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 18, gap: 14 }}>
          {loading ? (
            <View style={{ paddingVertical: 50, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={{ marginTop: 12, color: isDark ? '#94a3b8' : '#64748b' }}>Loading inventory...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={{ backgroundColor: isDark ? '#0b1822' : '#ffffff', borderRadius: 28, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }}>
              <Package size={34} color={isDark ? '#94a3b8' : '#64748b'} />
              <Text style={{ color: isDark ? '#f8fafc' : '#0f172a', fontSize: 19, fontWeight: '800', marginTop: 12 }}>
                No {filter} items yet
              </Text>
              <Text style={{ color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 21 }}>
                {filter === 'shared'
                  ? 'Once you post listings, they will appear here for quick management.'
                  : 'Items you claim from the feed will appear here so you can keep track of them.'}
              </Text>
            </View>
          ) : (
            items.map((item) => {
              const tone = getStatusTone(item.status);
              const isDeleting = deletingId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.92}
                  onPress={() => router.push(`/(item)/${item.id}`)}
                  style={{
                    backgroundColor: isDark ? '#0b1822' : '#ffffff',
                    borderRadius: 28,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
                  }}
                >
                  <View style={{ flexDirection: 'row' }}>
                    <Image
                      source={{ uri: item.imageUrl || 'https://via.placeholder.com/120' }}
                      style={{ width: 86, height: 86, borderRadius: 22, backgroundColor: isDark ? '#102232' : '#e5e7eb' }}
                    />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text
                          style={{ color: isDark ? '#f8fafc' : '#0f172a', fontSize: 18, fontWeight: '800', flex: 1, marginRight: 10 }}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <View style={{ backgroundColor: tone.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                          <Text style={{ color: tone.text, fontSize: 11, fontWeight: '800', letterSpacing: 0.7 }}>{item.status}</Text>
                        </View>
                      </View>

                      <Text style={{ color: isDark ? '#94a3b8' : '#64748b', marginTop: 6 }} numberOfLines={2}>
                        {item.description || 'No description provided.'}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                        <Package size={14} color={isDark ? '#cbd5e1' : '#475569'} />
                        <Text style={{ color: isDark ? '#e2e8f0' : '#334155', marginLeft: 6, fontWeight: '700' }}>
                          {item.quantity} {item.unit}
                        </Text>
                        <Clock3 size={14} color={isDark ? '#cbd5e1' : '#475569'} style={{ marginLeft: 14 }} />
                        <Text style={{ color: isDark ? '#e2e8f0' : '#334155', marginLeft: 6, fontWeight: '700' }}>
                          {safeDate(item.expiryDate)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                    <Text style={{ color: isDark ? '#94a3b8' : '#64748b', flex: 1 }} numberOfLines={1}>
                      {item.location?.address || 'Location unavailable'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {filter === 'shared' ? (
                        <TouchableOpacity
                          onPress={() => handleDelete(item.id)}
                          disabled={isDeleting}
                          activeOpacity={0.88}
                          style={{
                            marginRight: 10,
                            width: 42,
                            height: 42,
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isDark ? 'rgba(244,63,94,0.16)' : '#fff1f2',
                          }}
                        >
                          {isDeleting ? <ActivityIndicator size="small" color="#e11d48" /> : <Trash2 size={18} color="#e11d48" />}
                        </TouchableOpacity>
                      ) : null}
                      <View style={{ width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5' }}>
                        <ArrowUpRight size={18} color="#10b981" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
