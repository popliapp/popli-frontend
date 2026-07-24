import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, UserX } from 'lucide-react-native';
import { useAuthStore } from '../../store';
import { Image } from 'expo-image';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { blockedUsers, fetchBlockedUsers, toggleBlock } = useAuthStore();

  React.useEffect(() => {
    fetchBlockedUsers();
  }, []);

  return (
    <View className="flex-1 bg-[#12081E] pt-14">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-6 border-b border-white/5">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white font-bold text-base ml-2">Blocked Accounts</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        contentContainerStyle={{ gap: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {blockedUsers.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20 opacity-50">
            <UserX size={48} color="#EF4444" />
            <Text className="text-white text-lg font-bold mt-4">No blocked accounts</Text>
            <Text className="text-neutral-grey text-sm text-center px-8 mt-2">
              When you block someone, they won&apos;t be able to see your profile or content.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {blockedUsers.map((user) => (
              <View key={user.id} className="flex-row items-center justify-between bg-[#1A0E2C] p-4 rounded-2xl border border-white/5">
                <View className="flex-row items-center gap-3">
                  <Image 
                    source={{ uri: user.avatar || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200' }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                    contentFit="cover"
                  />
                  <View>
                    <Text className="text-white font-bold">{user.name}</Text>
                    <Text className="text-neutral-grey text-xs">@{user.username}</Text>
                  </View>
                </View>
                <Pressable 
                  onPress={() => toggleBlock(user.id)}
                  className="bg-white/10 px-4 py-2 rounded-full"
                >
                  <Text className="text-white font-bold text-xs">Unblock</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
