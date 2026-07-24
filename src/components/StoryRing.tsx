import React, { useState } from 'react';
import { View, Image, Pressable, Text, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useStoryStore, useAuthStore } from '../store';

// Global throttle to prevent rapid double-taps causing multiple screen pushes
let lastNavigationTime = 0;
const NAVIGATION_THROTTLE_MS = 800;

interface StoryRingProps {
  userId: string;
  avatarUrl: string;
  size?: number;
  showName?: boolean;
  name?: string;
  onPress?: () => void;
}

export default function StoryRing({ userId, avatarUrl, size = 64, showName = false, name, onPress: onPressProp }: StoryRingProps) {
  const router = useRouter();
  const { stories } = useStoryStore();
  const { userProfile } = useAuthStore();
  const [showOptions, setShowOptions] = useState(false);

  // Find stories for this user
  const userStories = stories.filter(s => s.creatorId === userId).reverse();
  const hasStory = userStories.length > 0;
  
  // Check if all stories are viewed by the current logged-in user
  const allViewed = hasStory && userStories.every(s => s.viewers.includes(userProfile.username));
  
  // Check if the first unread story is a close friends story
  const firstUnread = userStories.find(s => !s.viewers.includes(userProfile.username));
  const isCloseFriends = firstUnread?.isCloseFriends || (hasStory && userStories[0].isCloseFriends);

const handlePress = () => {
    if (onPressProp) {
      onPressProp();
      return;
    }
    const now = Date.now();
    if (now - lastNavigationTime < NAVIGATION_THROTTLE_MS) return;
    lastNavigationTime = now;

    if (hasStory) {
      router.push(`/story-viewer/${userId}`);
    } else if (userId === userProfile.username) {
      router.push('/(tabs)/create?mode=STORY');
    }
  };

  const handleLongPress = () => {
    if (hasStory) {
      setShowOptions(true);
    }
  };

  const ringPadding = 3;
  const imageSize = size - (ringPadding * 2) - 4; // adjust for border

  const renderRing = () => {
    if (!hasStory) {
      return (
        <View className="relative">
          <Image 
            source={{ uri: avatarUrl }} 
            style={{ width: size, height: size, borderRadius: size / 2 }} 
          />
          {userId === userProfile.username && (
            <View className="absolute bottom-0 right-0 bg-white rounded-full p-0.5 border-2 border-black">
              <View className="bg-primary-pink rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-white text-[10px] font-bold">+</Text>
              </View>
            </View>
          )}
        </View>
      );
    }

    if (allViewed) {
      return (
        <View 
          style={{ width: size, height: size, borderRadius: size / 2 }} 
          className="border-[2.5px] border-neutral-grey items-center justify-center"
        >
          <Image 
            source={{ uri: avatarUrl }} 
            style={{ width: imageSize, height: imageSize, borderRadius: imageSize / 2 }} 
          />
        </View>
      );
    }

    if (isCloseFriends) {
      return (
        <View 
          style={{ width: size, height: size, borderRadius: size / 2 }} 
          className="border-[2.5px] border-[#10B981] items-center justify-center"
        >
          <Image 
            source={{ uri: avatarUrl }} 
            style={{ width: imageSize, height: imageSize, borderRadius: imageSize / 2 }} 
          />
        </View>
      );
    }

    // Default gradient for unread story
    return (
      <LinearGradient
        colors={['#A855F7', '#EC4899', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
          <Image 
            source={{ uri: avatarUrl }} 
            style={{ width: imageSize, height: imageSize, borderRadius: imageSize / 2 }} 
          />
        </View>
      </LinearGradient>
    );
  };

  return (
    <>
      <Pressable 
        onPress={handlePress} 
        onLongPress={handleLongPress}
        className="items-center"
      >
        {renderRing()}
        {showName && name && (
          <Text className="text-white text-[10px] font-medium mt-1 truncate w-16 text-center" numberOfLines={1}>
            {userId === userProfile.username ? 'Your Story' : name}
          </Text>
        )}
      </Pressable>

      {/* Long Press Options Modal */}
      <Modal transparent visible={showOptions} animationType="fade">
        <Pressable 
          onPress={() => setShowOptions(false)}
          className="flex-1 bg-black/60 items-center justify-center px-4"
        >
          <View className="bg-[#1D1037] w-full rounded-2xl overflow-hidden shadow-2xl">
            <Pressable onPress={() => { setShowOptions(false); router.push(`/story-viewer/${userId}`); }} className="p-4 border-b border-white/10">
              <Text className="text-white text-center font-bold text-base">View Story</Text>
            </Pressable>
            <Pressable onPress={() => setShowOptions(false)} className="p-4 border-b border-white/10">
              <Text className="text-white text-center font-bold text-base">Mute Story</Text>
            </Pressable>
            <Pressable onPress={() => setShowOptions(false)} className="p-4 border-b border-white/10">
              <Text className="text-white text-center font-bold text-base">Hide Your Story</Text>
            </Pressable>
            <Pressable onPress={() => setShowOptions(false)} className="p-4">
              <Text className="text-red-500 text-center font-bold text-base">Report</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
