import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  iconRight?: React.ReactNode;
  color?: string;
  variant?: ButtonVariant;
};

const resolveColors = (variant: ButtonVariant, color?: string): [string, string] => {
  if (color) return [color, color];
  if (variant === 'secondary') return ['#0ea5e9', '#0284c7'];
  if (variant === 'danger') return ['#f43f5e', '#e11d48'];
  if (variant === 'ghost') return ['#e2e8f0', '#cbd5e1'];
  return ['#14b8a6', '#0f766e'];
};

export default function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  iconRight,
  color,
  variant = 'primary',
}: ButtonProps) {
  const gradientColors = resolveColors(variant, color);
  const textColor = variant === 'ghost' ? '#0f172a' : '#ffffff';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: variant === 'ghost' ? '#cbd5e1' : 'transparent',
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
                fontSize: 15,
                letterSpacing: 0.2,
                marginRight: iconRight ? 8 : 0,
              }}
            >
              {label}
            </Text>

            {iconRight && <View>{iconRight}</View>}
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}