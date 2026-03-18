import React from "react";
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useUser } from "@clerk/clerk-expo";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      router.replace("/(tabs)/home");
    }
  }, [isLoaded, isSignedIn]);

  return (
    <LinearGradient
      colors={isDark ? ["#0f172a", "#1e293b"] : ["#6366f1", "#8b5cf6"]}
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <View
        style={{
          backgroundColor: isDark ? "#1f2937" : "white",
          padding: 30,
          borderRadius: 20,
          width: "90%",
          alignItems: "center",
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        <Text
          style={{
            fontSize: 30,
            fontWeight: "bold",
            marginBottom: 10,
            color: isDark ? "white" : "#111827",
          }}
        >
          🌱 Freshly
        </Text>

        <Text
          style={{
            textAlign: "center",
            color: isDark ? "#9ca3af" : "#6b7280",
            marginBottom: 25,
          }}
        >
          Expiry Prediction & Discount System
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={{
            backgroundColor: "#6366f1",
            padding: 15,
            borderRadius: 10,
            width: "100%",
            marginBottom: 15,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            LOGIN
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup")}
          style={{
            backgroundColor: "#8b5cf6",
            padding: 15,
            borderRadius: 10,
            width: "100%",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            SIGN UP
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}