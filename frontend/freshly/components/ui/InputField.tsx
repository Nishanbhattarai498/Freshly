import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, type TextInputProps, type ViewStyle } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { getThemeTokens, radii, spacing, typography } from './theme';

type InputFieldProps = TextInputProps & {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
  containerClassName?: string;
  containerStyle?: ViewStyle;
  inputContainerStyle?: ViewStyle;
};

export default function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  icon,
  error,
  helperText,
  rightElement,
  containerClassName,
  containerStyle,
  inputContainerStyle,
  multiline,
  numberOfLines,
  ...props
}: InputFieldProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const tokens = getThemeTokens(isDark);

  const [isFocused, setIsFocused] = useState(false);
  const [hidePassword, setHidePassword] = useState(secureTextEntry);

  const inputBorder = error
    ? tokens.danger
    : isFocused
      ? tokens.tint
      : tokens.inputBorder;

  const inputBackgroundColor = isFocused
    ? (isDark ? 'rgba(10, 28, 40, 0.98)' : '#fdfefe')
    : tokens.inputBg;

  return (
    <View className={containerClassName} style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label ? (
        <Text
          style={{
            marginBottom: spacing.xs,
            fontWeight: '700',
            color: tokens.textSecondary,
            letterSpacing: 0.2,
            fontSize: typography.small.fontSize,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: inputBorder,
            borderRadius: radii.xl,
            paddingHorizontal: spacing.md,
            backgroundColor: inputBackgroundColor,
            minHeight: multiline ? 118 : 58,
            ...(multiline ? { alignItems: 'flex-start', paddingTop: spacing.sm } : null),
          },
          inputContainerStyle,
        ]}
      >
        {icon ? <View style={{ marginRight: spacing.sm, marginTop: multiline ? 12 : 0 }}>{icon}</View> : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={hidePassword}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={{
            flex: 1,
            paddingVertical: multiline ? spacing.sm : spacing.md,
            fontSize: typography.body.fontSize,
            color: tokens.textPrimary,
            textAlignVertical: multiline ? 'top' : 'center',
            fontWeight: '600',
          }}
          placeholderTextColor={tokens.textMuted}
          underlineColorAndroid="transparent"
          selectionColor={tokens.tintStrong}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {secureTextEntry ? (
          <TouchableOpacity onPress={() => setHidePassword(!hidePassword)}>
            {hidePassword ? (
              <Eye size={20} color={tokens.textMuted} />
            ) : (
              <EyeOff size={20} color={tokens.textMuted} />
            )}
          </TouchableOpacity>
        ) : null}

        {rightElement && !secureTextEntry ? <View style={{ marginLeft: spacing.sm }}>{rightElement}</View> : null}
      </View>

      {!error && helperText ? (
        <Text
          style={{
            marginTop: spacing.xs,
            color: tokens.textMuted,
            fontSize: typography.small.fontSize,
          }}
        >
          {helperText}
        </Text>
      ) : null}

      {error ? (
        <Text
          style={{
            marginTop: spacing.xs,
            color: tokens.danger,
            fontSize: typography.small.fontSize,
            fontWeight: '700',
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
