import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';

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
};

const resolveColors = (variant: ButtonVariant, color: string | undefined, isDark: boolean): [string, string] => {
  if (color) return [color, color];
  if (variant === 'secondary') return isDark ? ['#38bdf8', '#0ea5e9'] : ['#0ea5e9', '#0284c7'];
  if (variant === 'danger') return isDark ? ['#fb7185', '#e11d48'] : ['#f43f5e', '#e11d48'];
  if (variant === 'ghost') return isDark ? ['#1f2937', '#111827'] : ['#f8fafc', '#e2e8f0'];
  return isDark ? ['#10b981', '#0f766e'] : ['#14b8a6', '#0f766e'];
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
}: ButtonProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const gradientColors = resolveColors(variant, color, isDark);
  const textColor = variant === 'ghost' ? (isDark ? '#e2e8f0' : '#0f172a') : '#ffffff';
  const borderColor = variant === 'ghost' ? (isDark ? '#374151' : '#cbd5e1') : 'transparent';
  const shadowColor = variant === 'danger' ? '#e11d48' : '#0f766e';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={className}
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        opacity: disabled ? 0.65 : 1,
        shadowColor,
        shadowOpacity: variant === 'ghost' ? 0.05 : 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: variant === 'ghost' ? 0 : 3,
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