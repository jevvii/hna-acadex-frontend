// src/screens/course/QuizDetailsScreen.tsx
// Quiz details screen with canvas-style design (mirrors ActivityDetailsScreen)
// Supports multiple states: not-started, in-progress, completed, closed

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
import { Quiz } from '@/types';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';
import { CircularScore } from '@/components/shared/CircularScore';
import { useRouter, useNavigation } from 'expo-router';
import { formatDate } from './utils';

type QuizActionVariant = 'start' | 'resume' | 'retry' | 'result' | 'closed';

type QuizActionConfig = {
  label: string;
  disabled: boolean;
  variant: QuizActionVariant;
  onPress: () => void;
};

// Darker matte blue for quiz cards and buttons
const QUIZ_ACTION_STYLES: Record<
  QuizActionVariant,
  {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    badgeBackground: string;
    badgeText: string;
  }
> = {
  start: {
    backgroundColor: '#1E3A5F', // Dark navy blue - matte/flat
    borderColor: '#2D4A6F',
    textColor: '#FFFFFF',
    badgeBackground: 'rgba(255,255,255,0.15)',
    badgeText: '#E0E7EF',
  },
  resume: {
    backgroundColor: '#1E3A5F', // Same dark blue for consistency
    borderColor: '#2D4A6F',
    textColor: '#FFFFFF',
    badgeBackground: 'rgba(255,255,255,0.15)',
    badgeText: '#E0E7EF',
  },
  retry: {
    backgroundColor: '#1E3A5F', // Same dark blue
    borderColor: '#2D4A6F',
    textColor: '#FFFFFF',
    badgeBackground: 'rgba(255,255,255,0.15)',
    badgeText: '#E0E7EF',
  },
  result: {
    backgroundColor: '#334155',
    borderColor: '#475569',
    textColor: '#FFFFFF',
    badgeBackground: 'rgba(255,255,255,0.15)',
    badgeText: '#F8FAFC',
  },
  closed: {
    backgroundColor: '#64748B',
    borderColor: '#94A3B8',
    textColor: '#F8FAFC',
    badgeBackground: 'rgba(255,255,255,0.2)',
    badgeText: '#F8FAFC',
  },
};

interface QuizDetailsScreenProps {
  quiz?: Quiz;
  courseName?: string;
  quizStats?: any;
  onClose?: () => void;
  onStart?: () => void;
  onResume?: () => void;
  onViewResult?: () => void;
}

export function QuizDetailsScreen({
  quiz: propQuiz,
  courseName,
  quizStats,
  onClose,
  onStart,
  onResume,
  onViewResult,
}: QuizDetailsScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();

  const quiz = propQuiz;

  // Derive quiz status
  const quizStatus = useMemo(() => {
    if (!quiz) return 'closed';
    const now = new Date();
    const openAt = quiz.open_at ? new Date(quiz.open_at) : null;
    const closeAt = quiz.close_at ? new Date(quiz.close_at) : null;
    const myAttempt = quiz.my_attempt;

    // Check if closed
    if (closeAt && now > closeAt) return 'closed';

    // Check if not yet open
    if (openAt && now < openAt) return 'not-open';

    // Check if has completed attempts
    if (myAttempt?.attempts_used && myAttempt.attempts_used >= (quiz.attempt_limit || 1)) {
      return 'completed';
    }

    // Check if in progress (has attempt but not completed)
    if (myAttempt?.attempts_used && myAttempt.attempts_used > 0 && !myAttempt.score) {
      return 'in-progress';
    }

    // Check if has score (completed)
    if (myAttempt?.score !== null && myAttempt?.score !== undefined) {
      return 'completed';
    }

    return 'available';
  }, [quiz]);

  const isPastDue = quiz?.close_at ? new Date(quiz.close_at) < new Date() : false;
  const hasScore = quiz?.my_attempt?.score !== null && quiz?.my_attempt?.score !== undefined;
  const attemptsUsed = quiz?.my_attempt?.attempts_used ?? 0;
  const attemptsLimit = quiz?.attempt_limit ?? 1;
  const hasAttemptsLeft = attemptsUsed < attemptsLimit;

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

  // Get action configuration
  const getQuizAction = useCallback((): QuizActionConfig => {
    if (!quiz) {
      return { label: 'Unavailable', disabled: true, variant: 'closed', onPress: () => {} };
    }

    const now = new Date();
    const openAt = quiz.open_at ? new Date(quiz.open_at) : null;
    const closeAt = quiz.close_at ? new Date(quiz.close_at) : null;

    // Check if closed
    if (closeAt && now > closeAt) {
      return {
        label: 'Closed',
        disabled: true,
        variant: 'closed',
        onPress: () => {},
      };
    }

    // Check if not yet open
    if (openAt && now < openAt) {
      return {
        label: `Opens ${formatDate(quiz.open_at!)}`,
        disabled: true,
        variant: 'closed',
        onPress: () => {},
      };
    }

    // Check if in progress (has attempt but no score)
    const hasInProgressAttempt = attemptsUsed > 0 && !hasScore;

    if (hasInProgressAttempt) {
      return {
        label: 'Resume Quiz',
        disabled: false,
        variant: 'resume',
        onPress: () => onResume?.(),
      };
    }

    // Check if has completed attempts
    if (hasScore) {
      if (hasAttemptsLeft) {
        return {
          label: 'Try Again',
          disabled: false,
          variant: 'retry',
          onPress: () => onStart?.(),
        };
      }
      return {
        label: 'View Result',
        disabled: false,
        variant: 'result',
        onPress: () => onViewResult?.(),
      };
    }

    // Available to start
    return {
      label: 'Start Quiz',
      disabled: false,
      variant: 'start',
      onPress: () => onStart?.(),
    };
  }, [quiz, attemptsUsed, hasScore, hasAttemptsLeft, onStart, onResume, onViewResult]);

  const action = getQuizAction();
  const actionStyle = QUIZ_ACTION_STYLES[action.variant];

  const renderStatusBadge = () => {
    if (!quiz) return null;

    if (isPastDue) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
          <View style={[styles.statusDot, { backgroundColor: '#DC2626' }]} />
          <Text style={[styles.statusText, { color: '#991B1B' }]}>Closed</Text>
        </View>
      );
    }

    if (hasScore) {
      return (
        <View style={styles.statusRow}>
          <Text style={[styles.pointsText, { color: colors.textPrimary }]}>
            {quiz.my_attempt?.score ?? 0} / {quiz.my_attempt?.max_score ?? quiz.points ?? 0} pts
          </Text>
          <View style={styles.gradedBadge}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.gradedText}>Completed</Text>
          </View>
        </View>
      );
    }

    if (attemptsUsed > 0 && !hasScore) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }]}>
          <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.statusText, { color: '#92400E' }]}>In Progress</Text>
        </View>
      );
    }

    const openAt = quiz.open_at ? new Date(quiz.open_at) : null;
    const now = new Date();

    if (openAt && now < openAt) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <View style={[styles.statusDot, { backgroundColor: '#2563EB' }]} />
          <Text style={[styles.statusText, { color: '#1E40AF' }]}>Upcoming</Text>
        </View>
      );
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
        <View style={[styles.statusDot, { backgroundColor: '#16A34A' }]} />
        <Text style={[styles.statusText, { color: '#166534' }]}>Available</Text>
      </View>
    );
  };

  const renderGradeCard = () => {
    if (!quiz) return null;

    if (hasScore) {
      return (
        <View style={[styles.gradeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.gradeCardHeader}>
            <Text style={[styles.gradeCardTitle, { color: colors.textPrimary }]}>Your Score</Text>
            <TouchableOpacity style={styles.gradeCardLink} onPress={() => onViewResult?.()}>
              <Text style={styles.gradeCardLinkText}>View Details</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.scoreContainer}>
            <CircularScore
              score={quiz.my_attempt?.score ?? 0}
              maxScore={quiz.my_attempt?.max_score ?? quiz.points ?? 0}
              size={120}
              strokeWidth={6}
            />
            <View style={styles.scoreInfo}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                Attempt {attemptsUsed} of {attemptsLimit}
              </Text>
              {quizStats?.class_stats && (
                <>
                  <Text style={[styles.scoreSublabel, { color: colors.mutedForeground }]}>
                    Class Average: {quizStats.class_stats.average_score ?? '-'}
                  </Text>
                  <Text style={[styles.scoreSublabel, { color: colors.mutedForeground }]}>
                    Range: {quizStats.class_stats.lowest_score ?? '-'} - {quizStats.class_stats.highest_score ?? '-'}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      );
    }

    if (attemptsUsed > 0 && !hasScore) {
      return (
        <View style={[styles.gradeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.gradeCardHeader}>
            <Text style={[styles.gradeCardTitle, { color: colors.textPrimary }]}>Progress</Text>
          </View>

          <View style={styles.submittedMessage}>
            <View style={styles.successIconContainer}>
              <View style={[styles.successIcon, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="time" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.submittedTitle, { color: colors.textPrimary }]}>
                In Progress
              </Text>
            </View>
            <Text style={[styles.submittedSubtitle, { color: colors.textSecondary }]}>
              Resume to continue your quiz
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  const renderActionButtons = () => {
    if (!quiz || hasScore) return null;

    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: actionStyle.backgroundColor, borderColor: actionStyle.borderColor }, action.disabled && { opacity: 0.55 }]}
          onPress={action.onPress}
          disabled={action.disabled}
          activeOpacity={0.9}
        >
          <View style={styles.actionCardContent}>
            <Text style={[styles.actionCardText, { color: actionStyle.textColor }]}>{action.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={actionStyle.textColor} />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (!quiz) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz Details</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Quiz not found
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
          <Text style={styles.headerTitle}>Quiz Details</Text>
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
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: actionStyle.backgroundColor }]}>
          <Text style={styles.heroTitle}>{quiz.title}</Text>
          <View style={styles.heroMetaRow}>
            <View style={[styles.heroBadge, { backgroundColor: actionStyle.badgeBackground }]}>
              <Text style={[styles.heroBadgeText, { color: actionStyle.badgeText }]}>
                {action.label}
              </Text>
            </View>
            <View style={[styles.heroBadge, { backgroundColor: actionStyle.badgeBackground }]}>
              <Ionicons name="repeat" size={12} color={actionStyle.badgeText} />
              <Text style={[styles.heroBadgeText, { color: actionStyle.badgeText }]}>
                {attemptsUsed}/{attemptsLimit}
              </Text>
            </View>
            {quiz.time_limit_minutes && (
              <View style={[styles.heroBadge, { backgroundColor: actionStyle.badgeBackground }]}>
                <Ionicons name="timer-outline" size={12} color={actionStyle.badgeText} />
                <Text style={[styles.heroBadgeText, { color: actionStyle.badgeText }]}>
                  {quiz.time_limit_minutes}m
                </Text>
              </View>
            )}
          </View>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaText}>Opens: {quiz.open_at ? formatDate(quiz.open_at) : 'Immediately'}</Text>
            <Text style={styles.heroMetaText}>Closes: {quiz.close_at ? formatDate(quiz.close_at) : 'No close date'}</Text>
          </View>
        </View>

        {/* Grade Card */}
        {renderGradeCard()}

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Info Sections */}
        <View style={styles.infoSection}>
          {/* Instructions */}
          {quiz.instructions && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>INSTRUCTIONS</Text>
              <Text style={[styles.descriptionText, { color: colors.textPrimary }]}>
                {quiz.instructions}
              </Text>
            </View>
          )}

          {/* Points */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>POINTS</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {(quiz.points ?? quizStats?.max_score ?? quiz.my_attempt?.max_score ?? 0)} {((quiz.points ?? quizStats?.max_score ?? quiz.my_attempt?.max_score ?? 0) === 1) ? 'point' : 'points'}
            </Text>
          </View>

          {/* Questions */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>QUESTIONS</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {(
                quiz.question_count ??
                quiz.questions?.length ??
                quizStats?.question_count ??
                quizStats?.questions?.length ??
                (quizStats?.answers?.length ?? 0)
              )} questions
            </Text>
          </View>

          {/* Time Limit */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>TIME LIMIT</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} minutes` : 'No time limit'}
            </Text>
          </View>

          {/* Attempts */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>ATTEMPTS</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {attemptsUsed} of {attemptsLimit} used
            </Text>
          </View>

          {/* Attempt History - show when there are attempts */}
          {(() => {
            // Show attempt history if available
            if (quizStats?.attempts && quizStats.attempts.length > 0) {
              // Find the attempt with the highest score for highlighting
              const attemptsWithScores = quizStats.attempts.filter((a: any) => a.score !== null && a.score !== undefined);
              const highestScoreAttempt = attemptsWithScores.length > 0
                ? attemptsWithScores.reduce((max: any, a: any) => (a.score > max.score ? a : max), attemptsWithScores[0])
                : null;

              return (
                <View style={styles.infoItem}>
                  <View style={styles.attemptHistoryHeader}>
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>ATTEMPT HISTORY</Text>
                    <Text style={[styles.attemptHistoryNote, { color: colors.mutedForeground }]}>(Highest is recorded)</Text>
                  </View>
                  <View style={styles.attemptsList}>
                    {quizStats.attempts.map((attempt: any, index: number) => {
                      const isAutoSubmitted = attempt.auto_submitted || attempt.was_auto_submitted;
                      const hasScore = attempt.score !== null && attempt.score !== undefined;
                      const isPending = attempt.pending_manual_grading;
                      const isHighest = highestScoreAttempt && attempt.attempt_number === highestScoreAttempt.attempt_number;

                      return (
                        <View
                          key={attempt.attempt_number || attempt.id || index}
                          style={[
                            styles.attemptRow,
                            {
                              backgroundColor: isHighest ? 'rgba(34, 197, 94, 0.08)' : colors.background,
                              borderColor: isHighest ? Colors.success : colors.border,
                              borderWidth: isHighest ? 1 : 0,
                              borderRadius: isHighest ? Radius.md : 0,
                              paddingHorizontal: isHighest ? Spacing.sm : 0,
                              paddingVertical: isHighest ? Spacing.md : Spacing.sm,
                            },
                          ]}
                        >
                          <View style={styles.attemptRowLeft}>
                            <View style={styles.attemptRowTitleContainer}>
                              <Text style={[styles.attemptNumber, { color: colors.textPrimary }]}>
                                Attempt {attempt.attempt_number || index + 1}
                              </Text>
                              {isHighest && hasScore && (
                                <View style={styles.highestBadge}>
                                  <Ionicons name="trophy" size={12} color="#16A34A" />
                                  <Text style={styles.highestBadgeText}>Highest</Text>
                                </View>
                              )}
                            </View>
                            {isAutoSubmitted && (
                              <View style={styles.autoSubmitBadge}>
                                <Ionicons name="warning-outline" size={12} color="#B45309" />
                                <Text style={styles.autoSubmitText}>Auto-submitted</Text>
                              </View>
                            )}
                            {isPending && !hasScore && (
                              <Text style={styles.pendingText}>Pending grading</Text>
                            )}
                          </View>
                          <View style={styles.attemptRowRight}>
                            <Text style={[styles.attemptScore, { color: hasScore ? colors.textPrimary : colors.mutedForeground }]}>
                              {hasScore ? `${attempt.score} / ${attempt.max_score ?? quiz.points ?? 0}` : '—'}
                            </Text>
                            {(attempt.time_taken_seconds ?? attempt.duration_seconds) != null && (
                              <Text style={[styles.attemptTime, { color: colors.mutedForeground }]}>
                                {Math.floor((attempt.time_taken_seconds ?? attempt.duration_seconds) / 60)}m {(attempt.time_taken_seconds ?? attempt.duration_seconds) % 60}s
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            }

            // Show loading state if quizStats is not yet loaded but attempts were used
            if (!quizStats && attemptsUsed > 0) {
              return (
                <View style={styles.infoItem}>
                  <View style={styles.attemptHistoryHeader}>
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>ATTEMPT HISTORY</Text>
                    <Text style={[styles.attemptHistoryNote, { color: colors.mutedForeground }]}>(Highest is recorded)</Text>
                  </View>
                  <View style={styles.attemptsLoading}>
                    <ActivityIndicator size="small" color={colors.mutedForeground} />
                    <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading attempts...</Text>
                  </View>
                </View>
              );
            }

            // Show fallback when quizStats exists but attempts array is empty (API returned data but no history)
            if (quizStats && (!quizStats.attempts || quizStats.attempts.length === 0) && attemptsUsed > 0) {
              return (
                <View style={styles.infoItem}>
                  <View style={styles.attemptHistoryHeader}>
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>ATTEMPT HISTORY</Text>
                    <Text style={[styles.attemptHistoryNote, { color: colors.mutedForeground }]}>(Highest is recorded)</Text>
                  </View>
                  <Text style={[styles.noHistoryText, { color: colors.mutedForeground }]}>
                    {attemptsUsed} attempt{attemptsUsed !== 1 ? 's' : ''} recorded. Detailed history unavailable.
                  </Text>
                </View>
              );
            }

            // Show fallback when quizStats exists but attempts array is empty (API returned data but no history)
            if (quizStats && (!quizStats.attempts || quizStats.attempts.length === 0) && attemptsUsed > 0) {
              return (
                <View style={styles.infoItem}>
                  <View style={styles.attemptHistoryHeader}>
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>ATTEMPT HISTORY</Text>
                    <Text style={[styles.attemptHistoryNote, { color: colors.mutedForeground }]}>(Highest is recorded)</Text>
                  </View>
                  <Text style={[styles.noHistoryText, { color: colors.mutedForeground }]}>
                    {attemptsUsed} attempt{attemptsUsed !== 1 ? 's' : ''} recorded. Detailed history unavailable.
                  </Text>
                </View>
              );
            }

            return null;
          })()}
        </View>

        {/* Bottom padding for fixed button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {isPastDue && !hasAttemptsLeft ? (
          <View style={[styles.closedButton, { backgroundColor: colors.muted }]}>
            <Ionicons name="time-outline" size={18} color="#FFFFFF" />
            <Text style={styles.closedButtonText}>Quiz Closed</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: actionStyle.backgroundColor, borderColor: actionStyle.borderColor }, action.disabled && { opacity: 0.55 }]}
            onPress={action.onPress}
            disabled={action.disabled}
            activeOpacity={0.9}
          >
            <Text style={[styles.submitButtonText, { color: actionStyle.textColor }]}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
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
  heroCard: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.md,
    lineHeight: 28,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroMetaText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
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
  scoreSublabel: {
    fontSize: 13,
    marginTop: Spacing.xs,
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
    borderWidth: 2,
    ...Shadows.card,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionCardText: {
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
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
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
    borderWidth: 2,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
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
  attemptHistoryCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    ...Shadows.card,
  },
  attemptHistoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  attemptList: {
    gap: Spacing.sm,
  },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  attemptRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  attemptNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
  autoSubmitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  autoSubmitText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  pendingText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  attemptRowRight: {
    alignItems: 'flex-end',
  },
  attemptScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  attemptDuration: {
    fontSize: 12,
    marginTop: 2,
  },
  attemptHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  attemptHistoryNote: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  attemptsList: {
    gap: Spacing.xs,
  },
  attemptRowTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  highestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  highestBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  attemptTime: {
    fontSize: 12,
    marginTop: 2,
  },
  attemptsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  noHistoryText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
});

export default QuizDetailsScreen;