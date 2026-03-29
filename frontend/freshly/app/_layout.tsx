import React, { useEffect } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as NavigationBar from 'expo-navigation-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, ChevronLeft } from 'lucide-react-native';
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
    if (Platform.OS !== 'android') return;

    const inAuthGroup = segments[0] === '(auth)';

    const syncNavigationBarMode = async () => {
      try {
        if (inAuthGroup) {
          await NavigationBar.setPositionAsync('relative');
          await NavigationBar.setBackgroundColorAsync('#07141d');
          await NavigationBar.setVisibilityAsync('visible');
          return;
        }

        await NavigationBar.setPositionAsync('absolute');
        await NavigationBar.setBackgroundColorAsync('#00000000');
        await NavigationBar.setBehaviorAsync('overlay-swipe');
        await NavigationBar.setVisibilityAsync('hidden');
      } catch (error) {
        console.log('Navigation bar mode unavailable', error);
      }
    };

    void syncNavigationBarMode();
  }, [segments]);

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

  const inTabsGroup = segments[0] === '(tabs)';
  const onHomeScreen = inTabsGroup && segments[1] === 'home';
  const showHomeBackButton = isSignedIn && !onHomeScreen;

  return (
    <View style={{ flex: 1 }}>
      <Slot />
      {showHomeBackButton ? (
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home')}
          activeOpacity={0.88}
          style={{
            position: 'absolute',
            top: Math.max(insets.top + 6, 18),
            left: 16,
            zIndex: 50,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: 'rgba(8,20,29,0.84)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
            shadowColor: '#08111d',
            shadowOpacity: 0.22,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <ChevronLeft size={16} color="#ffffff" />
          <House size={15} color="#99f6e4" style={{ marginLeft: 2 }} />
          <Text style={{ color: '#ffffff', fontWeight: '800', marginLeft: 8, fontSize: 12, letterSpacing: 0.3 }}>
            Home
          </Text>
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
