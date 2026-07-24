import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, TextInput, Dimensions, Platform, Animated, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { showError } from '../../store/toastStore';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStoryStore, useAuthStore } from '../../store';
import { apiClient } from '../../api/client';
import { Heart, Send, MoreHorizontal, X, MessageCircle, Trash2, Eye } from 'lucide-react-native';
import Svg, { Path, G } from 'react-native-svg';
import { formatRelativeTime, getDefaultAvatar } from '../../utils';

import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';

const { width, height } = Dimensions.get('window');

const StoryVideo = ({ url, isPaused }: { url: string, isPaused: boolean }) => {
  const [initialUrl] = useState(url);
  const player = useVideoPlayer(initialUrl, p => {
    p.loop = true;
    p.muted = false;
    if (!isPaused) p.play();
    else p.pause();
  });

  useEffect(() => {
    try {
      player.replace(url);
    } catch (e) {}
  }, [url, player]);

  useEffect(() => {
    if (!isPaused) player.play();
    else player.pause();
  }, [isPaused, player]);

  return (
    <VideoView 
      player={player} 
      style={{ width: '100%', height: '100%', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }} 
      contentFit="cover" 
      nativeControls={false} 
    />
  );
};

const MentionTag = React.memo(({ layer, onPress }: { layer: any, onPress: (userId: string) => void }) => {
  return (
    <Pressable 
      onPress={(e) => {
        e.stopPropagation(); // prevent pausing story
        onPress(layer.content.userId);
      }}
      className="bg-gradient-to-r from-[#D946EF] to-[#A855F7] px-4 py-2 rounded-xl shadow-lg shadow-[#D946EF]/30 border border-white/20"
      pointerEvents="auto"
    >
      <Text className="text-white font-bold text-lg">@{layer.content.text}</Text>
    </Pressable>
  );
});
MentionTag.displayName = 'MentionTag';

const StoryAudio = ({ url, isPaused }: { url: string, isPaused: boolean }) => {
  const [initialUrl] = useState(url);
  const player = useAudioPlayer(initialUrl);

  useEffect(() => {
    try {
      player?.replace(url);
    } catch (e) {}
  }, [url, player]);

  useEffect(() => {
    if (!isPaused) player?.play();
    else player?.pause();
  }, [isPaused, player]);
  return null;
};

const PollSticker = ({ layer, onVote }: { layer: any, onVote: (optIndex: number) => void }) => {
  const [voted, setVoted] = useState<number | null>(null);
  
  return (
    <View className="w-72 bg-white rounded-2xl overflow-hidden shadow-2xl p-4">
      <Text className="text-black font-bold text-xl text-center mb-4">{layer.content.text}</Text>
      <View className="flex-row gap-2">
        <Pressable 
          onPress={(e) => { e.stopPropagation(); setVoted(0); onVote(0); }}
          className={`flex-1 p-3 rounded-xl border ${voted === 0 ? 'bg-purple-100 border-purple-500' : 'bg-gray-50 border-gray-200'}`}
        >
          <Text className="text-center font-bold text-black">{layer.content.options?.[0] || 'YES'}</Text>
        </Pressable>
        <Pressable 
          onPress={(e) => { e.stopPropagation(); setVoted(1); onVote(1); }}
          className={`flex-1 p-3 rounded-xl border ${voted === 1 ? 'bg-purple-100 border-purple-500' : 'bg-gray-50 border-gray-200'}`}
        >
          <Text className="text-center font-bold text-black">{layer.content.options?.[1] || 'NO'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const ReactionSticker = ({ layer, onReact }: { layer: any, onReact: () => void }) => {
  return (
    <View className="w-64 bg-white rounded-2xl p-4 shadow-2xl items-center">
      <Text className="text-black font-bold text-lg text-center mb-2">{layer.content.text}</Text>
      <Pressable 
        onPress={(e) => { e.stopPropagation(); onReact(); }}
        className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center border border-gray-200 shadow-sm"
      >
        <Text className="text-4xl">{layer.content.emoji || '😍'}</Text>
      </Pressable>
    </View>
  );
};

const AddYoursSticker = ({ layer, onPress }: { layer: any, onPress: () => void }) => {
  return (
    <Pressable 
      onPress={(e) => { e.stopPropagation(); onPress(); }}
      className="w-72 bg-white rounded-2xl overflow-hidden shadow-2xl"
    >
      <View className="bg-black p-3 items-center flex-row justify-center gap-2">
        <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/685/685655.png'}} style={{width:20, height:20, tintColor:'white'}} />
        <Text className="text-white font-bold text-sm tracking-widest">ADD YOURS</Text>
      </View>
      <View className="p-5 items-center">
        <Text className="text-black font-bold text-lg text-center">{layer.content.text}</Text>
      </View>
    </Pressable>
  );
};

const MusicSticker = ({ layer }: { layer: any }) => {
  return (
    <View className="bg-white/90 backdrop-blur-md rounded-2xl p-3 flex-row items-center gap-3 shadow-xl w-64">
      <Image source={{ uri: layer.content.coverUrl || layer.content.cover }} className="w-12 h-12 rounded-lg bg-gray-200" />
      <View className="flex-1">
        <Text className="text-black font-bold text-sm" numberOfLines={1}>{layer.content.title}</Text>
        <Text className="text-gray-600 text-xs" numberOfLines={1}>{layer.content.artist}</Text>
      </View>
    </View>
  );
};

export default function StoryViewerScreen() {
  const { id: rawId, storyId } = useLocalSearchParams<{ id: string, storyId?: string }>();
  const id = rawId ? decodeURIComponent(rawId) : '';
  const router = useRouter();
  const { stories, markStoryViewed, addReaction, deleteStory, fetchStories, isFetchingStories } = useStoryStore();
  const { userProfile } = useAuthStore();

  const handleMentionPress = async (userId: string) => {
    setIsPaused(true);
    try {
      // Analytics tracking
      apiClient.post('/analytics/track', { event: 'mention_tag_clicked', metadata: { mentionedUserId: userId } }).catch(() => {});
      
     const res = await apiClient.get(`/users/${userId}`);
      if (res.data) {
        apiClient.post('/analytics/track', { event: 'profile_opened_from_story', metadata: { mentionedUserId: userId } }).catch(() => {});
        router.push(`/user/${res.data.username}`);
      } else {
        showError('User no longer available');
        setIsPaused(false);
      }
    } catch (error) {
      showError('User no longer available');
      setIsPaused(false);
    }
  };

const userStories = stories.filter(s => s.creatorId === id || s.creatorUsername === id).reverse();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [initialStoryLoaded, setInitialStoryLoaded] = useState(false);
  const [isFetchingSingleStory, setIsFetchingSingleStory] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    const textToSend = replyText.trim();
    setReplyText('');
    setIsPaused(false);
    
    const currentStory = userStories[currentIndex];
    if (currentStory && currentStory.creatorId) {
      try {
        // creatorId is actually the username in the frontend story object
        const res = await apiClient.get(`/users/creator/${currentStory.creatorId}`);
        if (res.data && res.data.id) {
          // Import useChatStore dynamically to avoid require cycles if any, or just get state
        const { useChatStore } = require('../../store');
          console.log('[STORY-REPLY-MEDIA]', { mediaUrl: currentStory.mediaUrl, storyId: currentStory.id });
          await useChatStore.getState().sendDirectMessage(
            { id: res.data.id }, 
            `[STORY:${currentStory.id}] ${textToSend}`,
            currentStory.mediaUrl || undefined
          );
        }
      } catch (err) {
        console.error("Failed to send story reply:", err);
      }
    }
  };

  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [viewersList, setViewersList] = useState<any[]>([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);
  const [sheetAnim] = useState(() => new Animated.Value(height));

  const [progressAnim] = useState(() => new Animated.Value(0));

  const fetchViewers = async (storyId: string) => {
    setIsLoadingViewers(true);
    try {
      const res = await apiClient.get(`/stories/${storyId}/viewers`);
      setViewersList(res.data);
    } catch (err) {
      console.error('Failed to fetch viewers', err);
    } finally {
      setIsLoadingViewers(false);
    }
  };

  const openViewersSheet = () => {
    setIsPaused(true);
    setShowViewersSheet(true);
    const storyId = userStories[currentIndex]?.id;
    if (storyId) fetchViewers(storyId);
    
    Animated.spring(sheetAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  const closeViewersSheet = () => {
    Animated.spring(sheetAnim, {
      toValue: height,
      useNativeDriver: true,
      bounciness: 0,
    }).start(() => {
      setShowViewersSheet(false);
      setIsPaused(false);
    });
  };

  const handleNext = () => {
    if (currentIndex < userStories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      router.back();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      progressAnim.setValue(0);
    }
  };

  // Initialize with correct story index
  useEffect(() => {
    if (stories.length === 0 && !isFetchingStories) {
      fetchStories();
    }
  }, [stories.length, isFetchingStories]);

  useEffect(() => {
    if (!initialStoryLoaded && !isFetchingStories && stories.length > 0) {
      if (storyId) {
        const idx = userStories.findIndex(s => s.id === storyId);
        if (idx !== -1) {
          setTimeout(() => setCurrentIndex(idx), 0);
        } else {
          // The story is missing (maybe because we don't follow them or it's a direct link)
          // Try fetching it specifically
          setTimeout(() => setIsFetchingSingleStory(true), 0);
          useStoryStore.getState().fetchStoryById(storyId).then((fetchedStory) => {
            if (fetchedStory) {
              // Wait for the store to update, then we can find it
              setTimeout(() => {
                const newIdx = useStoryStore.getState().stories.filter(s => s.creatorId === id).findIndex(s => s.id === storyId);
                if (newIdx !== -1) {
                  setCurrentIndex(newIdx);
                }
                setInitialStoryLoaded(true);
                setIsFetchingSingleStory(false);
              }, 100);
            } else {
              setInitialStoryLoaded(true);
              setIsFetchingSingleStory(false);
            }
          });
        }
      } else {
        setTimeout(() => setInitialStoryLoaded(true), 0);
      }
    }
  }, [initialStoryLoaded, isFetchingStories, stories.length, storyId, userStories]);

  useEffect(() => {
    if (stories.length > 0 && userStories.length === 0 && !isFetchingStories) {
      setTimeout(() => setInitialStoryLoaded(true), 0);
    }
    
    if (userStories.length === 0) return;

    // Mark current story as viewed
    const currentStory = userStories[currentIndex];
    if (currentStory && !currentStory.viewers.includes(userProfile.username) && currentStory.creatorId !== userProfile.username) {
      markStoryViewed(currentStory.id, userProfile.username);
    }

    progressAnim.setValue(0);
    if (!isPaused) {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 5000, // 5 seconds per story
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          handleNext();
        }
      });
    }

    return () => progressAnim.stopAnimation();
  }, [currentIndex, isPaused, userStories.length, handleNext, progressAnim, markStoryViewed, userProfile.username, stories.length, isFetchingStories]);



  const handlePress = (e: any) => {
    const x = e.nativeEvent.locationX;
    if (x < width * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleStickerInteraction = async (layerId: string, type: string, value: string) => {
    try {
      await apiClient.post(`/stories/${activeStory.id}/interact`, { layerId, type, value });
    } catch (error) {
      console.error('Failed to submit interaction:', error);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    const storyId = userStories[currentIndex]?.id;
    if (storyId) {
      setIsDeleting(true);
      setIsPaused(true);
      try {
        await deleteStory(storyId);
        if (userStories.length <= 1) {
          router.back();
        } else {
          setIsPaused(false);
          if (currentIndex >= userStories.length - 1) {
            setCurrentIndex(prev => Math.max(0, prev - 1));
          }
        }
      } catch (error) {
        console.error('Failed to delete story:', error);
        setIsPaused(false);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const activeStory = userStories[currentIndex];
  if (userStories.length === 0 || !activeStory) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        {isFetchingStories || isFetchingSingleStory ? (
          <ActivityIndicator size="large" color="#A855F7" />
        ) : (
          <View className="items-center justify-center p-8">
            <Text className="text-white text-lg font-semibold mb-4 text-center">This story is no longer available or has expired.</Text>
            <Pressable 
              className="bg-[#D946EF] px-6 py-3 rounded-full"
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/');
              }}
            >
              <Text className="text-white font-bold">Go Back</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  let parsedLayersData = activeStory?.layersData;
  if (typeof parsedLayersData === 'string') {
    try { parsedLayersData = JSON.parse(parsedLayersData); } catch (e) {}
  }

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-black">
      <View className="flex-1 relative">
        
        {/* Background Media */}
        {activeStory.mediaType === 'VIDEO' && activeStory.mediaUrl ? (
          <StoryVideo url={activeStory.mediaUrl} isPaused={isPaused} />
        ) : activeStory.mediaUrl ? (
          <Image 
            source={{ uri: activeStory.mediaUrl }} 
            className="w-full h-full rounded-b-xl"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-black rounded-b-xl" />
        )}

        {/* METADATA LAYERS OVERLAY */}
        {parsedLayersData?.layers && (
          <View style={{ ...StyleSheet.absoluteFill, zIndex: 5 }} pointerEvents="none">
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
              {parsedLayersData.layers.filter((l: any) => l.type !== 'drawing').map((layer: any) => {
                const transform = [
                  { translateX: layer.x },
                  { translateY: layer.y },
                  { scale: layer.scale },
                  { rotate: `${layer.rotation}rad` }
                ];

                return (
                  <View 
                    key={layer.id} 
                    style={{
                      position: 'absolute',
                      alignSelf: 'center',
                      top: '50%',
                      transform
                    }}
                    pointerEvents={['interactive', 'music'].includes(layer.type) ? 'box-none' : 'none'}
                  >
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
                      <Text className="text-5xl">{layer.content}</Text>
                    )}
                    {layer.type === 'sticker' && (
                      <Image source={{ uri: layer.content }} className="w-32 h-32" resizeMode="contain" />
                    )}
                    {layer.type === 'music' && (
                      <>
                        <StoryAudio url={layer.content.audioUrl || layer.content.previewUrl} isPaused={isPaused} />
                        <MusicSticker layer={layer} />
                      </>
                    )}
                    {layer.type === 'interactive' && layer.content?.type === 'mention' && (
                      <MentionTag layer={layer} onPress={handleMentionPress} />
                    )}
                    {layer.type === 'interactive' && layer.content?.type === 'location' && (
                      <View className="bg-white/90 px-4 py-2 rounded-xl flex-row items-center gap-1">
                        <Text className="text-black font-bold text-lg">{layer.content.text}</Text>
                      </View>
                    )}
                    {layer.type === 'interactive' && layer.content?.type === 'poll' && (
                      <PollSticker layer={layer} onVote={(idx) => handleStickerInteraction(layer.id, 'POLL_VOTE', idx.toString())} />
                    )}
                    {layer.type === 'interactive' && layer.content?.type === 'reaction' && (
                      <ReactionSticker layer={layer} onReact={() => handleStickerInteraction(layer.id, 'REACTION', layer.content.emoji || '😍')} />
                    )}
                    {layer.type === 'interactive' && layer.content?.type === 'add_yours' && (
                      <AddYoursSticker layer={layer} onPress={() => {}} />
                    )}
                    {layer.type === 'interactive' && layer.content?.type === 'time' && (
                      <View className="bg-black/50 px-4 py-2 rounded-xl flex-row items-center gap-1">
                        <Text className="text-white font-bold text-3xl tracking-widest">{layer.content.text}</Text>
                      </View>
                    )}
                    {layer.type === 'interactive' && layer.content?.type === 'temperature' && (
                      <View className="bg-black/50 px-4 py-2 rounded-xl flex-row items-center gap-1">
                        <Text className="text-white font-bold text-3xl">{layer.content.text}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Tap/Hold Overlays */}
        <Pressable 
          onPress={handlePress}
          onPressIn={() => setIsPaused(true)}
          onPressOut={() => setIsPaused(false)}
          className="absolute inset-0 z-10"
        />

        {/* Top Progress Bars */}
        <View className="absolute top-12 left-0 right-0 px-2 flex-row gap-1 z-20">
          {userStories.map((_, idx) => (
            <View key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <Animated.View 
                style={{
                  width: idx === currentIndex 
                    ? progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                    : idx < currentIndex ? '100%' : '0%',
                  height: '100%',
                  backgroundColor: 'white'
                }} 
              />
            </View>
          ))}
        </View>

        {/* Header Info */}
        <View className="absolute top-16 left-4 right-4 flex-col z-20">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Image 
                source={{ 
                  uri: activeStory.creatorAvatar 
                    ? activeStory.creatorAvatar 
                    : getDefaultAvatar(activeStory.creatorId) 
                }} 
                className="w-8 h-8 rounded-full border border-white/20" 
              />
             <Text className="text-white font-bold text-sm">@{activeStory.creatorUsername || activeStory.creatorId}</Text>
              <Text className="text-white/60 text-xs">{formatRelativeTime(activeStory.createdAt)}</Text>
            </View>
            
            <View className="flex-row gap-4 items-center">
             {(activeStory.creatorId === userProfile.id || activeStory.creatorUsername === userProfile.username) && (
             <Pressable 
                  onPress={() => { setIsPaused(true); setShowDeleteConfirm(true); }} 
                  className="p-2" 
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Trash2 size={24} color="#EF4444" />
                </Pressable>
              )}
              <Pressable onPress={() => router.back()} className="p-2" hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <X size={26} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
          
          {/* Attribution Header */}
          {activeStory.originalOwnerUsername && (
            <Pressable 
              className="mt-2 flex-row items-center bg-black/40 px-2 py-1 rounded-full self-start border border-white/10 backdrop-blur-md"
              onPress={() => {
                if (activeStory.originalStoryId) {
                  router.push(`/story-viewer/${activeStory.originalOwnerUsername}?storyId=${activeStory.originalStoryId}`);
                }
              }}
            >
              <Text className="text-white/80 text-xs font-medium">Originally shared by </Text>
              <Text className="text-white font-bold text-xs">@{activeStory.originalOwnerUsername}</Text>
            </Pressable>
          )}
        </View>

        {/* Reshare Controls for Mentioned Users */}
        {(() => {
          const isMentioned = parsedLayersData?.layers?.some((l: any) => 
            l.type === 'interactive' && l.content?.type === 'mention' && 
            (l.content.userId === userProfile.id || l.content.text === userProfile.username)
          );
          
          if (isMentioned && !activeStory.isCloseFriends) {
            return (
              <View className="absolute bottom-20 left-4 right-4 flex-row justify-between z-30">
                <Pressable 
                  className="bg-white/20 px-4 py-2.5 rounded-full border border-white/30 backdrop-blur-md flex-row items-center flex-1 mr-2 justify-center"
                  onPress={() => {
                    setIsPaused(true);
                    router.push({
                      pathname: '/(create)/story-editor',
                      params: { 
                        uri: activeStory.mediaUrl,
                        type: activeStory.mediaType.toLowerCase(),
                        mode: 'STORY',
                        originalStoryId: activeStory.originalStoryId || activeStory.id,
                        originalOwnerId: activeStory.originalOwnerId || activeStory.creatorId,
                        originalOwnerUsername: activeStory.originalOwnerUsername || activeStory.creatorId, // fallback to creatorId as username
                        returnTo: 'dismiss3'
                      }
                    });
                  }}
                >
                  <Text className="text-white font-bold text-sm">Add to Your Story</Text>
                </Pressable>
                
                <Pressable className="bg-white/20 px-4 py-2.5 rounded-full border border-white/30 backdrop-blur-md flex-row items-center justify-center flex-1 ml-2">
                  <Text className="text-white font-bold text-sm">Share Story</Text>
                </Pressable>
              </View>
            );
          }
          return null;
        })()}

        {/* Bottom Bar: Owner Views or User Reply */}
      {(activeStory.creatorId === userProfile.id || activeStory.creatorUsername === userProfile.username) ? (
          <View className="absolute bottom-4 left-4 z-30">
            <Pressable 
              onPress={openViewersSheet}
              className="flex-row items-center gap-1 bg-black/40 px-3 py-1.5 rounded-full border border-white/10"
              hitSlop={10}
            >
              <Eye size={16} color="#FFFFFF" />
              <Text className="text-white font-semibold text-xs ml-1">
                {activeStory.viewsCount ?? activeStory.viewers?.length ?? 0}
              </Text>
            </Pressable>
          </View>
        ) : activeStory.repliesAllowed ? (
          <View className="absolute bottom-4 left-4 right-4 flex-row items-center gap-3 z-30">
            <View className="flex-1 border border-white/30 rounded-full px-4 py-3 bg-black/20 backdrop-blur-md flex-row items-center">
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Send message"
                placeholderTextColor="rgba(255,255,255,0.6)"
                className="flex-1 text-white text-sm pr-10"
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
                onSubmitEditing={handleReply}
              />
              {replyText.trim().length > 0 && (
                <Pressable 
                  onPress={handleReply} 
                  className="absolute right-2 bg-white w-8 h-8 rounded-full items-center justify-center"
                >
             <Send size={16} color="#000000" />
                </Pressable>
              )}
            </View>
          </View>
        ) : null}

      </View>

      {/* Viewers Bottom Sheet */}
      {showViewersSheet && (
        <Animated.View 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: height * 0.6,
            backgroundColor: '#1E1E1E',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            transform: [{ translateY: sheetAnim }],
            zIndex: 100,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10,
          }}
        >
          {/* Header */}
          <View className="items-center py-3 border-b border-white/10">
            <View className="w-12 h-1.5 bg-white/30 rounded-full mb-3" />
            <Text className="text-white font-bold text-lg">Viewers</Text>
            <View className="absolute right-4 top-4">
              <Pressable onPress={closeViewersSheet} hitSlop={15}>
                <X size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Views Count */}
          <View className="px-4 py-4 flex-row items-center border-b border-white/5">
            <Eye size={20} color="#FFFFFF" />
            <Text className="text-white font-semibold ml-2 text-base">{viewersList.length} Views</Text>
          </View>

          {/* List */}
          {isLoadingViewers ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator color="#FFFFFF" size="large" />
            </View>
          ) : viewersList.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Text className="text-white/60 text-base">No viewers yet</Text>
            </View>
          ) : (
            <ScrollView className="flex-1 px-4">
              {viewersList.map((viewer) => (
                <Pressable 
                  key={viewer.id} 
                  className="flex-row items-center justify-between py-3"
                  onPress={() => {
                    closeViewersSheet();
                    router.push(`/user/${viewer.user.username}`);
                  }}
                >
                  <View className="flex-row items-center gap-3">
                    <Image 
                      source={{ uri: viewer.user.avatar || getDefaultAvatar(viewer.user.username) }}
                      className="w-12 h-12 rounded-full bg-white/10"
                    />
                    <View>
                      <Text className="text-white font-bold text-sm">{viewer.user.username}</Text>
                      <Text className="text-white/60 text-xs">{viewer.user.name}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      )}
 <ConfirmSheet
        isVisible={showDeleteConfirm}
        title="Delete Story?"
        message="Are you sure you want to delete this story? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => { setShowDeleteConfirm(false); handleDelete(); }}
        onCancel={() => { setShowDeleteConfirm(false); setIsPaused(false); }}
      />
    </KeyboardAvoidingView>
  );
}