// app/(app)/settings/notifications.tsx
import React, { useState } from 'react';
import { View, Text, Switch, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';

interface NotificationSetting {
  key: string;
  label: string;
  description?: string;
  enabled: boolean;
}

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();

  const [settings, setSettings] = useState<NotificationSetting[]>([
    { key: 'push', label: 'Push Notifications', description: 'Receive push notifications', enabled: true },
    { key: 'email', label: 'Email Notifications', description: 'Receive email notifications', enabled: true },
  ]);

  const [notificationTypes, setNotificationTypes] = useState<NotificationSetting[]>([
    { key: 'assignments', label: 'Assignment Reminders', enabled: true },
    { key: 'quizzes', label: 'Quiz Reminders', enabled: true },
    { key: 'grades', label: 'Grade Notifications', enabled: true },
  ]);

  const toggleSetting = (key: string, isTypes: boolean) => {
    const updater = isTypes ? setNotificationTypes : setSettings;
    updater((prev) => prev.map((s) => s.key === key ? { ...s, enabled: !s.enabled } : s));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Notification Preferences</Text>

        {/* Main notification toggles */}
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.sm]}>
          {settings.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.settingRow,
                index < settings.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                {item.description && (
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>{item.description}</Text>
                )}
              </View>
              <Switch
                value={item.enabled}
                onValueChange={() => toggleSetting(item.key, false)}
                trackColor={{ false: colors.muted, true: Colors.primaryLight }}
                thumbColor={item.enabled ? Colors.primary : '#f4f3f4'}
                accessibilityLabel={item.label}
              />
            </View>
          ))}
        </View>

        {/* Notification types */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notification Types</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.sm]}>
          {notificationTypes.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.settingRow,
                index < notificationTypes.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              <Switch
                value={item.enabled}
                onValueChange={() => toggleSetting(item.key, true)}
                trackColor={{ false: colors.muted, true: Colors.primaryLight }}
                thumbColor={item.enabled ? Colors.primary : '#f4f3f4'}
                accessibilityLabel={item.label}
              />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xl },
  title: { fontSize: 26, fontWeight: '800', marginBottom: Spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: Spacing.sm, marginTop: Spacing.lg },
  card: { borderRadius: Radius.lg, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  settingInfo: { flex: 1, marginRight: Spacing.md },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  settingDesc: { fontSize: 12, marginTop: 2 },
});