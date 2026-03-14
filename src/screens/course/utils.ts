// src/screens/course/utils.ts
// Shared utility functions for course screens

export function formatDate(dateStr?: string) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateShort(dateStr?: string) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDuration(seconds?: number | null) {
  if (seconds == null || seconds < 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function parseFilenameFromContentDisposition(headerValue?: string | null) {
  if (!headerValue) return null;
  const utfMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);
  const plainMatch = headerValue.match(/filename=\"?([^\";]+)\"?/i);
  if (plainMatch?.[1]) return plainMatch[1];
  return null;
}

export function isImageFile(fileName: string, mimeType?: string) {
  if ((mimeType || '').startsWith('image/')) return true;
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
}

export function fileNameFromUrl(url: string) {
  const clean = url.split('?')[0].split('#')[0];
  const name = clean.split('/').pop();
  return name || 'file';
}

export const FILE_ICONS: Record<string, string> = {
  pdf: 'document-text',
  docx: 'document',
  doc: 'document',
  pptx: 'easel',
  xlsx: 'grid',
  xls: 'grid',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  mp4: 'videocam',
  mov: 'videocam',
  mp3: 'musical-notes',
  wav: 'musical-notes',
  zip: 'archive',
  link: 'link',
};

// Note: API_BASE_URL should be imported from api.ts for consistency
import { API_BASE_URL } from '@/lib/api';

export function resolveBackendFileUrl(rawUrl: string) {
  if (!rawUrl) return rawUrl;
  if (/^(file:|content:|data:|blob:)/i.test(rawUrl)) return rawUrl;

  // If already a full URL, extract the origin from API_BASE_URL and normalize
  const apiOrigin = API_BASE_URL.replace(/\/api$/, '');

  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, apiOrigin);
  }

  if (rawUrl.startsWith('/')) return `${apiOrigin}${rawUrl}`;
  return `${apiOrigin}/${rawUrl.replace(/^\.?\//, '')}`;
}

// Derive UI activity status from submission data
export function getActivityStatus(submission: { status?: string } | null | undefined): 'not-submitted' | 'submitted' | 'graded' {
  if (!submission) return 'not-submitted';
  const status = submission.status;
  if (status === 'graded') return 'graded';
  if (status === 'submitted' || status === 'late') return 'submitted';
  return 'not-submitted';
}