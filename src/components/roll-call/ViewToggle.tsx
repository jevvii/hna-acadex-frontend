import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';

type ViewMode = 'LIST' | 'CLASS';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, value === 'LIST' && styles.tabActive]}
        onPress={() => onChange('LIST')}
      >
        <Text style={[styles.tabText, value === 'LIST' && styles.tabTextActive]}>LIST</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, value === 'CLASS' && styles.tabActive]}
        onPress={() => onChange('CLASS')}
      >
        <Text style={[styles.tabText, value === 'CLASS' && styles.tabTextActive]}>CLASS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabTextActive: {
    color: Colors.primary,
  },
});

export type { ViewMode };