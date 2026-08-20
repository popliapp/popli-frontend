/* eslint-disable */
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  enabled: !__DEV__ && !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  sendDefaultPii: false,
});

import React, { useEffect } from 'react';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Platform, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useAuthStore, useKYCStore } from '../store';
import { useFCM } from '../hooks/useFCM';
import { ToastHost } from '../components/Toast';
import ReelUploadBanner from '../components/ReelUploadBanner';
import StoryUploadBanner from '../components/StoryUploadBanner';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import axios from 'axios';
import { BASE_URL } from '../api/client';
import '../global.css';

SplashScreen.preventAutoHideAsync().catch(() => {});

try {
  if (Platform.OS !== 'web') {
    setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
    });
  }
} catch (e) {
  console.warn('Firebase is not fully initialized. If you are in Expo Go or Web, this is expected.', e);
}

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

function RootLayout() {
  const [fontsLoaded] = useFonts({
    'DancingScript': require('../../assets/fonts/DancingScript-Bold.ttf'),
  });
  const { isLoggedIn, isOnboarded, userProfile, onboardingStep } = useAuthStore();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();

  useFCM();

  useEffect(() => {
    const verifyApiConnection = async () => {
      console.log(`[STARTUP] Verifying API Connection to: ${BASE_URL}`);
      try {
        const response = await axios.get(`${BASE_URL}/health`, { 
          timeout: 3000,
          headers: { 'Bypass-Tunnel-Reminder': 'true' }
        });
        if (response.status === 200) {
          console.log(`✅ [STARTUP] API Connected successfully to ${BASE_URL}`);
        }
      } catch (error: any) {
        console.warn(`❌ [STARTUP WARNING] API Unreachable at ${BASE_URL}`);
      }
    };
    verifyApiConnection();
  }, []);

  const [isRestoringSession, setIsRestoringSession] = React.useState(true);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setIsRestoringSession(false);
    }, 5000);
    return () => clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    const validateSession = async () => {
      try {
        const { token, isLoggedIn } = useAuthStore.getState();
        if (!isLoggedIn || !token) {
          setIsRestoringSession(false);
          return;
        }
        const { apiClient } = require('../api/client');
        await apiClient.get('/users/me');
      } catch (error: any) {
        if (error?.response?.status === 401) {
          const { performLogout } = require('../utils/logout');
          await performLogout('Your session has expired. Please sign in again.');
        }
      } finally {
        setIsRestoringSession(false);
      }
    };
    validateSession();
  }, []);

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    const rootSegment = segments[0] as string;
    const currentSegment = (segments[1] ?? '') as string;
    const inAuthGroup = rootSegment === '(auth)';
    const inSplash = !rootSegment || rootSegment === 'index';

    if (inSplash) return;

    if (!isOnboarded) {
      if (rootSegment !== '(auth)' || currentSegment !== 'onboarding') {
        setTimeout(() => router.replace('/(auth)/onboarding'), 0);
      }
      return;
    }

    if (isOnboarded && !isLoggedIn) {
      if (!inAuthGroup) {
        setTimeout(() => router.replace('/(auth)/login'), 0);
      }
      return;
    }

    if (isLoggedIn) {
      const isProfileComplete = useAuthStore.getState().userProfile?.isProfileComplete;
      const onboardingStep = useAuthStore.getState().onboardingStep;

      const onboardingScreens = ['interests', 'location', 'permissions', 'personalization-loader', 'profile-setup'];
      const isOnOnboardingScreen = inAuthGroup && onboardingScreens.includes(currentSegment);

      if (!isProfileComplete) {
        if (!isOnOnboardingScreen) {
          const isExemptFromOnboarding =
            rootSegment === 'edit-profile' ||
            rootSegment === 'settings' ||
            rootSegment === 'kyc' ||
            rootSegment === 'wallet' ||
            rootSegment === 'notifications' ||
            rootSegment === 'support';

          if (!isExemptFromOnboarding) {
            const safeStep = (onboardingStep && onboardingStep !== 'done')
              ? onboardingStep
              : 'interests';
            setTimeout(() => router.replace(`/(auth)/${safeStep}` as any), 0);
          }
        }
        return;
      }

      if (inAuthGroup) {
        const exemptRoutes = ['change-phone-otp', 'login', 'signup', 'otp', 'onboarding', 'legal'];
        if (exemptRoutes.includes(currentSegment)) return;

        if (onboardingScreens.includes(currentSegment)) {
          setTimeout(() => router.replace('/(tabs)/reels'), 0);
        } else {
          if (useAuthStore.getState().isFirstLogin) {
            useAuthStore.getState().setFirstLogin(false);
            setTimeout(() => router.replace('/kyc'), 0);
          } else {
            setTimeout(() => router.replace('/(tabs)/reels'), 0);
          }
        }
      }
    }
  }, [isLoggedIn, isOnboarded, segments, rootNavigationState?.key]);

  useEffect(() => {
    if (rootNavigationState?.key) {
      setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 500);
    }
  }, [rootNavigationState?.key]);

  if (isRestoringSession) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B001A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#0B001A' }} edges={['left', 'right']}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0B001A' },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="kyc" />
              <Stack.Screen name="chat/[id]" />
              <Stack.Screen name="wallet" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="support" />
            </Stack>
           <ReelUploadBanner />
            <StoryUploadBanner />
            <ToastHost />
          </SafeAreaView>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);