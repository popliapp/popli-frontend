import React, { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, BarChart2, Star, Target, Shield, Settings } from 'lucide-react-native';
import { useAuthStore } from '../../store';

const ActionCard = ({ icon: Icon, title, description, onPress }: any) => (
  <Pressable 
    onPress={onPress} 
    className="bg-[#1A0E2C] border border-white/5 rounded-2xl p-4 gap-2 mb-4"
  >
    <View className="flex-row items-center gap-3">
      <View className="w-12 h-12 rounded-full bg-[#A855F7]/10 items-center justify-center border border-[#A855F7]/20">
        <Icon size={22} color="#A855F7" />
      </View>
      <View className="flex-1">
        <Text className="text-white font-extrabold text-[15px]">{title}</Text>
        <Text className="text-white/60 text-[11px] mt-1 leading-4 font-medium">{description}</Text>
      </View>
    </View>
  </Pressable>
);

export default function CreatorPortalScreen() {
  const router = useRouter();

  const { userProfile, fetchProfile } = useAuthStore();
  const level = Math.floor((userProfile?.followersCount || 0) / 100) + 1;

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  return (
    <View className="flex-1 bg-[#0B001A] pt-14">
      {/* Header */}
      <View className="flex-row items-center justify-center relative px-4 pb-4 bg-[#0B001A] border-b border-white/5 z-10">
        <Pressable onPress={() => router.back()} className="absolute left-4 top-0 p-2 -ml-2 active:opacity-70">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white font-black text-lg tracking-tight">Creator Portal</Text>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        contentContainerStyle={{ gap: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center py-8 gap-2 bg-[#1A0E2C] rounded-3xl border border-white/5 mb-6">
          <View className="w-20 h-20 rounded-full bg-yellow-500/10 items-center justify-center border border-yellow-500/20 mb-2">
            <Star size={40} color={userProfile?.isVerified ? "#F59E0B" : "#6B7280"} fill={userProfile?.isVerified ? "#F59E0B" : "transparent"} />
          </View>
          <Text className="text-white text-2xl font-black tracking-tight">Level {level} Creator</Text>
          <Text className="text-white/60 text-xs text-center px-8 font-medium leading-5">
            You have <Text className="text-white font-bold">{userProfile?.followersCount || 0}</Text> followers and <Text className="text-white font-bold">{userProfile?.giftsReceivedCount || 0}</Text> gifts. Keep up the amazing work!
          </Text>
        </View>

        <Text className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-3 ml-2">Creator Tools</Text>

        <ActionCard 
          icon={BarChart2} 
          title="Creator Analytics" 
          description="Deep dive into your audience, views, and engagement metrics." 
          onPress={() => router.push('/analytics')}
        />
        <ActionCard 
          icon={Shield} 
          title="Creator Verification" 
          description="Apply for the verified badge and unlock exclusive features." 
          onPress={() => router.push('/kyc')}
        />
        <ActionCard 
          icon={Settings} 
          title="Creator Settings" 
          description="Manage your specific creator account preferences." 
          onPress={() => router.push('/settings')}
        />

      </ScrollView>
    </View>
  );
}
