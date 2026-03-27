import React, { useState } from "react";
import { View, TextInput, Text, TouchableOpacity } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

export default function InputField({ label, value, onChangeText, placeholder, secureTextEntry = false, keyboardType = "default", icon, error, }) 
{
  const [isFocused, setIsFocused] = useState(false);
  const [hidePassword, setHidePassword] = useState(secureTextEntry);

  return (
    <View style={{ marginBottom: 18 }}>
      {label && (
        <Text
          style={{
            marginBottom: 6,
            fontWeight: "600",
            color: "#374151",
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
            ? "#ef4444"
            : isFocused
              ? "#16a34a"
              : "#d1d5db",
          borderRadius: 10,
          paddingHorizontal: 12,
          backgroundColor: "#f9fafb",
        }}
      >
        {icon && <View style={{ marginRight: 8 }}>{icon}</View>}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={hidePassword}
          keyboardType={keyboardType}
          style={{
            flex: 1,
            paddingVertical: 12,
            fontSize: 15,
            color: "#111827",
          }}
          placeholderTextColor="#9ca3af"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setHidePassword(!hidePassword)}
          >
            {hidePassword ? (
              <Eye size={20} color="#6b7280" />
            ) : (
              <EyeOff size={20} color="#6b7280" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text
          style={{
            marginTop: 4,
            color: "#ef4444",
            fontSize: 12,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
