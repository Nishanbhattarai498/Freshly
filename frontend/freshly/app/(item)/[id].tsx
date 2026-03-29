import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { api } from '../../services/api';
import { ChevronLeft, MapPin, Clock, Tag, MessageCircle, AlertTriangle, Archive, Sparkles, Star, ShieldCheck, CircleHelp, Package2 } from 'lucide-react-native';
import { formatDistanceToNow, format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { getCurrencySymbol } from '../../utils/currencies';
import type { Item } from '../../store';
import { StatusPopup } from '../../components/ui/States';

type ItemDetailResponse = Item & {
  userId: string;
  claims?: { id: number }[];
};

type Review = {
  id: number;
  rating: number;
  comment?: string | null;
  createdAt?: string;
  raterId?: string;
  raterName?: string | null;
  raterAvatar?: string | null;
};

type SellerProfileResponse = {
  id: string;
  role?: 'SHOPKEEPER' | 'CUSTOMER';
  rating?: {
    average: number;
    count: number;
  };
  reviews?: Review[];
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || fallback;
};

const safeFormatDateTime = (value?: string) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return format(date, 'MMM dd, yyyy · h:mm a');
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
  const [sellerProfile, setSellerProfile] = useState<SellerProfileResponse | null>(null);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [statusPopup, setStatusPopup] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    description?: string;
    onConfirm?: () => void;
  } | null>(null);
  const isOwner = item?.userId === userId;
  const sellerRole = sellerProfile?.role || item?.user?.role;
  const ratingCount = sellerProfile?.rating?.count ?? item?.user?.rating?.count ?? 0;
  const averageRating = sellerProfile?.rating?.average ?? item?.user?.rating?.average ?? 0;
  const reviews = sellerProfile?.reviews ?? [];
  const expiryDate = item?.expiryDate ? new Date(item.expiryDate) : null;
  const hoursLeft = expiryDate ? Math.max(Math.round((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60)), 0) : null;
  const urgency = hoursLeft === null
    ? 'Expiry time unavailable'
    : hoursLeft <= 12
      ? 'Urgent pickup suggested'
      : hoursLeft <= 36
        ? 'Best picked up soon'
        : 'Still has some time left';
  const currencySymbol = getCurrencySymbol(item?.priceCurrency);
  const displayPrice = item?.discountedPrice ?? item?.originalPrice ?? 0;
  const canRateShopkeeper = !isOwner && sellerRole === 'SHOPKEEPER';
  const savingsAmount = item?.originalPrice && item?.discountedPrice !== undefined
    ? Math.max(item.originalPrice - item.discountedPrice, 0)
    : 0;
  const savingsPercent = item?.originalPrice && item?.discountedPrice !== undefined && item.originalPrice > 0
    ? Math.round((savingsAmount / item.originalPrice) * 100)
    : 0;

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

  const fetchSellerProfile = useCallback(async (sellerId?: string) => {
    if (!sellerId) return;

    try {
      setSellerLoading(true);
      const response = await api.get(`/users/${sellerId}`);
      const profile = response.data as SellerProfileResponse;
      setSellerProfile(profile);
    } catch (error) {
      console.error('Error fetching seller profile:', error);
    } finally {
      setSellerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!item?.userId) return;
    fetchSellerProfile(item.userId);
  }, [item?.userId, fetchSellerProfile]);

  const handleClaim = async () => {
    if (claiming) return;
    try {
      setClaiming(true);
      const token = await getToken();
      if (!token) {
        setStatusPopup({
          type: 'info',
          title: 'Login required',
          description: 'Please login again to claim this item.',
        });
        return;
      }
      await api.post(`/items/${id}/claim`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatusPopup({
        type: 'success',
        title: 'Item claimed',
        description: 'This listing is now added to your claimed inventory.',
      });
      fetchItemDetails();
    } catch (error) {
      console.error('Claim error:', error);
      setStatusPopup({
        type: 'error',
        title: 'Claim failed',
        description: getErrorMessage(error, 'Failed to claim item.'),
      });
    } finally {
      setClaiming(false);
    }
  };

  const handleMessageUser = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setStatusPopup({
          type: 'info',
          title: 'Login required',
          description: 'Please login again to start a conversation.',
        });
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
      router.push(`/messages/${response.data.id}`);
    } catch (error) {
      console.error('Message error:', error);
      setStatusPopup({
        type: 'error',
        title: 'Chat unavailable',
        description: 'Failed to start conversation.',
      });
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

  const handleSubmitRating = async () => {
    if (!item?.userId) return;
    if (selectedRating < 1 || selectedRating > 5) {
      setStatusPopup({
        type: 'info',
        title: 'Choose a rating',
        description: 'Tap one to five stars before submitting your review.',
      });
      return;
    }

    try {
      setSubmittingRating(true);
      const token = await getToken();
      if (!token) {
        setStatusPopup({
          type: 'info',
          title: 'Login required',
          description: 'Please login again to rate this shopkeeper.',
        });
        return;
      }

      await api.post(
        `/users/${item.userId}/rate`,
        {
          rating: selectedRating,
          comment: ratingComment.trim() || undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setStatusPopup({
        type: 'success',
        title: 'Rating saved',
        description: 'Your feedback has been recorded for this shopkeeper.',
      });
      await fetchSellerProfile(item.userId);
      await fetchItemDetails();
    } catch (error) {
      console.error('Submit rating error:', error);
      setStatusPopup({
        type: 'error',
        title: 'Rating failed',
        description: getErrorMessage(error, 'Could not save your rating right now.'),
      });
    } finally {
      setSubmittingRating(false);
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

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusPopup
        visible={!!statusPopup}
        type={statusPopup?.type || 'info'}
        title={statusPopup?.title || ''}
        description={statusPopup?.description}
        primaryLabel="OK"
        onPrimary={() => statusPopup?.onConfirm?.()}
        onClose={() => setStatusPopup(null)}
      />
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

          <LinearGradient
            colors={isDark ? ['rgba(8,20,29,0.15)', 'rgba(8,20,29,0.74)'] : ['rgba(255,255,255,0.02)', 'rgba(15,23,42,0.28)']}
            start={{ x: 1, y: 0 }}
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

          <View className="absolute left-5 right-5 bottom-5">
            <View className="rounded-[26px] bg-black/35 border border-white/15 px-4 py-4">
              <Text className="text-[11px] font-bold tracking-[2px] uppercase text-white/75">Claim Ready</Text>
              <Text className="text-white text-[28px] font-black mt-2" numberOfLines={2}>{item.title}</Text>
              <View className="flex-row flex-wrap mt-3">
                <View className="mr-2 mb-2 rounded-full bg-white/14 px-3 py-2 flex-row items-center">
                  <Package2 size={14} color="#ffffff" />
                  <Text className="ml-2 text-white text-xs font-bold">{item.quantity} {item.unit}</Text>
                </View>
                <View className="mr-2 mb-2 rounded-full bg-white/14 px-3 py-2 flex-row items-center">
                  <Tag size={14} color="#6ee7b7" />
                  <Text className="ml-2 text-white text-xs font-bold">{item.category || 'General'}</Text>
                </View>
                <View className="mb-2 rounded-full bg-white/14 px-3 py-2 flex-row items-center">
                  <Clock size={14} color="#fda4af" />
                  <Text className="ml-2 text-white text-xs font-bold">{safeRelativeDate(item.expiryDate)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="-mt-8 px-5">
          <View className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <View className="rounded-[26px] overflow-hidden border border-slate-200 dark:border-slate-700">
              <LinearGradient
                colors={isDark ? ['#08131d', '#0d2634', '#11384a'] : ['#f9fffd', '#ebfbf5', '#e4f4ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="px-4 py-4"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-xs font-bold tracking-[2px] uppercase text-emerald-700 dark:text-emerald-300">Pickup Price</Text>
                    <View className="flex-row items-end mt-2">
                      <Text className="text-[34px] font-black text-slate-900 dark:text-white">
                        {displayPrice === 0 ? 'Free' : `${currencySymbol}${displayPrice}`}
                      </Text>
                      {item?.priceCurrency ? (
                        <Text className="ml-2 mb-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.priceCurrency}</Text>
                      ) : null}
                    </View>
                    {item.originalPrice && item.discountedPrice !== undefined && item.originalPrice > item.discountedPrice ? (
                      <View className="flex-row items-center mt-2">
                        <Text className="text-sm line-through text-slate-400 dark:text-slate-500">{currencySymbol}{item.originalPrice}</Text>
                        <View className="ml-2 rounded-full bg-emerald-600 px-2.5 py-1">
                          <Text className="text-[11px] font-bold text-white">Save {currencySymbol}{savingsAmount.toFixed(2)}{savingsPercent > 0 ? ` · ${savingsPercent}%` : ''}</Text>
                        </View>
                      </View>
                    ) : (
                      <Text className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {displayPrice === 0 ? 'No payment needed for this claim.' : 'Straightforward price with no extra fees shown.'}
                      </Text>
                    )}
                  </View>

                  <View className="rounded-[22px] bg-white/85 dark:bg-slate-900/70 border border-white/50 dark:border-white/10 px-3 py-3 min-w-[110px]">
                    <Text className="text-[11px] font-bold tracking-[1.5px] uppercase text-slate-500 dark:text-slate-400">Pickup Window</Text>
                    <Text className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{hoursLeft === null ? 'Unknown' : `${hoursLeft}h left`}</Text>
                    <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.status === 'AVAILABLE' ? 'Available now' : 'No longer open'}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View className="mt-5 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <View className="flex-row items-center">
                <Image
                  source={{ uri: item.user?.avatarUrl || 'https://via.placeholder.com/40' }}
                  className="w-12 h-12 rounded-2xl"
                />
                <View className="ml-3 flex-1">
                  <Text className="font-semibold text-slate-900 dark:text-white" numberOfLines={1}>{item.user?.displayName || 'Unknown User'}</Text>
                  <View className="flex-row items-center mt-1">
                    <ShieldCheck size={13} color={sellerRole === 'SHOPKEEPER' ? '#10b981' : '#64748b'} />
                    <Text className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                      {sellerRole === 'SHOPKEEPER' ? 'Verified shopkeeper' : 'Community member'}
                    </Text>
                  </View>
                </View>
                {!isOwner ? (
                  <TouchableOpacity onPress={handleMessageUser} className="w-10 h-10 rounded-xl bg-emerald-600 items-center justify-center" activeOpacity={0.88}>
                    <MessageCircle color="#ffffff" size={18} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View className="mt-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Star size={16} color="#f59e0b" fill="#f59e0b" />
                    <Text className="ml-2 text-sm font-bold text-slate-900 dark:text-white">
                      {ratingCount > 0 ? `${averageRating.toFixed(1)} average rating` : 'No ratings yet'}
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                    {ratingCount > 0 ? `${ratingCount} review${ratingCount > 1 ? 's' : ''}` : 'Waiting for first review'}
                  </Text>
                </View>
                <Text className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {ratingCount > 0
                    ? 'This average is based on customer reviews submitted in the app.'
                    : 'Customers can rate this shopkeeper after interacting with the listing.'}
                </Text>
              </View>
            </View>

            <View className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
              <View className="flex-row items-center">
                <Sparkles size={16} color="#10b981" />
                <Text className="ml-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">{urgency}</Text>
              </View>
              <Text className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
                {isOwner
                  ? 'You posted this item. Keep the details fresh so interested users can act quickly.'
                  : item.status === 'AVAILABLE'
                    ? 'If you want this item, message the owner or claim it before the expiry window closes.'
                    : 'This listing is no longer open for claiming, but you can still contact the owner for context.'}
              </Text>
            </View>

            {!isOwner && item.status === 'AVAILABLE' ? (
              <View className="mt-5 flex-row">
                <TouchableOpacity
                  onPress={handleMessageUser}
                  className="flex-1 mr-2 rounded-[22px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-4 px-4"
                  activeOpacity={0.9}
                >
                  <View className="flex-row items-center justify-center">
                    <MessageCircle size={17} color={isDark ? '#f8fafc' : '#0f172a'} />
                    <Text className="ml-2 text-slate-900 dark:text-white text-base font-extrabold">Ask First</Text>
                  </View>
                  <Text className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">Chat with the seller before you commit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleClaim}
                  disabled={claiming}
                  className="flex-1 ml-2 rounded-[22px] overflow-hidden"
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={['#0f766e', '#14b8a6', '#38bdf8']} className="py-4 px-4 items-center justify-center">
                    {claiming ? <ActivityIndicator color="#ffffff" /> : (
                      <>
                        <Text className="text-white text-base font-extrabold">Claim Now</Text>
                        <Text className="mt-2 text-center text-xs text-white/85">Reserve this listing before someone else does</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : null}

            <View className="mt-5">
              <Text className="text-base font-bold text-slate-900 dark:text-white mb-2">Description</Text>
              <Text className="text-[15px] leading-6 text-slate-700 dark:text-slate-300">{item.description || 'No description provided.'}</Text>
            </View>

            <View className="mt-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-4">
              <Text className="text-base font-bold text-slate-900 dark:text-white">Claim snapshot</Text>
              <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Everything you need before you message, claim, or rate the shopkeeper.
              </Text>

              <View className="mt-4 space-y-3">
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
                  <Text className="text-rose-700 dark:text-rose-300 font-semibold">{safeFormatDateTime(item.expiryDate)}</Text>
                  <Text className="text-xs text-rose-600 dark:text-rose-300 mt-1">{safeRelativeDate(item.expiryDate)}</Text>
                </View>
              </View>

              <View className="flex-row items-center mt-3">
                <View className="w-11 h-11 rounded-xl bg-sky-100 dark:bg-sky-900/30 items-center justify-center">
                  <Clock color="#0284c7" size={19} />
                </View>
                <View className="ml-3">
                  <Text className="text-xs text-slate-500 dark:text-slate-400">Posted</Text>
                  <Text className="text-sky-700 dark:text-sky-300 font-semibold">{safeFormatDateTime(item.createdAt)}</Text>
                  <Text className="text-xs text-sky-600 dark:text-sky-300 mt-1">{safeRelativeDate(item.createdAt)}</Text>
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
            </View>

            {isOwner ? (
              <TouchableOpacity
                onPress={() => router.push('/inventory')}
                className="mt-7 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/70 py-4 px-4 flex-row items-center justify-center"
                activeOpacity={0.88}
              >
                <Archive size={18} color={isDark ? '#e2e8f0' : '#0f172a'} />
                <Text className="ml-2 text-slate-900 dark:text-white font-extrabold">Manage In Inventory</Text>
              </TouchableOpacity>
            ) : null}

            {item.status === 'CLAIMED' ? (
              <View className="mt-7 rounded-2xl p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <Text className="text-center text-amber-700 dark:text-amber-300 font-bold">This item has been claimed</Text>
                {!isOwner ? (
                  <TouchableOpacity onPress={handleMessageUser} className="mt-3 self-center px-4 py-2 rounded-xl bg-amber-100 dark:bg-amber-900/40" activeOpacity={0.88}>
                    <Text className="text-amber-800 dark:text-amber-200 font-semibold">Message owner anyway</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {canRateShopkeeper ? (
              <View className="mt-7 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4">
                <View className="flex-row items-center justify-between">
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text className="text-base font-extrabold text-slate-900 dark:text-white">Rate this shopkeeper</Text>
                    <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      If you are a customer, you can leave a rating and short comment for this seller.
                    </Text>
                  </View>
                  <CircleHelp size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                </View>

                <View className="flex-row mt-4">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= selectedRating;
                    return (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setSelectedRating(star)}
                        className="mr-3"
                        activeOpacity={0.85}
                      >
                        <Star
                          size={26}
                          color={active ? '#f59e0b' : (isDark ? '#475569' : '#cbd5e1')}
                          fill={active ? '#f59e0b' : 'transparent'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  value={ratingComment}
                  onChangeText={setRatingComment}
                  placeholder="Optional comment about pickup, reliability, or food quality..."
                  placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{
                    marginTop: 14,
                    minHeight: 104,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 14,
                  }}
                />

                <TouchableOpacity
                  onPress={handleSubmitRating}
                  disabled={submittingRating}
                  activeOpacity={0.9}
                  className="mt-4 rounded-2xl overflow-hidden"
                >
                  <LinearGradient colors={['#f59e0b', '#f97316']} className="py-4 items-center justify-center">
                    {submittingRating ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text className="text-white text-base font-extrabold">Submit Rating</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : null}

            <View className="mt-7 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40 p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-extrabold text-slate-900 dark:text-white">Recent ratings</Text>
                {sellerLoading ? <ActivityIndicator size="small" color="#10b981" /> : null}
              </View>

              {reviews.length === 0 ? (
                <Text className="mt-3 text-sm text-slate-500 dark:text-slate-400">No ratings yet</Text>
              ) : (
                reviews.slice(0, 3).map((review) => (
                  <View key={review.id} className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-bold text-slate-900 dark:text-white">
                        {review.raterName || 'Anonymous customer'}
                      </Text>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">{safeRelativeDate(review.createdAt)}</Text>
                    </View>
                    <View className="flex-row mt-2">
                      {Array.from({ length: 5 }).map((_, index) => {
                        const active = index < review.rating;
                        return (
                          <Star
                            key={`${review.id}-${index}`}
                            size={14}
                            color={active ? '#f59e0b' : (isDark ? '#475569' : '#cbd5e1')}
                            fill={active ? '#f59e0b' : 'transparent'}
                            style={{ marginRight: 4 }}
                          />
                        );
                      })}
                    </View>
                    <Text className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {review.comment?.trim() ? review.comment : 'No written comment provided.'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
