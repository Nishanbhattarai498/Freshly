import { Tabs } from 'expo-router';
import { Home, PlusCircle, User, MessageCircle, FlaskConical } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useColorScheme } from 'nativewind';
import { View, StyleSheet, Pressable, GestureResponderEvent, ColorValue, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
        activeSoft: isDark ? 'rgba(20,184,166,0.18)' : 'rgba(20,184,166,0.1)',
        activeLight: 'rgba(20,184,166,0.12)',
        inactive: isDark ? '#70859a' : '#8da0b0',
        inactiveText: isDark ? '#9eb3c7' : '#617284',
        bg,
        sceneBg: isDark ? '#06131f' : '#f4f8f6',
        border: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(15,23,42,0.08)',
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
    return (
      <View style={[styles.iconWrapper, focused && { backgroundColor: theme.activeSoft }]}>
        <View style={styles.iconColumn}>
          <Icon size={20} color={color} strokeWidth={focused ? 2.2 : 1.9} />
          <Text
            style={[
              styles.tabLabel,
              { color: focused ? theme.text : theme.inactiveText, fontWeight: focused ? '800' : '600' },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
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
                  transform: [{ scale: pressed ? 0.97 : 1 }],
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
          height: 72 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          borderRadius: 0,
          backgroundColor: theme.sceneBg,
          borderWidth: 0,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          shadowColor: theme.shadow,
          shadowOpacity: isDark ? 0.18 : 0.06,
          shadowOffset: { width: 0, height: -3 },
          shadowRadius: 8,
          elevation: 6,
          overflow: 'visible',
        },
        sceneStyle: {
          backgroundColor: theme.sceneBg,
        },
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 4,
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
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={PlusCircle} focused={focused} color={color} label="Post" />,
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
    width: 56,
    height: 52,
    position: 'relative',
    borderRadius: 16,
  },
  iconColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 10,
    letterSpacing: 0.2,
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
