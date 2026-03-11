// app/(app)/(tabs)/_layout.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/colors';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { api } from '@/lib/api';

export default function TabsLayout() {
  const { colors } = useTheme();
  const [todoPendingCount, setTodoPendingCount] = useState(0);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);

  const refreshBadges = useCallback(async () => {
    try {
      const [todosData, notifData] = await Promise.all([
        api.get('/todos/'),
        api.get('/notifications/'),
      ]);
      const pending = (todosData || []).filter((t: any) => !t.is_done).length;
      const unread = (notifData || []).filter((n: any) => !n.is_read).length;
      setTodoPendingCount(pending);
      setNotifUnreadCount(unread);
    } catch {
      // Ignore badge refresh errors.
    }
  }, []);

  useEffect(() => {
    refreshBadges();
    const timer = setInterval(refreshBadges, 20000);
    return () => clearInterval(timer);
  }, [refreshBadges]);

  const renderIconWithBadge = (name: keyof typeof Ionicons.glyphMap, color: string, size: number, count: number) => (
    <View style={styles.iconWrap}>
      <Ionicons name={name} size={size} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : String(count)}</Text>
        </View>
      )}
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="todo"
        options={{
          title: 'To Do',
          tabBarIcon: ({ color, size }) => (
            renderIconWithBadge('checkmark-circle-outline', color, size, todoPendingCount)
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => (
            renderIconWithBadge('notifications-outline', color, size, notifUnreadCount)
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    minWidth: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
