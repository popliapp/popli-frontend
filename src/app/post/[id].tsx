import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, ActivityIndicator, Dimensions, Text, ViewToken } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { PostItem } from '../../components/feed/PostItem';
import { CommentsSheet } from '../../components/sheets/CommentsSheet';
import { SendSheet } from '../../components/sheets/SendSheet';
import { apiClient } from '../../api/client';
import { useFeedStore, useHashtagStore } from '../../store';
import { Reel } from '../../types';
import { SafeScreen } from '../../components/layout/SafeScreen';

const { width } = Dimensions.get('window');

export default function PostViewerScreen() {
  const { id, commentId, source, hashtagName, profileUsername } = useLocalSearchParams<{ id: string, commentId?: string, source?: string, hashtagName?: string, profileUsername?: string }>();
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
  const [selectedReelId, setSelectedReelId] = useState<string>('');

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
    }

       if (hasSource) {
      const tappedItem = sourceReels.find(r => r.id === id);
      const targetType = tappedItem?.mediaType || 'PHOTO';
      const filteredReels = sourceReels.filter(r => r.mediaType === targetType);
      setSwipableReels(filteredReels);
      setLoading(false);
    } else {
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
          console.error('Error fetching post:', err);
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
        <Text className="text-white">Post not found or has been deleted.</Text>
      </View>
    );
  }

  const renderItem = ({ item, index, extraData }: { item: Reel, index: number, extraData?: any }) => {
    return (
      <PostItem
        item={item}
        isActive={item.id === (extraData?.activeReelId || activeReelId)}
        onOpenComments={handleOpenComments}
        onOpenSend={handleOpenSend}
        windowWidth={width}
      />
    );
  };

  const initialIndex = swipableReels.findIndex(r => r.id === id);

  return (
    <SafeScreen className="flex-1 bg-black">
      <View className="pb-4 px-4 bg-black flex-row items-center border-b border-white/10 z-10">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft color="white" size={28} />
        </Pressable>
        <Text className="text-white font-bold text-lg ml-2">Posts</Text>
      </View>
      
      <FlashList
        ref={flashListRef}
        data={swipableReels}
        renderItem={renderItem}
        keyExtractor={(item: Reel) => item.id}
        showsVerticalScrollIndicator={false}
        {...({ estimatedItemSize: 600 } as any)}
        initialScrollIndex={initialIndex > 0 ? initialIndex : 0}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        extraData={{ activeReelId }}
        contentContainerStyle={{ backgroundColor: '#000', paddingBottom: 100 }}
      />

      {/* Sheets & Overlays */}
      <CommentsSheet reelId={selectedReelId} isOpen={isCommentsOpen} onClose={() => setIsCommentsOpen(false)} highlightedCommentId={commentId} />
      <SendSheet reelId={selectedReelId} isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} />
    </SafeScreen>
  );
}
