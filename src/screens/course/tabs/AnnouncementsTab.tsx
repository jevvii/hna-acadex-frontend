import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';
import { Announcement } from '@/types';

interface AnnouncementsTabProps {
  announcements: Announcement[];
  canManage: boolean;
  onEdit: (announcement: Announcement) => void;
  onDelete: (id: string) => void;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ItemActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={styles.itemActions}>
      <TouchableOpacity onPress={onEdit} accessibilityLabel="Edit" accessibilityRole="button">
        <Text style={styles.actionBtn}>
          <Ionicons name="create-outline" size={18} color={Colors.primaryLight} />
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} accessibilityLabel="Delete" accessibilityRole="button">
        <Text style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={18} color={Colors.accentRed} />
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
    </View>
  );
}

export function AnnouncementsTab({
  announcements,
  canManage,
  onEdit,
  onDelete,
}: AnnouncementsTabProps) {
  const { colors } = useTheme();

  if (announcements.length === 0) {
    return <EmptyState icon="📢" title="No announcements yet" />;
  }

  return (
    <>
      {announcements.map((ann) => (
        <View
          key={ann.id}
          style={[styles.annCard, { backgroundColor: colors.surface }, Shadows.sm]}
        >
          <View style={styles.annHeader}>
            <Ionicons name="megaphone-outline" size={18} color={Colors.primary} />
            <Text style={[styles.annTitle, { color: colors.textPrimary }]}>{ann.title}</Text>
            {canManage && <ItemActions onEdit={() => onEdit(ann)} onDelete={() => onDelete(ann.id)} />}
          </View>
          <Text style={[styles.annBody, { color: colors.textSecondary }]}>{ann.body}</Text>
          <Text style={[styles.annDate, { color: colors.mutedForeground }]}>
            {formatDate(ann.created_at)}
          </Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  annCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
  annHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  annTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  annBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  annDate: {
    fontSize: 11,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 6,
    borderRadius: Radius.sm,
    backgroundColor: '#F3F4F6',
  },
});