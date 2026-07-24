import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, ActivityIndicator, Dimensions, StyleSheet, Text, ViewToken } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
// eslint-disable-next-line import/namespace
import { ReelItem } from '../../components/feed/ReelItem';
import { CommentsSheet } from '../../components/sheets/CommentsSheet';
import { GiftSheet } from '../../components/sheets/GiftSheet';
import { SendSheet } from '../../components/sheets/SendSheet';
import { apiClient } from '../../api/client';
import { useFeedStore, useHashtagStore } from '../../store';
import { Reel } from '../../types';
import { MotiView } from 'moti';

const { height, width } = Dimensions.get('window');

export default function ReelViewerScreen() {
 const { id, commentId, source, hashtagName, profileUsername, shuffledIds } = useLocalSearchParams<{ id: string, commentId?: string, source?: string, hashtagName?: string, profileUsername?: string, shuffledIds?: string }>();
  const router = useRouter();
  
  const { reels: mainReels, profileReels, userReels, likedReels } = useFeedStore();
  const { hashtagReels } = useHashtagStore();
  
  const [swipableReels, setSwipableReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  
  // FlashList State
  const [activeReelId, setActiveReelId] = useState<string>(id as string);
  const flashListRef = useRef<any>(null);

  // Sheet States
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isGiftsOpen, setIsGiftsOpen] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string>('');
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [burstGift, setBurstGift] = useState<{ visible: boolean; icon: string }>({ visible: false, icon: '' });

  useEffect(() => {
    if (commentId && activeReelId) {
      setTimeout(() => setSelectedReelId(activeReelId), 0);
      setTimeout(() => setIsCommentsOpen(true), 0);
    }
  }, [commentId, activeReelId]);

  useEffect(() => {
    let sourceReels = mainReels;
    let hasSource = false;
    
  if (source === 'hashtag' && hashtagName) {
      sourceReels = hashtagReels[hashtagName] || [];
      hasSource = true;
    } else if (source === 'profile' && profileUsername) {
      sourceReels = profileReels[profileUsername] || [];
      hasSource = true;
    } else if (source === 'userReels') {
      sourceReels = userReels;
      hasSource = true;
    } else if (source === 'likedReels') {
      sourceReels = likedReels;
      hasSource = true;
 } else if (source === 'mainReels') {
      if (shuffledIds) {
        const order = JSON.parse(shuffledIds) as string[];
        const reelMap = new Map(mainReels.map(r => [r.id, r]));
        sourceReels = order.map(rid => reelMap.get(rid)).filter(Boolean) as Reel[];
      } else {
        sourceReels = mainReels.filter(r => r.mediaType === 'VIDEO');
      }
      hasSource = true;
    }

   if (hasSource) {
      const tappedItem = sourceReels.find(r => r.id === id);
      const targetType = tappedItem?.mediaType || 'VIDEO';
      const filteredReels = sourceReels.filter(r => r.mediaType === targetType);
      setSwipableReels(filteredReels);
      setLoading(false);
    } else {
      // Fallback: fetch single reel if not in store (e.g. from a deep link)
      const fetchReel = async () => {
        try {
          const res = await apiClient.get(`/reels/${id}`);
          const r = res.data;
          setSwipableReels([{
            id: r.id,
            creatorId: r.creatorId,
            creatorName: r.creator?.name || 'User',
            creatorUsername: r.creator?.username || 'user',
            creatorAvatar: r.creator?.avatar || '',
            creatorIsVerified: r.creator?.isVerified || false,
            videoUrl: r.mediaUrl,
            thumbnailUrl: r.thumbnailUrl || r.mediaUrl,
            description: r.description || '',
            musicName: r.musicName || 'Original Audio',
            likesCount: r.likesCount || 0,
            commentsCount: r.commentsCount || 0,
            sharesCount: r.sharesCount || 0,
            viewsCount: r.viewsCount || 0,
            savesCount: r.savesCount || 0,
            isLiked: false,
            isSaved: false,
            isFollowed: false,
            category: r.category || 'lifestyle',
            isMonetized: r.isMonetized,
            location: { city: r.city || 'Unknown', latitude: r.latitude || 0, longitude: r.longitude || 0 }
          }]);
        } catch (err) {
          console.error('Error fetching reel:', err);
          setSwipableReels([]);
        } finally {
          setLoading(false);
        }
      };
      fetchReel();
    }
  }, [id, mainReels, hashtagReels, userReels, profileReels, likedReels, source, hashtagName, profileUsername]);

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
  const handleOpenGifts = useCallback((r: Reel) => { setSelectedReel(r); setIsGiftsOpen(true); }, []);
  const handleOpenProfile = useCallback((creatorUsername: string) => { router.push(`/user/${creatorUsername}`); }, [router]);

  const handleGiftSendSuccess = (icon: string) => {
    setBurstGift({ visible: true, icon });
    setTimeout(() => setBurstGift({ visible: false, icon: '' }), 1500);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  if (swipableReels.length === 0) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Pressable onPress={() => router.back()} className="absolute top-14 left-4 p-2 z-50 rounded-full bg-black/40">
          <ChevronLeft color="white" size={28} />
        </Pressable>
        <Text className="text-white">Reel not found or has been deleted.</Text>
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: Reel, index: number }) => {
    return (
      <ReelItem
        item={item}
        isActive={item.id === activeReelId}
        onOpenComments={handleOpenComments}
        onOpenSend={handleOpenSend}
        onOpenGifts={handleOpenGifts}
        onOpenProfile={handleOpenProfile}
        windowWidth={width}
        windowHeight={height}
        isStandalone={true}
      />
    );
  };

  const initialIndex = swipableReels.findIndex(r => r.id === id);

  return (
    <View className="flex-1 bg-black">
      <Pressable onPress={() => router.back()} className="absolute top-14 left-4 p-2 z-50 rounded-full bg-black/40 border border-white/10">
        <ChevronLeft color="white" size={28} />
      </Pressable>
      
      <FlashList
        ref={flashListRef}
        data={swipableReels}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        // @ts-ignore
        estimatedItemSize={height}
        initialScrollIndex={initialIndex > 0 ? initialIndex : 0}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        extraData={{ activeReelId }}
        contentContainerStyle={{ backgroundColor: '#000' }}
      />

      {/* Sheets & Overlays */}
      <CommentsSheet reelId={selectedReelId} isOpen={isCommentsOpen} onClose={() => setIsCommentsOpen(false)} highlightedCommentId={commentId} />
      <SendSheet reelId={selectedReelId} isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} />
      <GiftSheet reel={selectedReel} isOpen={isGiftsOpen} onClose={() => setIsGiftsOpen(false)} onSendSuccess={handleGiftSendSuccess} />

      {burstGift.visible && (
        <View style={StyleSheet.absoluteFill} className="items-center justify-center bg-black/40 z-50">
          <MotiView
            from={{ scale: 0.1, opacity: 0 }}
            animate={{ scale: [1, 2.5, 1.8], opacity: 1 }}
            transition={{ type: 'spring', damping: 8 }}
            style={{ alignItems: 'center' }}
          >
            <Text style={{ fontSize: 110 }}>{burstGift.icon}</Text>
            <Text className="text-accent-yellow font-black text-2xl mt-4 uppercase tracking-widest text-shadow shadow-black/80">
              Gift Sent! 🎉
            </Text>
          </MotiView>
        </View>
      )}
    </View>
  );
}
