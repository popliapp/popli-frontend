import React, { useState } from 'react';
import { View, Text, Pressable, Dimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Check, X, Mic } from 'lucide-react-native';
import { VideoPlayer } from 'expo-video';
import { useAudioRecorder, AudioModule } from 'expo-audio';

const { width } = Dimensions.get('window');

const TIMELINE_WIDTH = width - 40; // 20px padding on each side
const HANDLE_WIDTH = 20;

export interface ReelTimelineData {
  trimStart: number;
  trimEnd: number;
  voiceOverPaths: string[]; // URLs of voice over recordings
}

interface ReelTimelineEditorProps {
  player?: VideoPlayer;
  duration: number; // Total duration of video in seconds
  initialData?: ReelTimelineData;
  onComplete: (data: ReelTimelineData) => void;
  onCancel: () => void;
  onScrub?: (time: number) => void; // Called when user drags handles to preview
}

export default function ReelTimelineEditor({ player, duration, initialData, onComplete, onCancel, onScrub }: ReelTimelineEditorProps) {
  // Shared values for the handles (0 to 1 representing percentage)
  const startPercent = useSharedValue(initialData?.trimStart !== undefined && duration > 0 ? initialData.trimStart / duration : 0);
  const endPercent = useSharedValue(initialData?.trimEnd !== undefined && duration > 0 ? initialData.trimEnd / duration : 1);
  
  // Voice over state
  const recorder = useAudioRecorder({} as any);
  const [voiceOverPaths, setVoiceOverPaths] = useState<string[]>(initialData?.voiceOverPaths || []);

  const toggleRecording = async () => {
    try {
      if (recorder.isRecording) {
        // Stop recording
        await recorder.stop();
        if (recorder.uri) {
          setVoiceOverPaths(prev => [...prev, recorder.uri!]);
        }
      } else {
        // Start recording
        const { status } = await AudioModule.requestRecordingPermissionsAsync();
        if (status === 'granted') {
          recorder.record();
        }
      }
    } catch (err) {
      console.error('Failed to handle recording', err);
    }
  };

  const handleDone = () => {
    onComplete({
      trimStart: startPercent.value * duration,
      trimEnd: endPercent.value * duration,
      voiceOverPaths: voiceOverPaths
    });
  };

  // Safe JS wrappers for video player (Worklets cannot capture the player object)
  const handlePause = () => {
    if (player) player.pause();
  };

  const handlePlay = () => {
    if (player) player.play();
  };

  const handleSeek = (time: number) => {
    if (player) player.seekBy(time - player.currentTime);
  };

  const handleScrub = (time: number) => {
    if (onScrub) onScrub(time);
  };

  const leftHandleGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(handlePause)();
    })
    .onChange((e) => {
      let newPercent = startPercent.value + (e.changeX / TIMELINE_WIDTH);
      if (newPercent < 0) newPercent = 0;
      if (newPercent > endPercent.value - 0.1) newPercent = endPercent.value - 0.1; // minimum 10% gap
      startPercent.value = newPercent;
      
      const newTime = newPercent * duration;
      runOnJS(handleSeek)(newTime);
      runOnJS(handleScrub)(newTime);
    })
    .onEnd(() => {
      runOnJS(handlePlay)();
    });

  const rightHandleGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(handlePause)();
    })
    .onChange((e) => {
      let newPercent = endPercent.value + (e.changeX / TIMELINE_WIDTH);
      if (newPercent > 1) newPercent = 1;
      if (newPercent < startPercent.value + 0.1) newPercent = startPercent.value + 0.1;
      endPercent.value = newPercent;
      
      const newTime = newPercent * duration;
      runOnJS(handleSeek)(newTime);
      runOnJS(handleScrub)(newTime);
    })
    .onEnd(() => {
      const newTime = startPercent.value * duration;
      runOnJS(handleSeek)(newTime);
      runOnJS(handlePlay)();
    });

  const leftHandleStyle = useAnimatedStyle(() => {
    return {
      left: startPercent.value * TIMELINE_WIDTH,
    };
  });

  const rightHandleStyle = useAnimatedStyle(() => {
    return {
      left: endPercent.value * TIMELINE_WIDTH,
    };
  });

  const overlayLeftStyle = useAnimatedStyle(() => {
    return {
      width: startPercent.value * TIMELINE_WIDTH,
    };
  });

  const overlayRightStyle = useAnimatedStyle(() => {
    return {
      left: endPercent.value * TIMELINE_WIDTH,
      width: TIMELINE_WIDTH - (endPercent.value * TIMELINE_WIDTH),
    };
  });

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <View className="flex-1 bg-black/70 z-50">
        
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 pt-16 pb-4">
          <Pressable onPress={onCancel} className="w-10 h-10 items-center justify-center bg-white/20 rounded-full">
            <X size={24} color="#FFF" />
          </Pressable>
          <Text className="text-white font-bold text-lg">Edit Video</Text>
          <Pressable onPress={handleDone} className="bg-white px-4 py-2 rounded-full flex-row items-center gap-2">
            <Check size={16} color="#000" />
            <Text className="text-black font-bold">Done</Text>
          </Pressable>
        </View>

        {/* Video Preview Area (Empty space to see the video underneath) */}
        <View className="flex-1" />

        {/* Voice Over Controls */}
        <View className="items-center mb-8">
          <Pressable 
            onPress={toggleRecording}
            className={`w-16 h-16 rounded-full items-center justify-center ${recorder.isRecording ? 'bg-red-500' : 'bg-white/20'}`}
          >
            <Mic size={28} color="#FFF" />
          </Pressable>
          <Text className="text-white mt-2 font-bold">{recorder.isRecording ? 'Recording...' : 'Voice Over'}</Text>
          {voiceOverPaths.length > 0 && (
            <Text className="text-white/50 text-xs mt-1">{voiceOverPaths.length} recording(s)</Text>
          )}
        </View>

        {/* Timeline Area */}
        <View className="px-5 pb-12">
          <View className="h-20 bg-white/10 rounded-xl relative overflow-hidden" style={{ width: TIMELINE_WIDTH }}>
            {/* Fake Video Thumbnails */}
            <View className="absolute inset-0 flex-row">
              {[1,2,3,4,5,6].map(i => (
                <View key={i} className={`flex-1 border-r border-white/5 ${i % 2 === 0 ? 'bg-purple-900/40' : 'bg-purple-800/40'}`} />
              ))}
            </View>

            {/* Darkened out-of-bounds areas */}
            <Animated.View style={[overlayLeftStyle, { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.7)' }]} />
            <Animated.View style={[overlayRightStyle, { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)' }]} />

            {/* Selection Box Borders */}
            <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, borderColor: '#A855F7', borderWidth: 2, borderLeftWidth: 0, borderRightWidth: 0 }, useAnimatedStyle(() => ({
              left: startPercent.value * TIMELINE_WIDTH,
              width: (endPercent.value - startPercent.value) * TIMELINE_WIDTH
            }))]} />

            {/* Left Handle */}
            <GestureDetector gesture={leftHandleGesture}>
              <Animated.View 
                style={[leftHandleStyle, { position: 'absolute', top: 0, bottom: 0, width: HANDLE_WIDTH, backgroundColor: '#A855F7', borderTopLeftRadius: 8, borderBottomLeftRadius: 8, justifyContent: 'center', alignItems: 'center' }]}
              >
                <View className="w-1 h-6 bg-white rounded-full" />
              </Animated.View>
            </GestureDetector>

            {/* Right Handle */}
            <GestureDetector gesture={rightHandleGesture}>
              <Animated.View 
                style={[rightHandleStyle, { position: 'absolute', top: 0, bottom: 0, width: HANDLE_WIDTH, marginLeft: -HANDLE_WIDTH, backgroundColor: '#A855F7', borderTopRightRadius: 8, borderBottomRightRadius: 8, justifyContent: 'center', alignItems: 'center' }]}
              >
                <View className="w-1 h-6 bg-white rounded-full" />
              </Animated.View>
            </GestureDetector>
          </View>
        </View>

      </View>
    </GestureHandlerRootView>
  );
}
