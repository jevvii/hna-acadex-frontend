// src/components/screens/CalendarScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { CalendarEvent, EventType, TodoItem } from '@/types';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';
import { DateTimePicker } from '@/components/shared/DateTimePicker';

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const EVENT_COLORS: Record<string, string> = {
  deadline:     Colors.accentRed,
  exam:         '#7B1FA2',
  personal:     Colors.accentGold,
  holiday:      '#2E7D32',
  school_event: Colors.primaryLight,
};

const EVENT_TYPES: { type: EventType; label: string }[] = [
  { type: 'personal',     label: 'Personal'     },
  { type: 'deadline',     label: 'Deadline'      },
  { type: 'exam',         label: 'Exam / Test'   },
  { type: 'holiday',      label: 'Holiday'       },
  { type: 'school_event', label: 'School Event'  },
];

// ─── Add Event Modal ───────────────────────────────────────────────────────

interface AddEventModalProps {
  visible: boolean;
  initialDate: Date;
  onClose: () => void;
  onSaved: () => void;
}

function AddEventModal({ visible, initialDate, onClose, onSaved }: AddEventModalProps) {
  const { colors } = useTheme();

  const [title,     setTitle]     = useState('');
  const [eventType, setEventType] = useState<EventType>('personal');
  const [eventDate, setEventDate] = useState(initialDate);
  const [hasTime,   setHasTime]   = useState(false);
  const [saving,    setSaving]    = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setEventType('personal');
    setEventDate(initialDate);
    setHasTime(false);
  }, [visible, initialDate]);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter an event title.'); return; }
    setSaving(true);
    try {
      const startAt = hasTime
        ? eventDate.toISOString()
        : new Date(
            eventDate.getFullYear(),
            eventDate.getMonth(),
            eventDate.getDate(),
          ).toISOString();

      await api.post('/calendar-events/', {
        title:       title.trim(),
        event_type:  eventType,
        start_at:    startAt,
        end_at:      startAt,
        all_day:     !hasTime,
        is_personal: true,
        color:       EVENT_COLORS[eventType],
      });
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save event.');
    } finally {
      setSaving(false);
    }
  };

  const selectedColor = EVENT_COLORS[eventType];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[mStyles.root, { backgroundColor: colors.background }]}>

          {/* Header */}
          <View style={[mStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Text style={[mStyles.cancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[mStyles.titleText, { color: colors.textPrimary }]}>New Event</Text>
            <TouchableOpacity onPress={handleSave} style={[mStyles.saveBtn, { backgroundColor: selectedColor }]} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={mStyles.saveBtnText}>Add</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={mStyles.content} keyboardShouldPersistTaps="handled">

            {/* Title input */}
            <View style={[mStyles.card, { backgroundColor: colors.surface }]}>
              <View style={[mStyles.titleRow, { borderBottomColor: colors.border }]}>
                <View style={[mStyles.colorDot, { backgroundColor: selectedColor }]} />
                <TextInputNative
                  style={[mStyles.titleInput, { color: colors.textPrimary }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Event title"
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                />
              </View>

              {/* Event type chips */}
              <View style={mStyles.typeRow}>
                {EVENT_TYPES.map((et) => {
                  const active = eventType === et.type;
                  const color  = EVENT_COLORS[et.type];
                  return (
                    <TouchableOpacity
                      key={et.type}
                      style={[mStyles.typeChip, { borderColor: color }, active && { backgroundColor: color }]}
                      onPress={() => setEventType(et.type)}
                    >
                      <Text style={[mStyles.typeLabel, { color: active ? '#FFFFFF' : color }]}>{et.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date & time picker */}
            <Text style={[mStyles.sectionLabel, { color: colors.textSecondary }]}>DATE & TIME</Text>

            <DateTimePicker
              value={eventDate}
              hasTime={hasTime}
              onToggleTime={setHasTime}
              onChange={setEventDate}
            />

            {/* Summary */}
            <View style={[mStyles.summaryRow, { backgroundColor: colors.surface }]}>
              <Ionicons name="calendar-outline" size={16} color={selectedColor} />
              <Text style={[mStyles.summaryText, { color: colors.textSecondary }]}>
                {eventDate.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' })}
                {hasTime && (
                  ' · ' + eventDate.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
                )}
              </Text>
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// need a local import since we're not using JSX for TextInput above
import { TextInput as TextInputNative } from 'react-native';

const mStyles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.lg, borderBottomWidth: 1,
  },
  cancel: { fontSize: 16 },
  titleText: { fontSize: 17, fontWeight: '700' },
  saveBtn: { paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: Radius.full, minWidth: 60, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  content: { padding: Spacing.xl },
  card: { borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1 },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  titleInput: { flex: 1, fontSize: 18, fontWeight: '600', paddingVertical: 2 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1.5 },
  typeLabel: { fontSize: 12, fontWeight: '600' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: Spacing.sm, marginLeft: 4 },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.lg, padding: Spacing.md, marginTop: 2,
  },
  summaryText: { fontSize: 14 },
});

// ─── Main CalendarScreen ───────────────────────────────────────────────────

export function CalendarScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [today]   = useState(new Date());
  const [current,  setCurrent]  = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [events,   setEvents]   = useState<CalendarEvent[]>([]);
  const [todoIndicators, setTodoIndicators] = useState({
    undatedCount: 0,
    pendingDatedCount: 0,
    allDone: false,
    hasAcademicItems: false,
  });
  const [loading,  setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchEvents = useCallback(async () => {
    const start = new Date(current.getFullYear(), current.getMonth(), 1).toISOString();
    const end   = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59).toISOString();
    try {
      const [calendarData, todosData] = await Promise.all([
        api.get(`/calendar-events/?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
        user?.role === 'student' ? api.get('/todos/') : Promise.resolve([]),
      ]);
      setEvents(calendarData as CalendarEvent[]);
      if (user?.role === 'student') {
        const todos = (todosData as TodoItem[]) || [];
        const academic = todos.filter((t) => !!t.activity_id || !!t.quiz_id);
        const undated = academic.filter((t) => !t.due_at && !t.is_done).length;
        const pendingDated = academic.filter((t) => !!t.due_at && !t.is_done).length;
        const allDone = academic.length > 0 && academic.every((t) => t.is_done);
        setTodoIndicators({
          undatedCount: undated,
          pendingDatedCount: pendingDated,
          allDone,
          hasAcademicItems: academic.length > 0,
        });
      } else {
        setTodoIndicators({
          undatedCount: 0,
          pendingDatedCount: 0,
          allDone: false,
          hasAcademicItems: false,
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not fetch calendar events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [current, user?.role]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  const onRefresh = () => { setRefreshing(true); fetchEvents(); };

  const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
  const firstDay    = new Date(current.getFullYear(), current.getMonth(), 1).getDay();

  const hasEvent = (day: number) =>
    events.some((e) => {
      const d = new Date(e.start_at);
      return d.getDate() === day && d.getMonth() === current.getMonth() && d.getFullYear() === current.getFullYear();
    });

  const selectedEvents = events.filter((e) => {
    const d = new Date(e.start_at);
    return (
      d.getDate()    === selected.getDate()    &&
      d.getMonth()   === selected.getMonth()   &&
      d.getFullYear()=== selected.getFullYear()
    );
  });

  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === current.getMonth() && today.getFullYear() === current.getFullYear();

  const isSelected = (day: number) =>
    selected.getDate() === day && selected.getMonth() === current.getMonth() && selected.getFullYear() === current.getFullYear();

  const cells: Array<number | null> = [
    ...(Array.from({ length: firstDay }, () => null) as Array<number | null>),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const deleteEvent = (eventId: string) => {
    Alert.alert('Delete Event', 'Remove this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/calendar-events/${eventId}/`);
            fetchEvents();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not delete event.');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Month navigator */}
        <View style={[styles.monthNav, { backgroundColor: colors.surface }, Shadows.sm]}>
          <TouchableOpacity onPress={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1))} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
            {MONTHS[current.getMonth()]} {current.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1))} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Calendar grid */}
        {user?.role === 'student' && (
          <View style={[styles.indicatorsCard, { backgroundColor: colors.surface }, Shadows.sm]}>
            {todoIndicators.undatedCount > 0 && (
              <View style={[styles.indicatorBadge, styles.indicatorUndated]}>
                <Ionicons name="remove-circle-outline" size={13} color="#1F2937" />
                <Text style={styles.indicatorUndatedText}>
                  {todoIndicators.undatedCount} item{todoIndicators.undatedCount !== 1 ? 's' : ''} without deadline
                </Text>
              </View>
            )}
            {todoIndicators.allDone && (
              <View style={[styles.indicatorBadge, styles.indicatorDone]}>
                <Ionicons name="checkmark-circle-outline" size={13} color="#166534" />
                <Text style={styles.indicatorDoneText}>All activities and quizzes are done</Text>
              </View>
            )}
            {!todoIndicators.hasAcademicItems && (
              <View style={[styles.indicatorBadge, styles.indicatorMuted]}>
                <Ionicons name="calendar-clear-outline" size={13} color="#475569" />
                <Text style={styles.indicatorMutedText}>No academic tasks yet</Text>
              </View>
            )}
            {!todoIndicators.allDone && todoIndicators.undatedCount === 0 && todoIndicators.pendingDatedCount === 0 && todoIndicators.hasAcademicItems && (
              <View style={[styles.indicatorBadge, styles.indicatorMuted]}>
                <Ionicons name="checkmark-done-outline" size={13} color="#475569" />
                <Text style={styles.indicatorMutedText}>No pending dated tasks</Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.calCard, { backgroundColor: colors.surface }, Shadows.sm]}>
          <View style={styles.dayHeaders}>
            {DAYS.map((d) => (
              <Text key={d} style={[styles.dayHeader, { color: colors.textSecondary }]}>{d}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((day, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.cell,
                  day !== null && isSelected(day) && { backgroundColor: Colors.primary },
                  day !== null && isToday(day) && !isSelected(day) && styles.todayCell,
                ]}
                disabled={!day}
                onPress={() => day && setSelected(new Date(current.getFullYear(), current.getMonth(), day))}
                activeOpacity={0.7}
              >
                {day ? (
                  <>
                    <Text style={[
                      styles.dayNumber,
                      { color: isSelected(day) ? '#FFFFFF' : colors.textPrimary },
                      isToday(day) && !isSelected(day) && { color: Colors.primary, fontWeight: '700' },
                    ]}>
                      {day}
                    </Text>
                    {hasEvent(day) && (
                      <View style={[styles.eventDot, { backgroundColor: isSelected(day) ? '#FFFFFF' : Colors.accentRed }]} />
                    )}
                  </>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected day events */}
        <Text style={[styles.dayLabel, { color: colors.textPrimary }]}>
          {selected.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
        </Text>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
        ) : selectedEvents.length === 0 ? (
          <View style={[styles.noEventsCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.noEventsIcon}>📅</Text>
            <Text style={[styles.noEventsText, { color: colors.textSecondary }]}>
              No events. Tap + to add one.
            </Text>
          </View>
        ) : (
          selectedEvents.map((event) => {
            const color = event.color || EVENT_COLORS[event.event_type] || Colors.primary;
            return (
              <View key={event.id} style={[styles.eventItem, { backgroundColor: colors.surface }, Shadows.sm]}>
                <View style={[styles.eventBar, { backgroundColor: color }]} />
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>{event.title}</Text>
                  <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                    {event.all_day ? 'All Day' : new Date(event.start_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}
                  </Text>
                </View>
                <View style={styles.eventActions}>
                  <View style={[styles.typeBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.typeText, { color }]}>{event.event_type.replace('_',' ')}</Text>
                  </View>
                  {event.is_personal && (
                    <TouchableOpacity onPress={() => deleteEvent(event.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={15} color={Colors.accentRed} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <AddEventModal
        visible={modalVisible}
        initialDate={selected}
        onClose={() => setModalVisible(false)}
        onSaved={fetchEvents}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xl, paddingBottom: 120 },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md,
  },
  navBtn: { padding: Spacing.sm },
  monthTitle: { fontSize: 18, fontWeight: '700' },
  indicatorsCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  indicatorBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  indicatorUndated: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  indicatorDone: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  indicatorMuted: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  indicatorUndatedText: { color: '#1F2937', fontSize: 11, fontWeight: '700' },
  indicatorDoneText: { color: '#166534', fontSize: 11, fontWeight: '700' },
  indicatorMutedText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  calCard: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.xl },
  dayHeaders: { flexDirection: 'row', marginBottom: Spacing.sm },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`, aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center', borderRadius: 999,
  },
  todayCell: { borderWidth: 2, borderColor: Colors.primary },
  dayNumber: { fontSize: 14, fontWeight: '500' },
  eventDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  dayLabel: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.md },
  noEventsCard: {
    borderRadius: Radius.lg, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm,
  },
  noEventsIcon: { fontSize: 32 },
  noEventsText: { fontSize: 13, textAlign: 'center' },
  eventItem: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, marginBottom: Spacing.sm, overflow: 'hidden',
  },
  eventBar: { width: 5, alignSelf: 'stretch' },
  eventInfo: { flex: 1, padding: Spacing.md },
  eventTitle: { fontSize: 14, fontWeight: '600' },
  eventTime: { fontSize: 12, marginTop: 2 },
  eventActions: { padding: Spacing.md, alignItems: 'flex-end', gap: Spacing.sm },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  typeText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  deleteBtn: { padding: 2 },
  fab: {
    position: 'absolute', bottom: 100, right: Spacing.xl,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.card,
  },
});
