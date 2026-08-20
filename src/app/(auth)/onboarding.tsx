import React, { useState } from 'react';
import { View, Text, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { showError } from '../../store/toastStore';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, G } from 'react-native-svg';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import { apiClient } from '../../api/client';

GoogleSignin.configure({
  webClientId: '576573661357-huruthf92t81ohv6k1l2el6cm9q32ip5.apps.googleusercontent.com',
});

export default function OnboardingScreen() {
  const { setOnboardingComplete, setLogin, setToken, fetchProfile } = useAuthStore();
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error('No token received');

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      const firebaseIdToken = await userCredential.user.getIdToken(true);

      const res = await apiClient.post('/auth/google-login', { idToken: firebaseIdToken });
      const { accessToken, refreshToken, user } = res.data;

      setOnboardingComplete(true);
      setToken(accessToken);
      await fetchProfile(); // Ensure Zustand state gets the latest profile flag
      setLogin(true);

      if (!user.isProfileComplete) {
        router.replace('/(auth)/personalization-loader');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled
    } else {
        showError(err?.response?.data?.message || err?.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSkip = () => {
    setOnboardingComplete(true);
    router.replace('/(auth)/login');
  };

  const handleMobileLogin = () => {
    setOnboardingComplete(true);
    router.replace('/(auth)/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0015' }}>
      <LinearGradient
        colors={['#1a0030', '#0D0015', '#0D0015']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 56 : 36 }}>
        <Text style={{ color: '#FF2D6B', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>popli</Text>
        <TouchableOpacity onPress={handleSkip} style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Skip</Text>
        </TouchableOpacity>
      </View>
     
      <View style={{ alignItems: 'center', marginTop: 28 }}>
        <View style={{
          width: 180, height: 260, borderRadius: 28,
          backgroundColor: '#1a0a2e',
          borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#FF2D6B', shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25, shadowRadius: 20, elevation: 12,
          overflow: 'hidden',
        }}>
          <LinearGradient
            colors={['#2a0a3e', '#150520']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{
            width: 52, height: 52, borderRadius: 26,
            backgroundColor: 'rgba(255,45,107,0.25)',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
            borderWidth: 1, borderColor: 'rgba(255,45,107,0.4)',
          }}>
            <Text style={{ color: '#FF2D6B', fontSize: 22, marginLeft: 3 }}>{'>'}</Text>
          </View>
          <View style={{ backgroundColor: '#FF2D6B', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>Rs.5</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, textAlign: 'center', marginTop: 1 }}>Per 1000 Views</Text>
          </View>
        </View>

        <View style={{
          position: 'absolute', left: '12%', top: 55,
          width: 48, height: 48, borderRadius: 24,
          backgroundColor: '#F59E0B',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.6, shadowRadius: 8, elevation: 8,
        }}>
          <Text style={{ color: '#7c3b00', fontSize: 16, fontWeight: '900' }}>Rs</Text>
        </View>

        <View style={{
          position: 'absolute', right: '12%', top: 100,
          width: 38, height: 38, borderRadius: 19,
          backgroundColor: '#F59E0B',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
        }}>
          <Text style={{ color: '#7c3b00', fontSize: 14, fontWeight: '900' }}>Rs</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 28, marginTop: 24 }}>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', lineHeight: 38, letterSpacing: -0.5 }}>
          Turn Your{'\n'}Content Into{'\n'}<Text style={{ color: '#FF2D6B' }}>Income</Text>
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 10, lineHeight: 19 }}>
          Upload videos and earn Rs.5 for every 1000 qualified views.{'\n'}Start earning from your very first post.
        </Text>
      </View>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}>
     <TouchableOpacity
          onPress={handleGoogleSignIn}
          disabled={isGoogleLoading}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#fff', borderRadius: 14,
            paddingVertical: 15, marginBottom: 10, gap: 10,
            opacity: isGoogleLoading ? 0.7 : 1,
          }}>
          {isGoogleLoading ? <ActivityIndicator color="#111" /> : (
            <>
              <Svg width="20" height="20" viewBox="0 0 48 48">
                <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <Path fill="none" d="M0 0h48v48H0z"/>
              </Svg>
              <Text style={{ color: '#111', fontSize: 15, fontWeight: '700' }}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginBottom: 10, fontSize: 12 }}>OR</Text>

        <TouchableOpacity
          onPress={handleMobileLogin}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderRadius: 14, paddingVertical: 15,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
            gap: 10, marginBottom: 16,
          }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Continue with Mobile Number</Text>
        </TouchableOpacity>

        <Text style={{ color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontSize: 12 }}>
          Join 10,000+ early creators on Popli
        </Text>
      </View>
    </View>
  );
}