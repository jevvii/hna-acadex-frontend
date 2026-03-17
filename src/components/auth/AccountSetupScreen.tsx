// src/components/auth/AccountSetupScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';

interface AccountSetupScreenProps {
  skipPhotoUpload?: boolean;
}

export function AccountSetupScreen({ skipPhotoUpload = false }: AccountSetupScreenProps) {
  const { user, completeSetup, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  // Determine initial step - skip photo if user already has avatar
  const [step, setStep] = useState<'photo' | 'password'>('photo');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Effect to skip photo step if user already has avatar
  useEffect(() => {
    if (skipPhotoUpload || user?.avatar_url) {
      setStep('password');
    }
  }, [skipPhotoUpload, user?.avatar_url]);

  // Pick image from gallery
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please grant gallery access to upload a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please grant camera access to take a profile photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // Upload avatar to server and update profile
  const uploadAvatar = async (): Promise<boolean> => {
    if (!avatarUri) return true; // Skip if no avatar selected

    setUploading(true);
    try {
      const formData = new FormData();
      const filename = avatarUri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      // Backend expects the field name to be 'file'
      formData.append('file', {
        uri: avatarUri,
        name: filename,
        type,
      } as any);

      const response = await api.postForm('/profiles/me/avatar/', formData);

      // Update user profile with new avatar URL
      if (response?.avatar_url) {
        await refreshProfile();
      }
      return true;
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload profile photo. Please try again.');
      return false;
    } finally {
      setUploading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // First upload avatar if we have one
      if (avatarUri) {
        const uploaded = await uploadAvatar();
        if (!uploaded) {
          setLoading(false);
          return;
        }
      }

      // Then change password
      await completeSetup(newPassword);

      // Refresh user profile to get updated avatar_url
      await refreshProfile();

      Alert.alert('Success', 'Account setup complete! You can now access your account.');
      router.replace('/(app)/(tabs)/dashboard');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Continue from photo step
  const handlePhotoContinue = () => {
    if (!avatarUri && !skipPhotoUpload) {
      Alert.alert(
        'Profile Photo Required',
        'Please upload a profile photo to continue. A decent, professional photo is recommended.',
        [{ text: 'OK' }]
      );
      return;
    }
    setStep('password');
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
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>HNA</Text>
          </View>
          <Text style={[styles.title, { color: Colors.primary }]}>Account Setup</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {step === 'photo'
              ? 'Upload your profile photo'
              : 'Create your password'}
          </Text>
        </View>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, step === 'photo' ? styles.progressDotActive : styles.progressDotComplete]}>
            <Text style={styles.progressDotText}>1</Text>
          </View>
          <View style={[styles.progressLine, step === 'password' ? styles.progressLineComplete : {}]} />
          <View style={[styles.progressDot, step === 'password' ? styles.progressDotActive : {}]}>
            <Text style={styles.progressDotText}>2</Text>
          </View>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.card]}>
          {step === 'photo' ? (
            <>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Profile Photo</Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Please upload a decent, professional photo for your profile.
              </Text>

              {/* Avatar preview */}
              <View style={styles.avatarContainer}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.avatarPlaceholderText, { color: colors.textSecondary }]}>
                      {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Photo buttons */}
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoButton, styles.photoButtonSecondary]} onPress={pickImage}>
                <Text style={[styles.photoButtonText, styles.photoButtonTextSecondary]}>Choose from Gallery</Text>
              </TouchableOpacity>

              {/* Continue button */}
              <TouchableOpacity
                style={[styles.submitBtn, uploading && styles.submitBtnDisabled]}
                onPress={handlePhotoContinue}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Continue</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Create Password</Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Create a new password for your account. Minimum 8 characters.
              </Text>

              {/* New Password */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>New Password</Text>
                <View style={[styles.passwordRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.passwordInput, { color: colors.textPrimary }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
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

              {/* Confirm Password */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Confirm Password</Text>
                <View style={[styles.passwordRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.passwordInput, { color: colors.textPrimary }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit button */}
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handlePasswordChange}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Complete Setup</Text>
                )}
              </TouchableOpacity>
            </>
          )}
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
    marginBottom: Spacing.xl,
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  progressDotComplete: {
    backgroundColor: Colors.success,
  },
  progressDotText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: Spacing.sm,
  },
  progressLineComplete: {
    backgroundColor: Colors.primary,
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
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
  avatarContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: '600',
  },
  photoButton: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  photoButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  photoButtonTextSecondary: {
    color: Colors.primary,
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
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
    marginTop: Spacing.md,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});