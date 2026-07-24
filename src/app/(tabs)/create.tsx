import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions, Image, Platform, AppState } from 'react-native';
import { showError } from '../../store/toastStore';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions, useMicrophonePermissions, CameraType, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { X, Settings, RefreshCcw, Zap, ZapOff, Aperture, Timer, Wand2, Music, ChevronDown, MonitorPlay, AlignCenter, Type, Mic, ListVideo, Scissors, SlidersHorizontal, Volume2 } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import CameraSettingsSheet from '../../components/CameraSettingsSheet';
import EffectsSheet from '../../components/sheets/EffectsSheet';
import { useCameraSettingsStore } from '../../store';
import { useAudioPlayer } from 'expo-audio';
import MusicPickerSheet from '../../components/sheets/MusicPickerSheet';
import Svg, { Circle, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = 80;
const PADDING_H = (width - ITEM_WIDTH) / 2;

type CameraMode = 'POST' | 'STORY' | 'REEL';

const MODES: CameraMode[] = ['POST', 'STORY', 'REEL'];

export default function CreateScreen() {
  const router = useRouter();
  
  // Camera Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  // Settings
  const cameraSettings = useCameraSettingsStore();
  const [showSettings, setShowSettings] = useState(false);

  // States
  const [activeMode, setActiveMode] = useState<CameraMode>('STORY');
  const [facing, setFacing] = useState<CameraType>(cameraSettings.mirrorFront ? 'front' : 'back');
  const [flash, setFlash] = useState<FlashMode>(cameraSettings.autoFlash ? 'auto' : 'off');
  const [isRecording, setIsRecording] = useState(false);
  const [timerDelay, setTimerDelay] = useState<0 | 3 | 10>(0);
  const [timerCountdown, setTimerCountdown] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  // New States for functional sweep
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 3>(1);
  const [selectedEffect, setSelectedEffect] = useState<any>({ name: 'None' });
  const [showEffectsSheet, setShowEffectsSheet] = useState(false);
  
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [selectedMusicTrack, setSelectedMusicTrack] = useState<any>(null);

  // Recording Timer State
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimeRef = useRef(0);
  const recordingInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Music state from params
  const { mode: paramMode, selectedMusicId, selectedMusicTitle, selectedMusicArtist, selectedMusicUrl, challengeId } = useLocalSearchParams<{ 
    mode?: CameraMode,
    selectedMusicId?: string, 
    selectedMusicTitle?: string, 
    selectedMusicArtist?: string,
    selectedMusicUrl?: string,
    challengeId?: string
  }>();

  // Audio Player
  const player = useAudioPlayer(selectedMusicUrl || null);

  const cameraRef = useRef<CameraView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      const onFocus = () => {
        setCameraKey(Date.now());
        setIsFocused(true);
        if (paramMode && MODES.includes(paramMode)) {
          setActiveMode(paramMode);
          setTimeout(() => {
            const index = MODES.indexOf(paramMode);
            scrollViewRef.current?.scrollTo({ x: index * ITEM_WIDTH, animated: true });
          }, 100);
        }
      };
      
      const timer = setTimeout(onFocus, 400);

      return () => {
        clearTimeout(timer);
        setIsFocused(false);
        try { player?.pause(); } catch(e) {}
      };
    }, [player, paramMode])
  );

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted && cameraPermission.canAskAgain) {
      requestCameraPermission();
    }
    if (micPermission && !micPermission.granted && micPermission.canAskAgain) {
      requestMicPermission();
    }
    
    // Snap scroll to STORY mode on mount
    setTimeout(() => {
      const storyIndex = MODES.indexOf('STORY');
      scrollViewRef.current?.scrollTo({ x: storyIndex * ITEM_WIDTH, animated: false });
    }, 100);
  }, [cameraPermission, micPermission]);

  const toggleFacing = () => setFacing(prev => prev === 'back' ? 'front' : 'back');
  const toggleFlash = () => setFlash(prev => prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off');
  const toggleTimer = () => setTimerDelay(prev => prev === 0 ? 3 : prev === 3 ? 10 : 0);

const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const handleClose = () => {
    if (isRecording) {
      setShowDiscardConfirm(true);
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / ITEM_WIDTH);
    if (index >= 0 && index < MODES.length && MODES[index] !== activeMode) {
      setActiveMode(MODES[index]);
    }
  };

  const handleModeClick = (index: number) => {
    scrollViewRef.current?.scrollTo({ x: index * ITEM_WIDTH, animated: true });
    setActiveMode(MODES[index]);
  };

  const toggleSpeed = () => setSpeedMultiplier(prev => prev === 1 ? 2 : prev === 2 ? 3 : 1);

  const [pendingRecording, setPendingRecording] = useState(false);

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo) {
        router.push({ 
          pathname: '/(create)/story-editor', 
          params: { 
            uri: photo.uri, 
            type: 'photo', 
            mode: activeMode, 
            challengeId,
            musicUrl: selectedMusicTrack?.audioUrl || null,
            musicName: selectedMusicTrack ? `${selectedMusicTrack.title} - ${selectedMusicTrack.artist}` : null
          } 
        });
      }
    } catch (err) {
      console.warn('Failed to take photo', err);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    setIsRecording(true);
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    player?.seekTo(0);
    player?.play();
    
    // Play selected music during recording (Karaoke mode)
    if (selectedMusicTrack?.audioUrl) {
      try {
        player?.replace(selectedMusicTrack.audioUrl);
        player?.play();
      } catch (err) {
        console.warn('Failed to play music during recording', err);
      }
    }
    
    if (activeMode === 'STORY') {
      // In STORY mode, we start in 'picture' mode to allow tapping for photos.
      // Long press switches state to 'isRecording', changing Camera mode to 'video'.
      // We must wait briefly for the native camera to switch modes before recording.
      setPendingRecording(true);
      return;
    }

    // REEL mode is already 'video'
    executeRecording();
  };

  const executeRecording = async () => {
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    recordingInterval.current = setInterval(() => {
      setRecordingTime(prev => {
        recordingTimeRef.current = prev + 1;
        return prev + 1;
      });
    }, 1000);

    try {
      const video = await cameraRef.current?.recordAsync({ maxDuration: activeMode === 'STORY' ? 30 : 60 });
      if (recordingInterval.current) clearInterval(recordingInterval.current);
      setIsRecording(false);

      if (video) {
      if (activeMode === 'REEL' && recordingTimeRef.current < 10) {
          showError('Reels must be at least 10 seconds long');
          return;
        }
        router.push({ 
          pathname: '/(create)/story-editor', 
          params: { 
            uri: video.uri, 
            type: 'video', 
            mode: activeMode,
            speed: speedMultiplier.toString(),
            effect: selectedEffect.name,
            musicId: selectedMusicTrack?.id || selectedMusicId,
            musicName: selectedMusicTrack ? `${selectedMusicTrack.title} - ${selectedMusicTrack.artist}` : selectedMusicTitle,
            challengeId
          } 
        });
      }
    } catch (err) {
      console.warn('Failed to record video', err);
      if (recordingInterval.current) clearInterval(recordingInterval.current);
      setIsRecording(false);
      player?.pause();
    }
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (pendingRecording && isRecording) {
      timer = setTimeout(() => {
        executeRecording();
        setPendingRecording(false);
      }, 600); // Wait 600ms for CameraView to switch to video mode
    }
    return () => clearTimeout(timer);
  }, [pendingRecording, isRecording]);

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
      setPendingRecording(false);
      if (recordingInterval.current) clearInterval(recordingInterval.current);
      player?.pause();
    }
  };

  const handleCapture = async () => {
    if (activeMode === 'REEL') {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
      return;
    }

    if (activeMode === 'STORY') {
      if (isRecording) {
        stopRecording();
        return;
      }
      takePhoto();
      return;
    }

    if (timerDelay > 0 && !isRecording) {
      setTimerCountdown(timerDelay);
      let count = timerDelay;
      const interval = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setTimerCountdown(count);
        } else {
          clearInterval(interval);
          setTimerCountdown(null);
          takePhoto();
        }
      }, 1000);
    } else {
      takePhoto();
    }
  };

  const openGallery = async () => {
    // Explicitly unmount camera before launching intent to free hardware on Android
    setIsFocused(false);
    await new Promise(resolve => setTimeout(resolve, 100)); // wait for flush

    const mediaType = activeMode === 'REEL' ? ['videos'] : 
                      activeMode === 'POST' ? ['images'] : ['images', 'videos'];
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType as any,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      
      // Enforce 10 seconds minimum for Reels from gallery
     if (activeMode === 'REEL' && asset.type === 'video' && asset.duration && asset.duration < 10000) {
        showError('Reels must be at least 10 seconds long');
        return;
      }

      router.push({ 
        pathname: '/(create)/story-editor', 
        params: { 
          uri: asset.uri, 
          type: asset.type === 'video' ? 'video' : 'photo', 
          mode: activeMode,
          challengeId
        } 
      });
    }
    } finally {
      // Remount camera if user cancels gallery
      setTimeout(() => {
        setCameraKey(Date.now());
        setIsFocused(true);
      }, 500);
    }
  };

  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-[#12081E]">
        <Text className="text-white mb-4 text-center px-8 font-medium">Camera & Mic permissions required to create.</Text>
        <Pressable onPress={() => { requestCameraPermission(); requestMicPermission(); }} className="bg-[#A855F7] px-8 py-3 rounded-full">
          <Text className="text-white font-bold">Grant Permissions</Text>
        </Pressable>
      </View>
    );
  }

  // Local CSS filters for preview
  const getFilterStyle = (effectName: string) => {
    switch (effectName) {
      case 'Vintage': return { backgroundColor: 'rgba(212, 175, 55, 0.2)' }; // Sepia-ish tint
      case 'B&W': return { backgroundColor: 'rgba(255, 255, 255, 0.4)', mixBlendMode: 'saturation' }; 
      case 'Neon': return { backgroundColor: 'rgba(168, 85, 247, 0.3)', mixBlendMode: 'color' };
      case 'Paris': return { backgroundColor: 'rgba(255, 182, 193, 0.2)' };
      case 'Blur': return { backgroundColor: 'rgba(255, 255, 255, 0.1)' }; // actual blur requires expo-blur but this is a placeholder
      default: return {};
    }
  };

  return (
    <View className="flex-1 bg-black" style={{ paddingBottom: Math.max(insets.bottom, 0) }}>
      <View className="flex-1 rounded-b-3xl overflow-hidden relative">
        {isFocused && (
         <CameraView 
            key={`cam-${cameraKey}`}
            ref={cameraRef}
            style={{ position: 'absolute', width: '100%', height: '100%' }} 
            facing={facing} 
            flash={flash}
            enableTorch={flash === 'on'}
            mode={activeMode === 'POST' ? 'picture' : activeMode === 'REEL' ? 'video' : (isRecording ? 'video' : 'picture')}
            videoQuality={facing === 'front' ? '720p' : (cameraSettings.videoResolution === '4K' ? '2160p' : '1080p')}
            videoStabilizationMode={Platform.OS === 'ios' && cameraSettings.stabilization ? 'auto' : 'off'}
            mirror={facing === 'front' ? cameraSettings.mirrorFront : false}
          />
        )}

        {/* Grid Lines Overlay */}
        {cameraSettings.grid && (
          <View style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <Svg height="100%" width="100%">
              <Line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <Line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <Line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <Line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            </Svg>
          </View>
        )}

        {/* Local Filter Overlay Preview */}
        {selectedEffect.name !== 'None' && (
          <View style={[{ position: 'absolute', inset: 0, pointerEvents: 'none' }, getFilterStyle(selectedEffect.name) as any]} />
        )}

        {/* Timer Overlay */}
        {timerCountdown !== null && (
          <View className="absolute inset-0 items-center justify-center pointer-events-none z-20">
            <Text className="text-white text-9xl font-black" style={{ textShadowColor: 'black', textShadowRadius: 20 }}>
              {timerCountdown}
            </Text>
          </View>
        )}

        {/* Top Controls */}
        <View className="absolute left-0 right-0 px-4 flex-row items-center z-10" style={{ top: Math.max(insets.top, 16) }}>
          <View className="flex-1 items-start">
            <Pressable onPress={handleClose} className="w-[44px] h-[44px] items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10">
              <X size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="flex-1 items-center">
            {(activeMode === 'STORY' || activeMode === 'REEL') && !selectedMusicTrack && !selectedMusicId && (
              <Pressable onPress={() => setShowMusicPicker(true)} className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full flex-row items-center gap-2 border border-white/10 min-h-[44px]">
                <Music size={16} color="#FFFFFF" />
                <Text className="text-white text-xs font-semibold">Pick Music</Text>
              </Pressable>
            )}
            {(activeMode === 'STORY' || activeMode === 'REEL') && (selectedMusicTrack || selectedMusicId) && (
              <Pressable onPress={() => setShowMusicPicker(true)} className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full flex-row items-center gap-2 border border-white/10 min-h-[44px]">
                <Music size={16} color="#FFFFFF" />
                <Text className="text-white text-xs font-semibold max-w-[150px]" numberOfLines={1}>
                  {selectedMusicTrack ? `${selectedMusicTrack.title}` : selectedMusicTitle}
                </Text>
              </Pressable>
            )}
          </View>

          <View className="flex-1 items-end">
            <Pressable onPress={() => setShowSettings(true)} className="w-[44px] h-[44px] items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10">
              <Settings size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Right Toolbar - Dynamic based on Mode */}
        <View className="absolute right-4 top-1/3 gap-4 z-10 items-center">
          <Pressable onPress={toggleFacing} className="items-center p-2 rounded-full bg-black/20 backdrop-blur-sm">
            <RefreshCcw size={24} color="#FFFFFF" />
          </Pressable>
          
          <Pressable onPress={toggleFlash} className="items-center p-2 rounded-full bg-black/20 backdrop-blur-sm">
            {flash === 'on' ? <Zap size={24} color="#FFFFFF" /> : flash === 'auto' ? <Zap size={24} color="#A855F7" /> : <ZapOff size={24} color="#FFFFFF" />}
          </Pressable>
          
          {activeMode === 'REEL' && (
            <>
              <Pressable onPress={toggleSpeed} className="items-center p-2 rounded-full bg-black/20 backdrop-blur-sm relative">
                <MonitorPlay size={24} color={speedMultiplier > 1 ? '#A855F7' : '#FFFFFF'} />
                {speedMultiplier > 1 && (
                  <Text className="text-[#A855F7] text-[10px] font-bold absolute -bottom-3">{speedMultiplier}x</Text>
                )}
              </Pressable>
              {selectedMusicId && (
                <>
                  <Pressable className="items-center p-2 rounded-full bg-black/20 backdrop-blur-sm">
                    <Scissors size={24} color="#FFFFFF" />
                  </Pressable>
                  <Pressable className="items-center p-2 rounded-full bg-black/20 backdrop-blur-sm">
                    <Volume2 size={24} color="#FFFFFF" />
                  </Pressable>
                </>
              )}
            </>
          )}

          {activeMode === 'STORY' && (
            <>
              <Pressable onPress={() => router.push({ pathname: '/(create)/story-editor', params: { uri: '', type: 'photo', mode: 'text' } })} className="items-center p-2 rounded-full bg-black/20 backdrop-blur-sm">
                <Type size={24} color="#FFFFFF" />
              </Pressable>
            </>
          )}

          <Pressable onPress={toggleTimer} className="items-center p-2 rounded-full bg-black/20 backdrop-blur-sm">
            <Timer size={24} color={timerDelay > 0 ? "#A855F7" : "#FFFFFF"} />
            {timerDelay > 0 && <Text className="text-[#A855F7] text-[10px] font-bold absolute -bottom-4">{timerDelay}s</Text>}
          </Pressable>
        </View>

        {/* Bottom Area: Gallery, Shutter, Effects */}
        <View className="absolute bottom-6 left-0 right-0 px-8 flex-row items-center justify-between z-10">
          <Pressable onPress={openGallery} className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white/50 bg-black/50">
            <Image source={{ uri: 'https://picsum.photos/100' }} className="w-full h-full opacity-80" />
          </Pressable>

          <View className="relative items-center justify-center">
            {/* Timer Display above shutter when recording */}
            {activeMode === 'REEL' && isRecording && (
               <View className="absolute -top-16 items-center w-full min-w-[100px]">
                 <View className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex-row items-center gap-2 border border-white/20 shadow-lg shadow-black/30">
                   <View className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                   <Text className="text-white font-bold text-xs tracking-wider">
                     00:{recordingTime.toString().padStart(2, '0')} <Text className="text-white/50">/ 01:00</Text>
                   </Text>
                 </View>
               </View>
            )}

           <Pressable 
              onPress={handleCapture} 
              onLongPress={activeMode === 'STORY' ? startRecording : undefined}
              delayLongPress={300}
              className="items-center justify-center"
            >
              {activeMode === 'REEL' ? (
                <View className="w-20 h-20 items-center justify-center relative">
                  {/* Background border */}
                  <View className="absolute inset-0 rounded-full border-4 border-white/30" />
                  
                  {/* Progress Ring */}
                  {isRecording && (
                    <Svg width={80} height={80} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                      <Circle
                        cx={40}
                        cy={40}
                        r={37}
                        stroke="#A855F7"
                        strokeWidth={6}
                        fill="none"
                        strokeDasharray={2 * Math.PI * 37}
                        strokeDashoffset={2 * Math.PI * 37 - (recordingTime / 60) * (2 * Math.PI * 37)}
                        strokeLinecap="round"
                      />
                    </Svg>
                  )}

                  {/* Inner Shutter Button */}
                  <View className={`bg-[#A855F7] ${isRecording ? 'w-8 h-8 rounded-lg' : 'w-[68px] h-[68px] rounded-full'} transition-all duration-300 ease-out`} />
                </View>
              ) : activeMode === 'STORY' && isRecording ? (
                <View className="w-20 h-20 items-center justify-center relative">
                  <View className="absolute inset-0 rounded-full border-4 border-white/30" />
                  <Svg width={80} height={80} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                    <Circle cx={40} cy={40} r={37} stroke="#A855F7" strokeWidth={6} fill="none" strokeDasharray={2 * Math.PI * 37} strokeDashoffset={2 * Math.PI * 37 - (recordingTime / 30) * (2 * Math.PI * 37)} strokeLinecap="round" />
                  </Svg>
                  <View className="bg-[#A855F7] w-8 h-8 rounded-lg transition-all duration-300 ease-out" />
                </View>
              ) : (
              <View className="w-20 h-20 rounded-full border-4 border-white items-center justify-center p-1 bg-black/20">
                <View className="w-full h-full bg-white rounded-full" />
              </View>
            )}
          </Pressable>
          </View>

          <Pressable onPress={() => setShowEffectsSheet(true)} className="w-10 h-10 items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/20">
            <Wand2 size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Mode Selector (Instagram Style Swipeable Text) */}
      <View className="h-16 items-center justify-center">
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: PADDING_H }}
        >
          {MODES.map((mode, idx) => (
            <Pressable 
              key={mode} 
              onPress={() => handleModeClick(idx)}
              style={{ width: ITEM_WIDTH }} 
              className="items-center justify-center py-4"
            >
              <Text className={`font-bold tracking-wider ${activeMode === mode ? 'text-white text-sm' : 'text-neutral-grey text-xs'}`}>
                {mode}
              </Text>
              {activeMode === mode && (
                <View className="w-1 h-1 bg-white rounded-full mt-2 absolute bottom-2" />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Settings Sheet Overlay */}
      {showSettings && (
        <>
          <Pressable 
            onPress={() => setShowSettings(false)} 
            className="absolute inset-0 bg-black/50 z-40"
          />
          <CameraSettingsSheet onClose={() => setShowSettings(false)} />
        </>
      )}

      {/* Effects Sheet Overlay */}
      {showEffectsSheet && (
        <>
          <Pressable 
            onPress={() => setShowEffectsSheet(false)} 
            className="absolute inset-0 z-40"
          />
          <EffectsSheet onClose={() => setShowEffectsSheet(false)} onSelect={(effect) => {
            setSelectedEffect(effect);
            setShowEffectsSheet(false);
          }} />
        </>
      )}

  {/* Music Picker Sheet */}
      <MusicPickerSheet 
        visible={showMusicPicker} 
        onClose={() => setShowMusicPicker(false)} 
        onSelect={(track) => setSelectedMusicTrack(track)} 
      />

      <ConfirmSheet
        isVisible={showDiscardConfirm}
        title="Discard Recording?"
        message="Are you sure you want to discard this recording? This cannot be undone."
        confirmLabel="Discard"
        cancelLabel="Keep Recording"
        destructive
        onConfirm={() => { setShowDiscardConfirm(false); router.replace('/(tabs)'); }}
        onCancel={() => setShowDiscardConfirm(false)}
      />

    </View>
  );
}
