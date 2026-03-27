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
        ? ['#0f172a', '#1e293b']
        : ['#ffffff', '#f8fafc'];

      return {
        active: '#10b981',
        activeGlow: 'rgba(16,185,129,0.3)',
        activeLight: 'rgba(16,185,129,0.15)',
        inactive: isDark ? '#6b7280' : '#9ca3af',
        inactiveText: isDark ? '#94a3b8' : '#64748b',
        bg,
        border: isDark ? 'rgba(100,116,139,0.2)' : 'rgba(15,23,42,0.08)',
        pill: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
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
      transform: [{ scale: withSpring(focused ? 1 : 0.8, { damping: 13, stiffness: 140 }) }],
      opacity: withTiming(focused ? 1 : 0, { duration: 200 }),
    }));

    const animatedIcon = useAnimatedStyle(() => ({
      transform: [
        { scale: withSpring(focused ? 1.08 : 1, { damping: 12, stiffness: 155 }) },
        { translateY: withSpring(focused ? -1.5 : 0, { damping: 12 }) },
      ],
    }));

    const animatedLabel = useAnimatedStyle(() => ({
      opacity: withTiming(focused ? 1 : 0.9, { duration: 180 }),
      transform: [{ scale: withSpring(focused ? 1 : 0.96, { damping: 14, stiffness: 140 }) }],
    }));

    return (
      <View style={styles.iconWrapper}>
        <Animated.View style={[styles.activePill, { backgroundColor: theme.pill }, animatedPill]} />
        <Animated.View style={[styles.iconColumn, animatedIcon]}>
          <Icon size={20} color={color} strokeWidth={focused ? 2.3 : 1.9} />
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
          <Animated.View style={[styles.indicator, { backgroundColor: theme.active }]}> 
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
          <PlusCircle size={26} color="#ffffff" strokeWidth={2.3} />
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
          marginHorizontal: 18,
          bottom: Math.max(0, insets.bottom),
          height: 74,
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
    width: 58,
    height: 58,
    position: 'relative',
  },
  iconColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  activePill: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 18,
    zIndex: -1,
  },
  indicator: {
    position: 'absolute',
    bottom: 2,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1,
  },
  fabWrapper: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fabLabelWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPulse: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    zIndex: 0,
  },
});