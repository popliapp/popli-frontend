import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, Platform, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { showError } from '../../store/toastStore';
// (assuming we can just replace Pressable with TouchableOpacity inside renderOtpBoxes)
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore, useKYCStore } from '../../store';
import { getDefaultAvatar } from '../../utils';
import { ChevronLeft } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../../api/client';
import { sendFirebaseOTP, verifyFirebaseOTP } from '../../lib/firebase';
import * as Notifications from 'expo-notifications';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

export default function OTPScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string; type?: string; target?: string; isSignup?: string; referredByCode?: string; phone?: string; intent?: string; name?: string; username?: string; email?: string; dob?: string; }>();

  const isResetMode = params.mode === 'reset';
  const isEmailType = params.type === 'email';
  const otpLength = 4;
  const targetLabel = params.target || '+91 987 xxx xxxx';

  const { setOnboardingComplete, setLogin } = useAuthStore();
  const [otpArray, setOtpArray] = useState<string[]>(() => Array(4).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [timerSeconds, setTimerSeconds] = useState<number>(300);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const hiddenInputRef = useRef<TextInput>(null);

  // Initialize otpArray size dynamically on mount or parameter changes
  useEffect(() => {
    setTimeout(() => {
      setOtpArray(Array(otpLength).fill(''));
      setFocusedIndex(0);
    }, 0);
    // Focus first input box on load
    setTimeout(() => {
      hiddenInputRef.current?.focus();
    }, 450);
  }, [otpLength]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  const otp = otpArray;
  const isOtpComplete = otpArray.every(val => val !== '');

  const triggerVerification = useCallback(async () => {
    if (isVerifying || isSuccess) return;
    setIsVerifying(true);

    try {
      if (isOtpComplete) {
        // 1. Verify OTP natively or use bypass
        const otpString = otp.join('');

        // 2. Ensure deviceId is generated and stored persistently
        let deviceId = await SecureStore.getItemAsync('deviceId');
        if (!deviceId) {
          deviceId = `device_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
          await SecureStore.setItemAsync('deviceId', deviceId);
        }

        // 3. Authenticate with backend using the bypass
   console.log('=== OTP SCREEN PARAMS ===', JSON.stringify(params));
        const response = await apiClient.post('/auth/demo-login', {
          otp: otpString,
          phone: params.phone || params.target,
          referredByCode: params.referredByCode || undefined,
        });

        if (response.data.accessToken) {
          const { setToken, setLogin, setFirstLogin, updateProfile } = useAuthStore.getState();
          setToken(response.data.accessToken);

          if (response.data.refreshToken) {
            await SecureStore.setItemAsync('refreshToken', response.data.refreshToken);
          }

          const userFromBackend = response.data.user;

          // If the user already completed their profile, they are an existing user.
          if (userFromBackend?.isProfileComplete) {
            try {
              const fullProfileRes = await apiClient.get('/users/me', {
                headers: { Authorization: `Bearer ${response.data.accessToken}` }
              });
              const fullProfile = fullProfileRes.data;
              updateProfile({
                id: fullProfile.id,
                name: fullProfile.name || 'Popli User',
                username: fullProfile.username,
                avatar: fullProfile.avatar || getDefaultAvatar(fullProfile.username),
                bio: fullProfile.bio || 'Living the life your style with your rules',
                city: fullProfile.city || '',
                category: fullProfile.category || '',
                followersCount: fullProfile.followersCount || 0,
                followingCount: fullProfile.followingCount || 0,
                giftsReceivedCount: fullProfile.giftsReceivedCount || 0,
                isVerified: fullProfile.isVerified || false,
                isProfileComplete: true,
                email: fullProfile.email || '',
                phone: fullProfile.phone || ''
              });
            } catch (err) {
              updateProfile({
                id: userFromBackend.id,
                name: userFromBackend.name || 'Popli User',
                username: userFromBackend.username,
                avatar: userFromBackend.avatar || getDefaultAvatar(userFromBackend.username),
                isProfileComplete: true,
                email: userFromBackend.email || '',
                phone: userFromBackend.phone || ''
              });
            }

        setIsVerifying(false);
setIsSuccess(true);
setLogin(true);
setFirstLogin(false);
const { status } = await Notifications.getPermissionsAsync();
if (status !== 'granted') {
  await Notifications.requestPermissionsAsync();
}
setTimeout(() => router.replace('/(tabs)/reels'), 50);
return;
          }

          // Existing User but profile not complete
          try {
            const signupName = params.name ? params.name.toString() : undefined;
            const signupUsername = params.username ? params.username.toString() : undefined;
            const signupEmail = params.email ? params.email.toString() : undefined;
            const signupPhone = params.phone ? params.phone.toString() : undefined;
            
            updateProfile({
              id: userFromBackend.id,
              name: signupName || userFromBackend.name || 'Popli User',
              username: signupUsername || userFromBackend.username,
              email: signupEmail || userFromBackend.email || '',
              phone: signupPhone || userFromBackend.phone || '',
              isProfileComplete: false
            });

     const { setOnboardingStep, setLogin, setFirstLogin } = useAuthStore.getState();
setOnboardingStep('interests');
setLogin(true);
setFirstLogin(false);
setIsVerifying(false);
setIsSuccess(true);
setTimeout(() => router.replace('/(auth)/interests'), 50);
          } catch (profileError) {
           console.error('Failed to process user profile:', profileError);
            setIsVerifying(false);
            showError('Failed to load profile. Please try again.');
          }
        }
      }
    } catch (e: any) {
      setIsVerifying(false);
      console.warn('OTP Verification Error:', e.response?.data || e.message);
    const errorMessage = typeof e.response?.data?.message === 'string'
        ? e.response.data.message
        : (e.response?.data?.message?.[0] || e.message || 'Invalid OTP. Please try again.');
      showError(errorMessage);
    }
  }, [isVerifying, isSuccess, isOtpComplete, otp, params]);

  const handleResendOTP = async () => {
    if (timerSeconds > 0) return;
    try {
      await sendFirebaseOTP(params.target as string);
      setOtpArray(Array(otpLength).fill(''));
      setTimerSeconds(300);
      setFocusedIndex(0);
      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 100);
   } catch (err: any) {
      showError('Failed to resend OTP');
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      try {
        router.replace('/(auth)/login');
      } catch {
        router.replace('/login');
      }
    }
  };

  // Single text change handler
  const handleTextChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '').slice(0, otpLength);

    const nextOtp = Array(otpLength).fill('');
    for (let i = 0; i < cleanText.length; i++) {
      nextOtp[i] = cleanText[i];
    }
    setOtpArray(nextOtp);
    setFocusedIndex(Math.min(cleanText.length, otpLength - 1));
  };
  // Render visual boxes + single hidden input
  const renderOtpBoxes = () => {
    const boxes = [];
    for (let i = 0; i < otpLength; i++) {
      const char = otpArray[i] || '';
      const isFilled = char !== '';
      const isFocused = focusedIndex === i;

      boxes.push(
        <View
          key={i}
          style={{
            flex: 1,
            marginHorizontal: 4,
            height: 56,
            backgroundColor: '#1D1037',
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
           borderColor: isFocused ? '#FF2D6B' : isFilled ? 'rgba(255,45,107,0.6)' : 'rgba(255,255,255,0.12)',
            transform: isFocused ? [{ scale: 1.05 }] : [{ scale: 1 }]
          }}
        >
          <Text style={styles.otpInputText}>{char}</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity activeOpacity={1} onPress={() => hiddenInputRef.current?.focus()} style={{ width: '100%', position: 'relative' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }} pointerEvents="none">
          {boxes}
        </View>
        <TextInput
          ref={hiddenInputRef}
          value={otpArray.join('')}
          onChangeText={handleTextChange}
          keyboardType="numeric"
          inputMode="numeric"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={otpLength}
          style={styles.hiddenInput}
          editable={!isVerifying && !isSuccess}
          caretHidden={true}
        />
      </TouchableOpacity>
    );
  };

  return (
 <KeyboardAvoidingView
      behavior="padding"
      style={{ flex: 1, backgroundColor: '#0D0015' }}
    >
      <LinearGradient
        colors={['#1a0030', '#0D0015', '#0D0015']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      {/* 1. Header completely isolated outside main body container for zIndex safety */}
      <View
        className="absolute top-12 left-6 right-6 h-12 flex-row items-center justify-between"
        style={{ zIndex: 999, elevation: 999 }}
        pointerEvents="box-none"
      >
     <Pressable
          onPress={handleBack}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.06)',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }]
          })}
        >
          <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* 2. Main content wrapper inside ScrollView to support smooth scrolling & tap persistent */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 20) + 40, paddingTop: Math.max(insets.top, 20) + 60 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Center Verification Card */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          className="flex-1 justify-center gap-8"
        >
          {isSuccess ? (
            <MotiView
              from={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="items-center gap-4"
            >
             <View style={{ width: 72, height: 72, backgroundColor: 'rgba(74,222,128,0.15)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)', borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#4ADE80', fontSize: 30, fontWeight: 'bold' }}>✓</Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}>Code Verified!</Text> 
              <Text className="text-white/60 text-xs text-center px-8">
                {isResetMode ? 'Setting up secure password reset...' : 'Creating your custom creator profile...'}
              </Text>
            </MotiView>
          ) : (
            <>
            <View style={{ gap: 8, marginBottom: 8 }}>
                <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 6 }}>
                  {isResetMode && isEmailType ? 'Enter Reset Code' : 'Enter OTP'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
                  {isEmailType
                    ? `Verify the code sent to your email ${targetLabel}`
                    : `Verify your number ${targetLabel}`
                  }
                </Text>
              </View>

              {/* Passcode Box Grid Layout */}
              <View className="gap-6">
                {renderOtpBoxes()}

                {/* Centered purple timer below OTP grid */}
                <View className="items-center mt-4">
                  <Pressable
                    onPress={handleResendOTP}
                    disabled={timerSeconds > 0}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF2D6B' }}>
                      {timerSeconds > 0
                        ? `Resend OTP in ${Math.floor(timerSeconds / 60)}:${(timerSeconds % 60).toString().padStart(2, '0')}`
                        : 'Resend Verification Code'
                      }
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Footer Next Button */}
              <View className="w-full mt-8" pointerEvents="box-none">
                <Pressable
                  onPress={() => {
                    if (isOtpComplete) {
                      // Reset KYC store so it starts fresh
                      useKYCStore.getState().resetKYC();
                      triggerVerification();
                    }
                  }}
                 style={{
                    backgroundColor: isOtpComplete ? '#FF2D6B' : 'rgba(255,255,255,0.08)',
                    height: 56,
                    borderRadius: 14,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: !isOtpComplete ? 0.5 : 1,
                  }}
                  disabled={!isOtpComplete || isVerifying || isSuccess}
                >
                  {isVerifying ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="color-white font-bold text-[16px]">
                      {params.isSignup === 'true' ? 'Sign Up' : 'Log In'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </MotiView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  otpInputText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    color: 'transparent',
  },
});
