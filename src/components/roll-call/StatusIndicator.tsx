import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusColors } from '@/constants/colors';
import { AttendanceStatus } from '@/types';

interface StatusIndicatorProps {
  status: AttendanceStatus | 'unmarked';
  size?: number;
  onPress?: () => void;
}

const STATUS_CONFIG: Record<AttendanceStatus | 'unmarked', { bg: string; border: string; icon: keyof typeof Ionicons.glyphMap | null }> = {
  Present: { bg: StatusColors.present, border: StatusColors.presentBorder, icon: 'checkmark' },
  Absent: { bg: StatusColors.absent, border: StatusColors.absentBorder, icon: 'close' },
  Late: { bg: StatusColors.late, border: StatusColors.lateBorder, icon: 'time' },
  Excused: { bg: '#FFFFFF', border: StatusColors.excusedBorder, icon: 'ban' },
  unmarked: { bg: '#F2F4F7', border: StatusColors.unmarkedBorder, icon: null },
};

// Cycle for cycling through statuses (excludes 'unmarked' - unmarked only appears initially)
const STATUS_CYCLE: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Excused'];

export function getNextStatus(current: AttendanceStatus | 'unmarked'): AttendanceStatus {
  // If current is 'unmarked', start from Present
  if (current === 'unmarked') {
    return 'Present';
  }
  const idx = STATUS_CYCLE.indexOf(current);
  const nextIdx = (idx + 1) % STATUS_CYCLE.length;
  return STATUS_CYCLE[nextIdx];
}

export function StatusIndicator({ status, size = 32, onPress }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const iconColor = status === 'Excused' ? StatusColors.excused : '#FFFFFF';
  const iconSize = Math.round(size * 0.5);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: config.bg,
          borderColor: config.border,
          borderWidth: 2,
        },
      ]}
    >
      {config.icon && (
        <Ionicons
          name={config.icon}
          size={iconSize}
          color={iconColor}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});