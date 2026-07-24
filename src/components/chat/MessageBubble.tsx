import React, { useRef } from 'react';
import { View, Text, Image, Pressable, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import { Swipeable, TapGestureHandler } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withSequence, runOnJS } from 'react-native-reanimated';
import { Play, CheckCheck, Reply } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, useChatStore } from '../../store';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function MessageBubble({ msg, onReply, onImagePress, otherUsername }: { msg: any, onReply: (msg: any) => void, onImagePress?: (url: string) => void, otherUsername?: string }) {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { reactToMessage } = useChatStore();
  
  const isSent = msg.type === 'sent';
  const myId = userProfile?.id;
  const reactionsCount = msg.reactions ? Object.keys(msg.reactions).length : 0;
  
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(0);

  const onDoubleTap = () => {
    scale.value = withSequence(withSpring(1.1), withSpring(1));
    heartScale.value = withSequence(withSpring(1), withSpring(0, { duration: 1000 }));
    runOnJS(reactToMessage)(msg.chatId, msg.id, '❤️');
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartScale.value
  }));

  const renderRightActions = (progress: any, dragX: any) => {
    const trans = dragX.interpolate({
      inputRange: [0, 50, 100, 101],
      outputRange: [-20, 0, 0, 1],
    });
    return (
      <View className="justify-center items-center w-12 h-full">
        <RNAnimated.View style={{ transform: [{ translateX: trans }] }}>
          <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
             <Reply size={16} color="#FFFFFF" />
          </View>
        </RNAnimated.View>
      </View>
    );
  };

  const onSwipeableOpen = () => {
    onReply(msg);
    // @ts-ignore
    swipeableRef.current?.close();
  };

  const swipeableRef = useRef(null);

  const getThumbnailUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('cloudinary') && url.endsWith('.mp4')) {
      return url.replace('.mp4', '.jpg');
    }
    return url;
  };

  const renderContent = () => {
    if (msg.isStoryMention) {
      return (
        <Pressable 
          onPress={() => router.push(`/story-viewer/${msg.senderUsername}?storyId=${msg.storyId || ''}`)}
          className="relative rounded-xl overflow-hidden"
          style={{ width: 180, backgroundColor: 'rgba(0,0,0,0.3)' }}
        >
          {msg.mediaUrl ? (
             <Image source={{ uri: getThumbnailUrl(msg.mediaUrl) }} style={{ width: 180, height: 240, opacity: 0.8 }} resizeMode="cover" />
          ) : (
             <View style={{ width: 180, height: 240, backgroundColor: '#2D1B4E', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 40 }}>📱</Text>
             </View>
          )}
          <View className="absolute bottom-0 left-0 right-0 p-3 bg-black/60">
            <Text className="text-white text-xs font-bold text-center" numberOfLines={2}>
              {msg.text || 'Mentioned you in their story'}
            </Text>
          </View>
        </Pressable>
      );
    }

    const isReelShare = msg.isReelShare || (msg.text && msg.text.includes('/reels/'));

    if (isReelShare) {
      const reelIdMatch = msg.text?.match(/\/reels\/([a-zA-Z0-9-]+)/);
      const sharedReelId = reelIdMatch ? reelIdMatch[1] : null;
      
      return (
        <View className="flex-col gap-2">
          {msg.text && (
            <Text className={`text-[15px] leading-5 ${isSent ? 'text-white' : 'text-white/90'} px-1`}>
              {msg.text.split('http')[0].trim()}
            </Text>
          )}
          <Pressable 
            onPress={() => sharedReelId ? router.push(`/reel/${sharedReelId}`) : null}
            className="relative rounded-xl overflow-hidden"
            style={{ width: 180, backgroundColor: 'rgba(0,0,0,0.3)' }}
          >
            {msg.mediaUrl ? (
               <Image source={{ uri: getThumbnailUrl(msg.mediaUrl) }} style={{ width: 180, height: 240, opacity: 0.8 }} resizeMode="cover" />
            ) : (
               <View style={{ width: 180, height: 240, backgroundColor: '#2D1B4E', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 40 }}>🎬</Text>
               </View>
            )}
            <View className="absolute bottom-0 left-0 right-0 p-3 bg-black/60 flex-row items-center justify-center gap-1">
              <Play size={14} color="white" />
              <Text className="text-white text-xs font-bold text-center" numberOfLines={1}>
                {msg.text?.includes('tagged') ? 'Tagged in a Reel' : 'Shared a Reel'}
              </Text>
            </View>
          </Pressable>
        </View>
      );
    }

    const isStoryReply = msg.text && msg.text.startsWith('[STORY:');

    if (isStoryReply) {
     const match = msg.text.match(/^\[STORY:([^:\]]+):?([^\]]*)\]\s*(.*)$/);
      const storyId = match ? match[1] : null;
      const storyCreator = match && match[2] ? match[2] : null;
      const actualText = match ? match[3] : msg.text;

      return (
        <View className="flex-col">
          <TouchableOpacity 
            onPress={() => {
              if (!storyId) return;
              const owner = msg.receiverUsername || storyCreator || (isSent ? otherUsername : userProfile?.username) || msg.senderUsername;
              router.push(`/story-viewer/${owner}?storyId=${storyId}`);
            }}
            activeOpacity={0.7}
            className="rounded-lg overflow-hidden bg-black/20 px-3 py-2 mb-2 border border-white/5 flex-row items-center gap-2"
          >
           <View className="w-6 h-8 rounded bg-[#1A0E2C] items-center justify-center overflow-hidden">
              {msg.mediaUrl ? (
                <Image source={{ uri: getThumbnailUrl(msg.mediaUrl) }} style={{ width: 24, height: 32 }} resizeMode="cover" />
              ) : (
                <Text style={{fontSize: 12}}>📱</Text>
              )}
            </View>
           <Text className="text-white/70 text-xs font-medium">Replied to story</Text>
          </TouchableOpacity>
          <Text className={`text-[15px] leading-5 ${isSent ? 'text-white' : 'text-white/90'} px-1`}>
            {actualText}
          </Text>
        </View>
      );
    }

    if (msg.mediaUrl && !msg.isStoryMention) {
      const isVideo = msg.mediaUrl.endsWith('.mp4') || msg.mediaUrl.endsWith('.mov');
      return (
        <Pressable onPress={() => onImagePress && onImagePress(msg.mediaUrl)} className="relative rounded-xl overflow-hidden">
          <Image source={{ uri: getThumbnailUrl(msg.mediaUrl) }} style={{ width: 180, height: 240 }} resizeMode="cover" />
          {isVideo && (
            <View className="absolute inset-0 items-center justify-center bg-black/20">
              <View className="w-12 h-12 bg-white/30 rounded-full items-center justify-center backdrop-blur-md">
                <Play size={20} color="#FFFFFF" fill="#FFFFFF" className="ml-1" />
              </View>
            </View>
          )}
        </Pressable>
      );
    }

    if (msg.text) {
      return (
        <Text className={`text-[15px] leading-5 ${isSent ? 'text-white' : 'text-white/90'}`}>{msg.text}</Text>
      );
    }
    
    return null;
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={!isSent ? renderRightActions : undefined}
      renderRightActions={isSent ? renderRightActions : undefined}
      onSwipeableOpen={onSwipeableOpen}
      friction={2}
    >
      <View className={`w-full flex-row ${isSent ? 'justify-end' : 'justify-start'} mb-2`}>
        <TapGestureHandler numberOfTaps={2} onActivated={onDoubleTap}>
          <Animated.View style={[animatedStyle, { maxWidth: '75%' }]}>
            
            {/* Reply Context */}
            {msg.replyToText && (
              <View className={`mb-1 px-3 py-2 rounded-lg opacity-80 ${isSent ? 'bg-[#2D1B4E]' : 'bg-[#1A0E2C]'}`}>
                <Text className="text-white/50 text-xs mb-1">Replying to</Text>
                <Text className="text-white/80 text-sm" numberOfLines={1}>{msg.replyToText}</Text>
              </View>
            )}

            <View className={`px-4 py-2.5 shadow-sm min-w-[60px] ${isSent ? 'rounded-[20px] rounded-br-[4px] bg-[#9333EA]' : 'rounded-[20px] rounded-bl-[4px] bg-[#262626]'}`}>
              <View className="z-10 relative">
                {renderContent()}
              </View>

              {/* Big Heart Animation for double tap */}
              <Animated.View style={[heartStyle, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 20 }]} pointerEvents="none">
                <Text style={{ fontSize: 50 }}>❤️</Text>
              </Animated.View>
            </View>

            {/* Reactions summary */}
            {reactionsCount > 0 && (
              <View className={`absolute -bottom-3 ${isSent ? 'left-2' : 'right-2'} bg-[#12081E] px-1.5 py-0.5 rounded-full border border-white/10 flex-row items-center shadow-lg z-20`}>
                {Object.values(msg.reactions).slice(0, 3).map((emoji: any, i) => (
                  <Text key={i} className="text-[10px]">{emoji}</Text>
                ))}
                {reactionsCount > 1 && <Text className="text-white/50 text-[9px] ml-0.5">{reactionsCount}</Text>}
              </View>
            )}

            {/* Read Receipts - Only show on the most recent sent message */}
            {isSent && msg.isLatestSent && (
              <View className="flex-row items-center justify-end gap-1 mt-1.5 min-h-[16px]">
                {msg.status === 'read' || msg.status === 'seen' ? (
                  <>
                    <Text className="text-[#6B7280] text-[10px]">Seen</Text>
                  </>
                ) : msg.status === 'delivered' ? (
                  <>
                    <Text className="text-[#6B7280] text-[10px]">Delivered</Text>
                  </>
                ) : msg.status === 'sending' ? (
                  <Text className="text-[#A855F7] text-[10px]">Sending...</Text>
                ) : msg.status === 'failed' ? (
                  <Text className="text-[#EF4444] text-[10px]">Failed</Text>
                ) : (
                  <Text className="text-[#6B7280] text-[10px]">Sent</Text>
                )}
              </View>
            )}

            {!isSent && (
              <Text className="text-[#6B7280] text-[10px] mt-1 ml-1">{msg.time}</Text>
            )}

          </Animated.View>
        </TapGestureHandler>
      </View>
    </Swipeable>
  );
}
