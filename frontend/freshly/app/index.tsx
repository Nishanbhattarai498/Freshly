import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { ArrowRight, Leaf, ShieldCheck, Sparkles } from 'lucide-react-native';

export default function Home() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.replace('/(tabs)/home');
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <LinearGradient
      colors={isDark ? ['#07141d', '#0d2225', '#11342e'] : ['#f3fff9', '#daf7eb', '#ddf2ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, justifyContent: 'center', padding: 24 }}
    >
      <View
        style={{
          borderRadius: 32,
          padding: 26,
          backgroundColor: isDark ? 'rgba(8,20,29,0.82)' : 'rgba(255,255,255,0.88)',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)',
          shadowColor: '#08111d',
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 14 },
          elevation: 9,
        }}
      >
        <View
          style={{
            width: 78,
            height: 78,
            borderRadius: 26,
            backgroundColor: isDark ? 'rgba(45,212,191,0.14)' : '#dffaf0',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
          }}
        >
          <Leaf size={34} color={isDark ? '#5eead4' : '#0f766e'} />
        </View>

        <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 2.5, color: isDark ? '#99f6e4' : '#0f766e' }}>
          FRESHLY
        </Text>
        <Text style={{ fontSize: 36, fontWeight: '900', marginTop: 10, color: isDark ? '#f8fafc' : '#0f172a', lineHeight: 42 }}>
          Rescue good food with a cleaner, smarter flow.
        </Text>
        <Text style={{ marginTop: 14, color: isDark ? '#b6c4d3' : '#516072', fontSize: 16, lineHeight: 24 }}>
          Share nearby surplus, chat instantly, and make the whole experience feel premium instead of patched together.
        </Text>

        <View style={{ marginTop: 22, gap: 12 }}>
          {[
            { icon: Sparkles, title: 'Modern feed', subtitle: 'Visual cards that highlight freshness and pickup timing' },
            { icon: ShieldCheck, title: 'Fast messaging', subtitle: 'Cleaner conversation flow with calmer loading states' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <View
                key={item.title}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 22,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f6fbfa',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(148,163,184,0.12)' : '#e2ece8',
                }}
              >
                <View style={{ width: 42, height: 42, borderRadius: 16, backgroundColor: isDark ? 'rgba(20,184,166,0.14)' : '#d9f8ee', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Icon size={18} color={isDark ? '#5eead4' : '#0f766e'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: isDark ? '#f8fafc' : '#0f172a', fontWeight: '800' }}>{item.title}</Text>
                  <Text style={{ color: isDark ? '#8da0b5' : '#66788b', marginTop: 2 }}>{item.subtitle}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          style={{
            marginTop: 24,
            backgroundColor: '#0f766e',
            minHeight: 58,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
          }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16, marginRight: 10 }}>Enter Freshly</Text>
          <ArrowRight size={18} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/signup')}
          style={{
            marginTop: 12,
            minHeight: 56,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(148,163,184,0.18)' : '#d8e4e2',
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.62)',
          }}
        >
          <Text style={{ color: isDark ? '#f8fafc' : '#0f172a', fontWeight: '800', fontSize: 16 }}>Create account</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}
