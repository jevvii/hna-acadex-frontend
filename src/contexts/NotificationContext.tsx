// src/contexts/NotificationContext.tsx
//
// Notification context for managing push notifications.
// Sets up notification listeners, handles notification taps, and registers push token on login.

import React, { createContext, useContext, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import {
  initializePushNotifications,
  setupNotificationListeners,
  parseNotificationData,
  clearNotificationBadge,
} from '@/services/pushNotifications';

interface NotificationContextValue {
  isInitialized: boolean;
  lastNotification: Notifications.Notification | null;
  registerPushToken: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  isInitialized: false,
  lastNotification: null,
  registerPushToken: async () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const isInitializedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Handle notification tap - navigate to the relevant screen
  const handleNotificationTapped = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = parseNotificationData(response);
      if (!data) return;

      // Handle deep linking based on notification type
      if (data.type === 'reminder') {
        if (data.activity_id && data.course_section_id) {
          // Navigate to activity screen
          router.push({
            pathname: '/(app)/course/[id]/activity/[activityId]' as any,
            params: {
              id: data.course_section_id,
              activityId: data.activity_id,
            },
          });
        } else if (data.quiz_id && data.course_section_id) {
          // Navigate to quiz screen
          router.push({
            pathname: '/(app)/course/[id]/quiz/[quizId]' as any,
            params: {
              id: data.course_section_id,
              quizId: data.quiz_id,
            },
          });
        }
      } else if (data.type === 'new_activity' && data.activity_id && data.course_section_id) {
        router.push({
          pathname: '/(app)/course/[id]/activity/[activityId]' as any,
          params: {
            id: data.course_section_id,
            activityId: data.activity_id,
          },
        });
      } else if (data.type === 'new_quiz' && data.quiz_id && data.course_section_id) {
        router.push({
          pathname: '/(app)/course/[id]/quiz/[quizId]' as any,
          params: {
            id: data.course_section_id,
            quizId: data.quiz_id,
          },
        });
      }

      // Clear badge when notification is tapped
      clearNotificationBadge();
    },
    [router]
  );

  // Handle notification received while app is in foreground
  const handleNotificationReceived = useCallback(
    (notification: Notifications.Notification) => {
      // You can show an in-app toast/alert here if desired
      console.log('Notification received:', notification.request.content.title);
    },
    []
  );

  // Register push token with backend
  const registerPushToken = useCallback(async () => {
    if (!user) return;

    try {
      // Small delay to ensure auth tokens are fully saved to AsyncStorage
      await new Promise(resolve => setTimeout(resolve, 500));
      await initializePushNotifications();
      isInitializedRef.current = true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }, [user]);

  // Setup notification listeners on mount
  useEffect(() => {
    if (!user) return;

    // Initialize push notifications
    registerPushToken();

    // Setup listeners
    cleanupRef.current = setupNotificationListeners({
      onNotificationReceived: handleNotificationReceived,
      onNotificationTapped: handleNotificationTapped,
    });

    // Clear badge on app start
    clearNotificationBadge();

    // Handle notification that opened the app
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationTapped(response);
      }
    });

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [user, registerPushToken, handleNotificationReceived, handleNotificationTapped]);

  // Handle deep links from notifications (for cold start)
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      // Parse the URL and navigate accordingly
      // This handles deep links from notifications when app is not running
      console.log('Deep link received:', url);
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        isInitialized: isInitializedRef.current,
        lastNotification: null,
        registerPushToken,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);