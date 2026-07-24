import React from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ExternalLink, FileText, ShieldCheck, Users } from 'lucide-react-native';

const LinkRow = ({ icon: Icon, title }: any) => (
  <Pressable className="flex-row items-center justify-between border-b border-white/5 py-4">
    <View className="flex-row items-center gap-4">
      <Icon size={20} color="#9CA3AF" />
      <Text className="text-white font-bold text-sm">{title}</Text>
    </View>
    <ExternalLink size={16} color="#4B5563" />
  </Pressable>
);

export default function AboutScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#12081E] pt-14">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-6 border-b border-white/5">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white font-bold text-base ml-2">About</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        contentContainerStyle={{ gap: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center py-6">
          <View className="w-24 h-24 rounded-3xl items-center justify-center mb-4 shadow-lg overflow-hidden bg-transparent">
            <Image 
              source={require('../../../assets/images/custom_logo_square.png')} 
              className="w-24 h-24 rounded-2xl"
              resizeMode="contain"
            />
          </View>
          <Text className="text-white text-xl font-bold">Popli App</Text>
          <Text className="text-neutral-grey text-sm mt-1">Version 2.0.0 (Preview)</Text>
        </View>

        <View className="gap-4">
          <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Legal</Text>
          <View className="bg-[#1A0E2C] border border-white/5 rounded-3xl px-4">
            <LinkRow icon={FileText} title="Terms of Service" />
            <LinkRow icon={ShieldCheck} title="Privacy Policy" />
            <LinkRow icon={Users} title="Community Guidelines" />
          </View>
        </View>

        <View className="items-center mt-8 opacity-50">
          <Text className="text-neutral-grey text-xs text-center">
            © 2026 Popli. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
