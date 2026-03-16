// src/components/shared/TopBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors, Spacing, Shadows } from '@/constants/colors';

interface TopBarProps {
  title?: string;
  onMenuClick: () => void;
  onNotificationsClick?: () => void;
  unreadCount?: number;
}

export function TopBar({ title, onMenuClick, onNotificationsClick, unreadCount = 0 }: TopBarProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const initials = user?.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, paddingTop: insets.top, borderBottomColor: colors.border }]}>
      <View style={styles.inner}>
        {/* Left: Logo */}
        <View style={styles.left}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.logoText, { color: Colors.primary }]}>HNA Acadex</Text>
        </View>

        {/* Right: Bell + Avatar */}
        <View style={styles.right}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onNotificationsClick}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onMenuClick} activeOpacity={0.8}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    ...Shadows.sm,
    zIndex: 100,
  },
  inner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  logoText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBtn: { position: 'relative', padding: 2 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.accentRed,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
