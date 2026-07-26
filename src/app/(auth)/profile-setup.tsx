 
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { showError } from '../../store/toastStore';
import { router } from 'expo-router';
import { useAuthStore } from '../../store';
import { ChevronLeft, Camera, Globe } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '../../api/client';
import { uploadImageToR2 } from '../../api/upload';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { LinearGradient } from 'expo-linear-gradient';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=150&auto=format&fit=crop',
];

const CATEGORIES = [
  { value: 'comedy', label: 'Comedy' },
  { value: 'motivation', label: 'Motivation' },
  { value: 'dance', label: 'Dance' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'fashion', label: 'Fashion' },
];

const LANGUAGES: ('English' | 'Hindi' | 'Bengali' | 'Tamil')[] = ['English', 'Hindi', 'Bengali', 'Tamil'];

export default function ProfileSetupScreen() {
  const { userProfile, updateProfile, setLanguage } = useAuthStore();

  const [name, setName] = useState(userProfile?.name === 'Popli User' || userProfile?.name === 'Demo User' ? '' : (userProfile?.name || ''));
  const defaultUsername = userProfile?.username?.startsWith('user_') ? '' : (userProfile?.username || '');
  const [username, setUsername] = useState(defaultUsername);
  const [avatar, setAvatar] = useState(AVATAR_PRESETS[0]);
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [gender, setGender] = useState<string>('Male');
  const [category, setCategory] = useState<string>('comedy');
  const [selectedLang, setSelectedLang] = useState<'English' | 'Hindi' | 'Bengali' | 'Tamil'>('English');
  const [isUploading, setIsUploading] = useState(false);
const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
 
  useEffect(() => {
    const checkAvailability = async () => {
      const usernameTrimmed = username?.trim().toLowerCase();
      if (!usernameTrimmed || usernameTrimmed.length < 3) {
        setUsernameAvailable(false);
        setUsernameError(undefined);
        return;
      }
      
      setIsCheckingUsername(true);
      try {
        const res = await apiClient.post('/auth/check-user', { username: usernameTrimmed, excludeUserId: userProfile?.id });
        if (res.data.exists && res.data.field === 'username') {
           setUsernameError('Username is already taken.');
           setUsernameAvailable(false);
        } else {
           setUsernameError(undefined);
           setUsernameAvailable(true);
        }
      } catch (error) {
         setUsernameAvailable(false);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      if (username) {
        checkAvailability();
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [username]);

const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setIsUploading(true);
        const imageUri = result.assets[0].uri;
        const uploadedUrl = await uploadImageToR2(imageUri, 'profiles');
        setAvatar(uploadedUrl);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      showError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  const handleNext = async () => {
    const currentName = name?.trim();
    const currentUsername = username?.trim().toLowerCase();

setNameError(undefined);

    if (!currentName || currentName.length < 2) {
      setNameError('Please enter a valid full name (at least 2 characters)');
      return;
    }

    if (!currentUsername || currentUsername.length < 3) {
      setUsernameError('Please enter a valid username (at least 3 characters)');
      return;
    }

    if (usernameError) return;
    setIsUploading(true);
    const result = await updateProfile({
      name: currentName,
      username: currentUsername,
      avatar,
      bio: bio.trim() || 'Indian video creator 🚀',
      category,
      manualComplete: true
    } as any);
    setIsUploading(false);

  if (result && !result.success) {
      showError(result.error || 'Failed to update profile. Username might be taken.');
      return;
    }

    setLanguage(selectedLang);

   useAuthStore.getState().setOnboardingStep('done');
    requestAnimationFrame(() => router.replace('/(tabs)/reels'));
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
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
        <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(auth)/otp');
              }
            }}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
          >
            <ChevronLeft size={20} color="#fff" strokeWidth={2.5} />
          </Pressable>
          <Text style={{ color: '#FF2D6B', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 }}>popli</Text>
          <View style={{ marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' }}>Optional</Text>
          </View>
        </View>

        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 }}>Complete Your Profile</Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 28 }}>
          Add a few details to grow faster and build trust.
        </Text>

        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Pressable onPress={pickImage} style={{ position: 'relative' }}>
            <View style={{
              width: 88, height: 88, borderRadius: 44,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              {avatar !== AVATAR_PRESETS[0] ? (
                <Image source={{ uri: avatar }} style={{ width: 88, height: 88, borderRadius: 44 }} />
              ) : (
                <Camera size={28} color="rgba(255,255,255,0.3)" strokeWidth={1.5} />
              )}
            </View>
            {isUploading && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 44, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#FF2D6B" />
              </View>
            )}
          </Pressable>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 10 }}>Add your profile picture</Text>
        </View>

        {/* Username */}
        <View style={{ marginBottom: 14 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
            borderWidth: 1, borderColor: usernameError ? '#FF4444' : 'rgba(255,255,255,0.1)',
            paddingHorizontal: 16, height: 54,
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginRight: 6 }}>@</Text>
            <TextInput
              value={username}
              onChangeText={(text) => {
                setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                if (usernameError) setUsernameError(undefined);
              }}
              placeholder="rahul_123"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="none"
              style={{ flex: 1, color: '#fff', fontSize: 15 }}
            />
            {isCheckingUsername ? (
              <ActivityIndicator size="small" color="#FF2D6B" />
            ) : usernameAvailable && !usernameError ? (
              <Text style={{ color: '#4ADE80', fontSize: 13, fontWeight: '700' }}>Available ✓</Text>
            ) : null}
          </View>
          {usernameError ? (
            <Text style={{ color: '#FF4444', fontSize: 12, paddingLeft: 4, marginTop: 4 }}>{usernameError}</Text>
          ) : null}
        </View>

    {/* Full Name */}
        <View style={{ marginBottom: 14 }}>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
            borderWidth: 1, borderColor: nameError ? '#FF4444' : 'rgba(255,255,255,0.1)',
            paddingHorizontal: 16, height: 54, justifyContent: 'center',
          }}>
            <TextInput
              value={name}
              onChangeText={(v) => { setName(v); if (nameError) setNameError(undefined); }}
              placeholder="Full Name (optional)"
              placeholderTextColor="rgba(255,255,255,0.25)"
              style={{ color: '#fff', fontSize: 15 }}
            />
          </View>
          {nameError ? (
            <Text style={{ color: '#FF4444', fontSize: 12, paddingLeft: 4, marginTop: 4 }}>{nameError}</Text>
          ) : null}
        </View>

      
        {/* Bio */}
        <View style={{ marginBottom: 20 }}>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
            paddingHorizontal: 16, paddingVertical: 14,
          }}>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Bio (optional)"
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline
              numberOfLines={3}
              maxLength={80}
              style={{ color: '#fff', fontSize: 15, textAlignVertical: 'top', minHeight: 60 }}
            />
            <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'right', marginTop: 4 }}>{bio.length}/80</Text>
          </View>
        </View>

        {/* Gender */}
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 }}>GENDER</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {['Male', 'Female', 'Other'].map((item) => (
            <Pressable
              key={item}
              onPress={() => setGender(item)}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                backgroundColor: gender === item ? 'rgba(255,45,107,0.15)' : 'rgba(255,255,255,0.04)',
                borderWidth: 1, borderColor: gender === item ? '#FF2D6B' : 'rgba(255,255,255,0.08)',
              }}
            >
              <Text style={{ color: gender === item ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' }}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {/* Category */}
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 }}>CREATOR CATEGORY</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.value}
              onPress={() => setCategory(cat.value)}
              style={{
                paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
                backgroundColor: category === cat.value ? 'rgba(255,45,107,0.15)' : 'rgba(255,255,255,0.04)',
                borderWidth: 1, borderColor: category === cat.value ? '#FF2D6B' : 'rgba(255,255,255,0.08)',
              }}
            >
              <Text style={{ color: category === cat.value ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' }}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Language */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Globe size={13} color="rgba(255,255,255,0.4)" />
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>APP LANGUAGE</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang}
              onPress={() => setSelectedLang(lang)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                backgroundColor: selectedLang === lang ? 'rgba(255,45,107,0.15)' : 'rgba(255,255,255,0.04)',
                borderWidth: 1, borderColor: selectedLang === lang ? '#FF2D6B' : 'rgba(255,255,255,0.08)',
              }}
            >
              <Text style={{ color: selectedLang === lang ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' }}>{lang}</Text>
            </Pressable>
          ))}
        </View>

        {/* CTAs */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={isUploading}
          style={{
            backgroundColor: '#FF2D6B', borderRadius: 14,
            paddingVertical: 16, alignItems: 'center',
            opacity: isUploading ? 0.7 : 1, marginBottom: 12,
          }}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Save & Continue</Text>
          )}
        </TouchableOpacity>

   <TouchableOpacity
     onPress={async () => {
            const res = await updateProfile({ manualComplete: true } as any);
            if (res && !res.success) {
              showError('Failed to skip. Please try again.');
              return;
            }
           useAuthStore.getState().setOnboardingStep('done');
setTimeout(() => router.replace('/(tabs)/reels'), 50);
          }}
          style={{ alignItems: 'center', paddingVertical: 12 }}
        >
          <Text style={{ color: '#FF2D6B', fontSize: 14, fontWeight: '600' }}>Skip for now</Text>
        </TouchableOpacity>

        <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
          You can change this anytime from your profile.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}