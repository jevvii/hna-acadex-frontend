// src/services/pushNotifications.ts
//
// Push notification service for handling FCM/APNs notifications via Expo.
// Provides functions to request permissions, get push tokens, and handle notifications.

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from '@/lib/api';

// Dev testing mode: Enable notification simulation on emulators/simulators
// Set EXPO_PUBLIC_DEV_NOTIFICATIONS_ENABLED=1 in .env to enable
const DEV_NOTIFICATIONS_ENABLED =
  __DEV__ && process.env.EXPO_PUBLIC_DEV_NOTIFICATIONS_ENABLED === '1';

// Mock token prefix for dev mode (Expo uses ExponentPushToken[...] format)
const DEV_MOCK_TOKEN_PREFIX = 'DevPushToken';

/**
 * Generate a mock push token for dev testing on emulators.
 */
function generateDevMockToken(): string {
  const platform = Platform.OS;
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${DEV_MOCK_TOKEN_PREFIX}[${platform}_${timestamp}_${random}]`;
}

/**
 * Check if dev notification testing mode is enabled.
 */
export function isDevNotificationsEnabled(): boolean {
  return DEV_NOTIFICATIONS_ENABLED;
}

/**
 * Simulate receiving a notification (for dev testing on emulators).
 * This triggers the notification handlers as if a real push was received.
 */
export async function simulateNotification(
  title: string,
  body: string,
  data?: NotificationData
): Promise<string | null> {
  if (!DEV_NOTIFICATIONS_ENABLED) {
    console.warn('simulateNotification() requires EXPO_PUBLIC_DEV_NOTIFICATIONS_ENABLED=1');
    return null;
  }

  console.log('[Dev Mode] Simulating notification:', { title, body, data });

  // Use local notification to trigger handlers
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: null, // Immediate
  });

  return id;
}

/**
 * Simulate a notification tap (for dev testing).
 * Triggers the notification response handler with mock data.
 */
export async function simulateNotificationTap(
  title: string,
  body: string,
  data?: NotificationData
): Promise<void> {
  if (!DEV_NOTIFICATIONS_ENABLED) {
    console.warn('simulateNotificationTap() requires EXPO_PUBLIC_DEV_NOTIFICATIONS_ENABLED=1');
    return;
  }

  console.log('[Dev Mode] Simulating notification tap:', { title, body, data });

  // Schedule an immediate notification - when tapped, it will trigger the listener
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('[Dev Mode] Error simulating notification tap:', error);
  }
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushTokenData {
  id: string;
  token: string;
  device_type: 'android' | 'ios' | 'web';
  device_name?: string;
  is_active: boolean;
}

export interface NotificationData {
  type: string;
  reminder_type?: 'activity' | 'quiz';
  activity_id?: string;
  quiz_id?: string;
  course_section_id?: string;
}

export interface NotificationListenerCallbacks {
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void;
}

let notificationListeners: Notifications.Subscription[] = [];
let pushToken: string | null = null;

/**
 * Request notification permissions from the user.
 * In dev mode, bypasses Device.isDevice check for emulator testing.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Skip device check in dev mode to allow emulator testing
  if (!Device.isDevice && !DEV_NOTIFICATIONS_ENABLED) {
    console.log('Push notifications are not available on simulators/emulators');
    console.log('Tip: Set EXPO_PUBLIC_DEV_NOTIFICATIONS_ENABLED=1 in .env for dev testing');
    return false;
  }

  if (DEV_NOTIFICATIONS_ENABLED && !Device.isDevice) {
    console.log('[Dev Mode] Bypassing Device.isDevice check for notification permissions');
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  // For Android, create notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A3A6B',
      enableVibrate: true,
      enableLights: true,
    });

    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A3A6B',
    });
  }

  return true;
}

/**
 * Get the Expo push token for this device.
 * In dev mode, generates a mock token for emulator testing.
 */
export async function getExpoPushToken(): Promise<string | null> {
  // Skip device check in dev mode to allow emulator testing
  if (!Device.isDevice && !DEV_NOTIFICATIONS_ENABLED) {
    console.log('Push notifications are not available on simulators/emulators');
    console.log('Tip: Set EXPO_PUBLIC_DEV_NOTIFICATIONS_ENABLED=1 in .env for dev testing');
    return null;
  }

  // Generate mock token in dev mode for emulators
  if (DEV_NOTIFICATIONS_ENABLED && !Device.isDevice) {
    const mockToken = generateDevMockToken();
    console.log(`[Dev Mode] Generated mock push token: ${mockToken}`);
    return mockToken;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '2abcadef-80f9-42ad-b290-553499a73d94', // EAS project ID
    });

    return token.data;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
}

/**
 * Register the push token with the backend.
 * Retries with exponential backoff if auth tokens aren't ready yet.
 */
export async function registerPushTokenWithBackend(
  token: string,
  deviceName?: string
): Promise<boolean> {
  const deviceType = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const deviceNameFinal = deviceName || Device.modelName || 'Unknown Device';

  // Retry with exponential backoff in case auth tokens aren't ready yet
  const maxRetries = 3;
  const baseDelay = 500; // 500ms

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await api.post('/push-tokens/', {
        token,
        device_type: deviceType,
        device_name: deviceNameFinal,
      });

      pushToken = token;
      return true;
    } catch (error: any) {
      // If it's a 401 error and we haven't exhausted retries, wait and retry
      if (error?.status === 401 && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Push token registration failed with 401, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      console.error('Error registering push token with backend:', error);
      return false;
    }
  }
  return false;
}

/**
 * Unregister a push token from the backend.
 */
export async function unregisterPushToken(tokenId: string): Promise<boolean> {
  try {
    await api.delete(`/push-tokens/${tokenId}/`);
    return true;
  } catch (error) {
    console.error('Error unregistering push token:', error);
    return false;
  }
}

/**
 * Get all registered push tokens for the current user.
 */
export async function getPushTokens(): Promise<PushTokenData[]> {
  try {
    const data = await api.get('/push-tokens/');
    return data as PushTokenData[];
  } catch (error) {
    console.error('Error getting push tokens:', error);
    return [];
  }
}

/**
 * Setup notification listeners.
 */
export function setupNotificationListeners(
  callbacks: NotificationListenerCallbacks
): () => void {
  // Clean up existing listeners
  notificationListeners.forEach(listener => listener.remove());
  notificationListeners = [];

  // Listen for notifications received while app is foregrounded
  if (callbacks.onNotificationReceived) {
    notificationListeners.push(
      Notifications.addNotificationReceivedListener(callbacks.onNotificationReceived)
    );
  }

  // Listen for notification responses (when user taps notification)
  if (callbacks.onNotificationTapped) {
    notificationListeners.push(
      Notifications.addNotificationResponseReceivedListener(callbacks.onNotificationTapped)
    );
  }

  // Return cleanup function
  return () => {
    notificationListeners.forEach(listener => listener.remove());
    notificationListeners = [];
  };
}

/**
 * Initialize push notifications.
 * This should be called when the app starts or when user logs in.
 */
export async function initializePushNotifications(): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  const token = await getExpoPushToken();
  if (token) {
    await registerPushTokenWithBackend(token);
  }

  return token;
}

/**
 * Get the currently registered push token.
 */
export function getCurrentPushToken(): string | null {
  return pushToken;
}

/**
 * Schedule a local notification.
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: NotificationData,
  trigger?: Notifications.NotificationRequestInput['trigger']
): Promise<string | null> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: trigger || null,
    });

    return id;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification.
 */
export async function cancelScheduledNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications.
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Get the last notification response (for app opened from notification).
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

/**
 * Clear notification badge.
 */
export async function clearNotificationBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Parse notification data from a notification response.
 */
export function parseNotificationData(
  response: Notifications.NotificationResponse
): NotificationData | null {
  const data = response.notification.request.content.data;
  if (data && typeof data === 'object') {
    return data as NotificationData;
  }
  return null;
}