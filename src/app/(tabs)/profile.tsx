import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, Dimensions } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Settings, AlignLeft, LayoutGrid, Heart, Play, Plus, BarChart2 } from 'lucide-react-native';
import { useAuthStore, useFeedStore, useStoryHighlightStore, useStoryStore } from '../../store';
import { formatSocialCount, getDefaultAvatar } from '../../utils';
import { formatEarnings } from '../../utils/earnings';
import StoryRing from '../../components/StoryRing';
import { LinksSheet } from '../../components/sheets/LinksSheet';
import { ProfileOptionsSheet } from '../../components/sheets/ProfileOptionsSheet';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { showSuccess, showError } from '../../store/toastStore';

const { width } = Dimensions.get('window');

type ProfileTabType = 'posts' | 'reels';

export default function ProfileScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { reels, userReels, likedReels, fetchUserReels, fetchLikedReels } = useFeedStore();
  const { highlights, fetchHighlights } = useStoryHighlightStore();
  const stories = useStoryStore(state => state.stories);

const params = useLocalSearchParams<{ tab?: string }>();
const [activeTab, setActiveTab] = useState<ProfileTabType>((params.tab as ProfileTabType) || 'posts');
const cachedPosts = userReels.filter(r => r.mediaType === 'PHOTO' || (!r.mediaType && !(r.videoUrl && r.videoUrl.match(/\.(mp4|mov)$/i))));
const cachedReels = userReels.filter(r => r.mediaType === 'VIDEO' || (!r.mediaType && !!(r.videoUrl && r.videoUrl.match(/\.(mp4|mov)$/i))));

const [reelsLoading, setReelsLoading] = useState(cachedReels.length === 0);
const [postsLoading, setPostsLoading] = useState(cachedPosts.length === 0);

useFocusEffect(
    React.useCallback(() => {
      if (!userProfile.id) {
        setReelsLoading(false);
        setPostsLoading(false);
        return;
      }
      const { fetchProfile, fetchFollowingIds } = useAuthStore.getState();
      fetchProfile();
      fetchFollowingIds(userProfile.id);
      fetchHighlights(userProfile.id);
   // Skeleton sirf tab dikhao jab koi cached data nahi hai
   const currentPosts = userReels.filter(r => r.mediaType !== 'VIDEO' && !(r.videoUrl && r.videoUrl.match(/\.(mp4|mov)$/i)));
      const currentReels = userReels.filter(r => r.mediaType === 'VIDEO' || (r.videoUrl && r.videoUrl.match(/\.(mp4|mov)$/i)));

      if (currentReels.length === 0) setReelsLoading(true);
      if (currentPosts.length === 0) setPostsLoading(true);

      fetchUserReels(userProfile.id).finally(() => {
        setReelsLoading(false);
        setPostsLoading(false);
      });
      fetchLikedReels();
    }, [userProfile.id])
  );

  const followingIds = useAuthStore(state => state.followingIds);

  const isProfileIncomplete = !userProfile.isProfileComplete && !userProfile.category;

  // Use the directly fetched userReels to get accurate, up-to-date stats
  const totalLikes = userReels.reduce((acc, reel) => acc + reel.likesCount, 0);

  const [isLinksSheetOpen, setIsLinksSheetOpen] = useState(false);
  const [isProfileOptionsOpen, setIsProfileOptionsOpen] = useState(false);
  const [isDeleteStoryConfirmOpen, setIsDeleteStoryConfirmOpen] = useState(false);

const hasStory = stories.some(s => s.creatorId === userProfile.id || s.creatorId === userProfile.username);
  const myStory = stories.find(s => s.creatorId === userProfile.id || s.creatorId === userProfile.username);

  const displayProfile = {
    username: userProfile.username,
    roles: userProfile.category ? userProfile.category.toUpperCase() + ' CREATOR' : '',
    bio: userProfile.bio || '',
    socialLinks: userProfile.socialLinks || [],
    posts: userReels.length, // Real stat
    following: followingIds.length || 0,
    followers: userProfile.followersCount || 0,
    likes: totalLikes, // Real stat
    avatar: userProfile.avatar || getDefaultAvatar(userProfile.username)
  };

  const totalEarnings = userProfile.wallet?.totalEarnings ?? userProfile.coinsEarned ?? 0;

  const displayReels = userReels;

 const activeGridData = activeTab === 'posts' 
    ? displayReels.filter(r => r.mediaType === 'PHOTO' || (!r.mediaType && !(r.videoUrl && r.videoUrl.match(/\.(mp4|mov)$/i))))
    : displayReels.filter(r => r.mediaType === 'VIDEO' || (!r.mediaType && !!(r.videoUrl && r.videoUrl.match(/\.(mp4|mov)$/i))));

  const handleLinkPress = () => {
    if (displayProfile.socialLinks.length === 1) {
      let url = displayProfile.socialLinks[0].url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      import('react-native').then(rn => rn.Linking.openURL(url)).catch(console.error);
    } else if (displayProfile.socialLinks.length > 1) {
      setIsLinksSheetOpen(true);
    }
  };

  return (
    <SafeScreen edgeToEdgeBottom className="bg-[#12081E]">
      {/* 1. HEADER */}
      <View className="flex-row items-center justify-between px-4 pb-6 border-b border-white/5">
        <View className="w-10" />
        
        <Text className="text-white font-bold text-lg">Profile</Text>
        
        <Pressable 
          onPress={() => router.push('/settings')}
          className="p-2 -mr-2"
        >
          <Settings size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        
        {/* INCOMPLETE PROFILE BANNER */}
        {isProfileIncomplete && (
          <Pressable 
            onPress={() => router.push('/(auth)/profile-setup')}
            className="mx-4 mt-4 bg-primary-purple/20 border border-primary-purple p-3 rounded-xl flex-row items-center justify-between active:scale-[0.98]"
          >
            <View className="flex-1 mr-2">
              <Text className="text-white font-bold text-sm">Profile Incomplete</Text>
              <Text className="text-white/70 text-[11px] mt-0.5">Complete your profile to unlock all features.</Text>
            </View>
            <View className="bg-primary-purple px-3 py-1.5 rounded-full">
              <Text className="text-white font-bold text-[10px] uppercase">Complete Now</Text>
            </View>
          </Pressable>
        )}

        {/* 2. AVATAR & BIO BLOCK */}
        <View className="items-center px-4 py-6">
    <StoryRing 
      userId={displayProfile.username} 
      avatarUrl={displayProfile.avatar} 
      size={96} 
      onPress={() => setIsProfileOptionsOpen(true)}
    />

          <Text className="text-white font-bold text-lg mb-1">@{displayProfile.username}</Text>
          {displayProfile.roles ? <Text className="text-neutral-grey text-[11px] mb-1">{displayProfile.roles}</Text> : null}
          {displayProfile.bio ? <Text className="text-white/60 text-[10px] mb-1 text-center">{displayProfile.bio}</Text> : null}
          
          {displayProfile.socialLinks.length > 0 && (
            <Pressable onPress={handleLinkPress} className="mt-1">
              <Text className="text-[#D946EF] text-[10px] font-bold">
                {displayProfile.socialLinks[0].title || displayProfile.socialLinks[0].url.replace(/^https?:\/\//, '').split('/')[0]}
                {displayProfile.socialLinks.length > 1 ? ` and ${displayProfile.socialLinks.length - 1} other${displayProfile.socialLinks.length > 2 ? 's' : ''}` : ''}
              </Text>
            </Pressable>
          )}

          {/* Social Stats */}
          <View className="flex-row items-center justify-between mt-6 w-[85%]">
            <View className="items-center">
              <Text className="text-white font-black text-[15px]">{displayProfile.posts}</Text>
              <Text className="text-neutral-grey text-[9px] font-bold uppercase mt-1">Posts</Text>
            </View>
            <Pressable 
              onPress={() => router.push({ pathname: '/network', params: { userId: userProfile.id, type: 'following' } })}
              className="items-center"
            >
              <Text className="text-white font-black text-[15px]">{displayProfile.following}</Text>
              <Text className="text-neutral-grey text-[9px] font-bold uppercase mt-1">Following</Text>
            </Pressable>
            <Pressable 
              onPress={() => router.push({ pathname: '/network', params: { userId: userProfile.id, type: 'followers' } })}
              className="items-center"
            >
              <Text className="text-white font-black text-[15px]">{formatSocialCount(displayProfile.followers)}</Text>
              <Text className="text-neutral-grey text-[9px] font-bold uppercase mt-1">Followers</Text>
            </Pressable>
           <View className="items-center">
              <Text className="text-white font-black text-[15px]">₹{Number(totalEarnings).toFixed(2)}</Text>
              <Text className="text-neutral-grey text-[9px] font-bold uppercase mt-1">Earnings</Text>
            </View>
          </View>
        </View>

        {/* 2.2 CREATOR PORTAL BANNER */}
        <Pressable 
          onPress={() => router.push('/(creator)/portal')}
          className="mx-4 mb-6 bg-[#D946EF]/10 border border-[#D946EF]/20 p-4 rounded-xl flex-row items-center justify-between active:scale-[0.98]"
        >
          <View>
            <Text className="text-white font-bold text-[15px]">Creator Portal</Text>
            <Text className="text-white/60 text-[11px] mt-0.5">Analytics, earnings & growth tools</Text>
          </View>
          
          <View className="flex-row items-center gap-2">
            <View className="items-end">
             <Text className="text-[#10B981] font-black text-[15px]">₹{Number(totalEarnings).toFixed(2)}</Text>
              <Text className="text-white/50 text-[9px]">earned</Text>
            </View>
            <Text className="text-[#D946EF] font-bold text-lg ml-1">›</Text>
          </View>
        </Pressable>

        {/* 2.5 STORY HIGHLIGHTS */}
        <View className="h-24 mb-4">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            className="px-4" 
            contentContainerStyle={{ gap: 16, alignItems: 'center' }}
          >
            <Pressable 
              onPress={() => router.push('/story-archive' as any)}
              className="items-center"
            >
              <View className="w-16 h-16 rounded-full border border-white/20 items-center justify-center mb-1">
                <Plus size={24} color="#FFFFFF" />
              </View>
              <Text className="text-white text-[10px]">New</Text>
            </Pressable>

            {highlights.map(highlight => (
              <Pressable key={highlight.id} className="items-center" onPress={() => router.push({ pathname: '/highlight-viewer/[id]', params: { id: highlight.id } } as any)}>
                <View className="w-16 h-16 rounded-full border border-white/10 p-0.5 mb-1 bg-black/50 overflow-hidden">
                  <Image source={{ uri: highlight.coverUrl }} className="w-full h-full rounded-full" />
                </View>
                <Text className="text-white text-[10px]">{highlight.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* 3. TABS SEGMENTS */}
        <View className="flex-row border-t border-b border-white/5 py-2">
          <Pressable
            onPress={() => setActiveTab('posts')}
            className={`flex-1 items-center justify-center py-2 ${activeTab === 'posts' ? 'border-b-2 border-[#A855F7]' : ''}`}
          >
            <LayoutGrid size={22} color={activeTab === 'posts' ? '#A855F7' : '#9CA3AF'} />
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('reels')}
            className={`flex-1 items-center justify-center py-2 ${activeTab === 'reels' ? 'border-b-2 border-[#A855F7]' : ''}`}
          >
            <Play size={24} color={activeTab === 'reels' ? '#A855F7' : '#9CA3AF'} />
          </Pressable>
        </View>

        {/* 4. GRID OF CONTENT */}
   {(activeTab === 'reels' ? reelsLoading : postsLoading) ? (
          <View className="flex-row flex-wrap">
            {[...Array(6)].map((_, i) => (
              <View
                key={i}
                className={`w-[33.33%] border-[0.5px] border-black bg-white/5 ${activeTab === 'reels' ? 'h-60' : 'aspect-square'}`}
                style={{ opacity: 0.4 + (i % 3) * 0.1 }}
              />
            ))} 
          </View>
        ) : activeGridData.length === 0 ? (
          <View className="py-24 items-center justify-center">
            <View className="w-20 h-20 rounded-full bg-white/5 items-center justify-center mb-4">
              {activeTab === 'posts' ? (
                <LayoutGrid size={32} color="#FFFFFF" opacity={0.5} />
              ) : (
                <Play size={32} color="#FFFFFF" opacity={0.5} />
              )}
            </View>
            <Text className="text-white font-bold text-lg mb-2">No {activeTab} yet</Text>
            <Text className="text-neutral-grey text-xs text-center px-10">
              {activeTab === 'posts' ? 'When you share posts, they will appear here.' : 'When you post reels, they will appear here.'}
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap">
{activeGridData.filter(item => typeof item.id === 'string' && item.id.length > 0).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (!item.id) return;
                  if (activeTab === 'posts') {
                    router.push({
                      pathname: `/post/${item.id}` as any,
                      params: { source: 'userReels' }
                    });
                  } else {
                    router.push({
                      pathname: `/reel/${item.id}` as any,
                      params: { source: 'userReels' }
                    });
                  }
                }}
                className={`w-[33.33%] border-[0.5px] border-black active:opacity-80 relative ${activeTab === 'reels' ? 'h-60' : 'aspect-square'}`}
              >
                <Image source={{ uri: item.thumbnailUrl || item.mediaUrl || item.videoUrl }} className="w-full h-full bg-white/5" resizeMode="cover" />
                
            {/* Icons based on content type */}
                {item.mediaType === 'VIDEO' || (item.videoUrl && item.videoUrl.match(/\.(mp4|mov)$/i)) ? (
             <View className="absolute top-2 right-2 bg-black/70 px-1.5 py-0.5 rounded">
                    <Text className="text-[#10B981] text-[10px] font-bold">
                      {formatEarnings((item as any).viewEarnings || 0)}
                    </Text>
                  </View>
                ) : (
                  <View className="absolute top-2 right-2 bg-black/40 rounded-full p-1">
                    <LayoutGrid size={12} color="white" />
                  </View>
                )}

            {activeTab !== 'posts' && (
                  <View className="absolute bottom-2 left-2 flex-row items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded-full">
                    <Play size={10} color="#FFFFFF" fill="#FFFFFF" />
                    <Text className="text-white text-[10px] font-bold drop-shadow-md">
                      {formatSocialCount(item.viewsCount || 0)}
                    </Text>
                  </View>
                )}

           
    {activeTab !== 'posts' && (
                  <View
                    className="absolute top-2 left-2 bg-black/70 w-6 h-6 rounded flex items-center justify-center border border-white/10"
                    onStartShouldSetResponder={() => true}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      router.push(`/(creator)/reel-analytics/${item.id}` as any);
                    }}
                  >
                    <BarChart2 size={12} color="#A855F7" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <LinksSheet 
        isVisible={isLinksSheetOpen} 
        onClose={() => setIsLinksSheetOpen(false)} 
        links={displayProfile.socialLinks} 
      />

<ProfileOptionsSheet
        isVisible={isProfileOptionsOpen}
        onClose={() => setIsProfileOptionsOpen(false)}
        username={displayProfile.username}
        hasStory={hasStory}
        storyId={myStory?.id}
        onDeleteStory={() => {
          if (myStory?.id) {
            setIsProfileOptionsOpen(false);
            setIsDeleteStoryConfirmOpen(true);
          }
        }}
      />

      <ConfirmSheet
        isVisible={isDeleteStoryConfirmOpen}
        title="Delete Story"
        message="Are you sure you want to delete your story? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setIsDeleteStoryConfirmOpen(false)}
        onConfirm={async () => {
          setIsDeleteStoryConfirmOpen(false);
          if (!myStory?.id) return;
          try {
            const { deleteStory } = useStoryStore.getState();
            await deleteStory(myStory.id);
            showSuccess('Story deleted');
          } catch (e) {
            showError('Failed to delete story');
          }
        }}
      />
    </SafeScreen>
  );
}