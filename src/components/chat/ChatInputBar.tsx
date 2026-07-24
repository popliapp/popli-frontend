import React, { useState, useEffect } from 'react';
import { View, TextInput, Pressable, Platform, Keyboard } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSpring, interpolate } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { Plus, Camera, Image as ImageIcon, Mic, Send, X, Smile, Square } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../../api/upload'; // fallback if needed, or we just mock voice for now
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Audio } = require('expo-audio');

export default function ChatInputBar({ 
  onSend, 
  onTyping,
  replyingTo,
  onCancelReply
}: { 
  onSend: (text: string, mediaUrl?: string, type?: 'TEXT'|'VOICE') => void, 
  onTyping: (isTyping: boolean) => void,
  replyingTo?: any,
  onCancelReply?: () => void
}) {
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Animation values
  const hasText = inputText.trim().length > 0;
  const expansion = useSharedValue(0);
  const keyboardHeight = useSharedValue(0);

  useKeyboardHandler({
    onMove: (e) => {
      'worklet';
      keyboardHeight.value = Math.max(e.height, 0);
    },
    onEnd: (e) => {
      'worklet';
      keyboardHeight.value = Math.max(e.height, 0);
    },
  }, []);

  const containerStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: keyboardHeight.value > 0 ? keyboardHeight.value + 8 : Math.max(insets.bottom, 12),
    };
  });

  useEffect(() => {
    expansion.value = withSpring(hasText ? 1 : 0, { damping: 20, stiffness: 200 });
  }, [hasText]);

  const handleTextChange = (text: string) => {
    setInputText(text);
    onTyping(text.length > 0);
  };

  const handleSend = () => {
    if (inputText.trim()) {
      onSend(inputText.trim());
      setInputText('');
      onTyping(false);
    }
  };

  const pickImage = async (useCamera = false) => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 0.8,
    };
    
    let result;
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets[0]) {
      try {
        const fileUri = result.assets[0].uri;
        const type = result.assets[0].type === 'video' ? 'video' : 'image';
        
        console.log('[DEBUG-TRACE] 1. Selected asset URI:', fileUri, 'Type:', type);
        
        const uploadedUrl = await uploadToCloudinary(fileUri, type, 'chats');
        
        console.log('[DEBUG-TRACE] 2. Cloudinary Upload response URL:', uploadedUrl);
        
        onSend('', uploadedUrl);
      } catch (err) {
        console.error("[DEBUG-TRACE] Upload failed:", err);
        // Fallback or error handling can be added here
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      // Mock sending voice message
      onSend('', '', 'VOICE');
      setRecordingDuration(0);
    } else {
      setIsRecording(true);
      // Simulate recording duration
      let dur = 0;
      const interval = setInterval(() => {
        dur++;
        setRecordingDuration(dur);
        if (!isRecording || dur > 60) clearInterval(interval); // max 60s
      }, 1000);
    }
  };

  const buttonsStyle = useAnimatedStyle(() => {
    return {
      width: interpolate(expansion.value, [0, 1], [80, 0]),
      opacity: interpolate(expansion.value, [0, 1], [1, 0]),
      transform: [{ scale: interpolate(expansion.value, [0, 1], [1, 0.5]) }]
    };
  });

  const sendStyle = useAnimatedStyle(() => {
    return {
      width: interpolate(expansion.value, [0, 1], [0, 40]),
      opacity: interpolate(expansion.value, [0, 1], [0, 1]),
      transform: [{ scale: interpolate(expansion.value, [0, 1], [0.5, 1]) }]
    };
  });

  return (
    <Animated.View className="bg-[#12081E] border-t border-white/5 pt-2" style={containerStyle}>
      
      {/* Reply Context Bar */}
      {replyingTo && (
        <View className="px-4 py-2 bg-[#1A0E2C] flex-row items-center justify-between mx-4 mb-2 rounded-xl">
          <View>
            <Animated.Text className="text-[#A855F7] text-xs font-bold mb-0.5">Replying to {replyingTo.senderId}</Animated.Text>
            <Animated.Text className="text-white/70 text-sm" numberOfLines={1}>{replyingTo.text || 'Message'}</Animated.Text>
          </View>
          <Pressable onPress={onCancelReply} className="p-1">
            <X size={16} color="#9CA3AF" />
          </Pressable>
        </View>
      )}

      <View className="flex-row items-center px-4 gap-2">
        <View className="flex-1 flex-row items-center bg-[#1A0E2C] rounded-3xl pl-4 pr-1 h-[42px] border border-white/5">
          <TextInput
            value={inputText}
            onChangeText={handleTextChange}
            placeholder={isRecording ? `Recording... ${recordingDuration}s` : "Message..."}
            placeholderTextColor="#6B7280"
            className="flex-1 text-white text-[15px]"
            multiline
            maxLength={500}
            style={{ maxHeight: 100, paddingTop: Platform.OS === 'ios' ? 12 : 8, paddingBottom: Platform.OS === 'ios' ? 12 : 8 }}
            editable={!isRecording}
          />

          {!hasText && (
            <Animated.View style={[buttonsStyle, { overflow: 'hidden' }]} className="flex-row items-center justify-end">
              <Pressable onPress={() => pickImage(false)} className="p-2">
                <ImageIcon size={20} color="#9CA3AF" />
              </Pressable>
              <Pressable onPress={() => pickImage(true)} className="p-2">
                <Camera size={20} color="#9CA3AF" />
              </Pressable>
            </Animated.View>
          )}

          {hasText && (
            <Animated.View style={[sendStyle, { overflow: 'hidden', alignItems: 'flex-end', justifyContent: 'center' }]}>
              <Pressable 
                onPress={handleSend}
                className="w-8 h-8 rounded-full bg-[#D946EF] items-center justify-center shadow-lg shadow-[#D946EF]/50 mr-1"
              >
                <Send size={14} color="#FFFFFF" className="mr-0.5 mt-0.5" />
              </Pressable>
            </Animated.View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
