// app/(app)/_layout.tsx
import { useState } from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Sidebar } from '@/components/shared/Sidebar';
import { TopBar } from '@/components/shared/TopBar';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { colors } = useTheme();
  const router = useRouter();

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
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
