import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { getThemeTokens, gradients, radii, shadows, spacing, typography } from './theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  iconRight?: React.ReactNode;
  color?: string;
  variant?: ButtonVariant;
  className?: string;
  style?: ViewStyle;
};

const resolveColors = (variant: ButtonVariant, color: string | undefined, isDark: boolean): readonly [string, string, ...string[]] => {
  if (color) return [color, color];
  if (variant === 'secondary') return isDark ? ['#12352e', '#0f766e'] : ['#0f766e', '#14b8a6'];
  if (variant === 'danger') return gradients.danger;
  if (variant === 'ghost') return isDark ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)'] : ['#ffffff', '#f5fbf9'];
  return isDark ? ['#0f766e', '#14b8a6', '#38bdf8'] : ['#0f766e', '#2dd4bf', '#84cc16'];
};

export default function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  iconRight,
  color,
  variant = 'primary',
  className,
  style,
}: ButtonProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const tokens = getThemeTokens(isDark);

  const gradientColors = resolveColors(variant, color, isDark);
  const textColor = variant === 'ghost' ? tokens.textPrimary : '#ffffff';
  const borderColor = variant === 'ghost' ? tokens.borderStrong : 'transparent';
  const containerShadow = variant === 'ghost' ? shadows.soft : shadows.medium;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.88}
      className={className}
      style={[
        {
          borderRadius: radii.xl,
          overflow: 'hidden',
          opacity: disabled ? 0.6 : 1,
        },
        containerShadow,
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          minHeight: 58,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor,
        }}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <>
            <Text
              style={{
                color: textColor,
                fontWeight: '800',
                fontSize: typography.body.fontSize,
                letterSpacing: 0.3,
                marginRight: iconRight ? spacing.sm : 0,
              }}
            >
              {label}
            </Text>
            {iconRight ? <View>{iconRight}</View> : null}
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}
