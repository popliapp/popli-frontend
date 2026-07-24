import React, { useMemo } from 'react';
import { View, Text, ScrollView, Image, Pressable, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Play, Music, Camera } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { useFeedStore } from '../../store';
import { formatSocialCount } from '../../utils';

const { width } = Dimensions.get('window');

export default function AudioScreen() {
  const router = useRouter();
  const { id, title, url, creator } = useLocalSearchParams<{
    id: string;
    title: string;
    url: string;
    creator: string;
  }>();

  const { reels, userReels } = useFeedStore();

  const displayReels = useMemo(() => {
    // Combine feed reels and user reels
    const allReels = [...reels, ...userReels];
    
    // Filter to find reels that actually use this audio (or the original reel itself)
    const filtered = allReels.filter(r => {
      // If it's the exact reel we clicked on
      if (r.id === id) return true;
      // If it has the same music name and same creator (Original Audio match)
      if (r.musicName === title && `@${r.creatorUsername}` === creator) return true;
      return false;
    });

    // Remove duplicates by ID
    const uniqueReels = Array.from(new Map(filtered.map(r => [r.id, r])).values());
    
    return uniqueReels;
  }, [reels, userReels, id, title, creator]);

  const handleUseAudio = () => {
    router.push({
      pathname: '/(tabs)/create',
      params: {
        selectedMusicId: `audio_${id}`,
        selectedMusicTitle: title || 'Original Audio',
        selectedMusicArtist: creator || 'Audio Creator',
        selectedMusicUrl: url
      }
    });
  };

  return (
    <SafeScreen edgeToEdgeBottom className="bg-[#12081E]">
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-white/5">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={28} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white font-bold text-lg">Audio</Text>
        <View className="w-10" />
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* AUDIO DETAILS */}
        <View className="flex-row items-center p-4">
          <View className="w-24 h-24 rounded-lg bg-white/10 items-center justify-center mr-4 border border-white/5">
            <Music size={40} color="#A855F7" opacity={0.8} />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-xl mb-1" numberOfLines={2}>
              {title || 'Original Audio'}
            </Text>
            <Text className="text-neutral-grey text-sm mb-3">
              {creator || 'Unknown Creator'}
            </Text>
            <Text className="text-white/60 text-xs">
              {formatSocialCount(displayReels.length)} reels
            </Text>
          </View>
        </View>

        {/* GRID */}
        <View className="flex-row flex-wrap mt-2 border-t border-white/5">
          {displayReels.map((reel) => (
            <Pressable
              key={reel.id}
              onPress={() => {
                router.push({
                  pathname: `/reel/${reel.id}` as any,
                  params: { source: 'home' } // Adjust source if needed
                });
              }}
              className="w-[33.33%] h-52 border-[0.5px] border-black active:opacity-80"
            >
              <Image source={{ uri: reel.thumbnailUrl }} className="w-full h-full" resizeMode="cover" />
              <View className="absolute bottom-2 left-2 flex-row items-center gap-1">
                <Play size={10} color="#FFFFFF" fill="#FFFFFF" />
                <Text className="text-white text-[10px] font-bold drop-shadow-md">
                  {formatSocialCount(reel.viewsCount || 0)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* USE AUDIO BUTTON FLOATING */}
      <View className="absolute bottom-6 left-6 right-6">
        <Pressable 
          onPress={handleUseAudio}
          className="bg-primary-pink flex-row items-center justify-center py-4 rounded-full shadow-lg"
        >
          <Camera size={20} color="#FFFFFF" className="mr-2" />
          <Text className="text-white font-bold text-base">Use Audio</Text>
        </Pressable>
      </View>
    </SafeScreen>
  );
}
