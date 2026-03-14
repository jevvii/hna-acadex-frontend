// src/components/shared/DatePickerModal.tsx
//
// A Material Design-style centered date picker modal with calendar grid.
// Year is clickable to show year picker.

import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
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

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  minDate?: Date;
  maxDate?: Date;
  title?: string;
}

export function DatePickerModal({
  visible,
  value,
  onChange,
  onClose,
  minDate,
  maxDate,
  title,
}: DatePickerModalProps) {
  const { colors } = useTheme();
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(value);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const yearScrollViewRef = useRef<ScrollView>(null);

  // Generate years based on minDate and maxDate constraints
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    // Start from current year (or minDate year if earlier)
    let startYear = currentYear;
    if (minDate) {
      startYear = Math.min(startYear, minDate.getFullYear());
    }

    // End at current year + 10 (or maxDate year if earlier)
    let endYear = currentYear + 10;
    if (maxDate) {
      endYear = Math.min(endYear, maxDate.getFullYear());
    }

    // Ensure endYear is not before startYear
    if (endYear < startYear) {
      endYear = startYear;
    }

    return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  }, [currentYear, minDate, maxDate]);

  // Update view when value changes externally
  React.useEffect(() => {
    if (visible) {
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
      setSelectedDate(value);
      setShowYearPicker(false);
    }
  }, [visible, value]);

  // Scroll to current year when year picker opens
  React.useEffect(() => {
    if (showYearPicker && yearScrollViewRef.current) {
      const index = years.indexOf(viewYear);
      if (index >= 0) {
        setTimeout(() => {
          yearScrollViewRef.current?.scrollTo({ y: index * 44, animated: false });
        }, 100);
      }
    }
  }, [showYearPicker, viewYear, years]);

  const today = useMemo(() => new Date(), []);
  today.setHours(0, 0, 0, 0);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const calendarDays: (number | null)[] = [];
  // Add empty slots for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  // Add the days of the month
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
    setSelectedDate(newDate);
  };

  const handleYearSelect = (year: number) => {
    setViewYear(year);
    setShowYearPicker(false);
    // Adjust selected date if it's now invalid (e.g., Feb 29 on non-leap year)
    const maxDay = getDaysInMonth(year, viewMonth);
    const newDay = Math.min(selectedDate.getDate(), maxDay);
    setSelectedDate(new Date(year, viewMonth, newDay));
  };

  const handleConfirm = () => {
    onChange(selectedDate);
    // Note: We don't call onClose here because the parent (DateTimePickerModal)
    // handles the modal transition through onChange callback.
    // onClose is only for cancel actions.
  };

  const isDateDisabled = (day: number): boolean => {
    if (!day) return true;
    const date = new Date(viewYear, viewMonth, day);
    // Normalize dates to start of day for comparison
    const dateOnly = new Date(viewYear, viewMonth, day);
    dateOnly.setHours(0, 0, 0, 0);

    if (minDate) {
      const minDateOnly = new Date(minDate);
      minDateOnly.setHours(0, 0, 0, 0);
      if (dateOnly < minDateOnly) return true;
    }
    if (maxDate) {
      const maxDateOnly = new Date(maxDate);
      maxDateOnly.setHours(0, 0, 0, 0);
      if (dateOnly > maxDateOnly) return true;
    }
    return false;
  };

  const formatSelectedDate = (date: Date): string => {
    const dayName = DAYS_SHORT[date.getDay()];
    const monthShort = MONTHS[date.getMonth()].slice(0, 3);
    return `${dayName}, ${monthShort} ${date.getDate()}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.modal, { backgroundColor: '#FFFFFF' }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.yearButton}
              onPress={() => setShowYearPicker(!showYearPicker)}
            >
              <Text style={[styles.yearText, showYearPicker && styles.yearTextSelected]}>
                {viewYear}
              </Text>
              <View style={[styles.yearUnderline, showYearPicker && styles.yearUnderlineSelected]} />
            </TouchableOpacity>
            <Text style={styles.dateText}>{formatSelectedDate(selectedDate)}</Text>
          </View>

          {showYearPicker ? (
            /* Year Picker */
            <View style={styles.yearPickerContainer}>
              <ScrollView
                ref={yearScrollViewRef}
                style={styles.yearScrollView}
                showsVerticalScrollIndicator={true}
              >
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearItem,
                      year === viewYear && styles.yearItemSelected,
                    ]}
                    onPress={() => handleYearSelect(year)}
                  >
                    <Text
                      style={[
                        styles.yearItemText,
                        year === viewYear && styles.yearItemTextSelected,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            /* Calendar */
            <View style={styles.calendarContainer}>
              {/* Month navigation */}
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
                  <Text style={styles.navChevron}>{'‹'}</Text>
                </TouchableOpacity>
                <Text style={styles.monthYearText}>
                  {MONTHS[viewMonth]} {viewYear}
                </Text>
                <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                  <Text style={styles.navChevron}>{'›'}</Text>
                </TouchableOpacity>
              </View>

              {/* Day headers */}
              <View style={styles.dayHeaders}>
                {DAYS_SHORT.map((day) => (
                  <Text key={day} style={styles.dayHeader}>{day}</Text>
                ))}
              </View>

              {/* Calendar grid */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <View key={`empty-${index}`} style={styles.dayCell} />;
                  }

                  const date = new Date(viewYear, viewMonth, day);
                  const isSelected = isSameDay(date, selectedDate);
                  const isToday = isSameDay(date, today);
                  const disabled = isDateDisabled(day);

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                      ]}
                      onPress={() => !disabled && handleDaySelect(day)}
                      disabled={disabled}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isToday && !isSelected && styles.dayTextToday,
                          isSelected && styles.dayTextSelected,
                          disabled && styles.dayTextDisabled,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.footerButton}>
              <Text style={styles.footerButtonText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={styles.footerButton}>
              <Text style={styles.footerButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    borderRadius: 4,
    overflow: 'hidden',
    width: 320,
    maxWidth: '90%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  header: {
    backgroundColor: '#1A3A6B',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  yearButton: {
    alignSelf: 'flex-start',
  },
  yearText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  yearTextSelected: {
    color: '#FFFFFF',
  },
  yearUnderline: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  yearUnderlineSelected: {
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '500',
    marginTop: 4,
  },
  yearPickerContainer: {
    height: 280,
    backgroundColor: '#FFFFFF',
  },
  yearScrollView: {
    flex: 1,
  },
  yearItem: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
  },
  yearItemSelected: {
    backgroundColor: '#1A3A6B',
  },
  yearItemText: {
    fontSize: 16,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  yearItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  calendarContainer: {
    padding: Spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  navButton: {
    padding: Spacing.sm,
  },
  navChevron: {
    fontSize: 24,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(0, 0, 0, 0.6)',
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellSelected: {
    borderRadius: 999,
    backgroundColor: '#1A3A6B',
  },
  dayText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  dayTextToday: {
    color: '#1A3A6B',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: 'rgba(0, 0, 0, 0.3)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  footerButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  footerButtonText: {
    color: '#2E5FA3',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
});