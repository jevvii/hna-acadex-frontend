// src/screens/course/CourseSyllabusScreen.tsx
// Syllabus view/edit tab for course screen

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCourse, CourseTab } from '@/contexts/CourseContext';
import { api } from '@/lib/api';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';

interface Syllabus {
  id?: string;
  content: string;
  updated_at?: string;
  updated_by?: string;
}

interface Props {
  activeTab: CourseTab;
}

export function CourseSyllabusScreen({ activeTab }: Props) {
  const { colors } = useTheme();
  const { courseId, canManage } = useCourse();
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSyllabus = useCallback(async () => {
    if (!courseId) return;
    try {
      const data = await api.get(`/course-sections/${courseId}/syllabus/`);
      setSyllabus(data || null);
    } catch (error) {
      // Syllabus may not exist yet
      setSyllabus(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (activeTab === 'syllabus') {
      fetchSyllabus();
    }
  }, [activeTab, fetchSyllabus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSyllabus();
  };

  const handleEdit = () => {
    setEditContent(syllabus?.content || '');
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditContent('');
  };

  const handleSave = async () => {
    if (!courseId) return;
    setSaving(true);
    try {
      const data = await api.put(`/course-sections/${courseId}/syllabus/`, {
        content: editContent,
      });
      setSyllabus(data);
      setEditing(false);
      setEditContent('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save syllabus');
    } finally {
      setSaving(false);
    }
  };

  if (activeTab !== 'syllabus') return null;

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header with actions */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Course Syllabus</Text>
        </View>
        {canManage && !editing && (
          <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {editing ? (
        // Edit mode
        <View style={[styles.editCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.editLabel, { color: colors.textPrimary }]}>Syllabus Content</Text>
          <Text style={[styles.editHint, { color: colors.textTertiary }]}>
            Use line breaks to separate sections. Supports basic formatting.
          </Text>
          <TextInput
            style={[styles.contentInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            value={editContent}
            onChangeText={setEditContent}
            multiline
            placeholder="Enter course syllabus, objectives, grading policy, etc..."
            placeholderTextColor={colors.textTertiary}
          />
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Syllabus</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // View mode
        <View style={[styles.viewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {syllabus?.content ? (
            <>
              <Text style={[styles.content, { color: colors.textPrimary }]}>
                {syllabus.content}
              </Text>
              {syllabus.updated_at && (
                <Text style={[styles.updatedAt, { color: colors.textTertiary }]}>
                  Last updated: {new Date(syllabus.updated_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </Text>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>
                No syllabus added yet
              </Text>
              {canManage && (
                <TouchableOpacity style={styles.addBtn} onPress={handleEdit}>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Add Syllabus</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  tabContent: { padding: Spacing.xl, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  editBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  editCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  editLabel: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  editHint: { fontSize: 12, marginBottom: Spacing.md },
  contentInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 300,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    minWidth: 120,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  viewCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  content: { fontSize: 14, lineHeight: 24 },
  updatedAt: { fontSize: 11, marginTop: Spacing.md },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, marginTop: 12, fontWeight: '500' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});