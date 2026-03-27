import React from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';

type LoadingViewProps = {
  message?: string;
};

type ErrorViewProps = {
  message?: string;
  onRetry?: () => void;
};

type StatusPopupProps = {
  visible: boolean;
  message?: string;
  title?: string;
  description?: string;
  type?: 'success' | 'error' | 'info';
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onClose?: () => void;
};

type EmptyViewProps = {
  message?: string;
};

export const LoadingView = ({ message = 'Loading...' }: LoadingViewProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 18,
          borderRadius: 20,
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderWidth: 1,
          borderColor: isDark ? '#334155' : '#e2e8f0',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={{ marginTop: 10, color: isDark ? '#e2e8f0' : '#334155', fontWeight: '600' }}>{message}</Text>
      </View>
    </View>
  );
};

export const ErrorView = ({ message = 'An error occurred', onRetry }: ErrorViewProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
      <View
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 18,
          borderRadius: 20,
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderWidth: 1,
          borderColor: isDark ? '#334155' : '#e2e8f0',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 8, color: isDark ? '#f8fafc' : '#0f172a' }}>
          Something went wrong
        </Text>
        <Text style={{ color: isDark ? '#cbd5e1' : '#475569' }}>{message}</Text>
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            style={{
              marginTop: 14,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
              alignSelf: 'flex-start',
              backgroundColor: '#10b981',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

export const StatusPopup = ({
  visible,
  message,
  title,
  description,
  type = 'info',
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  onClose,
}: StatusPopupProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!visible) return null;

  const effectiveTitle = title || (type === 'success' ? 'Success' : type === 'error' ? 'Something went wrong' : 'Notice');
  const effectiveMessage = message || description || '';
  const accent = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#0369a1';

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 16,
      }}
    >
      <View
        style={{
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          padding: 16,
          borderRadius: 16,
          width: '100%',
          borderWidth: 1,
          borderColor: isDark ? '#334155' : '#e2e8f0',
        }}
      >
        <Text style={{ color: accent, fontWeight: '800', fontSize: 16 }}>{effectiveTitle}</Text>
        {effectiveMessage ? (
          <Text style={{ color: isDark ? '#cbd5e1' : '#334155', marginTop: 8 }}>{effectiveMessage}</Text>
        ) : null}

        <View style={{ flexDirection: 'row', marginTop: 14 }}>
          {secondaryLabel ? (
            <Pressable
              onPress={() => {
                onSecondary?.();
                onClose?.();
              }}
              style={{
                flex: 1,
                marginRight: 8,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: isDark ? '#1f2937' : '#f1f5f9',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: isDark ? '#f1f5f9' : '#0f172a', fontWeight: '700' }}>{secondaryLabel}</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => {
              onPrimary?.();
              onClose?.();
            }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: accent,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>{primaryLabel || 'OK'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export const EmptyView = ({ message = 'No data available' }: EmptyViewProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 16, color: isDark ? '#94a3b8' : '#64748b' }}>{message}</Text>
    </View>
  );
};
