import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReelUploadStore } from '../store/reelUploadStore';
import { useRouter } from 'expo-router';
import { NativeModules, NativeEventEmitter } from 'react-native';
import { useFeedStore } from '../store/feedStore';
import { useAuthStore } from '../store/authStore';

const { ReelUploadModule } = NativeModules;

export default function ReelUploadBanner() {
  const { task, updateTask, clearTask } = useReelUploadStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const listenerRef = useRef<any>(null);

  useEffect(() => {
    if (!ReelUploadModule) return;

    ReelUploadModule.getCurrentStatus().then((nativeStatus: any) => {
      if (!nativeStatus || nativeStatus.status === 'idle') return;
      if (!task) return;
      updateTask({
        status: nativeStatus.status,
        cfState: nativeStatus.cfState,
        pctComplete: nativeStatus.pctComplete ?? 0,
        errorMessage: nativeStatus.errorMessage,
      });

      if (nativeStatus.status === 'done' && nativeStatus.createdReelJson) {
        try {
          const reel = JSON.parse(nativeStatus.createdReelJson);
          const { addLocalReel } = useFeedStore.getState();
          const { userProfile } = useAuthStore.getState();
          if (reel.id) {
            addLocalReel({
              id: reel.id,
              creatorId: userProfile?.id || '',
              creatorName: userProfile?.name || 'User',
              creatorUsername: userProfile?.username || 'user',
              creatorAvatar: userProfile?.avatar || '',
              creatorIsVerified: userProfile?.isVerified || false,
              videoUrl: reel.mediaUrl || '',
              thumbnailUrl: reel.thumbnailUrl || '',
              mediaType: 'VIDEO',
              description: reel.description || '',
              musicName: reel.musicName || 'Original Audio',
              likesCount: 0,
              commentsCount: 0,
              savesCount: 0,
              sharesCount: 0,
              viewsCount: 0,
              isLiked: false,
              isSaved: false,
              isFollowed: false,
              category: reel.category || 'comedy',
              isMonetized: reel.isMonetized !== undefined ? reel.isMonetized : true,
              layersData: reel.layersData,
            });
          }
        } catch (e) {}
        ReelUploadModule.clearStatus();
        setTimeout(() => clearTask(), 5000);
      }
    }).catch(() => {});

    const emitter = new NativeEventEmitter(ReelUploadModule);
    listenerRef.current = emitter.addListener('ReelUploadProgress', (event: any) => {
      if (!task) return;
      updateTask({
        status: event.status,
        cfState: event.cfState,
        pctComplete: event.pctComplete ?? 0,
        errorMessage: event.errorMessage,
      });

      if (event.status === 'done') {
        ReelUploadModule.getCurrentStatus().then((s: any) => {
          if (s?.createdReelJson) {
            try {
              const reel = JSON.parse(s.createdReelJson);
              const { addLocalReel } = useFeedStore.getState();
              const { userProfile } = useAuthStore.getState();
              if (reel.id) {
                addLocalReel({
                  id: reel.id,
                  creatorId: userProfile?.id || '',
                  creatorName: userProfile?.name || 'User',
                  creatorUsername: userProfile?.username || 'user',
                  creatorAvatar: userProfile?.avatar || '',
                  creatorIsVerified: userProfile?.isVerified || false,
                  videoUrl: reel.mediaUrl || '',
                  thumbnailUrl: reel.thumbnailUrl || '',
                  mediaType: 'VIDEO',
                  description: reel.description || '',
                  musicName: reel.musicName || 'Original Audio',
                  likesCount: 0,
                  commentsCount: 0,
                  savesCount: 0,
                  sharesCount: 0,
                  viewsCount: 0,
                  isLiked: false,
                  isSaved: false,
                  isFollowed: false,
                  category: reel.category || 'comedy',
                  isMonetized: reel.isMonetized !== undefined ? reel.isMonetized : true,
                  layersData: reel.layersData,
                });
              }
            } catch (e) {}
            ReelUploadModule.clearStatus();
            setTimeout(() => clearTask(), 5000);
          }
        }).catch(() => {});
      }
    });

    return () => {
      listenerRef.current?.remove();
    };
  }, [task?.taskId]);

  useEffect(() => {
    if (!task || task.status === 'done' || task.status === 'failed') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [task?.status]);

  if (!task || task.status === 'idle') return null;

  const getContent = () => {
    switch (task.status) {
      case 'uploading': return { label: 'Uploading reel...', color: '#A855F7' };
      case 'polling':
        return {
          label: task.cfState === 'inprogress'
            ? `Processing... ${task.pctComplete > 0 ? task.pctComplete + '%' : ''}`
            : 'Queued...',
          color: '#A855F7',
        };
      case 'creating': return { label: 'Saving reel...', color: '#A855F7' };
      case 'done': return { label: 'Reel posted!', color: '#10B981' };
      case 'failed': return { label: task.errorMessage || 'Upload failed', color: '#EF4444' };
      default: return null;
    }
  };

  const content = getContent();
  if (!content) return null;

return (
    <View
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999,
        paddingTop: insets.top + 6,
        alignItems: 'center',
        pointerEvents: 'box-none',
      }}
    >
      <Pressable
        onPress={() => { if (task.status === 'failed') { ReelUploadModule?.clearStatus(); clearTask(); } }}
        style={{
          backgroundColor: 'rgba(30, 21, 51, 0.92)',
          borderRadius: 999,
          borderWidth: 1,
          borderColor: content.color + '4D',
          paddingHorizontal: 16,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          shadowColor: '#7e3bdc',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        {task.status !== 'done' && task.status !== 'failed' && (
          <Animated.View style={{
            width: 9, height: 9, borderRadius: 5,
            backgroundColor: content.color,
            opacity: pulseAnim,
          }} />
        )}
        <Text style={{ color: '#F3E8FF', fontSize: 13, fontWeight: '600' }}>
          {content.label}
        </Text>
        {task.status === 'failed' && (
          <Text style={{ color: '#9CA3AF', fontSize: 12, marginLeft: 4 }}>Tap to dismiss</Text>
        )}
      </Pressable>
    </View>
  );
}