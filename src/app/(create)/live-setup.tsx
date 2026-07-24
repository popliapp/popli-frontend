import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, ScrollView } from 'react-native';
import { showInfo } from '../../store/toastStore';
import { useRouter } from 'expo-router';
import { X, Radio, Settings, Users, ArrowRight } from 'lucide-react-native';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

export default function LiveSetupScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-black pt-12 relative">
      
      {/* Fake Camera Preview Background */}
      <View className="absolute inset-0 bg-[#1D1037]" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-4 z-10">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 w-10 h-10 items-center justify-center bg-black/40 rounded-full backdrop-blur-md">
          <X size={24} color="#FFFFFF" />
        </Pressable>
        <Pressable className="p-2 -mr-2 w-10 h-10 items-center justify-center bg-black/40 rounded-full backdrop-blur-md">
          <Settings size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 z-10" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        
        <View className="items-center mb-8">
          <View className="w-16 h-16 rounded-full bg-[#EC4899]/20 items-center justify-center mb-4 border border-[#EC4899]/50">
            <Radio size={32} color="#EC4899" />
          </View>
          <Text className="text-white text-2xl font-bold mb-2">Start Live Video</Text>
          <Text className="text-neutral-grey text-center px-4">Interact with your followers in real-time. They will be notified when you go live.</Text>
        </View>

        <View className="bg-black/40 p-4 rounded-3xl border border-white/10 mb-8 backdrop-blur-xl">
          <Text className="text-white/60 text-xs font-bold uppercase ml-2 mb-2">Live Title (Optional)</Text>
          <View className="bg-black/50 rounded-2xl p-4">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What are you up to?"
              placeholderTextColor="rgba(255,255,255,0.4)"
              className="text-white text-base font-medium"
            />
          </View>

          <View className="h-[1px] bg-white/5 my-4 mx-2" />

          <Pressable className="flex-row items-center justify-between px-2">
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-[#10B981]/20 items-center justify-center">
                <Users size={16} color="#10B981" />
              </View>
              <View>
                <Text className="text-white text-sm font-bold">Audience</Text>
                <Text className="text-neutral-grey text-xs mt-0.5">Public</Text>
              </View>
            </View>
            <ArrowRight size={16} color="#6B7280" />
          </Pressable>
        </View>

      </ScrollView>

      {/* Go Live Button */}
      <View className="px-8 pb-12 z-10">
        <Pressable 
         onPress={() => showInfo('Live streaming coming soon')}
          className="bg-[#EC4899] py-4 rounded-full items-center shadow-lg shadow-[#EC4899]/50"
        >
          <Text className="text-white font-black text-lg tracking-wider">GO LIVE</Text>
        </Pressable>
      </View>

    </KeyboardAvoidingView>
  );
}
