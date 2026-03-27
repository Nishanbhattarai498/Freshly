import React from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';

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

export const LoadingView = ({ message = 'Loading...' }: LoadingViewProps) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#0000ff" />
    <Text style={{ marginTop: 10 }}>{message}</Text>
  </View>
);

export const ErrorView = ({ message = 'An error occurred', onRetry }: ErrorViewProps) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
      Error
    </Text>
    <Text style={{ textAlign: 'center', marginBottom: 20 }}>{message}</Text>
    {onRetry && (
      <Text
        style={{ color: 'blue', fontSize: 16, padding: 10 }}
        onPress={onRetry}
      >
        Retry
      </Text>
    )}
  </View>
);

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
          backgroundColor: '#ffffff',
          padding: 16,
          borderRadius: 16,
          width: '100%',
          borderWidth: 1,
          borderColor: '#e2e8f0',
        }}
      >
        <Text style={{ color: accent, fontWeight: '800', fontSize: 16 }}>{effectiveTitle}</Text>
        {effectiveMessage ? (
          <Text style={{ color: '#334155', marginTop: 8 }}>{effectiveMessage}</Text>
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
                backgroundColor: '#f1f5f9',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>{secondaryLabel}</Text>
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

export const EmptyView = ({ message = 'No data available' }: EmptyViewProps) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 16, color: '#999' }}>{message}</Text>
  </View>
);
