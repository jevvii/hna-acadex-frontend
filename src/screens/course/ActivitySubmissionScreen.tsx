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
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/contexts/ThemeContext';
import { Activity, Submission, ActivityComment } from '@/types';
import { activityCommentsApi } from '@/services/activityComments';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, resolveBackendFileUrl, isImageFile } from './utils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.7;

interface SelectedAttachment {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

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

  // Comments state
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<SelectedAttachment[]>([]);

  // Attachment picker handlers
  const showAttachmentOptions = () => {
    Alert.alert(
      'Add Attachment',
      'Choose a file type',
      [
        { text: 'Image', onPress: pickImage },
        { text: 'Document', onPress: pickDocument },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please grant gallery access to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newAttachments: SelectedAttachment[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `image-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        size: (asset as any).fileSize,
      }));
      setSelectedAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newAttachments: SelectedAttachment[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size,
      }));
      setSelectedAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (index: number) => {
    setSelectedAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Fetch comments when activity changes
  useEffect(() => {
    const fetchComments = async () => {
      if (!activity?.id) return;
      setCommentsLoading(true);
      try {
        const data = await activityCommentsApi.getByActivity(activity.id);
        setComments(data);
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setCommentsLoading(false);
      }
    };
    fetchComments();
  }, [activity?.id]);

  // Submit a new comment
  const handleSubmitComment = useCallback(async () => {
    if ((!commentText.trim() && selectedAttachments.length === 0) || submittingComment) return;
    if (!activity?.id) return;

    setSubmittingComment(true);
    try {
      // Prepare files for upload
      const files = selectedAttachments.map((att) => ({
        uri: att.uri,
        name: att.name,
        type: att.mimeType,
      }));

      const newComment = await activityCommentsApi.create(
        {
          activity_id: activity.id,
          content: commentText.trim() || undefined,
        },
        files.length > 0 ? files as any : undefined
      );
      if (newComment) {
        setComments(prev => [newComment, ...prev]);
        setCommentText('');
        setSelectedAttachments([]);
        Keyboard.dismiss();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  }, [activity?.id, commentText, submittingComment, selectedAttachments]);

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
    const commentsCount = (feedback ? 1 : 0) + comments.length;
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
        <View style={styles.modalContent}>
          {/* Files Tab */}
          {activeTab === 'files' && (
            <ScrollView style={styles.filesScroll} showsVerticalScrollIndicator={false}>
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
            </ScrollView>
          )}

          {/* Comments/Feedback Tab */}
          {activeTab === 'comments' && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.commentsTabContainer}
            >
              {/* Comments List */}
              <ScrollView
                style={styles.commentsList}
                contentContainerStyle={styles.commentsListContent}
                showsVerticalScrollIndicator={false}
              >
                {commentsLoading ? (
                  <View style={styles.emptyState}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      Loading comments...
                    </Text>
                  </View>
                ) : comments.length === 0 && !feedback ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="chatbubble-outline" size={48} color={colors.mutedForeground} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      No comments yet
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Teacher Feedback */}
                    {feedback && (
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
                    {/* Student Comments */}
                    {comments.map((comment) => (
                      <View
                        key={comment.id}
                        style={[
                          styles.commentCard,
                          { backgroundColor: colors.background, borderColor: colors.border },
                        ]}
                      >
                        <View style={styles.commentHeader}>
                          <View style={styles.commentAvatar}>
                            <Text style={styles.commentAvatarText}>
                              {comment.author_name?.charAt(0)?.toUpperCase() || 'S'}
                            </Text>
                          </View>
                          <View style={styles.commentMeta}>
                            <Text style={[styles.commentAuthor, { color: colors.textPrimary }]}>
                              {comment.author_name || 'Student'}
                            </Text>
                            <Text style={[styles.commentDate, { color: colors.textSecondary }]}>
                              {formatDate(comment.created_at)}
                            </Text>
                          </View>
                        </View>
                        {comment.content && (
                          <Text style={[styles.commentText, { color: colors.textPrimary }]}>
                            {comment.content}
                          </Text>
                        )}
                        {comment.file_urls && comment.file_urls.length > 0 && (
                          <View style={styles.commentFiles}>
                            {comment.file_urls.map((url, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={styles.commentFileLink}
                                onPress={() => {
                                  // Open file in browser or preview
                                }}
                              >
                                <Ionicons name="document-attach" size={14} color={Colors.primary} />
                                <Text style={styles.commentFileText}>
                                  {url.split('/').pop()}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>

              {/* Comment Input - Fixed at bottom */}
              {!isTeacher && (
                <View
                  style={[
                    styles.commentInputContainer,
                    { backgroundColor: colors.surface, borderTopColor: colors.border },
                  ]}
                >
                  {/* Selected Attachments Preview */}
                  {selectedAttachments.length > 0 && (
                    <ScrollView
                      horizontal
                      style={styles.attachmentsPreview}
                      contentContainerStyle={styles.attachmentsPreviewContent}
                      showsHorizontalScrollIndicator={false}
                    >
                      {selectedAttachments.map((att, idx) => (
                        <View
                          key={idx}
                          style={[styles.attachmentPreviewItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                        >
                          <Ionicons
                            name={isImageFile(att.name) ? 'image' : 'document'}
                            size={14}
                            color={Colors.primary}
                          />
                          <Text style={styles.attachmentPreviewName} numberOfLines={1}>
                            {att.name}
                          </Text>
                          <TouchableOpacity
                            style={styles.attachmentRemoveBtn}
                            onPress={() => removeAttachment(idx)}
                          >
                            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                  <View style={styles.inputRow}>
                    <TouchableOpacity
                      style={styles.attachButton}
                      onPress={showAttachmentOptions}
                    >
                      <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.commentInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
                      placeholder="Add a comment..."
                      placeholderTextColor={colors.textSecondary}
                      value={commentText}
                      onChangeText={setCommentText}
                      multiline
                      maxLength={1000}
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        (!commentText.trim() && selectedAttachments.length === 0) && styles.sendButtonDisabled,
                        submittingComment && styles.sendButtonDisabled,
                      ]}
                      onPress={handleSubmitComment}
                      disabled={(!commentText.trim() && selectedAttachments.length === 0) || submittingComment}
                    >
                      <Ionicons
                        name="send"
                        size={20}
                        color={(!commentText.trim() && selectedAttachments.length === 0) || submittingComment ? colors.mutedForeground : '#FFFFFF'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </KeyboardAvoidingView>
          )}

          {/* Rubric Tab */}
          {activeTab === 'rubric' && (
            <ScrollView style={styles.rubricScroll} showsVerticalScrollIndicator={false}>
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
            </ScrollView>
          )}
        </View>
      </Animated.View>
    );
  };

  // Render bottom tab buttons
  const renderBottomTab = (tab: TabType) => {
    const filesCount = resolvedFiles.length;
    const commentsCount = (feedback ? 1 : 0) + comments.length;
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
  filesScroll: {
    flex: 1,
  },
  rubricScroll: {
    flex: 1,
  },
  tabSection: {
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
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
  // Comments styles
  commentsTabContainer: {
    flex: 1,
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  commentCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  commentAvatarText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  commentMeta: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentDate: {
    fontSize: 11,
    marginTop: 2,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentFiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  commentFileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.sm,
  },
  commentFileText: {
    fontSize: 12,
    color: Colors.primary,
  },
  commentInputContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  attachmentsPreview: {
    maxHeight: 60,
    marginBottom: Spacing.xs,
  },
  attachmentsPreviewContent: {
    gap: Spacing.xs,
  },
  attachmentPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    maxWidth: 150,
  },
  attachmentPreviewName: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  attachmentRemoveBtn: {
    padding: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachButton: {
    padding: Spacing.xs,
    marginRight: Spacing.xs,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    fontSize: 14,
  },
  sendButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  sendButtonDisabled: {
    backgroundColor: 'transparent',
  },
});

export default ActivitySubmissionScreen;