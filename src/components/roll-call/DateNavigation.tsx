import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface DateNavigationProps {
  date: Date;
  onPrev?: () => void;
  onNext?: () => void;
  onCalendar?: () => void;
}

function formatDateHeader(date: Date): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate().toString().padStart(2, '0');
  return `${dayName} ${monthName} ${dayNum}`;
}

export function DateNavigation({ date, onPrev, onNext, onCalendar }: DateNavigationProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPrev} style={styles.navBtn}>
        <Ionicons name="chevron-back" size={20} color={Colors.primary} />
      </TouchableOpacity>
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{formatDateHeader(date)}</Text>
      </View>
      <TouchableOpacity onPress={onNext} style={styles.navBtn}>
        <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onCalendar} style={styles.navBtn}>
        <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  navBtn: {
    padding: 8,
  },
  dateContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});