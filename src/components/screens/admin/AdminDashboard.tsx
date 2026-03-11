// src/components/screens/admin/AdminDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Image,
  Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Profile, GradeLevel, StrandType, UserRole } from '@/types';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';

type Tab = 'students' | 'teachers';

const GRADE_LEVELS: GradeLevel[] = [
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
];
const STRANDS: StrandType[] = ['STEM', 'ABM', 'HUMSS', 'TVL', 'GAS', 'NONE'];

// ─── Form primitives ───────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={mStyles.formSection}>
      <Text style={[mStyles.sectionLabel, { color: colors.textSecondary }]}>
        {title.toUpperCase()}
      </Text>
      <View style={[mStyles.sectionCard, { backgroundColor: colors.surface }]}>
        {children}
      </View>
    </View>
  );
}

function FormField({ label, colors, children }: { label: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={mStyles.fieldGroup}>
      <Text style={[mStyles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Create / Edit User Modal ──────────────────────────────────────────────

interface UserFormModalProps {
  visible: boolean;
  defaultRole: UserRole;
  editUser?: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}

function UserFormModal({ visible, defaultRole, editUser, onClose, onSaved }: UserFormModalProps) {
  const { colors } = useTheme();
  const isEdit = !!editUser;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('Grade 7');
  const [strand, setStrand] = useState<StrandType>('NONE');
  const [section, setSection] = useState('');
  const [studentId, setStudentId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editUser) {
      setFullName(editUser.full_name || '');
      setEmail(editUser.email || '');
      setPassword('');
      setRole(editUser.role);
      setGradeLevel(editUser.grade_level || 'Grade 7');
      setStrand(editUser.strand || 'NONE');
      setSection(editUser.section || '');
      setStudentId(editUser.student_id || '');
      setEmployeeId(editUser.employee_id || '');
    } else {
      setFullName(''); setEmail(''); setPassword('');
      setRole(defaultRole); setGradeLevel('Grade 7');
      setStrand('NONE'); setSection('');
      setStudentId(''); setEmployeeId('');
    }
  }, [visible, editUser, defaultRole]);

  const handleSave = async () => {
    if (!fullName.trim()) { Alert.alert('Required', 'Full name is required.'); return; }
    if (!email.trim()) { Alert.alert('Required', 'Email is required.'); return; }
    if (!isEdit && password.trim().length < 8) {
      Alert.alert('Required', 'Password must be at least 8 characters.'); return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/profiles/${editUser!.id}/`, {
          full_name: fullName.trim(),
          role,
          grade_level: role === 'student' ? gradeLevel : null,
          strand: role === 'student' ? strand : 'NONE',
          section: role === 'student' ? (section.trim() || null) : null,
          student_id: role === 'student' ? (studentId.trim() || null) : null,
          employee_id: role === 'teacher' ? (employeeId.trim() || null) : null,
        });
      } else {
        await api.post('/profiles/', {
          full_name: fullName.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
          grade_level: role === 'student' ? gradeLevel : null,
          strand: role === 'student' ? strand : 'NONE',
          section: role === 'student' ? (section.trim() || null) : null,
          student_id: role === 'student' ? (studentId.trim() || null) : null,
          employee_id: role === 'teacher' ? (employeeId.trim() || null) : null,
          status: 'active',
        });
      }
      onSaved();
      onClose();
      Alert.alert(
        'Success',
        isEdit
          ? 'User updated successfully.'
          : `${role === 'student' ? 'Student' : 'Teacher'} account created successfully.`,
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[mStyles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[mStyles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} disabled={saving} style={mStyles.cancelBtn}>
              <Text style={[mStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[mStyles.modalTitle, { color: colors.textPrimary }]}>
              {isEdit ? 'Edit User' : `Add ${defaultRole === 'student' ? 'Student' : 'Teacher'}`}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={mStyles.saveBtn}>
              {saving
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={mStyles.saveBtnText}>{isEdit ? 'Save' : 'Create'}</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView style={mStyles.scroll} contentContainerStyle={mStyles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Role selector — new users only */}
            {!isEdit && (
              <FormSection title="Role">
                <View style={[mStyles.segmented, { backgroundColor: colors.muted }]}>
                  {(['student', 'teacher'] as UserRole[]).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[mStyles.segmentBtn, role === r && { backgroundColor: Colors.primary }]}
                      onPress={() => setRole(r)}
                    >
                      <Text style={[mStyles.segmentText, { color: role === r ? '#FFFFFF' : colors.textSecondary }]}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FormSection>
            )}

            {/* Basic info */}
            <FormSection title="Basic Information">
              <FormField label="Full Name" colors={colors}>
                <TextInput
                  style={[mStyles.input, { backgroundColor: colors.muted, color: colors.textPrimary, borderColor: colors.border }]}
                  value={fullName} onChangeText={setFullName}
                  placeholder="e.g. Maria Clara Santos"
                  placeholderTextColor={colors.mutedForeground}
                />
              </FormField>
              {!isEdit && (
                <>
                  <FormField label="Email Address" colors={colors}>
                    <TextInput
                      style={[mStyles.input, { backgroundColor: colors.muted, color: colors.textPrimary, borderColor: colors.border }]}
                      value={email} onChangeText={setEmail}
                      placeholder="user@hna.edu.ph"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                    />
                  </FormField>
                  <FormField label="Temporary Password" colors={colors}>
                    <TextInput
                      style={[mStyles.input, { backgroundColor: colors.muted, color: colors.textPrimary, borderColor: colors.border }]}
                      value={password} onChangeText={setPassword}
                      placeholder="Minimum 8 characters"
                      placeholderTextColor={colors.mutedForeground}
                      secureTextEntry
                    />
                  </FormField>
                </>
              )}
            </FormSection>

            {/* Student details */}
            {role === 'student' && (
              <FormSection title="Student Details">
                <FormField label="Student ID" colors={colors}>
                  <TextInput
                    style={[mStyles.input, { backgroundColor: colors.muted, color: colors.textPrimary, borderColor: colors.border }]}
                    value={studentId} onChangeText={setStudentId}
                    placeholder="e.g. 2024-00123"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </FormField>
                <FormField label="Grade Level" colors={colors}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={mStyles.chipRow}>
                      {GRADE_LEVELS.map((g) => (
                        <TouchableOpacity
                          key={g}
                          style={[mStyles.chip, gradeLevel === g && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
                          onPress={() => setGradeLevel(g)}
                        >
                          <Text style={[mStyles.chipText, { color: gradeLevel === g ? '#FFFFFF' : colors.textSecondary }]}>
                            {g.replace('Grade ', 'G')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </FormField>
                <FormField label="Strand" colors={colors}>
                  <View style={mStyles.chipRow}>
                    {STRANDS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[mStyles.chip, strand === s && { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryLight }]}
                        onPress={() => setStrand(s)}
                      >
                        <Text style={[mStyles.chipText, { color: strand === s ? '#FFFFFF' : colors.textSecondary }]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </FormField>
                <FormField label="Section" colors={colors}>
                  <TextInput
                    style={[mStyles.input, { backgroundColor: colors.muted, color: colors.textPrimary, borderColor: colors.border }]}
                    value={section} onChangeText={setSection}
                    placeholder="e.g. Rizal, A, Bonifacio"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </FormField>
              </FormSection>
            )}

            {/* Teacher details */}
            {role === 'teacher' && (
              <FormSection title="Teacher Details">
                <FormField label="Employee ID" colors={colors}>
                  <TextInput
                    style={[mStyles.input, { backgroundColor: colors.muted, color: colors.textPrimary, borderColor: colors.border }]}
                    value={employeeId} onChangeText={setEmployeeId}
                    placeholder="e.g. EMP-2024-001"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </FormField>
              </FormSection>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('students');
  const [students, setStudents] = useState<Profile[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [stats, setStats] = useState({ students: 0, teachers: 0, courses: 0, sections: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [studentsData, teachersData, statsData] = await Promise.all([
        api.get('/profiles/?role=student'),
        api.get('/profiles/?role=teacher'),
        api.get('/dashboard/stats/'),
      ]);
      setStudents(studentsData as Profile[]);
      setTeachers(teachersData as Profile[]);
      setStats(statsData as { students: number; teachers: number; courses: number; sections: number });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Unable to fetch admin data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const openCreate = (forTab?: Tab) => {
    if (forTab) setTab(forTab);
    setEditUser(null);
    setModalVisible(true);
  };

  const openEdit = (user: Profile) => {
    setEditUser(user);
    setModalVisible(true);
  };

  const toggleStatus = async (profile: Profile) => {
    const newStatus = profile.status === 'active' ? 'inactive' : 'active';
    Alert.alert(
      newStatus === 'active' ? 'Activate User' : 'Deactivate User',
      `${newStatus === 'active' ? 'Activate' : 'Deactivate'} ${profile.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus === 'inactive' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.post(`/profiles/${profile.id}/toggle_status/`);
              fetchData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update user status.');
            }
          },
        },
      ],
    );
  };

  const deleteUser = async (profile: Profile) => {
    Alert.alert('Delete User', `Permanently delete ${profile.full_name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/profiles/${profile.id}/`);
            fetchData();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete user.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const currentList = tab === 'students' ? students : teachers;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={currentList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>School Overview</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsGrid}>
              {[
                { label: 'Students', value: stats.students, icon: 'school-outline', color: Colors.primary },
                { label: 'Teachers', value: stats.teachers, icon: 'people-outline', color: Colors.primaryLight },
                { label: 'Courses', value: stats.courses, icon: 'book-outline', color: Colors.accentGold },
                { label: 'Sections', value: stats.sections, icon: 'grid-outline', color: Colors.accentRed },
              ].map((s) => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                  <View style={[styles.statIconBg, { backgroundColor: s.color + '20' }]}>
                    <Ionicons name={s.icon as any} size={20} color={s.color} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Tab switcher */}
            <View style={[styles.tabRow, { backgroundColor: colors.muted }]}>
              {(['students', 'teachers'] as Tab[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, tab === t && { backgroundColor: Colors.primary }]}
                  onPress={() => setTab(t)}
                >
                  <Text style={[styles.tabText, { color: tab === t ? '#FFFFFF' : colors.textSecondary }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No {tab} yet</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Tap the + button to add a {tab === 'students' ? 'student' : 'teacher'}.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <UserRow
            user={item}
            colors={colors}
            onEdit={openEdit}
            onToggle={toggleStatus}
            onDelete={deleteUser}
            tab={tab}
          />
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => openCreate()} activeOpacity={0.85}>
        <Ionicons name="person-add-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <UserFormModal
        visible={modalVisible}
        defaultRole={tab === 'teachers' ? 'teacher' : 'student'}
        editUser={editUser}
        onClose={() => setModalVisible(false)}
        onSaved={fetchData}
      />
    </View>
  );
}

// ─── User row ──────────────────────────────────────────────────────────────

function UserRow({ user, colors, onEdit, onToggle, onDelete, tab }: {
  user: Profile; colors: any;
  onEdit: (u: Profile) => void;
  onToggle: (u: Profile) => void;
  onDelete: (u: Profile) => void;
  tab: Tab;
}) {
  const initials = user.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';
  const isActive = user.status === 'active';

  return (
    <View style={[styles.userRow, { backgroundColor: colors.surface }, Shadows.sm]}>
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.rowAvatar} />
      ) : (
        <View style={[styles.rowAvatarFallback, { backgroundColor: Colors.primaryLight }]}>
          <Text style={styles.rowAvatarText}>{initials}</Text>
        </View>
      )}

      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>
          {user.full_name}
        </Text>
        <Text style={[styles.rowEmail, { color: colors.textSecondary }]} numberOfLines={1}>
          {user.email}
        </Text>
        {tab === 'students' && user.section && (
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
            {user.grade_level} · {user.strand !== 'NONE' ? `${user.strand}-` : ''}{user.section}
          </Text>
        )}
        {tab === 'teachers' && user.employee_id && (
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
            ID: {user.employee_id}
          </Text>
        )}
      </View>

      <View style={styles.rowActions}>
        <View style={[styles.statusDot, { backgroundColor: isActive ? '#2E7D32' : '#9E9E9E' }]} />
        <TouchableOpacity onPress={() => onEdit(user)} style={styles.actionBtn}>
          <Ionicons name="create-outline" size={20} color={Colors.primaryLight} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onToggle(user)} style={styles.actionBtn}>
          <Ionicons
            name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(user)} style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={20} color={Colors.accentRed} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.xl, paddingBottom: 120 },
  header: { marginBottom: Spacing.xl },
  title: { fontSize: 26, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, minWidth: '45%', borderRadius: Radius.lg,
    padding: Spacing.lg, alignItems: 'center', gap: 4,
  },
  statIconBg: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  tabRow: { flexDirection: 'row', borderRadius: Radius.md, padding: 4, marginBottom: Spacing.lg },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.sm, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: Spacing.md },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyBody: { fontSize: 13, textAlign: 'center' },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, gap: Spacing.md,
  },
  rowAvatar: { width: 44, height: 44, borderRadius: 22 },
  rowAvatarFallback: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  rowAvatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600' },
  rowEmail: { fontSize: 11, marginTop: 1 },
  rowMeta: { fontSize: 11, marginTop: 2 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 2 },
  actionBtn: { padding: 4 },
  fab: {
    position: 'absolute', bottom: 90, right: Spacing.xl,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.card,
  },
});

const mStyles = StyleSheet.create({
  container: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.lg, borderBottomWidth: 1,
  },
  cancelBtn: { minWidth: 60, padding: 4 },
  cancelText: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  saveBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg,
    paddingVertical: 8, borderRadius: Radius.full, minWidth: 70, alignItems: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.xl },
  formSection: { marginBottom: Spacing.xl },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: Spacing.sm, marginLeft: 4 },
  sectionCard: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.lg },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '500' },
  input: { height: 48, borderRadius: Radius.md, paddingHorizontal: Spacing.md, fontSize: 15, borderWidth: 1 },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, padding: 4 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.sm, alignItems: 'center' },
  segmentText: { fontSize: 14, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: '#CBD5E1' },
  chipText: { fontSize: 13, fontWeight: '600' },
});
