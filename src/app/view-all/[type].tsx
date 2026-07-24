import React from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useFeedStore, useAuthStore } from '../../store';
import { formatSocialCount } from '../../utils';

export default function ViewAllScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { creators, reels } = useFeedStore();
  const { followingIds, toggleFollow, userProfile } = useAuthStore();

  let title = 'View All';
  let content = null;

  if (type === 'creators') {
    title = 'Creators Near You';
    content = (
      <View className="gap-4">
        {creators.map((creator) => {
          const isFollowing = followingIds.includes(creator.id);
          return (
            <Pressable
              key={creator.id}
              onPress={() => router.push({ pathname: '/user/[id]' as any, params: { id: creator.username } })}
              className="flex-row items-center justify-between bg-[#1D1037]/60 p-4 rounded-xl border border-white/5 active:scale-95 transition-transform"
            >
              <View className="flex-row items-center gap-3">
                <Image source={{ uri: creator.avatar || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200' }} className="w-14 h-14 rounded-full" />
                <View>
                  <View className="flex-row items-center gap-1">
                    <Text className="text-white font-bold text-base">{creator.name}</Text>
                    {creator.isVerified && <View className="w-3 h-3 bg-[#10B981] rounded-full" />}
                  </View>
                  <Text className="text-white/50 text-xs">@{creator.username}</Text>
                  <Text className="text-[#A855F7] text-[10px] mt-1 font-bold">
                    {(creator as any).city || 'Global Creator'}
                  </Text>
                </View>
              </View>
              {userProfile?.id !== creator.id && (
                <Pressable
                  onPress={() => toggleFollow(creator.id)}
                  className={`px-5 py-2 rounded-full border ${isFollowing ? 'border-white/20 bg-transparent' : 'border-transparent bg-[#8B5CF6]'}`}
                >
                  <Text className={`text-xs font-bold ${isFollowing ? 'text-white' : 'text-white'}`}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  } else if (type === 'trending') {
    title = 'Trending Hashtags';
    const categories = Array.from(new Set(reels.map(r => r.category).filter(Boolean)));
    content = (
      <View className="gap-3">
        {categories.map((category) => (
          <Pressable
            key={category}
            onPress={() => {
              // In a real app we might route to a hashtag screen or pre-fill search
              router.back();
            }}
            className="flex-row items-center justify-between bg-[#1D1037]/60 p-4 rounded-xl border border-white/5"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 bg-[#8B5CF6]/20 rounded-full items-center justify-center border border-[#8B5CF6]/50">
                <Text className="text-[#D946EF] font-bold text-xl">#</Text>
              </View>
              <View>
                <Text className="text-white font-bold text-base">#{category}</Text>
                <Text className="text-white/50 text-xs">Trending right now</Text>
              </View>
            </View>
            <ChevronLeft size={20} color="rgba(255, 255, 255, 0.3)" style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-plum pt-12">
      <View className="flex-row items-center px-4 pb-4 border-b border-white/5">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-70">
          <ChevronLeft size={28} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white font-bold text-lg ml-2">{title}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {content}
      </ScrollView>
    </View>
  );
}
