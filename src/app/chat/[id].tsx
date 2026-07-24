import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Platform, Modal, TouchableOpacity, Image, FlatList, Animated } from 'react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore, useChatStore } from '../../store';
import { ChevronLeft, Info, BellOff, Ban, X, Phone, Video } from 'lucide-react-native';
import StoryRing from '../../components/StoryRing';
import { FlashList } from '@shopify/flash-list';
import MessageBubble from '../../components/chat/MessageBubble';
import ChatInputBar from '../../components/chat/ChatInputBar';
import { apiClient } from '../../api/client';
import { formatRelativeTime } from '../../utils';

export default function ChatScreen() {
  const router = useRouter();
  const { id, creatorId, creatorName, creatorUsername, creatorAvatar } = useLocalSearchParams();
const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

const { userProfile, toggleBlock, blockedUsers } = useAuthStore();
const { 
    chats, 
    messages: storeMessages, 
    fetchMessages, 
    fetchChats, 
    sendMessage, 
    toggleMuteChat, 
    mutedChats, 
    markChatRead,
    markMessageSeen,
    sendTyping,
    leaveChat,
    getSocket
  } = useChatStore();

const [otherTyping, setOtherTyping] = useState(false);
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!otherTyping) return;
    const animDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -4, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
    const a1 = animDot(dot1, 0);
    const a2 = animDot(dot2, 150);
    const a3 = animDot(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [otherTyping]);
  const chat = chats.find(c => c.id === id);

  const displayAvatar = chat?.creatorAvatar || (creatorAvatar as string) || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200';
  const displayName = chat?.creatorName || (creatorName as string) || 'Unknown User';
  const displayUsername = chat?.creatorUsername || (creatorUsername as string) || 'user';
  
  const targetUserId = chat?.creatorId || (creatorId as string);
  const isBlocked = blockedUsers.some(u => u.id === targetUserId);

  // Only show messages for this chat, sort newest first for inverted FlashList
  const messages = storeMessages
    .filter(m => m.chatId === id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
useEffect(() => {
    if (id) {
      fetchMessages(id as string);
      markChatRead(id as string);
      if (!chat) fetchChats();
    }
    return () => {
      if (id) {
        leaveChat(id as string);
        setOtherTyping(false);
      }
    };
  }, [id]);
useEffect(() => {
    if (!id) return;
    const handleTyping = (data: { chatId: string; isTyping: boolean; userId: string }) => {
      if (data.chatId !== id) return;
      if (data.userId === userProfile?.id) return;
      setOtherTyping(data.isTyping);
    };
    getSocket()?.on('typing', handleTyping);
    return () => {
      getSocket()?.off('typing', handleTyping);
      setOtherTyping(false);
    };
  }, [id, userProfile?.id]);
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    viewableItems.forEach((item: any) => {
      const msg = item.item;
      // Ensure we have userProfile.id and the message is from someone else
      if (userProfile?.id && msg.senderId !== userProfile.id && msg.status !== 'seen') {
        markMessageSeen(id as string, msg.id);
      }
    });
  });

const handleSend = (text: string, mediaUrl?: string, type?: 'TEXT'|'VOICE') => {
    sendMessage(id as string, text, mediaUrl, {
      type,
      replyToId: replyingTo?.id,
      replyToText: replyingTo?.text,
    });
    setReplyingTo(null);
  };

  const handleTyping = (typing: boolean) => {
    if (id && userProfile?.id) {
      sendTyping(id as string, typing);
    }
  };

  const latestSentMsgId = messages.find(m => m.senderId === userProfile?.id)?.id;

  const formattedMessages = messages.map(m => {
    return {
      ...m,
      isStoryMention: m.type === 'STORY_MENTION',
      isReelShare: (m.text?.includes('check out this Reel! 🎥') || m.text?.includes('tagged you')) && m.text?.includes('/reels/'),
      type: m.senderId === userProfile?.id ? 'sent' : 'received',
      time: formatRelativeTime(m.timestamp),
      senderAvatar: m.senderId === userProfile?.id ? userProfile?.avatar : displayAvatar,
      senderUsername: (m as any).sender?.username || (m.senderId === userProfile?.id ? userProfile?.username : displayUsername),
      receiverUsername: m.senderId === userProfile?.id ? displayUsername : userProfile?.username,
      attachment: m.mediaUrl,
      isVideo: m.mediaUrl?.endsWith('.mp4') || m.mediaUrl?.includes('/video/'),
      isLatestSent: m.id === latestSentMsgId
    };
  });

  return (
    <SafeScreen edgeToEdgeBottom className="bg-[#12081E]">
      <View style={{ flex: 1 }}>
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-white/5 bg-[#12081E] z-10">
        <View className="flex-row items-center gap-3 flex-1">
          <Pressable onPress={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft size={28} color="#FFFFFF" />
          </Pressable>
          
          <Pressable 
            className="flex-row items-center gap-3 flex-1"
            onPress={() => router.push(`/user/${displayUsername}`)}
          >
            <View className="relative">
              <StoryRing userId={displayUsername} avatarUrl={displayAvatar} size={40} />
              {chat?.isOnline && (
                <View className="absolute bottom-0 right-0 w-3 h-3 bg-[#10B981] rounded-full border-2 border-[#12081E]" />
              )}
            </View>
            
            <View className="flex-1">
              <Text className="text-white font-bold text-base" numberOfLines={1}>{displayName}</Text>
            {otherTyping ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  {[dot1, dot2, dot3].map((dot, i) => (
                    <Animated.View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#A855F7', transform: [{ translateY: dot }] }} />
                  ))}
                </View>
              ) : chat?.isOnline ? (
                <Text className="text-[#10B981] text-xs">Active now</Text>
              ) : null}
            </View>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => setShowOptionsModal(true)}>
            <Info size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View className="flex-1 px-4">
        <FlatList
          data={formattedMessages}
          keyExtractor={(item: any) => item.id.toString()}
          inverted={true}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={(info) => onViewableItemsChanged.current && onViewableItemsChanged.current(info)}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 20, paddingTop: 10 }}
          ListEmptyComponent={() => (
            <View style={{ transform: [{ scaleY: -1 }, { scaleX: -1 }] }} className="items-center justify-center flex-1 mt-20 mb-10">
              <Image source={{ uri: displayAvatar }} style={{ width: 90, height: 90, borderRadius: 45 }} className="mb-4" />
              <Text className="text-white font-bold text-xl mb-1">{displayName}</Text>
              <Text className="text-white/50 text-sm mb-6">Instagram</Text>
              <View className="bg-[#1A0E2C] px-4 py-2.5 rounded-full border border-white/10">
                <Text className="text-white font-semibold">Say hi to {displayUsername} 👋</Text>
              </View>
            </View>
          )}
          renderItem={({ item }: any) => (
           <MessageBubble 
              msg={item} 
              onReply={(msg: any) => setReplyingTo(msg)} 
              onImagePress={(url: string) => setViewerImage(url)}
              otherUsername={displayUsername}
            />
          )}
        />
      </View>

{otherTyping && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
          <View style={{ backgroundColor: '#1F0A3C', borderRadius: 14, padding: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <Text style={{ color: '#A855F7', fontSize: 10, fontWeight: '600', marginBottom: 4 }}>{displayName}</Text>
            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              {[dot1, dot2, dot3].map((dot, i) => (
                <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#A855F7', transform: [{ translateY: dot }] }} />
              ))}
            </View>
          </View>
        </View>
      )}

      <ChatInputBar 
        onSend={handleSend}
        onTyping={handleTyping}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />

      {/* OPTIONS MODAL */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/50 justify-center items-center px-6 z-50"
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View className="bg-[#1A0E2C] w-full rounded-3xl overflow-hidden border border-white/5" onStartShouldSetResponder={() => true}>
            <View className="p-5 border-b border-white/5 flex-row items-center justify-between">
              <Text className="text-white font-bold text-lg">Chat Options</Text>
              <Pressable onPress={() => setShowOptionsModal(false)} className="p-1">
                <X size={20} color="#9CA3AF" />
              </Pressable>
            </View>
            
            <View className="p-2">
              <Pressable 
                onPress={() => {
                  toggleMuteChat(id as string);
                  setShowOptionsModal(false);
                }}
                className="flex-row items-center px-4 py-4 active:bg-white/5 rounded-xl"
              >
                <BellOff size={20} color="#FFFFFF" />
                <View className="ml-3">
                  <Text className="text-white font-semibold text-base">
                    {mutedChats.includes(id as string) ? 'Unmute Notifications' : 'Mute Notifications'}
                  </Text>
                  <Text className="text-neutral-grey text-xs mt-0.5">Stop receiving push notifications</Text>
                </View>
              </Pressable>

              <Pressable 
                onPress={() => {
                  if (targetUserId) {
                    toggleBlock(targetUserId);
                  }
                  // Let the modal stay open so they can see it changed to Unblock
                }}
                className="flex-row items-center px-4 py-4 active:bg-white/5 rounded-xl"
              >
                <Ban size={20} color="#EF4444" />
                <View className="ml-3">
                  <Text className="text-[#EF4444] font-semibold text-base">{isBlocked ? 'Unblock User' : 'Block User'}</Text>
                  <Text className="text-neutral-grey text-xs mt-0.5">{isBlocked ? 'They will be able to message you again' : "They won't be able to message you"}</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* IMAGE VIEWER MODAL */}
      <Modal visible={!!viewerImage} transparent={true} animationType="fade" onRequestClose={() => setViewerImage(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable 
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }} 
            onPress={() => setViewerImage(null)}
          >
            <X size={28} color="white" />
          </Pressable>
          {viewerImage && (
            <Image source={{ uri: viewerImage }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
          )}
        </View>
      </Modal>

      </View>
    </SafeScreen>
  );
}
