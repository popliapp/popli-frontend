import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { showError } from '../../store/toastStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStoryStore, useAuthStore, useFeedStore, useEditorStore, useChatStore } from '../../store';
import { MotiView } from 'moti';
import { CheckCircle } from 'lucide-react-native';
import { apiClient } from '../../api/client';
import * as FileSystem from 'expo-file-system/legacy';

const encodeBase64Url = (str: string) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  let i = 0;
  while (i < str.length) {
    let chr1 = str.charCodeAt(i++);
    let chr2 = str.charCodeAt(i++);
    let chr3 = str.charCodeAt(i++);
    let enc1 = chr1 >> 2;
    let enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    let enc4 = chr3 & 63;
    if (isNaN(chr2)) { enc3 = enc4 = 64; }
    else if (isNaN(chr3)) { enc4 = 64; }
    output = output + (enc1 < 64 ? chars.charAt(enc1) : '') 
                  + (enc2 < 64 ? chars.charAt(enc2) : '') 
                  + (enc3 < 64 ? chars.charAt(enc3) : '') 
                  + (enc4 < 64 ? chars.charAt(enc4) : '');
  }
  return output.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export default function ShareStoryScreen() {
  const router = useRouter();
  const { uri, type, text, target, mode, speed, effect, musicId, musicTitle, musicArtist, musicUrl, targetUserIds, originalStoryId, originalOwnerId, originalOwnerUsername, isStory, city, taggedUserIds, isMonetized, returnTo, challengeId, isVideoMuted, category, allowGifting, visibility, allowComments, allowDuet, location } = useLocalSearchParams<{ 
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
  const { fetchReels, addLocalReel } = useFeedStore();
  const { userProfile } = useAuthStore();
  const { layers, timelineData, musicData } = useEditorStore();
  const { sendDirectMessage } = useChatStore();
  const [status, setStatus] = React.useState<'uploading' | 'success' | 'error'>('uploading');
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);

  useEffect(() => {
    const uploadMedia = async () => {
      try {
        if (!uri && mode !== 'text' && !originalStoryId) throw new Error('No media URI provided');
        
        let decodedUri = uri ? decodeURIComponent(uri) : '';
        let mimeType = 'image/jpg';
        let fileType = 'jpg';

        if (decodedUri) {
          // Normalize URI: decode it and ensure it has file:// prefix for Android if it's a local file path
          if (Platform.OS === 'android' && !decodedUri.startsWith('file://') && !decodedUri.startsWith('content://') && !decodedUri.startsWith('http')) {
            decodedUri = 'file://' + decodedUri;
          }

          // Check File Size before upload
          try {
            const fileInfo = await FileSystem.getInfoAsync(decodedUri);
            const maxSize = type === 'video' ? 104857600 : 20971520; // 100MB for video, 20MB for images
            const maxSizeMB = type === 'video' ? 100 : 20;

            if (fileInfo.exists && fileInfo.size && fileInfo.size > maxSize) {
              throw new Error(`File size is too large (${(fileInfo.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is ${maxSizeMB}MB.`);
            }
          } catch (e: any) {
            if (e.message.includes('too large')) throw e; // rethrow size error
            console.warn("Failed to read file size", e);
          }

          fileType = decodedUri.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg');
          mimeType = type === 'video' ? `video/${fileType}` : `image/${fileType}`;
        }

        if ((mode === 'REEL' || mode === 'POST') && isStory !== 'true') {
          // Cloudinary Upload
          const sigResponse = await apiClient.get('/upload/signature?folder=reels');
          const { timestamp, signature, cloudName, apiKey, folder } = sigResponse.data;

          const uploadTask = FileSystem.createUploadTask(
            `https://api.cloudinary.com/v1_1/${cloudName}/${type === 'video' ? 'video' : 'image'}/upload`,
            decodedUri,
            {
              httpMethod: 'POST',
              // @ts-ignore
              uploadType: 1, 
              fieldName: 'file',
              mimeType: type === 'video' ? 'video/mp4' : 'image/jpeg',
              parameters: {
                api_key: String(apiKey || ''),
                timestamp: String(timestamp || ''),
                signature: String(signature || ''),
                folder: String(folder || '')
              }
            },
            (data) => {
              const percentCompleted = Math.round((data.totalBytesSent / data.totalBytesExpectedToSend) * 100);
              setUploadProgress(percentCompleted);
            }
          );
          
          const uploadRes = await uploadTask.uploadAsync();
          if (!uploadRes || uploadRes.status !== 200) {
            throw new Error(`Cloudinary upload failed: ${uploadRes?.body || 'Unknown error'}`);
          }
          const uploadData = JSON.parse(uploadRes.body);
          if (!uploadData.secure_url) throw new Error('Cloudinary upload failed: File might be too large');

          let finalUrl = uploadData.secure_url;
          const transformations = [];
          if (type === 'video') {
            if (speed === '2') transformations.push('e_accelerate:100');
            if (speed === '3') transformations.push('e_accelerate:200');
          }
          if (effect === 'Paris') transformations.push('e_art:zorro');
          if (effect === 'Vintage') transformations.push('e_sepia');
          if (effect === 'Neon') transformations.push('e_tint:100:blue:purple');
          if (effect === 'B&W') transformations.push('e_grayscale');
          if (effect === 'Blur') transformations.push('e_blur:300');
          if (isVideoMuted === 'true') transformations.push('e_volume:mute');
          // Note: We intentionally skip adding musicUrl transformation to Cloudinary. 
          // Cloudinary synchronous video+audio transcoding fails or takes too long, causing a black screen on the client.
          // ReelItem.tsx already plays the music locally from layersData anyway.
          if (transformations.length > 0) {
            finalUrl = finalUrl.replace('/upload/', `/upload/${transformations.join(',')}/`);
          }

          // Prepare metadata JSON
          const metadata = {
            layers,
            timeline: timelineData,
            music: musicData
          };

          // Save to backend DB
          const res = await apiClient.post('/reels', {
            mediaUrl: finalUrl,
            thumbnailUrl: finalUrl.replace(/\.[^/.]+$/, ".jpg"), // auto-generate thumbnail from video via cloudinary
            mediaType: type === 'video' ? 'VIDEO' : 'PHOTO',
            description: text || '',
            category: category || 'comedy', // Use selected category or default
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
            layersData: JSON.stringify(metadata)
          });
          
          const backendReel = res.data;
          
          // Format into frontend Reel model
          const formattedReel = {
            id: backendReel.id,
            creatorId: userProfile.id,
            creatorName: userProfile.name || 'User',
            creatorUsername: userProfile.username || 'user',
            creatorAvatar: userProfile.avatar || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200',
            creatorIsVerified: userProfile.isVerified || false,
        videoUrl: backendReel.mediaUrl, // Android .mov handling is done in feed fetch, but here it's freshly uploaded mp4/mov
            thumbnailUrl: backendReel.thumbnailUrl || backendReel.mediaUrl,
            mediaType: backendReel.mediaType || (type === 'video' ? 'VIDEO' : 'PHOTO'),
            description: backendReel.description || '',
            musicName: backendReel.musicName || 'Original Audio',
            likesCount: 0,
            commentsCount: 0,
            savesCount: 0,
            sharesCount: 0,
            viewsCount: 0,
            isLiked: false,
            isSaved: false,
            isFollowed: false, // You cannot follow yourself, but it satisfies the Reel type
            category: backendReel.category || 'comedy',
            isMonetized: backendReel.isMonetized !== undefined ? backendReel.isMonetized : true,
            location: location ? JSON.parse(location as string) : (city ? { city } : undefined),
            layersData: backendReel.layersData || JSON.stringify(metadata)
          };

          console.log(`[SHARE STORY] Reel Uploaded successfully. ID: ${formattedReel.id}`);
          console.log(`[SHARE STORY] Uploaded reel user_id: ${formattedReel.creatorId}`);
          console.log(`[SHARE STORY] Authenticated user id: ${userProfile.id}`);

          console.log(`[SHARE STORY] Injecting Reel ID: ${formattedReel.id} directly into feedStore using addLocalReel()`);

          // Optimistically add to local feed and profile immediately
          addLocalReel(formattedReel);

          // Do NOT call fetchReels(1, 10, 'all') here!
          // Calling fetchReels replaces the state with an algorithmic shuffle from the backend, 
          // which will likely overwrite and hide the user's newly uploaded reel (due to 100 take + shuffle).
          // addLocalReel is sufficient to make it appear instantly in both feeds.

        } else {
          let finalUrl = decodedUri;

          if (!originalStoryId && decodedUri) {
            // It's a new Story! Upload to Cloudinary first
            const sigResponse = await apiClient.get('/upload/signature?folder=stories');
            const { timestamp, signature, cloudName, apiKey, folder } = sigResponse.data;

            const uploadTask = FileSystem.createUploadTask(
              `https://api.cloudinary.com/v1_1/${cloudName}/${type === 'video' ? 'video' : 'image'}/upload`,
              decodedUri,
              {
                httpMethod: 'POST',
                // @ts-ignore
                uploadType: 1, // FileSystemUploadType.MULTIPART
                fieldName: 'file',
                mimeType: type === 'video' ? 'video/mp4' : 'image/jpeg',
                parameters: {
                  api_key: String(apiKey || ''),
                  timestamp: String(timestamp || ''),
                  signature: String(signature || ''),
                  folder: String(folder || '')
                }
              },
              (data) => {
                const percentCompleted = Math.round((data.totalBytesSent / data.totalBytesExpectedToSend) * 100);
                setUploadProgress(percentCompleted);
              }
            );
            
            const uploadRes = await uploadTask.uploadAsync();
            if (!uploadRes || uploadRes.status !== 200) {
              throw new Error(`Cloudinary upload failed: ${uploadRes?.body || 'Unknown error'}`);
            }
            const uploadData = JSON.parse(uploadRes.body);
            if (!uploadData.secure_url) throw new Error('Cloudinary upload failed');

            finalUrl = uploadData.secure_url;
            const transformations = [];
            if (type === 'video') {
              if (speed === '2') transformations.push('e_accelerate:100');
              if (speed === '3') transformations.push('e_accelerate:200');
            }
            if (effect === 'Paris') transformations.push('e_art:zorro');
            if (effect === 'Vintage') transformations.push('e_sepia');
            if (effect === 'Neon') transformations.push('e_tint:100:blue:purple');
            if (effect === 'B&W') transformations.push('e_grayscale');
            if (effect === 'Blur') transformations.push('e_blur:300');
            if (isVideoMuted === 'true') transformations.push('e_volume:mute');
            // Cloudinary synchronous video+audio transcoding fails or takes too long, causing a black screen on the client.
            // StoryViewer / ReelItem already plays the music locally from layersData anyway.

            if (transformations.length > 0) {
              finalUrl = finalUrl.replace('/upload/', `/upload/${transformations.join(',')}/`);
            }
          }

          // Prepare metadata JSON
          const metadata = {
            layers,
            timeline: timelineData,
            music: musicData
          };

          // Extract mentioned usernames from layers
          const extractedMentions: string[] = [];
          if (layers && Array.isArray(layers)) {
            layers.forEach((layer: any) => {
              if (layer.type === 'interactive' && layer.content?.type === 'mention' && layer.content?.text) {
                extractedMentions.push(layer.content.text);
              }
            });
          }

          // ALWAYS Save to backend DB as public or close friends story
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

          // Optimistic UI update
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
            createdAt: res.data.createdAt
          });

          if (target === 'share' && targetUserIds) {
            // Direct Message Share
            let parsedIds: string[] = [];
            try {
              parsedIds = JSON.parse(targetUserIds);
            } catch (e) {
              console.error("Failed to parse targetUserIds", e);
            }

            // Iterate over each selected user and send a message
            for (const userId of parsedIds) {
              await sendDirectMessage({ id: userId }, `[STORY:${storyId}] Hey, I shared a story with you!`, finalUrl);
            }
          }
        }

        setStatus('success');
        
        // Fetch stories immediately so the new story is available in local state
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
        setTimeout(() => {
          router.back();
        }, 2000);
      }
    };

    uploadMedia();
  }, []);

  return (
    <View className="flex-1 bg-[#12081E] items-center justify-center">
      {status === 'uploading' ? (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="items-center"
        >
          <ActivityIndicator size="large" color="#A855F7" />
          <Text className="text-white mt-4 font-bold text-lg">
            {target === 'share' ? 'Sending...' : (isStory === 'true' ? 'Posting Story...' : (mode === 'REEL' ? 'Posting Reel...' : 'Posting Post...'))} {uploadProgress > 0 ? `${uploadProgress}%` : ''}
          </Text>
          <View className="w-48 h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
            <View className="h-full bg-[#A855F7] rounded-full" style={{ width: `${uploadProgress}%` }} />
          </View>
          <Text className="text-neutral-grey mt-4 text-sm text-center px-6">
            {target === 'share' 
              ? 'Sending direct messages to your friends'
              : (isStory === 'true' 
                 ? (target === 'close_friends' ? 'Sharing with Close Friends' : 'Sharing to Your Story')
                 : (mode === 'REEL' ? 'Posting to Reels...' : 'Posting to Feed...'))}
          </Text>
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
            {target === 'share' ? 'Sent!' : (isStory === 'true' ? 'Story Posted!' : (mode === 'REEL' ? 'Reel Posted!' : 'Post Shared!'))}
          </Text>
        </MotiView>
      )}
    </View>
  );
}
