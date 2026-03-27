import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { MoonStar, SunMedium, UserRoundCog } from 'lucide-react-native';
import { api } from '../services/api';

type MeResponse = {
  role?: 'SHOPKEEPER' | 'CUSTOMER';
};

export default function SettingsScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [role, setRole] = useState<'SHOPKEEPER' | 'CUSTOMER'>('CUSTOMER');
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(false);

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
    };

    load();
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
              className={`flex-1 mr-2 py-3 rounded-2xl border ${!isDark ? 'bg-emerald-600 border-emerald-600' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700'}`}
            >
              <Text className={`text-center font-bold ${!isDark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Light</Text>
            </Pressable>
            <Pressable
              onPress={() => setColorScheme?.('dark')}
              className={`flex-1 ml-2 py-3 rounded-2xl border ${isDark ? 'bg-emerald-600 border-emerald-600' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700'}`}
            >
              <Text className={`text-center font-bold ${isDark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Dark</Text>
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

        <View className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <View className="flex-row items-center mb-3">
            <MoonStar size={18} color="#8b5cf6" />
            <Text className="text-gray-900 dark:text-white font-bold text-lg ml-2">Environment</Text>
          </View>
          <Text className="text-xs text-gray-500 dark:text-gray-400">API: {process.env.EXPO_PUBLIC_API_URL || 'auto-detect'}</Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">Socket: {process.env.EXPO_PUBLIC_SOCKET_URL || 'auto-detect'}</Text>
        </View>
      </View>
    </View>
  );
}
