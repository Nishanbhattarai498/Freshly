import React from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { getThemeTokens, gradients, radii, shadows, spacing, typography } from './theme';
import { Check, CircleAlert, Info } from 'lucide-react-native';

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
  const tokens = getThemeTokens(isDark);

  return (
    <LinearGradient colors={isDark ? gradients.auroraDark : gradients.auroraLight} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
      <View
        style={{
          width: '100%',
          maxWidth: 320,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.xl,
          borderRadius: radii.xxl,
          backgroundColor: tokens.card,
          borderWidth: 1,
          borderColor: tokens.border,
          alignItems: 'center',
          ...shadows.medium,
        }}
      >
        <ActivityIndicator size="large" color={tokens.tint} />
        <Text style={{ marginTop: spacing.sm, color: tokens.textPrimary, fontWeight: '800', fontSize: typography.title.fontSize }}>
          Hold tight
        </Text>
        <Text style={{ marginTop: spacing.xs, color: tokens.textSecondary, textAlign: 'center' }}>{message}</Text>
      </View>
    </LinearGradient>
  );
};

export const ErrorView = ({ message = 'An error occurred', onRetry }: ErrorViewProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const tokens = getThemeTokens(isDark);

  return (
    <LinearGradient colors={isDark ? gradients.auroraDark : gradients.auroraLight} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
      <View
        style={{
          width: '100%',
          maxWidth: 420,
          padding: spacing.xl,
          borderRadius: radii.xxl,
          backgroundColor: tokens.card,
          borderWidth: 1,
          borderColor: tokens.border,
          ...shadows.medium,
        }}
      >
        <Text style={{ fontSize: typography.h2.fontSize, fontWeight: '900', marginBottom: spacing.xs, color: tokens.textPrimary }}>
          Something slipped
        </Text>
        <Text style={{ color: tokens.textSecondary, lineHeight: 22 }}>{message}</Text>
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            style={{
              marginTop: spacing.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: radii.lg,
              alignSelf: 'flex-start',
              backgroundColor: tokens.tintStrong,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '800' }}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    </LinearGradient>
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
  const tokens = getThemeTokens(isDark);

  if (!visible) return null;

  const effectiveTitle = title || (type === 'success' ? 'Success' : type === 'error' ? 'Something went wrong' : 'Notice');
  const effectiveMessage = message || description || '';
  const accent = type === 'success' ? tokens.success : type === 'error' ? tokens.danger : '#0ea5e9';
  const isSuccess = type === 'success';
  const StatusIcon = type === 'success' ? Check : type === 'error' ? CircleAlert : Info;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(2,6,23,0.4)',
        padding: spacing.md,
        zIndex: 30,
      }}
    >
      <View
        style={{
          backgroundColor: tokens.card,
          paddingHorizontal: spacing.lg,
          paddingVertical: isSuccess ? spacing.xl : spacing.lg,
          borderRadius: radii.xxl,
          width: '100%',
          maxWidth: isSuccess ? 320 : 420,
          borderWidth: 1,
          borderColor: tokens.border,
          alignItems: isSuccess ? 'center' : 'stretch',
          ...shadows.medium,
        }}
      >
        {isSuccess ? (
          <>
            <LinearGradient
              colors={isDark ? ['#0f766e', '#14b8a6'] : ['#10b981', '#34d399']}
              style={{
                width: 92,
                height: 92,
                borderRadius: 46,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <StatusIcon size={40} color="#ffffff" strokeWidth={2.7} />
            </LinearGradient>
            <Text style={{ color: tokens.textPrimary, fontWeight: '900', fontSize: 22, textAlign: 'center' }}>{effectiveTitle}</Text>
            {effectiveMessage ? (
              <Text style={{ color: tokens.textSecondary, marginTop: spacing.sm, lineHeight: 22, textAlign: 'center' }}>
                {effectiveMessage}
              </Text>
            ) : null}
            <Pressable
              onPress={() => {
                onPrimary?.();
                onClose?.();
              }}
              style={{
                marginTop: spacing.lg,
                minWidth: 150,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.full,
                backgroundColor: accent,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800' }}>{primaryLabel || 'OK'}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View
              style={{
                width: 48,
                height: 6,
                borderRadius: radii.full,
                backgroundColor: accent,
                marginBottom: spacing.md,
              }}
            />
            <Text style={{ color: tokens.textPrimary, fontWeight: '900', fontSize: 18 }}>{effectiveTitle}</Text>
            {effectiveMessage ? <Text style={{ color: tokens.textSecondary, marginTop: spacing.sm, lineHeight: 22 }}>{effectiveMessage}</Text> : null}

            <View style={{ flexDirection: 'row', marginTop: spacing.lg }}>
              {secondaryLabel ? (
                <Pressable
                  onPress={() => {
                    onSecondary?.();
                    onClose?.();
                  }}
                  style={{
                    flex: 1,
                    marginRight: spacing.sm,
                    paddingVertical: spacing.sm,
                    borderRadius: radii.lg,
                    backgroundColor: isDark ? '#132434' : '#eef5f4',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: tokens.textPrimary, fontWeight: '800' }}>{secondaryLabel}</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => {
                  onPrimary?.();
                  onClose?.();
                }}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radii.lg,
                  backgroundColor: accent,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '800' }}>{primaryLabel || 'OK'}</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

export const EmptyView = ({ message = 'No data available' }: EmptyViewProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const tokens = getThemeTokens(isDark);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderRadius: radii.xl,
          backgroundColor: isDark ? '#102232' : '#f1f7f4',
          borderWidth: 1,
          borderColor: tokens.border,
        }}
      >
        <Text style={{ fontSize: 16, color: tokens.textSecondary, fontWeight: '700', textAlign: 'center' }}>{message}</Text>
      </View>
    </View>
  );
};
