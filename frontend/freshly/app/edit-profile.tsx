import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../services/api';
import Button from '../components/ui/Button';

type MeResponse = {
  displayName?: string;
  avatarUrl?: string;
};

export default function EditProfileScreen() {
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get('/users/me');
        const me = response.data as MeResponse;
        setDisplayName(me.displayName || '');
        setAvatarUrl(me.avatarUrl || '');
      } catch {
        setStatus('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const save = async () => {
    if (saving) return;
    if (!displayName.trim()) {
      setStatus('Display name is required.');
      return;
    }

    setSaving(true);
    try {
      await api.put('/users/me', {
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });
      setStatus('Profile updated successfully.');
    } catch {
      setStatus('Could not update profile.');
    } finally {
      setSaving(false);
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
      <LinearGradient colors={['#dbeafe', '#dcfce7']} className="px-6 pt-14 pb-8 rounded-b-[28px]">
        <Text className="text-xs font-bold uppercase tracking-[2px] text-slate-700">Profile</Text>
        <Text className="text-3xl font-black text-slate-900 mt-2">Edit Your Profile</Text>
        <Text className="text-slate-700 mt-2">Keep your name and photo up to date.</Text>
      </LinearGradient>

      <View className="px-6 mt-6">
        <View className="items-center mb-5">
          <Image
            source={{ uri: avatarUrl || 'https://via.placeholder.com/160' }}
            className="w-24 h-24 rounded-full border border-gray-200 dark:border-gray-700"
          />
        </View>

        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Display Name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your display name"
          className="rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-slate-900 mb-4"
        />

        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Avatar URL</Text>
        <TextInput
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="https://..."
          className="rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-slate-900 mb-5"
        />

        <Button label={saving ? 'Saving...' : 'Save Changes'} onPress={save} loading={saving} />
        {status ? <Text className="text-sm text-gray-600 dark:text-gray-300 mt-3">{status}</Text> : null}
      </View>
    </View>
  );
}
