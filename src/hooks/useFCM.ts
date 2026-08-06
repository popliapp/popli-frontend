import { useEffect, useRef } from 'react';
import {
  getMessaging,
  getToken,
  requestPermission,
  AuthorizationStatus,
  onTokenRefresh,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
} from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { showInfo } from '../store/toastStore';
import { useAuthStore } from '../store';
import { apiClient } from '../api/client';
import { router } from 'expo-router';

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
      else router.push('/view-all/notifications' as any);
      break;
    case 'FOLLOW':
      if (targetId) router.push(`/user/${targetId}` as any);
      else router.push('/view-all/notifications' as any);
      break;
    case 'GIFT':
      router.push('/(creator)/earnings' as any);
      break;
    case 'CHALLENGE_WIN':
    case 'CHALLENGE_JOINED':
    case 'CHALLENGE_APPROVED':
    case 'CHALLENGE_REJECTED':
    case 'CHALLENGE_INVITE':
    case 'CHALLENGE_RANKING':
    case 'CHALLENGE_ENDING_SOON':
    case 'CHALLENGE_REWARD_CREDITED':
      if (targetId) router.push(`/challenge/${targetId}` as any);
      else router.push('/view-all/notifications' as any);
      break;
    case 'STORY_MENTION':
      if (targetId) router.push(`/story-viewer/${targetId}` as any);
      else router.push('/view-all/notifications' as any);
      break;
    case 'WITHDRAWAL_APPROVED':
    case 'WITHDRAWAL_REJECTED':
    case 'WITHDRAWAL_PROCESSING':
    case 'WITHDRAWAL_FAILED':
      router.push('/view-all/wallet' as any);
      break;
    case 'SYSTEM':
      router.push('/view-all/notifications' as any);
      break;
    case 'SUPPORT':
      router.push('/user/my-tickets' as any);
      break;
    default:
      router.push('/view-all/notifications' as any);
  }
}

export function useFCM() {
  const { isLoggedIn } = useAuthStore();
  const initialNotificationHandled = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (initialNotificationHandled.current) return;
    initialNotificationHandled.current = true;

    getInitialNotification(getMessaging()).then(remoteMessage => {
      if (!remoteMessage) return;
      const attempt = (retries: number) => {
        setTimeout(() => {
          try {
            handleNotificationRoute(remoteMessage.data as Record<string, string>);
          } catch {
            if (retries > 0) attempt(retries - 1);
          }
        }, 1500);
      };
      attempt(3);
    });
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (Platform.OS === 'web') return;

    let isMounted = true;
    let unsubscribeTokenRefresh: (() => void) | undefined;

    async function setupFCM() {
      try {
        const m = getMessaging();

        const authStatus = await requestPermission(m);
        const enabled =
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL;

        if (!enabled) return;

        const token = await getToken(m);

        if (token && isMounted) {
          try {
            await apiClient.put('/users/me', { deviceToken: token });
          } catch (error: any) {
            console.log('FCM token save failed:', JSON.stringify(error?.response?.data || error?.message));
          }
        }

        unsubscribeTokenRefresh = onTokenRefresh(m, async (newToken) => {
          if (!isMounted) return;
          try {
            await apiClient.put('/users/me', { deviceToken: newToken });
          } catch (error: any) {
            console.log('FCM token refresh save failed:', JSON.stringify(error?.response?.data || error?.message));
          }
        });
      } catch {
        console.warn('Firebase not initialized. Skipping FCM setup.');
      }
    }

    setupFCM();

    const unsubscribeTap = onNotificationOpenedApp(getMessaging(), remoteMessage => {
      handleNotificationRoute(remoteMessage.data as Record<string, string>);
    });

    let unsubscribeForeground: () => void = () => {};
    try {
      unsubscribeForeground = onMessage(getMessaging(), async remoteMessage => {
        if (remoteMessage.notification) {
          const title = remoteMessage.notification.title || 'New Notification';
          const body = remoteMessage.notification.body || '';
          showInfo(body ? `${title}: ${body}` : title);
        }
      });
    } catch {}

    return () => {
      isMounted = false;
      unsubscribeForeground();
      unsubscribeTap();
      if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
    };
  }, [isLoggedIn]);
}