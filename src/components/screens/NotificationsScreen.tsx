// src/components/screens/NotificationsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Notification } from '@/types';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';

const NOTIF_ICONS: Record<string, { icon: string; color: string }> = {
  new_activity: { icon: 'document-text-outline', color: Colors.primaryLight },
  new_quiz: { icon: 'help-circle-outline', color: '#7B1FA2' },
  new_exam: { icon: 'school-outline', color: Colors.accentRed },
  grade_released: { icon: 'star-outline', color: Colors.accentGold },
  course_announcement: { icon: 'megaphone-outline', color: Colors.primary },
  school_announcement: { icon: 'notifications-outline', color: Colors.accentRed },
  system: { icon: 'information-circle-outline', color: Colors.accentRope },
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get('/notifications/');
      setNotifications(data as Notification[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  const markRead = async (id: string) => {
    await api.post(`/notifications/${id}/mark_read/`);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleNotificationPress = async (item: Notification) => {
    if (!item.is_read) {
      setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, is_read: true } : n));
      api.post(`/notifications/${item.id}/mark_read/`).catch(() => {});
    }

    if (item.course_section_id && item.activity_id) {
      router.push({
        pathname: '/(app)/course/[id]',
        params: {
          id: item.course_section_id,
          title: 'Course',
          tab: 'assignments',
          open_activity_id: item.activity_id,
          r: String(Date.now()),
        },
      });
      return;
    }
    if (item.course_section_id && item.quiz_id) {
      router.push({
        pathname: '/(app)/course/[id]',
        params: {
          id: item.course_section_id,
          title: 'Course',
          tab: 'quizzes',
          open_quiz_id: item.quiz_id,
          r: String(Date.now()),
        },
      });
      return;
    }
    Alert.alert(item.title, item.body || 'No additional details.');
  };

  const markAllRead = async () => {
    await api.post('/notifications/mark_all_read/');
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Notifications</Text>
              {unreadCount > 0 && (
                <Text style={[styles.unread, { color: colors.textSecondary }]}>{unreadCount} unread</Text>
              )}
            </View>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
                <Text style={[styles.markAllText, { color: Colors.primaryLight }]}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No notifications</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              You're all caught up! New notifications will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const config = NOTIF_ICONS[item.type] || NOTIF_ICONS.system;
          return (
            <TouchableOpacity
              style={[
                styles.notifItem,
                { backgroundColor: item.is_read ? colors.surface : colors.surface },
                Shadows.sm,
              ]}
              onPress={() => handleNotificationPress(item)}
              activeOpacity={0.8}
            >
              {!item.is_read && <View style={styles.unreadIndicator} />}
              <View style={[styles.iconBg, { backgroundColor: config.color + '18' }]}>
                <Ionicons name={config.icon as any} size={22} color={config.color} />
              </View>
              <View style={styles.notifContent}>
                <Text style={[styles.notifTitle, { color: colors.textPrimary, fontWeight: item.is_read ? '500' : '700' }]}>
                  {item.title}
                </Text>
                {item.body && (
                  <Text style={[styles.notifBody, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                )}
                <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
                  {timeAgo(item.created_at)}
                </Text>
                <Text style={[styles.openHint, { color: colors.mutedForeground }]}>Tap to open</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.xl, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  title: { fontSize: 26, fontWeight: '800' },
  unread: { fontSize: 13, marginTop: 2 },
  markAllBtn: { paddingVertical: 4 },
  markAllText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.sm },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    position: 'relative',
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, marginBottom: 3 },
  notifBody: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11 },
  openHint: { fontSize: 10, marginTop: 3 },
});
