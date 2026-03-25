// app/(app)/settings/account.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';

export default function AccountSettingsScreen() {
  const { colors } = useTheme();
  const { user, refreshProfile } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState(user?.full_name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.full_name?.split(' ').slice(1).join(' ') || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      await api.patch('/auth/me/', { full_name: fullName });
      await refreshProfile();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Account Settings</Text>

        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.sm]}>
          {/* Email (read-only) */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email</Text>
            <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>{user?.email}</Text>
          </View>

          {/* First Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>First Name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              style={[styles.input, { backgroundColor: colors.muted, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Enter first name"
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel="First name"
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* Last Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Last Name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              style={[styles.input, { backgroundColor: colors.muted, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Enter last name"
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel="Last name"
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: Colors.primary }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
            accessibilityLabel="Save changes"
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Account info */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Account Information</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.sm]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Role</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            </Text>
          </View>
          {user?.student_id && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Student ID</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user.student_id}</Text>
            </View>
          )}
          {user?.employee_id && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Employee ID</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user.employee_id}</Text>
            </View>
          )}
          {user?.section && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Section</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {user.strand !== 'NONE' ? `${user.strand}-` : ''}{user.section}
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xl },
  title: { fontSize: 26, fontWeight: '800', marginBottom: Spacing.xl },
  card: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  fieldGroup: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: Spacing.xs },
  fieldValue: { fontSize: 15 },
  input: {
    fontSize: 15,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  saveBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: Spacing.sm, marginTop: Spacing.lg },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' },
});