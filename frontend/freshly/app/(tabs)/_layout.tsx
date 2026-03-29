import { Tabs } from 'expo-router';
import { Home, PlusCircle, User, MessageCircle, FlaskConical } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useColorScheme } from 'nativewind';
import { View, StyleSheet, Pressable, GestureResponderEvent, ColorValue, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const theme = useMemo(
    () => {
      const bg: readonly [ColorValue, ColorValue] = isDark
        ? ['#08131d', '#0f2530']
        : ['#ffffff', '#eef8f4'];

      return {
        active: '#14b8a6',
        activeGlow: isDark ? 'rgba(45,212,191,0.35)' : 'rgba(20,184,166,0.22)',
        activeLight: 'rgba(20,184,166,0.15)',
        inactive: isDark ? '#70859a' : '#8da0b0',
        inactiveText: isDark ? '#9eb3c7' : '#617284',
        bg,
        sceneBg: isDark ? '#06131f' : '#f4f8f6',
        border: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(15,23,42,0.08)',
        pill: isDark ? 'rgba(20,184,166,0.18)' : 'rgba(20,184,166,0.1)',
        pillBorder: isDark ? 'rgba(94,234,212,0.18)' : 'rgba(20,184,166,0.12)',
        fab: isDark ? ['#14b8a6', '#38bdf8'] as const : ['#0f766e', '#14b8a6'] as const,
        shadow: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.15)',
        text: isDark ? '#f1f5f9' : '#0f172a',
      };
    },
    [isDark]
  );

  type TabIconProps = {
    Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
    focused: boolean;
    color: string;
    label: string;
  };

  const TabIcon = ({ Icon, focused, color, label }: TabIconProps) => {
    const animatedPill = useAnimatedStyle(() => ({
      transform: [{ scale: withSpring(focused ? 1 : 0.82, { damping: 13, stiffness: 145 }) }],
      opacity: withTiming(focused ? 1 : 0, { duration: 200 }),
    }));

    const animatedIcon = useAnimatedStyle(() => ({
      transform: [
        { scale: withSpring(focused ? 1.06 : 0.98, { damping: 12, stiffness: 155 }) },
        { translateY: withSpring(focused ? -3 : 0, { damping: 12 }) },
      ],
    }));

    const animatedLabel = useAnimatedStyle(() => ({
      opacity: withTiming(focused ? 1 : 0.9, { duration: 180 }),
      transform: [{ scale: withSpring(focused ? 1 : 0.96, { damping: 14, stiffness: 140 }) }],
    }));

    return (
      <View style={styles.iconWrapper}>
        <Animated.View style={[styles.activePill, { backgroundColor: theme.pill, borderColor: theme.pillBorder }, animatedPill]} />
        <Animated.View style={[styles.iconColumn, animatedIcon]}>
          <Icon size={20} color={color} strokeWidth={focused ? 2.35 : 1.9} />
          <Animated.Text
            style={[
              styles.tabLabel,
              { color: focused ? theme.text : theme.inactiveText, fontWeight: focused ? '800' : '700' },
              animatedLabel,
            ]}
            numberOfLines={1}
          >
            {label}
          </Animated.Text>
        </Animated.View>

        {focused && (
          <Animated.View style={[styles.indicator, { backgroundColor: theme.activeGlow }]}> 
            <View style={[styles.dot, { backgroundColor: theme.active }]} />
          </Animated.View>
        )}
      </View>
    );
  };

  const FabIcon = ({ focused }: { focused: boolean }) => {
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: withSpring(focused ? 1.08 : 1, { damping: 11, stiffness: 145 }) },
        { translateY: withSpring(focused ? -4 : -1, { damping: 12 }) },
      ],
      opacity: withTiming(focused ? 1 : 0.95, { duration: 180 }),
    }));

    const pulseStyle = useAnimatedStyle(() => ({
      opacity: withTiming(focused ? 0.25 : 0, { duration: 300 }),
      transform: [{ scale: withSpring(focused ? 1.15 : 1, { damping: 10 }) }],
    }));

    return (
      <View style={styles.fabWrapper}>
        <Animated.View style={[styles.fabPulse, { backgroundColor: theme.activeGlow }, pulseStyle]} />
        <Animated.View style={[styles.fabOuter, animatedStyle]}>
          <LinearGradient
            colors={theme.fab}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.fab,
              {
                shadowColor: theme.active,
                shadowOpacity: 0.45,
              },
            ]}
          >
            <PlusCircle size={24} color="#ffffff" strokeWidth={2.4} />
          </LinearGradient>
        </Animated.View>
      </View>
    );
  };

  const FabLabel = ({ focused }: { focused: boolean }) => {
    return (
      <View style={styles.fabLabelWrap}>
        <FabIcon focused={focused} />
        <Text style={[styles.tabLabel, { color: focused ? theme.text : theme.inactiveText, fontWeight: focused ? '800' : '700' }]}>Post</Text>
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

          const handlePress = (e: GestureResponderEvent) => {
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
          bottom: 0,
          marginHorizontal: 0,
          height: 78 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          borderRadius: 0,
          backgroundColor: theme.sceneBg,
          borderWidth: 0,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          shadowColor: theme.shadow,
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowOffset: { width: 0, height: -4 },
          shadowRadius: 10,
          elevation: 10,
          overflow: 'visible',
        },
        sceneStyle: {
          backgroundColor: theme.sceneBg,
        },
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 6,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { borderRadius: 0, overflow: 'hidden', borderTopWidth: 1, borderColor: theme.border }]}>
            <LinearGradient
              colors={theme.bg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.topHighlight, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)' }]} />
          </View>
        ),
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Home} focused={focused} color={color} label="Home" />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={MessageCircle} focused={focused} color={color} label="Chats" />,
        }}
      />
      <Tabs.Screen
        name="predict"
        options={{
          title: 'Predict',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={FlaskConical} focused={focused} color={color} label="Predict" />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Create',
          tabBarIcon: ({ focused }) => <FabLabel focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={User} focused={focused} color={color} label="You" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    position: 'relative',
  },
  iconColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    marginTop: 5,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  activePill: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    zIndex: -1,
  },
  indicator: {
    position: 'absolute',
    bottom: 1,
    width: 18,
    height: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1,
  },
  fabOuter: {
    borderRadius: 28,
  },
  fabWrapper: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fabLabelWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPulse: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    zIndex: 0,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    borderRadius: 999,
  },
});
