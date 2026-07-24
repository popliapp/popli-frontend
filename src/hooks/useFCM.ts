import { useEffect } from 'react';
import { getMessaging, getToken, requestPermission, AuthorizationStatus, onTokenRefresh, onMessage, onNotificationOpenedApp, getInitialNotification } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { showInfo } from '../store/toastStore';
import { useAuthStore } from '../store';
import { apiClient } from '../api/client';
import { router } from 'expo-router';

export function useFCM() {
  const { isLoggedIn, updateProfile } = useAuthStore();

  useEffect(() => {
    // We only want to set up FCM if the user is actually logged in
    if (!isLoggedIn) return;

    let isMounted = true;

    async function setupFCM() {
      if (Platform.OS === 'web') return;
      try {
        // Test if Firebase is available
        const m = getMessaging();
        
        // 1. Request Permission (Required for iOS, Recommended for Android 13+)
        const authStatus = await requestPermission(m);
        const enabled =
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('FCM Permission not granted');
          return;
        }

        // 2. Get the Device Token
        const token = await getToken(m);
        console.log('FCM Token:', token);

        // 3. Send the token to our backend
if (token) {
          try {
            const res = await apiClient.put('/users/me', { deviceToken: token });
            console.log('FCM Token saved:', res.data?.deviceToken);
          } catch (error: any) {
            console.log('FCM token save failed:', JSON.stringify(error?.response?.data || error?.message));
          }
        }
        // Listen to whether the token changes
        return onTokenRefresh(m, async (newToken) => {
          console.log('FCM Token refreshed:', newToken);
          if (isMounted) {
             await apiClient.put('/users/me', { deviceToken: newToken });
          }
        });
      } catch (error) {
        console.warn('Firebase is not initialized (likely running in Web or Expo Go). Skipping FCM setup.');
      }
    }

    setupFCM();

  // 4. Notification Tap Routing
function handleNotificationRoute(data: Record<string, string> | undefined) {
      if (!data?.type) return;
      const { type, reelId, targetId } = data;

      switch (type) {
        case 'LIKE':
        case 'COMMENT':
        case 'COMMENT_LIKE':
        case 'TAG':
        case 'REPLY':
        case 'MENTION':
          if (reelId) router.push(`/reel/${reelId}` as any);
          else router.push('/notifications' as any);
          break;
        case 'FOLLOW':
          if (targetId) router.push(`/user/${targetId}` as any);
          else router.push('/notifications' as any);
          break;
        case 'GIFT':
          router.push('/(creator)/earnings' as any);
          break;
        case 'CHALLENGE_WIN':
        case 'CHALLENGE_JOINED':
        case 'CHALLENGE_APPROVED':
        case 'CHALLENGE_REJECTED':
          if (targetId) router.push(`/challenge/${targetId}` as any);
          else router.push('/challenges' as any);
          break;
        case 'STORY_MENTION':
          if (targetId) router.push(`/story-viewer/${targetId}` as any);
          else router.push('/notifications' as any);
          break;
        case 'SYSTEM':
          router.push('/(creator)/earnings' as any);
          break;
        case 'SUPPORT':
          router.push('/user/my-tickets' as any);
          break;
        default:
          router.push('/notifications' as any);
      }
    }

    // Background tap (app was in background)
    const unsubscribeTap = onNotificationOpenedApp(getMessaging(), remoteMessage => {
      handleNotificationRoute(remoteMessage.data as Record<string, string>);
    });

    // Quit state tap (app was fully closed)
    getInitialNotification(getMessaging()).then(remoteMessage => {
      if (remoteMessage) {
        setTimeout(() => {
          handleNotificationRoute(remoteMessage.data as Record<string, string>);
        }, 1000);
      }
    });

    // 4. Foreground Message Listener
    let unsubscribeForeground = () => {};
    if (Platform.OS !== 'web') {
      try {
        unsubscribeForeground = onMessage(getMessaging(), async (remoteMessage) => {
          console.log('A new FCM message arrived in the foreground!', JSON.stringify(remoteMessage));
      if (remoteMessage.notification) {
            const title = remoteMessage.notification.title || 'New Notification';
            const body = remoteMessage.notification.body || '';
            showInfo(body ? `${title}: ${body}` : title);
          }
        });
      } catch (error) {
        // Ignore if Expo Go
      }
    }

return () => {
      isMounted = false;
      unsubscribeForeground();
      unsubscribeTap();
    };
  }, [isLoggedIn]);
}
