import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { showError } from '../../store/toastStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStoryStore, useAuthStore, useFeedStore, useEditorStore, useChatStore } from '../../store';
import { MotiView } from 'moti';
import { CheckCircle } from 'lucide-react-native';
import { apiClient, BASE_URL } from '../../api/client';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadImageToR2 } from '../../api/upload';
import * as VideoThumbnails from 'expo-video-thumbnails';

export default function ShareStoryScreen() {
  const router = useRouter();
  const {
uri, type, text, target, mode, speed, effect, musicId, musicTitle,
    musicArtist, musicUrl, targetUserIds, originalStoryId, originalOwnerId,
    originalOwnerUsername, isStory, city, taggedUserIds, isMonetized,
    returnTo, challengeId, isVideoMuted, category, allowGifting,
    visibility, allowComments, allowDuet, location,
  } = useLocalSearchParams<{
    uri: string;
  type: 'photo' | 'video';
    text?: string;
    target?: string;
    mode?: string;
    speed?: string;
    effect?: string;
    musicId?: string;
    musicTitle?: string;
    musicArtist?: string;
    musicUrl?: string;
    targetUserIds?: string;
    originalStoryId?: string;
    originalOwnerId?: string;
    originalOwnerUsername?: string;
    isStory?: string;
    city?: string;
    taggedUserIds?: string;
    isMonetized?: string;
    returnTo?: string;
    challengeId?: string;
    isVideoMuted?: string;
    category?: string;
    allowGifting?: string;
    visibility?: string;
    allowComments?: string;
    allowDuet?: string;
    location?: string;
  }>();

  const { addStory } = useStoryStore();
  const { addLocalReel } = useFeedStore();
  const { userProfile } = useAuthStore();
  const { layers, timelineData, musicData } = useEditorStore();
  const { sendDirectMessage } = useChatStore();
const [status, setStatus] = React.useState<'uploading' | 'success' | 'error'>('uploading');
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);
  const [statusText, setStatusText] = React.useState<string>('Preparing...');

  useEffect(() => {
    const uploadMedia = async () => {
      try {
        if (!uri && mode !== 'text' && !originalStoryId) throw new Error('No media URI provided');

        let decodedUri = uri ? decodeURIComponent(uri) : '';

        if (decodedUri) {
          if (Platform.OS === 'android' && !decodedUri.startsWith('file://') && !decodedUri.startsWith('content://') && !decodedUri.startsWith('http')) {
            decodedUri = 'file://' + decodedUri;
          }

          try {
            const fileInfo = await FileSystem.getInfoAsync(decodedUri);
            const maxSize = type === 'video' ? 104857600 : 20971520;
            const maxSizeMB = type === 'video' ? 100 : 20;
            if (fileInfo.exists && fileInfo.size && fileInfo.size > maxSize) {
              throw new Error(`File too large (${(fileInfo.size / 1048576).toFixed(1)}MB). Max: ${maxSizeMB}MB.`);
            }
          } catch (e: any) {
            if (e.message.includes('too large')) throw e;
          }
        }

        const metadata = { layers, timeline: timelineData, music: musicData };

        if ((mode === 'REEL' || mode === 'POST') && isStory !== 'true') {
  if (type === 'video') {
 let customThumbnailUrl: string | undefined;
            try {
              setStatusText('Generating thumbnail...');
              const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(decodedUri, { time: 1000 });
              setStatusText('Uploading thumbnail...');
              customThumbnailUrl = await uploadImageToR2(thumbUri, 'thumbnails');
         } catch (thumbErr: any) {
              console.log('Thumbnail generation failed:', thumbErr?.message || thumbErr);
              customThumbnailUrl = undefined;
            }
            setStatusText('Uploading video...');

            const { token } = useAuthStore.getState();
            const uploadRes = await FileSystem.uploadAsync(
              `${BASE_URL}/video/upload`,
              decodedUri,
              {
                httpMethod: 'POST',
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                fieldName: 'file',
                mimeType: 'video/mp4',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (uploadRes.status < 200 || uploadRes.status >= 300) {
              throw new Error(`Video upload failed: ${uploadRes.status} — ${uploadRes.body}`);
            }

            const uploadData = JSON.parse(uploadRes.body);
            const uploadId = uploadData.uploadId;

            setUploadProgress(60);
            setStatusText('Processing video...');

            let assetData: any = null;
            let attempts = 0;
            const maxAttempts = 40;

            while (attempts < maxAttempts) {
              await new Promise((r) => setTimeout(r, 4000));
              attempts++;
              try {
                const pollRes = await apiClient.get(`/video/asset?uploadId=${uploadId}`);
                if (pollRes.data.status === 'ready') {
                  assetData = pollRes.data;
                  break;
                }
              } catch {
              }
              setUploadProgress(60 + Math.min(attempts * 1.5, 35));
            }

            if (!assetData) throw new Error('Video processing timed out. Please try again.');

            setUploadProgress(98);
            setStatusText('Saving reel...');

      const playbackUrl = assetData.mediaUrl;

      const res = await apiClient.post('/reels', {
              mediaUrl: playbackUrl,
              thumbnailUrl: customThumbnailUrl || assetData.thumbnailUrl || playbackUrl,
            mediaType: 'VIDEO' as const,
              description: text || '',
              category: category || 'comedy',
              musicName: musicTitle || (musicId ? `Track ${musicId}` : undefined),
              city,
              challengeId,
              isMonetized: isMonetized === 'true',
              allowGifting: allowGifting === 'true',
              privacy: visibility || 'Public',
              allowComments: allowComments === 'true',
              allowDuet: allowDuet === 'true',
              taggedUserIds: taggedUserIds ? JSON.parse(taggedUserIds as string) : undefined,
              location: location ? JSON.parse(location as unknown as string) : undefined,
              layersData: JSON.stringify(metadata),
              muxAssetId: assetData.assetId,
              muxPlaybackId: assetData.playbackId,
              muxUploadId: uploadId,
              durationSeconds: Math.round(assetData.duration || 0),
            });

            const backendReel = res.data;

            const formattedReel = {
              id: backendReel.id,
              creatorId: userProfile.id,
              creatorName: userProfile.name || 'User',
              creatorUsername: userProfile.username || 'user',
              creatorAvatar: userProfile.avatar || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200',
              creatorIsVerified: userProfile.isVerified || false,
              videoUrl: playbackUrl,
         thumbnailUrl: customThumbnailUrl || assetData.thumbnailUrl || playbackUrl,
              mediaType: 'VIDEO' as const,
              description: backendReel.description || '',
              musicName: backendReel.musicName || 'Original Audio',
              likesCount: 0,
              commentsCount: 0,
              savesCount: 0,
              sharesCount: 0,
              viewsCount: 0,
              isLiked: false,
              isSaved: false,
              isFollowed: false,
              category: backendReel.category || 'comedy',
              isMonetized: backendReel.isMonetized !== undefined ? backendReel.isMonetized : true,
              location: location ? JSON.parse(location as string) : (city ? { city } : undefined),
              layersData: backendReel.layersData || JSON.stringify(metadata),
            };

            addLocalReel(formattedReel);

          } else {
            setStatusText('Uploading image...');
            const folder = mode === 'REEL' ? 'posts' : 'posts';
          const finalUrl = await uploadImageToR2(decodedUri, folder);
            setUploadProgress(70);
         setUploadProgress(70);
            setStatusText('Saving post...');

            const res = await apiClient.post('/reels', {
              mediaUrl: finalUrl,
              thumbnailUrl: finalUrl,
            mediaType: 'PHOTO' as const,
              description: text || '',
              category: category || 'comedy',
              musicName: musicTitle || (musicId ? `Track ${musicId}` : undefined),
              city,
              challengeId,
              isMonetized: isMonetized === 'true',
              allowGifting: allowGifting === 'true',
              privacy: visibility || 'Public',
              allowComments: allowComments === 'true',
              allowDuet: allowDuet === 'true',
              taggedUserIds: taggedUserIds ? JSON.parse(taggedUserIds as string) : undefined,
              location: location ? JSON.parse(location as unknown as string) : undefined,
              layersData: JSON.stringify(metadata),
            });

            const backendReel = res.data;

        const formattedReel = {
              id: backendReel.id,
              creatorId: userProfile.id,
              creatorName: userProfile.name || 'User',
              creatorUsername: userProfile.username || 'user',
              creatorAvatar: userProfile.avatar || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200',
              creatorIsVerified: userProfile.isVerified || false,
              videoUrl: finalUrl,
              thumbnailUrl: finalUrl,
              mediaType: 'PHOTO' as const,
              description: backendReel.description || '',
              musicName: backendReel.musicName || 'Original Audio',
              likesCount: 0,
              commentsCount: 0,
              savesCount: 0,
              sharesCount: 0,
              viewsCount: 0,
              isLiked: false,
              isSaved: false,
              isFollowed: false,
              category: backendReel.category || 'comedy',
              isMonetized: backendReel.isMonetized !== undefined ? backendReel.isMonetized : true,
              location: location ? JSON.parse(location as string) : (city ? { city } : undefined),
              layersData: backendReel.layersData || JSON.stringify(metadata),
            };

            addLocalReel(formattedReel);
          }

        } else {
          let finalUrl = decodedUri;

          if (!originalStoryId && decodedUri) {
            setStatusText('Uploading story...');
         finalUrl = await uploadImageToR2(decodedUri, 'stories');
           
       setUploadProgress(70);
          }

          setStatusText('Posting story...');

          const extractedMentions: string[] = [];
          if (layers && Array.isArray(layers)) {
            layers.forEach((layer: any) => {
              if (layer.type === 'interactive' && layer.content?.type === 'mention' && layer.content?.text) {
                extractedMentions.push(layer.content.text);
              }
            });
          }

          const isPrivateStory = target === 'close_friends' || target === 'share';
          const res = await apiClient.post('/stories', {
            mediaUrl: finalUrl,
            mediaType: type === 'video' ? 'VIDEO' : 'PHOTO',
            isCloseFriends: isPrivateStory,
            repliesAllowed: true,
            layersData: JSON.stringify(metadata),
            mentionedUsernames: extractedMentions,
            originalStoryId,
            originalOwnerId,
            originalOwnerUsername,
          });

          const storyId = res.data.id;

          if (originalStoryId) {
            apiClient.post('/analytics/track', { event: 'reshare_published', metadata: { originalStoryId, storyId } }).catch(() => {});
          }

          addStory({
            id: storyId,
            creatorId: userProfile?.username || 'me',
            mediaUrl: finalUrl,
            mediaType: type === 'video' ? 'VIDEO' : 'IMAGE',
            isCloseFriends: isPrivateStory,
            repliesAllowed: true,
            viewers: [],
            reactions: {},
            layersData: metadata,
            createdAt: res.data.createdAt,
          });

          if (target === 'share' && targetUserIds) {
            let parsedIds: string[] = [];
            try { parsedIds = JSON.parse(targetUserIds); } catch {}
            for (const userId of parsedIds) {
              await sendDirectMessage({ id: userId }, `[STORY:${storyId}] Hey, I shared a story with you!`, finalUrl);
            }
          }
        }

        setUploadProgress(100);
        setStatus('success');

        const { fetchStories } = useStoryStore.getState();
        await fetchStories();

        setTimeout(() => {
          if (returnTo === 'dismiss3') {
            router.dismiss(3);
          } else if (mode === 'REEL') {
            router.replace({ pathname: '/(tabs)/profile', params: { tab: 'reels' } });
          } else if (mode === 'POST') {
            router.replace('/(tabs)/profile');
          } else {
            router.replace('/');
          }
        }, 1500);

      } catch (err: any) {
        setStatus('error');
        const detailedError = err.response?.data?.message || err.response?.data?.error?.message || err.message;
        showError(typeof detailedError === 'object' ? JSON.stringify(detailedError) : detailedError);
        setTimeout(() => { router.back(); }, 2000);
      }
    };

    uploadMedia();
  }, []);

const label = target === 'share'
    ? 'Sending...'
    : isStory === 'true'
      ? 'Posting Story...'
      : mode === 'REEL'
        ? 'Posting Reel...'
        : 'Posting...';

  return (
    <View className="flex-1 bg-[#12081E] items-center justify-center">
      {status === 'uploading' ? (
        <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="items-center">
          <ActivityIndicator size="large" color="#A855F7" />
          <Text className="text-white mt-4 font-bold text-lg">
            {label} {uploadProgress > 0 ? `${uploadProgress}%` : ''}
          </Text>
          <View className="w-48 h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
            <View className="h-full bg-[#A855F7] rounded-full" style={{ width: `${uploadProgress}%` }} />
          </View>
          <Text className="text-neutral-grey mt-4 text-sm text-center px-6">{statusText}</Text>
        </MotiView>
      ) : status === 'error' ? (
        <View className="items-center">
          <Text className="text-red-500 font-bold text-2xl">Failed</Text>
        </View>
      ) : (
        <MotiView
          from={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="items-center"
        >
          <View className="w-20 h-20 bg-[#10B981]/20 rounded-full items-center justify-center mb-4">
            <CheckCircle size={40} color="#10B981" />
          </View>
          <Text className="text-white font-bold text-2xl">
            {target === 'share' ? 'Sent!' : isStory === 'true' ? 'Story Posted!' : mode === 'REEL' ? 'Reel Posted!' : 'Post Shared!'}
          </Text>
        </MotiView>
      )}
    </View>
  );
}