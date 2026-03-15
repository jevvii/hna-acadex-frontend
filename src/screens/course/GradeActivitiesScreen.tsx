// src/screens/course/GradeActivitiesScreen.tsx
// Grade Activities screen for teachers - redesigned with student-focused grading view
// Features: Progress tracking, submission preview, comments per student, quick grade chips

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, Submission, ActivityComment } from '@/types';
import { activityCommentsApi } from '@/services/activityComments';
import { api } from '@/lib/api';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';
import { resolveBackendFileUrl, isImageFile, fileNameFromUrl } from './utils';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Layout animation preset
const layoutAnimationPreset = LayoutAnimation.Presets.easeInEaseOut;

// Status badge configuration
const STATUS_CONFIG: Record<string, { label: string; background: string; textColor: string }> = {
  not_submitted: { label: 'Not Submitted', background: '#FFF3E0', textColor: '#E65100' },
  submitted: { label: 'Submitted', background: '#E8F5E9', textColor: '#2E7D32' },
  graded: { label: 'Graded', background: '#E8EDF5', textColor: '#1A3A6B' },
  late: { label: 'Late', background: '#FCE4EC', textColor: '#C62828' },
  missing: { label: 'Missing', background: '#FFEBEE', textColor: '#B71C1C' },
};

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

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

interface SelectedAttachment {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

interface SubmissionWithStudent extends Submission {
  student_name?: string;
  student_email?: string;
  _score: string;
  _feedback: string;
  _rowKey: string;
  _comments?: ActivityComment[];
  _commentsLoading?: boolean;
  _expandedSections?: {
    submission: boolean;
    comments: boolean;
  };
}

interface GradeActivitiesScreenProps {
  activity: Activity;
  submissions: SubmissionWithStudent[];
  onClose: () => void;
  onGradeSaved?: () => void;
}

export function GradeActivitiesScreen({
  activity,
  submissions: initialSubmissions,
  onClose,
  onGradeSaved,
}: GradeActivitiesScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();

  // State - initialize with expanded sections already set
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>(() =>
    initialSubmissions.map(s => ({
      ...s,
      _expandedSections: {
        submission: true,
        comments: false,
      },
    }))
  );
  // Initialize expanded key to first student - use lazy initialization to avoid render-phase updates
  const [expandedKey, setExpandedKey] = useState<string | null>(() => {
    return initialSubmissions.length > 0 ? initialSubmissions[0]._rowKey : null;
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [authHeaders, setAuthHeaders] = useState<Record<string, string>>({});

  // Fetch auth token for authenticated image loading
  useEffect(() => {
    const fetchToken = async () => {
      const token = await AsyncStorage.getItem('hna_access_token');
      if (token) {
        setAuthHeaders({ Authorization: `Bearer ${token}` });
      }
    };
    fetchToken();
  }, []);

  // Calculate grading progress
  const gradedCount = useMemo(() => {
    return submissions.filter(s => s.status === 'graded' || s.score !== null).length;
  }, [submissions]);

  const totalCount = submissions.length;
  const progressPercent = totalCount > 0 ? (gradedCount / totalCount) * 100 : 0;

  // Get status config for a submission
  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.not_submitted;
  };

  // Toggle student card expansion
  const toggleExpand = useCallback((rowKey: string) => {
    LayoutAnimation.configureNext(layoutAnimationPreset);
    setExpandedKey(prev => prev === rowKey ? null : rowKey);
  }, []);

  // Update score for a submission
  const updateScore = useCallback((rowKey: string, score: string) => {
    setSubmissions(prev => prev.map(s =>
      s._rowKey === rowKey ? { ...s, _score: score } : s
    ));
  }, []);

  // Update feedback for a submission
  const updateFeedback = useCallback((rowKey: string, feedback: string) => {
    setSubmissions(prev => prev.map(s =>
      s._rowKey === rowKey ? { ...s, _feedback: feedback } : s
    ));
  }, []);

  // Quick grade chip handler
  const handleQuickGrade = useCallback((rowKey: string, value: number) => {
    updateScore(rowKey, String(value));
  }, [updateScore]);

  // Save grade
  const saveGrade = useCallback(async (item: SubmissionWithStudent) => {
    if (!item.id) {
      Alert.alert('Error', 'No submission to grade.');
      return;
    }
    setSavingKey(item._rowKey);
    try {
      await api.patch(`/activity-submissions/${item.id}/grade/`, {
        score: item._score === '' ? null : Number(item._score),
        feedback: item._feedback || null,
      });
      // Update local state to reflect saved grade
      setSubmissions(prev => prev.map(s =>
        s._rowKey === item._rowKey
          ? { ...s, score: item._score === '' ? undefined : Number(item._score), feedback: item._feedback || undefined, status: 'graded' as const }
          : s
      ) as SubmissionWithStudent[]);
      onGradeSaved?.();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save grade.');
    } finally {
      setSavingKey(null);
    }
  }, [onGradeSaved]);

  // Toggle section expansion
  const toggleSection = useCallback((rowKey: string, section: 'submission' | 'comments') => {
    LayoutAnimation.configureNext(layoutAnimationPreset);
    setSubmissions(prev => prev.map(s => {
      if (s._rowKey !== rowKey) return s;
      return {
        ...s,
        _expandedSections: {
          ...s._expandedSections,
          submission: s._expandedSections?.submission ?? true,
          comments: s._expandedSections?.comments ?? false,
          [section]: !(s._expandedSections?.[section] ?? (section === 'submission')),
        },
      };
    }));
  }, []);

  // Track which submissions have had comments loaded
  const loadedCommentsRef = useRef<Set<string>>(new Set());

  // Load comments for a submission
  const loadComments = useCallback(async (rowKey: string) => {
    // Find the submission ID from initialSubmissions (more reliable than state)
    const submission = initialSubmissions.find(s => s._rowKey === rowKey);
    const submissionId = submission?.id;
    const studentId = submission?.student_id;

    // Check if already loading or loaded
    if (loadedCommentsRef.current.has(rowKey)) {
      return;
    }

    // Mark as loading immediately to prevent duplicate requests
    loadedCommentsRef.current.add(rowKey);

    setSubmissions(prev => prev.map(s =>
      s._rowKey === rowKey ? { ...s, _commentsLoading: true } : s
    ));

    try {
      // Fetch comments for this specific student from the server
      // Use submission_id if available, otherwise use student_id
      console.log(`[GradeActivities] Fetching comments for rowKey ${rowKey}, submissionId: ${submissionId || 'none'}, studentId: ${studentId || 'none'}`);

      let submissionComments: ActivityComment[];
      if (submissionId) {
        // Student has submitted - filter by submission_id
        submissionComments = await activityCommentsApi.getByActivity(activity.id, { submissionId });
      } else if (studentId) {
        // Student hasn't submitted yet - filter by student_id
        submissionComments = await activityCommentsApi.getByActivity(activity.id, { studentId });
      } else {
        // No submission and no student_id - should not happen
        console.warn('[GradeActivities] No submissionId or studentId available');
        submissionComments = [];
      }

      console.log(`[GradeActivities] Received ${submissionComments?.length || 0} comments`);

      setSubmissions(prev => prev.map(s =>
        s._rowKey === rowKey
          ? { ...s, _comments: submissionComments || [], _commentsLoading: false }
          : s
      ));
    } catch (error) {
      console.error('Error loading comments:', error);
      // Remove from loaded set on error so it can be retried
      loadedCommentsRef.current.delete(rowKey);
      setSubmissions(prev => prev.map(s =>
        s._rowKey === rowKey ? { ...s, _comments: [], _commentsLoading: false } : s
      ));
    }
  }, [activity.id, initialSubmissions]);

  // Comment input state per submission
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({});
  const [selectedAttachments, setSelectedAttachments] = useState<SelectedAttachment[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Update comment input
  const updateCommentInput = useCallback((rowKey: string, text: string) => {
    setCommentInputs(prev => ({ ...prev, [rowKey]: text }));
  }, []);

  // Submit comment
  const submitComment = useCallback(async (item: SubmissionWithStudent) => {
    const text = commentInputs[item._rowKey] || '';
    if (!text.trim() && selectedAttachments.length === 0) return;

    // We need either a submission_id or student_id to post a comment
    const studentId = item.student_id;
    const submissionId = item.id;

    if (!submissionId && !studentId) {
      console.error('[GradeActivities] Cannot submit comment: no submission ID or student ID');
      Alert.alert('Error', 'Cannot send comment. Unable to identify student.');
      return;
    }

    setSubmittingComments(prev => ({ ...prev, [item._rowKey]: true }));
    try {
      const files = selectedAttachments.map(att => ({
        uri: att.uri,
        name: att.name,
        type: att.mimeType,
      }));

      console.log(`[GradeActivities] Creating comment for submission ${submissionId || 'none'}, student ${studentId}, activity ${activity.id}`);

      const newComment = await activityCommentsApi.create(
        {
          activity_id: activity.id,
          content: text.trim() || undefined,
          submission_id: submissionId, // Will be undefined if not submitted yet
        },
        files.length > 0 ? files as any : undefined
      );

      if (newComment) {
        console.log(`[GradeActivities] Comment created successfully with ID ${newComment.id}, submission_id: ${newComment.submission_id}`);
        setSubmissions(prev => prev.map(s => {
          if (s._rowKey !== item._rowKey) return s;
          return {
            ...s,
            _comments: [...(s._comments || []), newComment],
          };
        }));
        setCommentInputs(prev => ({ ...prev, [item._rowKey]: '' }));
        setSelectedAttachments([]);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Could not send comment. Please try again.');
    } finally {
      setSubmittingComments(prev => ({ ...prev, [item._rowKey]: false }));
    }
  }, [activity.id, commentInputs, selectedAttachments]);

  // Attachment picker handlers
  const showAttachmentOptions = useCallback(() => {
    Alert.alert(
      'Add Attachment',
      'Choose a file type',
      [
        { text: 'Image', onPress: pickImage },
        { text: 'Document', onPress: pickDocument },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please grant gallery access to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelectedAttachments(prev => [...prev, {
        uri: asset.uri,
        name: asset.fileName || `image-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        size: (asset as any).fileSize,
      }]);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelectedAttachments(prev => [...prev, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size,
      }]);
    }
  };

  const removeAttachment = useCallback((index: number) => {
    setSelectedAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Open file
  const openFile = useCallback((url: string) => {
    const resolvedUrl = resolveBackendFileUrl(url);
    Linking.openURL(resolvedUrl).catch(() => {
      Alert.alert('Error', 'Could not open file.');
    });
  }, []);

  // Get initials for avatar
  const getInitials = (name?: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Comments are loaded on-demand when the user expands the comments section
  // This ensures proper one-to-one teacher-student conversation per submission

  // Render file preview card
  // Render full-width submission preview with locked aspect ratio
  const renderFileCard = (url: string, index: number, rowKey: string) => {
    const resolvedUrl = resolveBackendFileUrl(url);
    const fileName = fileNameFromUrl(url);
    const isImage = isImageFile(fileName);
    const isPdf = isPdfFile(fileName);

    return (
      <View key={`${rowKey}-file-${index}`} style={styles.submissionFileCard}>
        {/* Full-width preview area with locked aspect ratio */}
        <TouchableOpacity
          style={styles.submissionPreviewArea}
          onPress={() => {
            if (isImage) {
              setPreviewImageUri(resolvedUrl);
            } else {
              openFile(resolvedUrl);
            }
          }}
          activeOpacity={0.9}
        >
          {isImage ? (
            <Image
              source={{ uri: resolvedUrl, headers: authHeaders }}
              style={styles.submissionImagePreview}
              contentFit="cover"
              transition={120}
              placeholder={{ blurhash: 'L6PZfSjE.Ays.Wayofay.Sj[' }}
            />
          ) : (
            <View style={styles.submissionDocPreview}>
              <Ionicons
                name={isPdf ? 'document-text' : 'document'}
                size={40}
                color={isPdf ? '#E53935' : Colors.primary}
              />
              <Text style={styles.submissionDocLabel}>
                {isPdf ? 'PDF' : getFileTypeLabel(fileName)}
              </Text>
              <Text style={styles.submissionDocHint}>Tap to open</Text>
            </View>
          )}
          {/* Tap indicator overlay */}
          <View style={styles.submissionPreviewOverlay}>
            <Ionicons name="expand" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* File info bar */}
        <View style={styles.submissionFileInfo}>
          <View style={styles.submissionFileInfoLeft}>
            <Ionicons
              name={isImage ? 'image-outline' : isPdf ? 'document-text-outline' : 'document-outline'}
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.submissionFileName} numberOfLines={1}>
              {fileName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.submissionOpenButton}
            onPress={() => openFile(resolvedUrl)}
          >
            <Ionicons name="open-outline" size={16} color={Colors.primaryLight} />
            <Text style={styles.submissionOpenText}>Open</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render comment bubble
  const renderCommentBubble = (comment: ActivityComment, isOwn: boolean, rowKey: string) => {
    const hasContent = comment.content && comment.content.trim().length > 0;
    const hasFiles = comment.file_urls && comment.file_urls.length > 0;
    const authorName = comment.author_name || 'Teacher';

    if (isOwn) {
      // Teacher's comment - outgoing bubble
      return (
        <View key={comment.id} style={styles.commentBubbleOutgoing}>
          {hasContent && (
            <View style={styles.commentTextBubbleOutgoing}>
              <Text style={styles.commentTextOutgoing}>{comment.content}</Text>
            </View>
          )}
          {hasFiles && comment.file_urls!.map((url, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.fileBubbleOutgoing}
              onPress={() => openFile(url)}
            >
              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
              <Text style={styles.fileBubbleText} numberOfLines={1}>
                {fileNameFromUrl(url)}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.commentTimestampOutgoing}>
            {formatDate(comment.created_at)}
          </Text>
        </View>
      );
    } else {
      // Student's comment - incoming bubble
      return (
        <View key={comment.id} style={styles.commentBubbleIncoming}>
          <View style={styles.commentAvatar}>
            <Text style={styles.commentAvatarText}>{getInitials(authorName)}</Text>
          </View>
          <View style={styles.commentContentIncoming}>
            <Text style={styles.commentAuthorName}>{authorName}</Text>
            {hasContent && (
              <View style={styles.commentTextBubbleIncoming}>
                <Text style={styles.commentTextIncoming}>{comment.content}</Text>
              </View>
            )}
            {hasFiles && comment.file_urls!.map((url, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.fileBubbleIncoming}
                onPress={() => openFile(url)}
              >
                <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                <Text style={styles.fileBubbleTextIncoming} numberOfLines={1}>
                  {fileNameFromUrl(url)}
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.commentTimestampIncoming}>
              {formatDate(comment.created_at)}
            </Text>
          </View>
        </View>
      );
    }
  };

  // Render student card
  const renderStudentCard = (item: SubmissionWithStudent) => {
    const isExpanded = expandedKey === item._rowKey;
    const isSaving = savingKey === item._rowKey;
    const statusConfig = getStatusConfig(item.status);
    const hasSubmitted = item.status !== 'not_submitted';
    const expandedSections = item._expandedSections || { submission: true, comments: false };
    const comments = item._comments || [];
    const commentsLoading = item._commentsLoading === true;
    const commentText = commentInputs[item._rowKey] || '';
    const isSubmittingComment = submittingComments[item._rowKey];

    return (
      <View key={item._rowKey} style={styles.studentCard}>
        {/* Collapsed Row */}
        <TouchableOpacity
          style={styles.collapsedRow}
          onPress={() => toggleExpand(item._rowKey)}
          activeOpacity={0.8}
        >
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.student_name)}</Text>
          </View>

          {/* Student Info */}
          <View style={styles.studentInfo}>
            <Text style={styles.studentName} numberOfLines={1}>
              {item.student_name || 'Unknown Student'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.background }]}>
              <Text style={[styles.statusBadgeText, { color: statusConfig.textColor }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          {/* Score Preview */}
          <View style={styles.scorePreview}>
            <Text style={styles.scorePreviewText}>
              {item.score != null ? `${item.score}` : '—'}
            </Text>
            <Text style={styles.scorePreviewMax}> / {activity.points}</Text>
          </View>

          {/* Chevron */}
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#888888"
          />
        </TouchableOpacity>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Divider */}
            <View style={styles.expandedDivider} />

            {/* Score Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Score</Text>
              <View style={styles.scoreRow}>
                <TextInput
                  style={[styles.scoreInput, !hasSubmitted && styles.scoreInputDisabled]}
                  value={item._score}
                  onChangeText={(v) => updateScore(item._rowKey, v)}
                  keyboardType="numeric"
                  placeholder="—"
                  placeholderTextColor="#AAAAAA"
                  editable={hasSubmitted}
                />
                <Text style={styles.scoreSeparator}>/</Text>
                <Text style={styles.scoreMax}>{activity.points}</Text>
              </View>
              {!hasSubmitted && (
                <Text style={styles.disabledHint}>Cannot grade without submission</Text>
              )}

              {/* Quick Grade Chips */}
              <View style={styles.quickGradeRow}>
                {[25, 50, 75, 100].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.quickGradeChip,
                      item._score === String(value) && styles.quickGradeChipActive,
                      !hasSubmitted && styles.quickGradeChipDisabled,
                    ]}
                    onPress={() => hasSubmitted && handleQuickGrade(item._rowKey, value)}
                    disabled={!hasSubmitted}
                  >
                    <Text
                      style={[
                        styles.quickGradeChipText,
                        item._score === String(value) && styles.quickGradeChipTextActive,
                      ]}
                    >
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Submission Preview Section */}
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection(item._rowKey, 'submission')}
            >
              <Text style={styles.sectionLabel}>Submission</Text>
              <Ionicons
                name={expandedSections.submission ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.primary}
              />
            </TouchableOpacity>

            {expandedSections.submission && (
              <View style={styles.sectionContent}>
                {!hasSubmitted ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No submission yet</Text>
                  </View>
                ) : (
                  <>
                    {/* Text Content */}
                    {item.text_content && (
                      <View style={styles.textContent}>
                        <Text style={styles.textContentLabel}>Text:</Text>
                        <Text style={styles.textContentValue}>{item.text_content}</Text>
                      </View>
                    )}

                    {/* Files */}
                    {item.file_urls && item.file_urls.length > 0 && (
                      <View style={styles.filesList}>
                        {item.file_urls.map((url, idx) => renderFileCard(url, idx, item._rowKey))}
                      </View>
                    )}

                    {/* No files fallback */}
                    {(!item.file_urls || item.file_urls.length === 0) && !item.text_content && (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No content submitted</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Comments Section */}
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => {
                const wasExpanded = expandedSections.comments;
                toggleSection(item._rowKey, 'comments');
                // Load comments when expanding for the first time
                if (!wasExpanded && !loadedCommentsRef.current.has(item._rowKey)) {
                  loadComments(item._rowKey);
                }
              }}
            >
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionLabel}>Comments</Text>
                {comments.length > 0 && (
                  <View style={styles.commentsBadge}>
                    <Text style={styles.commentsBadgeText}>{comments.length}</Text>
                  </View>
                )}
              </View>
              <Ionicons
                name={expandedSections.comments ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.primary}
              />
            </TouchableOpacity>

            {expandedSections.comments && (
              <View style={styles.commentsContainer}>
                {commentsLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : comments.length === 0 ? (
                  <View style={styles.commentsEmptyState}>
                    <Text style={styles.commentsEmptyText}>No comments yet</Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.commentsList}
                    contentContainerStyle={styles.commentsListContent}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    {comments.map((comment) =>
                      renderCommentBubble(comment, user?.id === comment.author_id, item._rowKey)
                    )}
                  </ScrollView>
                )}

                {/* Comment Composer */}
                <View style={styles.commentComposer}>
                  {selectedAttachments.length > 0 && (
                    <ScrollView
                      horizontal
                      style={styles.attachmentsPreview}
                      contentContainerStyle={styles.attachmentsPreviewContent}
                      showsHorizontalScrollIndicator={false}
                    >
                      {selectedAttachments.map((att, idx) => (
                        <View key={idx} style={styles.attachmentPreviewItem}>
                          <Ionicons
                            name={isImageFile(att.name) ? 'image-outline' : 'document-text-outline'}
                            size={14}
                            color={Colors.primary}
                          />
                          <Text style={styles.attachmentPreviewName} numberOfLines={1}>
                            {att.name}
                          </Text>
                          <TouchableOpacity onPress={() => removeAttachment(idx)}>
                            <Ionicons name="close-circle" size={16} color="#888888" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                  <View style={styles.composerRow}>
                    <TouchableOpacity style={styles.attachButton} onPress={showAttachmentOptions}>
                      <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Leave a comment..."
                      placeholderTextColor="#AAAAAA"
                      value={commentText}
                      onChangeText={(v) => updateCommentInput(item._rowKey, v)}
                      multiline
                      maxLength={1000}
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        (!commentText.trim() && selectedAttachments.length === 0) && styles.sendButtonDisabled,
                      ]}
                      onPress={() => submitComment(item)}
                      disabled={(!commentText.trim() && selectedAttachments.length === 0) || isSubmittingComment}
                    >
                      <Ionicons
                        name="send"
                        size={20}
                        color={(!commentText.trim() && selectedAttachments.length === 0) || isSubmittingComment ? '#CCCCCC' : Colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Footer - Save Button */}
            <View style={styles.cardFooter}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (item._score === '' || isSaving || !hasSubmitted) && styles.saveButtonDisabled,
                ]}
                onPress={() => saveGrade(item)}
                disabled={item._score === '' || isSaving || !hasSubmitted}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Grade</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Image preview modal
  const renderImagePreview = () => (
    previewImageUri && (
      <View style={styles.imagePreviewOverlay}>
        <TouchableOpacity style={styles.imagePreviewClose} onPress={() => setPreviewImageUri(null)}>
          <Ionicons name="close" size={32} color="#FFFFFF" />
        </TouchableOpacity>
        <Image
          source={{ uri: previewImageUri, headers: authHeaders }}
          style={styles.imagePreviewFull}
          contentFit="contain"
        />
      </View>
    )
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F5F7FA' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#FFFFFF', borderBottomColor: '#E0E0E0' }]}>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Text style={styles.headerCloseText}>Close</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Grade Activities</Text>
        <View style={styles.progressPill}>
          <Text style={styles.progressPillText}>
            {gradedCount} / {totalCount} Graded
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarTrack}>
          <View
            style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
          />
        </View>
      </View>

      {/* Student List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {submissions.map(renderStudentCard)}
      </ScrollView>

      {/* Image Preview */}
      {renderImagePreview()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  headerCloseText: {
    fontSize: 16,
    color: Colors.primaryLight,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  progressPill: {
    backgroundColor: '#E8EDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  progressBarContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    ...Shadows.sm,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    height: 64,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8EDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  studentInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scorePreview: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: Spacing.sm,
  },
  scorePreviewText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  scorePreviewMax: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  expandedContent: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
    marginBottom: Spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreInput: {
    width: 80,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.sm,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  scoreInputDisabled: {
    borderColor: '#CCCCCC',
    color: '#AAAAAA',
    backgroundColor: '#F5F5F5',
  },
  disabledHint: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
  scoreSeparator: {
    fontSize: 18,
    color: '#AAAAAA',
    marginHorizontal: Spacing.sm,
  },
  scoreMax: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  quickGradeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  quickGradeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
  },
  quickGradeChipActive: {
    backgroundColor: Colors.primary,
  },
  quickGradeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  quickGradeChipTextActive: {
    color: '#FFFFFF',
  },
  quickGradeChipDisabled: {
    borderColor: '#CCCCCC',
    backgroundColor: '#F5F5F5',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionContent: {
    marginBottom: Spacing.md,
  },
  textContent: {
    marginBottom: Spacing.sm,
  },
  textContentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 4,
  },
  textContentValue: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
  },
  emptyState: {
    backgroundColor: '#F5F5F5',
    borderRadius: Radius.sm,
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#AAAAAA',
  },
  filesList: {
    gap: Spacing.md,
  },
  // Full-width submission preview card
  submissionFileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  submissionPreviewArea: {
    width: '100%',
    aspectRatio: 16 / 9, // Locked aspect ratio for consistent viewing
    backgroundColor: '#F8F9FA',
    position: 'relative',
  },
  submissionImagePreview: {
    width: '100%',
    height: '100%',
  },
  submissionDocPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  submissionDocLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  submissionDocHint: {
    fontSize: 12,
    color: '#AAAAAA',
    marginTop: 4,
  },
  submissionPreviewOverlay: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    padding: 6,
  },
  submissionFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submissionFileInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  submissionFileName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 1,
  },
  submissionOpenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  submissionOpenText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  // Keep old styles for backwards compatibility with other uses
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: Spacing.sm,
  },
  fileThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 6,
  },
  fileIconContainer: {
    width: 44,
    height: 56,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  fileType: {
    fontSize: 11,
    color: '#AAAAAA',
    marginTop: 2,
  },
  commentsBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
  },
  commentsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  commentsContainer: {
    marginBottom: Spacing.md,
  },
  commentsEmptyState: {
    backgroundColor: '#F5F7FA',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  commentsEmptyText: {
    fontSize: 13,
    color: '#AAAAAA',
  },
  commentsList: {
    maxHeight: 240,
    backgroundColor: '#F5F7FA',
    borderRadius: Radius.sm,
  },
  commentsListContent: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  commentBubbleOutgoing: {
    alignItems: 'flex-end',
    marginBottom: Spacing.sm,
  },
  commentTextBubbleOutgoing: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: '75%',
  },
  commentTextOutgoing: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  fileBubbleOutgoing: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: 4,
    gap: Spacing.xs,
  },
  fileBubbleText: {
    fontSize: 12,
    color: '#FFFFFF',
    maxWidth: 120,
  },
  commentTimestampOutgoing: {
    fontSize: 10,
    color: Colors.primaryLight,
    marginTop: 4,
    opacity: 0.6,
  },
  commentBubbleIncoming: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8EDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  commentAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  commentContentIncoming: {
    flex: 1,
  },
  commentAuthorName: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryLight,
    marginBottom: 2,
  },
  commentTextBubbleIncoming: {
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: '75%',
  },
  commentTextIncoming: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
  },
  fileBubbleIncoming: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EDF5',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: 4,
    gap: Spacing.xs,
    alignSelf: 'flex-start',
  },
  fileBubbleTextIncoming: {
    fontSize: 12,
    color: Colors.primary,
    maxWidth: 120,
  },
  commentTimestampIncoming: {
    fontSize: 10,
    color: '#AAAAAA',
    marginTop: 4,
  },
  commentComposer: {
    marginTop: Spacing.sm,
  },
  attachmentsPreview: {
    maxHeight: 50,
  },
  attachmentsPreviewContent: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  attachmentPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  attachmentPreviewName: {
    fontSize: 12,
    color: '#1A1A1A',
    maxWidth: 80,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  attachButton: {
    padding: Spacing.xs,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    maxHeight: 80,
    paddingHorizontal: Spacing.xs,
  },
  sendButton: {
    padding: Spacing.xs,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: Spacing.sm,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    minWidth: 120,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  imagePreviewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  imagePreviewFull: {
    width: '100%',
    height: '100%',
  },
});