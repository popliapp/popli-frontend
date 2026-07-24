import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Image, Pressable, TextInput, Platform, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, Edit, Search, MessageSquare, Bell, 
  Heart, Award, ShieldAlert, Sparkles, ChevronRight, Video, X, User, Trash2
} from 'lucide-react-native';
import { apiClient } from '../../api/client';
import { useAuthStore, useChatStore, useStoryStore } from '../../store';
import StoryRing from '../../components/StoryRing';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { showSuccess, showError } from '../../store/toastStore';

export default function InboxScreen() {
  const router = useRouter();
  const { chats, fetchChats, connectSocket, deleteChat } = useChatStore();
  const { userProfile, blockedUsers } = useAuthStore();
  
  const blockedIds = blockedUsers.map(u => u.id);
  const visibleChats = chats.filter(chat => !blockedIds.includes(chat.creatorId));

 const [isNewMessageModalVisible, setIsNewMessageModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

useEffect(() => {
    connectSocket();
    fetchChats();
    return () => {
      // Don't disconnect — socket shared across app
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  }, [fetchChats]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setTimeout(() => setSearchResults([]), 0);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
        // Filter out current user and blocked users
        const results = res.data.filter((u: any) => u.id !== userProfile?.id && !blockedIds.includes(u.id));
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, userProfile]);

  const handleStartChat = async (userId: string, name: string, username: string, avatar: string) => {
    try {
      const res = await apiClient.post(`/chats/user/${userId}`);
      setIsNewMessageModalVisible(false);
      setSearchQuery('');
      if (res.data && res.data.id) {
        router.push({
          pathname: `/chat/[id]`,
          params: { id: res.data.id, creatorId: userId, creatorName: name, creatorUsername: username, creatorAvatar: avatar }
        });
      }
} catch (e) {
      console.error("Failed to start chat", e);
      showError("Couldn't start chat. Try again.");
    }
  };

  const handleLongPressChat = (chatId: string) => {
    setChatToDelete(chatId);
  };

  // Map recent friends from existing chats
  const activeFriendsMap = new Map();

  // First, add all active chats
  visibleChats.slice(0, 15).forEach((chat) => {
    if (!chat || !chat.creatorId) return;
    activeFriendsMap.set(chat.creatorId, {
      id: chat.id,
      userId: chat.creatorId,
      name: chat.creatorName ? chat.creatorName.split(' ')[0] : 'Unknown',
      avatar: chat.creatorAvatar || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200',
      active: (chat.creatorName ? chat.creatorName.length : 0) % 2 === 0, // Simulated online status
      hasStory: false // Will be updated if they have a story
    });
  });

  // Then, add users with active stories (who might not be in chats)
  // Ensure "Your Story" is at the front if the current user has a story
  const { stories } = useStoryStore();
  stories.forEach((story: any) => {
    const storyUsername = story.creatorId; // frontend stores username here
    if (blockedIds.includes(storyUsername)) return;
    
    if (activeFriendsMap.has(storyUsername)) {
      // Existing chat friend has a story
      activeFriendsMap.get(storyUsername).hasStory = true;
    } else {
      // Followed user has a story but no chat
      activeFriendsMap.set(storyUsername, {
        id: 'story-' + storyUsername,
        userId: storyUsername,
        name: storyUsername, // Fallback to username
        avatar: story.creatorAvatar || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200',
        active: false,
        hasStory: true
      });
    }
  });

  // Add the current user at the beginning always (for 'Your Story')
  let activeFriendsList = [];
  if (userProfile) {
    const hasOwnStory = stories.some((s: any) => s.creatorId === userProfile.username);
    activeFriendsMap.delete(userProfile.username); // Remove if existed to push to front
    activeFriendsList = [
      {
        id: 'self-' + userProfile.id,
        userId: userProfile.username,
        name: 'Your Story',
        avatar: userProfile.avatar || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200',
        active: false,
        hasStory: hasOwnStory
      },
      ...Array.from(activeFriendsMap.values())
    ];
  } else {
    activeFriendsList = Array.from(activeFriendsMap.values());
  }
  const activeFriends = activeFriendsList;

  // Format the last message preview to hide raw data tags like [STORY:uuid]
  const formatMessagePreview = (msg: string) => {
    if (!msg) return '';
    if (msg.startsWith('[STORY:')) {
      const textPart = msg.replace(/\[STORY:.*?\]\s*/, '').trim();
      return textPart ? `Shared a story: ${textPart}` : 'Shared a story';
    }
    if (msg.startsWith('[REEL:')) {
      const textPart = msg.replace(/\[REEL:.*?\]\s*/, '').trim();
      return textPart ? `Shared a reel: ${textPart}` : 'Shared a reel';
    }
    if (msg.includes('/reels/')) {
      const textPart = msg.split('http')[0].trim();
      return textPart || 'Shared a reel';
    }
    if (msg.startsWith('http')) {
      return 'Sent a link';
    }
    return msg;
  };

  return (
    <SafeScreen edgeToEdgeBottom className="bg-[#12081E]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-[#12081E]">
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-4 pb-6">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white font-bold text-base">Messages</Text>
        <Pressable onPress={() => setIsNewMessageModalVisible(true)} className="p-2 -mr-2">
          <Edit size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* SEGMENTED TABS (MESSAGES / NOTIFICATIONS) REMOVED */}

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D946EF" />
        }
      >
        
        {/* ==========================================
            MESSAGES CHAT LISTING (FIGMA DESIGN)
            ========================================== */}
        <View>
          {/* Search Bar */}
          <View className="px-4 mb-6">
            <View className="bg-[#2D1B4E] h-10 rounded-2xl flex-row items-center px-4 gap-2">
                <Search size={16} color="#9CA3AF" />
                <TextInput
                  placeholder="Search messages"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 text-white font-medium text-sm"
                />
              </View>
            </View>



            {/* Messages List */}
            <View className="px-4 gap-6">
              {visibleChats.filter(c => c.lastMessage !== 'No messages yet').length === 0 ? (
                <View className="items-center justify-center py-10">
                  <MessageSquare size={48} color="#9CA3AF" />
                  <Text className="text-white font-bold mt-4 text-center">No messages yet</Text>
                  <Text className="text-[#9CA3AF] text-sm mt-2 text-center px-6">
                    Start a conversation with your friends or favorite creators.
                  </Text>
                </View>
              ) : (
                visibleChats.filter(c => c.lastMessage !== 'No messages yet').map((chat) => (
                  <Pressable
                    key={chat.id}
                    onPress={() => router.push(`/chat/${chat.id}`)}
                    onLongPress={() => handleLongPressChat(chat.id)}
                    className="flex-row items-center justify-between active:scale-[0.99]"
                  >
                    <View className="flex-row items-center gap-3 flex-1 pr-4">
                      <StoryRing userId={chat.creatorUsername || chat.creatorId} avatarUrl={chat.creatorAvatar} size={48} />
                      
                      <View className="flex-1 justify-center gap-1">
                        <Text className="text-white font-bold text-sm" numberOfLines={1}>
                          {chat?.creatorName || 'Unknown'}
                        </Text>
                        <Text className={`${chat.unreadCount && chat.unreadCount > 0 ? 'text-white font-medium' : 'text-neutral-grey font-medium'} text-xs`} numberOfLines={1}>
                          {formatMessagePreview(chat.lastMessage)}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end gap-1">
                      <Text className={`${chat.unreadCount && chat.unreadCount > 0 ? 'text-white' : 'text-neutral-grey'} text-[10px] font-medium`}>
                        {chat.lastMessageTime}
                      </Text>
                      
                      {chat.unreadCount && chat.unreadCount > 0 ? (
                        <View className="w-2.5 h-2.5 bg-white rounded-full mt-1" />
                      ) : null}
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </View>
      </ScrollView>

      {/* New Message Modal */}
      <Modal visible={isNewMessageModalVisible} transparent animationType="slide">
        <SafeScreen edgeToEdgeBottom className="bg-[#12081E]">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-[#12081E]">
          <View className="flex-row items-center justify-between px-4 pb-4 border-b border-white/10">
            <Text className="text-white font-bold text-base">New Message</Text>
            <Pressable onPress={() => setIsNewMessageModalVisible(false)} className="p-2 -mr-2">
              <X size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="p-4 border-b border-white/10 flex-row items-center gap-3">
            <Text className="text-white font-bold">To:</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search users..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-white text-base py-2"
              autoFocus
            />
          </View>

          <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
            {isSearching ? (
              <ActivityIndicator size="small" color="#D946EF" className="mt-6" />
            ) : searchResults.length > 0 ? (
              searchResults.map(user => (
                <Pressable
                  key={user.id}
                  onPress={() => handleStartChat(user.id, user.name, user.username, user.avatar)}
                  className="flex-row items-center gap-3 py-4 border-b border-white/5"
                >
                  <View className="w-12 h-12 rounded-full overflow-hidden bg-white/10 items-center justify-center">
                    {user.avatar ? (
                      <Image source={{ uri: user.avatar }} className="w-full h-full" />
                    ) : (
                      <User size={20} color="#9CA3AF" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold">{user.name}</Text>
                    <Text className="text-neutral-grey text-xs">@{user.username}</Text>
                  </View>
                </Pressable>
              ))
            ) : searchQuery.trim().length > 0 ? (
              <Text className="text-neutral-grey text-center mt-6">No users found.</Text>
            ) : (
              <Text className="text-neutral-grey text-center mt-6">Search for a user to start a chat.</Text>
            )}
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeScreen>
     </Modal>

      <ConfirmSheet
        isVisible={!!chatToDelete}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setChatToDelete(null)}
        onConfirm={async () => {
          const id = chatToDelete;
          setChatToDelete(null);
          if (!id) return;
          try {
            await deleteChat(id);
            showSuccess('Chat deleted');
          } catch (e) {
            showError('Failed to delete chat');
          }
        }}
      />

    </KeyboardAvoidingView>
  </SafeScreen>
  );
}