import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { AttendanceStatus } from '@/types';
import { StatusIndicator } from './StatusIndicator';

interface StudentAttendanceCardProps {
  student: {
    student_id: string;
    student_name: string;
    avatar_url?: string | null;
  };
  status: AttendanceStatus | 'unmarked';
  onStatusPress: () => void;
  onMorePress: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function StudentAttendanceCard({ student, status, onStatusPress, onMorePress }: StudentAttendanceCardProps) {
  const initials = getInitials(student.student_name);
  const nameParts = student.student_name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        {student.avatar_url ? (
          <Image source={{ uri: student.avatar_url }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarInitials}>{initials}</Text>
        )}
      </View>
      <View style={styles.nameContainer}>
        <Text style={styles.firstName}>{firstName}</Text>
        {lastName && <Text style={styles.lastName}> {lastName}</Text>}
      </View>
      <View style={styles.actions}>
        <StatusIndicator status={status} size={32} onPress={onStatusPress} />
        <TouchableOpacity style={styles.moreBtn} onPress={onMorePress}>
          <Text style={styles.moreText}>MORE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  nameContainer: {
    flex: 1,
    marginLeft: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  firstName: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1F2937',
  },
  lastName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  moreText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
});