import React from "react";
import {
  TouchableOpacity, Text, ActivityIndicator, View,
} from "react-native";

export default function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  iconRight,
  color = "#2563eb",
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={{
        backgroundColor: disabled ? "#d1d5db" : color,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <>
          <Text
            style={{
              color: "white",
              fontWeight: "600",
              fontSize: 16,
              marginRight: iconRight ? 8 : 0,
            }}
          >
            {label}
          </Text>

          {iconRight && <View>{iconRight}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}