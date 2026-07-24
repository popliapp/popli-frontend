import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Users, Gift } from 'lucide-react-native';

export default function ReferralListScreen() {
  const router = useRouter();

  const referredUsers: any[] = [];

  return (
    <View className="flex-1 bg-[#12081E] pt-14">
      {/* Header */}
      <View className="flex-row items-center px-4 pb-6 border-b border-white/5">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white font-bold text-base ml-2">My Referrals</Text>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        contentContainerStyle={{ gap: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-neutral-grey text-[10px] font-bold uppercase tracking-widest">Referred Friends ({referredUsers.length})</Text>
          <Text className="text-[#A855F7] font-bold text-xs">Total Earned: ₹0</Text>
        </View>

        {referredUsers.length === 0 ? (
          <View className="items-center py-12 opacity-50 mt-8">
            <Gift size={32} color="#9CA3AF" />
            <Text className="text-neutral-grey text-base font-bold mt-4">No Referrals Yet</Text>
            <Text className="text-neutral-grey text-xs text-center px-8 mt-2">
              Invite more friends to see them appear on this list and earn rewards!
            </Text>
          </View>
        ) : (
          referredUsers.map((user) => (
            <View key={user.id} className="flex-row items-center justify-between bg-[#1A0E2C] border border-white/5 rounded-2xl p-4">
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 rounded-full bg-[#3B82F6]/10 items-center justify-center border border-[#3B82F6]/20">
                  <Users size={20} color="#3B82F6" />
                </View>
                <View>
                  <Text className="text-white font-bold text-sm">{user.name}</Text>
                  <Text className="text-neutral-grey text-[10px] mt-1">{user.username}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-[#10B981] font-bold text-sm">+{user.reward}</Text>
                <Text className={`text-[10px] mt-1 font-semibold ${user.status === 'Completed' ? 'text-neutral-grey' : 'text-[#FACC15]'}`}>
                  {user.status}
                </Text>
              </View>
            </View>
          ))
        )}

      </ScrollView>
    </View>
  );
}
