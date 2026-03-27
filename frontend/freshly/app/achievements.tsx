import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Trophy, Flame, PackageOpen, HandHeart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { api } from '../services/api';

type Leader = {
  position: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  count: number;
};

type AchievementsPayload = {
  stats: {
    shared: number;
    claimed: number;
    streak: {
      current: number;
      best: number;
      lastActive?: string | null;
    };
  };
  rank: {
    shared: number | null;
    claimed: number | null;
  };
  leaderboard: {
    sharers: Leader[];
    claimers: Leader[];
  };
};

export default function AchievementsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [data, setData] = useState<AchievementsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await api.get('/users/achievements');
        setData(response.data as AchievementsPayload);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950" contentContainerStyle={{ paddingBottom: 120 }}>
      <LinearGradient
        colors={isDark ? ['#0f172a', '#064e3b'] : ['#0ea5e9', '#10b981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-6 pt-14 pb-9 rounded-b-[30px]"
      >
        <Text className="text-white/85 text-xs font-bold tracking-[2px] uppercase">Progress Board</Text>
        <Text className="text-white text-3xl font-black mt-2">Achievements</Text>
        <Text className="text-white/85 mt-2">Keep sharing and claiming to rise in the leaderboard.</Text>
      </LinearGradient>

      <View className="px-6 mt-6">
        <View className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <View className="flex-row justify-between">
            <View className="items-center flex-1">
              <Flame size={20} color="#ef4444" />
              <Text className="text-lg font-black text-gray-900 dark:text-white mt-1">{data?.stats.streak.current ?? 0}d</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">Current streak</Text>
            </View>
            <View className="items-center flex-1">
              <PackageOpen size={20} color="#10b981" />
              <Text className="text-lg font-black text-gray-900 dark:text-white mt-1">{data?.stats.shared ?? 0}</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">Shared</Text>
            </View>
            <View className="items-center flex-1">
              <HandHeart size={20} color="#f59e0b" />
              <Text className="text-lg font-black text-gray-900 dark:text-white mt-1">{data?.stats.claimed ?? 0}</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">Claimed</Text>
            </View>
          </View>
        </View>

        <View className="mt-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">Your Rank</Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">Sharing: {data?.rank.shared ? `#${data.rank.shared}` : 'Not ranked yet'}</Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">Claiming: {data?.rank.claimed ? `#${data.rank.claimed}` : 'Not ranked yet'}</Text>
        </View>

        <View className="mt-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Trophy size={18} color="#eab308" />
            <Text className="text-lg font-bold text-gray-900 dark:text-white ml-2">Top Sharers</Text>
          </View>
          {(data?.leaderboard.sharers || []).slice(0, 5).map((user) => (
            <View key={`sharer-${user.userId}`} className="py-2 border-b border-gray-100 dark:border-gray-800 flex-row justify-between">
              <Text className="text-gray-900 dark:text-white font-semibold">#{user.position} {user.displayName}</Text>
              <Text className="text-emerald-700 dark:text-emerald-200 font-bold">{user.count}</Text>
            </View>
          ))}
        </View>

        <View className="mt-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Trophy size={18} color="#eab308" />
            <Text className="text-lg font-bold text-gray-900 dark:text-white ml-2">Top Claimers</Text>
          </View>
          {(data?.leaderboard.claimers || []).slice(0, 5).map((user) => (
            <View key={`claimer-${user.userId}`} className="py-2 border-b border-gray-100 dark:border-gray-800 flex-row justify-between">
              <Text className="text-gray-900 dark:text-white font-semibold">#{user.position} {user.displayName}</Text>
              <Text className="text-amber-700 dark:text-amber-200 font-bold">{user.count}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
