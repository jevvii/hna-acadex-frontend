// src/components/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.requiresSetup) {
        router.replace('/account-setup');
      } else {
        router.replace('/(app)/(tabs)/dashboard');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <View style={[styles.logoContainer, { backgroundColor: isDark ? Colors.primary : Colors.primary }]}>
            <Image
              source={require('../../../assets/icon-transparent.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : Colors.primary }]}>HNA Acadex</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Holy Name Academy of Palanas, Inc.
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.card]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Sign In</Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.textPrimary, borderColor: colors.border }]}
              value={email}
              onChangeText={setEmail}
              placeholder="student@hna.edu.ph"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Password</Text>
            <View style={[styles.passwordRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.textPrimary }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.submitBtnText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotBtn} onPress={() => router.push('/forgot-password')}>
            <Text style={[styles.forgotText, { color: Colors.primaryLight }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info hint */}
        <View style={[styles.hintCard, { backgroundColor: colors.muted }]}>
          <Text style={[styles.hintTitle, { color: colors.textPrimary }]}>
            Account Access
          </Text>
          <Text style={[styles.hintBody, { color: colors.textSecondary }]}>
            Accounts are created by the school administrator. Contact your admin if you don't have access.
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
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  logoImage: {
    width: 72,
    height: 72,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingRight: Spacing.md,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  eyeBtn: { padding: 4 },
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
  forgotBtn: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  forgotText: { fontSize: 14 },
  hintCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  hintBody: { fontSize: 12, lineHeight: 18 },
});
