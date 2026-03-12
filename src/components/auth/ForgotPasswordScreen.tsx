// src/components/auth/ForgotPasswordScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authApi } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { colors } = useTheme();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your school email address.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (error: any) {
      // Even on error, show success message to prevent email enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>HNA</Text>
            </View>
            <Text style={[styles.title, { color: Colors.primary }]}>Request Submitted</Text>
          </View>

          {/* Success Card */}
          <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.card]}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Check Your Email
            </Text>
            <Text style={[styles.successText, { color: colors.textSecondary }]}>
              If an account exists with the email {email}, a password reset request has been submitted.
            </Text>
            <Text style={[styles.successText, { color: colors.textSecondary }]}>
              Please wait for administrator approval. You will receive a new password at your personal email address once approved.
            </Text>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.submitBtnText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>HNA</Text>
          </View>
          <Text style={[styles.title, { color: Colors.primary }]}>Forgot Password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your school email to request a password reset
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.card]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Reset Password</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Enter your school email address (@hna.edu.ph). A password reset request will be submitted for administrator approval.
          </Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>School Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.textPrimary, borderColor: colors.border }]}
              value={email}
              onChangeText={setEmail}
              placeholder="yourname@hna.edu.ph"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.submitBtnText}>Submit Request</Text>
            }
          </TouchableOpacity>

          {/* Back to login */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={[styles.backBtnText, { color: Colors.primaryLight }]}>
              Back to Login
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info hint */}
        <View style={[styles.hintCard, { backgroundColor: colors.muted }]}>
          <Text style={[styles.hintTitle, { color: colors.textPrimary }]}>
            How It Works
          </Text>
          <Text style={[styles.hintBody, { color: colors.textSecondary }]}>
            {'1. Submit your school email above\n2. Wait for admin approval\n3. Check your personal email for new credentials\n4. Login with the new password'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.accentGold,
  },
  logoBadgeText: {
    color: Colors.accentGold,
    fontSize: 18,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    borderWidth: 1,
  },
  submitBtn: {
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backBtn: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtnText: { fontSize: 14 },
  hintCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  hintBody: { fontSize: 12, lineHeight: 18 },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  successIconText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
  },
  successText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
});