// src/screens/course/CourseDiscussionsScreen.tsx
// Discussion boards tab for course screen

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl,
  ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform,
  Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCourse, CourseTab } from '@/contexts/CourseContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';
import { formatDate } from './utils';

interface DiscussionReply {
  id: string;
  discussion_id: string;
  content: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  parent_reply_id?: string;
  likes_count: number;
  is_liked_by_me: boolean;
  created_at: string;
  updated_at: string;
  replies?: DiscussionReply[];
}

interface Discussion {
  id: string;
  course_section_id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  is_locked: boolean;
  replies_count: number;
  created_at: string;
  updated_at: string;
  replies?: DiscussionReply[];
}

interface Props {
  activeTab: CourseTab;
}

export function CourseDiscussionsScreen({ activeTab }: Props) {
  const { colors } = useTheme();
  const { courseId, canManage } = useCourse();
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create discussion modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);

  // View discussion modal
  const [viewingDiscussion, setViewingDiscussion] = useState<Discussion | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<DiscussionReply | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchDiscussions = useCallback(async () => {
    if (!courseId) return;
    try {
      const data = await api.get(`/course-sections/${courseId}/discussions/`);
      setDiscussions(data || []);
    } catch (error) {
      console.error('Failed to fetch discussions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (activeTab === 'discussions') {
      fetchDiscussions();
    }
  }, [activeTab, fetchDiscussions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDiscussions();
  };

  const handleCreateDiscussion = async () => {
    if (!courseId || !newTitle.trim() || !newContent.trim()) {
      Alert.alert('Error', 'Title and content are required');
      return;
    }
    setCreating(true);
    try {
      const data = await api.post(`/course-sections/${courseId}/discussions/`, {
        title: newTitle.trim(),
        content: newContent.trim(),
      });
      setDiscussions([data, ...discussions]);
      setCreateModalVisible(false);
      setNewTitle('');
      setNewContent('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create discussion');
    } finally {
      setCreating(false);
    }
  };

  const handleViewDiscussion = async (discussion: Discussion) => {
    try {
      const data = await api.get(`/discussions/${discussion.id}/`);
      setViewingDiscussion(data);
      setViewModalVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load discussion');
    }
  };

  const handleSubmitReply = async () => {
    if (!viewingDiscussion || !replyContent.trim()) return;
    setSubmittingReply(true);
    try {
      const data = await api.post(`/discussions/${viewingDiscussion.id}/replies/`, {
        content: replyContent.trim(),
        parent_reply_id: replyingTo?.id || null,
      });
      // Refresh discussion
      const updated = await api.get(`/discussions/${viewingDiscussion.id}/`);
      setViewingDiscussion(updated);
      setReplyContent('');
      setReplyingTo(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleToggleLike = async (reply: DiscussionReply) => {
    try {
      await api.post(`/discussions/replies/${reply.id}/like/`);
      if (viewingDiscussion) {
        const updated = await api.get(`/discussions/${viewingDiscussion.id}/`);
        setViewingDiscussion(updated);
      }
    } catch (error) {
      // Ignore like errors
    }
  };

  const handleDeleteDiscussion = (discussion: Discussion) => {
    Alert.alert('Delete Discussion', 'Are you sure you want to delete this discussion?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/discussions/${discussion.id}/`);
            setDiscussions(discussions.filter(d => d.id !== discussion.id));
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete discussion');
          }
        },
      },
    ]);
  };

  if (activeTab !== 'discussions') return null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Create discussion button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>New Discussion</Text>
        </TouchableOpacity>

        {discussions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>
              No discussions yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
              Start a discussion to begin the conversation
            </Text>
          </View>
        ) : (
          discussions.map((discussion) => (
            <DiscussionCard
              key={discussion.id}
              discussion={discussion}
              canManage={canManage}
              isOwner={discussion.author_id === user?.id}
              onPress={() => handleViewDiscussion(discussion)}
              onDelete={() => handleDeleteDiscussion(discussion)}
            />
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Create Discussion Modal */}
      <Modal visible={createModalVisible} animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
        <KeyboardAvoidingView style={[styles.modalWrap, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>New Discussion</Text>
            <TouchableOpacity onPress={handleCreateDiscussion} disabled={creating}>
              {creating ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={styles.modalSave}>Post</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Discussion title..."
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Content</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputMulti, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={newContent}
                onChangeText={setNewContent}
                placeholder="Start the discussion..."
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* View Discussion Modal */}
      <Modal visible={viewModalVisible} animationType="slide" onRequestClose={() => setViewModalVisible(false)}>
        <View style={[styles.modalWrap, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => setViewModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {viewingDiscussion?.title || 'Discussion'}
            </Text>
            <View style={{ width: 48 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Original post */}
            {viewingDiscussion && (
              <View style={[styles.discussionOriginal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.authorRow}>
                  {viewingDiscussion.author_avatar ? (
                    <Image source={{ uri: viewingDiscussion.author_avatar }} style={styles.authorAvatar} />
                  ) : (
                    <View style={[styles.authorAvatarPlaceholder, { backgroundColor: colors.background }]}>
                      <Text style={styles.authorInitials}>
                        {viewingDiscussion.author_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.authorInfo}>
                    <Text style={[styles.authorName, { color: colors.textPrimary }]}>{viewingDiscussion.author_name}</Text>
                    <Text style={[styles.postDate, { color: colors.textTertiary }]}>
                      {formatDate(viewingDiscussion.created_at)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.discussionContent, { color: colors.textPrimary }]}>
                  {viewingDiscussion.content}
                </Text>
              </View>
            )}

            {/* Replies */}
            <Text style={[styles.repliesHeader, { color: colors.textPrimary }]}>
              Replies ({viewingDiscussion?.replies?.length || 0})
            </Text>

            {(viewingDiscussion?.replies || []).map((reply) => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                colors={colors}
                onLike={() => handleToggleLike(reply)}
                onReply={() => setReplyingTo(reply)}
              />
            ))}

            {/* Reply input */}
            <View style={[styles.replyInputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {replyingTo && (
                <View style={styles.replyingToBanner}>
                  <Text style={[styles.replyingToText, { color: colors.textTertiary }]}>
                    Replying to: {replyingTo.author_name}
                  </Text>
                  <TouchableOpacity onPress={() => setReplyingTo(null)}>
                    <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              )}
              <TextInput
                style={[styles.replyInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
                value={replyContent}
                onChangeText={setReplyContent}
                placeholder="Write a reply..."
                placeholderTextColor={colors.textTertiary}
                multiline
              />
              <TouchableOpacity
                style={[styles.replyBtn, (!replyContent.trim() || submittingReply) && styles.replyBtnDisabled]}
                onPress={handleSubmitReply}
                disabled={!replyContent.trim() || submittingReply}
              >
                {submittingReply ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.replyBtnText}>Reply</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

interface DiscussionCardProps {
  discussion: Discussion;
  canManage: boolean;
  isOwner: boolean;
  onPress: () => void;
  onDelete: () => void;
}

function DiscussionCard({ discussion, canManage, isOwner, onPress, onDelete }: DiscussionCardProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {discussion.title}
        </Text>
        {(canManage || isOwner) && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={Colors.accentRed} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.cardContent, { color: colors.textSecondary }]} numberOfLines={2}>
        {discussion.content}
      </Text>
      <View style={styles.cardFooter}>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardAuthor, { color: colors.textTertiary }]}>{discussion.author_name}</Text>
          <Text style={[styles.cardDate, { color: colors.textTertiary }]}>• {formatDate(discussion.created_at)}</Text>
        </View>
        <View style={styles.cardStats}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.cardStatText, { color: colors.textTertiary }]}>{discussion.replies_count}</Text>
        </View>
      </View>
      {discussion.is_locked && (
        <View style={styles.lockedBadge}>
          <Ionicons name="lock-closed" size={12} color="#DC2626" />
          <Text style={styles.lockedText}>Locked</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface ReplyCardProps {
  reply: DiscussionReply;
  colors: any;
  depth?: number;
  onLike: () => void;
  onReply: () => void;
}

function ReplyCard({ reply, colors, depth = 0, onLike, onReply }: ReplyCardProps) {
  return (
    <View style={[styles.replyCard, { marginLeft: depth * 16, backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.authorRow}>
        {reply.author_avatar ? (
          <Image source={{ uri: reply.author_avatar }} style={styles.replyAvatar} />
        ) : (
          <View style={[styles.replyAvatarPlaceholder, { backgroundColor: colors.background }]}>
            <Text style={styles.replyInitials}>
              {reply.author_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text style={[styles.replyAuthorName, { color: colors.textPrimary }]}>{reply.author_name}</Text>
          <Text style={[styles.postDate, { color: colors.textTertiary }]}>{formatDate(reply.created_at)}</Text>
        </View>
      </View>
      <Text style={[styles.replyContent, { color: colors.textPrimary }]}>{reply.content}</Text>
      <View style={styles.replyActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onLike}>
          <Ionicons name={reply.is_liked_by_me ? 'heart' : 'heart-outline'} size={16} color={reply.is_liked_by_me ? '#DC2626' : colors.textTertiary} />
          <Text style={[styles.actionText, { color: colors.textTertiary }]}>{reply.likes_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onReply}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.actionText, { color: colors.textTertiary }]}>Reply</Text>
        </TouchableOpacity>
      </View>
      {/* Nested replies */}
      {(reply.replies || []).map((nestedReply) => (
        <ReplyCard
          key={nestedReply.id}
          reply={nestedReply}
          colors={colors}
          depth={depth + 1}
          onLike={onLike}
          onReply={onReply}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  tabContent: { padding: Spacing.xl, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 12,
    marginBottom: Spacing.md,
  },
  createBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { fontSize: 14, marginTop: 4 },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    ...Shadows.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  deleteBtn: { padding: 4 },
  cardContent: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardAuthor: { fontSize: 12 },
  cardDate: { fontSize: 11 },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardStatText: { fontSize: 12 },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  lockedText: { color: '#DC2626', fontSize: 11, fontWeight: '600' },
  modalWrap: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSave: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  modalBody: { padding: Spacing.xl, paddingBottom: 80 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  fieldInputMulti: { minHeight: 120, textAlignVertical: 'top' },
  discussionOriginal: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  authorAvatar: { width: 36, height: 36, borderRadius: 18 },
  authorAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  authorInitials: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  authorInfo: { marginLeft: 10 },
  authorName: { fontSize: 14, fontWeight: '600' },
  postDate: { fontSize: 11, marginTop: 1 },
  discussionContent: { fontSize: 14, lineHeight: 22 },
  repliesHeader: { fontSize: 15, fontWeight: '700', marginBottom: Spacing.sm },
  replyCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  replyAvatar: { width: 28, height: 28, borderRadius: 14 },
  replyAvatarPlaceholder: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  replyInitials: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  replyAuthorName: { fontSize: 13, fontWeight: '600' },
  replyContent: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  replyActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12 },
  replyInputCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  replyingToBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  replyingToText: { fontSize: 12 },
  replyInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Radius.md,
    padding: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  replyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  replyBtnDisabled: { opacity: 0.5 },
  replyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});