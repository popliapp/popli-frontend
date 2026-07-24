import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B001A' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="create-new-password" />
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="location" />
      <Stack.Screen name="permissions" />
      <Stack.Screen name="personalization-loader" />
    </Stack>
  );
}
