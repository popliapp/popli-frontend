import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Trash2, Clock, Play } from 'lucide-react-native';
import { useFeedStore } from '../../store';
import { Image } from 'expo-image';

export default function WatchHistoryScreen() {
  const router = useRouter();
  const { watchHistory, fetchWatchHistory } = useFeedStore();

  React.useEffect(() => {
    fetchWatchHistory();
  }, []);

  return (
    <View className="flex-1 bg-[#12081E] pt-14">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-6 border-b border-white/5">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white font-bold text-base ml-2">Watch History</Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable className="bg-[#1A0E2C] p-2 rounded-full border border-white/10">
            <Search size={16} color="#FFFFFF" />
          </Pressable>
          <Pressable className="bg-[#EF4444]/20 p-2 rounded-full border border-[#EF4444]/30">
            <Trash2 size={16} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        contentContainerStyle={{ gap: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {watchHistory.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20 opacity-50">
            <Clock size={48} color="#9CA3AF" />
            <Text className="text-white text-lg font-bold mt-4">No watch history</Text>
            <Text className="text-neutral-grey text-sm text-center px-8 mt-2">
              Videos you watch will appear here so you can easily find them again.
            </Text>
            <Pressable 
              onPress={() => router.push('/')}
              className="bg-[#A855F7] px-6 py-3 rounded-full mt-6"
            >
              <Text className="text-white font-bold">Start Watching</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {watchHistory.map((reel) => (
              <Pressable 
                key={reel.id} 
                className="w-[48%] aspect-[9/16] bg-[#1A0E2C] rounded-2xl mb-4 overflow-hidden"
                onPress={() => router.push(`/reel/${reel.id}`)}
              >
                <Image 
                  source={{ uri: reel.thumbnailUrl || reel.mediaUrl }} 
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
