import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReelUploadStore } from '../store/reelUploadStore';
import { NativeModules, NativeEventEmitter } from 'react-native';
import { useStoryStore } from '../store/storyStore';

const { ReelUploadModule } = NativeModules;

export default function StoryUploadBanner() {
  const { storyTask, updateStoryTask, clearStoryTask } = useReelUploadStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const listenerRef = useRef<any>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!ReelUploadModule) return;

    ReelUploadModule.getStoryStatus().then((nativeStatus: any) => {
      if (!nativeStatus || nativeStatus.status === 'idle') return;
      if (!storyTask) return;
      updateStoryTask({
        status: nativeStatus.status,
        cfState: nativeStatus.cfState,
        pctComplete: nativeStatus.pctComplete ?? 0,
        errorMessage: nativeStatus.errorMessage,
      });

      if (nativeStatus.status === 'done') {
        const { fetchStories } = useStoryStore.getState();
        fetchStories().catch(() => {});
        ReelUploadModule.clearStoryStatus();
        setTimeout(() => clearStoryTask(), 5000);
      }
    }).catch(() => {});

    const emitter = new NativeEventEmitter(ReelUploadModule);
    listenerRef.current = emitter.addListener('StoryUploadProgress', (event: any) => {
      if (!storyTask) return;
      updateStoryTask({
        status: event.status,
        cfState: event.cfState,
        pctComplete: event.pctComplete ?? 0,
        errorMessage: event.errorMessage,
      });

      if (event.status === 'done') {
        const { fetchStories } = useStoryStore.getState();
        fetchStories().catch(() => {});
        ReelUploadModule.clearStoryStatus();
        setTimeout(() => clearStoryTask(), 5000);
      }
    });

    return () => {
      listenerRef.current?.remove();
    };
  }, [storyTask?.taskId]);

  useEffect(() => {
    if (!storyTask || storyTask.status === 'done' || storyTask.status === 'failed') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [storyTask?.status]);

  if (!storyTask || storyTask.status === 'idle') return null;

  const getContent = () => {
    switch (storyTask.status) {
      case 'uploading':
        return { label: storyTask.mediaType === 'VIDEO' ? 'Uploading story video...' : 'Uploading story image...', color: '#A855F7' };
      case 'polling':
        return {
          label: storyTask.cfState === 'inprogress'
            ? `Processing story... ${storyTask.pctComplete > 0 ? storyTask.pctComplete + '%' : ''}`
            : 'Queued...',
          color: '#A855F7',
        };
      case 'creating': return { label: 'Saving story...', color: '#A855F7' };
      case 'done': return { label: 'Story posted!', color: '#10B981' };
      case 'failed': return { label: storyTask.errorMessage || 'Story upload failed', color: '#EF4444' };
      default: return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  return (
    <View
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9998,
        paddingTop: insets.top + 54,
        alignItems: 'center',
        pointerEvents: 'box-none',
      }}
    >
      <Pressable
        onPress={() => {
          if (storyTask.status === 'failed') {
            ReelUploadModule?.clearStoryStatus();
            clearStoryTask();
          }
        }}
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
        {storyTask.status !== 'done' && storyTask.status !== 'failed' && (
          <Animated.View style={{
            width: 9, height: 9, borderRadius: 5,
            backgroundColor: content.color,
            opacity: pulseAnim,
          }} />
        )}
        <Text style={{ color: '#F3E8FF', fontSize: 13, fontWeight: '600' }}>
          {content.label}
        </Text>
        {storyTask.status === 'failed' && (
          <Text style={{ color: '#9CA3AF', fontSize: 12, marginLeft: 4 }}>Tap to dismiss</Text>
        )}
      </Pressable>
    </View>
  );
}