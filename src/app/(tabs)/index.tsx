import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, Dimensions, ViewToken, StyleSheet, useWindowDimensions, ScrollView, RefreshControl, Platform, Image, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Bell, MessageSquare, Send, Search, Plus } from 'lucide-react-native';
import { PostItem } from '../../components/feed/PostItem';
import { StoriesBar } from '../../components/feed/StoriesBar';
import { CommentsSheet } from '../../components/sheets/CommentsSheet';
import { GiftSheet } from '../../components/sheets/GiftSheet';
import { SendSheet } from '../../components/sheets/SendSheet';
import { useFeedStore, useAuthStore, useStoryStore, useChatStore } from '../../store';
import { requestGPSLocation } from '../../services/geoService';
import { Reel } from '../../types';
import { MotiView } from 'moti';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';

type TopTabType = 'for_you' | 'following' | 'nearby' | 'trending';

export default function HomeFeedScreen() {
  const router = useRouter();
  const { targetUsername } = useLocalSearchParams<{ targetUsername?: string }>();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
const { homeFeedReels = [], setGPS } = useFeedStore();
  const { userProfile, followingIds } = useAuthStore();
  const { stories } = useStoryStore();
  
  const [activeTab, setActiveTab] = useState<TopTabType>('for_you');
  const [activeReelId, setActiveReelId] = useState<string>('');
  const [isFocused, setIsFocused] = useState(true);
  const [listHeight, setListHeight] = useState(height);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreReels, setHasMoreReels] = useState(true);
const [isInitialLoading, setIsInitialLoading] = useState(true);
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (!isInitialLoading) return;
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [isInitialLoading]);
  const shimmerOpacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  const flashListRef = useRef<any>(null);
  
 const [refreshCount, setRefreshCount] = useState(0);
const [headerOpacity] = useState(() => new Animated.Value(1));
  const lastScrollY = useRef(0);
  const headerVisible = useRef(true);

  const handleScroll = useCallback((e: any) => {
    const currentY = e.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    if (currentY <= 10 && !headerVisible.current) {
      headerVisible.current = true;
      Animated.timing(headerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else if (diff > 5 && headerVisible.current && currentY > 10) {
      headerVisible.current = false;
      Animated.timing(headerOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    } else if (diff < -5 && !headerVisible.current) {
      headerVisible.current = true;
      Animated.timing(headerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }

    lastScrollY.current = currentY;
  }, [headerOpacity]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setTimeout(() => {
        if (mounted) setIsFocused(true);
      }, 0);
      return () => {
        mounted = false;
        setIsFocused(false);
      };
    }, [])
  );
  
  // Sheet Overlays States
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string>('');
  
 const [isGiftsOpen, setIsGiftsOpen] = useState(false);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const handleOpenGifts = useCallback((reel: Reel) => { setSelectedReel(reel); setIsGiftsOpen(true); }, []);
  const handleOpenProfile = useCallback((creatorUsername: string) => { router.push(`/user/${creatorUsername}`); }, [router]);

  // Success Burst Haptic overlay
  const [burstGift, setBurstGift] = useState<{ visible: boolean; icon: string }>({ visible: false, icon: '' });

  const { chats, unreadNotificationsCount } = useChatStore();
  const unreadChatsCount = chats.filter((chat) => (chat.unreadCount || 0) > 0).length;
  const hasUnreadNotifications = unreadNotificationsCount > 0;

 useEffect(() => {
    async function initLocation() {
     const { gpsLatitude } = useFeedStore.getState();
      if (gpsLatitude) return; // already set, skip
      const { getForegroundPermissionsAsync } = await import('expo-location');
      const { status } = await getForegroundPermissionsAsync();
      if (status === 'granted') {
        const gps = await requestGPSLocation(false);
        if (gps) setGPS(gps.latitude, gps.longitude, gps.city);
        else setGPS(22.7196, 75.8577, 'Indore');
      } else {
        setGPS(22.7196, 75.8577, 'Indore');
      }
    }
    initLocation();
    
   // Fetch real reels on mount
    const { fetchFollowingReels } = useFeedStore.getState();
    const { fetchStories } = useStoryStore.getState();
    const { fetchNotifications, fetchChats } = useChatStore.getState();
 const existingReels = useFeedStore.getState().homeFeedReels;
    if (existingReels.length > 0) {
      setIsInitialLoading(false);
    }
    fetchFollowingReels(1, 10).then(() => {
      const currentReels = useFeedStore.getState().homeFeedReels;
      if (currentReels.length < 10) setHasMoreReels(false);
      setIsInitialLoading(false);
    }).catch(() => setIsInitialLoading(false));
    fetchStories();
    fetchNotifications();
    fetchChats();
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
   const { fetchFollowingReels } = useFeedStore.getState();
    const { fetchStories } = useStoryStore.getState();
    
    fetchStories();
    await fetchFollowingReels(1, 10);
    
    setHasMoreReels(true);
    setPage(1);
    
    // Reset active reel and scroll to top
  const newReels = useFeedStore.getState().homeFeedReels;
    if (newReels.length > 0) {
      setActiveReelId(newReels[0].id);
      flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
    
    setRefreshCount(prev => prev + 1);
    setRefreshing(false);
  }, [activeTab]);

  const loadMoreReels = useCallback(async () => {
    if (isLoadingMore || !hasMoreReels || refreshing) return;
    const { fetchExploreReels, fetchFollowingReels } = useFeedStore.getState();
    
    setIsLoadingMore(true);
    const beforeCount = useFeedStore.getState().homeFeedReels.length;
    const nextPage = page + 1;
    
   await fetchFollowingReels(nextPage, 10);
    
   const afterCount = useFeedStore.getState().homeFeedReels.length;
    
    if (afterCount === beforeCount) {
      setHasMoreReels(false); // No new reels added
    } else {
      setPage(nextPage);
    }
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMoreReels, refreshing, activeTab, page]);

  useEffect(() => {
    if (userProfile?.id) {
      const { fetchFollowingIds } = useAuthStore.getState();
      fetchFollowingIds(userProfile.id);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    if (activeTab === 'following') {
      const { fetchFollowingReels } = useFeedStore.getState();
      fetchFollowingReels(1, 10);
    }
  }, [activeTab, followingIds.length]);

const getFilteredReels = () => {
    switch (activeTab) {
      case 'following': return homeFeedReels;
      case 'nearby': return homeFeedReels.filter((r) => r.location?.city === (useFeedStore.getState().gpsCity || 'Indore'));
      case 'trending': return homeFeedReels.filter((r) => r.likesCount > 40000);
      case 'for_you': default: return homeFeedReels;
    }
  };
  const filteredReels = getFilteredReels();

  useEffect(() => {
    if (filteredReels.length > 0) {
      // If the active reel is not in the new filtered list, or if we switched tabs, we should ensure we are at the top
      // We will handle the tab change explicitly
      if (!activeReelId || !filteredReels.find(r => r.id === activeReelId)) {
         setTimeout(() => setActiveReelId(filteredReels[0].id), 0);
      }
    }
  }, [filteredReels]);

  // When activeTab changes, force scroll to top and play the first reel of the new tab
  useEffect(() => {
    if (filteredReels.length > 0) {
      flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
      setTimeout(() => setActiveReelId(filteredReels[0].id), 50);
    }
  }, [activeTab]);

// Handle Initial Target User Navigation
  useEffect(() => {
    if (targetUsername && homeFeedReels.length > 0 && userProfile) {
      const firstReel = homeFeedReels[0];
      if (firstReel.creatorUsername === userProfile.username && activeReelId !== firstReel.id) {
        setTimeout(() => setActiveReelId(firstReel.id), 0);
        flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
    }
  }, [homeFeedReels.length]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].isViewable) {
      setActiveReelId(viewableItems[0].item.id);
    }
  }, []);

  const [viewabilityConfig] = useState(() => ({ 
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 50
  }));

 const handleOpenComments = useCallback((reelId: string) => { setSelectedReelId(reelId); setIsCommentsOpen(true); }, []);
  const handleOpenSend = useCallback((reelId: string) => { setSelectedReelId(reelId); setIsSendOpen(true); }, []);
const renderItem = useCallback(({ item, index, extraData }: { item: Reel; index: number, extraData?: any }) => {
    const currentActiveId = extraData?.activeReelId || activeReelId;
    const currentIsFocused = extraData?.isFocused ?? isFocused;
    const isActive = currentIsFocused && item.id === currentActiveId;

    return (
      <PostItem
        item={item}
        isActive={isActive}
        onOpenComments={handleOpenComments}
        onOpenSend={handleOpenSend}
        windowWidth={extraData?.width || width}
      />
    );
  }, [filteredReels, handleOpenComments, handleOpenSend]);

  const keyExtractor = useCallback((item: Reel) => `${item.id}-${refreshCount}`, [refreshCount]);

  // Removed getItemLayout as FlashList handles it efficiently with estimatedItemSize

  return (
    <View 
      style={{ flex: 1, backgroundColor: '#000000' }} 
      className="relative"
      onLayout={(e) => {
        const measuredHeight = Math.floor(e.nativeEvent.layout.height);
        if (measuredHeight > 0) {
          setListHeight(measuredHeight);
        }
      }}
    >
      
   {/* Top Header — Instagram Style */}
      <Animated.View
        style={{
          opacity: headerOpacity,
          position: 'absolute', left: 0, right: 0, zIndex: 50,
          paddingTop: insets.top > 0 ? insets.top + 6 : 28,
          paddingBottom: 10,
          paddingHorizontal: 16,
          backgroundColor: '#12081E',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.05)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: + Create */}
        <Pressable onPress={() => router.push('/(create)/post-editor')} className="active:scale-95">
          <Plus size={28} color="#FFFFFF" strokeWidth={2} />
        </Pressable>

      {/* Center: Logo */}
        <Image
          source={require('../../../assets/images/Untitled design.png')}
          style={{ height: 44, width: 44, resizeMode: 'contain', marginLeft: 32}}
        />
        {/* Right: Bell + DM */}
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.push('/notifications')} className="active:scale-95">
            <Bell size={24} color="#FFFFFF" strokeWidth={2} />
            {hasUnreadNotifications && (
              <View className="absolute top-0 right-0 w-2 h-2 bg-[#D946EF] rounded-full border border-[#12081E]" />
            )}
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/inbox')} className="active:scale-95">
            <MessageSquare size={24} color="#FFFFFF" strokeWidth={2} />
            {unreadChatsCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-[#D946EF] rounded-full px-[4px] py-[1px] border border-[#12081E]">
                <Text className="text-white text-[8px] font-bold">{unreadChatsCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </Animated.View>

      {/* Vertical Reels List */}
{isInitialLoading ? (
        <Animated.View style={{ flex: 1, backgroundColor: '#12081E', opacity: shimmerOpacity, paddingTop: insets.top > 0 ? insets.top + 60 : 80 }}>
          {/* Stories Bar Skeleton */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, gap: 16 }}>
            {[0, 1, 2, 3].map((s) => (
              <View key={`story-${s}`} style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#2A1A42' }} />
                <View style={{ width: 40, height: 8, borderRadius: 4, backgroundColor: '#2A1A42' }} />
              </View>
            ))}
          </View>
          {[0, 1].map((i) => (
            <View key={i} style={{ marginBottom: 16, backgroundColor: '#12081E' }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A1A42' }} />
                <View style={{ marginLeft: 12 }}>
                  <View style={{ width: 100, height: 11, borderRadius: 6, backgroundColor: '#2A1A42', marginBottom: 5 }} />
                  <View style={{ width: 60, height: 9, borderRadius: 6, backgroundColor: '#2A1A42' }} />
                </View>
              </View>
              {/* Image */}
              <View style={{ width, height: width * 1.25, backgroundColor: '#2A1A42' }} />
              {/* Action bar */}
              <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 20 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#2A1A42' }} />
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#2A1A42' }} />
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#2A1A42' }} />
              </View>
              {/* Likes */}
              <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                <View style={{ width: 80, height: 11, borderRadius: 6, backgroundColor: '#2A1A42' }} />
              </View>
              {/* Caption */}
              <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                <View style={{ width: 200, height: 11, borderRadius: 6, backgroundColor: '#2A1A42', marginBottom: 6 }} />
                <View style={{ width: 140, height: 11, borderRadius: 6, backgroundColor: '#2A1A42' }} />
              </View>
            </View>
          ))}
        </Animated.View>
      ) : filteredReels.length === 0 ? (
<ScrollView
          contentContainerStyle={{ flexGrow: 1, backgroundColor: '#12081E' }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" colors={['#A855F7']} progressViewOffset={insets.top + 60} />
          }
        >
          {/* Stories Bar */}
          <StoriesBar />

    {/* Empty State */}
          <View className="flex-1 items-center justify-center px-8 bg-[#12081E]" style={{ minHeight: height * 0.75 }}>
            {/* User Story Icon */}
            <View className="items-center mb-8">
              <View className="w-20 h-20 rounded-full border-2 border-[#8B5CF6] p-0.5 mb-2">
                {userProfile?.avatar ? (
                  <Image
                    source={{ uri: userProfile.avatar }}
                    style={{ width: '100%', height: '100%', borderRadius: 999 }}
                  />
                ) : (
                  <View className="w-full h-full rounded-full bg-[#3B1F6A] items-center justify-center">
                    <Text className="text-white font-bold text-2xl">
                      {userProfile?.name?.[0]?.toUpperCase() || userProfile?.username?.[0]?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-white/60 text-xs">{userProfile?.name || userProfile?.username || 'You'}</Text>
            </View>

            <Text className="text-white/50 text-sm font-medium text-center mb-6">
              Start following people to see their content.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/discover')}
              className="bg-[#8B5CF6] px-8 py-3 rounded-full active:opacity-80"
            >
              <Text className="text-white font-bold text-sm">Discover</Text>
            </Pressable>
          </View>
        </ScrollView>
    ) : (
        <FlashList
          ref={flashListRef}
          data={filteredReels}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          pagingEnabled={false}
          showsVerticalScrollIndicator={false}
          bounces={true}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          // @ts-ignore
          estimatedItemSize={width * 1.5}
          // @ts-ignore
          extraData={{ activeReelId, isFocused, listHeight, width }}
          onEndReached={loadMoreReels}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={StoriesBar}
          contentContainerStyle={{ backgroundColor: '#12081E', paddingTop: insets.top > 0 ? insets.top + 60 : 80, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#A855F7"
              colors={['#A855F7']}
              progressViewOffset={100} // Push it below the top tabs
            />
          }
        />
      )}

    {/* Sheets & Overlays */}
      <CommentsSheet reelId={selectedReelId} isOpen={isCommentsOpen} onClose={() => setIsCommentsOpen(false)} />
      <SendSheet reelId={selectedReelId} isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} />
      <GiftSheet reel={selectedReel} isOpen={isGiftsOpen} onClose={() => setIsGiftsOpen(false)} onSendSuccess={() => {}} />
    </View>
  );
}
