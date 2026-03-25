// app/(app)/settings/index.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';

const SETTINGS_ITEMS = [
  { icon: 'notifications-outline', label: 'Notifications', route: '/settings/notifications' },
  { icon: 'person-outline', label: 'Account', route: '/settings/account' },
  { icon: 'shield-checkmark-outline', label: 'Privacy & Security', route: '/settings/security' },
] as const;

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>

        <View style={styles.section}>
          {SETTINGS_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.item, { backgroundColor: colors.surface }, Shadows.sm]}
              onPress={() => router.push(`/(app)${item.route}` as any)}
              accessibilityLabel={item.label}
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <View style={[styles.iconBg, { backgroundColor: Colors.primaryLight + '20' }]}>
                <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
              </View>
              <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
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
  section: { gap: Spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
});