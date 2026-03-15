// src/services/activityComments.ts
//
// API service for managing activity comments.
// Provides CRUD operations for ActivityComment model with file upload support.

import { api } from '@/lib/api';
import { ActivityComment } from '@/types';

export interface CreateCommentData {
  activity_id: string;
  content?: string;
  parent_id?: string;
  submission_id?: string;
  file_urls?: string[];
}

export interface UpdateCommentData {
  content?: string;
  file_urls?: string[];
}

/**
 * Get all comments for a specific activity (including nested replies).
 * Optionally filter by submission_id or student_id to get comments for a specific submission/student.
 * @param activityId - The activity ID
 * @param options - Optional filters: submission_id for submitted work, student_id for any student
 */
export async function getCommentsByActivity(
  activityId: string,
  options?: { submissionId?: string; studentId?: string }
): Promise<ActivityComment[]> {
  try {
    let url = `/activities/${activityId}/comments/`;
    const params: string[] = [];
    if (options?.submissionId) {
      params.push(`submission_id=${options.submissionId}`);
    }
    if (options?.studentId) {
      params.push(`student_id=${options.studentId}`);
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    const data = await api.get(url);
    return data as ActivityComment[];
  } catch (error) {
    console.error('Error fetching activity comments:', error);
    return [];
  }
}

/**
 * Create a new comment on an activity.
 * Supports text content and file attachments via multipart/form-data.
 */
export async function createComment(
  data: CreateCommentData,
  files?: File[]
): Promise<ActivityComment | null> {
  try {
    if (files && files.length > 0) {
      // Use multipart/form-data for file uploads
      const formData = new FormData();
      formData.append('activity_id', data.activity_id);
      if (data.content) formData.append('content', data.content);
      if (data.parent_id) formData.append('parent_id', data.parent_id);
      if (data.submission_id) formData.append('submission_id', data.submission_id);
      if (data.file_urls) {
        formData.append('file_urls', JSON.stringify(data.file_urls));
      }
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await api.postForm('/activity-comments/', formData);
      return response as ActivityComment;
    } else {
      // Use JSON for text-only comments
      const response = await api.post('/activity-comments/', data);
      return response as ActivityComment;
    }
  } catch (error) {
    console.error('Error creating comment:', error);
    return null;
  }
}

/**
 * Update an existing comment.
 * Only the author can update their own comments.
 */
export async function updateComment(
  commentId: string,
  data: UpdateCommentData
): Promise<ActivityComment | null> {
  try {
    const response = await api.patch(`/activity-comments/${commentId}/`, data);
    return response as ActivityComment;
  } catch (error) {
    console.error('Error updating comment:', error);
    return null;
  }
}

/**
 * Delete a comment.
 * Only the author can delete their own comments.
 */
export async function deleteComment(commentId: string): Promise<boolean> {
  try {
    await api.delete(`/activity-comments/${commentId}/`);
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
}

/**
 * Get comments filtered by activity_id (using the query parameter).
 * This is an alternative to getCommentsByActivity that uses the ViewSet list endpoint.
 */
export async function getCommentsByActivityId(activityId: string): Promise<ActivityComment[]> {
  try {
    const data = await api.get(`/activity-comments/?activity_id=${activityId}`);
    return data as ActivityComment[];
  } catch (error) {
    console.error('Error fetching activity comments:', error);
    return [];
  }
}

export const activityCommentsApi = {
  getByActivity: getCommentsByActivity,
  getByActivityId: getCommentsByActivityId,
  create: createComment,
  update: updateComment,
  delete: deleteComment,
};