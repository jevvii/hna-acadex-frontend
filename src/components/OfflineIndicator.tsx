// src/components/OfflineIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useTheme } from '@/contexts/ThemeContext';

const WARNING_COLOR = '#F59E0B'; // Amber-500 for warning

export function OfflineIndicator() {
  const { isOffline } = useOfflineStatus();
  const { colors } = useTheme();

  if (!isOffline) return null;

  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel="Offline warning: You are currently offline"
    >
      <Ionicons name="cloud-offline" size={16} color="white" />
      <Text style={styles.text}>
        You're offline. Some features may be unavailable.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WARNING_COLOR,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});