import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, Text, Pressable, Dimensions, Animated, Modal, TouchableOpacity } from 'react-native';
import { showSuccess, showError, showInfo } from '../../store/toastStore';
import { ConfirmSheet } from '../ConfirmSheet';
import { Image as ExpoImage } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Heart, MessageCircle, Share2, MoreHorizontal, Flag, Link as LinkIcon, X, Trash2, Volume2, VolumeX } from 'lucide-react-native';
import { Reel } from '../../types';
import { formatSocialCount, formatRelativeTime, getDefaultAvatar } from '../../utils';
import { useRouter } from 'expo-router';
import { useFeedStore, useAuthStore } from '../../store';
import * as Clipboard from 'expo-clipboard';

const VideoPlayerComponent = React.memo(({ videoUrl, isActive, isMuted }: { videoUrl: string, isActive: boolean, isMuted: boolean }) => {
  const [initialUrl] = useState(videoUrl);
  const player = useVideoPlayer(initialUrl, player => {
    player.loop = true;
    player.muted = isMuted;
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  });

  useEffect(() => {
    try {
      player.replace(videoUrl);
    } catch (e) {
      console.log('Error replacing post video url:', e);
    }
  }, [videoUrl, player]);

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  return (
    <VideoView 
      player={player}
      style={{ width: '100%', height: '100%' }}
      nativeControls={false}
      contentFit="cover"
    />
  );
});

VideoPlayerComponent.displayName = 'VideoPlayerComponent';

interface PostItemProps {
  item: Reel;
  isActive: boolean;
  onOpenComments: (reelId: string) => void;
  onOpenSend: (reelId: string) => void;
  windowWidth: number;
}

export const PostItem = React.memo(({ item, isActive, onOpenComments, onOpenSend, windowWidth }: PostItemProps) => {
  const router = useRouter();
 const toggleLikeReel = useFeedStore(state => state.toggleLikeReel);
  const deleteReel = useFeedStore(state => state.deleteReel);
  const isGlobalMuted = useFeedStore(state => state.isGlobalMuted);
  const toggleGlobalMute = useFeedStore(state => state.toggleGlobalMute);
  const currentUser = useAuthStore(state => state.userProfile);

  const isOwner = currentUser?.id === item.creatorId;

 const isVideo = item.mediaType === 'VIDEO';

// Use global mute state from store
  const [showBigHeart, setShowBigHeart] = useState(false);
 const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const heartScale = useRef(new Animated.Value(0.5)).current;
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleDoubleTap = useCallback(() => {
    const DOUBLE_PRESS_DELAY = 300;
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;

     // Double tap — only like, never unlike
      if (!item.isLiked) {
        toggleLikeReel(item.id);
      }

      setShowBigHeart(true);
      heartScale.setValue(0.5);
      Animated.spring(heartScale, {
        toValue: 1.2,
        friction: 5,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        Animated.timing(heartScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setShowBigHeart(false));
      }, 800);
    } else {
      tapTimeoutRef.current = setTimeout(() => {
        tapTimeoutRef.current = null;
        if (isVideo) {
          router.push({ pathname: '/(tabs)/reels', params: { startReelId: item.id } } as any);
        }
      }, DOUBLE_PRESS_DELAY);
    }
 }, [item.id, item.isLiked, toggleLikeReel, isVideo, router]);

  const copyLink = async () => {
    // In a real app, you'd use deep links. Assuming web fallback here.
    const url = `http://192.168.1.5:3001/post/${item.id}`;
    await Clipboard.setStringAsync(url);
    setShowOptionsModal(false);
  };

  return (
    <View className="mb-4 bg-[#12081E]">
      {/* Post Header */}
      <View className="flex-row items-center justify-between px-3 py-3">
        <Pressable 
          onPress={() => router.push(`/user/${item.creatorUsername || item.creator?.username || item.creatorId}`)}
          className="flex-row items-center"
        >
          <ExpoImage 
            source={{ uri: item.creatorAvatar || getDefaultAvatar(item.creatorName || item.creatorUsername) }}
            style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#3E2B5C' }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <View className="ml-3">
            <Text className="text-white font-bold text-sm">{item.creatorUsername || item.creatorName}</Text>
            {item.location?.city && (
              <Text className="text-gray-400 text-[10px] mt-0.5">{item.location.city}</Text>
            )}
          </View>
        </Pressable>
        <Pressable 
          className="p-2"
          onPress={() => setShowOptionsModal(true)}
        >
          <MoreHorizontal color="white" size={20} />
        </Pressable>
      </View>

   {/* Post Media (4:5 Aspect Ratio like Insta) */}
      <View style={{ width: windowWidth, height: windowWidth * 1.25, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
         {isVideo ? (
          <>
         <VideoPlayerComponent videoUrl={item.videoUrl || item.thumbnailUrl} isActive={isActive} isMuted={isGlobalMuted} />
            {/* Tap overlay over video */}
            <Pressable
              onPress={handleDoubleTap}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <Pressable
              onPress={toggleGlobalMute}
              style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 6 }}
            >
              {isGlobalMuted ? <VolumeX size={18} color="#fff" /> : <Volume2 size={18} color="#fff" />}
            </Pressable>
          </>
     ) : (
          <>
            <ExpoImage 
              source={{ uri: item.videoUrl || item.thumbnailUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <Pressable
              onPress={handleDoubleTap}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          </>
          )}

       {/* Double Tap Heart Animation */}
          {showBigHeart && (
            <Animated.View style={{ position: 'absolute', transform: [{ scale: heartScale }] }}>
              <Heart size={100} color="white" fill="white" />
            </Animated.View>
          )}
        </View>

      {/* Action Bar */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-5">
          <Pressable onPress={() => toggleLikeReel(item.id)}>
            <Heart size={24} color={item.isLiked ? '#EC4899' : 'white'} fill={item.isLiked ? '#EC4899' : 'transparent'} />
          </Pressable>
          <Pressable onPress={() => onOpenComments(item.id)}>
            <MessageCircle size={24} color="white" />
          </Pressable>
          <Pressable onPress={() => onOpenSend(item.id)}>
            <Share2 size={24} color="white" />
          </Pressable>
        </View>
        <View>
          {/* Bookmark icon could go here */}
        </View>
      </View>

      {/* Likes Count */}
      <View className="px-4 pb-1">
        <Text className="text-white font-bold text-sm">
          {formatSocialCount(item.likesCount)} likes
        </Text>
      </View>

      {/* Caption */}
      {item.description ? (
        <View className="px-4 pb-2">
          <Text className="text-white text-sm">
            <Text className="font-bold">{item.creatorUsername || item.creatorName} </Text>
            {item.description}
          </Text>
        </View>
      ) : null}

      {/* Time */}
      <View className="px-4 pb-3">
        <Text className="text-gray-500 text-[10px] uppercase tracking-wide">
          {formatRelativeTime(item.createdAt || new Date().toISOString())}
        </Text>
      </View>

      {/* OPTIONS MODAL */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/50 justify-end items-center z-50"
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View className="bg-[#1A0E2C] w-full rounded-t-3xl overflow-hidden border-t border-white/5 pb-8" onStartShouldSetResponder={() => true}>
            <View className="items-center pt-3 pb-2">
              <View className="w-12 h-1 bg-white/20 rounded-full" />
            </View>
            <View className="p-5 border-b border-white/5 flex-row items-center justify-between">
              <Text className="text-white font-bold text-lg">Options</Text>
              <Pressable onPress={() => setShowOptionsModal(false)} className="p-1">
                <X size={20} color="#9CA3AF" />
              </Pressable>
            </View>
            
            <View className="p-2">
              <Pressable 
                onPress={copyLink}
                className="flex-row items-center px-4 py-4 active:bg-white/5 rounded-xl"
              >
                <LinkIcon size={20} color="#FFFFFF" />
                <View className="ml-3">
                  <Text className="text-white font-semibold text-base">Copy Link</Text>
                  <Text className="text-neutral-grey text-xs mt-0.5">Share this post</Text>
                </View>
              </Pressable>

 {isOwner ? (
                <Pressable 
                  onPress={() => { setShowOptionsModal(false); setShowDeleteConfirm(true); }}
                  className="flex-row items-center px-4 py-4 active:bg-white/5 rounded-xl"
                >
                  <Trash2 size={20} color="#EF4444" />
                  <View className="ml-3">
                    <Text className="text-[#EF4444] font-semibold text-base">Delete Post</Text>
                    <Text className="text-neutral-grey text-xs mt-0.5">Remove this post permanently</Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable 
                  onPress={() => {
                    setShowOptionsModal(false);
                    setTimeout(() => {
                      showInfo('Post reported. Thank you.');
                    }, 500);
                  }}
                  className="flex-row items-center px-4 py-4 active:bg-white/5 rounded-xl"
                >
                  <Flag size={20} color="#EF4444" />
                  <View className="ml-3">
                    <Text className="text-[#EF4444] font-semibold text-base">Report Post</Text>
                    <Text className="text-neutral-grey text-xs mt-0.5">I&apos;m concerned about this post</Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        </TouchableOpacity>
     </Modal>

      <ConfirmSheet
        isVisible={showDeleteConfirm}
        title="Delete Post?"
        message="Are you sure you want to delete this post? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          try {
            await deleteReel(item.id);
            showSuccess('Post deleted successfully');
          } catch (e) {
            showError('Failed to delete post');
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </View>
  );
});

PostItem.displayName = 'PostItem';
