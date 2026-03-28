import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import Button from '../components/ui/Button';

type MeResponse = {
  displayName?: string;
  avatarUrl?: string;
};

export default function EditProfileScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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
      const normalizedAvatar = avatarUrl.startsWith('data:image') ? avatarUrl : avatarUrl.trim();
      await api.put('/users/me', {
        displayName: displayName.trim(),
        avatarUrl: normalizedAvatar || undefined,
      });
      setStatus('Profile updated successfully.');
    } catch {
      setStatus('Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const setAvatarFromResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.length) return false;

    const picked = result.assets[0];
    if (picked.base64) {
      const mimeType = picked.mimeType || 'image/jpeg';
      setAvatarUrl(`data:${mimeType};base64,${picked.base64}`);
      return true;
    }

    return false;
  };

  const pickFromGallery = async () => {
    setUploadingPhoto(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow gallery access to upload your photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (setAvatarFromResult(result)) {
        setStatus('Photo selected. Tap Save Changes to update your profile.');
      }
    } catch {
      Alert.alert('Upload failed', 'Could not select image from gallery.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const takePhoto = async () => {
    setUploadingPhoto(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow camera access to take a profile photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (setAvatarFromResult(result)) {
        setStatus('Photo captured. Tap Save Changes to update your profile.');
      }
    } catch {
      Alert.alert('Camera failed', 'Could not capture image from camera.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const clearPhoto = () => {
    setAvatarUrl('');
    setStatus('Photo removed. Tap Save Changes to confirm.');
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <LinearGradient
          colors={isDark ? ['#0f172a', '#064e3b'] : ['#dbeafe', '#dcfce7']}
          className="px-6 pt-14 pb-8 rounded-b-[28px]"
        >
          <Text className="text-xs font-bold uppercase tracking-[2px] text-slate-700 dark:text-slate-200">Profile</Text>
          <Text className="text-3xl font-black text-slate-900 dark:text-white mt-2">Edit Your Profile</Text>
          <Text className="text-slate-700 dark:text-slate-300 mt-2">Keep your name and photo up to date.</Text>
        </LinearGradient>

        <View className="px-6 mt-6">
          <View className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <View className="items-center mb-5">
            <Image
              source={{ uri: avatarUrl || 'https://via.placeholder.com/160' }}
              className="w-24 h-24 rounded-full border border-gray-200 dark:border-gray-700"
            />

            <View className="flex-row mt-4" style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={pickFromGallery}
                disabled={uploadingPhoto}
                className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 flex-row items-center"
              >
                <ImagePlus size={16} color={isDark ? '#6ee7b7' : '#047857'} />
                <Text className="ml-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={takePhoto}
                disabled={uploadingPhoto}
                className="px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 flex-row items-center"
              >
                <Camera size={16} color={isDark ? '#7dd3fc' : '#0369a1'} />
                <Text className="ml-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={clearPhoto}
                disabled={uploadingPhoto}
                className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 flex-row items-center"
              >
                <Trash2 size={16} color={isDark ? '#fda4af' : '#be123c'} />
                <Text className="ml-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">Remove</Text>
              </TouchableOpacity>
            </View>

            {uploadingPhoto ? <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">Preparing photo...</Text> : null}
          </View>

          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Display Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your display name"
            className="rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-slate-900 mb-4"
            returnKeyType="next"
          />

          <Button label={saving ? 'Saving...' : 'Save Changes'} onPress={save} loading={saving} />
          {status ? <Text className="text-sm text-gray-600 dark:text-gray-300 mt-3">{status}</Text> : null}
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
