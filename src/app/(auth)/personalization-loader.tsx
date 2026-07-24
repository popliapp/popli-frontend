import React, { useEffect } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, useFeedStore } from '../../store';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Upload, Eye, DollarSign } from 'lucide-react-native';

const PROGRESS_MESSAGES = [
  'Preparing Your Custom Feed...',
  'Finding Nearby Creators...',
  'Curating Viral Reels...',
];

const MOCK_CREATOR_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=100&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop',
];

export default function PersonalizationLoaderScreen() {
  const router = useRouter();
  const { setLogin, userProfile } = useAuthStore();

useEffect(() => {
  const t = setTimeout(() => {
    useAuthStore.getState().setOnboardingStep('profile-setup');
    router.replace('/(auth)/profile-setup');
  }, 2200);
  return () => clearTimeout(t);
}, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0015', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
      <LinearGradient
        colors={['#1a0030', '#0D0015', '#0D0015']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      {/* Big checkmark circle */}
      <MotiView
        from={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 120 }}
        style={{ marginBottom: 28 }}
      >
        <View style={{
          width: 110, height: 110, borderRadius: 55,
          borderWidth: 3, borderColor: '#FF2D6B',
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(255,45,107,0.1)',
          shadowColor: '#FF2D6B', shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5, shadowRadius: 24, elevation: 16,
        }}>
          <Check size={48} color="#FF2D6B" strokeWidth={2.5} />
        </View>
      </MotiView>

      {/* Title */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 300 }}
        style={{ alignItems: 'center', marginBottom: 8 }}
      >
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>{"You're In! 🎉"}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
          Your Popli account is ready.{'\n'}Upload your first video and start earning immediately.
        </Text>
      </MotiView>

      {/* Progress bar */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 400, delay: 500 }}
        style={{ width: '100%', marginTop: 28, marginBottom: 8 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Profile Setup Progress</Text>
          <Text style={{ color: '#FF2D6B', fontSize: 12, fontWeight: '700' }}>40%</Text>
        </View>
        <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
          <MotiView
            from={{ width: '0%' }}
            animate={{ width: '40%' }}
            transition={{ type: 'timing', duration: 800, delay: 600 }}
            style={{ height: '100%', backgroundColor: '#FF2D6B', borderRadius: 3 }}
          />
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 4 }}>40% Complete</Text>
      </MotiView>

      {/* 3 step cards */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 700 }}
        style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}
      >
        {[
          { icon: Upload, label: 'Upload\nVideo' },
          { icon: Eye, label: 'Get\nViews' },
          { icon: DollarSign, label: 'Earn\nMoney' },
        ].map(({ icon: Icon, label }, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 14,
              backgroundColor: 'rgba(255,45,107,0.1)',
              borderWidth: 1, borderColor: 'rgba(255,45,107,0.2)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={22} color="#FF2D6B" strokeWidth={1.8} />
            </View>
            {i < 2 && (
              <View style={{ position: 'absolute', right: -8, top: 13, width: 16, height: 2, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            )}
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center', lineHeight: 16 }}>{label}</Text>
          </View>
        ))}
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...Platform.select({ web: { cursor: 'default' } as any })
  }
});