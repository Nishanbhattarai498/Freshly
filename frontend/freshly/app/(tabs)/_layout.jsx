import { Tabs } from 'expo-router';
import { Home, PlusCircle, User, MessageCircle } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useColorScheme } from 'nativewind';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const theme = useMemo(
    () => ({
      active: '#10b981',
      activeGlow: 'rgba(16,185,129,0.3)',
      activeLight: 'rgba(16,185,129,0.15)',
      inactive: isDark ? '#6b7280' : '#9ca3af',
      bg: isDark ? ['#0f172a', '#1e293b'] : ['#ffffff', '#f8fafc'],
      border: isDark ? 'rgba(100,116,139,0.2)' : 'rgba(15,23,42,0.08)',
      pill: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
      shadow: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.15)',
      text: isDark ? '#f1f5f9' : '#0f172a',
    }),
    [isDark]
  );

  const TabIcon = ({ Icon, focused, color }) => {
    const animatedPill = useAnimatedStyle(() => ({
      transform: [{ scale: withSpring(focused ? 1 : 0.8, { damping: 13, stiffness: 140 }) }],
      opacity: withTiming(focused ? 1 : 0, { duration: 200 }),
    }));

    const animatedIcon = useAnimatedStyle(() => ({
      transform: [
        { scale: withSpring(focused ? 1.12 : 1, { damping: 12, stiffness: 155 }) },
        { translateY: withSpring(focused ? -2 : 0, { damping: 12 }) },
      ],
    }));

    return (
      <View style={styles.iconWrapper}>
        <Animated.View style={[styles.activePill, { backgroundColor: theme.pill }, animatedPill]} />
        <Animated.View style={animatedIcon}>
          <Icon size={22} color={color} strokeWidth={focused ? 2.3 : 1.9} />
        </Animated.View>

        {focused && (
          <Animated.View style={[styles.indicator, { backgroundColor: theme.active }]}> 
            <View style={[styles.dot, { backgroundColor: theme.active }]} />
          </Animated.View>
        )}
      </View>
    );
  };

  const FabIcon = ({ focused }) => {
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: withSpring(focused ? 1.08 : 1, { damping: 11, stiffness: 145 }) },
        { translateY: withSpring(focused ? -4 : 0, { damping: 12 }) },
      ],
      opacity: withTiming(focused ? 1 : 0.9, { duration: 180 }),
    }));

    const pulseStyle = useAnimatedStyle(() => ({
      opacity: withTiming(focused ? 0.25 : 0, { duration: 300 }),
      transform: [{ scale: withSpring(focused ? 1.15 : 1, { damping: 10 }) }],
    }));

    return (
      <View style={styles.fabWrapper}>
        <Animated.View style={[styles.fabPulse, { backgroundColor: theme.active }, pulseStyle]} />
        <Animated.View
          style={[
            styles.fab,
            {
              backgroundColor: theme.active,
              shadowColor: theme.active,
              shadowOpacity: 0.5,
            },
            animatedStyle,
          ]}
        >
          <PlusCircle size={28} color="#ffffff" strokeWidth={2.3} />
        </Animated.View>
      </View>
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.active,
        tabBarInactiveTintColor: theme.inactive,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarButton: (props) => {
          const { children, onPress, accessibilityState } = props;
          const focused = accessibilityState?.selected ?? false;

          const handlePress = (e) => {
            if (focused) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
            } else {
              Haptics.selectionAsync().catch(() => undefined);
            }
            onPress?.(e);
          };

          return (
            <Pressable
              onPress={handlePress}
              style={({ pressed }) => ([
                {
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ])}
              android_ripple={{
                color: theme.activeLight,
                borderless: true,
                radius: 56,
              }}
            >
              {children}
            </Pressable>
          );
        },
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          marginHorizontal: 18,
          bottom: Math.max(0, insets.bottom),
          height: 62,
          borderRadius: 22,
          backgroundColor: 'transparent',
          borderWidth: 0,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          shadowColor: theme.shadow,
          shadowOpacity: isDark ? 0.45 : 0.18,
          shadowOffset: { width: 0, height: 14 },
          shadowRadius: 18,
          elevation: 16,
          overflow: 'visible',
        },
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { borderRadius: 22, overflow: 'hidden' }]}>
            <LinearGradient
              colors={theme.bg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ),
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Home} focused={focused} color={color} />, 
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={MessageCircle} focused={focused} color={color} />, 
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Create',
          tabBarIcon: ({ focused }) => <FabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={User} focused={focused} color={color} />, 
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    zIndex: -1,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dot: {
    width: '100%',
    height: '100%',
    borderRadius: 2.5,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1,
  },
  fabWrapper: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fabPulse: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    zIndex: 0,
  },
});