import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface RollCallHeaderProps {
  onSettingsPress?: () => void;
}

export function RollCallHeader({ onSettingsPress }: RollCallHeaderProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="megaphone" size={22} color="#FFFFFF" />
      <Text style={styles.title}>Roll Call</Text>
      <TouchableOpacity onPress={onSettingsPress} style={styles.settingsBtn}>
        <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  settingsBtn: {
    padding: 8,
  },
});