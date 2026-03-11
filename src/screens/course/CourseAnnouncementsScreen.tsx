// src/screens/course/CourseAnnouncementsScreen.tsx
// Announcements tab for course screen

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCourse, CourseTab } from '@/contexts/CourseContext';
import { Announcement } from '@/types';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';
import { formatDate } from './utils';

interface Props {
  activeTab: CourseTab;
  onEdit: (item: Announcement) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
}

export function CourseAnnouncementsScreen({ activeTab, onEdit, onDelete, canManage }: Props) {
  const { colors } = useTheme();
  const { announcements, loading, refreshing, refresh } = useCourse();

  if (activeTab !== 'announcements') return null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      {announcements.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📢</Text>
          <Text style={styles.emptyTitle}>No announcements yet</Text>
        </View>
      ) : (
        announcements.map((ann) => (
          <AnnouncementCard
            key={ann.id}
            announcement={ann}
            canManage={canManage}
            onEdit={() => onEdit(ann)}
            onDelete={() => onDelete(ann.id)}
          />
        ))
      )}
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

interface AnnouncementCardProps {
  announcement: Announcement;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function AnnouncementCard({ announcement: ann, canManage, onEdit, onDelete }: AnnouncementCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.annCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.annHeader}>
        <Ionicons name="megaphone-outline" size={18} color={Colors.primary} />
        <Text style={[styles.annTitle, { color: colors.textPrimary }]}>{ann.title}</Text>
        {canManage && (
          <View style={styles.itemActions}>
            <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
              <Ionicons name="create-outline" size={16} color={Colors.primaryLight} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={16} color={Colors.accentRed} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      <Text style={[styles.annBody, { color: colors.textSecondary }]} numberOfLines={4}>
        {ann.body}
      </Text>
      <Text style={[styles.annDate, { color: colors.textTertiary }]}>
        {formatDate(ann.created_at)}
        {ann.school_wide && ' • School-wide'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  tabContent: { padding: Spacing.xl, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, color: '#5A6A85', fontWeight: '500' },
  annCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    ...Shadows.sm,
  },
  annHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  annTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  annBody: { fontSize: 14, lineHeight: 20, marginBottom: Spacing.sm },
  annDate: { fontSize: 11 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { padding: 4 },
});