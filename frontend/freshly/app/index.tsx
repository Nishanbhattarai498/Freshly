import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useUser } from "@clerk/clerk-expo";

export default function Home() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      router.replace("/(tabs)/home");
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <LinearGradient
      colors={isDark ? ['#0b1220', '#052e2b'] : ['#e6fffb', '#dbeafe']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      <View
        style={{
          backgroundColor: isDark ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.92)',
          padding: 28,
          borderRadius: 28,
          width: '100%',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(15,23,42,0.08)',
          shadowColor: '#0f172a',
          shadowOpacity: 0.14,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 12 },
          elevation: 9,
        }}
      >
        <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: isDark ? 'rgba(20,184,166,0.2)' : '#ccfbf1', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 34 }}>🍃</Text>
        </View>

        <Text
          style={{
            fontSize: 34,
            fontWeight: '900',
            marginBottom: 8,
            color: isDark ? '#f8fafc' : '#0f172a',
          }}
        >
          Freshly
        </Text>

        <Text
          style={{
            textAlign: 'center',
            color: isDark ? '#cbd5e1' : '#475569',
            marginBottom: 28,
            lineHeight: 22,
          }}
        >
          Share surplus food locally, predict freshness with ML, and cut waste beautifully.
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={{
            backgroundColor: '#0f766e',
            padding: 15,
            borderRadius: 14,
            width: '100%',
            marginBottom: 12,
            alignItems: 'center',
            shadowColor: '#0f766e',
            shadowOpacity: 0.35,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 5,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '800', letterSpacing: 0.4 }}>
            Login
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup")}
          style={{
            backgroundColor: isDark ? 'rgba(226,232,240,0.1)' : '#f1f5f9',
            padding: 15,
            borderRadius: 14,
            width: '100%',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(148,163,184,0.28)' : '#cbd5e1',
          }}
        >
          <Text style={{ color: isDark ? '#e2e8f0' : '#0f172a', fontWeight: '800', letterSpacing: 0.4 }}>
            Create account
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}