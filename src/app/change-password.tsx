import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Platform } from 'react-native';
import { showSuccess } from '../store/toastStore';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
const InputField = ({ label, value, onChange, placeholder, error }: any) => (
  <View className="mb-5">
    <Text className="text-white/60 text-[9px] font-bold uppercase tracking-widest pl-1 mb-2">{label}</Text>
    <View className={`bg-[#1A0E2C] border rounded-2xl flex-row px-4 h-[52px] items-center ${error ? 'border-red-500' : 'border-white/5'}`}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(255, 255, 255, 0.2)"
        secureTextEntry
        className="flex-1 text-white font-medium text-sm"
      />
    </View>
    {error ? <Text className="text-red-400 text-xs mt-1.5 pl-1">{error}</Text> : null}
  </View>
);

export default function ChangePasswordScreen() {
  const router = useRouter();

const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [reenterPassword, setReenterPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; reenterPassword?: string }>({});

  const handleSave = () => {
    const newErrors: typeof errors = {};
    if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters long';
    }
    if (newPassword !== reenterPassword) {
      newErrors.reenterPassword = 'Passwords do not match';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    showSuccess('Password changed successfully');
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-[#12081E] pt-14">
      {/* Header */}
      <View className="flex-row items-center px-4 pb-4">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white font-bold text-base ml-2">Change Password</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* Inputs */}
        <InputField 
          label="CURRENT PASSWORD" 
          value={currentPassword} 
          onChange={setCurrentPassword} 
          placeholder="********" 
        />
        
   <InputField 
          label="NEW PASSWORD" 
          value={newPassword} 
          onChange={(v: string) => { setNewPassword(v); setErrors(e => ({ ...e, newPassword: undefined })); }} 
          placeholder="Enter new password"
          error={errors.newPassword}
        />
        
        <InputField 
          label="RE-ENTER NEW PASSWORD" 
          value={reenterPassword} 
          onChange={(v: string) => { setReenterPassword(v); setErrors(e => ({ ...e, reenterPassword: undefined })); }} 
          placeholder="Re-enter new password"
          error={errors.reenterPassword}
        />

        {/* Save Button */}
        <Pressable 
          onPress={handleSave}
          className="w-full h-14 rounded-full mt-6 flex-row items-center justify-center active:scale-[0.98] shadow-lg shadow-[#A855F7]/30"
          style={{ backgroundColor: '#A855F7' }}
        >
          {/* Gradient Simulation */}
          <View className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-[#D946EF] to-[#A855F7] rounded-full opacity-90" />
          <Text className="text-white font-bold text-sm z-10">Save Password</Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
