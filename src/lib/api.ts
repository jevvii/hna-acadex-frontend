import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'hna_access_token';
const REFRESH_TOKEN_KEY = 'hna_refresh_token';

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

const resolveApiBaseUrl = () => {
  const configured = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
  let url = normalizeBaseUrl(configured);

  if (Platform.OS === 'android') {
    url = url
      .replace('://localhost', '://10.0.2.2')
      .replace('://127.0.0.1', '://10.0.2.2');
  }

  return url;
};

export const API_BASE_URL = resolveApiBaseUrl();

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function setAuthTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// Keep clearAuthTokens as an alias for backward compatibility
export const clearAuthTokens = clearTokens;

async function refreshAccessToken() {
  const refresh = await getRefreshToken();
  if (!refresh) return null;

  const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.access) return null;

  await setAccessToken(data.access);
  return data.access as string;
}

export class ApiError extends Error {
  status: number;
  payload: any;

  constructor(message: string, status: number, payload: any) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type RequestOptions = {
  method?: string;
  body?: any;
  auth?: boolean;
  isFormData?: boolean;
};

type RawRequestResult = {
  text: string;
  headers: Headers;
};

async function request(path: string, options: RequestOptions = {}, retry = true) {
  const { method = 'GET', body, auth = true, isFormData = false } = options;
  const headers: Record<string, string> = {};

  let token = auth ? await getAccessToken() : null;
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body == null ? undefined : (isFormData ? body : JSON.stringify(body)),
  });

  if (res.status === 401 && auth && retry) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      await clearAuthTokens();
      throw new ApiError('Session expired. Please sign in again.', 401, null);
    }
    return request(path, options, false);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail = data?.detail || data?.message || 'Request failed';
    throw new ApiError(detail, res.status, data);
  }

  return data;
}

async function requestRaw(path: string, options: RequestOptions = {}, retry = true): Promise<RawRequestResult> {
  const { method = 'GET', body, auth = true, isFormData = false } = options;
  const headers: Record<string, string> = {};

  let token = auth ? await getAccessToken() : null;
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body == null ? undefined : (isFormData ? body : JSON.stringify(body)),
  });

  if (res.status === 401 && auth && retry) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      await clearAuthTokens();
      throw new ApiError('Session expired. Please sign in again.', 401, null);
    }
    return requestRaw(path, options, false);
  }

  const text = await res.text();
  if (!res.ok) {
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { detail: text };
    }
    const detail = payload?.detail || payload?.message || 'Request failed';
    throw new ApiError(detail, res.status, payload);
  }

  return { text, headers: res.headers };
}

export const api = {
  get: (path: string, auth = true) => request(path, { method: 'GET', auth }),
  post: (path: string, body?: any, auth = true) => request(path, { method: 'POST', body, auth }),
  patch: (path: string, body?: any, auth = true) => request(path, { method: 'PATCH', body, auth }),
  put: (path: string, body?: any, auth = true) => request(path, { method: 'PUT', body, auth }),
  delete: (path: string, auth = true) => request(path, { method: 'DELETE', auth }),
  postForm: (path: string, formData: FormData, auth = true) =>
    request(path, { method: 'POST', body: formData, auth, isFormData: true }),
  patchForm: (path: string, formData: FormData, auth = true) =>
    request(path, { method: 'PATCH', body: formData, auth, isFormData: true }),
  getRaw: (path: string, auth = true) => requestRaw(path, { method: 'GET', auth }),
};

// Auth API helpers
export const authApi = {
  changePassword: async (newPassword: string) => {
    return api.post('/auth/change-password/', { new_password: newPassword });
  },
  forgotPassword: async (email: string) => {
    return api.post('/auth/forgot-password/', { email }, false);
  },
};
