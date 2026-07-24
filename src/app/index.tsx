import React, { useEffect } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '../store';

export default function EntryRedirectScreen() {
  const { isLoggedIn, isOnboarded } = useAuthStore();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    const timer = setTimeout(() => {
      if (!isOnboarded) {
        router.replace('/(auth)/onboarding');
      } else if (!isLoggedIn) {
        router.replace('/(auth)/login');
      } else {
        router.replace('/(tabs)/reels');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [rootNavigationState?.key, isOnboarded, isLoggedIn]);

  if (!rootNavigationState?.key) return null;

  return null;
}
