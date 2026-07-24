import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, UserPlus, CheckCircle2 } from 'lucide-react-native';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store';

export default function NetworkScreen() {
  const router = useRouter();
  const { userId, type } = useLocalSearchParams<{ userId: string, type: 'followers' | 'following' }>();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useAuthStore(state => state.userProfile);
  const followingIds = useAuthStore(state => state.followingIds);

  useEffect(() => {
    const fetchNetwork = async () => {
      setLoading(true);
      try {
        const endpoint = type === 'followers' ? `/social/${userId}/followers` : `/social/${userId}/following`;
        const res = await apiClient.get(endpoint);
        setUsers(res.data);
      } catch (err) {
        console.error(`Failed to fetch ${type}:`, err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) {
      fetchNetwork();
    }
  }, [userId, type]);

  const toggleFollow = async (targetId: string, isFollowing: boolean) => {
    try {
      // Optimistic update
      setUsers(prev => prev.map(u => {
        if (u.id === targetId) {
          return { ...u, isFollowingByMe: !isFollowing };
        }
        return u;
      }));

        await apiClient.post(`/social/follow/${targetId}`);
    } catch (err) {
      console.error("Follow toggle failed", err);
      // Revert optimistic update here if needed
    }
  };

  return (
    <View className="flex-1 bg-[#12081E] pt-14">
      {/* Header */}
      <View className="flex-row items-center px-4 pb-4 border-b border-white/5">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-70">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white font-bold text-[19px] ml-2 capitalize">{type}</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color="#A855F7" className="mt-10" />
        ) : users.length === 0 ? (
          <View className="items-center justify-center py-20 opacity-50">
            <UserPlus size={48} color="#9CA3AF" />
            <Text className="text-white font-medium mt-4">No {type} yet</Text>
          </View>
        ) : (
          users.map((user) => {
            const userData = user.follower || user.following || user;
            if (!userData || !userData.id || !userData.username) return null;

            const isMe = currentUser?.id === userData.id;
            const isFollowing = followingIds.includes(userData.id);

            return (
              <Pressable 
                key={userData.id}
                onPress={() => router.push(`/user/${userData.id}`)}
                className="flex-row items-center justify-between py-3 mb-2 bg-[#1A0E2C] rounded-2xl px-3 border border-white/5"
              >
                <View className="flex-row items-center gap-3">
                  <Image source={{ uri: userData.avatar || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200' }} className="w-12 h-12 rounded-full border border-white/10" />
                  <View>
                    <Text className="text-white font-bold text-[15px]">{userData.name}</Text>
                    <Text className="text-neutral-grey text-xs mt-0.5">@{userData.username}</Text>
                  </View>
                </View>

                {!isMe && (
                  <Pressable 
                    onPress={async () => {
                      const { toggleFollow } = useAuthStore.getState();
                      await toggleFollow(userData.id);
                      // Update local state to reflect the change visually
                      setUsers([...users]); 
                    }}
                    className={`px-4 py-1.5 rounded-full ${isFollowing ? 'bg-white/10' : 'bg-[#A855F7]'}`}
                  >
                    <Text className={`font-bold text-xs ${isFollowing ? 'text-white' : 'text-white'}`}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </Pressable>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
