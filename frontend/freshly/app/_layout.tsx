import React, { useEffect } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { MessagesProvider } from '../contexts/MessagesContext';
import { setAuthTokenProvider } from '../services/api';
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

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const InitialLayout = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)/home');
    } else if (!isSignedIn && inTabsGroup) {
      router.replace('/(auth)/login');
    }
  }, [isSignedIn, isLoaded, segments, router]);

  return <Slot />;
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
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <MessagesProvider>
        <InitialLayout />
      </MessagesProvider>
    </ClerkProvider>
  );
}
