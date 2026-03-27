import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { api } from '../../services/api';
import { ChevronLeft, MapPin, Clock, Tag, MessageCircle, AlertTriangle } from 'lucide-react-native';
import { formatDistanceToNow, format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { getCurrencySymbol } from '../../utils/currencies';
import type { Item } from '../../store';

type ItemDetailResponse = Item & {
  userId: string;
  claims?: { id: number }[];
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || fallback;
};

const safeFormatDate = (value?: string) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return format(date, 'MMM dd, yyyy');
};

const safeRelativeDate = (value?: string) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return formatDistanceToNow(date, { addSuffix: true });
};

export default function ItemDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [item, setItem] = useState<ItemDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const fetchItemDetails = useCallback(async () => {
    try {
      const response = await api.get(`/items/${id}`);
      setItem(response.data as ItemDetailResponse);
    } catch (error) {
      console.error('Error fetching item details:', error);
      Alert.alert('Error', 'Failed to load item details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItemDetails();
  }, [fetchItemDetails]);

  const handleClaim = async () => {
    if (claiming) return;
    try {
      setClaiming(true);
      const token = await getToken();
      if (!token) {
        Alert.alert('Login required', 'Please login again to claim this item.');
        return;
      }
      await api.post(`/items/${id}/claim`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Success', 'Item claimed successfully!');
      fetchItemDetails();
    } catch (error) {
      console.error('Claim error:', error);
      Alert.alert('Error', getErrorMessage(error, 'Failed to claim item.'));
    } finally {
      setClaiming(false);
    }
  };

  const handleMessageUser = async () => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Login required', 'Please login again to start a conversation.');
        return;
      }

      const receiverId = item?.userId || item?.user?.id;
      if (!receiverId) {
        Alert.alert('Unavailable', 'This listing is missing owner information.');
        return;
      }

      const response = await api.post('/messages/start', { receiverId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Navigate to the messages screen with the conversation ID
      router.push(`/messages/${response.data.id}`);
    } catch (error) {
      console.error('Message error:', error);
      Alert.alert('Error', 'Failed to start conversation.');
    }
  };

  const openMap = () => {
    if (!item?.location) return;
    const { latitude, longitude, address } = item.location;
    const url = Platform.select({
      ios: `maps://app?q=${encodeURIComponent(address)}&ll=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${encodeURIComponent(address)}`
    });
    if (url) {
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!item) {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-slate-50 dark:bg-slate-950">
        <Text className="text-slate-900 dark:text-white font-bold text-lg">Item not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-5 px-4 py-3 rounded-xl bg-emerald-600">
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = item.userId === userId;

  const currencySymbol = getCurrencySymbol(item.priceCurrency);
  const displayPrice = item.discountedPrice ?? item.originalPrice ?? 0;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="relative">
          <Image
            source={{ uri: item.imageUrl || 'https://via.placeholder.com/400' }}
            className="w-full h-80"
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', isDark ? 'rgba(2,6,23,0.85)' : 'rgba(248,250,252,0.85)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            className="absolute inset-0"
          />

          <TouchableOpacity
            className="absolute top-12 left-5 w-11 h-11 rounded-2xl bg-black/45 items-center justify-center"
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <ChevronLeft color="#ffffff" size={22} />
          </TouchableOpacity>

          <View className="absolute top-12 right-5 rounded-2xl px-3 py-2 bg-white/85 dark:bg-slate-900/85 border border-white/20 dark:border-slate-700">
            <Text className="text-[11px] font-bold tracking-[1px] uppercase text-slate-700 dark:text-slate-200">{item.status}</Text>
          </View>
        </View>

        <View className="-mt-8 px-5">
          <View className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <View className="flex-row justify-between items-start">
              <View className="flex-1 pr-3">
                <Text className="text-3xl font-black text-slate-900 dark:text-white" numberOfLines={2}>{item.title}</Text>
                <View className="mt-2 flex-row items-center">
                  <Tag color="#10b981" size={15} />
                  <Text className="ml-1 text-emerald-700 dark:text-emerald-300 font-semibold">{item.category || 'General'}</Text>
                </View>
              </View>
              <LinearGradient
                colors={['#0ea5e9', '#10b981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-2xl px-3 py-2 min-w-[92px]"
              >
                <Text className="text-white text-right font-black text-lg">{displayPrice === 0 ? 'Free' : `${currencySymbol}${displayPrice}`}</Text>
                {item.originalPrice && item.discountedPrice !== undefined && item.originalPrice > item.discountedPrice ? (
                  <Text className="text-white/75 text-right text-xs line-through">{currencySymbol}{item.originalPrice}</Text>
                ) : null}
              </LinearGradient>
            </View>

            <View className="mt-5 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex-row items-center">
              <Image
                source={{ uri: item.user?.avatarUrl || 'https://via.placeholder.com/40' }}
                className="w-11 h-11 rounded-xl"
              />
              <View className="ml-3 flex-1">
                <Text className="font-semibold text-slate-900 dark:text-white" numberOfLines={1}>{item.user?.displayName || 'Unknown User'}</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  {item.user?.rating?.average ? `Rating ${item.user.rating.average.toFixed(1)} (${item.user.rating.count})` : 'No ratings yet'}
                </Text>
              </View>
              {!isOwner ? (
                <TouchableOpacity onPress={handleMessageUser} className="w-10 h-10 rounded-xl bg-emerald-600 items-center justify-center" activeOpacity={0.88}>
                  <MessageCircle color="#ffffff" size={18} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View className="mt-5">
              <Text className="text-base font-bold text-slate-900 dark:text-white mb-2">Description</Text>
              <Text className="text-[15px] leading-6 text-slate-700 dark:text-slate-300">{item.description || 'No description provided.'}</Text>
            </View>

            <View className="mt-6 space-y-3">
              <View className="flex-row items-center">
                <View className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/40 items-center justify-center">
                  <AlertTriangle color="#d97706" size={19} />
                </View>
                <View className="ml-3">
                  <Text className="text-xs text-slate-500 dark:text-slate-400">Quantity Available</Text>
                  <Text className="text-slate-900 dark:text-white font-semibold">{item.quantity} {item.unit}</Text>
                </View>
              </View>

              <View className="flex-row items-center mt-3">
                <View className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-900/30 items-center justify-center">
                  <Clock color="#e11d48" size={19} />
                </View>
                <View className="ml-3">
                  <Text className="text-xs text-slate-500 dark:text-slate-400">Expires</Text>
                  <Text className="text-rose-700 dark:text-rose-300 font-semibold">{safeFormatDate(item.expiryDate)} ({safeRelativeDate(item.expiryDate)})</Text>
                </View>
              </View>

              {item.location ? (
                <TouchableOpacity onPress={openMap} className="flex-row items-center mt-3" activeOpacity={0.85}>
                  <View className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center">
                    <MapPin color="#4f46e5" size={19} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-slate-500 dark:text-slate-400">Pick up at</Text>
                    <Text className="text-slate-900 dark:text-white font-semibold" numberOfLines={2}>{item.location.address}</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>

            {!isOwner && item.status === 'AVAILABLE' ? (
              <TouchableOpacity
                onPress={handleClaim}
                disabled={claiming}
                className="mt-7 rounded-2xl overflow-hidden"
                activeOpacity={0.9}
              >
                <LinearGradient colors={['#10b981', '#059669']} className="py-4 items-center">
                  {claiming ? <ActivityIndicator color="#ffffff" /> : <Text className="text-white text-base font-extrabold">Claim Item</Text>}
                </LinearGradient>
              </TouchableOpacity>
            ) : null}

            {item.status === 'CLAIMED' ? (
              <View className="mt-7 rounded-2xl p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <Text className="text-center text-amber-700 dark:text-amber-300 font-bold">This item has been claimed</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}