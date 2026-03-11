// src/components/shared/Sidebar.tsx
import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Animated, Pressable, Image, Switch, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';
import { api } from '@/lib/api';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

const ROLE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  admin: { bg: Colors.accentRed, text: '#FFFFFF', label: 'ADMIN' },
  teacher: { bg: Colors.primaryLight, text: '#FFFFFF', label: 'TEACHER' },
  student: { bg: Colors.accentGold, text: Colors.primary, label: 'STUDENT' },
};

export function Sidebar({ visible, onClose }: SidebarProps) {
  const { user, signOut, updateProfile } = useAuth();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const router = useRouter();

  const badge = ROLE_BADGE[user?.role || 'student'];
  const initials = user?.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U';

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await signOut();
          onClose();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleEditPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const asset = result.assets[0];
        const ext = asset.uri.split('.').pop() || 'jpg';
        const fileName = `avatar-${user?.id}.${ext}`;
        const formData = new FormData();
        formData.append('file', { uri: asset.uri, name: fileName, type: `image/${ext}` } as any);
        const data = await api.postForm('/profiles/me/avatar/', formData);
        if (data?.avatar_url) {
          await updateProfile({ avatar_url: data.avatar_url });
        }
      } catch {
        Alert.alert('Error', 'Failed to upload photo. Please try again.');
      }
    }
  };

  const themeOptions: Array<{ mode: 'light' | 'dark' | 'system'; icon: string; label: string }> = [
    { mode: 'light', icon: 'sunny-outline', label: 'Light' },
    { mode: 'dark', icon: 'moon-outline', label: 'Dark' },
    { mode: 'system', icon: 'phone-portrait-outline', label: 'System' },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.drawer, { backgroundColor: colors.surface }]}>
          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Header close */}
            <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Menu</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Profile */}
            <View style={styles.profileSection}>
              <View style={styles.avatarWrapper}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: Colors.primaryLight }]}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.editPhotoBtn} onPress={handleEditPhoto}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {user?.full_name}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                  {user?.email}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.roleBadge, { backgroundColor: badge?.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: badge?.text }]}>{badge?.label}</Text>
                  </View>
                  {user?.section && (
                    <View style={[styles.sectionBadge, { borderColor: colors.border }]}>
                      <Text style={[styles.sectionBadgeText, { color: colors.textSecondary }]}>
                        {user.strand !== 'NONE' ? `${user.strand}-` : ''}{user.section}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Uploaded Files (Students only) */}
            {user?.role === 'student' && (
              <>
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    <Ionicons name="document-text-outline" size={15} /> Uploaded Files
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No files uploaded yet.
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </>
            )}

            {/* Settings */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                <Ionicons name="settings-outline" size={15} /> Settings
              </Text>

              {/* Theme selector */}
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>App Theme</Text>
              <View style={[styles.themeSelector, { backgroundColor: colors.muted }]}>
                {themeOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.mode}
                    style={[
                      styles.themeOption,
                      themeMode === opt.mode && { backgroundColor: Colors.primary },
                    ]}
                    onPress={() => setThemeMode(opt.mode)}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={16}
                      color={themeMode === opt.mode ? '#FFFFFF' : colors.textSecondary}
                    />
                    <Text style={[
                      styles.themeOptionText,
                      { color: themeMode === opt.mode ? '#FFFFFF' : colors.textSecondary },
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Settings items */}
              {[
                { icon: 'notifications-outline', label: 'Notification Preferences' },
                { icon: 'person-outline', label: 'Account Settings' },
                { icon: 'shield-checkmark-outline', label: 'Privacy & Security' },
              ].map((item) => (
                <TouchableOpacity key={item.label} style={styles.settingRow}>
                  <Ionicons name={item.icon as any} size={18} color={colors.textSecondary} />
                  <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Admin dashboard shortcut */}
            {user?.role === 'admin' && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.section}>
                  <TouchableOpacity
                    style={[styles.adminBtn, { borderColor: Colors.primary }]}
                    onPress={() => { router.push('/(app)/(tabs)/dashboard'); onClose(); }}
                  >
                    <Ionicons name="shield-outline" size={18} color={Colors.primary} />
                    <Text style={[styles.adminBtnText, { color: Colors.primary }]}>Admin Dashboard</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={{ height: Spacing.xxxl }} />
          </ScrollView>

          {/* Logout */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={18} color={Colors.accentRed} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  drawer: {
    width: 320,
    height: '100%',
    ...Shadows.card,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xl,
    paddingTop: 52,
    borderBottomWidth: 1,
  },
  menuLabel: { fontSize: 18, fontWeight: '700' },
  closeBtn: { padding: 4 },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  editPhotoBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  profileEmail: { fontSize: 12, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  sectionBadgeText: { fontSize: 10, fontWeight: '500' },
  divider: { height: 1, marginHorizontal: Spacing.xl },
  section: { padding: Spacing.xl },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: Spacing.md },
  emptyText: { fontSize: 13 },
  settingLabel: { fontSize: 12, fontWeight: '500', marginBottom: Spacing.sm },
  themeSelector: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  themeOptionText: { fontSize: 12, fontWeight: '500' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  settingRowText: { flex: 1, fontSize: 14 },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  adminBtnText: { fontSize: 14, fontWeight: '600' },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.accentRed,
    borderRadius: Radius.md,
    paddingVertical: 14,
  },
  logoutText: { color: Colors.accentRed, fontSize: 15, fontWeight: '600' },
});
