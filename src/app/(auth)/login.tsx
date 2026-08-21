/* eslint-disable */
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store';
import { apiClient } from '../../api/client';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import { sendFirebaseOTP } from '../../lib/firebase';

GoogleSignin.configure({
  webClientId: '576573661357-huruthf92t81ohv6k1l2el6cm9q32ip5.apps.googleusercontent.com',
});

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
 const { setLogin, setFirstLogin, setToken, fetchProfile } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
 const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNotFound, setShowNotFound] = useState(false);
 const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error('Google sign-in failed: no token received');

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      const firebaseIdToken = await userCredential.user.getIdToken(true);

      const res = await apiClient.post('/auth/google-login', { idToken: firebaseIdToken });
  const { accessToken, refreshToken, user } = res.data;

      setToken(accessToken);
      await fetchProfile();
      setLogin(true);

    const freshProfile = useAuthStore.getState().userProfile;
      const isComplete = freshProfile.isProfileComplete || user.isProfileComplete;

      if (!isComplete) {
        router.replace('/(auth)/personalization-loader');
      } else {
     
        router.replace('/(tabs)/reels');
      }
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled, do nothing
      } else if (err.code === statusCodes.IN_PROGRESS) {
        // already signing in
      } else {
        setError(err?.response?.data?.message || err?.message || 'Google sign-in failed.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendOTP = async () => {
    let trimmed = phone.trim();
    if (!trimmed) { setError('Please enter your phone number.'); return; }
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(trimmed)) { setError('Please enter a valid phone number.'); return; }
    if (!trimmed.startsWith('+')) trimmed = `+91${trimmed}`;

    setError('');
    setIsLoading(true);

    try {
      const checkRes = await apiClient.post('/auth/check-user', { identifier: trimmed });
      if (!checkRes.data.exists) {
        setIsLoading(false);
        setShowNotFound(true);
        return;
      }

      // Call Firebase to send real OTP
      await sendFirebaseOTP(trimmed);

      setIsLoading(false);
      router.push({
        pathname: '/(auth)/otp',
        params: { target: trimmed, type: 'phone', phone: trimmed, intent: 'login' }
      });
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.response?.data?.message || 'Failed to connect to server. Please try again.');
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

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>

     <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/onboarding')} style={{ marginBottom: 32 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 22 }}>←</Text>
        </TouchableOpacity>

     <View style={{ alignItems: 'center', marginBottom: 24, marginTop: -60 }}>
          <Image 
            source={require('../../../assets/images/pops.png')} 
            style={{ width: 125, height: 125, resizeMode: 'contain' }}
            fadeDuration={0}
          />
        </View>

        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 6 }}>Verify Your Number</Text>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 36 }}>
          Enter your mobile number to get started with Popli
        </Text>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: error ? '#FF4444' : 'rgba(255,255,255,0.12)',
          marginBottom: 8,
          overflow: 'hidden',
        }}>
          <View style={{
            paddingHorizontal: 14,
            paddingVertical: 16,
            borderRightWidth: 1,
            borderRightColor: 'rgba(255,255,255,0.1)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>+91</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>▾</Text>
          </View>
          <TextInput
            value={phone}
            onChangeText={(val) => { setPhone(val); setError(''); }}
            placeholder="9876543210"
            placeholderTextColor="rgba(255,255,255,0.25)"
            keyboardType="phone-pad"
            style={{ flex: 1, color: '#fff', fontSize: 16, fontWeight: '600', paddingHorizontal: 14, paddingVertical: 16 }}
            maxLength={10}
          />
          {phone.length === 10 && (
            <View style={{ paddingRight: 14 }}>
              <Text style={{ color: '#4ADE80', fontSize: 18 }}>✓</Text>
            </View>
          )}
        </View>

        {error ? (
          <Text style={{ color: '#FF4444', fontSize: 12, marginBottom: 16, paddingLeft: 4 }}>{error}</Text>
        ) : null}

        <TouchableOpacity
          onPress={handleSendOTP}
          disabled={isLoading}
          style={{
            backgroundColor: '#FF2D6B',
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            marginTop: 8,
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Send OTP</Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <Text style={{ color: 'rgba(255,255,255,0.3)', marginHorizontal: 12, fontSize: 13 }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        </View>

  <TouchableOpacity
          onPress={handleGoogleSignIn}
          disabled={isGoogleLoading}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            borderRadius: 14,
            paddingVertical: 14,
            gap: 10,
            opacity: isGoogleLoading ? 0.7 : 1,
          }}
        >
          {isGoogleLoading ? <ActivityIndicator color="#111" /> : null}
          <Svg width="20" height="20" viewBox="0 0 48 48">
            <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <Path fill="none" d="M0 0h48v48H0z"/>
          </Svg>
        {!isGoogleLoading && <Text style={{ color: '#111', fontSize: 15, fontWeight: '700' }}>Continue with Google</Text>}
        </TouchableOpacity>

        <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center', marginTop: 28, lineHeight: 16 }}>
          We protect your privacy and never share your data.
        </Text>

      <ConfirmSheet
          isVisible={showNotFound}
          title="Account Not Found"
          message="This number is not registered. Please create an account first."
          confirmLabel="Sign Up"
          cancelLabel="Cancel"
          destructive={false}
          onConfirm={() => { setShowNotFound(false); router.push('/(auth)/signup'); }}
          onCancel={() => setShowNotFound(false)}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 4 }}>  
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{"Don't have an account?"}</Text>
          <Pressable onPress={() => router.push('/(auth)/signup')}>
            <Text style={{ color: '#FF2D6B', fontSize: 13, fontWeight: '700' }}>Sign Up</Text>
          </Pressable>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}