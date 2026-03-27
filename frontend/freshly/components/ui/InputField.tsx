import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, type TextInputProps, type ViewStyle } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

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

  const [isFocused, setIsFocused] = useState(false);
  const [hidePassword, setHidePassword] = useState(secureTextEntry);

  const labelColor = isDark ? '#cbd5e1' : '#334155';
  const helperColor = isDark ? '#94a3b8' : '#64748b';
  const inputTextColor = isDark ? '#f8fafc' : '#0f172a';
  const placeholderColor = isDark ? '#64748b' : '#94a3b8';
  const inputBg = isDark ? '#0f172a' : '#ffffff';
  const inputBorder = error
    ? '#ef4444'
    : isFocused
      ? '#14b8a6'
      : (isDark ? '#334155' : '#cbd5e1');

  return (
    <View className={containerClassName} style={[{ marginBottom: 16 }, containerStyle]}>
      {label && (
        <Text
          style={{
            marginBottom: 6,
            fontWeight: '700',
            color: labelColor,
            letterSpacing: 0.1,
          }}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: inputBorder,
            borderRadius: 14,
            paddingHorizontal: 14,
            backgroundColor: inputBg,
            shadowColor: '#0f172a',
            shadowOpacity: isFocused ? (isDark ? 0.2 : 0.08) : (isDark ? 0.12 : 0.04),
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: isFocused ? 2 : 0,
            ...(multiline ? { alignItems: 'flex-start' } : null),
          },
          inputContainerStyle,
        ]}
      >
        {icon && <View style={{ marginRight: 8 }}>{icon}</View>}

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
            paddingVertical: multiline ? 12 : 13,
            fontSize: 15,
            color: inputTextColor,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
          placeholderTextColor={placeholderColor}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setHidePassword(!hidePassword)}
          >
            {hidePassword ? (
              <Eye size={20} color={helperColor} />
            ) : (
              <EyeOff size={20} color={helperColor} />
            )}
          </TouchableOpacity>
        )}

        {rightElement && !secureTextEntry ? <View style={{ marginLeft: 8 }}>{rightElement}</View> : null}
      </View>

      {!error && helperText ? (
        <Text
          style={{
            marginTop: 6,
            color: helperColor,
            fontSize: 12,
          }}
        >
          {helperText}
        </Text>
      ) : null}

      {error && (
        <Text
          style={{
            marginTop: 4,
            color: '#ef4444',
            fontSize: 12,
            fontWeight: '600',
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
