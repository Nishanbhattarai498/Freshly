import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white dark:bg-gray-950 px-6 pt-16">
      <Text className="text-3xl font-black text-gray-900 dark:text-white">Settings</Text>
      <Text className="mt-3 text-gray-600 dark:text-gray-300 leading-6">
        Settings page is not yet completed in this build. Authentication and profile features continue to work normally.
      </Text>
      <TouchableOpacity
        onPress={() => router.back()}
        className="mt-8 px-5 py-3 rounded-2xl bg-emerald-600 self-start"
      >
        <Text className="text-white font-semibold">Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}
