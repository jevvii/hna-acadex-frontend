// src/screens/course/TeacherActivityDetailsScreen.tsx
// Activity details screen for teachers - view submissions and grade

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Activity, Submission, ScoreSelectionPolicy } from '@/types';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';
import { api } from '@/lib/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FormattedText } from '@/components/shared/FormattedText';

interface SubmissionWithStudent extends Submission {
  student_name?: string;
  student_email?: string;
  attempt_limit?: number;
  attempts_used?: number;
  attempts_remaining?: number;
  all_submissions?: Submission[];
  best_score?: number | null;
  score_selection_policy?: ScoreSelectionPolicy;
}

interface TeacherActivityDetailsScreenProps {
  activity?: Activity;
  courseName?: string;
  onClose?: () => void;
  onGradeSubmission?: (submissionId: string) => void;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function TeacherActivityDetailsScreen({
  activity: propActivity,
  courseName,
  onClose,
  onGradeSubmission,
}: TeacherActivityDetailsScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ activityId?: string; courseId?: string }>();
  const [activity, setActivity] = useState<Activity | null>(propActivity || null);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [loading, setLoading] = useState(!propActivity);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const activityId = propActivity?.id || params.activityId;

  const fetchData = useCallback(async () => {
    if (!activityId) return;
    try {
      const [activityData, submissionsData] = await Promise.all([
        api.get(`/activities/${activityId}/`),
        api.get(`/activities/${activityId}/submissions/`),
      ]);
      setActivity(activityData);
      setSubmissions(submissionsData || []);
    } catch (error) {
      console.error('Failed to fetch activity data:', error);
      Alert.alert('Error', 'Failed to load activity details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activityId]);

  useEffect(() => {
    if (!propActivity) {
      fetchData();
    }
  }, [propActivity, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Calculate class statistics
  const stats = useMemo(() => {
    const gradedSubmissions = submissions.filter(s => s.score !== null && s.score !== undefined);
    if (gradedSubmissions.length === 0) {
      return { average: null, highest: null, lowest: null, gradedCount: 0, totalCount: submissions.length };
    }
    const scores = gradedSubmissions.map(s => s.score!);
    const total = scores.reduce((sum, score) => sum + score, 0);
    return {
      average: total / scores.length,
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      gradedCount: gradedSubmissions.length,
      totalCount: submissions.length,
    };
  }, [submissions]);

  const handleBack = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }, [onClose, router]);

  const handleGradeSubmission = useCallback((submissionId: string, _studentId: string) => {
    if (onGradeSubmission) {
      onGradeSubmission(submissionId);
    } else {
      // Navigate to grading screen
      router.push({
        pathname: '/(app)/grade/[submissionId]' as any,
        params: { submissionId, activityId },
      });
    }
  }, [onGradeSubmission, router, activityId]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading activity...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activity) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.accentRed} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Activity not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const submissionCount = submissions.filter(s => s.status !== 'not_submitted').length;
  const gradedCount = submissions.filter(s => s.status === 'graded').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {activity.title}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {courseName || 'Course'} • Teacher View
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Activity Info Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Ionicons name="star-outline" size={20} color={Colors.primary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Points:</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{activity.points}</Text>
          </View>
          {activity.deadline && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Due:</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{formatDate(activity.deadline)}</Text>
            </View>
          )}
          {(activity as any).attempt_limit > 1 && (
            <View style={styles.infoRow}>
              <Ionicons name="repeat-outline" size={20} color={Colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Attempts:</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {(activity as any).attempt_limit} attempts allowed
              </Text>
            </View>
          )}
          {(activity as any).score_selection_policy && (
            <View style={styles.infoRow}>
              <Ionicons name="trending-up-outline" size={20} color={Colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Score Policy:</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {(activity as any).score_selection_policy === 'highest' ? 'Highest Score' : 'Latest Score'}
              </Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        {activity.instructions && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Instructions</Text>
            <FormattedText text={activity.instructions} style={[styles.instructionsText, { color: colors.textSecondary }]} />
          </View>
        )}

        {/* Class Statistics */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Class Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={[styles.statValue, { color: stats.average !== null ? Colors.primary : colors.textSecondary }]}>
                {stats.average !== null ? stats.average.toFixed(1) : '-'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Highest</Text>
              <Text style={[styles.statValue, { color: Colors.success }]}>
                {stats.highest !== null ? stats.highest.toFixed(1) : '-'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Lowest</Text>
              <Text style={[styles.statValue, { color: Colors.accentRed }]}>
                {stats.lowest !== null ? stats.lowest.toFixed(1) : '-'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Graded</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats.gradedCount}/{stats.totalCount}
              </Text>
            </View>
          </View>
        </View>

        {/* Submissions List */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.submissionsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Submissions</Text>
            <Text style={[styles.submissionsCount, { color: colors.textSecondary }]}>
              {submissionCount} of {submissions.length} submitted
            </Text>
          </View>

          {submissions.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No students enrolled yet.
            </Text>
          ) : (
            submissions.map((sub) => {
              const isExpanded = expandedStudentId === sub.student_id;
              const hasMultipleAttempts = (sub.attempts_used || 0) > 1;

              return (
                <View key={sub.student_id} style={styles.submissionRow}>
                  <TouchableOpacity
                    style={styles.submissionMain}
                    onPress={() => setExpandedStudentId(isExpanded ? null : sub.student_id)}
                  >
                    <View style={styles.studentInfo}>
                      <Text style={[styles.studentName, { color: colors.textPrimary }]}>
                        {sub.student_name || 'Unknown Student'}
                      </Text>
                      <Text style={[styles.studentEmail, { color: colors.textSecondary }]}>
                        {sub.student_email || ''}
                      </Text>
                    </View>
                    <View style={styles.submissionStatus}>
                      {sub.status === 'not_submitted' ? (
                        <View style={[styles.statusBadge, { backgroundColor: colors.muted }]}>
                          <Text style={styles.statusBadgeText}>Not Submitted</Text>
                        </View>
                      ) : sub.status === 'graded' ? (
                        <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                          <Text style={[styles.statusBadgeText, { color: Colors.success }]}>
                            {sub.score?.toFixed(1)}/{activity.points}
                          </Text>
                        </View>
                      ) : sub.status === 'late' ? (
                        <View style={[styles.statusBadge, { backgroundColor: '#F59E0B20' }]}>
                          <Text style={[styles.statusBadgeText, { color: '#F59E0B' }]}>Late</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusBadge, { backgroundColor: Colors.primary + '20' }]}>
                          <Text style={[styles.statusBadgeText, { color: Colors.primary }]}>Submitted</Text>
                        </View>
                      )}
                      {hasMultipleAttempts && (
                        <Text style={[styles.attemptCount, { color: colors.textSecondary }]}>
                          {sub.attempts_used} attempts
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {isExpanded && sub.status !== 'not_submitted' && (
                    <View style={styles.expandedContent}>
                      {/* Best Score */}
                      {hasMultipleAttempts && sub.best_score != null && (
                        <View style={styles.attemptRow}>
                          <Text style={[styles.attemptLabel, { color: colors.textSecondary }]}>
                            Best Score: {sub.best_score.toFixed(1)} ({sub.score_selection_policy === 'highest' ? 'Highest' : 'Latest'})
                          </Text>
                        </View>
                      )}

                      {/* All Attempts */}
                      {sub.all_submissions && sub.all_submissions.length > 1 && (
                        <View style={styles.attemptsList}>
                          <Text style={[styles.attemptsTitle, { color: colors.textSecondary }]}>All Attempts:</Text>
                          {sub.all_submissions.map((attempt, idx) => (
                            <View key={attempt.id || idx} style={styles.attemptItem}>
                              <Text style={[styles.attemptText, { color: colors.textSecondary }]}>
                                Attempt {attempt.attempt_number || idx + 1}
                              </Text>
                              <Text style={[styles.attemptScore, { color: colors.textPrimary }]}>
                                {attempt.score != null ? attempt.score.toFixed(1) : 'Not graded'}
                              </Text>
                              <Text style={[styles.attemptDate, { color: colors.textSecondary }]}>
                                {formatDate(attempt.submitted_at)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Grade Button */}
                      <TouchableOpacity
                        style={styles.gradeButton}
                        onPress={() => handleGradeSubmission(sub.id!, sub.student_id)}
                      >
                        <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.gradeButtonText}>Grade Submission</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 16,
  },
  backButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerBack: {
    padding: Spacing.xs,
  },
  headerContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollView: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  submissionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  submissionsCount: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  submissionRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  submissionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
  },
  studentEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  submissionStatus: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  attemptCount: {
    fontSize: 11,
    marginTop: 2,
  },
  expandedContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  attemptLabel: {
    fontSize: 13,
  },
  attemptsList: {
    marginBottom: Spacing.md,
  },
  attemptsTitle: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  attemptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  attemptText: {
    fontSize: 13,
    flex: 1,
  },
  attemptScore: {
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: Spacing.md,
  },
  attemptDate: {
    fontSize: 11,
  },
  gradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  gradeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});