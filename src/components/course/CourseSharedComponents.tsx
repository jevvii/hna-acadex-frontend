// src/components/course/CourseSharedComponents.tsx
// Shared UI components for course screens

import React from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/colors';

// Field component for form inputs
export function Field({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

// Toggle row for boolean settings
export function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={onToggle}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.toggleText}>{value ? 'Yes' : 'No'}</Text>
    </TouchableOpacity>
  );
}

// Empty state placeholder
export function EmptyState({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
    </View>
  );
}

// Item actions (edit/delete buttons)
export function ItemActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={styles.itemActions}>
      <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
        <Ionicons name="create-outline" size={18} color={Colors.primaryLight} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
        <Ionicons name="trash-outline" size={18} color={Colors.accentRed} />
      </TouchableOpacity>
    </View>
  );
}

// Loading spinner
export function LoadingSpinner() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

// Status badge
export function StatusBadge({
  published,
  onPress,
}: {
  published: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.statusBadge,
        published ? styles.statusBadgePublished : styles.statusBadgeDraft,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.statusBadgeText, published ? styles.statusBadgeTextPublished : styles.statusBadgeTextDraft]}>
        {published ? 'Published' : 'Draft'}
      </Text>
    </TouchableOpacity>
  );
}

// Topic/Week badge
export function TopicBadge({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.topicChip, active && styles.topicChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.topicChipText, active && styles.topicChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Primary action button
export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryActionBtn, disabled && styles.primaryActionBtnDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={styles.primaryActionBtnText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

// Inline button
export function InlineButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.inlineBtn, disabled && styles.inlineBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.inlineBtnText}>{title}</Text>
    </TouchableOpacity>
  );
}

// Card container
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// Section label
export function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  fieldInputMulti: { minHeight: 80, textAlignVertical: 'top' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  toggleText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, color: '#5A6A85', fontWeight: '500' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { padding: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  statusBadgePublished: { backgroundColor: '#ECFDF3', borderColor: '#BBF7D0' },
  statusBadgeDraft: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadgeTextPublished: { color: '#166534' },
  statusBadgeTextDraft: { color: '#6B7280' },
  topicChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  topicChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  topicChipText: { fontSize: 12, color: '#374151' },
  topicChipTextActive: { color: Colors.primary, fontWeight: '600' },
  primaryActionBtn: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryActionBtnDisabled: { opacity: 0.55 },
  primaryActionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  inlineBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  inlineBtnDisabled: { opacity: 0.55 },
  inlineBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  sectionLabel: { color: '#6B6B6B', fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 4 },
});