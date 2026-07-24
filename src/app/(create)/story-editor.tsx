import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, Pressable, TextInput, Platform, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useEditorStore } from '../../store';
import { ChevronLeft, ChevronRight, Type, Sticker as StickerIcon, Music as MusicIcon, MoreHorizontal, Download, Sparkles, Navigation, Send as SendIcon, PlusCircle, Play, Pause, Trash2, Pencil, VolumeX, Volume2 } from 'lucide-react-native';
import { useAudioPlayer } from 'expo-audio';
import DraggableLayer from '../../components/editor/DraggableLayer';
import TextEditorOverlay, { TextLayerData } from '../../components/editor/TextEditorOverlay';
import MusicEditorOverlay, { MusicLayerData } from '../../components/editor/MusicEditorOverlay';
import InteractiveStickerOverlay, { InteractiveStickerData } from '../../components/editor/InteractiveStickerOverlay';
import DrawingOverlay, { DrawingPath } from '../../components/editor/DrawingOverlay';
import ReelTimelineEditor, { ReelTimelineData } from '../../components/editor/ReelTimelineEditor';
import Svg, { Path, G } from 'react-native-svg';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MusicPickerSheet from '../../components/sheets/MusicPickerSheet';
import StickerSheet from '../../components/sheets/StickerSheet';
import EffectsSheet from '../../components/sheets/EffectsSheet';
import SendToSheet from '../../components/sheets/SendToSheet';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

export type EditorLayer = {
  id: string;
  type: 'text' | 'sticker' | 'music' | 'emoji' | 'interactive' | 'drawing';
  content: any;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export default function StoryEditorScreen() {
  const router = useRouter();
  const { uri, mode, type, speed, effect, musicId, originalStoryId, originalOwnerId, originalOwnerUsername, returnTo, challengeId, musicUrl, musicName } = useLocalSearchParams<{ 
    uri: string; 
    mode: string; 
    type?: string;
    speed?: string;
    effect?: string;
    musicId?: string;
    originalStoryId?: string;
    originalOwnerId?: string;
    originalOwnerUsername?: string;
    returnTo?: string;
    challengeId?: string;
    musicUrl?: string;
    musicName?: string;
  }>();

  const setEditorData = useEditorStore(state => state.setEditorData);

  const isVideo = type === 'video' || mode === 'REEL';

  const videoPlayer = useVideoPlayer(uri, player => {
    if (isVideo) {
      player.loop = true;
      player.play();
    }
  });

  const insets = useSafeAreaInsets();

  const [textMode, setTextMode] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  
  const [showMusicSheet, setShowMusicSheet] = useState(false);
  const [showStickerSheet, setShowStickerSheet] = useState(false);
  const [showEffectsSheet, setShowEffectsSheet] = useState(false);
  const [showSendToSheet, setShowSendToSheet] = useState(false);
  const [showTimelineEditor, setShowTimelineEditor] = useState(false);

  const [timelineData, setTimelineData] = useState<ReelTimelineData | null>(null);

  const [layers, setLayers] = useState<EditorLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  const [editingMusic, setEditingMusic] = useState<any>(null);
  const [editingInteractiveSticker, setEditingInteractiveSticker] = useState<'location' | 'mention' | 'question' | 'hashtag' | null>(null);
  
  const [selectedMusic, setSelectedMusic] = useState<MusicLayerData | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(true);

  const audioPlayer = useAudioPlayer();

  useFocusEffect(
    useCallback(() => {
      if (isVideo) {
        // eslint-disable-next-line react-hooks/immutability
        try { videoPlayer?.play(); if (videoPlayer) videoPlayer.muted = isVideoMuted; } catch(e) {}
      }
      if (selectedMusic && isPlayingMusic) {
        try { audioPlayer?.play(); } catch(e) {}
      }
      return () => {
        try { audioPlayer?.pause(); } catch(e) {}
        try { if (videoPlayer) { videoPlayer.pause(); videoPlayer.muted = true; } } catch(e) {}
      };
    }, [videoPlayer, audioPlayer, isVideo, selectedMusic, isPlayingMusic, isVideoMuted])
  );

  // Auto-populate music if passed from create screen (Karaoke style)
  useEffect(() => {
    if (musicUrl && musicName && !selectedMusic) {
      const musicData: MusicLayerData = {
        id: musicId || 'custom',
        title: musicName.split(' - ')[0] || musicName,
        artist: musicName.split(' - ')[1] || 'Unknown',
        audioUrl: musicUrl,
        style: 'cover',
        startTime: 0,
        duration: 15000
      };
      
      setTimeout(() => setSelectedMusic(musicData), 0);
      
      // If it's a photo, play the music in the editor
      if (!isVideo) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsPlayingMusic(true);
        audioPlayer?.replace(musicUrl);
        audioPlayer?.play();
      } else {
        // For video, audio is already baked in via mic recording. Don't play it again.
        setIsPlayingMusic(false);
      }
      
      setLayers(prev => [...prev.filter(l => l.type !== 'music'), {
        id: 'music-layer',
        type: 'music',
        content: musicData,
        x: 0,
        y: -200,
        scale: 1,
        rotation: 0
      }]);
    }
  }, [musicUrl, musicName]);

  // Sync state changes explicitly
  useEffect(() => {
    if (videoPlayer) {
      // eslint-disable-next-line react-hooks/immutability
      videoPlayer.muted = isVideoMuted;
    }
  }, [isVideoMuted, videoPlayer]);

  // If this is a 'Mention Back' (repost), automatically add a Mention sticker for the original creator!
  useEffect(() => {
    if (originalOwnerUsername) {
      setTimeout(() => {
        setLayers(prev => {
          if (prev.some(l => l.id === 'repost-mention')) return prev;
          return [...prev, {
            id: 'repost-mention',
            type: 'interactive',
            content: { type: 'mention', text: originalOwnerUsername, styleVariant: 0 },
            x: 0,
            y: -150, // Position it nicely in the upper half
            scale: 1,
            rotation: 0
          }];
        });
      }, 0);
    }
  }, [originalOwnerUsername]);

  const navigateToShare = (target: 'your_story' | 'close_friends' | 'share', targetUserIds?: string[]) => {
    setIsPlayingMusic(false);
    try { audioPlayer?.pause(); } catch(e) {}
    try { videoPlayer?.pause(); } catch(e) {}
    setEditorData({
      layers,
      timelineData,
      musicData: selectedMusic
    });
    router.push({
      pathname: '/(create)/share-story',
      params: { 
        uri, type, target, text: storyText, mode, speed, effect, 
        musicId: selectedMusic?.id || musicId,
        musicTitle: selectedMusic?.title || musicName?.split(' - ')[0],
        musicArtist: selectedMusic?.artist || musicName?.split(' - ')[1],
        musicUrl: selectedMusic?.audioUrl || musicUrl,
        isStory: 'true',
        originalStoryId,
        originalOwnerId,
        originalOwnerUsername,
        returnTo,
        challengeId,
        isVideoMuted: isVideoMuted ? 'true' : 'false',
        ...(targetUserIds && { targetUserIds: JSON.stringify(targetUserIds) })
      }
    });
  };

  const handleMusicSelect = (song: any) => {
    setShowMusicSheet(false);
    setEditingMusic(song);
  };

  const handleMusicEditorComplete = (musicData: MusicLayerData | null) => {
    setEditingMusic(null);
    if (musicData) {
      setSelectedMusic(musicData);
      setIsPlayingMusic(true);
      setIsVideoMuted(true); // Mute video by default when music is added
      
      if (musicData.audioUrl) {
        audioPlayer?.replace(musicData.audioUrl);
        audioPlayer?.play();
      }

      setLayers(prev => [...prev.filter(l => l.type !== 'music'), {
        id: 'music-layer',
        type: 'music',
        content: musicData,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0
      }]);
    }
  };

  const toggleMusicPlayback = () => {
    if (isPlayingMusic) {
      audioPlayer?.pause();
      setIsPlayingMusic(false);
    } else {
      audioPlayer?.play();
      setIsPlayingMusic(true);
    }
  };

  const handleTextComplete = (textData: TextLayerData | null) => {
    setTextMode(false);
    if (textData) {
      setLayers(prev => [...prev, {
        id: Date.now().toString(),
        type: 'text',
        content: textData,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0
      }]);
    }
  };

  const handleStickerSelect = (sticker: any) => {
    setShowStickerSheet(false);
    if (sticker.type === 'EMOJI' || sticker.type === 'IMAGE') {
      setLayers(prev => [...prev, {
        id: Date.now().toString(),
        type: sticker.type === 'EMOJI' ? 'emoji' : 'sticker',
        content: sticker.value,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0
      }]);
    } else if (['LOCATION', 'MENTION', 'QUESTION', 'HASHTAG', 'TEMPERATURE', 'POLL', 'REACTION', 'ADD_YOURS', 'TIME', 'MUSIC'].includes(sticker.type)) {
      if (sticker.type === 'TEMPERATURE') {
        setLayers(prev => [...prev, {
          id: Date.now().toString(),
          type: 'interactive',
          content: { type: 'temperature', text: '84°F', styleVariant: 0 },
          x: 0, y: 0, scale: 1, rotation: 0
        }]);
      } else if (sticker.type === 'TIME') {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLayers(prev => [...prev, {
          id: Date.now().toString(),
          type: 'interactive',
          content: { type: 'time', text: timeStr, styleVariant: 0 },
          x: 0, y: 0, scale: 1, rotation: 0
        }]);
      } else if (sticker.type === 'MUSIC') {
        setShowMusicSheet(true);
      } else {
        setEditingInteractiveSticker(sticker.type.toLowerCase());
      }
    } else {
      setLayers(prev => [...prev, {
        id: Date.now().toString(),
        type: 'text',
        content: sticker.value || `[${sticker.type}]`,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0
      }]);
    }
  };

  const handleLayerUpdate = (id: string, state: any) => {
    setLayers(prev => prev.map(layer => layer.id === id ? { ...layer, ...state } : layer));
  };

  const handleInteractiveStickerComplete = (data: InteractiveStickerData | null) => {
    setEditingInteractiveSticker(null);
    if (data) {
      setLayers(prev => [...prev, {
        id: Date.now().toString(),
        type: 'interactive',
        content: data,
        x: 0, y: 0, scale: 1, rotation: 0
      }]);
    }
  };

  const handleDrawingComplete = (paths: DrawingPath[] | null) => {
    setDrawingMode(false);
    if (paths && paths.length > 0) {
      setLayers(prev => [...prev, {
        id: Date.now().toString(),
        type: 'drawing',
        content: paths,
        x: 0, y: 0, scale: 1, rotation: 0
      }]);
    }
  };

  const deleteActiveLayer = () => {
    if (activeLayerId) {
      setLayers(prev => prev.filter(l => l.id !== activeLayerId));
      setActiveLayerId(null);
    }
  };

  return (
    <View className="flex-1 bg-black">
      
        <View className="flex-1 rounded-3xl overflow-hidden mb-20 relative bg-neutral-900" style={{ marginTop: Math.max(insets.top, 48) }}>
        {uri ? (
          isVideo ? (
            <VideoView player={videoPlayer} style={{ width: '100%', height: '100%', borderRadius: 24 }} nativeControls={false} />
          ) : (
            <Image source={{ uri }} className="w-full h-full rounded-3xl" resizeMode="cover" />
          )
        ) : (
          <View className="w-full h-full bg-neutral-900 rounded-3xl items-center justify-center">
            <Text className="text-white/50">No Media</Text>
          </View>
        )}

        {/* Background Tap to Deselect */}
        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={() => setActiveLayerId(null)} 
        />

        <View style={{ ...StyleSheet.absoluteFill, zIndex: 5 }} pointerEvents="none">
          <Svg width="100%" height="100%">
            {layers.filter(l => l.type === 'drawing').map(layer => (
              <G key={layer.id}>
                {layer.content && Array.isArray(layer.content) && layer.content.map(p => (
                  <Path
                    key={p.id}
                    d={p.path}
                    stroke={p.color}
                    strokeWidth={p.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))}
              </G>
            ))}
          </Svg>
        </View>

        <View className="absolute inset-0 z-10" pointerEvents="box-none">
          {layers.filter(l => l.type !== 'drawing').map(layer => (
            <DraggableLayer
              key={layer.id}
              id={layer.id}
              isActive={activeLayerId === layer.id}
              onActivate={setActiveLayerId}
              onUpdate={handleLayerUpdate}
              initialX={layer.x}
              initialY={layer.y}
              initialScale={layer.scale}
              initialRotation={layer.rotation}
            >
              {layer.type === 'text' && layer.content && typeof layer.content === 'object' && (
                <View style={{
                  backgroundColor: layer.content.backgroundColor,
                  paddingHorizontal: layer.content.backgroundStyle !== 'none' ? 16 : 0,
                  paddingVertical: layer.content.backgroundStyle !== 'none' ? 8 : 0,
                  borderRadius: 12,
                }}>
                  <Text style={{
                    color: layer.content.color,
                    fontFamily: layer.content.fontFamily,
                    fontSize: 32,
                    fontWeight: 'bold',
                    textAlign: layer.content.textAlign,
                  }}>
                    {layer.content.text}
                  </Text>
                </View>
              )}
              {layer.type === 'text' && typeof layer.content === 'string' && (
                <Text className="text-white text-3xl font-bold bg-black/50 px-4 py-2 rounded-xl text-center">
                  {layer.content}
                </Text>
              )}
              {layer.type === 'emoji' && (
                <Text style={{ fontSize: 60 }}>
                  {layer.content}
                </Text>
              )}
              {layer.type === 'sticker' && layer.content && (
                <Image source={{ uri: layer.content }} className="w-32 h-32" resizeMode="contain" />
              )}
              {layer.type === 'interactive' && layer.content && layer.content.type === 'location' && (
                <View className={`px-6 py-3 rounded-full flex-row items-center gap-2 ${layer.content.styleVariant === 0 ? 'bg-white' : 'bg-transparent border-2 border-white'}`}>
                  <Text className={`${layer.content.styleVariant === 0 ? 'text-purple-600' : 'text-white'} font-bold text-xl`}>📍 {layer.content.text}</Text>
                </View>
              )}
              {layer.type === 'interactive' && layer.content && layer.content.type === 'mention' && (
                <View className={`px-6 py-3 rounded-lg flex-row items-center gap-2 ${layer.content.styleVariant === 0 ? 'bg-gradient-to-r from-orange-500 to-pink-500' : 'bg-white'}`}>
                  <Text className={`${layer.content.styleVariant === 0 ? 'text-white' : 'text-orange-500'} font-bold text-2xl`}>@{layer.content.text}</Text>
                </View>
              )}
              {layer.type === 'interactive' && layer.content && layer.content.type === 'hashtag' && (
                <View className={`px-6 py-2 rounded-md ${layer.content.styleVariant === 0 ? 'bg-white' : 'bg-black/50'}`}>
                  <Text className={`${layer.content.styleVariant === 0 ? 'text-black' : 'text-white'} font-bold text-3xl`}>#{layer.content.text}</Text>
                </View>
              )}
              {layer.type === 'interactive' && layer.content && layer.content.type === 'question' && (
                <View className={`w-72 ${layer.content.styleVariant === 0 ? 'bg-white' : layer.content.styleVariant === 1 ? 'bg-purple-500' : 'bg-black'} rounded-2xl overflow-hidden shadow-2xl`}>
                  <View className="p-6 items-center">
                    <Text className={`${layer.content.styleVariant === 0 ? 'text-black' : 'text-white'} font-bold text-xl text-center`} numberOfLines={3}>
                      {layer.content.text}
                    </Text>
                  </View>
                  <View className="bg-white/20 p-4 items-center">
                    <Text className={`${layer.content.styleVariant === 0 ? 'text-black' : 'text-white'} opacity-50 font-semibold`}>Type something...</Text>
                  </View>
                </View>
              )}
              {layer.type === 'interactive' && layer.content && layer.content.type === 'temperature' && (
                <View className="bg-transparent border-4 border-white px-6 py-2 rounded-full items-center justify-center">
                  <Text className="text-white font-bold text-3xl">84°F</Text>
                </View>
              )}
              {layer.type === 'interactive' && layer.content && layer.content.type === 'time' && (
                <View className="bg-transparent border-4 border-white px-6 py-2 rounded-full items-center justify-center">
                  <Text className="text-white font-bold text-3xl">{layer.content.text}</Text>
                </View>
              )}
              {layer.type === 'interactive' && layer.content && layer.content.type === 'poll' && (
                <View className="w-72 bg-white rounded-2xl overflow-hidden shadow-2xl p-4">
                  <Text className="text-black font-bold text-xl text-center mb-4">{layer.content.text}</Text>
                  <View className="flex-row gap-2">
                    <View className="flex-1 p-3 rounded-xl border bg-gray-50 border-gray-200">
                      <Text className="text-center font-bold text-black">{layer.content.options?.[0] || 'YES'}</Text>
                    </View>
                    <View className="flex-1 p-3 rounded-xl border bg-gray-50 border-gray-200">
                      <Text className="text-center font-bold text-black">{layer.content.options?.[1] || 'NO'}</Text>
                    </View>
                  </View>
                </View>
              )}
              {layer.type === 'interactive' && layer.content && layer.content.type === 'reaction' && (
                <View className="w-64 bg-white rounded-2xl p-4 shadow-2xl items-center">
                  <Text className="text-black font-bold text-lg text-center mb-2">{layer.content.text}</Text>
                  <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center border border-gray-200 shadow-sm">
                    <Text className="text-4xl">{layer.content.emoji || '😍'}</Text>
                  </View>
                </View>
              )}
              {layer.type === 'interactive' && layer.content && layer.content.type === 'add_yours' && (
                <View className="w-72 bg-white rounded-2xl overflow-hidden shadow-2xl">
                  <View className="bg-black p-3 items-center flex-row justify-center gap-2">
                    <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/685/685655.png'}} style={{width:20, height:20, tintColor:'white'}} />
                    <Text className="text-white font-bold text-sm tracking-widest">ADD YOURS</Text>
                  </View>
                  <View className="p-5 items-center">
                    <Text className="text-black font-bold text-lg text-center">{layer.content.text}</Text>
                  </View>
                </View>
              )}
              {layer.type === 'music' && layer.content && (
                layer.content.style === 'cover' ? (
                  <View className="bg-white/10 backdrop-blur-md rounded-2xl p-4 items-center w-48 border border-white/20 shadow-2xl">
                    <Image source={{ uri: layer.content.coverUrl || 'https://via.placeholder.com/150' }} className="w-24 h-24 rounded-xl mb-3" />
                    <Text className="text-white font-bold text-base text-center" numberOfLines={1}>{layer.content.title}</Text>
                    <Text className="text-white/60 text-xs mt-1 text-center" numberOfLines={1}>{layer.content.artist}</Text>
                  </View>
                ) : (
                  <View className="bg-black/60 rounded-full px-6 py-3 flex-row items-center gap-3 border border-white/30">
                    <MusicIcon size={16} color="#FFF" />
                    <View>
                      <Text className="text-white font-bold text-xs" numberOfLines={1}>{layer.content.title}</Text>
                      <Text className="text-white/60 text-[10px]" numberOfLines={1}>{layer.content.artist}</Text>
                    </View>
                  </View>
                )
              )}
            </DraggableLayer>
          ))}
        </View>

        {selectedMusic && !textMode && !drawingMode && (
          <Pressable 
            onPress={toggleMusicPlayback}
            className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex-row items-center gap-2 z-10 border border-white/20"
          >
            {isPlayingMusic ? <MusicIcon size={14} color="#FFFFFF" /> : <Pause size={14} color="#FFFFFF" />}
            <Text className="text-white text-xs font-bold" numberOfLines={1} style={{ maxWidth: 150 }}>
              {selectedMusic.title}
            </Text>
          </Pressable>
        )}

        {textMode && <TextEditorOverlay onComplete={handleTextComplete} />}
        {editingMusic && <MusicEditorOverlay song={editingMusic} onComplete={handleMusicEditorComplete} />}
        {editingInteractiveSticker && <InteractiveStickerOverlay type={editingInteractiveSticker} onComplete={handleInteractiveStickerComplete} />}



        {!textMode && !drawingMode && (
          <View className="absolute left-0 right-0 px-4 flex-row justify-between items-center z-10 pointer-events-box-none" style={{ top: Math.max(insets.top, 16) }}>
            <View className="flex-row items-center gap-3">
              <Pressable onPress={() => router.back()} className="w-[44px] h-[44px] items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20 active:scale-95 transition-transform">
                <ChevronLeft size={24} color="#FFFFFF" />
              </Pressable>
              {isVideo && (
                <Pressable onPress={() => setIsVideoMuted(!isVideoMuted)} className="w-[44px] h-[44px] items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20 active:scale-95 transition-transform">
                  {isVideoMuted ? <VolumeX size={20} color="#FFFFFF" /> : <Volume2 size={20} color="#FFFFFF" />}
                </Pressable>
              )}
            </View>
          </View>
        )}

        {!textMode && !drawingMode && (
          <View className="absolute top-32 right-4 gap-4 items-center z-10">
            <Pressable onPress={() => setTextMode(true)} className="w-[46px] h-[46px] items-center justify-center bg-black/40 backdrop-blur-md border border-white/20 rounded-full active:scale-95 shadow-lg shadow-black/20">
              <Type size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable onPress={() => setDrawingMode(true)} className="w-[46px] h-[46px] items-center justify-center bg-black/40 backdrop-blur-md border border-white/20 rounded-full active:scale-95 shadow-lg shadow-black/20">
              <Pencil size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable onPress={() => setShowStickerSheet(true)} className="w-[46px] h-[46px] items-center justify-center bg-black/40 backdrop-blur-md border border-white/20 rounded-full active:scale-95 shadow-lg shadow-black/20">
              <StickerIcon size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable onPress={() => setShowMusicSheet(true)} className="w-[46px] h-[46px] items-center justify-center bg-black/40 backdrop-blur-md border border-white/20 rounded-full active:scale-95 shadow-lg shadow-black/20">
              <MusicIcon size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable onPress={() => setShowEffectsSheet(true)} className="w-[46px] h-[46px] items-center justify-center bg-black/40 backdrop-blur-md border border-white/20 rounded-full active:scale-95 shadow-lg shadow-black/20">
              <Sparkles size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        )}

        {activeLayerId && !textMode && !drawingMode && (
          <View className="absolute bottom-8 left-0 right-0 items-center justify-center z-20 pointer-events-box-none">
            <Pressable onPress={deleteActiveLayer} className="w-14 h-14 bg-red-500/80 rounded-full items-center justify-center border border-white/20">
              <Trash2 size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </View>

      {!textMode && !drawingMode && !showTimelineEditor && (
        <View className="absolute left-4 right-4 flex-row justify-between items-center z-10" style={{ bottom: Math.max(insets.bottom, 24) }}>
          {mode === 'REEL' ? (
            <>
              <View className="flex-row items-center gap-2 flex-1">
                <Pressable onPress={() => setShowTimelineEditor(true)} className="bg-black/60 backdrop-blur-md border border-white/20 px-3 py-3.5 rounded-[20px] flex-row items-center justify-center flex-1 active:scale-95 transition-all">
                  <Text className="text-white font-bold text-[13px]">Edit video</Text>
                </Pressable>
                
                <Pressable onPress={() => navigateToShare('your_story')} className="bg-[#190C2C]/90 backdrop-blur-xl border border-[#8B5CF6]/30 px-3 py-3.5 rounded-[20px] flex-row items-center justify-center flex-1 active:scale-95 transition-all shadow-lg shadow-purple-900/20">
                  <PlusCircle size={16} color="#A78BFA" strokeWidth={2.5} className="mr-1" />
                  <Text className="text-white font-bold text-[13px]">Story</Text>
                </Pressable>
              </View>

              <Pressable 
                onPress={() => {
                  try { audioPlayer?.pause(); } catch(e) {}
                  // eslint-disable-next-line react-hooks/immutability
                  try { if (videoPlayer) { videoPlayer.pause(); videoPlayer.muted = true; } } catch(e) {}
                  setEditorData({
                    layers,
                    timelineData,
                    musicData: selectedMusic
                  });
                  router.push({ pathname: '/(create)/share', params: { uri, type, mode, musicId: selectedMusic?.id || musicId, musicName: selectedMusic?.title || musicName, musicUrl: selectedMusic?.audioUrl || musicUrl, challengeId, isVideoMuted: isVideoMuted ? 'true' : 'false' } });
                }}
                className="items-center justify-center bg-[#A855F7] px-8 py-3.5 rounded-[20px] flex-row gap-2 shadow-xl shadow-purple-500/30 ml-3 active:scale-95 transition-transform"
              >
                <Text className="text-white text-[15px] font-black tracking-wide">Next</Text>
                <ChevronRight size={18} color="#FFFFFF" strokeWidth={3} />
              </Pressable>
            </>
          ) : mode === 'POST' ? (
            <Pressable 
              onPress={() => {
                try { audioPlayer?.pause(); } catch(e) {}
                // eslint-disable-next-line react-hooks/immutability
                try { if (videoPlayer) { videoPlayer.pause(); videoPlayer.muted = true; } } catch(e) {}
                setEditorData({ layers, timelineData, musicData: selectedMusic });
                router.push({ pathname: '/(create)/share', params: { uri, type, mode, musicId: selectedMusic?.id || musicId, musicName: selectedMusic?.title || musicName, musicUrl: selectedMusic?.audioUrl || musicUrl, challengeId, isVideoMuted: isVideoMuted ? 'true' : 'false' } });
              }}
              className="flex-1 items-center justify-center bg-[#A855F7] px-6 py-4 rounded-[24px] flex-row gap-2 shadow-xl shadow-purple-500/30 active:scale-95 transition-transform"
            >
              <Text className="text-white text-[15px] font-black tracking-wide">Next</Text>
              <ChevronRight size={18} color="#FFFFFF" strokeWidth={3} />
            </Pressable>
          ) : (
            <>
              <Pressable onPress={() => navigateToShare('your_story')} className="flex-1 items-center justify-center bg-[#190C2C]/90 backdrop-blur-xl px-6 py-4 rounded-[24px] flex-row gap-3 border border-[#8B5CF6]/30 mr-2 active:scale-95 transition-all shadow-lg shadow-purple-900/20">
                <View className="w-8 h-8 rounded-full items-center justify-center bg-[#8B5CF6]/20 border border-[#8B5CF6]/30">
                  <PlusCircle size={18} color="#A78BFA" strokeWidth={2.5} />
                </View>
                <Text className="text-white text-[15px] font-bold tracking-wide">Your Story</Text>
              </Pressable>

              <Pressable onPress={() => setShowSendToSheet(true)} className="flex-1 items-center justify-center bg-[#8B5CF6] px-6 py-4 rounded-[24px] flex-row gap-3 shadow-xl shadow-purple-500/40 ml-2 active:scale-95 transition-all">
                <Text className="text-white text-[15px] font-black tracking-wide">Share</Text>
                <View className="w-8 h-8 rounded-full items-center justify-center bg-white/20">
                  <SendIcon size={16} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* Bottom Sheets */}
      {showMusicSheet && (
        <>
          <Pressable onPress={() => setShowMusicSheet(false)} className="absolute inset-0 bg-black/50 z-40" />
          <MusicPickerSheet visible={true} onClose={() => setShowMusicSheet(false)} onSelect={handleMusicSelect} />
        </>
      )}

      {showStickerSheet && (
        <>
          <Pressable onPress={() => setShowStickerSheet(false)} className="absolute inset-0 bg-black/50 z-40" />
          <StickerSheet 
            onClose={() => setShowStickerSheet(false)} 
            onSelect={handleStickerSelect} 
          />
        </>
      )}

      {/* Drawing Overlay */}
      {drawingMode && (
        <DrawingOverlay onComplete={handleDrawingComplete} />
      )}


    {showEffectsSheet && (
      <>
        <Pressable onPress={() => setShowEffectsSheet(false)} className="absolute inset-0 z-40" />
        <EffectsSheet onClose={() => setShowEffectsSheet(false)} onSelect={(effect) => setShowEffectsSheet(false)} />
      </>
    )}

    {showSendToSheet && (
      <>
        <Pressable onPress={() => setShowSendToSheet(false)} className="absolute inset-0 bg-black/50 z-40" />
        <SendToSheet 
          onClose={() => setShowSendToSheet(false)} 
          onSend={(users) => {
            setShowSendToSheet(false);
            navigateToShare('share', users);
          }} 
        />
      </>
    )}

      {/* Timeline Editor */}
      {showTimelineEditor && (
        <ReelTimelineEditor 
          player={videoPlayer}
          duration={15} // Mock duration since we don't have metadata immediately
          initialData={timelineData || undefined}
          onComplete={(data) => {
            setTimelineData(data);
            setShowTimelineEditor(false);
          }}
          onCancel={() => setShowTimelineEditor(false)}
        />
      )}
    </View>
  );
}
