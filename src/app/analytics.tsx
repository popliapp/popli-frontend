import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Dimensions, ActivityIndicator, Pressable, Image } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Heart, MessageCircle, Share2, Play, Eye } from 'lucide-react-native';
import { apiClient } from '../api/client';
import { useAuthStore, useFeedStore, useWalletStore } from '../store';
import { formatEarnings } from '../utils/earnings';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { videoId } = useLocalSearchParams<{ videoId?: string }>();
  const [loading, setLoading] = useState(true);

  const { userProfile } = useAuthStore();
  const { userReels, fetchUserReels } = useFeedStore();
  const wallet = useWalletStore();

  const [videoAnalytics, setVideoAnalytics] = useState<any>(null);  

  useFocusEffect(
    useCallback(() => {
      if (userProfile?.id) {
        fetchUserReels(userProfile.id);
        wallet.fetchWallet().catch(console.error);
        if (videoId) {
          apiClient.get(`/analytics/reels/${videoId}`).then(res => setVideoAnalytics(res.data)).catch(console.error);
        }
      }
      setLoading(false);
    }, [userProfile?.id, videoId])
  );

  // If videoId is provided, focus only on that video
  let targetReels = videoId ? userReels.filter(r => r.id === videoId) : userReels;
  
  // Filter out photos so they don't show up in Video Earnings
  targetReels = targetReels.filter(r => {
    const safeVideoUrl = r.videoUrl || r.mediaUrl || '';
    const isPhotoPost = safeVideoUrl === '' || safeVideoUrl.includes('unsplash.com') || safeVideoUrl.includes('picsum.photos') || safeVideoUrl.match(/\.(jpeg|jpg|gif|png)$/i) != null || r.mediaType === 'PHOTO';
    return !isPhotoPost;
  });

  // Calculate real metrics
  const allTimeViews = targetReels.reduce((sum, r) => sum + (r.viewsCount || 0), 0);
  const likes = targetReels.reduce((sum, r) => sum + (r.likesCount || 0), 0);
  const comments = targetReels.reduce((sum, r) => sum + (r.commentsCount || 0), 0);
  const shares = targetReels.reduce((sum, r) => sum + (r.sharesCount || 0), 0);

  // Use strictly backend values for consistency across the app
const viewEarnings = videoId 
    ? (videoAnalytics?.earnings?.viewEarnings || 0)
    : (wallet?.viewEarnings ?? 0);
  const giftEarnings = videoId ? (videoAnalytics?.earnings?.giftEarnings || 0) : (wallet?.giftEarnings ?? 0);
  const referralEarnings = videoId ? 0 : (wallet?.referralEarnings ?? 0);
  const bonusEarnings = videoId ? 0 : (wallet?.bonusEarnings ?? 0);
 const totalEarnings = videoId ? (viewEarnings + giftEarnings) : (wallet?.totalEarnings ?? 0);

  const sortedReels = [...targetReels].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
const allPerformingPosts = sortedReels.length > 0 ? sortedReels.map(r => ({
    id: r.id,
    title: r.description || 'My Video',
    views: r.viewsCount || 0,
    earnings: (r as any).viewEarnings || 0,
    isMonetized: r.isMonetized !== false
  })) : [
    { id: '1', title: 'No reels yet', views: 0, earnings: 0, isMonetized: false }
  ];
  if (loading) {
    return (
      <View className="flex-1 bg-[#0B001A] items-center justify-center">
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0B001A] pt-14">
      {/* Header */}
      <View className="flex-row items-center justify-center relative px-4 pb-4 z-10">
        <Pressable onPress={() => router.back()} className="absolute left-4 top-0 p-2 -ml-2 active:opacity-70">
          <ArrowLeft color="#FFFFFF" size={24} />
        </Pressable>
        <Text className="text-white font-bold text-lg tracking-tight">
          {videoId ? 'Video Insights' : 'Analytics'}
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        
        {/* All-Time Views Card */}
        <View className="bg-[#1A0E2C] border border-white/5 rounded-3xl p-6 mb-4 items-center">
          <Text className="text-white/50 text-[10px] font-bold tracking-widest uppercase mb-3">All-Time Views</Text>
          <Text className="text-white font-black text-6xl tracking-tight mb-8">{allTimeViews}</Text>
          
          <View className="flex-row w-full justify-between items-center px-6">
            <View className="items-center">
              <Text className="text-white font-black text-xl mb-1">—</Text>
              <Text className="text-white/40 text-[10px]">Avg Watch Rate</Text>
            </View>
            <View className="w-[1px] h-8 bg-white/10" />
            <View className="items-center">
              <Text className="text-white font-black text-xl mb-1">—</Text>
              <Text className="text-white/40 text-[10px]">Completion Rate</Text>
            </View>
          </View>
        </View>

        {/* Engagement Row */}
        <View className="flex-row justify-between mb-4 gap-3">
          <View className="flex-1 bg-[#1A0E2C] border border-white/5 rounded-[20px] p-4 items-center">
            <Heart size={20} color="#F43F5E" className="mb-2" strokeWidth={2.5} />
            <Text className="text-white font-bold text-xl mb-0.5">{likes}</Text>
            <Text className="text-white/40 text-[10px]">Likes</Text>
          </View>
          
          <View className="flex-1 bg-[#1A0E2C] border border-white/5 rounded-[20px] p-4 items-center">
            <MessageCircle size={20} color="#A855F7" className="mb-2" strokeWidth={2.5} />
            <Text className="text-white font-bold text-xl mb-0.5">{comments}</Text>
            <Text className="text-white/40 text-[10px]">Comments</Text>
          </View>
          
          <View className="flex-1 bg-[#1A0E2C] border border-white/5 rounded-[20px] p-4 items-center">
            <Share2 size={20} color="#0EA5E9" className="mb-2" strokeWidth={2.5} />
            <Text className="text-white font-bold text-xl mb-0.5">{shares}</Text>
            <Text className="text-white/40 text-[10px]">Shares</Text>
          </View>
        </View>

        {/* View Velocity */}
        <View className="bg-[#1A0E2C] border border-white/5 rounded-[24px] p-5 mb-4 h-60">
          <View className="flex-row justify-between items-start mb-1">
            <Text className="text-white font-extrabold text-lg">View Velocity</Text>
            <Text className="text-white font-extrabold text-lg">{allTimeViews}</Text>
          </View>
          <View className="flex-row justify-between mb-8">
            <Text className="text-white/50 text-xs">Views per day, last 7 days</Text>
            <Text className="text-white/50 text-xs">total</Text>
          </View>
          
          <View className="flex-1 justify-end pb-2">
            {/* Horizontal Line */}
            <View className="h-[2px] bg-[#A855F7]/40 w-full absolute bottom-8 left-0" />
            
            {/* Plot points */}
            <View className="flex-row justify-between w-full absolute bottom-7 px-1">
               <View className="w-2.5 h-2.5 rounded-full bg-[#A855F7] border-2 border-[#1A0E2C]" />
               <View className="w-2.5 h-2.5 rounded-full bg-[#A855F7] border-2 border-[#1A0E2C]" />
               <View className="w-2.5 h-2.5 rounded-full bg-[#A855F7] border-2 border-[#1A0E2C]" />
               <View className="w-2.5 h-2.5 rounded-full bg-[#A855F7] border-2 border-[#1A0E2C]" />
               <View className="w-2.5 h-2.5 rounded-full bg-[#A855F7] border-2 border-[#1A0E2C]" />
               <View className="w-2.5 h-2.5 rounded-full bg-[#A855F7] border-2 border-[#1A0E2C]" />
               <View className="w-2.5 h-2.5 rounded-full bg-[#A855F7] border-2 border-[#1A0E2C]" />
            </View>
            
            {/* Days labels */}
            <View className="flex-row justify-between mt-auto">
              <Text className="text-white/40 text-[10px] font-medium">Fri</Text>
              <Text className="text-white/40 text-[10px] font-medium">Sat</Text>
              <Text className="text-white/40 text-[10px] font-medium">Sun</Text>
              <Text className="text-white/40 text-[10px] font-medium">Mon</Text>
              <Text className="text-white/40 text-[10px] font-medium">Tue</Text>
              <Text className="text-white/40 text-[10px] font-medium">Wed</Text>
              <Text className="text-white/40 text-[10px] font-medium">Thu</Text>
            </View>
          </View>
        </View>

        {/* Total Earnings */}
        <View className="bg-[#1A0E2C] border border-white/5 rounded-[24px] p-5 mb-6">
          <Text className="text-white font-extrabold text-lg mb-3">
            {videoId ? 'Video Earnings' : 'Total Earnings'}
          </Text>
          <Text className="text-[#F59E0B] font-black text-4xl mb-8 tracking-tight">₹{totalEarnings.toFixed(2)}</Text>
          
          <View className="gap-y-4">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-3">
                <View className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />
                <Text className="text-white font-bold text-sm">View Earnings</Text>
              </View>
<Text className="text-[#A855F7] font-bold text-sm">
                {formatEarnings(viewEarnings)}
              </Text>
            </View>

            {!videoId && (
              <>
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-3">
                    <View className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <Text className="text-white font-bold text-sm">Gifts & Tips</Text>
                  </View>
            <Text className="text-[#F59E0B] font-bold text-sm">{formatEarnings(giftEarnings)}</Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-3">
                    <View className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <Text className="text-white font-bold text-sm">Referrals</Text>
                  </View>
                  <Text className="text-[#10B981] font-bold text-sm">₹{referralEarnings.toFixed(2)}</Text>
                </View>

                {bonusEarnings > 0 && (
                  <View className="flex-row justify-between items-center mt-4">
                    <View className="flex-row items-center gap-3">
                      <View className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                      <Text className="text-white font-bold text-sm">Bonus/Adjustments</Text>
                    </View>
                    <Text className="text-[#3B82F6] font-bold text-sm">₹{bonusEarnings.toFixed(2)}</Text>
                  </View>
                )}
              </>
            )}

            {videoId && giftEarnings > 0 && (
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-3">
                  <View className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <Text className="text-white font-bold text-sm">Gifts & Tips</Text>
                </View>
                <Text className="text-[#F59E0B] font-bold text-sm">₹{giftEarnings.toFixed(2)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Top Gifters for Single Video */}
        {videoId && videoAnalytics?.topGifters && videoAnalytics.topGifters.length > 0 && (
          <View className="mb-6">
            <Text className="text-white font-bold text-lg mb-4 px-1">Top Gifters</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {videoAnalytics.topGifters.map((gifter: any, index: number) => (
                <View key={index} className="bg-[#1A0E2C] p-4 rounded-2xl border border-white/5 items-center w-32">
<Image source={{ uri: gifter.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(gifter.username || 'U')}&background=1D1037&color=fff&size=200` }} className="w-12 h-12 rounded-full mb-2" />
                  <Text className="text-white font-bold text-sm text-center" numberOfLines={1}>{gifter.username}</Text>
                  <Text className="text-[#F59E0B] font-bold text-xs mt-1">{gifter.totalGiftCoins} Coins</Text>
                  <Text className="text-white/40 text-[10px] mt-0.5">{gifter.giftCount} Gifts sent</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Video Earnings Breakdown (Only show for overall analytics) */}
        {!videoId && (
          <View className="bg-[#1A0E2C] border border-white/5 rounded-[24px] p-5 mb-6">
         <Text className="text-white font-bold text-lg mb-6">Video Earnings Breakdown</Text>
          
          {allPerformingPosts.map((post: any, index: number) => (
            <View key={post.id || index} className={`flex-row items-center justify-between ${index < allPerformingPosts.length - 1 ? 'mb-6' : ''}`}>
              <View className="flex-row items-center gap-4 flex-1 pr-2">
                <Text className="text-[#A855F7] font-bold text-lg w-6">#{index + 1}</Text>
                <View className="w-12 h-12 bg-[#0B001A] rounded-xl items-center justify-center border border-white/5">
                  <Play size={20} color={index === 0 ? "#60A5FA" : "#9CA3AF"} opacity={0.8} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-white font-bold text-base mb-1 shrink" numberOfLines={1}>{post.title}</Text>
                    {post.isMonetized && post.views > 0 && (
                      <View className="bg-[#10B981]/20 px-1.5 py-0.5 rounded ml-2 mb-1">
                         <Text className="text-[#10B981] text-[8px] font-bold uppercase">Active</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Eye size={12} color="#9CA3AF" />
                    <Text className="text-white/40 text-xs">{post.views.toLocaleString()} views</Text>
                  </View>
                </View>
              </View>
           <View className="items-end">
         <Text className="text-[#10B981] font-bold text-base">{formatEarnings(post.earnings)}</Text>
               {post.views > 0 && <Text className="text-white/40 text-[9px]">earned</Text>}
              </View>
            </View>
          ))}
        </View>
        )}

      </ScrollView>
    </View>
  );
}
