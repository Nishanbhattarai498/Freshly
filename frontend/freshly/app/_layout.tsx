import React, { useEffect } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Slot, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import Constants from 'expo-constants';
import { StatusBar, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { MessagesProvider } from '../contexts/MessagesContext';
import { setAuthTokenProvider } from '../services/api';
import { registerForPushNotificationsAsync, subscribeToPushResponses } from '../services/pushNotifications';
import '../global.css';

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch {
      return;
    }
  },
};

const publishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  (Constants.expoConfig?.extra?.clerkPublishableKey as string | undefined);

const InitialLayout = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const appBg = isDark ? '#06131f' : '#f4f8f6';

  useEffect(() => {
    setAuthTokenProvider(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });

    return () => {
      setAuthTokenProvider(async () => null);
    };
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !navigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)/home');
    } else if (!isSignedIn && inTabsGroup) {
      router.replace('/(auth)/login');
    }
  }, [isSignedIn, isLoaded, navigationState?.key, segments, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    void registerForPushNotificationsAsync();

    let unsubscribe: (() => void) | null = null;
    void subscribeToPushResponses((response) => {
      const target = response.notification.request.content.data?.target;
      if (typeof target === 'string' && target.startsWith('/')) {
        router.push(target as never);
      }
    }).then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      unsubscribe?.();
    };
  }, [isLoaded, isSignedIn, router]);

  return (
    <View style={{ flex: 1, backgroundColor: appBg }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={appBg}
        translucent={false}
      />
      <SafeAreaView
        edges={['top']}
        style={{ backgroundColor: appBg }}
      />
      <View style={{ flex: 1, backgroundColor: appBg }}>
        <Slot />
      </View>
    </View>
  );
};

export default function RootLayout() {
  if (!publishableKey) {
    return (
      <View className="flex-1 items-center justify-center px-6 bg-white dark:bg-gray-950">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">Missing Clerk Configuration</Text>
        <Text className="text-sm text-gray-600 dark:text-gray-300 mt-2 text-center">
          Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your frontend environment and restart Expo.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <MessagesProvider>
          <InitialLayout />
        </MessagesProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
