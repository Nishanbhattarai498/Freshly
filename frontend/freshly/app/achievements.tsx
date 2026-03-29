import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Trophy, Flame, PackageOpen, HandHeart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { api } from '../services/api';
import { EmptyView, ErrorView, LoadingView } from '../components/ui/States';

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAchievements = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);

    try {
      const response = await api.get('/users/achievements');
      setData(response.data as AchievementsPayload);
      setError(null);
    } catch {
      if (mode === 'initial') {
        setData(null);
      }
      setError('We could not load your achievements right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAchievements();
  }, [loadAchievements]);

  const milestone = useMemo(() => {
    const shared = data?.stats.shared ?? 0;
    const claimed = data?.stats.claimed ?? 0;
    const streak = data?.stats.streak.current ?? 0;

    const candidates = [
      { label: 'next sharing milestone', value: shared, target: 15, tone: '#10b981' },
      { label: 'next claiming milestone', value: claimed, target: 15, tone: '#f59e0b' },
      { label: 'next streak milestone', value: streak, target: 7, tone: '#ef4444' },
    ].map((entry) => ({
      ...entry,
      remaining: Math.max(entry.target - entry.value, 0),
    }));

    return candidates.sort((a, b) => a.remaining - b.remaining)[0];
  }, [data]);

  if (loading) {
    return <LoadingView message="Loading your achievements..." />;
  }

  if (!data && error) {
    return <ErrorView message={error} onRetry={() => void loadAchievements()} />;
  }

  const currentStreak = data?.stats.streak.current ?? 0;
  const bestStreak = data?.stats.streak.best ?? 0;
  const sharedCount = data?.stats.shared ?? 0;
  const claimedCount = data?.stats.claimed ?? 0;
  const milestoneProgress = milestone ? Math.min(100, Math.round((milestone.value / milestone.target) * 100)) : 0;

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadAchievements('refresh')}
          tintColor="#10b981"
          colors={['#10b981']}
        />
      }
    >
      <LinearGradient
        colors={isDark ? ['#0f172a', '#064e3b'] : ['#0ea5e9', '#10b981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-6 pt-14 pb-9 rounded-b-[30px]"
      >
        <Text className="text-white/85 text-xs font-bold tracking-[2px] uppercase">Progress Board</Text>
        <Text className="text-white text-3xl font-black mt-2">Achievements</Text>
        <Text className="text-white/85 mt-2">Keep sharing and claiming to rise in the leaderboard.</Text>
        {error ? (
          <TouchableOpacity
            onPress={() => void loadAchievements('refresh')}
            className="self-start mt-4 px-4 py-2 rounded-full bg-white/15 border border-white/20"
            activeOpacity={0.88}
          >
            <Text className="text-white font-semibold text-xs">Refresh data</Text>
          </TouchableOpacity>
        ) : null}
      </LinearGradient>

      <View className="px-6 mt-6">
        <LinearGradient
          colors={isDark ? ['#111827', '#0f766e'] : ['#ffffff', '#ecfeff']}
          className="rounded-[30px] border border-white/40 dark:border-slate-800 p-5 shadow-sm"
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-teal-700 dark:text-teal-200">Momentum</Text>
              <Text className="text-3xl font-black text-slate-900 dark:text-white mt-2">{currentStreak} day streak</Text>
              <Text className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                Best streak: {bestStreak} days. Keep sharing and claiming consistently to stay on top.
              </Text>
            </View>
            <View className="w-16 h-16 rounded-[22px] bg-white/80 dark:bg-white/10 items-center justify-center">
              <Flame size={28} color="#ef4444" />
            </View>
          </View>

          <View className="mt-5 flex-row">
            <View className="flex-1 mr-2 rounded-[24px] bg-white/80 dark:bg-slate-900/60 px-4 py-4 border border-white/50 dark:border-slate-700">
              <View className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center">
                <PackageOpen size={18} color="#10b981" />
              </View>
              <Text className="text-2xl font-black text-slate-900 dark:text-white mt-4">{sharedCount}</Text>
              <Text className="text-xs uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400 mt-1">Items Shared</Text>
            </View>
            <View className="flex-1 ml-2 rounded-[24px] bg-white/80 dark:bg-slate-900/60 px-4 py-4 border border-white/50 dark:border-slate-700">
              <View className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 items-center justify-center">
                <HandHeart size={18} color="#f59e0b" />
              </View>
              <Text className="text-2xl font-black text-slate-900 dark:text-white mt-4">{claimedCount}</Text>
              <Text className="text-xs uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400 mt-1">Items Claimed</Text>
            </View>
          </View>
        </LinearGradient>

        <View className="mt-5 rounded-[28px] bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">Your Rank</Text>
            <View className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
              <Text className="text-[11px] font-bold uppercase tracking-[1.3px] text-slate-500 dark:text-slate-300">Live</Text>
            </View>
          </View>
          <View className="mt-4 flex-row">
            <View className="flex-1 mr-2 rounded-[22px] bg-slate-50 dark:bg-slate-800/80 px-4 py-4">
              <Text className="text-xs uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400">Sharing</Text>
              <Text className="text-2xl font-black text-slate-900 dark:text-white mt-2">{data?.rank.shared ? `#${data.rank.shared}` : '--'}</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">{data?.rank.shared ? 'Among top sharers' : 'Not ranked yet'}</Text>
            </View>
            <View className="flex-1 ml-2 rounded-[22px] bg-slate-50 dark:bg-slate-800/80 px-4 py-4">
              <Text className="text-xs uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400">Claiming</Text>
              <Text className="text-2xl font-black text-slate-900 dark:text-white mt-2">{data?.rank.claimed ? `#${data.rank.claimed}` : '--'}</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">{data?.rank.claimed ? 'Among top claimers' : 'Not ranked yet'}</Text>
            </View>
          </View>
        </View>

        {milestone ? (
          <View className="mt-5 rounded-[28px] bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">Next Milestone</Text>
              <View className="px-3 py-1 rounded-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc' }}>
                <Text className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: milestone.tone }}>
                  {milestoneProgress}%
                </Text>
              </View>
            </View>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {milestone.remaining === 0
                ? `You already reached your ${milestone.label}. Keep going.`
                : `You are ${milestone.remaining} away from your ${milestone.label}.`}
            </Text>
            <View className="h-2.5 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 mt-4">
              <View
                className="h-2.5 rounded-full"
                style={{ width: `${milestoneProgress}%`, backgroundColor: milestone.tone }}
              />
            </View>
            <View className="mt-4 flex-row justify-between">
              <Text className="text-xs text-slate-500 dark:text-slate-400">Current: {milestone.value}</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">Target: {milestone.target}</Text>
            </View>
          </View>
        ) : null}

        <View className="mt-5 rounded-[28px] bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Trophy size={18} color="#eab308" />
            <Text className="text-lg font-bold text-gray-900 dark:text-white ml-2">Top Sharers</Text>
          </View>
          {(data?.leaderboard.sharers || []).length ? (
            (data?.leaderboard.sharers || []).slice(0, 5).map((user) => (
              <View key={`sharer-${user.userId}`} className="py-3 border-b border-gray-100 dark:border-gray-800 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 pr-3">
                  <View className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-900/25 items-center justify-center mr-3">
                    <Text className="text-xs font-black text-emerald-700 dark:text-emerald-200">#{user.position}</Text>
                  </View>
                  <Text className="text-gray-900 dark:text-white font-semibold flex-1" numberOfLines={1}>{user.displayName}</Text>
                </View>
                <View className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                  <Text className="text-emerald-700 dark:text-emerald-200 font-bold">{user.count}</Text>
                </View>
              </View>
            ))
          ) : (
            <EmptyView message="No sharing leaderboard entries yet." />
          )}
        </View>

        <View className="mt-5 rounded-[28px] bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Trophy size={18} color="#eab308" />
            <Text className="text-lg font-bold text-gray-900 dark:text-white ml-2">Top Claimers</Text>
          </View>
          {(data?.leaderboard.claimers || []).length ? (
            (data?.leaderboard.claimers || []).slice(0, 5).map((user) => (
              <View key={`claimer-${user.userId}`} className="py-3 border-b border-gray-100 dark:border-gray-800 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 pr-3">
                  <View className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-900/25 items-center justify-center mr-3">
                    <Text className="text-xs font-black text-amber-700 dark:text-amber-200">#{user.position}</Text>
                  </View>
                  <Text className="text-gray-900 dark:text-white font-semibold flex-1" numberOfLines={1}>{user.displayName}</Text>
                </View>
                <View className="px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20">
                  <Text className="text-amber-700 dark:text-amber-200 font-bold">{user.count}</Text>
                </View>
              </View>
            ))
          ) : (
            <EmptyView message="No claiming leaderboard entries yet." />
          )}
        </View>
      </View>
    </ScrollView>
  );
}
