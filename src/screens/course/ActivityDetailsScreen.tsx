// src/screens/course/ActivityDetailsScreen.tsx
// Activity details screen with canvas-style design
// Supports three states: not-submitted, submitted, graded

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Activity, ActivityStatus } from '@/types';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';
import { CircularScore } from '@/components/shared/CircularScore';
import { ReminderPickerDialog, ReminderValue } from '@/components/shared/ReminderPickerDialog';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { formatDate } from './utils';
import { reminderApi, Reminder, formatOffsetLabel } from '@/services/reminders';

// Submission type icons - using valid Ionicons names
const submissionTypes = [
  { id: 'text', label: 'Text entry', icon: 'text' as const },
  { id: 'url', label: 'Website URL', icon: 'link' as const },
  { id: 'media', label: 'Media recording', icon: 'videocam' as const },
  { id: 'file', label: 'File upload', icon: 'document-attach' as const },
];

interface ActivityDetailsScreenProps {
  activity?: Activity;
  courseName?: string;
  canManage?: boolean;
  onClose?: () => void;
  onSubmit?: () => void;
  onViewSubmission?: () => void;
}

// Map API SubmissionStatus to UI ActivityStatus
function getActivityStatus(submission: Activity['my_submission']): ActivityStatus {
  if (!submission) return 'not-submitted';
  if (submission.status === 'graded') return 'graded';
  return 'submitted';
}

export function ActivityDetailsScreen({
  activity: propActivity,
  courseName,
  canManage = false,
  onClose,
  onSubmit,
  onViewSubmission,
}: ActivityDetailsScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();

  // In a real app, you would fetch the activity from API using activityId
  // For now, we use the prop or a placeholder
  const activity = propActivity;

  // Reminder state - fetch from API
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [reminderPickerVisible, setReminderPickerVisible] = useState(false);

  // Fetch reminders for this activity
  const fetchReminders = useCallback(async () => {
    if (!activity?.id) return;

    setRemindersLoading(true);
    try {
      const activityReminders = await reminderApi.getByActivity(activity.id);
      setReminders(activityReminders.filter(r => !r.notification_sent));
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setRemindersLoading(false);
    }
  }, [activity?.id]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // Derive status from submission data
  const status = useMemo(() => {
    return getActivityStatus(activity?.my_submission);
  }, [activity?.my_submission]);

  const hasSubmission = status !== 'not-submitted';
  const isGraded = status === 'graded';
  const isSubmitted = status === 'submitted';

  // Check if the deadline has passed
  const isPastDue = activity?.deadline ? new Date(activity.deadline) < new Date() : false;

  // Get submission data
  const submission = activity?.my_submission;

  const handleAddReminder = useCallback(async (reminderValue: ReminderValue) => {
    if (!activity?.id) return;

    try {
      const reminderData = {
        reminder_type: 'activity' as const,
        activity_id: activity.id,
        reminder_datetime: reminderValue.reminderDate.toISOString(),
        offset_minutes: reminderValue.value === 0 ? 0 : reminderValue.value,
      };

      const newReminder = await reminderApi.create(reminderData);
      if (newReminder) {
        setReminders((prev) => [...prev, newReminder]);
      }
    } catch (error) {
      console.error('Failed to create reminder:', error);
      Alert.alert('Error', 'Failed to create reminder. Please try again.');
    }
  }, [activity?.id]);

  const handleRemoveReminder = useCallback(async (reminderId: string) => {
    try {
      const success = await reminderApi.delete(reminderId);
      if (success) {
        setReminders((prev) => prev.filter((r) => r.id !== reminderId));
      }
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      Alert.alert('Error', 'Failed to remove reminder. Please try again.');
    }
  }, []);





  const formatReminderLabel = useCallback((reminder: Reminder) => {
    // Format the reminder datetime for display
    if (reminder.reminder_datetime) {
      const date = new Date(reminder.reminder_datetime);
      return formatDate(date.toISOString());
    }
    // Fallback to offset label
    return formatOffsetLabel(reminder.offset_minutes);
  }, []);

  const handleBack = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        router.back();
      }
    }
  }, [onClose, navigation, router]);

  const handleSubmitPress = useCallback(() => {
    if (onSubmit) {
      onSubmit();
    } else if (activity?.id) {
      // Navigate to submission screen
      router.push({
        pathname: '/(app)/submission/[id]' as any,
        params: { id: activity.id },
      });
    }
  }, [onSubmit, activity?.id, router]);

  const handleViewSubmission = useCallback(() => {
    if (onViewSubmission) {
      onViewSubmission();
    } else if (activity?.id) {
      router.push({
        pathname: '/(app)/submission/[id]' as any,
        params: { id: activity.id },
      });
    }
  }, [onViewSubmission, activity?.id, router]);

  const handleResubmit = useCallback(() => {
    Alert.alert(
      'Resubmit Assignment',
      'Are you sure you want to resubmit? Your previous submission will be replaced.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resubmit',
          style: 'destructive',
          onPress: () => {
            if (onSubmit) {
              onSubmit();
            } else if (activity?.id) {
              router.push({
                pathname: '/(app)/submission/[id]' as any,
                params: { id: activity.id, resubmit: 'true' },
              });
            }
          },
        },
      ]
    );
  }, [onSubmit, activity?.id, router]);

  const renderStatusBadge = () => {
    if (isGraded) {
      return (
        <View style={styles.statusRow}>
          <Text style={[styles.pointsText, { color: colors.textPrimary }]}>
            {activity?.points ?? 0} pts
          </Text>
          <View style={styles.gradedBadge}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.gradedText}>Graded</Text>
          </View>
        </View>
      );
    }

    if (isSubmitted) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <View style={[styles.statusDot, { backgroundColor: '#2563EB' }]} />
          <Text style={[styles.statusText, { color: '#1E40AF' }]}>Submitted</Text>
        </View>
      );
    }

    // Show "Past Due" badge if deadline has passed and not submitted
    if (isPastDue) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
          <View style={[styles.statusDot, { backgroundColor: '#DC2626' }]} />
          <Text style={[styles.statusText, { color: '#991B1B' }]}>Past Due</Text>
        </View>
      );
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }]}>
        <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
        <Text style={[styles.statusText, { color: '#92400E' }]}>Not submitted</Text>
      </View>
    );
  };

  const renderGradeCard = () => {
    if (!activity) return null;

    if (isGraded && submission) {
      return (
        <View style={[styles.gradeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.gradeCardHeader}>
            <Text style={[styles.gradeCardTitle, { color: colors.textPrimary }]}>Grade</Text>
            <TouchableOpacity style={styles.gradeCardLink} onPress={handleViewSubmission}>
              <Text style={styles.gradeCardLinkText}>Submission & Rubric</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.scoreContainer}>
            <CircularScore
              score={submission.score ?? 0}
              maxScore={activity.points}
              size={120}
              strokeWidth={6}
            />
            <View style={styles.scoreInfo}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                Out of {activity.points} pts
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (isSubmitted) {
      return (
        <View style={[styles.gradeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.gradeCardHeader}>
            <Text style={[styles.gradeCardTitle, { color: colors.textPrimary }]}>Grade</Text>
            <TouchableOpacity style={styles.gradeCardLink} onPress={handleViewSubmission}>
              <Text style={styles.gradeCardLinkText}>Submission & Rubric</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.submittedMessage}>
            <View style={styles.successIconContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.submittedTitle, { color: colors.textPrimary }]}>
                Successfully submitted!
              </Text>
            </View>
            <Text style={[styles.submittedSubtitle, { color: colors.textSecondary }]}>
              The submission is now waiting to be graded
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  const renderActionButtons = () => {
    if (hasSubmission) return null;

    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: Colors.primary }]}
          onPress={handleViewSubmission}
          activeOpacity={0.9}
        >
          <View style={styles.actionCardContent}>
            <Text style={styles.actionCardText}>Submission & Rubric</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionCardOutline,
            {
              borderColor: isPastDue ? colors.mutedForeground : Colors.primary,
              backgroundColor: isPastDue ? colors.muted : colors.surface,
            },
          ]}
          onPress={() => setReminderPickerVisible(true)}
          activeOpacity={0.9}
          disabled={isPastDue}
        >
          <View style={styles.actionCardContent}>
            <Text style={[styles.actionCardTextOutline, { color: isPastDue ? colors.mutedForeground : Colors.primary }]}>
              Add due date reminder
            </Text>
            <Ionicons name="chevron-forward" size={20} color={isPastDue ? colors.mutedForeground : Colors.primary} />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (!activity) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assignment Details</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Assignment not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Assignment Details</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {courseName || 'Course'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={[styles.titleSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.activityTitle, { color: colors.textPrimary }]}>{activity.title}</Text>
          {renderStatusBadge()}
        </View>

        {/* Grade Card */}
        {renderGradeCard()}

        {/* Action Buttons (for not submitted) */}
        {renderActionButtons()}

        {/* Info Sections */}
        <View style={styles.infoSection}>
          {/* Locked (submitted only) */}
          {isSubmitted && submission?.submitted_at && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>SUBMITTED</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {formatDate(submission.submitted_at)}
              </Text>
            </View>
          )}

          {/* Reminders */}
          {remindersLoading ? (
            <View style={styles.infoItem}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : reminders.length > 0 && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>REMINDERS</Text>
              <View style={styles.remindersList}>
                {reminders.map((reminder) => (
                  <View
                    key={reminder.id}
                    style={[styles.reminderItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <View style={styles.reminderContent}>
                      <Ionicons name="notifications" size={18} color={Colors.primary} />
                      <Text style={[styles.reminderText, { color: colors.textPrimary }]}>
                        {formatReminderLabel(reminder)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveReminder(reminder.id)}
                      style={styles.reminderRemove}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Due Date */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>DUE</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {activity.deadline ? formatDate(activity.deadline) : 'No due date'}
            </Text>
          </View>

          {/* Points */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>POINTS</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {activity.points} {activity.points === 1 ? 'point' : 'points'}
            </Text>
          </View>

          {/* Submission Types */}
          {activity.allowed_file_types && activity.allowed_file_types.length > 0 && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>SUBMISSION TYPES</Text>
              <View style={styles.submissionTypesList}>
                {submissionTypes.map((type) => (
                  <View key={type.id} style={styles.submissionTypeItem}>
                    <Ionicons name={type.icon} size={18} color={colors.textSecondary} />
                    <Text style={[styles.submissionTypeText, { color: colors.textPrimary }]}>{type.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          {activity.description && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>DESCRIPTION</Text>
              <Text style={[styles.descriptionText, { color: colors.textPrimary }]}>
                {activity.description}
              </Text>
            </View>
          )}

          {/* Instructions */}
          {activity.instructions && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>INSTRUCTIONS</Text>
              <Text style={[styles.descriptionText, { color: colors.textPrimary }]}>
                {activity.instructions}
              </Text>
            </View>
          )}

          {/* Allowed File Types */}
          {activity.allowed_file_types && activity.allowed_file_types.length > 0 && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>ALLOWED FILE TYPES</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {activity.allowed_file_types.join(', ')}
              </Text>
            </View>
          )}

          {/* Feedback (for graded) */}
          {isGraded && submission?.feedback && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>FEEDBACK</Text>
              <View style={[styles.feedbackCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.feedbackText, { color: colors.textPrimary }]}>
                  {submission.feedback}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Bottom padding for fixed button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      {!canManage && (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {isPastDue && !hasSubmission ? (
            <View style={[styles.closedButton, { backgroundColor: colors.muted }]}>
              <Ionicons name="time-outline" size={18} color="#FFFFFF" />
              <Text style={styles.closedButtonText}>Assignment Closed - Past Due</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: Colors.primary }]}
              onPress={hasSubmission ? handleResubmit : handleSubmitPress}
              activeOpacity={0.9}
            >
              <Text style={styles.submitButtonText}>
                {hasSubmission ? 'Resubmit Assignment' : 'Submit Assignment'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Reminder Picker Dialog */}
      <ReminderPickerDialog
        visible={reminderPickerVisible}
        onSelect={handleAddReminder}
        onClose={() => setReminderPickerVisible(false)}
        deadline={activity?.deadline ? new Date(activity.deadline) : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? Spacing.sm : Spacing.xl,
    paddingBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
  },
  titleSection: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  activityTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.md,
    lineHeight: 28,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pointsText: {
    fontSize: 15,
    fontWeight: '600',
  },
  gradedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradedText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  gradeCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    ...Shadows.card,
  },
  gradeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  gradeCardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  gradeCardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  gradeCardLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 15,
  },
  submittedMessage: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  successIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  successIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittedTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  submittedSubtitle: {
    fontSize: 14,
  },
  actionButtons: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  actionCardOutline: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    ...Shadows.sm,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionCardText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionCardTextOutline: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoSection: {
    gap: Spacing.xl,
  },
  infoItem: {
    gap: Spacing.sm,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  submissionTypesList: {
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  submissionTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  submissionTypeText: {
    fontSize: 15,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
  },
  feedbackCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 15,
    lineHeight: 22,
  },
  remindersList: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  reminderText: {
    fontSize: 15,
    fontWeight: '500',
  },
  reminderRemove: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xxl : Spacing.lg,
  },
  submitButton: {
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closedButton: {
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  closedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ActivityDetailsScreen;