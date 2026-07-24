import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail, Shield, CheckCircle2 } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // High-fidelity validation regexes
  const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputValue.trim());
  const isMobileFormat = /^[0-9]{10}$/.test(inputValue.trim());
  const isValidInput = isEmailFormat || isMobileFormat;

  const handleSendCode = async () => {
    if (!isValidInput || isSending) return;
    setIsSending(true);

    // Simulate verified API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSending(false);

    if (isEmailFormat) {
      // Transition to "Check your email" (Screenshot 2)
      setIsSubmitted(true);
    } else {
      // Directly route to otp.tsx in 4-digit mobile reset configuration
      const targetPhone = `+91 ${inputValue.trim()}`;
      try {
        router.push({
          pathname: '/(auth)/otp',
          params: { mode: 'reset', type: 'mobile', target: targetPhone }
        });
      } catch {
        router.push({
          pathname: '/otp',
          params: { mode: 'reset', type: 'mobile', target: targetPhone }
        });
      }
    }
  };

  const handleEnterResetCode = () => {
    // Navigate to dynamic OTP screen set up for 6-digit email reset code
    const targetEmail = inputValue.trim();
    try {
      router.push({
        pathname: '/(auth)/otp',
        params: { mode: 'reset', type: 'email', target: targetEmail }
      });
    } catch {
      router.push({
        pathname: '/otp',
        params: { mode: 'reset', type: 'email', target: targetEmail }
      });
    }
  };

  const handleBack = () => {
    if (isSubmitted) {
      setIsSubmitted(false);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      try {
        router.replace('/(auth)/login');
      } catch {
        router.replace('/login');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      className="flex-1 bg-[#0B001A]"
    >
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
            opacity: pressed ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }]
          })}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/5 items-center justify-center active:scale-[0.9]"
        >
          <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* 2. Main content wrapper inside ScrollView to support smooth scrolling & tap persistent */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32, paddingTop: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center">
          <AnimatePresence exitBeforeEnter>
            {!isSubmitted ? (
              // PHASE 1: EMAIL / PHONE INPUT FORM (Screenshot 1)
              <MotiView
                key="phase_input"
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'timing', duration: 300 }}
                className="gap-8"
              >
                {/* Header envelope badge */}
                <View className="items-center">
                  <View className="w-16 h-16 bg-[#1D1037] border-2 border-primary-purple/20 rounded-2xl items-center justify-center shadow-lg">
                    <Mail size={28} color="#A78BFA" strokeWidth={2} />
                  </View>
                  <Text className="text-white font-black text-3xl mt-6 tracking-tight text-center">
                    Forgot Password?
                  </Text>
                  <Text className="text-white/60 text-xs text-center mt-2.5 px-6 leading-5">
                    {"Enter your email and we'll send you a 6-digit reset code."}
                  </Text>
                </View>

                {/* Input Container */}
                <View className="gap-2">
                  <Text className="text-white/80 text-xs font-semibold px-2">
                    Email Address or Phone Number
                  </Text>
                  <View className="bg-[#1D1037]/45 border border-primary-purple/20 rounded-full px-5 flex-row items-center gap-3 h-14">
                    <Mail size={16} color="rgba(255, 255, 255, 0.4)" />
                    <TextInput
                      value={inputValue}
                      onChangeText={setInputValue}
                      placeholder="you@example.com or 10-digit number"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      className="flex-1 text-white text-sm font-normal py-3 h-full"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isSending}
                    />
                  </View>
                </View>

                {/* Send Button */}
                <Pressable
                  onPress={handleSendCode}
                  disabled={!isValidInput || isSending}
                  style={({ pressed }) => ({
                    opacity: (!isValidInput || isSending) ? 0.55 : pressed ? 0.92 : 1,
                    transform: [{ scale: (isValidInput && !isSending && pressed) ? 0.98 : 1 }]
                  })}
                  className={`h-14 rounded-full items-center justify-center flex-row gap-2 transition-all ${
                    isValidInput && !isSending
                      ? 'bg-primary-purple shadow-lg shadow-primary-purple/40'
                      : 'bg-white/5 border border-white/5'
                  }`}
                >
                  <Text className="text-white text-sm font-bold uppercase tracking-wider">
                    {isSending ? 'Sending Code...' : 'Send Reset Code'}
                  </Text>
                </Pressable>

                {/* Secure Disclaimer matching bottom card of Screenshot 1 */}
                <View className="bg-[#1D1037]/25 border border-primary-purple/10 rounded-2xl p-4 flex-row gap-3">
                  <View className="mt-0.5">
                    <Shield size={16} color="#A78BFA" />
                  </View>
                  <Text className="text-white/60 text-[11px] leading-5 flex-1">
                    {"A 6-digit code will be emailed to you. Check your spam folder if you don't see it."}
                  </Text>
                </View>
              </MotiView>
            ) : (
              // PHASE 2: CHECK YOUR EMAIL SUCCESS CARD (Screenshot 2)
              <MotiView
                key="phase_success"
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'timing', duration: 300 }}
                className="gap-8"
              >
                {/* Check your email header badge */}
                <View className="items-center">
                  <View className="w-16 h-16 bg-[#1D1037] border-2 border-primary-purple/20 rounded-2xl items-center justify-center shadow-lg mb-6">
                    <Mail size={28} color="#A78BFA" strokeWidth={2} />
                  </View>

                  {/* Centered green check icon circle */}
                  <MotiView
                    from={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 10, delay: 100 }}
                    className="w-16 h-16 bg-[#10B981]/15 border-2 border-[#10B981]/30 rounded-full items-center justify-center mb-6"
                  >
                    <CheckCircle2 size={28} color="#10B981" strokeWidth={2.5} />
                  </MotiView>

                  <Text className="text-white font-black text-3xl tracking-tight text-center">
                    Check your email
                  </Text>
                  <Text className="text-white/60 text-xs text-center mt-3 px-6 leading-5">
                    We sent a reset code to{' '}
                    <Text className="text-white font-black">{inputValue.trim()}</Text>.
                    Enter it on the next screen.
                  </Text>
                </View>

                {/* Primary Button to proceed to OTP input */}
                <Pressable
                  onPress={handleEnterResetCode}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }]
                  })}
                  className="h-14 bg-primary-purple rounded-full items-center justify-center flex-row gap-2 shadow-lg shadow-primary-purple/40"
                >
                  <Text className="text-white text-sm font-bold uppercase tracking-wider">
                    Enter Reset Code
                  </Text>
                </Pressable>

                {/* Resend footer options */}
                <View className="items-center flex-row justify-center gap-2 mt-2">
                  <Text className="text-white/40 text-xs">{"Didn't receive it?"}</Text>
                  <Pressable 
                    onPress={() => {
                      setIsSubmitted(false);
                      handleSendCode();
                    }}
                    style={({ pressed }) => ({ 
                      opacity: pressed ? 0.6 : 1,
                      transform: [{ scale: pressed ? 0.95 : 1 }]
                    })}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Text className="text-primary-pink text-xs font-bold hover:underline">
                      Resend
                    </Text>
                  </Pressable>
                </View>
              </MotiView>
            )}
          </AnimatePresence>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
