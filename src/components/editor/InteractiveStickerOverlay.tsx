import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, Platform, ScrollView, Image } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { Camera } from 'lucide-react-native';
import { apiClient } from '../../api/client';

interface InteractiveStickerOverlayProps {
  type: 'location' | 'mention' | 'question' | 'hashtag' | 'poll' | 'reaction' | 'add_yours';
  onComplete: (data: InteractiveStickerData | null) => void;
}

export type InteractiveStickerData = {
  type: 'location' | 'mention' | 'question' | 'hashtag' | 'poll' | 'reaction' | 'add_yours' | 'temperature' | 'time';
  text: string;
  styleVariant: number; // For toggling between different visual styles of the same sticker
  options?: string[]; // For polls
  emoji?: string; // For reactions
};

export default function InteractiveStickerOverlay({ type, onComplete }: InteractiveStickerOverlayProps) {
  const [text, setText] = useState('');
  const [styleVariant, setStyleVariant] = useState(0);
  const [options, setOptions] = useState<string[]>(['YES', 'NO']);
  const [emoji, setEmoji] = useState('😍');
  const inputRef = useRef<TextInput>(null);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
      paddingBottom: keyboardHeight.value,
    };
  });

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleTextChange = (newText: string) => {
    setText(newText);
    
    if (type === 'mention' && newText.length > 0) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();

      timeoutRef.current = setTimeout(() => {
        abortControllerRef.current = new AbortController();
        apiClient.get(`/users/search?q=${newText.replace('@', '')}`, { signal: abortControllerRef.current.signal })
          .then(res => {
            setSuggestions(Array.isArray(res.data) ? res.data : res.data.users || []);
          })
          .catch(err => {
            if (err.name !== 'CanceledError') console.error('Mention search error:', err);
          });
      }, 300);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (username: string) => {
    setText(username);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleDone = () => {
    if (text.trim().length === 0 && type !== 'poll' && type !== 'reaction') {
      onComplete(null);
    } else {
      onComplete({
        type,
        text: text.trim().replace('@', ''), // clean up @ if typed
        styleVariant,
        options: type === 'poll' ? options : undefined,
        emoji: type === 'reaction' ? emoji : undefined,
      });
    }
  };

  const toggleStyle = () => {
    setStyleVariant(prev => (prev + 1) % 3); // Cycle through 3 styles max
  };

  const getPlaceholder = () => {
    switch (type) {
      case 'location': return 'Search location...';
      case 'mention': return 'Mention someone...';
      case 'question': return 'Ask a question...';
      case 'hashtag': return 'Hashtag...';
      default: return 'Type something...';
    }
  };

  const renderPreview = () => {
    // This renders a live preview of what the sticker will look like while typing
    const displayText = text || getPlaceholder();

    if (type === 'location') {
      const isStyle1 = styleVariant === 0;
      return (
        <Pressable onPress={toggleStyle} className={`px-6 py-3 rounded-full flex-row items-center gap-2 ${isStyle1 ? 'bg-white' : 'bg-transparent border-2 border-white'}`}>
          <Text className={`${isStyle1 ? 'text-purple-600' : 'text-white'} font-bold text-xl`}>📍 {displayText}</Text>
        </Pressable>
      );
    }

    if (type === 'mention') {
      const isStyle1 = styleVariant === 0;
      return (
        <Pressable onPress={toggleStyle} className={`px-6 py-3 rounded-lg flex-row items-center gap-2 ${isStyle1 ? 'bg-gradient-to-r from-orange-500 to-pink-500' : 'bg-white'}`}>
          <Text className={`${isStyle1 ? 'text-white' : 'text-orange-500'} font-bold text-2xl`}>@{displayText.replace('@', '')}</Text>
        </Pressable>
      );
    }

    if (type === 'hashtag') {
      const isStyle1 = styleVariant === 0;
      return (
        <Pressable onPress={toggleStyle} className={`px-6 py-2 rounded-md ${isStyle1 ? 'bg-white' : 'bg-black/50'}`}>
          <Text className={`${isStyle1 ? 'text-black' : 'text-white'} font-bold text-3xl`}>#{displayText.replace('#', '')}</Text>
        </Pressable>
      );
    }

    if (type === 'question') {
      const colors = ['bg-white', 'bg-purple-500', 'bg-black'];
      const textColors = ['text-black', 'text-white', 'text-white'];
      const bgColor = colors[styleVariant % colors.length];
      const textColor = textColors[styleVariant % textColors.length];

      return (
        <Pressable onPress={toggleStyle} className={`w-72 ${bgColor} rounded-2xl overflow-hidden shadow-2xl`}>
          <View className="p-6 items-center">
            <Text className={`${textColor} font-bold text-xl text-center`} numberOfLines={3}>
              {displayText}
            </Text>
          </View>
          <View className="bg-white/20 p-4 items-center">
            <Text className={`${textColor} opacity-50 font-semibold`}>Type something...</Text>
          </View>
        </Pressable>
      );
    }

    if (type === 'poll') {
      const colors = ['bg-white', 'bg-black', 'bg-purple-500'];
      const textColors = ['text-black', 'text-white', 'text-white'];
      const bgColor = colors[styleVariant % colors.length];
      const textColor = textColors[styleVariant % textColors.length];
      const placeholderText = text || 'Ask a question...';

      return (
        <View className="w-72 items-center">
          <Pressable onPress={toggleStyle} className={`w-full ${bgColor} rounded-2xl overflow-hidden shadow-2xl mb-4 p-6 items-center`}>
            <Text className={`${textColor} font-bold text-xl text-center`}>{placeholderText}</Text>
          </Pressable>
          <View className="w-full flex-row justify-between gap-2">
            <TextInput
              value={options[0]}
              onChangeText={(val) => setOptions([val, options[1]])}
              className="flex-1 bg-white rounded-xl p-4 text-center text-black font-bold text-lg shadow-lg"
              placeholder="YES"
              placeholderTextColor="#9ca3af"
              autoFocus
            />
            <TextInput
              value={options[1]}
              onChangeText={(val) => setOptions([options[0], val])}
              className="flex-1 bg-white rounded-xl p-4 text-center text-black font-bold text-lg shadow-lg"
              placeholder="NO"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>
      );
    }

    if (type === 'reaction') {
      const placeholderText = text || 'How do you feel?';
      return (
        <View className="w-64 bg-white rounded-2xl p-6 shadow-2xl items-center">
          <Text className="text-black font-bold text-lg text-center mb-4">{placeholderText}</Text>
          <View className="flex-row items-center justify-between w-full bg-gray-100 rounded-full p-2">
            <TextInput 
              value={emoji}
              onChangeText={setEmoji}
              maxLength={2}
              className="w-12 h-12 bg-white rounded-full text-center text-2xl shadow-sm leading-10"
            />
            <View className="flex-1 h-2 bg-gray-300 mx-3 rounded-full" />
          </View>
          <Text className="text-gray-400 text-xs mt-4">Type to change emoji</Text>
        </View>
      );
    }

    if (type === 'add_yours') {
      const placeholderText = text || 'Write a prompt...';
      return (
        <View className="w-72 bg-white rounded-2xl overflow-hidden shadow-2xl">
          <View className="bg-black p-4 items-center flex-row justify-center gap-2">
            <Camera size={24} color="white" />
            <Text className="text-white font-bold text-sm tracking-widest">ADD YOURS</Text>
          </View>
          <View className="p-6 items-center">
            <Text className="text-black font-bold text-xl text-center">{placeholderText}</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <Animated.View className="absolute inset-0 bg-black/80 z-50" style={containerStyle}>
      
      {/* Top Controls */}
      <View className="flex-row justify-between items-center px-4 pt-16 pb-4 z-10">
        <Pressable onPress={() => onComplete(null)}>
          <Text className="text-white font-bold text-lg">Cancel</Text>
        </Pressable>
        <Pressable onPress={handleDone} className="bg-white px-4 py-2 rounded-full z-10">
          <Text className="text-black font-bold">Done</Text>
        </Pressable>
      </View>

      <Text className="text-white/60 text-center text-xs mt-4">Tap the sticker to change style</Text>

      {/* Main Area */}
      <View className="flex-1 items-center justify-center px-4 relative">
        
        {/* The Visual Preview */}
        <View className="items-center justify-center w-full mb-8 pointer-events-auto z-20 relative">
          {renderPreview()}

          {/* Suggestions directly below the sticker */}
          {type === 'mention' && suggestions.length > 0 && (
            <View className="absolute top-full mt-6 bg-black/80 rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ width: 350, maxWidth: '100%' }}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                className="px-2 py-3" 
                keyboardShouldPersistTaps="always"
              >
                <View className="flex-row gap-2">
                  {suggestions.map((user) => (
                    <Pressable
                      key={user.id}
                      onPress={() => handleSelectSuggestion(user.username)}
                      className="bg-white/10 border border-white/20 rounded-full flex-row items-center px-4 py-2.5 active:bg-white/20"
                    >
                      <Image 
                        source={{ uri: user.avatar || 'https://via.placeholder.com/150' }} 
                        className="w-7 h-7 rounded-full bg-gray-600 mr-2" 
                      />
                      <Text className="text-white font-bold text-sm">@{user.username}</Text>
                      {user.name && <Text className="text-white/60 text-xs ml-1">{user.name}</Text>}
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Hidden/Transparent Input that captures the keyboard typing */}
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={handleTextChange}
          placeholder={getPlaceholder()}
          placeholderTextColor="rgba(255,255,255,0.3)"
          className="absolute opacity-0 w-full h-full"
          autoCapitalize={type === 'mention' || type === 'hashtag' ? 'none' : 'sentences'}
          autoCorrect={type === 'question'}
        />
      </View>

    </Animated.View>
  );
}
