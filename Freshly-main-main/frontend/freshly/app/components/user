import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Star, Heart, Award, ThumbsUp, Gift, MapPin, MessageCircle } from 'lucide-react-native';
import { api } from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { LoadingView, ErrorState } from '../../components/ui/States';

const ACHIEVEMENTS_LIST = [
  { id: 'early-bird', title: 'Early Bird', description: 'Joined early', icon: Star, color: '#eab308', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-400', condition: (stats: any) => true }, // Everyone gets it for now
  { id: 'giver', title: 'Giver', description: 'Shared 5+ items', icon: Heart, color: '#22c55e', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-400', condition: (stats: any) => stats.shared >= 5 },
  { id: 'hero', title: 'Local Hero', description: 'Shared 20+ items', icon: Award, color: '#a855f7', bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-400', condition: (stats: any) => stats.shared >= 20 },
  { id: 'generous', title: 'Generous', description: 'Shared 50+ items', icon: Gift, color: '#ec4899', bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-400', condition: (stats: any) => stats.shared >= 50 },
  { id: 'reliable', title: 'Reliable', description: '10+ claims', icon: ThumbsUp, color: '#06b6d4', bg: 'bg-cyan-100 dark:bg-cyan-900/30', border: 'border-cyan-400', condition: (stats: any) => stats.claimed >= 10 },
];

export default function PublicProfile() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const [res, meRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get('/users/me')
      ]);
      setUser(res.data);
      setCurrentUser(meRes.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      Alert.alert('Error', 'Could not load user profile');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) fetchUser();
  }, [id, fetchUser]);

  const gradientColors = useMemo(
    () => (colorScheme === 'dark' ? ['#0f172a', '#0b1220'] : ['#0ea5e9', '#22c55e']),
    [colorScheme]
  );

  const submitRating = async () => {
    setSubmittingRating(true);
    try {
      await api.post(`/users/${id}/rate`, { rating, comment });
      setRatingModalVisible(false);
      fetchUser();
      Alert.alert('Success', 'Rating submitted!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleMessage = async () => {
    try {
      const res = await api.post('/messages/start', { receiverId: user.id });
      router.push(`/chat/${res.data.id}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Could not start chat');
    }
  };

  if (loading) {
    return <LoadingView message="Loading profile..." />;
  }

  if (!user) return <ErrorState title="Profile unavailable" description="We couldn't load this user right now." onRetry={fetchUser} />;

  const unlockedAchievements = ACHIEVEMENTS_LIST.filter(a => a.condition(user.stats));
  const reviews = user.reviews || [];

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="relative mb-20" pointerEvents="box-none">
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="h-56 rounded-b-[40px]"
        />
        <View className="absolute top-12 left-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 bg-white/15 rounded-full border border-white/20">
            <ArrowLeft size={22} color={colorScheme === 'dark' ? '#fff' : '#0f172a'} />
          </TouchableOpacity>
        </View>

        <View className="absolute -bottom-16 left-5 right-5">
          <View className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-xl border border-gray-100 dark:border-gray-800">
            <View className="flex-row items-center">
              <Image
                source={{ uri: user.avatarUrl || 'https://via.placeholder.com/150' }}
                className="w-20 h-20 rounded-2xl border-2 border-white dark:border-gray-800"
              />
              <View className="ml-4 flex-1">
                <View className="flex-row items-center flex-wrap">
                  <Text className="text-2xl font-extrabold text-gray-900 dark:text-white mr-2" numberOfLines={1}>
                    {user.displayName}
                  </Text>
                  <View className={`px-3 py-1 rounded-full ${user.role === 'SHOPKEEPER' ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
                    <Text className={`text-xs font-bold ${user.role === 'SHOPKEEPER' ? 'text-purple-700 dark:text-purple-200' : 'text-blue-700 dark:text-blue-200'}`}>
                      {user.role}
                    </Text>
                  </View>
                </View>

                {user.role === 'SHOPKEEPER' && (
                  <View className="flex-row items-center mt-1">
                    <Star size={16} color="#eab308" fill="#eab308" />
                    <Text className="text-gray-800 dark:text-gray-200 font-semibold ml-1">
                      {user.rating?.average?.toFixed(1) || '0.0'}
                    </Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                      ({user.rating?.count || 0} reviews)
                    </Text>
                  </View>
                )}

                {user.address && (
                  <View className="flex-row items-center mt-2">
                    <MapPin size={12} color="#22c55e" />
                    <Text className="text-gray-600 dark:text-gray-300 text-xs ml-2 flex-1" numberOfLines={1}>
                      {user.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View className="flex-row mt-4 space-x-3">
              <TouchableOpacity
                onPress={handleMessage}
                className="flex-1 bg-gray-900 dark:bg-white py-3 rounded-2xl flex-row items-center justify-center"
              >
                <MessageCircle size={18} color={colorScheme === 'dark' ? '#0f172a' : '#fff'} />
                <Text className={`ml-2 font-semibold ${colorScheme === 'dark' ? 'text-gray-900' : 'text-white'}`}>Message</Text>
              </TouchableOpacity>
              {currentUser?.role === 'CUSTOMER' && user.role === 'SHOPKEEPER' && (
                <TouchableOpacity
                  onPress={() => setRatingModalVisible(true)}
                  className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-3 rounded-2xl flex-row justify-center items-center"
                >
                  <Star size={18} color="#eab308" />
                  <Text className="ml-2 text-gray-800 dark:text-gray-100 font-semibold">Rate</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View className="px-6 mt-6 mb-8">
        <View className="flex-row justify-between">
          <TouchableOpacity onPress={() => router.push(`/user-shared/${id}`)} className="flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-2xl mr-2 shadow-sm">
            <Text className="text-xs text-gray-500 dark:text-gray-400">Shared</Text>
            <Text className="text-3xl font-extrabold text-green-600 dark:text-green-400">{user.stats.shared}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/user-claimed/${id}`)} className="flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-2xl ml-2 shadow-sm">
            <Text className="text-xs text-gray-500 dark:text-gray-400">Claimed</Text>
            <Text className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{user.stats.claimed}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ratings & Reviews */}
      <View className="px-6 mb-8">
        <View className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-lg font-bold text-gray-900 dark:text-white">Ratings</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">From verified customers</Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center">
                <Star size={18} color="#eab308" fill="#eab308" />
                <Text className="ml-2 text-xl font-extrabold text-gray-900 dark:text-white">{(user.rating?.average ?? 0).toFixed(1)}</Text>
              </View>
              <Text className="text-xs text-gray-500 dark:text-gray-400">{user.rating?.count || 0} reviews</Text>
            </View>
          </View>

          {reviews.length === 0 ? (
            <Text className="text-gray-500 dark:text-gray-400 text-sm">No reviews yet.</Text>
          ) : (
            <View className="space-y-3">
              {reviews.map((rev: any) => (
                <View key={rev.id} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <View className="flex-row items-center mb-2">
                    <Image
                      source={{ uri: rev.raterAvatar || 'https://via.placeholder.com/100' }}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900 dark:text-white" numberOfLines={1}>{rev.raterName || 'Customer'}</Text>
                      <View className="flex-row items-center mt-1">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} size={14} color={i <= rev.rating ? '#eab308' : '#d1d5db'} fill={i <= rev.rating ? '#eab308' : 'transparent'} />
                        ))}
                      </View>
                    </View>
                    <Text className="text-[11px] text-gray-500 dark:text-gray-400">{new Date(rev.createdAt).toLocaleDateString()}</Text>
                  </View>
                  {rev.comment ? (
                    <Text className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{rev.comment}</Text>
                  ) : (
                    <Text className="text-xs text-gray-500 dark:text-gray-400">No comment provided.</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Achievements */}
      <View className="px-6 mb-10">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">Achievements</Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">Highlights</Text>
        </View>
        {unlockedAchievements.length > 0 ? (
          <View className="flex-row flex-wrap">
            {unlockedAchievements.map((achievement) => (
              <View key={achievement.id} className="w-1/3 items-center mb-6">
                <View className={`w-14 h-14 ${achievement.bg} rounded-2xl items-center justify-center mb-2 border ${achievement.border}`}>
                  <achievement.icon size={22} color={achievement.color} fill={achievement.color} />
                </View>
                <Text className="text-[11px] font-semibold text-gray-900 dark:text-white text-center px-2">{achievement.title}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-gray-500 dark:text-gray-400 italic">No achievements yet.</Text>
        )}
      </View>

      {/* Rating Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={ratingModalVisible}
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-900 rounded-t-3xl p-6 border-t border-gray-200 dark:border-gray-800">
            <Text className="text-xl font-extrabold text-gray-900 dark:text-white mb-3 text-center">Rate {user.displayName}</Text>

            <View className="flex-row justify-center space-x-3 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Star
                    size={42}
                    color={star <= rating ? '#eab308' : '#d1d5db'}
                    fill={star <= rating ? '#eab308' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 mb-4">
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Share your experience..."
                multiline
                className="p-4 text-gray-900 dark:text-white h-32"
                textAlignVertical="top"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <TouchableOpacity
              onPress={submitRating}
              disabled={submittingRating}
              className={`py-4 rounded-xl items-center ${submittingRating ? 'bg-gray-400' : 'bg-blue-600'}`}
            >
              {submittingRating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Submit Rating</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRatingModalVisible(false)}
              className="mt-4 py-2 items-center"
            >
              <Text className="text-gray-500 dark:text-gray-400">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
