import React from 'react';
import { View, Text, Pressable, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { MapPin, Hash, Search, Flame, Music, HelpCircle, Thermometer, Smile, Clock, Camera } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface StickerSheetProps {
  onClose: () => void;
  onSelect: (sticker: any) => void;
}

const WIDGETS = [
  { id: '1', type: 'LOCATION', icon: MapPin, label: 'LOCATION', colors: ['#A855F7', '#EC4899'] },
  { id: '2', type: 'MENTION', icon: Search, label: '@MENTION', colors: ['#F59E0B', '#EF4444'] },
  { id: '3', type: 'HASHTAG', icon: Hash, label: '#HASHTAG', colors: ['#3B82F6', '#8B5CF6'] },
  { id: '4', type: 'MUSIC', icon: Music, label: 'MUSIC', colors: ['#10B981', '#3B82F6'] },
  { id: '5', type: 'POLL', icon: Flame, label: 'POLL', colors: ['#EF4444', '#F59E0B'] },
  { id: '6', type: 'QUESTION', icon: HelpCircle, label: 'QUESTIONS', colors: ['#8B5CF6', '#EC4899'] },
  { id: '7', type: 'TEMPERATURE', icon: Thermometer, label: '84°F', colors: ['#000000', '#121212'] },
  { id: '8', type: 'TIME', icon: Clock, label: '12:00', colors: ['#000000', '#121212'] },
  { id: '9', type: 'REACTION', icon: Smile, label: 'REACTION', colors: ['#000000', '#121212'] },
  { id: '10', type: 'ADD_YOURS', icon: Camera, label: 'ADD YOURS', colors: ['#000000', '#121212'] },
];

const EMOJIS = ['😂', '😍', '🔥', '👏', '😢', '😮', '❤️', '🎉', '🙌', '💯', '🙏', '✨', '🥺', '👍', '🤔'];

export default function StickerSheet({ onClose, onSelect }: StickerSheetProps) {
  return (
    <View className="absolute bottom-0 left-0 right-0 bg-[#0B001A] rounded-t-[40px] border-t border-[#3E295E] z-50 h-[85%] shadow-2xl shadow-purple-900/50">
      {/* Handle */}
      <View className="items-center py-3">
        <View className="w-12 h-1.5 bg-white/20 rounded-full" />
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Search Bar */}
        <View className="bg-[#1C0D33] border border-[#3E295E] rounded-2xl px-5 py-3.5 flex-row items-center gap-3 mb-6 shadow-md">
          <Search size={20} color="#A78BFA" />
          <Text className="text-white/50 font-medium text-sm">Search stickers, polls, music...</Text>
        </View>

        {/* Widgets Grid */}
        <View className="flex-row flex-wrap justify-between gap-y-4 mb-8">
          {WIDGETS.map((widget) => {
            const Icon = widget.icon;
            return (
              <Pressable 
                key={widget.id}
                onPress={() => onSelect(widget)}
                style={{ width: (width - 40) / 2 - 8 }}
                className="bg-[#190C2C] border border-[#3E295E] rounded-[24px] items-center justify-center p-3 h-[72px] active:scale-[0.98] transition-all shadow-lg"
              >
                <View className="flex-row items-center gap-2.5">
                  <View className="w-9 h-9 rounded-full bg-[#8B5CF6]/10 items-center justify-center border border-[#8B5CF6]/20">
                    <Icon size={18} color={widget.colors[0] || '#A78BFA'} strokeWidth={2.5} />
                  </View>
                  <Text className="text-white font-black text-[11px] tracking-widest">{widget.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Emojis Grid */}
        <Text className="text-white font-bold mb-4 ml-2 text-base">Emoji</Text>
        <View className="flex-row flex-wrap gap-4 px-2">
          {EMOJIS.map((emoji, index) => (
            <TouchableOpacity 
              key={index}
              onPress={() => onSelect({ type: 'EMOJI', value: emoji })}
              className="w-14 h-14 items-center justify-center bg-[#190C2C] border border-[#3E295E] rounded-full shadow-md active:scale-95"
            >
              <Text className="text-3xl">{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
