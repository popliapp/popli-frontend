import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Dimensions, StyleSheet, Animated, Platform, Share, Modal ,ActivityIndicator} from 'react-native';
import { showError, showSuccess } from '../../store/toastStore';
import { Image as ExpoImage } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import { useEventListener } from 'expo';
import { Heart, MessageCircle, Share2, Award, Music, Plus, Send, Check, Eye, VolumeX, Volume2, Users, MapPin, Bookmark, TrendingUp, Trash2, Gift } from 'lucide-react-native';
import { Reel } from '../../types';
import { useFeedStore, useAuthStore, useWalletStore } from '../../store';
import { formatSocialCount, formatRelativeTime, getDefaultAvatar } from '../../utils';
import { useRouter } from 'expo-router';
import { useSystemConfig } from '../../hooks/useSystemConfig';
import { MotiView } from 'moti';
import Svg, { Path, G } from 'react-native-svg';
import AnimatedReanimated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring, withDelay } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '../layout/SafeScreen';

const DoubleTapHeart = React.memo(({ x, y }: { x: number, y: number }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence( 
      withSpring(1.3, { damping: 12, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(500, withTiming(0, { duration: 300 }))
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedReanimated.View style={[{ position: 'absolute', left: x, top: y, zIndex: 99 }, animatedStyle]} pointerEvents="none">
      <Heart size={80} color="#EC4899" fill="#EC4899" />
    </AnimatedReanimated.View>
  );
});

DoubleTapHeart.displayName = 'DoubleTapHeart';

const MemoizedLikeButton = React.memo(({ 
  isLiked, 
  likesCount, 
  onToggle 
}: { 
  isLiked: boolean; 
  likesCount: number; 
  onToggle: () => void; 
}) => {
  return (
    <Pressable onPress={onToggle} className="items-center mb-6">
      <MotiView
        animate={{ scale: isLiked ? [1, 1.3, 1] : 1 }}
        transition={{ type: 'spring', duration: 300 }}
      >
        <Heart 
          size={28} 
          color={isLiked ? '#EC4899' : '#FFFFFF'} 
          fill={isLiked ? '#EC4899' : 'transparent'} 
        />
      </MotiView>
      <Text className="text-white text-xs font-semibold mt-1">
        {formatSocialCount(likesCount)}
      </Text>
    </Pressable>
  );
});

MemoizedLikeButton.displayName = 'MemoizedLikeButton';

interface ReelItemProps {
  item: Reel;
  isActive: boolean;
  onOpenComments: (reelId: string) => void;
  onOpenSend: (reelId: string) => void;
  onOpenGifts: (reel: Reel) => void;
  onOpenProfile: (creatorId: string) => void;
  windowWidth: number;
  windowHeight: number;
  isStandalone?: boolean;
  isAdjacent?: boolean;
}

const ActiveVideoPlayer = ({ url, isMuted, isActive, isHeldPaused, width, height, onLoaded, hasMusicOverlay }: { url: string, isMuted: boolean, isActive: boolean, isHeldPaused: boolean, width: number, height: number, onLoaded: () => void, hasMusicOverlay?: boolean }) => {
  const [initialUrl] = useState(url);
  const player = useVideoPlayer(initialUrl, player => {
    player.loop = true;
    player.muted = isMuted || !!hasMusicOverlay;
    if (isActive && !isHeldPaused) {
      player.play();
    } else {
      player.pause();
    }
  });

  useEffect(() => {
    try {
      player.replace(url);
    } catch (e) {
      console.log('Error replacing video url:', e);
    }
  }, [url, player]);

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') {
      onLoaded();
    }
  });

  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (isPlaying) {
      onLoaded();
    }
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    player.muted = isMuted || !!hasMusicOverlay;
  }, [isMuted, player, hasMusicOverlay]);

  useEffect(() => {
    if (isActive && !isHeldPaused) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, isHeldPaused, player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
};

const ActiveAudioPlayer = ({ url, isMuted, isActive, isHeldPaused }: { url: string, isMuted: boolean, isActive: boolean, isHeldPaused: boolean }) => {
  const audioPlayer = useAudioPlayer(url);
  
  useEffect(() => {
    if (audioPlayer && url) {
      // eslint-disable-next-line react-hooks/immutability
      audioPlayer.loop = true;
       
      audioPlayer.muted = isMuted;
      if (isActive && !isHeldPaused) {
        audioPlayer.play();
      } else {
        audioPlayer.pause();
      }
    }
    
    // Crucial cleanup: stop audio when component unmounts!
    return () => {
      if (audioPlayer) {
        try {
          audioPlayer.pause();
        } catch (e) {
          console.log('Error pausing audio on unmount:', e);
        }
      }
    };
  }, [isActive, isHeldPaused, isMuted, audioPlayer, url]);
  
  return null;
};

export const ReelItem = React.memo(({
  item,
  isActive,
  onOpenComments,
  onOpenSend,
  onOpenGifts,
  onOpenProfile,
  windowWidth: width,
  windowHeight: height,
  isStandalone = false,
  isAdjacent = true
}: ReelItemProps) => {
  const router = useRouter();
const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHeldPaused, setIsHeldPaused] = useState(false);
  const [muteIndicator, setMuteIndicator] = useState<'muted' | 'unmuted' | null>(null);
  
const { toggleLikeReel, toggleSaveReel, registerValidView, deleteReel, isGlobalMuted, toggleGlobalMute } = useFeedStore();
  const { followingIds, toggleFollow, userProfile } = useAuthStore();
  const { config: systemConfig } = useSystemConfig();
  const minWatchDurationMs = systemConfig?.minWatchDurationMs ?? 10000;
  
  const insets = useSafeAreaInsets();
  const baseBottomPadding = isStandalone ? Math.max(insets.bottom, 20) + 12 : TAB_BAR_HEIGHT + insets.bottom + 16;
  const sideBarBottom = baseBottomPadding + 16;
  
  // View tracking
  const [hasRegisteredView, setHasRegisteredView] = useState(false);

  // Reset view tracking when item changes
  useEffect(() => {
    setTimeout(() => {
      setHasRegisteredView(false);
      setIsHeldPaused(false);
    }, 0);
    // Note: Do NOT reset isLoaded here, expo-video handles URL swaps better without it 
    // or else it gets stuck showing a black screen if onLoad misses the event.
  }, [item.id]);

  // Layers Metadata
  const parsedLayersData = React.useMemo(() => {
    if (!item.layersData) return null;
    try {
      return typeof item.layersData === 'string' ? JSON.parse(item.layersData) : item.layersData;
    } catch (e) {
      return null;
    }
  }, [item.layersData]);

  // Heart Burst Double-Tap Animation States
  const [doubleTapHearts, setDoubleTapHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const isOwnReel = item.creatorId === userProfile?.id;
  const safeCreatorUsername = isOwnReel ? userProfile?.username : (item.creator?.username || item.creatorUsername || '');
  const safeCreatorAvatar = isOwnReel ? userProfile?.avatar : (item.creator?.avatar || item.creatorAvatar || '');
  const isVerifiedCreator = isOwnReel ? userProfile?.isVerified : (item.creator?.isVerified || ['rahul_dance_off', 'aria_styles', 'marcus_vlogs', 'vikram_tech', 'elena_fashion'].includes(safeCreatorUsername));

  // Audio setup for native sound respect
  const musicAudioUrl = parsedLayersData?.music?.audioUrl;

  // 10-Second View Tracker (Works even if short videos loop)
  useEffect(() => {
    let viewTimer: ReturnType<typeof setTimeout>;
    
if (isActive && !hasRegisteredView) {
      viewTimer = setTimeout(() => {
        setHasRegisteredView(true);
        registerValidView(item.id, safeCreatorUsername);
      }, minWatchDurationMs);
    }
    return () => {
      if (viewTimer) clearTimeout(viewTimer);
    };
  }, [isActive, hasRegisteredView, item.id, safeCreatorUsername, registerValidView, userProfile.username]);

 const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleTap = useCallback(() => {}, []);

  const isFollowing = followingIds.includes(item.creatorId);
  
  const safeVideoUrl = item.videoUrl || item.mediaUrl || '';
  const isPhotoPost = safeVideoUrl === '' || safeVideoUrl.includes('unsplash.com') || safeVideoUrl.includes('picsum.photos') || safeVideoUrl.match(/\.(jpeg|jpg|gif|png)$/i) != null;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this amazing reel by @${safeCreatorUsername} on Popli! 🚀\n\nhttps://popli.app/reel/${item.id}`,
        title: `Popli Reel from @${safeCreatorUsername}`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const renderDescription = (text: string | undefined | null) => {
    if (!text) return null;
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <Text 
            key={index} 
            className="text-[#D946EF] font-bold"
            onPress={() => router.push(`/hashtag/${part.substring(1)}`)}
          >
            {part}
          </Text>
        );
      }
      // Also highlight @mentions
      if (part.startsWith('@')) {
        return (
          <Text 
            key={index} 
            className="text-[#D946EF] font-bold"
            onPress={() => onOpenProfile(part.substring(1))}
          >
            {part}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const handleUseAudio = () => {
    const audioUrlToUse = musicAudioUrl || safeVideoUrl;
    
   if (!audioUrlToUse || isPhotoPost) {
      showError('This post does not have a usable audio track');
      return;
    }
    router.push({
      pathname: '/audio/[id]',
      params: {
        id: item.id,
        title: item.musicName || `Original Audio`,
        creator: `@${safeCreatorUsername}`,
        url: audioUrlToUse
      }
    });
  };

  return (
    <View style={{ width, height, backgroundColor: '#000000' }} className="relative">
      


      {/* 1. EXPO AV VIDEO PLAYER CELL OR IMAGE CELL */}
    <Pressable 
        onPress={handleTap}
        onLongPress={() => setIsHeldPaused(true)}
        delayLongPress={400}
        onPressOut={() => setIsHeldPaused(false)}
        style={StyleSheet.absoluteFill}
      >
        {isPhotoPost ? (
          <ExpoImage 
            source={{ uri: safeVideoUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <>
            {isAdjacent ? (
              <ActiveVideoPlayer 
                url={safeVideoUrl} 
                isMuted={isGlobalMuted} 
                isActive={isActive} 
                isHeldPaused={isHeldPaused}
                width={width} 
                height={height} 
                hasMusicOverlay={!!musicAudioUrl}
                onLoaded={() => {
                  if (!isLoaded) setTimeout(() => setIsLoaded(true), 0);
                }}
              />
            ) : null}

            {/* Render audio player only if active */}
            {isActive && musicAudioUrl && (
              <ActiveAudioPlayer 
                url={musicAudioUrl} 
                isMuted={isGlobalMuted} 
                isActive={isActive} 
                isHeldPaused={isHeldPaused} 
              />
            )}

            {/* Static high-res placeholder before play or fallback */}
            {(!isLoaded || !isActive) && (
              <ExpoImage
                source={{ uri: item.thumbnailUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                // Removed blur-lg and opacity-80 to make it exactly match the video's first frame, avoiding flicker
              />
            )}
          </>
        )}
      </Pressable>

      {/* Large Visual Indicator for Mute/Unmute */}
      {muteIndicator && (
        <View className="absolute inset-0 flex items-center justify-center z-50" pointerEvents="none">
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 9999, padding: 16, alignItems: 'center', justifyContent: 'center' }}
          >
        {muteIndicator === 'muted' ? (
              <Volume2 color="white" size={32} strokeWidth={2.5} />
            ) : (
              <VolumeX color="white" size={32} strokeWidth={2.5} />
            )}
          </MotiView>
        </View>
      )}

      {/* METADATA LAYERS OVERLAY */}
        {parsedLayersData?.layers && (
          <View style={{ ...StyleSheet.absoluteFill, zIndex: 10 }} pointerEvents="none">
            {/* Draw drawings */}
            <View style={{ ...StyleSheet.absoluteFill, zIndex: 5 }} pointerEvents="none">
              <Svg width="100%" height="100%">
                {parsedLayersData.layers.filter((l: any) => l.type === 'drawing').map((layer: any) => (
                  <G key={layer.id}>
                    {layer.content && Array.isArray(layer.content) && layer.content.map((p: any) => (
                      <Path
                        key={p.id}
                        d={p.path}
                        stroke={p.color}
                        strokeWidth={p.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    ))}
                  </G>
                ))}
              </Svg>
            </View>

            {/* Render Text, Stickers, and Interactives */}
            <View className="absolute inset-0 z-10" pointerEvents="box-none">
              {parsedLayersData.layers.filter((l: any) => l.type !== 'drawing' && l.type !== 'music').map((layer: any) => {
                const transform = [
                  { translateX: layer.x },
                  { translateY: layer.y },
                  { scale: layer.scale },
                  { rotate: `${layer.rotation || 0}rad` }
                ];
                return (
                  <Animated.View key={layer.id} style={{ position: 'absolute', alignSelf: 'center', top: '50%', transform }} pointerEvents={layer.type === 'interactive' ? 'auto' : 'none'}>
                    {layer.type === 'text' && layer.content && typeof layer.content === 'object' && (
                      <View style={{
                        backgroundColor: layer.content.backgroundColor,
                        paddingHorizontal: layer.content.backgroundStyle !== 'none' ? 16 : 0,
                        paddingVertical: layer.content.backgroundStyle !== 'none' ? 8 : 0,
                        borderRadius: 12,
                      }}>
                        <Text style={{
                          color: layer.content.color,
                          fontFamily: layer.content.fontFamily,
                          fontSize: 32,
                          fontWeight: 'bold',
                          textAlign: layer.content.textAlign,
                        }}>
                          {layer.content.text}
                        </Text>
                      </View>
                    )}
                    {layer.type === 'text' && typeof layer.content === 'string' && (
                      <Text className="text-white text-3xl font-bold bg-black/50 px-4 py-2 rounded-xl text-center">
                        {layer.content}
                      </Text>
                    )}
                    {layer.type === 'emoji' && (
                      <Text style={{ fontSize: 60 }}>{layer.content}</Text>
                    )}
                    {layer.type === 'sticker' && layer.content && (
                      <ExpoImage source={{ uri: layer.content }} style={{ width: 128, height: 128 }} contentFit="contain" />
                    )}
                    {layer.type === 'interactive' && layer.content && layer.content.type === 'location' && (
                      <Pressable 
                        onPress={() => console.log('Location pressed')}
                        className={`px-6 py-3 rounded-full flex-row items-center gap-2 ${layer.content.styleVariant === 0 ? 'bg-white' : 'bg-transparent border-2 border-white'}`}
                      >
                        <Text className={`${layer.content.styleVariant === 0 ? 'text-purple-600' : 'text-white'} font-bold text-xl`}>📍 {layer.content.text}</Text>
                      </Pressable>
                    )}
                    {layer.type === 'interactive' && layer.content && layer.content.type === 'mention' && (
                      <Pressable 
                        onPress={() => onOpenProfile(layer.content.text)}
                        className={`px-6 py-3 rounded-lg flex-row items-center gap-2 ${layer.content.styleVariant === 0 ? 'bg-gradient-to-r from-orange-500 to-pink-500' : 'bg-white'}`}
                      >
                        <Text className={`${layer.content.styleVariant === 0 ? 'text-white' : 'text-orange-500'} font-bold text-2xl`}>@{layer.content.text}</Text>
                      </Pressable>
                    )}
                    {layer.type === 'interactive' && layer.content && layer.content.type === 'hashtag' && (
                      <View className={`px-6 py-2 rounded-md ${layer.content.styleVariant === 0 ? 'bg-white' : 'bg-black/50'}`}>
                        <Text className={`${layer.content.styleVariant === 0 ? 'text-black' : 'text-white'} font-bold text-3xl`}>#{layer.content.text}</Text>
                      </View>
                    )}
                    {layer.type === 'interactive' && layer.content && layer.content.type === 'question' && (
                      <View className={`w-72 ${layer.content.styleVariant === 0 ? 'bg-white' : layer.content.styleVariant === 1 ? 'bg-purple-500' : 'bg-black'} rounded-2xl overflow-hidden shadow-2xl`}>
                        <View className="p-6 items-center">
                          <Text className={`${layer.content.styleVariant === 0 ? 'text-black' : 'text-white'} font-bold text-xl text-center`} numberOfLines={3}>
                            {layer.content.text}
                          </Text>
                        </View>
                        <View className="bg-white/20 p-4 items-center">
                          <Text className={`${layer.content.styleVariant === 0 ? 'text-black' : 'text-white'} opacity-50 font-semibold`}>Type something...</Text>
                        </View>
                      </View>
                    )}
                    {layer.type === 'interactive' && layer.content && layer.content.type === 'temperature' && (
                      <View className="bg-transparent border-4 border-white px-6 py-2 rounded-full items-center justify-center">
                        <Text className="text-white font-bold text-3xl">84°F</Text>
                      </View>
                    )}
                    {layer.type === 'interactive' && layer.content && layer.content.type === 'time' && (
                      <View className="bg-transparent border-4 border-white px-6 py-2 rounded-full items-center justify-center">
                        <Text className="text-white font-bold text-3xl">{layer.content.text}</Text>
                      </View>
                    )}
                    {layer.type === 'interactive' && layer.content && layer.content.type === 'poll' && (
                      <View className="w-72 bg-white rounded-2xl overflow-hidden shadow-2xl p-4">
                        <Text className="text-black font-bold text-xl text-center mb-4">{layer.content.text}</Text>
                        <View className="flex-row gap-2">
                          <View className="flex-1 p-3 rounded-xl border bg-gray-50 border-gray-200">
                            <Text className="text-center font-bold text-black">{layer.content.options?.[0] || 'YES'}</Text>
                          </View>
                          <View className="flex-1 p-3 rounded-xl border bg-gray-50 border-gray-200">
                            <Text className="text-center font-bold text-black">{layer.content.options?.[1] || 'NO'}</Text>
                          </View>
                        </View>
                      </View>
                    )}
                    {layer.type === 'interactive' && layer.content && layer.content.type === 'reaction' && (
                      <View className="w-64 bg-white rounded-2xl p-4 shadow-2xl items-center">
                        <Text className="text-black font-bold text-lg text-center mb-2">{layer.content.text}</Text>
                        <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center border border-gray-200 shadow-sm">
                          <Text className="text-4xl">{layer.content.emoji || '😍'}</Text>
                        </View>
                      </View>
                    )}
                    {layer.type === 'interactive' && layer.content && layer.content.type === 'add_yours' && (
                      <View className="w-72 bg-white rounded-2xl overflow-hidden shadow-2xl">
                        <View className="bg-black p-3 items-center flex-row justify-center gap-2">
                          {/* We omit Image here to avoid missing import, use simple Text or Lucide icon if imported, but let's just use Text for 'Camera' icon equivalent or omit it, wait, we can just use text since it's simple */}
                          <Text className="text-white font-bold text-sm tracking-widest">📷 ADD YOURS</Text>
                        </View>
                        <View className="p-5 items-center">
                          <Text className="text-black font-bold text-lg text-center">{layer.content.text}</Text>
                        </View>
                      </View>
                    )}
                  </Animated.View>
                );
              })}
            </View>
          </View>
        )}

      {/* 2. REANIMATED DOUBLE TAP HEART BURST */}
      {doubleTapHearts.map((heart) => (
        <DoubleTapHeart key={heart.id} x={heart.x} y={heart.y} />
      ))}

      {/* 3. FIGMA FIGURATIVE INTERACTION OVERLAYS (Right Sidebar) */}
      <View 
        className="absolute right-4 items-center z-10"
        style={{ bottom: sideBarBottom }}
      >
        {/* Creator Avatar with follow + button */}
        <View className="relative items-center mb-6">
          <Pressable 
            onPress={() => onOpenProfile(safeCreatorUsername)}
            className="w-12 h-12 rounded-full border-2 border-primary-purple overflow-hidden"
          >
            <ExpoImage 
              source={{ 
                uri: safeCreatorAvatar || getDefaultAvatar(safeCreatorUsername)
              }} 
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
            />
          </Pressable>
          
          <Pressable 
            onPress={() => toggleFollow(item.creatorId)}
            className={`absolute -bottom-1.5 w-5 h-5 rounded-full items-center justify-center ${
              isFollowing ? 'bg-neutral-grey' : 'bg-primary-pink'
            }`}
          >
            <Text className="text-white text-xs font-bold -mt-0.5">{isFollowing ? '✓' : '+'}</Text>
          </Pressable>
        </View>

      {/* Mute/Unmute Button */}
        <Pressable onPress={() => {
          toggleGlobalMute();
          const newMutedState = !useFeedStore.getState().isGlobalMuted;
          setMuteIndicator(newMutedState ? 'muted' : 'unmuted');
          setTimeout(() => setMuteIndicator(null), 800);
        }} className="items-center mb-6">
          {isGlobalMuted ? (
            <VolumeX size={28} color="#FFFFFF" />
          ) : (
            <Volume2 size={28} color="#FFFFFF" />
          )}
        </Pressable>

        {/* View Count */}
        <View className="items-center mb-6">
          <Eye size={28} color="#FFFFFF" />
          <Text className="text-white text-xs font-semibold mt-1">
            {formatSocialCount(item.viewsCount ?? 0)}
          </Text>
        </View>

        {/* Like Button */}
        <MemoizedLikeButton 
          isLiked={item.isLiked} 
          likesCount={item.likesCount} 
          onToggle={() => toggleLikeReel(item.id)} 
        />

        {/* Comment Button */}
        <Pressable onPress={() => onOpenComments(item.id)} className="items-center mb-6">
          <MessageCircle size={28} color="#FFFFFF" />
          <Text className="text-white text-xs font-semibold mt-1">
            {formatSocialCount(item.commentsCount)}
          </Text>
        </Pressable>

        {/* Share Button (Native Share) */}
        <Pressable onPress={handleShare} className="items-center mb-6">
          <Share2 size={28} color="#FFFFFF" />
          <Text className="text-white text-xs font-semibold mt-1">Share</Text>
        </Pressable>

        {/* Send Button (In-app Chat Share) */}
        <Pressable onPress={() => onOpenSend(item.id)} className="items-center mb-6">
          <Send size={28} color="#FFFFFF" />
          <Text className="text-white text-xs font-semibold mt-1">Send</Text>
        </Pressable>

        {/* Gift Button - Glowing Gold Figma Element (Only visible if not own reel AND is a VIDEO) */}
        {userProfile?.id !== item.creatorId && !isPhotoPost && (
          <View className="items-center mb-6">
            <Pressable 
              onPress={() => onOpenGifts(item)} 
              className="bg-gradient-to-tr from-yellow-600 via-yellow-400 to-yellow-200 w-12 h-12 rounded-full items-center justify-center shadow-lg shadow-yellow-500/50 active:scale-90"
            >
              <Gift color="#1D1037" size={24} strokeWidth={2.5} />
            </Pressable>
            <Text className="text-yellow-400 text-xs font-bold mt-1 shadow-sm shadow-black">Gift</Text>
          </View>
        )}

        {/* Delete Button - Only visible if it's the user's own reel */}
        {isOwnReel && (
          <View className="items-center">
            <Pressable 
              onPress={() => setIsDeleteModalVisible(true)}
              className="items-center"
            >
              <Trash2 size={26} color="#EF4444" />
              <Text className="text-red-500 text-xs font-semibold mt-1">Delete</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 4. REEL DESCRIPTIONS (Bottom Overlay) */}
      <View 
        className="absolute left-4 right-20 gap-3 z-10"
        style={{ bottom: baseBottomPadding }}
      >
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => onOpenProfile(safeCreatorUsername)}>
            <Text className="text-white font-bold text-base">@{safeCreatorUsername}</Text>
          </Pressable>
            
          {/* Verified badge matching Figma */}
          {isVerifiedCreator && (
            <View className="bg-blue-500 w-[15px] h-[15px] rounded-full items-center justify-center pl-0.5 border border-white/20">
              <Check size={9} color="#FFFFFF" strokeWidth={4.5} />
            </View>
          )}

          {item.createdAt && (
            <Text className="text-white/60 text-xs ml-1 font-medium">
              • {formatRelativeTime(item.createdAt)}
            </Text>
          )}

          {/* Follow Button Next to Username */}
          {!isOwnReel && (
            <Pressable 
              onPress={() => toggleFollow(item.creatorId)}
              className={`border px-2.5 py-0.5 rounded-full ml-1 ${
                isFollowing 
                  ? 'bg-white/20 border-white/20' 
                  : 'bg-transparent border-white/80'
              }`}
            >
              <Text className={`text-[10px] font-bold ${
                isFollowing ? 'text-white/80' : 'text-white'
              }`}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
          )}
        </View>

        <Text className="text-neutral-silver text-sm leading-5 font-normal" numberOfLines={3}>
          {renderDescription(item.description)}
        </Text>

        {/* Music Ticker */}
        <Pressable 
          onPress={handleUseAudio}
          className="flex-row items-center gap-2 pt-1 active:opacity-70"
        >
          <Music size={14} color="#D1D5DB" />
          <View className="overflow-hidden">
            <Text className="text-neutral-silver text-xs font-medium" numberOfLines={1}>
              {item.musicName || 'Original Audio'}
            </Text>
          </View>
        </Pressable>

        {/* Location Ticker */}
        {(item.location || item.city) && (
          <View className="flex-row items-center gap-2 pt-1">
            <MapPin size={14} color="#D1D5DB" />
            <View className="overflow-hidden">
              <Text className="text-neutral-silver text-xs font-medium" numberOfLines={1}>
                {item.location ? (item.location.name || item.location.locationName || item.location.city || item.city) : item.city}
              </Text>
            </View>
          </View>
        )}

        {/* Tagged Users */}
        {item.taggedUsers && item.taggedUsers.length > 0 && (
          <View className="flex-row items-center gap-2 pt-1">
            <Users size={14} color="#D1D5DB" />
            <View className="overflow-hidden">
              <Text className="text-neutral-silver text-xs font-medium" numberOfLines={1}>
                {item.taggedUsers.map((u: any) => `@${u.username}`).join(', ')}
              </Text>
            </View>
          </View>
        )}

        {/* Creator Insights & Earnings */}
        {userProfile?.id === item.creatorId && (
          <View className="flex-row items-center gap-4 pt-3 pb-1">
            <Pressable 
              onPress={() => router.push({ pathname: '/analytics', params: { videoId: item.id } })}
              className="flex-row items-center gap-2"
            >
              <TrendingUp size={14} color="#A855F7" />
              <Text className="text-[#A855F7] text-xs font-bold uppercase tracking-wider">View Insights</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Bottom navigation shade blocker */}
      <View style={{ height: Platform.OS === 'ios' ? 88 : 68 }} className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={isDeleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View className="bg-[#1A1A1A] rounded-3xl w-full max-w-[340px] p-6 border border-white/10 items-center shadow-2xl shadow-black">
            <View className="w-16 h-16 bg-red-500/10 rounded-full items-center justify-center mb-5 border border-red-500/20">
              <Trash2 size={32} color="#EF4444" />
            </View>
            <Text className="text-white text-xl font-bold mb-2 text-center tracking-wide">Delete Reel?</Text>
            <Text className="text-white/60 text-center text-sm mb-8 leading-5">
              Are you sure you want to delete this reel? This action cannot be undone and it will be permanently removed.
            </Text>
            <View className="flex-row gap-3 w-full">
              <Pressable 
                onPress={() => setIsDeleteModalVisible(false)}
                className="flex-1 py-3.5 rounded-2xl border border-white/20 items-center bg-white/5 active:bg-white/10"
              >
                <Text className="text-white font-semibold text-base">Cancel</Text>
              </Pressable>
          <Pressable 
                onPress={async () => {
                  if (isDeleting) return;
                  try {
                    setIsDeleting(true);
                    await deleteReel(item.id);
                    setIsDeleteModalVisible(false);
                    showSuccess('Reel deleted');
                  } catch (error) {
                    showError('Failed to delete reel');
                    setIsDeleteModalVisible(false);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="flex-1 py-3.5 rounded-2xl bg-red-500 items-center shadow-lg shadow-red-500/30 active:bg-red-600"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-base">Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

ReelItem.displayName = 'ReelItem';

