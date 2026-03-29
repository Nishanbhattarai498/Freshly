import React, { useEffect } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
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
  const insets = useSafeAreaInsets();

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

  const inAuthGroup = segments[0] === '(auth)';
  const showBackButton = isLoaded && (inAuthGroup || isSignedIn);

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (isSignedIn) {
      router.replace('/(tabs)/home');
      return;
    }

    router.replace('/(auth)/login');
  };

  return (
    <View style={{ flex: 1 }}>
      <Slot />
      {showBackButton ? (
        <TouchableOpacity
          onPress={handleBackPress}
          activeOpacity={0.88}
          style={{
            position: 'absolute',
            top: Math.max(insets.top + 6, 16),
            left: 16,
            zIndex: 50,
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 22,
            backgroundColor: 'rgba(8,20,29,0.78)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            shadowColor: '#08111d',
            shadowOpacity: 0.18,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
            elevation: 6,
          }}
        >
          <ChevronLeft size={20} color="#ffffff" />
        </TouchableOpacity>
      ) : null}
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
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <MessagesProvider>
        <InitialLayout />
      </MessagesProvider>
    </ClerkProvider>
  );
}
