import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Platform, Image, Modal, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, AtSign, Link as LinkIcon, UserPlus, Check, AlertCircle, Mail } from 'lucide-react-native';
import { useAuthStore, useFeedStore } from '../store';
import { uploadImageToR2 } from '../api/upload';
import * as ImagePicker from 'expo-image-picker';
import { getDefaultAvatar } from '../utils';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { showSuccess, showError } from '../store/toastStore';
import { emailOtpApi } from '../api/services';

const InputField = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  rightIcon: RightIcon, 
  multiline = false,
  ...rest
}: any) => (
  <View className="mb-4">
    <Text className="text-white/60 text-[9px] font-bold uppercase tracking-widest pl-1 mb-2">{label}</Text>
    <View className={`bg-[#1A0E2C] border border-white/5 rounded-2xl flex-row px-4 ${multiline ? 'py-4 min-h-[90px]' : 'h-[52px] items-center'}`}>
      {RightIcon && label === 'WEBSITE OR CONTACT LINK' && (
        <View className="mr-3">
          <RightIcon size={16} color="#9CA3AF" />
        </View>
      )}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(255, 255, 255, 0.3)"
        multiline={multiline}
        className={`flex-1 text-white font-medium text-sm ${multiline ? 'leading-5' : ''}`}
        style={multiline ? { textAlignVertical: 'top' } : {}}
        {...rest}
      />
      {RightIcon && label === 'USERNAME' && (
        <View className="ml-3">
          <RightIcon size={16} color="#9CA3AF" />
        </View>
      )}
    </View>
  </View>
);
export default function EditProfileScreen() {
  const router = useRouter();

  const { userProfile, updateProfile } = useAuthStore();
  const { fetchReels, fetchUserReels } = useFeedStore();

  const [username, setUsername] = useState(userProfile.username);
  const [fullName, setFullName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email || '');
  const [phone, setPhone] = useState(userProfile.phone?.startsWith('G-') ? '' : (userProfile.phone || ''));
  const [bio, setBio] = useState(userProfile.bio || '');
  const [socialLinks, setSocialLinks] = useState<{title: string, url: string}[]>(userProfile.socialLinks || []);
  const [avatarUri, setAvatarUri] = useState(userProfile.avatar || '');
 const [gender, setGender] = useState<string>(userProfile.gender || 'Male');
  const [category, setCategory] = useState<string>(userProfile.category || 'comedy');
  const [isSaving, setIsSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Email OTP verification state
 const isEmailAlreadySaved = !!(userProfile.email && email && userProfile.email === email);
  const [emailVerified, setEmailVerified] = useState(isEmailAlreadySaved);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpArray, setOtpArray] = useState<string[]>(Array(6).fill(''));
  const [otpFocused, setOtpFocused] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const hiddenOtpRef = useRef<TextInput>(null);
  const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

 useEffect(() => {
    if (!email) {
      setEmailVerified(false);
    } else if (email === userProfile.email) {
      setEmailVerified(true);
    } else {
      setEmailVerified(false);
    }
  }, [email]);

  useEffect(() => {
    return () => {
      if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    };
  }, []);

  const startResendTimer = () => {
    setResendTimer(60);
    resendIntervalRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(resendIntervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setEmailError('Please enter a valid email address first.');
      return;
    }
    setEmailError('');
    setIsSendingOtp(true);
    try {
      await emailOtpApi.sendOtp(emailTrimmed);
      setOtpArray(Array(6).fill(''));
      setOtpFocused(0);
      setOtpError('');
      setShowOtpModal(true);
      startResendTimer();
      setTimeout(() => hiddenOtpRef.current?.focus(), 400);
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to send OTP. Try again.';
      setEmailError(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsSendingOtp(true);
    try {
      await emailOtpApi.resendOtp(email.trim().toLowerCase());
      setOtpArray(Array(6).fill(''));
      setOtpFocused(0);
      setOtpError('');
      startResendTimer();
      setTimeout(() => hiddenOtpRef.current?.focus(), 100);
    } catch (e: any) {
      setOtpError(e?.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '').slice(0, 6);
    const next = Array(6).fill('');
    for (let i = 0; i < clean.length; i++) next[i] = clean[i];
    setOtpArray(next);
    setOtpFocused(Math.min(clean.length, 5));
    if (clean.length === 6) handleVerifyOtp(clean);
  };

  const handleVerifyOtp = async (otpStr?: string) => {
    const code = otpStr || otpArray.join('');
    if (code.length !== 6) return;
    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      await emailOtpApi.verifyOtp(email.trim().toLowerCase(), code);
      setEmailVerified(true);
      setShowOtpModal(false);
      showSuccess('Email verified successfully!');
    } catch (e: any) {
      setOtpError(e?.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

 const handleSave = async () => {
    setEmailError('');
    setPhoneError('');

 // Basic validation
    let hasError = false;
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError('Please enter a valid email address');
        hasError = true;
      } else if (!emailVerified) {
        setEmailError('Please verify your email before saving.');
        hasError = true;
      }
    }
    if (phone) {
      const phoneRegex = /^[0-9+\s-]{10,15}$/;
      if (!phoneRegex.test(phone)) {
        setPhoneError('Please enter a valid phone number (min 10 digits)');
        hasError = true;
      }
    }

    if (hasError) return;

    setIsSaving(true);
    let finalAvatarUrl = avatarUri;
    
    try {
     if (avatarUri && avatarUri.startsWith('file://')) {
        finalAvatarUrl = await uploadImageToR2(avatarUri, 'avatars');
      }
      const result = await updateProfile({
        name: fullName,
        username: username,
        bio: bio,
        avatar: finalAvatarUrl,
        email: email || undefined,
        phone: phone || undefined,
        socialLinks: socialLinks,
        gender: gender,
        category: category,
      } as any);
      setIsSaving(false);
      
      if (result.success) {
        // Refresh feed stores to instantly reflect new profile data
        fetchReels(null);
        fetchUserReels(userProfile.id);

        showSuccess('Profile updated successfully');
        router.back();
      } else {
        showError(result.error || 'Failed to save profile changes. Please try again.');
      }
    } catch (error: any) {
      setIsSaving(false);
      showError(error.message || 'Failed to upload profile picture.');
    }
  };


  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-[#12081E] pt-14">
      {/* Header */}
      <View className="flex-row items-center px-4 pb-4">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white font-bold text-base ml-2">Edit Profile</Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Avatar Section */}
        <View className="items-center py-6">
          <Pressable 
            onPress={handlePickImage}
            className="w-24 h-24 rounded-full bg-[#F59E0B]/20 items-center justify-center border-4 border-[#F59E0B]/50 mb-3 overflow-hidden"
          >
             {avatarUri ? (
               <Image source={{ uri: avatarUri }} className="w-full h-full" resizeMode="cover" />
             ) : (
               <Image source={{ uri: getDefaultAvatar(userProfile?.username || 'user') }} className="w-full h-full" resizeMode="cover" />
             )}
          </Pressable>
          <View className="bg-[#FACC15] px-3 py-1 rounded-full -mt-6 z-10 shadow-sm shadow-[#FACC15]/40">
            <Text className="text-black text-[9px] font-black uppercase tracking-wider">Premium Creator</Text>
          </View>
        </View>

        {/* Inputs */}
        <InputField label="USERNAME" value={username} onChange={setUsername} rightIcon={AtSign} />
        <InputField label="FULL NAME" value={fullName} onChange={setFullName} />
  {/* Email ID with Verify button */}
        <View className="mb-4">
          <Text className="text-white/60 text-[9px] font-bold uppercase tracking-widest pl-1 mb-2">EMAIL ID</Text>
          <View className="bg-[#1A0E2C] border border-white/5 rounded-2xl flex-row items-center px-4 h-[52px]">
            <TextInput
              value={email}
              onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(''); }}
              placeholder="user@example.com"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="email-address"
              autoCapitalize="none"
              className="flex-1 text-white font-medium text-sm"
            />
            {emailVerified ? (
              <View className="flex-row items-center gap-1">
                <Check size={13} color="#4ADE80" />
                <Text className="text-green-400 text-[11px] font-bold">Verified</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleSendOtp} disabled={isSendingOtp}>
                {isSendingOtp ? (
                  <ActivityIndicator size="small" color="#EC4899" />
                ) : (
                  <Text className="text-[#EC4899] text-xs font-bold">VERIFY</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          {emailError ? (
            <View className="flex-row items-center gap-1.5 mt-1 pl-1">
              <AlertCircle size={11} color="#EF4444" />
              <Text className="text-red-400 text-[10px] font-medium">{emailError}</Text>
            </View>
          ) : null}
        </View>

        {/* Email OTP Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide" onRequestClose={() => setShowOtpModal(false)}>
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#12081E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 }}>
              {/* Handle bar */}
              <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 24 }} />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(236,72,153,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={18} color="#EC4899" />
                </View>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Verify Email</Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 28 }}>
                Enter the 6-digit code sent to {email}
              </Text>

              {/* OTP Boxes */}
              <TouchableOpacity activeOpacity={1} onPress={() => hiddenOtpRef.current?.focus()} style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', gap: 8 }} pointerEvents="none">
                  {Array(6).fill(0).map((_, i) => (
                    <View key={i} style={{
                      flex: 1, height: 52,
                      backgroundColor: '#1D1037',
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: otpFocused === i ? '#EC4899' : otpArray[i] ? 'rgba(236,72,153,0.5)' : 'rgba(255,255,255,0.1)',
                    }}>
                      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{otpArray[i] || ''}</Text>
                    </View>
                  ))}
                </View>
                <TextInput
                  ref={hiddenOtpRef}
                  value={otpArray.join('')}
                  onChangeText={handleOtpChange}
                  keyboardType="numeric"
                  maxLength={6}
                  style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0 }}
                  caretHidden
                />
              </TouchableOpacity>

              {otpError ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  <AlertCircle size={13} color="#EF4444" />
                  <Text style={{ color: '#EF4444', fontSize: 12 }}>{otpError}</Text>
                </View>
              ) : null}

              {/* Verify Button */}
              <TouchableOpacity
                onPress={() => handleVerifyOtp()}
                disabled={otpArray.join('').length !== 6 || isVerifyingOtp}
                style={{
                  backgroundColor: otpArray.join('').length === 6 ? '#EC4899' : 'rgba(255,255,255,0.08)',
                  height: 52, borderRadius: 14,
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                  opacity: otpArray.join('').length !== 6 ? 0.5 : 1,
                }}
              >
                {isVerifyingOtp ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Verify Email</Text>
                )}
              </TouchableOpacity>

              {/* Resend */}
              <TouchableOpacity onPress={handleResendOtp} disabled={resendTimer > 0 || isSendingOtp} style={{ alignItems: 'center' }}>
                <Text style={{ color: resendTimer > 0 ? 'rgba(255,255,255,0.3)' : '#EC4899', fontSize: 13, fontWeight: '700' }}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                </Text>
              </TouchableOpacity>
          </View>
          </KeyboardAvoidingView>
        </Modal>
   <View className="mb-4">
          <Text className="text-white/60 text-[9px] font-bold uppercase tracking-widest pl-1 mb-2">PHONE NUMBER</Text>
          <View className="bg-[#1A0E2C] border border-white/5 rounded-2xl flex-row items-center justify-between px-4 h-[52px]">
            <Text className="text-white font-medium text-sm">
              {userProfile.phone?.startsWith('G-') ? 'Not set' : (userProfile.phone || 'Not set')}
            </Text>
         <Pressable
              onPress={() => router.push('/(auth)/change-phone-otp')}
            >
              <Text className="text-[#EC4899] text-xs font-bold">CHANGE</Text>
            </Pressable>
          </View>
          {phoneError ? (
            <View className="flex-row items-center gap-1.5 mt-2 pl-1">
              <AlertCircle size={11} color="#EF4444" />
              <Text className="text-red-400 text-[10px] font-medium">{phoneError}</Text>
            </View>
          ) : null}
        </View>
      <InputField label="BIO" value={bio} onChange={setBio} multiline />

      {/* Gender */}
        <View className="mb-4">
          <Text className="text-white/60 text-[9px] font-bold uppercase tracking-widest pl-1 mb-2">GENDER</Text>
          <View className="flex-row gap-2">
            {['Male', 'Female', 'Other'].map((item) => {
              const isLocked = !!userProfile.gender;
              return (
                <Pressable
                  key={item}
                  onPress={() => { if (!isLocked) setGender(item); }}
                  disabled={isLocked}
                  className="flex-1 py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: gender === item ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: gender === item ? '#EC4899' : 'rgba(255,255,255,0.08)',
                    opacity: isLocked && gender !== item ? 0.4 : 1,
                  }}
                >
                  <Text className="text-xs font-bold" style={{ color: gender === item ? '#fff' : 'rgba(255,255,255,0.4)' }}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
          {!!userProfile.gender && (
            <Text className="text-white/30 text-[10px] mt-2 pl-1">Gender can only be set once and cannot be changed later.</Text>
          )}
        </View>

        {/* Creator Category */}
        <View className="mb-4">
          <Text className="text-white/60 text-[9px] font-bold uppercase tracking-widest pl-1 mb-2">CREATOR CATEGORY</Text>
          <View className="flex-row flex-wrap gap-2">
            {[
              { value: 'comedy', label: 'Comedy' },
              { value: 'motivation', label: 'Motivation' },
              { value: 'dance', label: 'Dance' },
              { value: 'gaming', label: 'Gaming' },
              { value: 'fashion', label: 'Fashion' },
            ].map((cat) => (
              <Pressable
                key={cat.value}
                onPress={() => setCategory(cat.value)}
                className="px-4 py-2 rounded-full"
                style={{
                  backgroundColor: category === cat.value ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: category === cat.value ? '#EC4899' : 'rgba(255,255,255,0.08)',
                }}
              >
                <Text className="text-xs font-semibold" style={{ color: category === cat.value ? '#fff' : 'rgba(255,255,255,0.4)' }}>{cat.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Social Links Section */}
        <View className="mb-4 mt-2">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white/60 text-[9px] font-bold uppercase tracking-widest pl-1">Social Links (Max 3)</Text>
            {socialLinks.length < 3 && (
              <Pressable onPress={() => setSocialLinks([...socialLinks, { title: '', url: '' }])} className="px-2 py-1 bg-white/10 rounded">
                <Text className="text-white text-[10px] font-bold">+ ADD LINK</Text>
              </Pressable>
            )}
          </View>
          
          {socialLinks.map((link, index) => (
            <View key={index} className="bg-[#1A0E2C] border border-white/5 rounded-2xl p-3 mb-2">
              <View className="flex-row justify-between mb-2">
                <Text className="text-white text-xs font-bold">Link {index + 1}</Text>
                <Pressable onPress={() => {
                  const newLinks = [...socialLinks];
                  newLinks.splice(index, 1);
                  setSocialLinks(newLinks);
                }}>
                  <Text className="text-red-400 text-xs font-bold">Remove</Text>
                </Pressable>
              </View>
              <TextInput
                value={link.title}
                onChangeText={(text) => {
                  const newLinks = [...socialLinks];
                  newLinks[index].title = text;
                  setSocialLinks(newLinks);
                }}
                placeholder="Title (e.g. YouTube)"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                className="text-white font-medium text-sm border-b border-white/10 pb-2 mb-2"
              />
              <TextInput
                value={link.url}
                onChangeText={(text) => {
                  const newLinks = [...socialLinks];
                  newLinks[index].url = text;
                  setSocialLinks(newLinks);
                }}
                placeholder="URL (e.g. https://youtube.com/...)"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                className="text-white font-medium text-sm"
                autoCapitalize="none"
              />
            </View>
          ))}
        </View>

        {/* Change Password Link */}
        <Pressable 
          onPress={() => router.push('/change-password')}
          className="items-center py-4 mt-2"
        >
          <Text className="text-[#EC4899] text-xs font-bold uppercase tracking-widest">Change Password</Text>
        </Pressable>

        {/* Save Button */}
    <Pressable 
          onPress={handleSave}
          disabled={isSaving}
          className="w-full h-14 rounded-full mt-4 flex-row items-center justify-center active:scale-[0.98] shadow-lg shadow-[#EC4899]/30"
          style={{ backgroundColor: '#EC4899', opacity: isSaving ? 0.7 : 1 }}
        >
          {/* Gradient Simulation */}
          <View className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-[#D946EF] to-[#EC4899] rounded-full opacity-90" />
          <Text className="text-white font-bold text-sm z-10">{isSaving ? 'Saving...' : 'Save Changes'}</Text>
        </Pressable>

      </ScrollView>

    </KeyboardAvoidingView>
  );
}