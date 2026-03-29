import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { MessageCircle, ShieldCheck, Star } from 'lucide-react-native';
import { api } from '../../services/api';
import { StatusPopup } from '../../components/ui/States';

type Review = {
  id: number;
  rating: number;
  comment?: string | null;
  createdAt?: string;
  raterName?: string | null;
};

type PublicProfile = {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
  role?: 'SHOPKEEPER' | 'CUSTOMER';
  stats?: {
    shared: number;
    claimed: number;
  };
  rating?: {
    average: number;
    count: number;
  };
  reviews?: Review[];
};

type MeProfile = {
  id: string;
  role?: 'SHOPKEEPER' | 'CUSTOMER';
};

const safeRelativeDate = (value?: string) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / (1000 * 60));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || fallback;
};

export default function PublicUserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [me, setMe] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [statusPopup, setStatusPopup] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    description?: string;
  } | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, meRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get('/users/me'),
      ]);
      setProfile(profileRes.data as PublicProfile);
      setMe(meRes.data as MeProfile);
    } catch (error) {
      setStatusPopup({
        type: 'error',
        title: 'Profile unavailable',
        description: getErrorMessage(error, 'We could not load this profile.'),
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const startConversation = async () => {
    if (!profile?.id || messageLoading) return;

    try {
      setMessageLoading(true);
      const token = await getToken();
      if (!token) {
        setStatusPopup({
          type: 'info',
          title: 'Login required',
          description: 'Please login again to start a conversation.',
        });
        return;
      }

      const response = await api.post(
        '/messages/start',
        { receiverId: profile.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push(`/messages/${response.data.id}`);
    } catch (error) {
      setStatusPopup({
        type: 'error',
        title: 'Chat unavailable',
        description: getErrorMessage(error, 'Could not start chat right now.'),
      });
    } finally {
      setMessageLoading(false);
    }
  };

  const submitRating = async () => {
    if (!profile?.id) return;
    if (selectedRating < 1 || selectedRating > 5) {
      setStatusPopup({
        type: 'info',
        title: 'Choose a rating',
        description: 'Tap one to five stars before submitting.',
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
        `/users/${profile.id}/rate`,
        { rating: selectedRating, comment: ratingComment.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStatusPopup({
        type: 'success',
        title: 'Rating saved',
        description: 'Your review has been posted.',
      });
      await fetchProfile();
    } catch (error) {
      setStatusPopup({
        type: 'error',
        title: 'Rating failed',
        description: getErrorMessage(error, 'Could not submit your rating right now.'),
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
        <Text className="text-lg font-bold text-slate-900 dark:text-white">Profile not found</Text>
      </View>
    );
  }

  const canRate = me?.role === 'CUSTOMER' && profile.role === 'SHOPKEEPER' && profile.id !== userId;
  const ratingCount = profile.rating?.count ?? 0;
  const averageRating = profile.rating?.average ?? 0;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusPopup
        visible={!!statusPopup}
        type={statusPopup?.type || 'info'}
        title={statusPopup?.title || ''}
        description={statusPopup?.description}
        onClose={() => setStatusPopup(null)}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient
          colors={isDark ? ['#08131d', '#103127', '#11384a'] : ['#ffffff', '#e6fbef', '#dcefff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-6 pt-16 pb-10 rounded-b-[30px]"
        >
          <View className="items-center">
            <Image
              source={{ uri: profile.avatarUrl || 'https://via.placeholder.com/160' }}
              className="w-24 h-24 rounded-[28px] border-4 border-white/80 dark:border-white/10"
            />
            <Text className="mt-4 text-3xl font-black text-slate-900 dark:text-white">{profile.displayName || 'Unknown user'}</Text>
            <View className="flex-row items-center mt-2">
              <ShieldCheck size={14} color={profile.role === 'SHOPKEEPER' ? '#10b981' : '#64748b'} />
              <Text className="ml-2 text-sm text-slate-600 dark:text-slate-300">
                {profile.role === 'SHOPKEEPER' ? 'Shopkeeper profile' : 'Community member'}
              </Text>
            </View>
          </View>

          <View className="flex-row mt-6" style={{ gap: 10 }}>
            <View className="flex-1 rounded-[22px] bg-white/75 dark:bg-white/10 px-4 py-4">
              <Text className="text-xs font-bold tracking-[1.5px] uppercase text-slate-500 dark:text-slate-400">Rating</Text>
              <Text className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {ratingCount > 0 ? averageRating.toFixed(1) : '—'}
              </Text>
              <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {ratingCount > 0 ? `${ratingCount} review${ratingCount > 1 ? 's' : ''}` : 'No ratings yet'}
              </Text>
            </View>
            <View className="flex-1 rounded-[22px] bg-white/75 dark:bg-white/10 px-4 py-4">
              <Text className="text-xs font-bold tracking-[1.5px] uppercase text-slate-500 dark:text-slate-400">Shared</Text>
              <Text className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{profile.stats?.shared ?? 0}</Text>
              <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">Listings posted</Text>
            </View>
          </View>
        </LinearGradient>

        <View className="px-5 mt-5">
          <TouchableOpacity
            onPress={startConversation}
            disabled={messageLoading}
            activeOpacity={0.9}
            className="rounded-[24px] overflow-hidden"
          >
            <LinearGradient colors={['#0f766e', '#14b8a6', '#38bdf8']} className="py-4 px-4 flex-row items-center justify-center">
              {messageLoading ? <ActivityIndicator color="#ffffff" /> : (
                <>
                  <MessageCircle size={18} color="#ffffff" />
                  <Text className="ml-2 text-white text-base font-extrabold">Message</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {canRate ? (
          <View className="px-5 mt-5">
            <View className="rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
              <Text className="text-lg font-extrabold text-slate-900 dark:text-white">Rate This Shopkeeper</Text>
              <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">Customers can leave a star rating and short review.</Text>

              <View className="flex-row mt-4">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= selectedRating;
                  return (
                    <TouchableOpacity key={star} onPress={() => setSelectedRating(star)} className="mr-3" activeOpacity={0.85}>
                      <Star size={28} color={active ? '#f59e0b' : (isDark ? '#475569' : '#cbd5e1')} fill={active ? '#f59e0b' : 'transparent'} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                value={ratingComment}
                onChangeText={setRatingComment}
                placeholder="Optional comment about service, reliability, or pickup..."
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

              <TouchableOpacity onPress={submitRating} disabled={submittingRating} activeOpacity={0.9} className="mt-4 rounded-2xl overflow-hidden">
                <LinearGradient colors={['#f59e0b', '#f97316']} className="py-4 items-center justify-center">
                  {submittingRating ? <ActivityIndicator color="#ffffff" /> : <Text className="text-white text-base font-extrabold">Submit Rating</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View className="px-5 mt-5">
          <View className="rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <Text className="text-lg font-extrabold text-slate-900 dark:text-white">Recent Ratings</Text>
            {profile.reviews?.length ? (
              profile.reviews.slice(0, 5).map((review) => (
                <View key={review.id} className="mt-4 rounded-[22px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">{review.raterName || 'Anonymous customer'}</Text>
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
            ) : (
              <Text className="mt-3 text-sm text-slate-500 dark:text-slate-400">No ratings yet</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
