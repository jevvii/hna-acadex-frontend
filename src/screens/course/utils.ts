// src/screens/course/utils.ts
// Shared utility functions for course screens

export function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
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
  mp4: 'videocam',
  link: 'link',
};

export const API_ORIGIN = 'http://localhost:8000';

export function resolveBackendFileUrl(rawUrl: string) {
  if (!rawUrl) return rawUrl;
  if (/^(file:|content:|data:|blob:)/i.test(rawUrl)) return rawUrl;

  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, API_ORIGIN);
  }

  if (rawUrl.startsWith('/')) return `${API_ORIGIN}${rawUrl}`;
  return `${API_ORIGIN}/${rawUrl.replace(/^\.?\//, '')}`;
}