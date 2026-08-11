import React from 'react';
import { View, Text, ActivityIndicator, Platform, Modal, Pressable } from 'react-native';
import { showError } from '../../store/toastStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStoryStore, useAuthStore, useFeedStore, useEditorStore, useChatStore } from '../../store';
import { useReelUploadStore } from '../../store/reelUploadStore';
import { MotiView } from 'moti';
import { CheckCircle } from 'lucide-react-native';
import { apiClient, BASE_URL } from '../../api/client';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadImageToR2 } from '../../api/upload';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { pollAndAdvanceUpload, registerReelUploadBackgroundTask, setupNotificationChannel } from '../../tasks/reelUploadTask';
import * as Crypto from 'expo-crypto';

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
  const { setTask, updateTask, clearTask } = useReelUploadStore();

const [status, setStatus] = React.useState<'choice' | 'uploading' | 'success' | 'error'>('uploading');
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);
  const [statusText, setStatusText] = React.useState<string>('Preparing...');
  const [showChoiceModal, setShowChoiceModal] = React.useState(false);
  const [uploadId, setUploadId] = React.useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = React.useState<string | null>(null);
  const [isVideoUpload, setIsVideoUpload] = React.useState(false);

  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const backgroundModeRef = React.useRef(false);

  const isStoryPost = isStory === 'true' || (mode !== 'REEL' && mode !== 'POST');

  React.useEffect(() => {
    const isReelOrPostVideo = (mode === 'REEL' || mode === 'POST') && isStory !== 'true' && type === 'video';
    const isStoryMedia = isStoryPost && !originalStoryId;
    if (isReelOrPostVideo || isStoryMedia) {
      setShowChoiceModal(true);
    } else {
      startUpload(false);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startUpload = async (background: boolean) => {
    backgroundModeRef.current = background;
    setShowChoiceModal(false);
    try {
      if (!uri && mode !== 'text' && !originalStoryId) throw new Error('No media URI provided');

      let decodedUri = uri ? decodeURIComponent(uri) : '';

      if (decodedUri && Platform.OS === 'android' && !decodedUri.startsWith('file://') && !decodedUri.startsWith('content://') && !decodedUri.startsWith('http')) {
        decodedUri = 'file://' + decodedUri;
      }

      if (decodedUri) {
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
          setIsVideoUpload(true);
  if (background) {
            const { ReelUploadNative } = require('../../../modules/reel-upload');
            const idempotencyKey = await Crypto.randomUUID();
            const reelPayload = {
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
            };
            setTask({
              taskId: idempotencyKey,
              idempotencyKey,
              uploadId: null,
              cfState: 'queued',
              pctComplete: 0,
              status: 'uploading',
              errorMessage: null,
              reelPayload,
              localUri: decodedUri,
              thumbnailUri: null,
              createdAt: Date.now(),
            });
            await ReelUploadNative.startUpload({
              localUri: decodedUri,
              thumbnailUrl: undefined,
              reelPayload,
              idempotencyKey,
              taskId: idempotencyKey,
            });
            router.replace('/(tabs)/reels');
            return;
          }

  let customThumbnailUrl: string | undefined;
          let thumbLocalUri: string | undefined;

          try {
            setStatusText('Generating thumbnail...');
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(decodedUri, { time: 1000 });
            thumbLocalUri = thumbUri;
            setStatusText('Uploading thumbnail...');
            customThumbnailUrl = await uploadImageToR2(thumbUri, 'thumbnails');
          } catch (thumbErr: any) {
            try {
              const { uri: thumbUri2 } = await VideoThumbnails.getThumbnailAsync(decodedUri, { time: 0 });
              thumbLocalUri = thumbUri2;
              customThumbnailUrl = await uploadImageToR2(thumbUri2, 'thumbnails');
            } catch {
              customThumbnailUrl = undefined;
            }
          }

          setThumbnailUri(customThumbnailUrl || null);
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
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          if (uploadRes.status < 200 || uploadRes.status >= 300) {
            throw new Error(`Video upload failed: ${uploadRes.status}`);
          }

          const uploadData = JSON.parse(uploadRes.body);
          const cfUploadId = uploadData.uploadId;
          setUploadId(cfUploadId);

          const idempotencyKey = await Crypto.randomUUID();

          const reelPayload = {
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
          };
          setUploadProgress(0);
          setStatusText('Queued...');

          let assetData: any = null;
          let attempts = 0;
          const maxAttempts = 40;

          while (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 4000));
            attempts++;
            try {
              const pollRes = await apiClient.get(`/video/asset?uploadId=${cfUploadId}`);
              const cfState = pollRes.data.status;
              const cfPct = typeof pollRes.data.pctComplete === 'number' ? pollRes.data.pctComplete : null;

              if (cfState === 'ready') {
                assetData = pollRes.data;
                break;
              } else if (cfState === 'error') {
                throw new Error('Video processing failed. Please try again.');
              } else if (cfState === 'inprogress') {
                setStatusText('Processing video...');
                setUploadProgress(cfPct !== null ? Math.round(cfPct) : 0);
              } else {
                setStatusText('Queued...');
                setUploadProgress(0);
              }
            } catch (e: any) {
              if (e.message?.includes('processing failed')) throw e;
            }
          }

          if (!assetData) throw new Error('Video processing timed out. Please try again.');

          setUploadProgress(98);
          setStatusText('Saving reel...');

          const playbackUrl = assetData.mediaUrl;
          const res = await apiClient.post('/reels', {
            ...reelPayload,
            mediaUrl: playbackUrl,
            thumbnailUrl: customThumbnailUrl || assetData.thumbnailUrl || playbackUrl,
            muxAssetId: assetData.assetId,
            muxPlaybackId: assetData.playbackId,
            muxUploadId: cfUploadId,
            durationSeconds: Math.round(assetData.duration || 0),
            idempotencyKey,
          });

          const backendReel = res.data;
          addLocalReel({
            id: backendReel.id,
            creatorId: userProfile.id,
            creatorName: userProfile.name || 'User',
            creatorUsername: userProfile.username || 'user',
            creatorAvatar: userProfile.avatar || '',
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
            layersData: backendReel.layersData || JSON.stringify(metadata),
          });

        } else {
          setStatusText('Uploading image...');
          const folder = mode === 'REEL' ? 'posts' : 'posts';
          const finalUrl = await uploadImageToR2(decodedUri, folder);
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
          addLocalReel({
            id: backendReel.id,
            creatorId: userProfile.id,
            creatorName: userProfile.name || 'User',
            creatorUsername: userProfile.username || 'user',
            creatorAvatar: userProfile.avatar || '',
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
            layersData: backendReel.layersData || JSON.stringify(metadata),
          });
        }

 } else {
        const isPrivateStory = target === 'close_friends' || target === 'share';

        if (background) {
          const { StoryUploadNative } = require('../../../modules/reel-upload/story-upload-native');
          const storyIdKey = await Crypto.randomUUID();
          const storyPayloadBg = {
            mediaType: type === 'video' ? 'VIDEO' : 'PHOTO',
            isCloseFriends: isPrivateStory,
            repliesAllowed: true,
            layersData: JSON.stringify({ layers, timeline: timelineData, music: musicData }),
            originalStoryId: originalStoryId ?? undefined,
            originalOwnerId: originalOwnerId ?? undefined,
            originalOwnerUsername: originalOwnerUsername ?? undefined,
          };
          const { setStoryTask } = useReelUploadStore.getState();
          setStoryTask({
            taskId: storyIdKey,
            idempotencyKey: storyIdKey,
            mediaType: type === 'video' ? 'VIDEO' : 'IMAGE',
            cfState: null,
            pctComplete: 0,
            status: 'uploading',
            errorMessage: null,
            storyPayload: storyPayloadBg,
            localUri: decodedUri,
            createdAt: Date.now(),
          });
          await StoryUploadNative.startUpload({
            localUri: decodedUri,
            mediaType: type === 'video' ? 'VIDEO' : 'IMAGE',
            storyPayload: storyPayloadBg,
            idempotencyKey: storyIdKey,
            taskId: storyIdKey,
          });
          router.replace('/(tabs)/reels');
          return;
        }

        let finalUrl = decodedUri;
        let cfVideoId: string | undefined;

  if (!originalStoryId && decodedUri) {
          if (type === 'video') {
            setIsVideoUpload(true);
            setStatusText('Uploading story video...');
            const { token } = useAuthStore.getState();

            const uploadTimeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Story video upload timed out. Please try again.')), 120000)
            );
            const uploadRes = await Promise.race([
              FileSystem.uploadAsync(
                `${BASE_URL}/video/upload`,
                decodedUri,
                {
                  httpMethod: 'POST',
                  uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                  fieldName: 'file',
                  mimeType: 'video/mp4',
                  headers: { Authorization: `Bearer ${token}` },
                },
              ),
              uploadTimeoutPromise,
            ]);

            if (uploadRes.status < 200 || uploadRes.status >= 300) {
              throw new Error(`Story video upload failed: ${uploadRes.status}`);
            }

            let uploadData: any;
            try {
              uploadData = JSON.parse(uploadRes.body);
            } catch (e) {
              throw new Error('Story video upload returned invalid response. Please try again.');
            }

            const cfUploadId = uploadData?.uploadId;
            if (!cfUploadId) {
              throw new Error('Story video upload did not return a valid ID. Please try again.');
            }

            cfVideoId = cfUploadId;
            setUploadProgress(0);
            setStatusText('Queued...');
            let assetData: any = null;
            let attempts = 0;
            while (attempts < 40) {
              await new Promise((r) => setTimeout(r, 4000));
              attempts++;
              try {
                const pollRes = await apiClient.get(`/video/asset?uploadId=${cfUploadId}`);
                const cfState = pollRes.data.status;
                const cfPct = typeof pollRes.data.pctComplete === 'number' ? pollRes.data.pctComplete : null;
                if (cfState === 'ready') {
                  assetData = pollRes.data;
                  break;
                } else if (cfState === 'error') {
                  throw new Error('Story video processing failed. Please try again.');
                } else if (cfState === 'inprogress') {
                  setStatusText('Processing story video...');
                  setUploadProgress(cfPct !== null ? Math.round(cfPct) : 0);
                } else {
                  setStatusText('Queued...');
                  setUploadProgress(0);
                }
              } catch (e: any) {
                if (e.message?.includes('processing failed')) throw e;
              }
            }
            if (!assetData) throw new Error('Story video processing timed out. Please try again.');
            if (!assetData.mediaUrl) throw new Error('Story video URL missing after processing. Please try again.');
            finalUrl = assetData.mediaUrl;
            setUploadProgress(98);
          } else {
            setStatusText('Uploading story...');
            finalUrl = await uploadImageToR2(decodedUri, 'stories');
            setUploadProgress(70);
          }
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

        const storyIdempotencyKey = await Crypto.randomUUID();
        const res = await apiClient.post('/stories', {
          mediaUrl: finalUrl,
          mediaType: type === 'video' ? 'VIDEO' : 'PHOTO',
          isCloseFriends: isPrivateStory,
          repliesAllowed: true,
          layersData: JSON.stringify({ layers, timeline: timelineData, music: musicData }),
          mentionedUsernames: extractedMentions,
          originalStoryId,
          originalOwnerId,
          originalOwnerUsername,
          cfVideoId: cfVideoId ?? undefined,
          idempotencyKey: storyIdempotencyKey,
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
          layersData: { layers, timeline: timelineData, music: musicData },
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

  const label = target === 'share'
    ? 'Sending...'
    : isStory === 'true'
      ? 'Posting Story...'
      : mode === 'REEL'
        ? 'Posting Reel...'
        : 'Posting...';

  return (
    <View style={{ flex: 1, backgroundColor: '#12081E', alignItems: 'center', justifyContent: 'center' }}>
<Modal
        visible={showChoiceModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#1A0E2C', borderRadius: 20, padding: 28, width: '100%', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
              {isStoryPost ? 'Post Story' : 'Post Reel'}
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 22, marginBottom: 28 }}>
              {isStoryPost
                ? 'Your Story can continue uploading in the background while you use Popli.'
                : 'Your Reel can continue uploading in the background while you use Popli.'}
            </Text>
            <Pressable
              onPress={() => startUpload(false)}
              style={{ backgroundColor: '#A855F7', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12 }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>Keep posting here</Text>
            </Pressable>
            <Pressable
              onPress={() => startUpload(true)}
              style={{ backgroundColor: 'rgba(168,85,247,0.15)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)' }}
            >
              <Text style={{ color: '#A855F7', fontWeight: 'bold', fontSize: 16 }}>Post in background</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {!showChoiceModal && (
        status === 'uploading' ? (
          <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#A855F7" />
            <Text style={{ color: '#FFFFFF', marginTop: 16, fontWeight: 'bold', fontSize: 18 }}>
              {label} {uploadProgress > 0 ? `${uploadProgress}%` : ''}
            </Text>
            <View style={{ width: 192, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, marginTop: 16, overflow: 'hidden' }}>
              <View style={{ height: '100%', backgroundColor: '#A855F7', borderRadius: 4, width: `${uploadProgress}%` }} />
            </View>
            <Text style={{ color: '#9CA3AF', marginTop: 16, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 }}>{statusText}</Text>
          </MotiView>
        ) : status === 'error' ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 24 }}>Failed</Text>
          </View>
        ) : (
          <MotiView
            from={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            style={{ alignItems: 'center' }}
          >
            <View style={{ width: 80, height: 80, backgroundColor: 'rgba(16,185,129,0.2)', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <CheckCircle size={40} color="#10B981" />
            </View>
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 24 }}>
              {target === 'share' ? 'Sent!' : isStory === 'true' ? 'Story Posted!' : mode === 'REEL' ? 'Reel Posted!' : 'Post Shared!'}
            </Text>
          </MotiView>
        )
      )}
    </View>
  );
}