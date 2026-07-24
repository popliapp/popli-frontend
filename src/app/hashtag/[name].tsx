import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Hash } from 'lucide-react-native';
import { useHashtagStore } from '../../store';
import { formatSocialCount } from '../../utils';

export default function HashtagScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  
  const { hashtagReels, isFetchingReels, fetchReelsByHashtag } = useHashtagStore();
  
  const cleanName = name ? name.replace('#', '').toLowerCase() : '';
  const reels = hashtagReels[cleanName] || [];

  useEffect(() => {
    if (cleanName) {
      fetchReelsByHashtag(cleanName);
    }
  }, [cleanName]);

  const renderHeader = () => (
    <View className="pt-14 pb-6 px-4 border-b border-white/10 bg-[#0B001A]">
      <View className="flex-row items-center justify-between mb-6">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 bg-white/10 rounded-full">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
      </View>
      <View className="items-center">
        <View className="w-20 h-20 bg-primary-purple/20 rounded-full items-center justify-center mb-4 border border-primary-purple/50">
          <Hash size={40} color="#D946EF" />
        </View>
        <Text className="text-white text-2xl font-bold mb-2">#{cleanName}</Text>
        <Text className="text-neutral-silver text-sm">
          {formatSocialCount(reels.length)} {reels.length === 1 ? 'post' : 'posts'}
        </Text>
        <Pressable className="mt-6 bg-primary-pink px-8 py-2.5 rounded-full w-full">
          <Text className="text-white font-bold text-center">Follow</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => (
    <Pressable 
      onPress={() => {
        // Pass source context so the reel viewer knows to load the hashtag feed instead of the main feed
        router.push(`/reel/${item.id}?source=hashtag&hashtagName=${cleanName}`); 
      }}
      className="flex-1 aspect-[9/16] m-[1px] bg-[#1A0E2C]"
    >
      <Image 
        source={{ uri: item.thumbnailUrl || item.videoUrl }} 
        className="w-full h-full"
        resizeMode="cover"
      />
      <View className="absolute bottom-2 left-2 flex-row items-center">
        <Text className="text-white text-xs font-bold shadow-sm shadow-black">
          ▶ {formatSocialCount(item.viewsCount || 0)}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-[#0B001A]">
      {renderHeader()}
      
      {isFetchingReels && reels.length === 0 ? (
        <View className="flex-1 items-center justify-center pt-20">
          <ActivityIndicator size="large" color="#A855F7" />
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-neutral-silver">No posts yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
