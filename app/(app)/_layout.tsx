// app/(app)/_layout.tsx
import { useState } from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Sidebar } from '@/components/shared/Sidebar';
import { TopBar } from '@/components/shared/TopBar';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { colors } = useTheme();
  const router = useRouter();
  const { user, loading } = useAuth();

  // Wait for auth to be ready
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.replace('/login');
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar
        onMenuClick={() => setSidebarOpen(true)}
        onNotificationsClick={() => router.push('/(app)/(tabs)/notifications')}
      />
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="course/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/account" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
