// src/components/shared/InlineDatePicker.tsx
//
// An inline calendar date picker with optional time selection.
// Always visible - not a modal.

import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors, Spacing, Radius } from '@/constants/colors';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

// ─── Time Wheel Component ────────────────────────────────────────────────────

interface TimeWheelProps {
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
}

function TimeWheel({ hour, minute, onHourChange, onMinuteChange }: TimeWheelProps) {
  const { colors } = useTheme();
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <View style={twStyles.container}>
      <View style={twStyles.wheelContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={twStyles.scrollContent}
        >
          {hours.map((h) => (
            <TouchableOpacity
              key={h}
              style={[twStyles.pill, hour === h && twStyles.pillActive]}
              onPress={() => onHourChange(h)}
            >
              <Text style={[twStyles.pillText, hour === h && twStyles.pillTextActive]}>
                {String(h).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={[twStyles.separator, { color: colors.textPrimary }]}>:</Text>

      <View style={twStyles.wheelContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={twStyles.scrollContent}
        >
          {minutes.map((m) => (
            <TouchableOpacity
              key={m}
              style={[twStyles.pill, minute === m && twStyles.pillActive]}
              onPress={() => onMinuteChange(m)}
            >
              <Text style={[twStyles.pillText, minute === m && twStyles.pillTextActive]}>
                {String(m).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const twStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  wheelContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: 2,
    borderRadius: Radius.full,
  },
  pillActive: {
    backgroundColor: Colors.primary,
  },
  pillText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  separator: {
    fontSize: 24,
    fontWeight: '700',
    marginHorizontal: Spacing.xs,
  },
});

// ─── Main InlineDatePicker Component ──────────────────────────────────────────

interface InlineDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  hasTime: boolean;
  onToggleTime: (hasTime: boolean) => void;
  minDate?: Date;
}

export function InlineDatePicker({
  value,
  onChange,
  hasTime,
  onToggleTime,
  minDate,
}: InlineDatePickerProps) {
  const { colors } = useTheme();
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDaySelect = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    // Preserve time from current value
    newDate.setHours(value.getHours());
    newDate.setMinutes(value.getMinutes());
    onChange(newDate);
  };

  const handleHourChange = (h: number) => {
    const newDate = new Date(value);
    newDate.setHours(h);
    onChange(newDate);
  };

  const handleMinuteChange = (m: number) => {
    const newDate = new Date(value);
    newDate.setMinutes(m);
    onChange(newDate);
  };

  const isDateDisabled = (day: number): boolean => {
    if (!day) return true;
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);
    if (minDate) {
      const minDateOnly = new Date(minDate);
      minDateOnly.setHours(0, 0, 0, 0);
      if (date < minDateOnly) return true;
    }
    return false;
  };

  return (
    <View style={[iStyles.container, { backgroundColor: colors.surface }]}>
      {/* Month navigation */}
      <View style={iStyles.monthNav}>
        <TouchableOpacity onPress={goToPrevMonth} style={iStyles.navBtn}>
          <Text style={[iStyles.navChevron, { color: colors.textPrimary }]}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={[iStyles.monthYear, { color: colors.textPrimary }]}>
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={iStyles.navBtn}>
          <Text style={[iStyles.navChevron, { color: colors.textPrimary }]}>{'›'}</Text>
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={iStyles.dayHeaders}>
        {DAYS_SHORT.map((day) => (
          <Text key={day} style={[iStyles.dayHeader, { color: colors.textSecondary }]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={iStyles.calendarGrid}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={iStyles.dayCell} />;
          }

          const date = new Date(viewYear, viewMonth, day);
          const isSelected = isSameDay(date, value);
          const isToday = isSameDay(date, today);
          const disabled = isDateDisabled(day);

          return (
            <TouchableOpacity
              key={day}
              style={[
                iStyles.dayCell,
                isSelected && iStyles.dayCellSelected,
              ]}
              onPress={() => !disabled && handleDaySelect(day)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  iStyles.dayText,
                  { color: colors.textPrimary },
                  isToday && !isSelected && { color: Colors.primary, fontWeight: '700' },
                  isSelected && iStyles.dayTextSelected,
                  disabled && { color: colors.muted },
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* All-day / Time toggle */}
      <TouchableOpacity
        style={[iStyles.toggleRow, { borderTopColor: colors.border }]}
        onPress={() => onToggleTime(!hasTime)}
        activeOpacity={0.8}
      >
        <Text style={[iStyles.toggleLabel, { color: colors.textPrimary }]}>
          All Day
        </Text>
        <View style={[iStyles.toggle, { backgroundColor: hasTime ? colors.muted : Colors.primary }]}>
          <View style={[iStyles.thumb, !hasTime && iStyles.thumbOn]} />
        </View>
      </TouchableOpacity>

      {/* Time picker */}
      {hasTime && (
        <View style={[iStyles.timeSection, { borderTopColor: colors.border }]}>
          <TimeWheel
            hour={value.getHours()}
            minute={value.getMinutes()}
            onHourChange={handleHourChange}
            onMinuteChange={handleMinuteChange}
          />
        </View>
      )}
    </View>
  );
}

const iStyles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  navBtn: {
    padding: Spacing.sm,
  },
  navChevron: {
    fontSize: 24,
    fontWeight: '600',
  },
  monthYear: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '400',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    padding: 2,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
  thumbOn: {
    alignSelf: 'flex-start',
  },
  timeSection: {
    borderTopWidth: 1,
  },
});