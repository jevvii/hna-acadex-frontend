// src/services/reminders.ts
//
// API service for managing activity/quiz reminders.
// Provides CRUD operations for ActivityReminder model.

import { api } from '@/lib/api';

export interface Reminder {
  id: string;
  user_id: string;
  reminder_type: 'activity' | 'quiz';
  activity_id?: string;
  quiz_id?: string;
  course_section_id?: string;
  activity_title?: string;
  activity_deadline?: string;
  reminder_datetime: string;
  offset_minutes: number;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateReminderData {
  reminder_type: 'activity' | 'quiz';
  activity_id?: string;
  quiz_id?: string;
  reminder_datetime: string;
  offset_minutes: number;
}

export interface ReminderFilters {
  activity_id?: string;
  quiz_id?: string;
  reminder_type?: 'activity' | 'quiz';
}

/**
 * Get all reminders for the current user.
 */
export async function listReminders(filters?: ReminderFilters): Promise<Reminder[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.activity_id) {
      params.append('activity_id', filters.activity_id);
    }
    if (filters?.quiz_id) {
      params.append('quiz_id', filters.quiz_id);
    }
    if (filters?.reminder_type) {
      params.append('reminder_type', filters.reminder_type);
    }

    const queryString = params.toString();
    const path = queryString ? `/reminders/?${queryString}` : '/reminders/';

    const data = await api.get(path);
    return data as Reminder[];
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return [];
  }
}

/**
 * Get reminders for a specific activity.
 */
export async function getRemindersByActivity(activityId: string): Promise<Reminder[]> {
  return listReminders({ activity_id: activityId });
}

/**
 * Get reminders for a specific quiz.
 */
export async function getRemindersByQuiz(quizId: string): Promise<Reminder[]> {
  return listReminders({ quiz_id: quizId });
}

/**
 * Get a specific reminder by ID.
 */
export async function getReminder(reminderId: string): Promise<Reminder | null> {
  try {
    const data = await api.get(`/reminders/${reminderId}/`);
    return data as Reminder;
  } catch (error) {
    console.error('Error fetching reminder:', error);
    return null;
  }
}

/**
 * Create a new reminder.
 */
export async function createReminder(data: CreateReminderData): Promise<Reminder | null> {
  try {
    const response = await api.post('/reminders/', data);
    return response as Reminder;
  } catch (error) {
    console.error('Error creating reminder:', error);
    return null;
  }
}

/**
 * Update an existing reminder.
 */
export async function updateReminder(
  reminderId: string,
  data: Partial<CreateReminderData>
): Promise<Reminder | null> {
  try {
    const response = await api.patch(`/reminders/${reminderId}/`, data);
    return response as Reminder;
  } catch (error) {
    console.error('Error updating reminder:', error);
    return null;
  }
}

/**
 * Delete a reminder.
 */
export async function deleteReminder(reminderId: string): Promise<boolean> {
  try {
    await api.delete(`/reminders/${reminderId}/`);
    return true;
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return false;
  }
}

/**
 * Helper to calculate reminder datetime from a deadline.
 */
export function calculateReminderDatetime(
  deadline: Date | string,
  offsetMinutes: number
): string {
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const reminderDate = new Date(deadlineDate.getTime() - offsetMinutes * 60 * 1000);
  return reminderDate.toISOString();
}

/**
 * Preset reminder options (offsets in minutes before deadline).
 */
export const REMINDER_PRESETS = [
  { id: '5min', label: '5 Minutes Before', offsetMinutes: 5 },
  { id: '15min', label: '15 Minutes Before', offsetMinutes: 15 },
  { id: '30min', label: '30 Minutes Before', offsetMinutes: 30 },
  { id: '1hr', label: '1 Hour Before', offsetMinutes: 60 },
  { id: '2hr', label: '2 Hours Before', offsetMinutes: 120 },
  { id: '1day', label: '1 Day Before', offsetMinutes: 24 * 60 },
  { id: '1week', label: '1 Week Before', offsetMinutes: 7 * 24 * 60 },
] as const;

/**
 * Format offset minutes to a human-readable label.
 */
export function formatOffsetLabel(offsetMinutes: number): string {
  if (offsetMinutes < 60) {
    return `${offsetMinutes} Minute${offsetMinutes === 1 ? '' : 's'} Before`;
  }
  if (offsetMinutes < 24 * 60) {
    const hours = Math.floor(offsetMinutes / 60);
    return `${hours} Hour${hours === 1 ? '' : 's'} Before`;
  }
  if (offsetMinutes < 7 * 24 * 60) {
    const days = Math.floor(offsetMinutes / (24 * 60));
    return `${days} Day${days === 1 ? '' : 's'} Before`;
  }
  const weeks = Math.floor(offsetMinutes / (7 * 24 * 60));
  return `${weeks} Week${weeks === 1 ? '' : 's'} Before`;
}

/**
 * Check if a reminder is in the past.
 */
export function isReminderPast(reminder: Reminder): boolean {
  const reminderDate = new Date(reminder.reminder_datetime);
  return reminderDate < new Date();
}

/**
 * Check if a reminder is upcoming (not yet sent and in the future).
 */
export function isReminderUpcoming(reminder: Reminder): boolean {
  return !reminder.notification_sent && !isReminderPast(reminder);
}

export const reminderApi = {
  list: listReminders,
  getByActivity: getRemindersByActivity,
  getByQuiz: getRemindersByQuiz,
  get: getReminder,
  create: createReminder,
  update: updateReminder,
  delete: deleteReminder,
};