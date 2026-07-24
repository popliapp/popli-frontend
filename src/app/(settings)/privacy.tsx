import React from 'react';
import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, EyeOff, Lock, UserX, VolumeX, MessageSquareOff } from 'lucide-react-native';
import { useAuthStore } from '../../store';

const ToggleRow = ({ icon: Icon, title, description, enabled = false, onToggle }: any) => (
  <View className="flex-row items-center justify-between border-b border-white/5 py-4">
    <View className="flex-row items-center gap-4 flex-1 pr-4">
      <Icon size={20} color="#9CA3AF" />
      <View>
        <Text className="text-white font-bold text-sm">{title}</Text>
        <Text className="text-neutral-grey text-[10px] mt-1">{description}</Text>
      </View>
    </View>
    <Switch
      value={enabled}
      onValueChange={onToggle}
      trackColor={{ false: '#374151', true: '#A855F7' }}
      thumbColor={'#FFFFFF'}
    />
  </View>
);

export default function PrivacyScreen() {
  const router = useRouter();

  const { preferences, updatePreferences } = useAuthStore();

  return (
    <View className="flex-1 bg-[#12081E] pt-14">
      {/* Header */}
      <View className="flex-row items-center px-4 pb-6 border-b border-white/5">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white font-bold text-base ml-2">Privacy & Safety</Text>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        contentContainerStyle={{ gap: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-4">
          <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Visibility</Text>
          <View className="bg-[#1A0E2C] border border-white/5 rounded-3xl px-4">
            <ToggleRow 
              icon={Lock} 
              title="Private Account" 
              description="Only approved followers can see your content." 
              enabled={preferences?.isPrivateProfile}
              onToggle={(val: boolean) => updatePreferences({ isPrivateProfile: val })}
            />
            <ToggleRow 
              icon={EyeOff} 
              title="Activity Status" 
              description="Show when you are active on the app." 
              enabled={true} 
            />
          </View>
        </View>

        <View className="gap-4">
          <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Interactions</Text>
          <View className="bg-[#1A0E2C] border border-white/5 rounded-3xl px-4">
            <ToggleRow 
              icon={MessageSquareOff} 
              title="Filter Comments" 
              description="Hide comments that may be offensive." 
              enabled={true} 
            />
            <View className="flex-row items-center justify-between border-b border-white/5 py-4">
              <View className="flex-row items-center gap-4">
                <Shield size={20} color="#9CA3AF" />
                <Text className="text-white font-bold text-sm">Mention Controls</Text>
              </View>
              <Text className="text-neutral-grey text-xs">Everyone</Text>
            </View>
          </View>
        </View>

        <View className="gap-4">
          <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Connections</Text>
          <View className="bg-[#1A0E2C] border border-white/5 rounded-3xl px-4">
            <Pressable 
              onPress={() => router.push('/(settings)/blocked')}
              className="flex-row items-center justify-between border-b border-white/5 py-4"
            >
              <View className="flex-row items-center gap-4">
                <UserX size={20} color="#EF4444" />
                <Text className="text-white font-bold text-sm">Blocked Accounts</Text>
              </View>
              <Text className="text-neutral-grey text-xs">0</Text>
            </Pressable>
            <Pressable className="flex-row items-center justify-between py-4">
              <View className="flex-row items-center gap-4">
                <VolumeX size={20} color="#9CA3AF" />
                <Text className="text-white font-bold text-sm">Muted Accounts</Text>
              </View>
              <Text className="text-neutral-grey text-xs">0</Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
