// src/screens/course/ActivitySubmissionScreen.tsx
// Submission details screen with immediate file preview and tab-triggered modal
// Supports: attempts dropdown, comments, files, rubric tabs in slide-up modal

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Modal,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/contexts/ThemeContext';
import { Activity, Submission } from '@/types';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, resolveBackendFileUrl, isImageFile } from './utils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.7;

interface ActivitySubmissionScreenProps {
  activity?: Activity;
  submission?: Submission;
  courseName?: string;
  onClose?: () => void;
  onBack?: () => void;
}

type TabType = 'comments' | 'files' | 'rubric';

// File type helpers
const getFileIcon = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) return 'document-text';
  if (['doc', 'docx'].includes(ext)) return 'document';
  if (['ppt', 'pptx'].includes(ext)) return 'easel';
  if (['xls', 'xlsx'].includes(ext)) return 'grid';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'videocam';
  if (['mp3', 'wav', 'aac', 'm4a', 'ogg'].includes(ext)) return 'musical-notes';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  return 'document-attach';
};

const isPdfFile = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ext === 'pdf';
};

const isPreviewable = (fileName: string): boolean => {
  return isImageFile(fileName) || isPdfFile(fileName);
};

const getFileTypeLabel = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) return 'PDF';
  if (['doc', 'docx'].includes(ext)) return 'Word';
  if (['ppt', 'pptx'].includes(ext)) return 'PowerPoint';
  if (['xls', 'xlsx'].includes(ext)) return 'Excel';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'].includes(ext)) return 'Image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'Video';
  if (['mp3', 'wav', 'aac', 'm4a', 'ogg'].includes(ext)) return 'Audio';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Archive';
  return 'File';
};

export function ActivitySubmissionScreen({
  activity,
  submission: propSubmission,
  courseName,
  onClose,
  onBack,
}: ActivitySubmissionScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  const [activeTab, setActiveTab] = useState<TabType>('files');
  const [modalVisible, setModalVisible] = useState(false);
  const modalAnimation = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const [showAttemptsDropdown, setShowAttemptsDropdown] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  // Get submission data
  const submission = propSubmission || activity?.my_submission;
  const files = submission?.file_urls || [];
  const score = submission?.score;
  const feedback = submission?.feedback;
  const submittedAt = submission?.submitted_at;
  const isGraded = submission?.status === 'graded';

  // Resolve file URLs
  const resolvedFiles = useMemo(() => {
    return files.map(url => ({
      original: url,
      resolved: resolveBackendFileUrl(url),
      fileName: url.split('/').pop() || 'file',
    }));
  }, [files]);

  // Find first previewable file
  const firstPreviewableIndex = useMemo(() => {
    return resolvedFiles.findIndex(f => isPreviewable(f.fileName));
  }, [resolvedFiles]);

  // Current preview file
  const currentFile = resolvedFiles[currentPreviewIndex];
  const previewFileName = currentFile?.fileName || '';
  const previewFileUrl = currentFile?.resolved || null;

  // Animation for modal
  const openModal = useCallback(() => {
    setModalVisible(true);
    Animated.spring(modalAnimation, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [modalAnimation]);

  const closeModal = useCallback(() => {
    Animated.timing(modalAnimation, {
      toValue: MODAL_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
    });
  }, [modalAnimation]);

  const handleBack = useCallback(() => {
    if (onClose) {
      onClose();
    } else if (onBack) {
      onBack();
    }
  }, [onClose, onBack]);

  const handleTabPress = useCallback((tab: TabType) => {
    setActiveTab(tab);
    openModal();
  }, [openModal]);

  const handleFileSelect = useCallback((index: number) => {
    const file = resolvedFiles[index];
    if (file && isPreviewable(file.fileName)) {
      setCurrentPreviewIndex(index);
      setPreviewLoading(true);
      closeModal();
    }
  }, [resolvedFiles, closeModal]);

  // Render file preview in main content area
  const renderMainPreview = () => {
    if (resolvedFiles.length === 0) {
      return (
        <View style={styles.noFilesContainer}>
          <Ionicons name="document-attach" size={80} color={colors.mutedForeground} />
          <Text style={[styles.noFilesText, { color: colors.textSecondary }]}>
            No files submitted
          </Text>
        </View>
      );
    }

    if (!previewFileUrl || !isPreviewable(previewFileName)) {
      return (
        <View style={styles.noPreviewContainer}>
          <Ionicons name="document-attach" size={80} color={colors.mutedForeground} />
          <Text style={[styles.noPreviewText, { color: colors.textSecondary }]}>
            Preview not available for this file type
          </Text>
          <Text style={[styles.fileNameText, { color: colors.textPrimary }]}>
            {previewFileName}
          </Text>
        </View>
      );
    }

    if (isImageFile(previewFileName)) {
      return (
        <View style={styles.previewWrapper}>
          <Image
            source={{ uri: previewFileUrl }}
            style={styles.imagePreview}
            contentFit="contain"
            transition={200}
            onLoadStart={() => setPreviewLoading(true)}
            onLoadEnd={() => setPreviewLoading(false)}
          />
          {previewLoading && (
            <View style={styles.previewLoader}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
        </View>
      );
    }

    if (isPdfFile(previewFileName)) {
      return (
        <View style={styles.previewWrapper}>
          <WebView
            source={{ uri: previewFileUrl }}
            style={styles.pdfPreview}
          />
          {previewLoading && (
            <View style={styles.previewLoader}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
        </View>
      );
    }

    return null;
  };

  // Modal content
  const renderModalContent = () => {
    const filesCount = resolvedFiles.length;
    const commentsCount = feedback ? 1 : 0;
    const rubricCount = activity?.points && activity.points > 0 ? 1 : 0;

    return (
      <Animated.View
        style={[
          styles.modalContainer,
          {
            backgroundColor: colors.surface,
            transform: [{ translateY: modalAnimation }],
          },
        ]}
      >
        {/* Drag Handle */}
        <View style={styles.modalHeader}>
          <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tab Buttons */}
        <View style={[styles.tabButtons, { borderBottomColor: colors.border }]}>
          {(['files', 'comments', 'rubric'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            const count = tab === 'files' ? filesCount : tab === 'comments' ? commentsCount : rubricCount;

            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  isActive && { borderBottomColor: Colors.primary },
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: isActive ? Colors.primary : colors.textSecondary },
                  ]}
                >
                  {tab.toUpperCase()}
                  {count > 0 && ` (${count})`}
                </Text>
                {isActive && (
                  <View style={[styles.tabIndicator, { backgroundColor: Colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Files Tab */}
          {activeTab === 'files' && (
            <View style={styles.tabSection}>
              {resolvedFiles.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="document-outline" size={48} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No files submitted
                  </Text>
                </View>
              ) : (
                resolvedFiles.map((file, index) => {
                  const isImage = isImageFile(file.fileName);
                  const previewable = isPreviewable(file.fileName);

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.fileItem,
                        { backgroundColor: colors.background, borderColor: colors.border },
                        currentPreviewIndex === index && { borderColor: Colors.primary, borderWidth: 2 },
                      ]}
                      onPress={() => previewable && handleFileSelect(index)}
                      activeOpacity={0.9}
                    >
                      <View style={styles.fileIcon}>
                        <Ionicons
                          name={getFileIcon(file.fileName) as any}
                          size={28}
                          color={Colors.primary}
                        />
                      </View>
                      <View style={styles.fileInfo}>
                        <Text
                          style={[styles.fileName, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {file.fileName}
                        </Text>
                        <Text style={[styles.fileType, { color: colors.textSecondary }]}>
                          {getFileTypeLabel(file.fileName)}
                        </Text>
                      </View>
                      {previewable && (
                        <Ionicons name="eye" size={20} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          {/* Comments/Feedback Tab */}
          {activeTab === 'comments' && (
            <View style={styles.tabSection}>
              {!feedback ? (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubble-outline" size={48} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No feedback yet
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.feedbackCard,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.feedbackHeader}>
                    <View style={styles.feedbackAvatar}>
                      <Text style={styles.feedbackAvatarText}>T</Text>
                    </View>
                    <View style={styles.feedbackMeta}>
                      <Text style={[styles.feedbackAuthor, { color: colors.textPrimary }]}>
                        Teacher Feedback
                      </Text>
                      <Text style={[styles.feedbackDate, { color: colors.textSecondary }]}>
                        {formatDate(submittedAt)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.feedbackText, { color: colors.textPrimary }]}>
                    {feedback}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Rubric Tab */}
          {activeTab === 'rubric' && (
            <View style={styles.tabSection}>
              {!activity?.points ? (
                <View style={styles.emptyState}>
                  <Ionicons name="list-outline" size={48} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No rubric available
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.rubricCard,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.rubricHeader}>
                    <Text style={[styles.rubricTitle, { color: colors.textPrimary }]}>
                      Grade
                    </Text>
                    <Text style={[styles.rubricScore, { color: Colors.primary }]}>
                      {score !== undefined && score !== null ? score : '-'} / {activity.points} pts
                    </Text>
                  </View>

                  {score !== undefined && score !== null && (
                    <View style={styles.scoreBarContainer}>
                      <View style={[styles.scoreBar, { backgroundColor: colors.border }]}>
                        <View
                          style={[
                            styles.scoreBarFill,
                            {
                              backgroundColor: Colors.primary,
                              width: `${Math.min((score / activity.points) * 100, 100)}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.scorePercentage, { color: colors.textSecondary }]}>
                        {Math.round((score / activity.points) * 100)}%
                      </Text>
                    </View>
                  )}

                  {activity.class_stats && (
                    <View style={[styles.classStats, { borderTopColor: colors.border }]}>
                      <Text style={[styles.classStatsTitle, { color: colors.textSecondary }]}>
                        Class Statistics
                      </Text>
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                            {activity.class_stats.highest_score ?? '-'}
                          </Text>
                          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                            High
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                            {activity.class_stats.average_score?.toFixed(1) ?? '-'}
                          </Text>
                          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                            Avg
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                            {activity.class_stats.lowest_score ?? '-'}
                          </Text>
                          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                            Low
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    );
  };

  // Render bottom tab buttons
  const renderBottomTab = (tab: TabType) => {
    const filesCount = resolvedFiles.length;
    const commentsCount = feedback ? 1 : 0;
    const rubricCount = activity?.points && activity.points > 0 ? 1 : 0;
    const count = tab === 'files' ? filesCount : tab === 'comments' ? commentsCount : rubricCount;

    const icon = tab === 'files'
      ? 'document-outline'
      : tab === 'comments'
        ? 'chatbubble-outline'
        : 'list-outline';

    return (
      <TouchableOpacity
        key={tab}
        style={styles.bottomTabButton}
        onPress={() => handleTabPress(tab)}
      >
        <Ionicons
          name={icon}
          size={20}
          color={colors.textSecondary}
        />
        <Text style={[styles.bottomTabText, { color: colors.textSecondary }]}>
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
          {count > 0 && ` ${count}`}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submission</Text>
        {isGraded && score !== undefined && score !== null && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {score} / {activity?.points} pts
            </Text>
          </View>
        )}
      </View>

      {/* Attempt Info */}
      {submittedAt && (
        <View
          style={[
            styles.attemptInfo,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.attemptLabel, { color: colors.textPrimary }]}>
            Submitted
          </Text>
          <Text style={[styles.attemptDate, { color: colors.textSecondary }]}>
            {formatDate(submittedAt)}
          </Text>
        </View>
      )}

      {/* Main Content - File Preview */}
      <View style={styles.mainContent}>{renderMainPreview()}</View>

      {/* Bottom Tab Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {(['files', 'comments', 'rubric'] as TabType[]).map(renderBottomTab)}
      </View>

      {/* Tab Modal - Only visible when triggered */}
      {modalVisible && (
        <Modal
          visible={modalVisible}
          transparent
          animationType="none"
          onRequestClose={closeModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeModal}
          >
            {renderModalContent()}
          </TouchableOpacity>
        </Modal>
      )}
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
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  attemptInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  attemptLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  attemptDate: {
    fontSize: 13,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  imagePreview: {
    flex: 1,
    width: '100%',
  },
  pdfPreview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  previewLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  noFilesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  noFilesText: {
    fontSize: 16,
    marginTop: Spacing.lg,
  },
  noPreviewContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: 'transparent',
  },
  noPreviewText: {
    fontSize: 16,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  fileNameText: {
    fontSize: 14,
    marginTop: Spacing.md,
    fontWeight: '500',
  },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: Spacing.sm,
  },
  bottomTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  bottomTabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: MODAL_HEIGHT,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    ...Shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    position: 'relative',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
  },
  closeButton: {
    position: 'absolute',
    right: Spacing.lg,
    top: Spacing.md,
    padding: Spacing.xs,
  },
  tabButtons: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  tabSection: {
    gap: Spacing.md,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileType: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: 15,
    marginTop: Spacing.md,
  },
  feedbackCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  feedbackAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  feedbackAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  feedbackMeta: {
    flex: 1,
  },
  feedbackAuthor: {
    fontSize: 15,
    fontWeight: '600',
  },
  feedbackDate: {
    fontSize: 12,
    marginTop: 2,
  },
  feedbackText: {
    fontSize: 15,
    lineHeight: 22,
  },
  rubricCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  rubricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  rubricTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  rubricScore: {
    fontSize: 20,
    fontWeight: '700',
  },
  scoreBarContainer: {
    marginBottom: Spacing.lg,
  },
  scoreBar: {
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  scorePercentage: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  classStats: {
    borderTopWidth: 1,
    paddingTop: Spacing.lg,
  },
  classStatsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default ActivitySubmissionScreen;