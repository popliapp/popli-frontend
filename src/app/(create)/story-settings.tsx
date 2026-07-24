import React, { useState } from 'react';
import { View, Text, Switch, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Users, MessageCircle, Download, Share2 } from 'lucide-react-native';

export default function StorySettingsScreen() {
  const router = useRouter();
  const [allowReplies, setAllowReplies] = useState(true);
  const [saveToGallery, setSaveToGallery] = useState(false);
  const [allowSharing, setAllowSharing] = useState(true);

  return (
    <View className="flex-1 bg-[#12081E] pt-12">
      <View className="flex-row items-center px-4 pb-4 border-b border-white/10">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-bold ml-2">Story Settings</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        <Text className="text-neutral-grey text-xs font-bold uppercase mb-4">Viewing</Text>
        
        <Pressable className="flex-row items-center justify-between bg-black/20 p-4 rounded-2xl mb-2">
          <View className="flex-row items-center gap-3">
            <Users size={20} color="#FFFFFF" />
            <View>
              <Text className="text-white text-sm font-bold">Hide Story From</Text>
              <Text className="text-neutral-grey text-xs mt-1">0 People</Text>
            </View>
          </View>
          <Text className="text-neutral-grey text-lg">›</Text>
        </Pressable>

        <Pressable className="flex-row items-center justify-between bg-black/20 p-4 rounded-2xl mb-6">
          <View className="flex-row items-center gap-3">
            <View className="w-5 h-5 rounded-full border-2 border-[#10B981] items-center justify-center bg-[#10B981]/20">
              <Text className="text-white text-[8px] font-bold">★</Text>
            </View>
            <View>
              <Text className="text-white text-sm font-bold">Close Friends</Text>
              <Text className="text-neutral-grey text-xs mt-1">1 Person</Text>
            </View>
          </View>
          <Text className="text-neutral-grey text-lg">›</Text>
        </Pressable>

        <Text className="text-neutral-grey text-xs font-bold uppercase mb-4">Interactions</Text>
        
        <View className="bg-black/20 p-4 rounded-2xl mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <MessageCircle size={20} color="#FFFFFF" />
            <Text className="text-white text-sm font-bold">Allow Message Replies</Text>
          </View>
          <Switch 
            value={allowReplies} 
            onValueChange={setAllowReplies}
            trackColor={{ false: '#374151', true: '#A855F7' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View className="bg-black/20 p-4 rounded-2xl mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Share2 size={20} color="#FFFFFF" />
            <Text className="text-white text-sm font-bold">Allow Sharing to Messages</Text>
          </View>
          <Switch 
            value={allowSharing} 
            onValueChange={setAllowSharing}
            trackColor={{ false: '#374151', true: '#A855F7' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Text className="text-neutral-grey text-xs font-bold uppercase mb-4">Saving</Text>

        <View className="bg-black/20 p-4 rounded-2xl mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Download size={20} color="#FFFFFF" />
            <Text className="text-white text-sm font-bold">Save to Gallery</Text>
          </View>
          <Switch 
            value={saveToGallery} 
            onValueChange={setSaveToGallery}
            trackColor={{ false: '#374151', true: '#A855F7' }}
            thumbColor="#FFFFFF"
          />
        </View>

      </ScrollView>
    </View>
  );
}
