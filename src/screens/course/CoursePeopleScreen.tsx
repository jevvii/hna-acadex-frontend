// src/screens/course/CoursePeopleScreen.tsx
// People/Enrollment view tab for course screen
// Shows all enrolled users with their roles (student/teacher)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl,
  ActivityIndicator, Image, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCourse, CourseTab } from '@/contexts/CourseContext';
import { api } from '@/lib/api';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';

interface EnrolledPerson {
  id: string;
  full_name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  avatar_url?: string;
  student_id?: string;
  employee_id?: string;
}

interface Props {
  activeTab: CourseTab;
}

export function CoursePeopleScreen({ activeTab }: Props) {
  const { colors } = useTheme();
  const { courseId, canManage } = useCourse();
  const [people, setPeople] = useState<EnrolledPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');

  const fetchPeople = useCallback(async () => {
    if (!courseId) return;
    try {
      const data = await api.get(`/course-sections/${courseId}/people/`);
      setPeople(data || []);
    } catch (error) {
      console.error('Failed to fetch people:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (activeTab === 'people') {
      fetchPeople();
    }
  }, [activeTab, fetchPeople]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPeople();
  };

  if (activeTab !== 'people') return null;

  // Filter people based on search and role
  const filteredPeople = people.filter((person) => {
    const matchesSearch = searchQuery === '' ||
      person.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (person.student_id?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (person.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'all' || person.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Group by role
  const teachers = filteredPeople.filter(p => p.role === 'teacher' || p.role === 'admin');
  const students = filteredPeople.filter(p => p.role === 'student');

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Search and filter */}
      <View style={styles.searchBar}>
        <View style={[styles.searchInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchTextInput, { color: colors.textPrimary }]}
            placeholder="Search by name, email, ID..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Role filter tabs */}
      <View style={styles.filterRow}>
        {(['all', 'teacher', 'student'] as const).map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.filterTab, roleFilter === role && styles.filterTabActive]}
            onPress={() => setRoleFilter(role)}
          >
            <Text style={[styles.filterTabText, roleFilter === role && styles.filterTabTextActive]}>
              {role === 'all' ? 'All' : role === 'teacher' ? 'Teachers' : 'Students'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats summary */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="people-outline" size={20} color={Colors.primary} />
          <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{people.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="school-outline" size={20} color={Colors.accentGold} />
          <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{teachers.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Teachers</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="person-outline" size={20} color="#16A34A" />
          <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{students.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Students</Text>
        </View>
      </View>

      {/* Teachers section */}
      {(roleFilter === 'all' || roleFilter === 'teacher') && teachers.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Teachers</Text>
          {teachers.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </View>
      )}

      {/* Students section */}
      {(roleFilter === 'all' || roleFilter === 'student') && students.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Students</Text>
          {students.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </View>
      )}

      {filteredPeople.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>
            {searchQuery ? 'No matching people found' : 'No enrolled users yet'}
          </Text>
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

interface PersonCardProps {
  person: EnrolledPerson;
}

function PersonCard({ person }: PersonCardProps) {
  const { colors } = useTheme();
  const roleColor = person.role === 'teacher' ? Colors.accentGold : person.role === 'admin' ? Colors.primary : '#16A34A';

  return (
    <View style={[styles.personCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.personAvatar}>
        {person.avatar_url ? (
          <Image source={{ uri: person.avatar_url }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.background }]}>
            <Text style={styles.avatarInitials}>
              {person.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.personInfo}>
        <Text style={[styles.personName, { color: colors.textPrimary }]}>{person.full_name}</Text>
        <Text style={[styles.personEmail, { color: colors.textTertiary }]}>{person.email}</Text>
        {person.student_id && (
          <Text style={[styles.personMeta, { color: colors.textTertiary }]}>Student ID: {person.student_id}</Text>
        )}
        {person.employee_id && (
          <Text style={[styles.personMeta, { color: colors.textTertiary }]}>Employee ID: {person.employee_id}</Text>
        )}
      </View>
      <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
        <Text style={[styles.roleBadgeText, { color: roleColor }]}>
          {person.role.charAt(0).toUpperCase() + person.role.slice(1)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  tabContent: { padding: Spacing.xl, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  searchBar: { marginBottom: Spacing.md },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchTextInput: { flex: 1, fontSize: 15 },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  filterTabActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  filterTabText: { fontSize: 13, color: '#374151' },
  filterTabTextActive: { color: Colors.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  statCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Shadows.sm,
  },
  statNumber: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  statLabel: { fontSize: 12, marginTop: 2 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.sm },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    ...Shadows.sm,
  },
  personAvatar: { marginRight: Spacing.md },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarInitials: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  personInfo: { flex: 1 },
  personName: { fontSize: 15, fontWeight: '600' },
  personEmail: { fontSize: 12, marginTop: 2 },
  personMeta: { fontSize: 11, marginTop: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, marginTop: 12, fontWeight: '500' },
});