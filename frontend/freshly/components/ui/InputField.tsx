import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

type InputFieldProps = TextInputProps & {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
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
  multiline,
  numberOfLines,
  ...props
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hidePassword, setHidePassword] = useState(secureTextEntry);

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text
          style={{
            marginBottom: 6,
            fontWeight: '700',
            color: '#334155',
            letterSpacing: 0.1,
          }}
        >
          {label}
        </Text>
      )}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: error
            ? '#ef4444'
            : isFocused
              ? '#14b8a6'
              : '#cbd5e1',
          borderRadius: 14,
          paddingHorizontal: 14,
          backgroundColor: '#ffffff',
          shadowColor: '#0f172a',
          shadowOpacity: isFocused ? 0.08 : 0.04,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: isFocused ? 2 : 0,
        }}
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
            color: '#0f172a',
            textAlignVertical: multiline ? 'top' : 'center',
          }}
          placeholderTextColor="#94a3b8"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setHidePassword(!hidePassword)}
          >
            {hidePassword ? (
              <Eye size={20} color="#64748b" />
            ) : (
              <EyeOff size={20} color="#64748b" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {!error && helperText ? (
        <Text
          style={{
            marginTop: 6,
            color: '#64748b',
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
