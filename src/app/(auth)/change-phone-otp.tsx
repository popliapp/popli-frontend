import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { apiClient } from '../../api/client';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

type Step = 'current-otp' | 'new-phone' | 'new-otp';

export default function ChangePhoneOtpScreen() {
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuthStore();

  const isGoogleOrNotSet = !userProfile.phone || userProfile.phone.startsWith('G-');

  const [step, setStep] = useState<Step>(isGoogleOrNotSet ? 'new-phone' : 'current-otp');
  const [currentOtp, setCurrentOtp] = useState(isGoogleOrNotSet ? '1234' : '');
  const [newPhone, setNewPhone] = useState('');
  const [newOtp, setNewOtp] = useState('');
  const [error, setError] = useState('');
const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleVerifyCurrentOtp = () => {
    if (currentOtp.length !== 4) {
      setError('Enter the 4-digit OTP');
      return;
    }
    setError('');
    setStep('new-phone');
  };

const handleSubmitNewPhone = async () => {
    const cleaned = newPhone.trim();
    if (cleaned.length !== 10 || !/^\d{10}$/.test(cleaned)) {
      setError('Invalid phone number. Enter a 10-digit number.');
      return;
    }
    let possibleCurrent = [userProfile.phone];
    if (userProfile.phone?.startsWith('+91')) possibleCurrent.push(userProfile.phone.replace('+91', ''));
    if (/^\d{10}$/.test(userProfile.phone || '')) possibleCurrent.push(`+91${userProfile.phone}`);

    if (possibleCurrent.includes(cleaned)) {
      setError('New phone number must be different from your current number.');
      return;
    }

    setError('');
    setIsChecking(true);
    try {
      const res = await apiClient.post('/auth/check-user', { identifier: cleaned });
      setIsChecking(false);
      if (res.data.exists) {
        setError('This phone number is already registered with another account.');
        return;
      }
      setStep('new-otp');
    } catch (e: any) {
      setIsChecking(false);
      setError(e.response?.data?.message || 'Failed to verify phone number. Please try again.');
    }
  };

  const handleFinalSubmit = async () => {
    if (newOtp.length !== 4) {
      setError('Enter the 4-digit OTP');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await apiClient.post('/auth/change-phone', {
        currentPhoneOtp: currentOtp,
        newPhone: newPhone.trim(),
        newPhoneOtp: newOtp,
      });
      const { fetchProfile } = useAuthStore.getState();
      await fetchProfile();
      setIsLoading(false);
      router.back();
    } catch (e: any) {
      setIsLoading(false);
      setError(e.response?.data?.message || 'Failed to change phone number.');
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: '#0D0015' }}>
      <LinearGradient
        colors={['#1a0030', '#0D0015', '#0D0015']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40, flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => {
            if (step === 'current-otp') router.back();
            else if (step === 'new-phone') {
              if (isGoogleOrNotSet) router.back();
              else setStep('current-otp');
            }
            else setStep('new-phone');
          }}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
        >
          <ChevronLeft size={22} color="#fff" strokeWidth={2.5} />
        </Pressable>

        {step === 'current-otp' && (
          <>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 }}>Verify Current Number</Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 24 }}>
              Enter the OTP sent to {userProfile.phone}
            </Text>
            <TextInput
              value={currentOtp}
              onChangeText={(t) => setCurrentOtp(t.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
              placeholder="0000"
              placeholderTextColor="rgba(255,255,255,0.25)"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 16, height: 54, color: '#fff', fontSize: 20, letterSpacing: 8, textAlign: 'center', marginBottom: 16 }}
            />
            {!!error && <Text style={{ color: '#FF4444', fontSize: 12, marginBottom: 12 }}>{error}</Text>}
            <Pressable onPress={handleVerifyCurrentOtp} style={{ backgroundColor: '#FF2D6B', borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Verify</Text>
            </Pressable>
          </>
        )}

        {step === 'new-phone' && (
          <>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 }}>Enter New Number</Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 24 }}>
             {" We'll send an OTP to verify this number "}
            </Text>
         <TextInput
              value={newPhone}
              onChangeText={(t) => setNewPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="9876543210"
              placeholderTextColor="rgba(255,255,255,0.25)"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 16, height: 54, color: '#fff', fontSize: 16, marginBottom: 16 }}
            />
            {!!error && <Text style={{ color: '#FF4444', fontSize: 12, marginBottom: 12 }}>{error}</Text>}
        <Pressable onPress={handleSubmitNewPhone} disabled={isChecking} style={{ backgroundColor: '#FF2D6B', borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', opacity: isChecking ? 0.7 : 1 }}>
              {isChecking ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Send OTP</Text>}
            </Pressable>
          </>
        )}

        {step === 'new-otp' && (
          <>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 }}>Verify New Number</Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 24 }}>
              Enter the OTP sent to {newPhone}
            </Text>
            <TextInput
              value={newOtp}
              onChangeText={(t) => setNewOtp(t.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
              placeholder="0000"
              placeholderTextColor="rgba(255,255,255,0.25)"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 16, height: 54, color: '#fff', fontSize: 20, letterSpacing: 8, textAlign: 'center', marginBottom: 16 }}
            />
            {!!error && <Text style={{ color: '#FF4444', fontSize: 12, marginBottom: 12 }}>{error}</Text>}
            <Pressable onPress={handleFinalSubmit} disabled={isLoading} style={{ backgroundColor: '#FF2D6B', borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Confirm Change</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}