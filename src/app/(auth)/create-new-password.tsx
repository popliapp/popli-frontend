import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

export default function CreateNewPasswordScreen() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Real-time strength validations
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /[0-9]/.test(newPassword);
  const isMatching = newPassword === confirmPassword && newPassword.length > 0;
  const isValid = hasMinLength && hasNumber && isMatching;

  const handleResetPassword = async () => {
    if (!isValid || isResetting) return;
    setIsResetting(true);

    // Simulate password updates network call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsResetting(false);
    setIsSuccess(true);

    // Redirect back to Login screen to try new credentials
    setTimeout(() => {
      try {
        router.replace('/(auth)/login');
      } catch {
        router.replace('/login');
      }
    }, 1500);
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
        {!isSuccess && (
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
        )}
      </View>

      {/* 2. Main content wrapper inside ScrollView to support smooth scrolling & tap persistent */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32, paddingTop: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center">
          <AnimatePresence exitBeforeEnter>
            {!isSuccess ? (
              // PHASE 1: CREATE NEW PASSWORD ENTRY FORM
              <MotiView
                key="create_form"
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'timing', duration: 300 }}
                className="gap-6"
              >
                <View className="gap-2 mb-4">
                  <Text className="text-white font-black text-3xl tracking-tight">
                    Create New Password
                  </Text>
                  <Text className="text-white/60 text-xs leading-5">
                    Your new password must be different from previously used passwords.
                  </Text>
                </View>

                {/* Form fields */}
                <View className="gap-4">
                  {/* New Password input card */}
                  <View className="gap-2">
                    <Text className="text-white/80 text-xs font-semibold px-2">New Password</Text>
                    <View className="bg-[#1D1037]/45 border border-primary-purple/20 rounded-full px-5 flex-row items-center justify-between h-14">
                      <View className="flex-row items-center gap-3 flex-1">
                        <Lock size={16} color="rgba(255, 255, 255, 0.4)" />
                        <TextInput
                          value={newPassword}
                          onChangeText={setNewPassword}
                          secureTextEntry={!showNewPassword}
                          placeholder="At least 8 characters"
                          placeholderTextColor="rgba(255, 255, 255, 0.3)"
                          className="flex-1 text-white text-sm font-normal py-3 h-full"
                          autoCapitalize="none"
                          editable={!isResetting}
                        />
                      </View>
                      <Pressable onPress={() => setShowNewPassword(!showNewPassword)} className="p-2" hitSlop={8}>
                        {showNewPassword ? (
                          <EyeOff size={16} color="rgba(255, 255, 255, 0.4)" />
                        ) : (
                          <Eye size={16} color="rgba(255, 255, 255, 0.4)" />
                        )}
                      </Pressable>
                    </View>
                  </View>

                  {/* Confirm Password input card */}
                  <View className="gap-2">
                    <Text className="text-white/80 text-xs font-semibold px-2">Confirm Password</Text>
                    <View className="bg-[#1D1037]/45 border border-primary-purple/20 rounded-full px-5 flex-row items-center justify-between h-14">
                      <View className="flex-row items-center gap-3 flex-1">
                        <Lock size={16} color="rgba(255, 255, 255, 0.4)" />
                        <TextInput
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!showConfirmPassword}
                          placeholder="Re-enter password"
                          placeholderTextColor="rgba(255, 255, 255, 0.3)"
                          className="flex-1 text-white text-sm font-normal py-3 h-full"
                          autoCapitalize="none"
                          editable={!isResetting}
                        />
                      </View>
                      <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-2" hitSlop={8}>
                        {showConfirmPassword ? (
                          <EyeOff size={16} color="rgba(255, 255, 255, 0.4)" />
                        ) : (
                          <Eye size={16} color="rgba(255, 255, 255, 0.4)" />
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Password strength dynamic validator indicators */}
                <View className="bg-[#1D1037]/25 border border-primary-purple/10 rounded-2xl p-4 gap-3 mt-1">
                  <Text className="text-white/80 text-[11px] font-black uppercase tracking-wider mb-1">
                    Security Checklist
                  </Text>
                  
                  {/* Strength indicators layout list */}
                  <View className="gap-3">
                    <View className="flex-row items-center gap-2">
                      {hasMinLength ? (
                        <CheckCircle2 size={13} color="#10B981" />
                      ) : (
                        <XCircle size={13} color="#EF4444" />
                      )}
                      <Text className={`text-[11px] font-semibold ${hasMinLength ? 'text-[#10B981]' : 'text-white/40'}`}>
                        Minimum 8 characters length
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-2">
                      {hasNumber ? (
                        <CheckCircle2 size={13} color="#10B981" />
                      ) : (
                        <XCircle size={13} color="#EF4444" />
                      )}
                      <Text className={`text-[11px] font-semibold ${hasNumber ? 'text-[#10B981]' : 'text-white/40'}`}>
                        Contains at least one number
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-2">
                      {isMatching ? (
                        <CheckCircle2 size={13} color="#10B981" />
                      ) : (
                        <XCircle size={13} color="#EF4444" />
                      )}
                      <Text className={`text-[11px] font-semibold ${isMatching ? 'text-[#10B981]' : 'text-white/40'}`}>
                        Passwords match perfectly
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Submit Reset Button */}
                <Pressable
                  onPress={handleResetPassword}
                  disabled={!isValid || isResetting}
                  style={({ pressed }) => ({
                    opacity: (!isValid || isResetting) ? 0.55 : pressed ? 0.95 : 1,
                    transform: [{ scale: (isValid && !isResetting && pressed) ? 0.98 : 1 }]
                  })}
                  className={`h-14 rounded-full items-center justify-center flex-row gap-2 transition-all mt-4 ${
                    isValid && !isResetting
                      ? 'bg-primary-purple shadow-lg shadow-primary-purple/40'
                      : 'bg-white/5 border border-white/5'
                  }`}
                >
                  <Text className="text-white text-sm font-bold uppercase tracking-wider">
                    {isResetting ? 'Saving Password...' : 'Create Password'}
                  </Text>
                </Pressable>
              </MotiView>
            ) : (
              // PHASE 2: RESET PASSWORD SUCCESS VIEW PANEL
              <MotiView
                key="success_panel"
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                className="items-center gap-6"
              >
                <MotiView
                  from={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 8, delay: 100 }}
                  className="w-20 h-20 bg-[#10B981]/15 border border-[#10B981]/30 rounded-full items-center justify-center"
                >
                  <ShieldCheck size={40} color="#10B981" strokeWidth={2.5} />
                </MotiView>

                <View className="gap-2 items-center">
                  <Text className="text-white font-black text-2xl tracking-tight text-center">
                    Reset Successful!
                  </Text>
                  <Text className="text-white/60 text-xs text-center leading-5 px-6">
                    Your password has been securely updated. Redirecting you to login...
                  </Text>
                </View>
              </MotiView>
            )}
          </AnimatePresence>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
