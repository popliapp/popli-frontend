import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, Dimensions, Animated, ActivityIndicator, Modal } from 'react-native';
import { showError } from '../../store/toastStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStoryHighlightStore, useAuthStore } from '../../store';
import { X, Trash2 } from 'lucide-react-native';
import { formatRelativeTime, getDefaultAvatar } from '../../utils';
import { apiClient } from '../../api/client';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width } = Dimensions.get('window');

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

export default function HighlightViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // highlight id
  const router = useRouter();
  const { highlights, deleteHighlight } = useStoryHighlightStore();
  const { userProfile } = useAuthStore();
  
  const [userStories, setUserStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const [progressAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const res = await apiClient.get(`/stories/highlights/view/${id}`);
        setUserStories(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, [id]);

  const handleNext = () => {
    if (currentIndex < userStories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      router.back();
    }
  };

  useEffect(() => {
    if (loading || userStories.length === 0) return;

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
  }, [currentIndex, isPaused, userStories.length, loading]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      progressAnim.setValue(0);
    }
  };

  const handlePress = (e: any) => {
    const x = e.nativeEvent.locationX;
    if (x < width * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  if (userStories.length === 0) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <Text className="text-white">No stories found in this highlight.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 p-2 bg-white/20 rounded">
          <Text className="text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const activeStory = userStories[currentIndex];
  const highlight = highlights.find(h => h.id === id);
  const title = highlight ? highlight.title : 'Highlight';

  return (
    <View className="flex-1 bg-black">
      {/* Progress Bars */}
      <View className="absolute top-12 left-0 right-0 z-50 flex-row px-2 gap-1">
        {userStories.map((_, index) => (
          <View key={index} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <Animated.View 
              className="h-full bg-white"
              style={{
                width: index === currentIndex 
                  ? progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  : index < currentIndex ? '100%' : '0%'
              }}
            />
          </View>
        ))}
      </View>

      {/* Header */}
      <View className="absolute top-16 left-0 right-0 z-50 flex-row items-center justify-between px-4">
        <View className="flex-row items-center gap-3">
          <View className="w-8 h-8 rounded-full border border-white/20 overflow-hidden">
             <Image source={{ uri: highlight?.coverUrl || getDefaultAvatar(userProfile.name) }} className="w-full h-full" />
          </View>
          <View>
            <Text className="text-white font-bold text-sm">{title}</Text>
            <Text className="text-white/80 text-xs">{formatRelativeTime(activeStory.createdAt)}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-4">
          {highlight?.creatorId === userProfile?.id && (
            <Pressable 
              onPress={() => {
                setIsPaused(true);
                setIsDeleteModalVisible(true);
              }}
            >
              <Trash2 size={24} color="#EF4444" />
            </Pressable>
          )}
          <Pressable onPress={() => router.back()}>
            <X size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Main Content Area - Clickable for navigation */}
      <Pressable 
        className="flex-1" 
        onPress={handlePress}
        onLongPress={() => setIsPaused(true)}
        onPressOut={() => setIsPaused(false)}
      >
        {activeStory.mediaType === 'VIDEO' ? (
          <StoryVideo url={activeStory.mediaUrl} isPaused={isPaused} />
        ) : (
          <Image 
            source={{ uri: activeStory.mediaUrl }} 
            className="w-full h-full"
            resizeMode="cover"
            style={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}
          />
        )}
      </Pressable>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={isDeleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsDeleteModalVisible(false);
          setIsPaused(false);
        }}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View className="bg-[#1A1A1A] rounded-3xl w-full max-w-[340px] p-6 border border-white/10 items-center shadow-2xl shadow-black">
            <View className="w-16 h-16 bg-red-500/10 rounded-full items-center justify-center mb-5 border border-red-500/20">
              <Trash2 size={32} color="#EF4444" />
            </View>
            <Text className="text-white text-xl font-bold mb-2 text-center tracking-wide">Delete Highlight?</Text>
            <Text className="text-white/60 text-center text-sm mb-8 leading-5">
              Are you sure you want to delete this highlight? This action cannot be undone and it will be permanently removed.
            </Text>
            <View className="flex-row gap-3 w-full">
              <Pressable 
                onPress={() => {
                  setIsDeleteModalVisible(false);
                  setIsPaused(false);
                }}
                className="flex-1 py-3.5 rounded-2xl border border-white/20 items-center bg-white/5 active:bg-white/10"
              >
                <Text className="text-white font-semibold text-base">Cancel</Text>
              </Pressable>
              <Pressable 
                onPress={async () => {
                  try {
                    await deleteHighlight(id);
                    setIsDeleteModalVisible(false);
                    router.back();
               } catch (error) {
                    showError('Failed to delete highlight');
                    setIsDeleteModalVisible(false);
                    setIsPaused(false);
                  }
                }}
                className="flex-1 py-3.5 rounded-2xl bg-red-500 items-center shadow-lg shadow-red-500/30 active:bg-red-600"
              >
                <Text className="text-white font-bold text-base">Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
