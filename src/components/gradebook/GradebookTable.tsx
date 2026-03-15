import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/colors';
import { GradebookStudent, GradebookItem, GradebookSummary } from '@/types';
import { api } from '@/lib/api';

interface GradebookTableProps {
  students: GradebookStudent[];
  inactiveStudents: GradebookStudent[];
  items: {
    activities: GradebookItem[];
    quizzes: GradebookItem[];
  };
  summary: {
    activities: GradebookSummary[];
    quizzes: GradebookSummary[];
  };
  loading?: boolean;
  onRefresh?: () => void;
  sectionId: string;
}

type SortOption = 'name-asc' | 'name-desc' | 'grade-high' | 'grade-low' | 'missing';
type FilterOption = 'all' | 'needs-grading' | 'missing' | 'late';

const CELL_WIDTH = 80;
const NAME_COLUMN_WIDTH = 160;
const GRADE_COLUMN_WIDTH = 70;

export function GradebookTable({
  students,
  inactiveStudents,
  items,
  summary,
  loading,
  onRefresh,
  sectionId,
}: GradebookTableProps) {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    enrollmentId: string;
    itemId: string;
    itemType: 'activity' | 'quiz';
    currentScore?: number;
    maxScore: number;
    studentName: string;
    itemTitle: string;
  } | null>(null);
  const [editScore, setEditScore] = useState('');
  const [editFeedback, setEditFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const allColumns = useMemo(() => {
    const columns: { id: string; type: 'activity' | 'quiz'; title: string; maxPoints: number }[] = [];
    items.activities.forEach((a) => {
      columns.push({ id: a.id, type: 'activity', title: a.title, maxPoints: a.max_points });
    });
    items.quizzes.forEach((q) => {
      columns.push({ id: q.id, type: 'quiz', title: q.title, maxPoints: q.max_points });
    });
    return columns;
  }, [items]);

  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.student_name.toLowerCase().includes(query) ||
          s.student_email.toLowerCase().includes(query)
      );
    }

    // Apply filter
    if (filterBy === 'needs-grading') {
      result = result.filter((s) =>
        s.grades.activities.some((a) => a.status === 'submitted') ||
        s.grades.quizzes.some((q) => q.pending_grading)
      );
    } else if (filterBy === 'missing') {
      result = result.filter((s) =>
        s.grades.activities.some((a) => a.status === 'not_submitted' && !a.is_na) ||
        s.grades.quizzes.some((q) => q.attempts === 0 && !q.is_na)
      );
    } else if (filterBy === 'late') {
      result = result.filter((s) =>
        s.grades.activities.some((a) => a.is_late) ||
        s.grades.quizzes.some((q) => q.is_late)
      );
    }

    // Apply sort
    if (sortBy === 'name-asc') {
      result.sort((a, b) => a.student_name.localeCompare(b.student_name));
    } else if (sortBy === 'name-desc') {
      result.sort((a, b) => b.student_name.localeCompare(a.student_name));
    } else if (sortBy === 'grade-high') {
      result.sort((a, b) => (b.final_grade ?? -1) - (a.final_grade ?? -1));
    } else if (sortBy === 'grade-low') {
      result.sort((a, b) => (a.final_grade ?? 999) - (b.final_grade ?? 999));
    } else if (sortBy === 'missing') {
      result.sort((a, b) => {
        const aMissing = a.grades.activities.filter((g) => g.status === 'not_submitted').length +
          a.grades.quizzes.filter((g) => g.attempts === 0).length;
        const bMissing = b.grades.activities.filter((g) => g.status === 'not_submitted').length +
          b.grades.quizzes.filter((g) => g.attempts === 0).length;
        return bMissing - aMissing;
      });
    }

    return result;
  }, [students, searchQuery, sortBy, filterBy]);

  const getCellContent = useCallback(
    (student: GradebookStudent, columnId: string, columnType: 'activity' | 'quiz') => {
      if (columnType === 'activity') {
        const grade = student.grades.activities.find((g) => g.activity_id === columnId);
        if (!grade) return { display: '—', color: '#9CA3AF', status: 'not_submitted' };
        if (grade.is_na) return { display: 'N/A', color: '#9CA3AF', status: 'na' };
        if (grade.status === 'not_submitted') return { display: '—', color: '#EF4444', status: 'missing' };
        if (grade.status === 'submitted') return { display: 'Needs Grading', color: '#F59E0B', status: 'needs_grading' };
        if (grade.score !== undefined && grade.score !== null) {
          return {
            display: `${grade.score.toFixed(1)}/${grade.points}`,
            color: grade.is_late ? '#F59E0B' : '#10B981',
            status: 'graded',
            isLate: grade.is_late,
          };
        }
        return { display: '—', color: '#9CA3AF', status: 'unknown' };
      } else {
        const grade = student.grades.quizzes.find((g) => g.quiz_id === columnId);
        if (!grade) return { display: '—', color: '#9CA3AF', status: 'not_submitted' };
        if (grade.is_na) return { display: 'N/A', color: '#9CA3AF', status: 'na' };
        if (grade.pending_grading) return { display: 'Needs Grading', color: '#F59E0B', status: 'needs_grading' };
        if (grade.attempts === 0) return { display: '—', color: '#EF4444', status: 'missing' };
        if (grade.score !== undefined && grade.score !== null) {
          return {
            display: `${grade.score.toFixed(1)}/${grade.max_score}`,
            color: grade.is_late ? '#F59E0B' : '#10B981',
            status: 'graded',
            isLate: grade.is_late,
          };
        }
        return { display: '—', color: '#9CA3AF', status: 'unknown' };
      }
    },
    []
  );

  const getSummaryForColumn = useCallback(
    (columnId: string, columnType: 'activity' | 'quiz') => {
      if (columnType === 'activity') {
        return summary.activities.find((s) => s.activity_id === columnId);
      } else {
        return summary.quizzes.find((s) => s.quiz_id === columnId);
      }
    },
    [summary]
  );

  const handleCellPress = useCallback(
    (student: GradebookStudent, columnId: string, columnType: 'activity' | 'quiz', maxPoints: number) => {
      let currentScore: number | undefined;
      if (columnType === 'activity') {
        const grade = student.grades.activities.find((g) => g.activity_id === columnId);
        currentScore = grade?.score;
      } else {
        const grade = student.grades.quizzes.find((g) => g.quiz_id === columnId);
        currentScore = grade?.score;
      }
      const column = allColumns.find((c) => c.id === columnId);
      setEditingCell({
        enrollmentId: student.enrollment_id,
        itemId: columnId,
        itemType: columnType,
        currentScore,
        maxScore: maxPoints,
        studentName: student.student_name,
        itemTitle: column?.title || '',
      });
      setEditScore(currentScore !== undefined ? String(currentScore) : '');
      setEditFeedback('');
    },
    [allColumns]
  );

  const saveGrade = async () => {
    if (!editingCell) return;
    setSaving(true);
    try {
      const score = editScore.trim() === '' ? null : parseFloat(editScore);
      if (score !== null && isNaN(score)) {
        Alert.alert('Invalid Score', 'Please enter a valid number.');
        setSaving(false);
        return;
      }
      if (editingCell.itemType === 'activity') {
        // Find submission ID first - we need to get it from the gradebook or make a separate call
        // For now, we'll need to implement this properly
        // This would require additional backend support
        await api.patch(`/activity-submissions/${editingCell.itemId}/grade/`, {
          score,
          feedback: editFeedback.trim() || null,
        });
      }
      // Quizzes would need different handling
      Alert.alert('Success', 'Grade updated successfully.');
      setEditingCell(null);
      onRefresh?.();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update grade.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading gradebook...</Text>
      </View>
    );
  }

  const totalWidth = NAME_COLUMN_WIDTH + GRADE_COLUMN_WIDTH + allColumns.length * CELL_WIDTH;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Controls */}
      <View style={styles.controlsContainer}>
        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search students..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort Dropdown */}
        <View style={styles.dropdownRow}>
          <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.dropdownLabel, { color: colors.textSecondary }]}>Sort:</Text>
            {(['name-asc', 'name-desc', 'grade-high', 'grade-low', 'missing'] as SortOption[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.dropdownOption, sortBy === opt && styles.dropdownOptionActive]}
                onPress={() => setSortBy(opt)}
              >
                <Text style={[styles.dropdownText, { color: sortBy === opt ? Colors.primary : colors.textSecondary }]}>
                  {opt === 'name-asc' ? 'A-Z' : opt === 'name-desc' ? 'Z-A' : opt === 'grade-high' ? 'High-Low' : opt === 'grade-low' ? 'Low-High' : 'Missing'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Filter Dropdown */}
        <View style={styles.dropdownRow}>
          <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.dropdownLabel, { color: colors.textSecondary }]}>Filter:</Text>
            {(['all', 'needs-grading', 'missing', 'late'] as FilterOption[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.dropdownOption, filterBy === opt && styles.dropdownOptionActive]}
                onPress={() => setFilterBy(opt)}
              >
                <Text style={[styles.dropdownText, { color: filterBy === opt ? Colors.primary : colors.textSecondary }]}>
                  {opt === 'all' ? 'All' : opt === 'needs-grading' ? 'Needs Grading' : opt === 'missing' ? 'Missing' : 'Late'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Show Inactive Toggle */}
        {inactiveStudents.length > 0 && (
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: showInactive ? Colors.primary : colors.surface, borderColor: colors.border }]}
            onPress={() => setShowInactive(!showInactive)}
          >
            <Ionicons name={showInactive ? 'eye' : 'eye-off'} size={14} color={showInactive ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.toggleText, { color: showInactive ? '#FFFFFF' : colors.textSecondary }]}>
              {inactiveStudents.length} Inactive
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Table */}
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={{ minWidth: totalWidth }}>
          {/* Header */}
          <View style={[styles.headerRow, { backgroundColor: colors.surface }]}>
            <View style={[styles.nameCell, styles.headerCell, { width: NAME_COLUMN_WIDTH }]}>
              <Text style={[styles.headerText, { color: colors.textPrimary }]}>Student</Text>
            </View>
            <View style={[styles.gradeCell, styles.headerCell, { width: GRADE_COLUMN_WIDTH }]}>
              <Text style={[styles.headerText, { color: colors.textPrimary }]}>Grade</Text>
            </View>
            {allColumns.map((col) => {
              const itemSummary = getSummaryForColumn(col.id, col.type);
              return (
                <View key={col.id} style={[styles.dataCell, styles.headerCell, { width: CELL_WIDTH }]}>
                  <View style={styles.columnHeaderTop}>
                    <Ionicons
                      name={col.type === 'activity' ? 'document-text' : 'help-circle'}
                      size={12}
                      color={colors.textSecondary}
                    />
                    <Text style={[styles.columnHeaderTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                      {col.title}
                    </Text>
                  </View>
                  <Text style={[styles.columnHeaderPoints, { color: colors.textSecondary }]}>
                    {col.maxPoints} pts
                  </Text>
                  {itemSummary && (itemSummary.needs_grading_count > 0 || itemSummary.missing_count > 0) && (
                    <View style={styles.columnBadge}>
                      {itemSummary.needs_grading_count > 0 && (
                        <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                          <Text style={styles.badgeTextYellow}>{itemSummary.needs_grading_count}</Text>
                        </View>
                      )}
                      {itemSummary.missing_count > 0 && (
                        <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                          <Text style={styles.badgeTextRed}>{itemSummary.missing_count}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Data Rows */}
          <ScrollView showsVerticalScrollIndicator={true}>
            {filteredAndSortedStudents.map((student) => (
              <View key={student.enrollment_id} style={[styles.dataRow, { backgroundColor: colors.background }]}>
                <View style={[styles.nameCell, { width: NAME_COLUMN_WIDTH, backgroundColor: colors.surface }]}>
                  <Text style={[styles.studentName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {student.student_name}
                  </Text>
                  <Text style={[styles.studentEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                    {student.student_email}
                  </Text>
                </View>
                <View style={[styles.gradeCell, { width: GRADE_COLUMN_WIDTH }]}>
                  <Text style={[styles.gradeText, { color: colors.textPrimary }]}>
                    {student.final_grade?.toFixed(1) ?? '—'}
                  </Text>
                  {student.final_grade_letter && (
                    <Text style={[styles.gradeLetter, { color: colors.textSecondary }]}>
                      {student.final_grade_letter}
                    </Text>
                  )}
                  {student.grade_overridden && (
                    <View style={styles.overrideBadge}>
                      <Text style={styles.overrideText}>Override</Text>
                    </View>
                  )}
                </View>
                {allColumns.map((col) => {
                  const cellContent = getCellContent(student, col.id, col.type);
                  return (
                    <TouchableOpacity
                      key={col.id}
                      style={[styles.dataCell, { width: CELL_WIDTH }]}
                      onPress={() => handleCellPress(student, col.id, col.type, col.maxPoints)}
                    >
                      <Text style={[styles.cellText, { color: cellContent.color }]} numberOfLines={1}>
                        {cellContent.display}
                      </Text>
                      {cellContent.isLate && (
                        <View style={styles.lateBadge}>
                          <Text style={styles.lateText}>L</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Inactive Students */}
            {showInactive && inactiveStudents.length > 0 && (
              <>
                <View style={[styles.inactiveHeader, { backgroundColor: colors.border }]}>
                  <Text style={[styles.inactiveHeaderText, { color: colors.textSecondary }]}>
                    Inactive Students ({inactiveStudents.length})
                  </Text>
                </View>
                {inactiveStudents.map((student) => (
                  <View key={student.enrollment_id} style={[styles.dataRow, { backgroundColor: '#F9FAFB', opacity: 0.7 }]}>
                    <View style={[styles.nameCell, { width: NAME_COLUMN_WIDTH, backgroundColor: '#F3F4F6' }]}>
                      <Text style={[styles.studentName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {student.student_name}
                      </Text>
                      <Text style={[styles.studentEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                        {student.student_email}
                      </Text>
                    </View>
                    <View style={[styles.gradeCell, { width: GRADE_COLUMN_WIDTH }]}>
                      <Text style={[styles.gradeText, { color: colors.textPrimary }]}>
                        {student.final_grade?.toFixed(1) ?? '—'}
                      </Text>
                    </View>
                    {allColumns.map((col) => {
                      const cellContent = getCellContent(student, col.id, col.type);
                      return (
                        <View key={col.id} style={[styles.dataCell, { width: CELL_WIDTH }]}>
                          <Text style={[styles.cellText, { color: cellContent.color }]} numberOfLines={1}>
                            {cellContent.display}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </>
            )}

            {/* Summary Row */}
            <View style={[styles.summaryRow, { backgroundColor: colors.surface }]}>
              <View style={[styles.nameCell, { width: NAME_COLUMN_WIDTH }]}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Class Average</Text>
              </View>
              <View style={[styles.gradeCell, { width: GRADE_COLUMN_WIDTH }]}>
                {/* Could add overall average here */}
              </View>
              {allColumns.map((col) => {
                const itemSummary = getSummaryForColumn(col.id, col.type);
                return (
                  <View key={col.id} style={[styles.dataCell, { width: CELL_WIDTH }]}>
                    {itemSummary?.avg_score !== undefined && itemSummary.avg_score !== null && (
                      <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
                        {itemSummary.avg_score.toFixed(1)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Edit Grade Modal */}
      <Modal visible={!!editingCell} transparent animationType="fade" onRequestClose={() => setEditingCell(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Grade</Text>
              <TouchableOpacity onPress={() => setEditingCell(null)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {editingCell && (
              <View style={styles.modalBody}>
                <Text style={[styles.modalStudentName, { color: colors.textPrimary }]}>
                  {editingCell.studentName}
                </Text>
                <Text style={[styles.modalItemTitle, { color: colors.textSecondary }]}>
                  {editingCell.itemTitle}
                </Text>
                <Text style={[styles.modalMaxScore, { color: colors.textSecondary }]}>
                  Max: {editingCell.maxScore} points
                </Text>
                <View style={styles.modalInput}>
                  <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>Score:</Text>
                  <TextInput
                    style={[styles.modalInputField, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                    value={editScore}
                    onChangeText={setEditScore}
                    keyboardType="decimal-pad"
                    placeholder={`0 - ${editingCell.maxScore}`}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.modalInput}>
                  <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>Feedback:</Text>
                  <TextInput
                    style={[styles.modalInputFieldMultiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                    value={editFeedback}
                    onChangeText={setEditFeedback}
                    multiline
                    numberOfLines={3}
                    placeholder="Optional feedback..."
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            )}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditingCell(null)}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, saving && { opacity: 0.7 }]}
                onPress={saveGrade}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  controlsContainer: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  dropdownOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(26, 58, 107, 0.1)',
  },
  dropdownText: {
    fontSize: 12,
    fontWeight: '500',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerCell: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  nameCell: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  gradeCell: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataCell: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  columnHeaderTitle: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  columnHeaderPoints: {
    fontSize: 10,
    marginTop: 2,
  },
  columnBadge: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeTextYellow: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
  },
  badgeTextRed: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B91C1C',
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 48,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '600',
  },
  studentEmail: {
    fontSize: 11,
    marginTop: 2,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  gradeLetter: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  overrideBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 4,
  },
  overrideText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4338CA',
  },
  cellText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  lateBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  lateText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B91C1C',
  },
  inactiveHeader: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  inactiveHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#CBD5E1',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.lg,
    ...Shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  modalStudentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalItemTitle: {
    fontSize: 14,
  },
  modalMaxScore: {
    fontSize: 12,
    marginTop: 4,
  },
  modalInput: {
    marginTop: Spacing.sm,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  modalInputField: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  modalInputFieldMultiline: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  modalCancelBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GradebookTable;