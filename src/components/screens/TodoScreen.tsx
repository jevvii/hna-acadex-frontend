// src/components/screens/TodoScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { TodoItem } from '@/types';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';
import { DateTimePicker } from '@/components/shared/DateTimePicker';

type Filter = 'all' | 'pending' | 'done';

function formatDue(dateStr?: string): { label: string; isOverdue: boolean } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return {
    label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    isOverdue: d < new Date(),
  };
}

// ─── Add Todo Modal ────────────────────────────────────────────────────────

interface AddTodoModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function AddTodoModal({ visible, onClose, onSaved }: AddTodoModalProps) {
  const { colors } = useTheme();
  const [title,    setTitle]    = useState('');
  const [notes,    setNotes]    = useState('');
  const [hasDue,   setHasDue]   = useState(false);
  const [dueDate,  setDueDate]  = useState(new Date());
  const [hasTime,  setHasTime]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(''); setNotes('');
    setHasDue(false);
    // Default due = tomorrow 23:59
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    setDueDate(tomorrow);
    setHasTime(true);
  }, [visible]);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a task title.'); return; }
    setSaving(true);
    try {
      let due_at: string | null = null;
      if (hasDue) {
        due_at = hasTime
          ? dueDate.toISOString()
          : new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), 23, 59, 0).toISOString();
      }

      await api.post('/todos/', {
        title:       title.trim(),
        description: notes.trim() || null,
        due_at,
        is_done:     false,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[tStyles.root, { backgroundColor: colors.background }]}>

          {/* Header */}
          <View style={[tStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Text style={[tStyles.cancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[tStyles.titleText, { color: colors.textPrimary }]}>New Task</Text>
            <TouchableOpacity onPress={handleSave} style={tStyles.saveBtn} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={tStyles.saveBtnText}>Add</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tStyles.content} keyboardShouldPersistTaps="handled">

            {/* Title + notes */}
            <View style={[tStyles.card, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[tStyles.titleInput, { color: colors.textPrimary, borderBottomColor: colors.border }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Task title"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="next"
                autoFocus
              />
              <TextInput
                style={[tStyles.notesInput, { color: colors.textPrimary }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes (optional)"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Due date section */}
            <TouchableOpacity
              style={[tStyles.dueToggleCard, { backgroundColor: colors.surface }]}
              onPress={() => setHasDue(!hasDue)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color={hasDue ? Colors.primary : colors.textSecondary} />
              <Text style={[tStyles.dueToggleLabel, { color: colors.textPrimary }]}>Due Date</Text>
              <View style={[tStyles.toggle, { backgroundColor: hasDue ? Colors.primary : colors.muted }]}>
                <View style={[tStyles.thumb, hasDue && tStyles.thumbOn]} />
              </View>
            </TouchableOpacity>

            {hasDue && (
              <>
                <Text style={[tStyles.sectionLabel, { color: colors.textSecondary }]}>PICK DUE DATE</Text>
                <DateTimePicker
                  value={dueDate}
                  hasTime={hasTime}
                  onToggleTime={setHasTime}
                  onChange={setDueDate}
                />

                {/* Summary */}
                <View style={[tStyles.summaryRow, { backgroundColor: colors.surface }]}>
                  <Ionicons name="time-outline" size={15} color={Colors.primary} />
                  <Text style={[tStyles.summaryText, { color: colors.textSecondary }]}>
                    Due {dueDate.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' })}
                    {hasTime && (
                      ' at ' + dueDate.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
                    )}
                  </Text>
                </View>
              </>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main TodoScreen ───────────────────────────────────────────────────────

export function TodoScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [todos,        setTodos]        = useState<TodoItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [filter,       setFilter]       = useState<Filter>('all');
  const [modalVisible, setModalVisible] = useState(false);

  const fetchTodos = useCallback(async () => {
    try {
      const data = await api.get('/todos/');
      setTodos(data as TodoItem[]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not fetch tasks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);
  const onRefresh = () => { setRefreshing(true); fetchTodos(); };

  const toggleDone = async (item: TodoItem) => {
    try {
      await api.patch(`/todos/${item.id}/`, {
        is_done: !item.is_done,
        completed_at: !item.is_done ? new Date().toISOString() : null,
      });
      fetchTodos();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update task.');
    }
  };

  const deleteTodo = (id: string) => {
    Alert.alert('Delete Task', 'Remove this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/todos/${id}/`);
            fetchTodos();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not delete task.');
          }
        },
      },
    ]);
  };

  const openAcademicTodo = (item: TodoItem) => {
    if (!item.course_section_id) return;
    if (item.activity_id) {
      router.push({
        pathname: '/(app)/course/[id]',
        params: {
          id: item.course_section_id,
          title: 'Course',
          tab: 'assignments',
          open_activity_id: item.activity_id,
        },
      });
      return;
    }
    if (item.quiz_id) {
      router.push({
        pathname: '/(app)/course/[id]',
        params: {
          id: item.course_section_id,
          title: 'Course',
          tab: 'quizzes',
          open_quiz_id: item.quiz_id,
        },
      });
    }
  };

  const filtered = todos.filter((t) => {
    if (filter === 'pending') return !t.is_done;
    if (filter === 'done')    return  t.is_done;
    return true;
  });

  const pending = todos.filter((t) => !t.is_done).length;

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
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>To Do</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {pending} task{pending !== 1 ? 's' : ''} remaining
              </Text>
            </View>
            <View style={styles.filters}>
              {(['all','pending','done'] as Filter[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, filter === f && { backgroundColor: Colors.primary }]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.chipText, { color: filter === f ? '#FFFFFF' : colors.textSecondary }]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {filter === 'done' ? 'No completed tasks' : 'All caught up!'}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              {filter === 'all' || filter === 'pending' ? 'Tap + to add a task.' : 'Complete a task to see it here.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const due      = formatDue(item.due_at);
          const overdue  = due?.isOverdue && !item.is_done;
          const isLinkedAcademicItem = !!item.activity_id || !!item.quiz_id;
          const isMissing = Boolean(overdue && isLinkedAcademicItem);
          const canOpenLinked = Boolean(isLinkedAcademicItem && !isMissing && !item.is_done);
          return (
            <TouchableOpacity
              activeOpacity={canOpenLinked ? 0.85 : 1}
              disabled={!canOpenLinked}
              onPress={() => openAcademicTodo(item)}
              style={[
              styles.row,
              isMissing && styles.rowMissing,
              { backgroundColor: colors.surface, opacity: item.is_done ? 0.55 : 1 },
              Shadows.sm,
            ]}
            >
              <View style={styles.rowContent}>
                <Text style={[
                  styles.rowTitle,
                  { color: isMissing ? Colors.accentRed : colors.textPrimary, textDecorationLine: item.is_done ? 'line-through' : 'none' },
                ]}>
                  {item.title}
                </Text>
                {item.description ? (
                  <Text style={[styles.rowNotes, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
                {due && (
                  <View style={styles.dueRow}>
                    <Ionicons
                      name={overdue ? 'warning-outline' : 'time-outline'}
                      size={11}
                      color={overdue ? Colors.accentRed : colors.textSecondary}
                    />
                    <Text style={[styles.dueText, { color: overdue ? Colors.accentRed : colors.textSecondary }]}>
                      {overdue ? 'Overdue · ' : ''}{due.label}
                    </Text>
                  </View>
                )}
                {(item.activity_id || item.quiz_id) && (
                  <View style={styles.courseTag}>
                    <Ionicons name={item.quiz_id ? 'help-circle-outline' : 'book-outline'} size={11} color={isMissing ? Colors.accentRed : Colors.primaryLight} />
                    <Text style={[styles.courseTagText, { color: isMissing ? Colors.accentRed : Colors.primaryLight }]}>
                      {item.quiz_id ? 'Course Quiz' : 'Course Activity'}
                    </Text>
                    {isMissing && <Text style={[styles.courseTagText, { color: Colors.accentRed, marginLeft: 6 }]}>Missing</Text>}
                    {canOpenLinked && <Text style={[styles.courseTagText, { marginLeft: 6, color: colors.textSecondary }]}>Tap to open</Text>}
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={() => deleteTodo(item.id)} style={styles.deleteBtn} disabled={isMissing}>
                <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <AddTodoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={fetchTodos}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.xl, paddingBottom: 120 },
  header: { marginBottom: Spacing.lg },
  title:    { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  filters: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  chip: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, backgroundColor: 'rgba(26,58,107,0.08)',
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody:  { fontSize: 14 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, gap: Spacing.md,
  },
  rowMissing: {
    borderWidth: 1,
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  rowContent: { flex: 1 },
  rowTitle:   { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  rowNotes:   { fontSize: 12, marginTop: 2 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  dueText: { fontSize: 11 },
  courseTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  courseTagText: { fontSize: 11, fontWeight: '500' },
  deleteBtn: { padding: 4 },
  fab: {
    position: 'absolute', bottom: 100, right: Spacing.xl,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.card,
  },
});

const tStyles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.lg, borderBottomWidth: 1,
  },
  cancel:    { fontSize: 16 },
  titleText: { fontSize: 17, fontWeight: '700' },
  saveBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg,
    paddingVertical: 8, borderRadius: Radius.full, minWidth: 60, alignItems: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  content: { padding: Spacing.xl },
  card: { borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  titleInput: {
    fontSize: 17, fontWeight: '600', paddingBottom: Spacing.md, borderBottomWidth: 1,
  },
  notesInput: {
    fontSize: 14, marginTop: Spacing.md, minHeight: 48, textAlignVertical: 'top',
  },
  dueToggleCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
  },
  dueToggleLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  toggle: { width: 46, height: 26, borderRadius: 13, justifyContent: 'center', padding: 2 },
  thumb:  { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignSelf: 'flex-end' },
  thumbOn: { alignSelf: 'flex-start' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: Spacing.sm, marginLeft: 4 },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.lg, padding: Spacing.md, marginTop: 2,
  },
  summaryText: { fontSize: 13 },
});
