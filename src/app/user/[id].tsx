import React, { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Award, Play, LayoutGrid } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinksSheet } from '../../components/sheets/LinksSheet';
import { apiClient } from '../../api/client';
import { useAuthStore, useChatStore, useFeedStore } from '../../store';
import { getDefaultAvatar, formatSocialCount } from '../../utils';

export default function PublicProfileScreen() {
  const { id: username } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { sendDirectMessage } = useChatStore();
  
  // Optimistic UI: Pre-load profile from feedStore if available
  const { creators, setProfileReels } = useFeedStore();
  const cachedProfile = creators.find((c: any) => c.username === username);

  const [profile, setProfile] = useState<any>(cachedProfile || null);
  const [loading, setLoading] = useState(!cachedProfile);
  const [error, setError] = useState('');
  const [isLinksSheetOpen, setIsLinksSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');

  const { followingIds, toggleFollow, userProfile, blockedUsers, toggleBlock } = useAuthStore();
  const isFollowing = profile ? followingIds.includes(profile.id) : false;
  const isOwnProfile = profile ? userProfile?.username === profile.username : false;
  const isBlocked = profile ? blockedUsers.some(u => u.id === profile.id) : false;

  useEffect(() => {
    async function fetchProfile() {
      try {
        if (!cachedProfile) setLoading(true);
        const res = await apiClient.get(`/users/creator/${encodeURIComponent(username)}`);
        setProfile(res.data);
        if (res.data.reels && Array.isArray(res.data.reels)) {
          setProfileReels(res.data.username, res.data.reels);
        }
      } catch (e: any) {
        console.error("Error fetching creator profile:", e);
        if (!cachedProfile) setError("Creator not found");
      } finally {
        setLoading(false);
      }
    }
    
    if (username) fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0B001A' }} className="items-center justify-center">
        <ActivityIndicator size="large" color="#D946EF" />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0B001A' }}>
        <View className="flex-row items-center p-4">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-lg font-bold">{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B001A' }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-white/10">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center active:scale-95">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white font-bold text-lg ml-2">{profile.username}</Text>

        {!isOwnProfile && (
          <View className="ml-auto flex-row items-center">
            <Pressable 
              onPress={() => toggleBlock(profile.id)}
              className="px-3 py-1.5 rounded-full bg-white/10"
            >
              <Text className={isBlocked ? "text-[#EF4444] font-bold text-xs" : "text-white font-bold text-xs"}>
                {isBlocked ? 'Unblock' : 'Block'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View className="p-4">
          <View className="flex-row items-center justify-between">
            {/* Avatar */}
            <View className="w-20 h-20 rounded-full border-[3px] border-primary-purple overflow-hidden">
              <Image 
                source={{ uri: profile.avatar || getDefaultAvatar(profile.username) }} 
                className="w-full h-full" 
              />
            </View>

            {/* Stats */}
            <View className="flex-1 flex-row justify-around ml-4">
              <View className="items-center">
                <Text className="text-white font-bold text-lg">{formatSocialCount(profile.reels?.length || 0)}</Text>
                <Text className="text-neutral-silver text-xs">Reels</Text>
              </View>
              <Pressable 
                onPress={() => router.push({ pathname: '/network', params: { userId: profile.id, type: 'followers' } })}
                className="items-center"
              >
                <Text className="text-white font-bold text-lg">{formatSocialCount(profile.followersCount || 0)}</Text>
                <Text className="text-neutral-silver text-xs">Followers</Text>
              </Pressable>
              <Pressable 
                onPress={() => router.push({ pathname: '/network', params: { userId: profile.id, type: 'following' } })}
                className="items-center"
              >
                <Text className="text-white font-bold text-lg">{formatSocialCount(profile.followingCount || 0)}</Text>
                <Text className="text-neutral-silver text-xs">Following</Text>
              </Pressable>
              <View className="items-center">
                <Text className="text-white font-bold text-lg">₹{Number(profile.wallet?.totalEarnings ?? profile.coinsEarned ?? 0).toFixed(2)}</Text>
                <Text className="text-neutral-silver text-xs">Earnings</Text>
              </View>
            </View>
          </View>

          {/* Bio */}
          <View className="mt-4">
            <Text className="text-white font-bold text-base">{profile.name}</Text>
            {profile.category && (
              <Text className="text-primary-pink text-xs font-semibold mt-0.5">{profile.category.toUpperCase()}</Text>
            )}
            <Text className="text-white/80 mt-1 leading-5">{profile.bio}</Text>
            
            {profile.socialLinks && profile.socialLinks.length > 0 && (
              <Pressable 
                onPress={() => {
                  if (profile.socialLinks.length === 1) {
                    let url = profile.socialLinks[0].url;
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                      url = 'https://' + url;
                    }
                    import('react-native').then(rn => rn.Linking.openURL(url));
                  } else {
                    setIsLinksSheetOpen(true);
                  }
                }}
                className="mt-2"
              >
                <Text className="text-[#D946EF] text-sm font-bold">
                  {profile.socialLinks[0].title || profile.socialLinks[0].url.replace(/^https?:\/\//, '').split('/')[0]}
                  {profile.socialLinks.length > 1 ? ` and ${profile.socialLinks.length - 1} other${profile.socialLinks.length > 2 ? 's' : ''}` : ''}
                </Text>
              </Pressable>
            )}
            
            <View className="flex-row items-center mt-2">
              <MapPin size={14} color="#9CA3AF" />
              <Text className="text-neutral-silver text-sm ml-1">{profile.city || 'Unknown Location'}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-2 mt-5">
            {isBlocked ? (
              <Pressable 
                onPress={() => toggleBlock(profile.id)}
                className="flex-1 py-2.5 rounded-lg items-center justify-center bg-[#2A1B3D] border border-[#FF3B30]/30"
              >
                <Text className="font-bold text-sm text-[#FF3B30]">Unblock User</Text>
              </Pressable>
            ) : !isOwnProfile ? (
              <>
                <Pressable 
                  onPress={() => {
                    toggleFollow(profile.id);
                    setProfile((prev: any) => ({
                      ...prev,
                      followersCount: Math.max(0, prev.followersCount + (isFollowing ? -1 : 1))
                    }));
                  }}
                  className={`flex-1 py-2.5 rounded-lg items-center justify-center ${isFollowing ? 'bg-white/10' : 'bg-primary-pink'}`}
                >
                  <Text className={`font-bold text-sm ${isFollowing ? 'text-white' : 'text-white'}`}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
                <Pressable 
                  onPress={async () => {
                    try {
                      // Start a chat with this user
                      const res = await apiClient.post(`/chats/user/${profile.id}`);
                      if (res.data && res.data.id) {
                        router.push({
                          pathname: `/chat/${res.data.id}` as any,
                          params: {
                            creatorName: profile.name,
                            creatorUsername: profile.username,
                            creatorAvatar: profile.avatar
                          }
                        });
                      }
                    } catch (e) {
                      console.error("Failed to start chat", e);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-lg items-center justify-center bg-white/10"
                >
                  <Text className="font-bold text-sm text-white">Message</Text>
                </Pressable>
              </>
            ) : (
              <Pressable 
                onPress={() => router.push('/(tabs)/profile' as any)}
                className="flex-1 py-2.5 rounded-lg items-center justify-center bg-white/10"
              >
                <Text className="font-bold text-sm text-white">Edit Profile</Text>
              </Pressable>
            )}
          </View>
        </View>

        {isBlocked ? (
          <View className="mt-10 items-center justify-center p-6">
            <View className="w-16 h-16 rounded-full bg-white/5 items-center justify-center mb-4">
              <Text className="text-3xl">🚫</Text>
            </View>
            <Text className="text-white font-bold text-lg mb-2 text-center">User Blocked</Text>
            <Text className="text-neutral-silver text-center text-sm">
              You have blocked this user. Unblock them to see their reels and content.
            </Text>
          </View>
        ) : (
          <View className="mt-4">
            <View className="flex-row border-t border-b border-white/5 py-2 mt-4">
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

            <View className="flex-row flex-wrap">
              {(() => {
                const activeData = activeTab === 'posts' 
                  ? profile.reels?.filter((r: any) => r.mediaType !== 'VIDEO' && !(r.videoUrl && r.videoUrl.match(/\.(mp4|mov)$/i)))
                  : profile.reels?.filter((r: any) => r.mediaType === 'VIDEO' || (r.videoUrl && r.videoUrl.match(/\.(mp4|mov)$/i)));
                
                if (activeData && activeData.length > 0) {
                  return activeData.map((reel: any) => (
                    <Pressable 
                      key={reel.id} 
                      onPress={() => {
                        if (activeTab === 'posts') {
                          router.push({
                            pathname: `/post/${reel.id}` as any,
                            params: { source: 'profile', profileUsername: profile.username }
                          });
                        } else {
                          router.push({
                            pathname: `/reel/${reel.id}` as any,
                            params: { source: 'profile', profileUsername: profile.username }
                          });
                        }
                      }}
                      className={`w-[33.33%] border-[0.5px] border-black active:opacity-80 relative bg-neutral-grey ${activeTab === 'reels' ? 'h-60' : 'aspect-square'}`}
                    >
                      <Image 
                        source={{ uri: reel.thumbnailUrl || reel.mediaUrl || reel.videoUrl }} 
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      {/* Icons based on content type */}
                      {reel.mediaType === 'VIDEO' || (reel.videoUrl && reel.videoUrl.match(/\.(mp4|mov)$/i)) ? (
                        <View className="absolute top-2 right-2 bg-black/40 rounded-full p-1">
                          <Play size={12} color="white" />
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
                            {formatSocialCount(reel.viewsCount || 0)}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  ));
                } else {
                  return (
                    <View className="py-24 items-center justify-center w-full">
                      <View className="w-20 h-20 rounded-full bg-white/5 items-center justify-center mb-4">
                        {activeTab === 'posts' ? (
                          <LayoutGrid size={32} color="#FFFFFF" opacity={0.5} />
                        ) : (
                          <Play size={32} color="#FFFFFF" opacity={0.5} />
                        )}
                      </View>
                      <Text className="text-white font-bold text-lg mb-2">No {activeTab} yet</Text>
                    </View>
                  );
                }
              })()}
            </View>

          </View>
        )}
        
        {/* Bottom Spacing */}
        <View className="h-24" />
      </ScrollView>

      <LinksSheet 
        isVisible={isLinksSheetOpen} 
        onClose={() => setIsLinksSheetOpen(false)} 
        links={profile?.socialLinks || []} 
      />
    </SafeAreaView>
  );
}
