import React, { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LogOut, Settings, ChevronRight, MapPin, Edit2, HelpCircle, Award, Star, Flame, Trophy } from 'lucide-react-native';
import { api } from '../../services/api';
import { useColorScheme } from 'nativewind';
import { LoadingView } from '../../components/ui/States';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ProfileData = {
  avatarUrl?: string;
  displayName?: string;
  email?: string;
  address?: string;
  stats: {
    shared: number;
    claimed: number;
  };
};

type AchievementsData = {
  stats: {
    shared: number;
    claimed: number;
    streak: {
      current: number;
      best: number;
    };
  };
  rank: {
    shared: number | null;
    claimed: number | null;
  };
};

type MenuItemProps = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
  color?: string;
  badge?: string | number;
};



export default function Profile() {
  const { signOut, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [achievements, setAchievements] = useState<AchievementsData | null>(null);
  const [achievementsLoading, setAchievementsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!isSignedIn) {
      setLoading(false);
      setAchievementsLoading(false);
      setProfile(null);
      setAchievements(null);
      return;
    }

    try {
      const [profileRes, achievementRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/users/achievements'),
      ]);
      setProfile(profileRes.data);
      setAchievements(achievementRes.data);
      setImageError(false);
      setAuthError(null);
    } catch (error) {
      if ((error as { response?: { status?: number } })?.response?.status === 401) {
        setAuthError('Session expired. Please sign in again.');
      }
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      setAchievementsLoading(false);
    }
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return <LoadingView message="Loading your profile..." />;
  }

  if (!isSignedIn) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Please login</Text>
        <Text className="text-gray-600 dark:text-gray-300 text-center mb-4">Sign in to view your profile and achievements.</Text>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          className="px-5 py-3 rounded-xl bg-teal-700"
        >
          <Text className="text-white font-bold">Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (authError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unauthorized</Text>
        <Text className="text-gray-600 dark:text-gray-300 text-center mb-4">{authError}</Text>
        <View className="flex-row">
          <TouchableOpacity
            onPress={fetchProfile}
            className="px-5 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 mr-3"
          >
            <Text className="text-gray-900 dark:text-white font-bold">Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            className="px-5 py-3 rounded-xl bg-teal-700"
          >
            <Text className="text-white font-bold">Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const MenuItem = ({ icon: Icon, label, onPress, color = '#6b7280', badge }: MenuItemProps) => (
    <TouchableOpacity 
      onPress={onPress}
      className="flex-row items-center justify-between p-4 bg-white dark:bg-gray-900 mb-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
    >
      <View className="flex-row items-center">
        <View className={`w-10 h-10 rounded-full items-center justify-center mr-4`} style={{ backgroundColor: color + '15' }}>
          <Icon size={20} color={color} />
        </View>
        <Text className="text-base font-semibold text-gray-900 dark:text-white leading-tight">{label}</Text>
      </View>
      <View className="flex-row items-center">
        {badge && (
          <View className="bg-red-500 px-2 py-0.5 rounded-full mr-2">
            <Text className="text-white text-xs font-bold">{badge}</Text>
          </View>
        )}
        <ChevronRight size={20} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView className="flex-1 bg-[#f4f8f6] dark:bg-[#06131f]" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
      <View className="px-6 mb-8" style={{ paddingTop: Math.max(12, insets.top + 4) }}>
        <Text className="text-xs font-semibold uppercase tracking-[3px] mb-3" style={{ color: isDark ? '#99f6e4' : '#0f766e' }}>Profile</Text>
        <View
          className="p-5 rounded-[30px] flex-row items-center"
          style={{
            backgroundColor: isDark ? 'rgba(8,20,29,0.88)' : 'rgba(255,255,255,0.92)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)',
            shadowColor: '#08111d',
            shadowOpacity: 0.12,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 12 },
          }}
        >
          <View className="relative">
            <Image
              source={{ 
                uri: (!imageError && profile?.avatarUrl) 
                  ? profile.avatarUrl 
                  : (clerkUser?.imageUrl || 'https://via.placeholder.com/150')
              }}
              className="w-22 h-22 rounded-2xl border-4 border-white dark:border-gray-700"
              style={{ width: 88, height: 88, borderRadius: 24 }}
              onError={() => setImageError(true)}
            />
          </View>

          <View className="ml-4 flex-1">
            <View className="flex-row justify-between items-start">
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text className="text-xl font-extrabold leading-tight" style={{ color: isDark ? '#fff' : '#0f172a' }} numberOfLines={1}>
                  {profile?.displayName || clerkUser?.fullName}
                </Text>
                <Text className="text-xs mt-1" style={{ color: isDark ? '#cbd5e1' : '#475569' }} numberOfLines={1}>
                  {profile?.email || clerkUser?.primaryEmailAddress?.emailAddress}
                </Text>
                {profile?.address ? (
                  <View className="flex-row items-center mt-1">
                    <MapPin size={12} color="#22c55e" />
                    <Text className="text-xs ml-1 flex-1" style={{ color: isDark ? '#94a3b8' : '#4b5563' }} numberOfLines={1}>
                      {profile.address}
                    </Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => router.push('/edit-profile')} className="p-2 rounded-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#edf7f3' }}>
                <Edit2 size={16} color={isDark ? '#e2e8f0' : '#475569'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="flex-row mt-4" style={{ gap: 10 }}>
          <View className="px-3 py-2 rounded-full" style={{ backgroundColor: '#14b8a61a' }}>
            <Text className="text-[12px] font-semibold" style={{ color: '#16a34a' }}>
              Streak {achievements?.stats.streak.current ?? 0}d
            </Text>
          </View>
          <View className="px-3 py-2 rounded-full" style={{ backgroundColor: '#0ea5e91a' }}>
            <Text className="text-[12px] font-semibold" style={{ color: '#0284c7' }}>
              Shared {profile?.stats.shared ?? 0}
            </Text>
          </View>
          <View className="px-3 py-2 rounded-full" style={{ backgroundColor: '#f59e0b1a' }}>
            <Text className="text-[12px] font-semibold" style={{ color: '#b45309' }}>
              Claimed {profile?.stats.claimed ?? 0}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-6 mb-8">
        <View
          className="rounded-[30px] p-4"
          style={{
            backgroundColor: isDark ? 'rgba(8,20,29,0.84)' : 'rgba(255,255,255,0.92)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)',
            shadowColor: '#08111d',
            shadowOpacity: 0.12,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 12 },
          }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-lg font-bold" style={{ color: isDark ? '#fff' : '#0f172a' }}>Achievements</Text>
              <Text className="text-xs mt-1" style={{ color: isDark ? '#94a3b8' : '#475569' }}>Progress, rank, and streak</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/achievements')} className="px-3 py-1 rounded-full" style={{ backgroundColor: '#22c55e1a' }}>
              <Text className="text-xs font-semibold" style={{ color: '#16a34a' }}>View all</Text>
            </TouchableOpacity>
          </View>

          {achievementsLoading && (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#22c55e" />
            </View>
          )}

          {!achievementsLoading && achievements && (
            <>
              <View className="flex-row mb-3">
                <LinearGradient colors={['#0f766e', '#14b8a6', '#38bdf8']} className="flex-1 rounded-[24px] p-3 mr-2">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-white text-xs opacity-80">Active streak</Text>
                      <Text className="text-2xl font-extrabold text-white">{achievements.stats.streak.current}d</Text>
                      <Text className="text-[11px] text-white/80 mt-1">Best {achievements.stats.streak.best}d</Text>
                    </View>
                    <Flame size={36} color="#fff" />
                  </View>
                </LinearGradient>
                <View className="flex-1 bg-gray-50 dark:bg-[#102232] rounded-[24px] p-3 ml-2 border border-gray-100 dark:border-white/10">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Ranks</Text>
                    <Trophy size={18} color="#f59e0b" />
                  </View>
                  <Text className="text-base font-bold text-gray-900 dark:text-white mt-1">Share {achievements.rank.shared ? `#${achievements.rank.shared}` : '—'}</Text>
                  <Text className="text-sm font-semibold text-gray-600 dark:text-gray-300">Claim {achievements.rank.claimed ? `#${achievements.rank.claimed}` : '—'}</Text>
                </View>
              </View>

              {[
                { id: 'share', title: 'Sharing', icon: Award, color: '#22c55e', value: achievements?.stats.shared || 0, target: 15 },
                { id: 'claim', title: 'Claiming', icon: Star, color: '#f59e0b', value: achievements?.stats.claimed || 0, target: 15 },
                { id: 'streak', title: 'Streak', icon: Flame, color: '#ef4444', value: achievements?.stats.streak.current || 0, target: 7 },
              ].map((a) => {
                const pct = Math.min(100, Math.round((a.value / a.target) * 100));
                const IconComp = a.icon;
                return (
                  <View key={a.id} className="mb-3">
                    <View className="flex-row items-center mb-2">
                      <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${a.color}20` }}>
                        <IconComp size={20} color={a.color} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-900 dark:text-white">{a.title}</Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400">{Math.min(a.value, a.target)} / {a.target}</Text>
                      </View>
                      <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">{pct}%</Text>
                    </View>
                    <View className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <View className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: a.color }} />
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </View>

      {/* Menu Section */}
      <View className="px-6 mb-10">
        <Text className="text-lg font-bold" style={{ color: isDark ? '#fff' : '#0f172a' }}>Account</Text>
        
        <MenuItem 
          icon={Settings} 
          label="Settings" 
          onPress={() => router.push('/settings')} 
          color="#6b7280"
        />

        <MenuItem 
          icon={HelpCircle} 
          label="Help & Support" 
          onPress={() => {
            const email = 'nishanbhattarai1234567@gmail.com';
            const subject = 'Help & Support - Freshly';
            const body = 'Hi, I need help with...';
            const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            Linking.openURL(url).catch((err) => console.error('An error occurred', err));
          }} 
          color="#f97316"
        />

        <TouchableOpacity 
          onPress={handleSignOut}
          className="flex-row items-center justify-center p-4 mt-4 rounded-2xl"
          style={{
            backgroundColor: isDark ? 'rgba(248,113,113,0.15)' : '#fef2f2',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(248,113,113,0.35)' : '#fecdd3',
          }}
        >
          <LogOut size={20} color="#ef4444" className="mr-2" />
          <Text className="text-red-600 dark:text-red-300 font-bold text-base">Sign Out</Text>
        </TouchableOpacity>
      </View>
      
      <View className="items-center mb-8">
        <Text className="text-gray-400 text-xs">Freshly v1.0.0</Text>
      </View>
    </ScrollView>
  );
}
