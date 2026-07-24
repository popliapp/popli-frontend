import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Eye, Heart, MessageCircle, Share2, MapPin, Coins, Trophy } from 'lucide-react-native';
import { apiClient } from '../../../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import { getDefaultAvatar } from '../../../utils';

export default function ReelAnalyticsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchAnalytics = async () => {
    try {
      const res = await apiClient.get(`/analytics/reels/${id}`);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnalytics();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#0A0514] items-center justify-center">
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 bg-[#0A0514] items-center justify-center">
        <Text className="text-white">Failed to load analytics</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#0A0514]" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="pt-14 px-5 pb-4 flex-row items-center border-b border-white/5">
        <Pressable onPress={() => router.back()} className="mr-4 p-2 -ml-2 rounded-full bg-white/5">
          <ChevronLeft color="white" size={24} />
        </Pressable>
        <Text className="text-white font-bold text-xl flex-1">Reel Analytics</Text>
      </View>

      {/* Overview Cards */}
      <View className="px-5 mt-6">
        <Text className="text-white font-bold text-lg mb-4">Overview</Text>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          <View className="bg-[#12081E] w-[48%] p-4 rounded-2xl border border-white/5">
            <View className="bg-blue-500/20 w-8 h-8 rounded-full items-center justify-center mb-2">
              <Eye size={16} color="#3B82F6" />
            </View>
            <Text className="text-white font-black text-2xl">{data.overview.totalViews}</Text>
            <Text className="text-white/50 text-xs mt-1">Total Views</Text>
          </View>
          <View className="bg-[#12081E] w-[48%] p-4 rounded-2xl border border-white/5">
            <View className="bg-red-500/20 w-8 h-8 rounded-full items-center justify-center mb-2">
              <Heart size={16} color="#EF4444" />
            </View>
            <Text className="text-white font-black text-2xl">{data.overview.totalLikes}</Text>
            <Text className="text-white/50 text-xs mt-1">Likes</Text>
          </View>
          <View className="bg-[#12081E] w-[48%] p-4 rounded-2xl border border-white/5">
            <View className="bg-green-500/20 w-8 h-8 rounded-full items-center justify-center mb-2">
              <MessageCircle size={16} color="#10B981" />
            </View>
            <Text className="text-white font-black text-2xl">{data.overview.totalComments}</Text>
            <Text className="text-white/50 text-xs mt-1">Comments</Text>
          </View>
          <View className="bg-[#12081E] w-[48%] p-4 rounded-2xl border border-white/5">
            <View className="bg-purple-500/20 w-8 h-8 rounded-full items-center justify-center mb-2">
              <Share2 size={16} color="#A855F7" />
            </View>
            <Text className="text-white font-black text-2xl">{data.overview.totalShares}</Text>
            <Text className="text-white/50 text-xs mt-1">Shares</Text>
          </View>
        </View>
      </View>

      {/* Earnings Breakdown */}
      <View className="px-5 mt-8">
        <Text className="text-white font-bold text-lg mb-4">Earnings Breakdown</Text>
        <LinearGradient colors={['#1D1037', '#12081E']} className="p-5 rounded-2xl border border-[#A855F7]/30">
          <View className="flex-row items-center mb-4">
            <View className="bg-[#EAB308]/20 p-2 rounded-full mr-3">
              <Coins size={20} color="#EAB308" />
            </View>
            <View>
              <Text className="text-white/70 text-xs">Total Reel Earnings</Text>
              <Text className="text-[#EAB308] font-black text-3xl">₹{data.earnings.totalEarnings.toFixed(2)}</Text>
            </View>
          </View>
          
          <View className="h-px bg-white/10 w-full mb-4" />
          
          <View className="flex-row justify-between mb-2">
            <Text className="text-white/50 text-sm">View Earnings</Text>
            <Text className="text-white font-bold">₹{data.earnings.viewEarnings.toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-white/50 text-sm">Gift Earnings</Text>
            <Text className="text-green-400 font-bold">₹{data.earnings.giftEarnings.toFixed(2)}</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Top Gifters */}
      {data.topGifters && data.topGifters.length > 0 && (
        <View className="mt-8">
          <View className="px-5 mb-4 flex-row items-center gap-2">
            <Trophy size={20} color="#EAB308" />
            <Text className="text-white font-bold text-lg">Top Gifters</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
            {data.topGifters.map((gifter: any, index: number) => (
              <View key={index} className="bg-[#12081E] p-4 rounded-2xl border border-white/5 items-center w-32">
                <Image source={{ uri: gifter.avatar || getDefaultAvatar(gifter.username) }} className="w-12 h-12 rounded-full mb-2" />
                <Text className="text-white font-bold text-sm text-center" numberOfLines={1}>{gifter.username}</Text>
                <Text className="text-[#EAB308] font-bold text-xs mt-1">{gifter.totalGiftCoins} Coins</Text>
                <Text className="text-white/40 text-[10px] mt-0.5">{gifter.giftCount} Gifts sent</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Audience Locations */}
      <View className="px-5 mt-8">
        <View className="mb-4 flex-row items-center gap-2">
          <MapPin size={20} color="#3B82F6" />
          <Text className="text-white font-bold text-lg">Top Cities</Text>
        </View>
        
        {data.audience?.cities?.length > 0 ? (
          <View className="bg-[#12081E] p-5 rounded-2xl border border-white/5 gap-y-4">
            {data.audience.cities.map((city: any, index: number) => {
              // Calculate percentage based on total views for a rough estimate
              const percentage = Math.max(1, Math.min(100, Math.round((city.count / data.overview.totalViews) * 100)));
              return (
                <View key={index}>
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-white text-sm">{city.name}</Text>
                    <Text className="text-white/50 text-xs">{percentage}%</Text>
                  </View>
                  <View className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <View className="h-full bg-[#3B82F6]" style={{ width: `${percentage}%` }} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="bg-[#12081E] p-5 rounded-2xl border border-white/5 items-center">
            <Text className="text-white/40 text-sm">Not enough location data yet</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
