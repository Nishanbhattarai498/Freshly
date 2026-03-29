import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { SunMedium, UserRoundCog, ServerCog, FlaskConical } from 'lucide-react-native';
import { api, SERVER_ROOT_URL } from '../services/api';

type MeResponse = {
  role?: 'SHOPKEEPER' | 'CUSTOMER';
};

type MlStatusResponse = {
  mode?: string;
  remoteHealth?: {
    available?: boolean;
    reason?: string;
  };
  localFallback?: {
    enabled?: boolean;
  };
};

export default function SettingsScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [role, setRole] = useState<'SHOPKEEPER' | 'CUSTOMER'>('CUSTOMER');
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(false);
  const [systemStatus, setSystemStatus] = useState<{
    backend: 'checking' | 'online' | 'offline';
    ml: 'checking' | 'online' | 'offline' | 'waking';
    mode: string;
    fallback: boolean;
    mlReason: string | null;
  }>({
    backend: 'checking',
    ml: 'checking',
    mode: 'unknown',
    fallback: false,
    mlReason: null,
  });

  const loadSystemStatus = async () => {
    setSystemStatus((current) => ({
      ...current,
      backend: 'checking',
      ml: 'checking',
    }));

    try {
      const backendHealthPromise = fetch(`${SERVER_ROOT_URL}/health`, {
        method: 'GET',
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Backend health check failed with ${response.status}`);
        }
        return response.json();
      });

      const [backendHealth, mlStatus] = await Promise.allSettled([
        backendHealthPromise,
        api.get('/ml/status'),
      ]);

      const backendOnline = backendHealth.status === 'fulfilled';
      const mlPayload = mlStatus.status === 'fulfilled' ? (mlStatus.value.data as MlStatusResponse) : null;
      const mlHealthAvailable = Boolean(mlPayload?.remoteHealth?.available ?? false);
      const mlReason = mlPayload?.remoteHealth?.reason || null;
      const mlState: 'online' | 'offline' | 'waking' =
        mlHealthAvailable
          ? 'online'
          : backendOnline && mlPayload?.mode === 'remote-python-service'
            ? 'waking'
            : 'offline';

      setSystemStatus({
        backend: backendOnline ? 'online' : 'offline',
        ml: mlState,
        mode: mlPayload?.mode || 'unknown',
        fallback: Boolean(mlPayload?.localFallback?.enabled),
        mlReason,
      });
    } catch {
      setSystemStatus({
        backend: 'offline',
        ml: 'offline',
        mode: 'unknown',
        fallback: false,
        mlReason: null,
      });
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get('/users/me');
        const me = response.data as MeResponse;
        if (me.role === 'SHOPKEEPER' || me.role === 'CUSTOMER') {
          setRole(me.role);
        }
      } catch {
        // Keep defaults.
      } finally {
        setLoading(false);
      }

      await loadSystemStatus();
    };

    void load();
  }, []);

  const updateRole = async (nextRole: 'SHOPKEEPER' | 'CUSTOMER') => {
    if (savingRole || nextRole === role) return;
    setSavingRole(true);
    try {
      await api.put('/users/me/role', { role: nextRole });
      setRole(nextRole);
    } catch {
      // Keep current role on failure.
    } finally {
      setSavingRole(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      <LinearGradient
        colors={isDark ? ['#0f172a', '#064e3b'] : ['#dbeafe', '#dcfce7']}
        className="px-6 pt-14 pb-8 rounded-b-[28px]"
      >
        <Text className="text-xs uppercase tracking-[2px] text-slate-700 dark:text-slate-200 font-bold">Control Panel</Text>
        <Text className="text-3xl font-black text-slate-900 dark:text-white mt-2">Settings</Text>
        <Text className="text-slate-700 dark:text-slate-300 mt-2">Personalize how your Freshly experience feels.</Text>
      </LinearGradient>

      <View className="px-6 mt-6">
        <View className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 p-5 mb-4 shadow-sm">
          <View className="flex-row items-center mb-3">
            <SunMedium size={18} color="#0ea5e9" />
            <Text className="text-gray-900 dark:text-white font-bold text-lg ml-2">Appearance</Text>
          </View>
          <View className="flex-row">
            <Pressable
              onPress={() => setColorScheme?.('light')}
              className={`flex-1 mr-2 py-3 rounded-2xl border ${colorScheme === 'light' ? 'bg-emerald-600 border-emerald-600' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700'}`}
            >
              <Text className={`text-center font-bold ${colorScheme === 'light' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Light</Text>
            </Pressable>
            <Pressable
              onPress={() => setColorScheme?.('dark')}
              className={`flex-1 ml-2 py-3 rounded-2xl border ${colorScheme === 'dark' ? 'bg-emerald-600 border-emerald-600' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700'}`}
            >
              <Text className={`text-center font-bold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Dark</Text>
            </Pressable>
          </View>
        </View>

        <View className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 p-5 mb-4 shadow-sm">
          <View className="flex-row items-center mb-3">
            <UserRoundCog size={18} color="#10b981" />
            <Text className="text-gray-900 dark:text-white font-bold text-lg ml-2">Account Role</Text>
          </View>
          <Text className="text-sm text-gray-600 dark:text-gray-300 mb-3">Choose how you mostly use the app.</Text>
          <View className="flex-row">
            <Pressable
              onPress={() => updateRole('CUSTOMER')}
              className={`flex-1 mr-2 py-3 rounded-2xl border ${role === 'CUSTOMER' ? 'bg-emerald-600 border-emerald-600' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700'}`}
            >
              <Text className={`text-center font-bold ${role === 'CUSTOMER' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Customer</Text>
            </Pressable>
            <Pressable
              onPress={() => updateRole('SHOPKEEPER')}
              className={`flex-1 ml-2 py-3 rounded-2xl border ${role === 'SHOPKEEPER' ? 'bg-emerald-600 border-emerald-600' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700'}`}
            >
              <Text className={`text-center font-bold ${role === 'SHOPKEEPER' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Shopkeeper</Text>
            </Pressable>
          </View>
          {savingRole ? <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">Saving role...</Text> : null}
        </View>

        <View className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 p-5 mb-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <ServerCog size={18} color="#6366f1" />
              <Text className="text-gray-900 dark:text-white font-bold text-lg ml-2">System Status</Text>
            </View>
            <Pressable onPress={() => void loadSystemStatus()} className="px-3 py-2 rounded-full bg-gray-100 dark:bg-slate-800">
              <Text className="text-xs font-bold text-gray-700 dark:text-gray-200">Refresh</Text>
            </Pressable>
          </View>

          <View className="flex-row mb-3">
            <View className="flex-1 mr-2 rounded-2xl px-4 py-4 bg-slate-50 dark:bg-slate-800/70">
              <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400">Backend</Text>
              <Text className={`mt-2 text-base font-bold ${systemStatus.backend === 'online' ? 'text-emerald-600' : systemStatus.backend === 'offline' ? 'text-rose-500' : 'text-gray-500'}`}>
                {systemStatus.backend}
              </Text>
            </View>
            <View className="flex-1 ml-2 rounded-2xl px-4 py-4 bg-slate-50 dark:bg-slate-800/70">
              <View className="flex-row items-center">
                <FlaskConical size={14} color="#14b8a6" />
                <Text className="ml-1 text-xs font-semibold uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400">ML Service</Text>
              </View>
              <Text className={`mt-2 text-base font-bold ${systemStatus.ml === 'online' ? 'text-emerald-600' : systemStatus.ml === 'waking' ? 'text-amber-500' : systemStatus.ml === 'offline' ? 'text-rose-500' : 'text-gray-500'}`}>
                {systemStatus.ml}
              </Text>
            </View>
          </View>

          <Text className="text-sm text-gray-600 dark:text-gray-300">Prediction mode: {systemStatus.mode}</Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Local fallback {systemStatus.fallback ? 'enabled' : 'disabled'} if the hosted ML service is unavailable.
          </Text>
          {systemStatus.mlReason ? (
            <Text className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              ML note: {systemStatus.mlReason}
            </Text>
          ) : null}
        </View>

      </View>
    </View>
  );
}
