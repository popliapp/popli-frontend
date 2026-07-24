import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, Animated, PanResponder, Dimensions, Modal } from 'react-native';
import { PlayCircle, Edit3, X, PlusCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { height } = Dimensions.get('window');

interface ProfileOptionsSheetProps {
  isVisible: boolean;
  onClose: () => void;
  username: string;
  hasStory?: boolean;
  storyId?: string;
  onDeleteStory?: () => void;
}

export const ProfileOptionsSheet: React.FC<ProfileOptionsSheetProps> = ({ isVisible, onClose, username, hasStory, storyId, onDeleteStory }) => {
  const router = useRouter();
  const [panY] = useState(() => new Animated.Value(height));

  const resetPositionAnim = Animated.timing(panY, {
    toValue: 0,
    duration: 300,
    useNativeDriver: true,
  });

  const closeAnim = Animated.timing(panY, {
    toValue: height,
    duration: 300,
    useNativeDriver: true,
  });

  useEffect(() => {
    if (isVisible) {
      resetPositionAnim.start();
    } else {
      closeAnim.start();
    }
  }, [isVisible]);

  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderMove: Animated.event([null, { dy: panY }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gs) => {
        if (gs.dy > 100 || gs.vy > 1) {
          closeAnim.start(() => onClose());
        } else {
          resetPositionAnim.start();
        }
      },
    })
  );

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="absolute inset-0" onPress={() => closeAnim.start(() => onClose())} />
        
        <Animated.View
          style={{ transform: [{ translateY: panY }] }}
          {...panResponder.panHandlers}
          className="bg-[#1A0E2C] rounded-t-3xl border-t border-white/10"
        >
          {/* Handle */}
          <View className="w-full items-center pt-4 pb-2">
            <View className="w-12 h-1.5 bg-white/20 rounded-full" />
          </View>

          <View className="px-6 pb-12 pt-2">
            <Text className="text-white font-bold text-xl mb-6 text-center">Profile Options</Text>
            
            <View className="gap-3">
        {hasStory && (
                <>
                  <Pressable 
                    className="flex-row items-center bg-white/5 p-4 rounded-2xl active:bg-white/10"
                    onPress={() => {
                      closeAnim.start(() => {
                        onClose();
                        router.push(`/story-viewer/${username}`);
                      });
                    }}
                  >
                    <View className="w-10 h-10 bg-[#D946EF]/20 rounded-full items-center justify-center mr-4">
                      <PlayCircle size={20} color="#D946EF" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-bold text-base">View Story</Text>
                      <Text className="text-white/50 text-xs">Watch active stories</Text>
                    </View>
                  </Pressable>

                  <Pressable 
                    className="flex-row items-center bg-red-500/10 p-4 rounded-2xl active:bg-red-500/20"
                    onPress={() => {
                      closeAnim.start(() => {
                        onClose();
                        onDeleteStory?.();
                      });
                    }}
                  >
                    <View className="w-10 h-10 bg-red-500/20 rounded-full items-center justify-center mr-4">
                      <X size={20} color="#EF4444" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-red-400 font-bold text-base">Delete Story</Text>
                      <Text className="text-white/50 text-xs">Remove your active story</Text>
                    </View>
                  </Pressable>
                </>
              )}
              <Pressable 
                className="flex-row items-center bg-white/5 p-4 rounded-2xl active:bg-white/10"
                onPress={() => {
                  closeAnim.start(() => {
                    onClose();
                    router.push({ pathname: '/(tabs)/create', params: { mode: 'STORY' } });
                  });
                }}
              >
                <View className="w-10 h-10 bg-[#D946EF]/20 rounded-full items-center justify-center mr-4">
                  <PlusCircle size={20} color="#D946EF" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-base">Add Story</Text>
                  <Text className="text-white/50 text-xs">Create a new story</Text>
                </View>
              </Pressable>

              <Pressable 
                className="flex-row items-center bg-white/5 p-4 rounded-2xl active:bg-white/10"
                onPress={() => {
                  closeAnim.start(() => {
                    onClose();
                    router.push('/edit-profile');
                  });
                }}
              >
                <View className="w-10 h-10 bg-[#10B981]/20 rounded-full items-center justify-center mr-4">
                  <Edit3 size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-base">Edit Profile</Text>
                  <Text className="text-white/50 text-xs">Update your personal details</Text>
                </View>
              </Pressable>

              <Pressable 
                className="flex-row items-center bg-white/5 p-4 rounded-2xl mt-2 active:bg-white/10"
                onPress={() => closeAnim.start(() => onClose())}
              >
                <View className="w-10 h-10 bg-white/10 rounded-full items-center justify-center mr-4">
                  <X size={20} color="#FFFFFF" />
                </View>
                <Text className="text-white font-bold text-base">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
