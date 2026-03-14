import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { StatusColors } from '@/constants/colors';

interface AttendanceSummaryFooterProps {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total?: number;
}

export function AttendanceSummaryFooter({ present, absent, late, excused, total }: AttendanceSummaryFooterProps) {
  const totalStudents = total ?? (present + absent + late + excused);
  const unmarked = totalStudents - present - absent - late - excused;

  return (
    <View style={styles.container}>
      <View style={styles.statItem}>
        <View style={[styles.dot, { backgroundColor: StatusColors.present }]} />
        <Text style={styles.label}>Present</Text>
        <Text style={styles.value}>{present}</Text>
      </View>
      <View style={styles.statItem}>
        <View style={[styles.dot, { backgroundColor: '#EF5350' }]} />
        <Text style={styles.label}>Absent</Text>
        <Text style={styles.value}>{absent}</Text>
      </View>
      <View style={styles.statItem}>
        <View style={[styles.dot, { backgroundColor: StatusColors.late }]} />
        <Text style={styles.label}>Late</Text>
        <Text style={styles.value}>{late}</Text>
      </View>
      <View style={styles.statItem}>
        <View style={[styles.dot, { backgroundColor: '#AAAAAA' }]} />
        <Text style={styles.label}>Excused</Text>
        <Text style={styles.value}>{excused}</Text>
      </View>
      {unmarked > 0 && (
        <View style={styles.statItem}>
          <View style={[styles.dot, { backgroundColor: '#E0E0E0' }]} />
          <Text style={styles.label}>Unmarked</Text>
          <Text style={styles.value}>{unmarked}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.primaryDark,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});