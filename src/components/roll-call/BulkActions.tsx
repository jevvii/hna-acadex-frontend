import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface BulkActionsProps {
  onMarkAllPresent?: () => void;
  onUnmarkAll?: () => void;
  disabled?: boolean;
}

export function BulkActions({ onMarkAllPresent, onUnmarkAll, disabled }: BulkActionsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.btn, styles.markPresentBtn, disabled && styles.disabled]}
        onPress={onMarkAllPresent}
        disabled={disabled}
      >
        <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
        <Text style={styles.markPresentText}>MARK ALL PRESENT</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, styles.unmarkBtn, disabled && styles.disabled]}
        onPress={onUnmarkAll}
        disabled={disabled}
      >
        <Ionicons name="arrow-undo" size={16} color={Colors.primary} />
        <Text style={styles.unmarkText}>UNMARK ALL</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  markPresentBtn: {
    backgroundColor: Colors.primaryLight,
  },
  markPresentText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  unmarkBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  unmarkText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});