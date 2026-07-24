import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Heart, Play } from 'lucide-react-native';
import { useFeedStore } from '../../store';
import { Image } from 'expo-image';

export default function LikedVideosScreen() {
  const router = useRouter();

  const { likedReels, fetchLikedReels } = useFeedStore();

  useFocusEffect(
    React.useCallback(() => {
      fetchLikedReels();
    }, [])
  );

  return (
    <View className="flex-1 bg-[#12081E] pt-14">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-6 border-b border-white/5">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white font-bold text-base ml-2">Liked Videos</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {likedReels.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20 opacity-50">
            <Heart size={48} color="#9CA3AF" />
            <Text className="text-white text-lg font-bold mt-4">No liked videos</Text>
            <Text className="text-neutral-grey text-sm text-center px-8 mt-2">
              Tap the heart on any video to save it here.
            </Text>
            <Pressable 
              onPress={() => router.push('/')}
              className="bg-[#A855F7] px-6 py-3 rounded-full mt-6"
            >
              <Text className="text-white font-bold">Discover Content</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {likedReels.map((reel) => (
              <Pressable 
                key={reel.id} 
                className="w-[48%] aspect-[9/16] bg-[#1A0E2C] rounded-2xl mb-4 overflow-hidden"
                onPress={() => router.push(`/reel/${reel.id}`)}
              >
                <Image 
                  source={{ uri: reel.thumbnailUrl || reel.videoUrl }} 
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
                <View className="absolute bottom-2 left-2 flex-row items-center bg-black/40 px-2 py-1 rounded-full">
                  <Play size={10} color="#FFFFFF" />
                  <Text className="text-white text-[10px] font-bold ml-1">{reel.viewsCount}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
