// src/components/screens/student/StudentDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import { StudentCourse } from '@/types';
import { StudentCourseCard } from '@/components/shared/CourseCard';
import { Colors, Spacing } from '@/constants/colors';

export function StudentDashboard() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const data = await api.get('/courses/student/');
      setCourses(data as StudentCourse[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const onRefresh = () => { setRefreshing(true); fetchCourses(); };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.course_section_id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              Welcome back,
            </Text>
            <Text style={[styles.name, { color: colors.textPrimary }]}>
              {user?.full_name?.split(' ')[0] || 'Student'} 👋
            </Text>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              My Courses
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Courses Yet</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              You haven't been enrolled in any courses yet. Contact your teacher or admin.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.courseCol}>
            <StudentCourseCard
              course={item}
              onPress={() => router.push({ pathname: '/(app)/course/[id]', params: { id: item.course_section_id, title: item.course_title } })}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.xl, paddingBottom: 100 },
  columnWrap: { justifyContent: 'space-between', gap: Spacing.md },
  courseCol: { flex: 1, maxWidth: '48%' },
  header: { marginBottom: Spacing.xl },
  greeting: { fontSize: 14 },
  name: { fontSize: 26, fontWeight: '800', marginBottom: Spacing.xl },
  sectionLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.sm },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
