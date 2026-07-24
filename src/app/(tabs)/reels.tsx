import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, Dimensions, ViewToken, StyleSheet, useWindowDimensions, ScrollView, RefreshControl, Platform, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Bell, MessageSquare, Send, Search } from 'lucide-react-native';
import { ReelItem } from '../../components/feed/ReelItem';
import { CommentsSheet } from '../../components/sheets/CommentsSheet';
import { GiftSheet } from '../../components/sheets/GiftSheet';
import { SendSheet } from '../../components/sheets/SendSheet';
import { useFeedStore, useAuthStore, useStoryStore, useChatStore } from '../../store';
import { requestGPSLocation } from '../../services/geoService'; 
import { Reel } from '../../types';
import { MotiView } from 'moti';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';

type TopTabType = 'for_you' | 'following' | 'nearby' | 'trending';

export default function ReelsScreen() { 
 const router = useRouter();
  const { targetUsername, startReelId } = useLocalSearchParams<{ targetUsername?: string; startReelId?: string }>();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
 const { reels, homeFeedReels = [], setGPS } = useFeedStore();
  const { userProfile, followingIds } = useAuthStore();
  const { stories } = useStoryStore();
  
  const [activeTab, setActiveTab] = useState<TopTabType>('for_you');
  const [activeReelId, setActiveReelId] = useState<string>('');
  const [isFocused, setIsFocused] = useState(true);
  const [listHeight, setListHeight] = useState(height);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreReels, setHasMoreReels] = useState(true);
  const flashListRef = useRef<any>(null);
  
const [refreshCount, setRefreshCount] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const spinAnim = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isInitialLoading) return;
    const spin = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true })
    );
    spin.start();
    return () => spin.stop();
  }, [isInitialLoading]);
  const spinInterpolate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

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
    const { fetchExploreReels } = useFeedStore.getState();
    const { fetchStories } = useStoryStore.getState();
    const { fetchNotifications, fetchChats } = useChatStore.getState();
    
   const existingReels = useFeedStore.getState().reels;
    if (existingReels.length > 0) {
      setIsInitialLoading(false);
    }
    fetchExploreReels(1, 10, 'all').then(() => {
      const currentReels = useFeedStore.getState().reels;
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
    const { fetchExploreReels, fetchFollowingReels } = useFeedStore.getState();
    const { fetchStories } = useStoryStore.getState();
    
    // Fetch stories and page 1 of reels to reset the feed
    fetchStories();

    if (activeTab === 'following') {
      await fetchFollowingReels(1, 10);
    } else {
      await fetchExploreReels(1, 10, 'all');
    }
    
    setHasMoreReels(true);
    setPage(1);
    
    // Reset active reel and scroll to top
    const newReels = useFeedStore.getState().reels;
    if (newReels.length > 0) {
      setActiveReelId(newReels[0].id);
      flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
    
    setRefreshCount(prev => prev + 1);
    setRefreshing(false);
  }, [activeTab]);

const [extraReels, setExtraReels] = useState<Reel[]>([]);

  const loadMoreReels = useCallback(async () => {
    if (isLoadingMore || refreshing) return;
    const { fetchExploreReels, fetchFollowingReels } = useFeedStore.getState();

    setIsLoadingMore(true);
    const beforeCount = useFeedStore.getState().reels.length;
    const nextPage = page + 1;

    if (activeTab === 'following') {
      await fetchFollowingReels(nextPage, 10);
    } else {
      await fetchExploreReels(nextPage, 10, 'all');
    }

    const afterCount = useFeedStore.getState().reels.length;

    if (afterCount === beforeCount) {
      // No new reels from backend — reshuffle existing and append
      const currentReels = useFeedStore.getState().reels.filter(
        r => r.mediaType === 'VIDEO' || r.videoUrl?.match(/\.(mp4|mov)$/i)
      );
     const shuffled = [...currentReels]
        .sort(() => Math.random() - 0.5)
        .map(r => ({ ...r, id: `${r.id}_x${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }));
      setExtraReels(prev => [...prev, ...shuffled]);
    } else {
      setPage(nextPage);
    }
    setIsLoadingMore(false);
  }, [isLoadingMore, refreshing, activeTab, page]);

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
    } else if (activeTab === 'for_you') {
      const { fetchExploreReels } = useFeedStore.getState();
      fetchExploreReels(1, 10, 'all');
    }
  }, [activeTab, followingIds.length]);

 const getFilteredReels = () => {
    const videoFilter = (r: Reel) => r.mediaType === 'VIDEO' || !!(r.videoUrl?.match(/\.(mp4|mov)$/i));
    let baseReels = [...reels.filter(videoFilter), ...extraReels.filter(videoFilter)];

    // Prepend tapped reel from Home feed if not already in explore feed
    if (startReelId && !baseReels.find(r => r.id === startReelId)) {
      const tappedReel = homeFeedReels.find(r => r.id === startReelId);
      if (tappedReel) baseReels = [tappedReel, ...baseReels];
    }

    switch (activeTab) {
      case 'following': return baseReels.filter((r) => followingIds.includes(r.creatorId));
      case 'nearby': return baseReels.filter((r) => r.location?.city === (useFeedStore.getState().gpsCity || 'Indore'));
      case 'trending': return baseReels.filter((r) => r.likesCount > 40000);
      case 'for_you': default: return baseReels;
    }
  };

const filteredReels = getFilteredReels();

  // Scroll to startReelId when coming from Home feed tap
  useEffect(() => {
    if (!startReelId || filteredReels.length === 0) return;
    const idx = filteredReels.findIndex(r => r.id === startReelId);
    if (idx >= 0) {
      setActiveReelId(startReelId);
      setTimeout(() => {
        flashListRef.current?.scrollToIndex({ index: idx, animated: false });
      }, 150);
    }
  }, [startReelId, filteredReels.length]);

 useEffect(() => {
    if (filteredReels.length > 0) {
      if (!activeReelId || !filteredReels.find(r => r.id === activeReelId)) {
         setTimeout(() => setActiveReelId(filteredReels[0].id), 0);
      }
    }
  }, [filteredReels.length, activeReelId]);

  // When activeTab changes, force scroll to top and play the first reel of the new tab
  useEffect(() => {
    if (filteredReels.length > 0) {
      flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
      setTimeout(() => setActiveReelId(filteredReels[0].id), 50);
    }
  }, [activeTab]);

  // Handle Initial Target User Navigation
  useEffect(() => {
    if (targetUsername && reels.length > 0 && userProfile) {
      const firstReel = reels[0];
      if (firstReel.creatorUsername === userProfile.username && activeReelId !== firstReel.id) {
        setTimeout(() => setActiveReelId(firstReel.id), 0);
        flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
    }
  }, [reels.length]);

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
  const handleOpenGifts = useCallback((reel: Reel) => { setSelectedReel(reel); setIsGiftsOpen(true); }, []);
  const handleOpenProfile = useCallback((creatorUsername: string) => { router.push(`/user/${creatorUsername}`); }, [router]);

  const handleGiftSendSuccess = (icon: string) => {
    setBurstGift({ visible: true, icon });
    setTimeout(() => setBurstGift({ visible: false, icon: '' }), 1500);
  };

  const renderItem = useCallback(({ item, index, extraData }: { item: Reel; index: number, extraData?: any }) => {
    // CRITICAL FIX: FlashList requires using extraData instead of closure variables to trigger re-renders!
    const currentActiveId = extraData?.activeReelId || activeReelId;
    const currentIsFocused = extraData?.isFocused ?? isFocused;
    
    const activeIndex = filteredReels.findIndex(r => r.id === currentActiveId);
    // Keep ONLY current and next video loaded to prevent OOM
    const isAdjacent = currentIsFocused && (index === activeIndex || index === activeIndex + 1);

    return (
      <ReelItem
        item={item}
        isActive={currentIsFocused && item.id === currentActiveId}
        isAdjacent={isAdjacent}
        onOpenComments={handleOpenComments}
        onOpenSend={handleOpenSend}
        onOpenGifts={handleOpenGifts}
        onOpenProfile={handleOpenProfile}
        windowWidth={extraData?.width || width}
        windowHeight={extraData?.listHeight || listHeight}
      />
    );
  }, [filteredReels, handleOpenComments, handleOpenSend, handleOpenGifts, handleOpenProfile]);

const keyExtractor = useCallback((item: Reel, index: number) => `${item.id}-${index}-${refreshCount}`, [refreshCount]);

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
      
      {/* Top Segmented Tabs Overlay & Notification Bell */}
      <View 
        className="absolute left-0 right-0 z-50 flex-row justify-between items-center px-3"
        style={{ top: insets.top > 0 ? insets.top + 10 : 30, elevation: 10 }}
        pointerEvents="box-none"
      >
        <View className="flex-1 items-start">
          <Pressable onPress={() => router.push('/(tabs)/discover')} className="w-9 sm:w-10 h-9 sm:h-10 bg-black/40 rounded-full items-center justify-center active:scale-95">
            <Search size={20} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>

        <View className="flex-row items-center justify-center gap-5 absolute left-0 right-0 bottom-0 top-0" pointerEvents="box-none">
          <Pressable onPress={() => setActiveTab('following')} className="items-center justify-center h-full px-2" hitSlop={10}>
            <Text className={`text-[17px] font-bold text-shadow-md shadow-black ${activeTab === 'following' ? 'text-white' : 'text-white/60'}`}>
              Following
            </Text>
            {activeTab === 'following' && <View className="h-[3px] w-6 bg-white rounded-full absolute bottom-1" />}
          </Pressable>
          
          <Pressable onPress={() => setActiveTab('for_you')} className="items-center justify-center h-full px-2" hitSlop={10}>
            <Text className={`text-[17px] font-bold text-shadow-md shadow-black ${activeTab === 'for_you' ? 'text-white' : 'text-white/60'}`}>
              For You
            </Text>
            {activeTab === 'for_you' && <View className="h-[3px] w-6 bg-white rounded-full absolute bottom-1" />}
          </Pressable>
        </View>

        <View className="flex-1 flex-row items-center justify-end gap-1.5 sm:gap-2">
          <Pressable onPress={() => router.push('/notifications')} className="w-9 sm:w-10 h-9 sm:h-10 items-center justify-center active:scale-95">
            <Bell size={22} color="#FFFFFF" strokeWidth={2.5} />
            {hasUnreadNotifications && (
              <View className="absolute top-[6px] right-[6px] w-2.5 h-2.5 bg-[#D946EF] rounded-full border border-black" />
            )}
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/inbox')} className="w-9 sm:w-10 h-9 sm:h-10 bg-black/40 rounded-full items-center justify-center active:scale-95">
            <MessageSquare size={20} color="#FFFFFF" strokeWidth={2.5} className="mr-0.5 mt-0.5" />
            {unreadChatsCount > 0 && (
              <View className="absolute top-0 right-0 bg-[#D946EF] rounded-full px-[5px] py-[1px] border-[1.5px] border-black">
                <Text className="text-white text-[8px] font-bold">{unreadChatsCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Vertical Reels List */}
     {isInitialLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D0D1F' }}>
          <Animated.View style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 24, 
            borderWidth: 3, 
            borderColor: '#A855F7', 
            borderTopColor: 'transparent', 
            transform: [{ rotate: spinInterpolate }] 
          }} />
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 16, fontWeight: '500' }}>
            Loading reels...
          </Text>
        </View>
      ) : filteredReels.length === 0 ? (
        <View className="flex-1 items-center justify-center bg-background-plum">
          <Text className="text-white/60 text-sm font-semibold">No reels available in this tab yet.</Text>
        </View>
      ) : (
        <FlashList
          ref={flashListRef}
          data={filteredReels}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          pagingEnabled={true}
          showsVerticalScrollIndicator={false}
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          // @ts-ignore
          estimatedItemSize={listHeight || 800}
          // @ts-ignore
          extraData={{ activeReelId, isFocused, listHeight, width }}
          onEndReached={loadMoreReels}
         onEndReachedThreshold={2}
          contentContainerStyle={{ backgroundColor: '#000' }}
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
      <GiftSheet reel={selectedReel} isOpen={isGiftsOpen} onClose={() => setIsGiftsOpen(false)} onSendSuccess={handleGiftSendSuccess} />

      {burstGift.visible && (
        <View style={StyleSheet.absoluteFill} className="items-center justify-center bg-black/70 z-50" pointerEvents="none">
          {/* Glowing Aura Behind */}
          <MotiView
            from={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [1, 2.5], opacity: [0.8, 0] }}
            transition={{ type: 'timing', duration: 1500, loop: true }}
            style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(217, 70, 239, 0.4)' }}
          />

          {/* Floating Confetti Elements */}
          {[
            { x: -100, y: -150, d: 0, s: '✨' },
            { x: 120, y: -200, d: 100, s: '🎉' },
            { x: -150, y: 50, d: 200, s: '💫' },
            { x: 140, y: 80, d: 300, s: '💖' },
            { x: 0, y: -250, d: 400, s: '🎊' }
          ].map((confetti, i) => (
            <MotiView
              key={i}
              from={{ translateY: 0, translateX: 0, opacity: 1, scale: 0 }}
              animate={{ 
                translateY: confetti.y, 
                translateX: confetti.x, 
                opacity: 0, 
                scale: 1.5,
                rotate: `${confetti.x}deg` 
              }}
              transition={{ type: 'timing', duration: 1200, delay: confetti.d }}
              style={{ position: 'absolute' }}
            >
              <Text style={{ fontSize: 28 }}>{confetti.s}</Text>
            </MotiView>
          ))}

          {/* Main Animated Icon & Text */}
          <MotiView
            from={{ scale: 0.1, opacity: 0, rotate: '-20deg', translateY: 50 }}
            animate={{ scale: [1.2, 2.2, 1.8], opacity: 1, rotate: '0deg', translateY: 0 }}
            transition={{ type: 'spring', damping: 6, stiffness: 120 }}
            style={{ alignItems: 'center' }}
          >
            <Text style={{ fontSize: 130, textShadowColor: 'rgba(255,255,255,0.4)', textShadowRadius: 30 }}>
              {burstGift.icon}
            </Text>
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', delay: 300, duration: 400 }}
              style={{ alignItems: 'center' }}
            >
              <Text className="text-yellow-400 font-black text-4xl mt-6 uppercase tracking-widest text-shadow shadow-black">
                GIFT SENT!
              </Text>
              <Text className="text-white font-bold text-sm tracking-widest mt-2 opacity-80">
                AWESOME VIBES 🚀
              </Text>
            </MotiView>
          </MotiView>
        </View>
      )}

    </View>
  );
}
