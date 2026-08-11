import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, Platform, ScrollView, ActivityIndicator, Switch, Modal } from 'react-native';
import { showError } from '../../store/toastStore';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, IndianRupee, Gift, MapPin, UserPlus, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../store';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LocationPickerSheet from '../../components/sheets/LocationPickerSheet';
import TagPeopleSheet from '../../components/sheets/TagPeopleSheet';

export default function ShareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uri: string, type: string, mode: string, musicId?: string, musicName?: string, musicUrl?: string, challengeId?: string, isStory?: string, isVideoMuted?: string }>();
  const insets = useSafeAreaInsets();
  
  const [caption, setCaption] = useState('');
  const [hashtagInput, setHashtagInput] = useState(''); 

  // Location & Tags
  const [location, setLocation] = useState<{ locationName: string; latitude?: number; longitude?: number; placeId?: string } | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<any[]>([]);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [isTagSheetOpen, setIsTagSheetOpen] = useState(false);
  
  // Toggles & Settings
  const [selectedCategory, setSelectedCategory] = useState<string>('Dance');
  const [isMonetized, setIsMonetized] = useState(true);
  const [allowGifting, setAllowGifting] = useState(true);
  const [visibility, setVisibility] = useState<'Public' | 'Friends' | 'Private'>('Public');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);

  const CATEGORIES = ["Dance", "Music", "Tech", "Fitness", "Culinary", "Gaming", "Vlog", "Education", "Fashion"];

  const handleAddHashtag = () => {
    let tag = hashtagInput.trim();
    if (!tag) return;
    if (!tag.startsWith('#')) tag = '#' + tag;
    
    setCaption(prev => prev.length > 0 ? `${prev} ${tag}` : tag);
    setHashtagInput('');
  };

  const handlePostNow = () => {
  if (!params.uri) {
      showError('Missing media file');
      return;
    }

  
 router.push({
      pathname: '/(create)/share-story',
      params: {
    uri: params.uri,
        type: params.type || 'video',
        mode: params.mode || 'REEL',
        text: caption,
        category: selectedCategory,
        isMonetized: String(isMonetized),
        allowGifting: String(allowGifting),
        visibility: visibility,
        allowComments: String(allowComments),
        allowDuet: String(allowDuet),
        musicId: params.musicId,
        musicTitle: params.musicName,
        musicUrl: params.musicUrl,
        challengeId: params.challengeId,
        isStory: params.isStory || 'false',
        isVideoMuted: params.isVideoMuted || 'false',
        location: location ? JSON.stringify(location) : undefined,
        taggedUserIds: taggedUsers.length > 0 ? JSON.stringify(taggedUsers.map(u => u.id)) : undefined,
      }
    });
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    const tag = `#${cat.toLowerCase()}`;
    if (!caption.includes(tag)) {
      setCaption(prev => prev.length > 0 ? `${prev} ${tag}` : tag);
    }
  };

  return (
    <View className="flex-1 bg-[#12081E]">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        
        {/* Header */}
        <View className="flex-row items-center px-4 pt-14 pb-4 border-b border-white/5 relative">
          <Pressable onPress={() => router.back()} className="absolute left-4 top-14 p-2 z-10">
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <View className="flex-1 items-center">
            <Text className="text-white font-bold text-lg">Post Details</Text>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 100 }}>
          
          {/* Caption & Preview */}
          <View className="p-4 border-b border-white/5">
            <View className="flex-row">
              <View className="relative w-[80px] h-[100px] rounded-xl overflow-hidden bg-white/10 mr-4">
                <Image source={{ uri: params.uri }} className="w-full h-full" resizeMode="cover" />
                <View className="absolute top-2 left-2 w-5 h-5 bg-[#10B981] rounded-full items-center justify-center border-2 border-[#12081E]">
                  <Text className="text-[#12081E] text-[10px] font-bold">✓</Text>
                </View>
                <View className="absolute bottom-2 right-2 w-5 h-5 bg-transparent rounded-full items-center justify-center border-2 border-[#10B981]">
                  <Text className="text-[#10B981] text-[10px] font-bold">✓</Text>
                </View>
              </View>
              
              <TextInput
                className="flex-1 text-white text-base"
                placeholder="Write a caption..."
                placeholderTextColor="#9CA3AF"
                multiline
                value={caption}
                onChangeText={setCaption}
                textAlignVertical="top"
                maxLength={200}
              />
            </View>
            <Text className="text-[#6B7280] text-xs text-right mt-2">{caption.length}/200</Text>
          </View>

          {/* HASHTAGS */}
          <View className="p-4 border-b border-white/5">
            <Text className="text-[#9CA3AF] text-xs font-bold tracking-wider mb-3 uppercase">Hashtags</Text>
            <View className="flex-row items-center gap-2 mb-3">
              <TextInput
                className="flex-1 bg-[#1A0E2C] text-white px-4 py-3 rounded-lg border border-white/5"
                placeholder="#trending"
                placeholderTextColor="#6B7280"
                value={hashtagInput}
                onChangeText={setHashtagInput}
                autoCapitalize="none"
              />
              <Pressable 
                onPress={handleAddHashtag}
                className="bg-[#3E2B5C] border border-[#A855F7]/30 px-6 py-3 rounded-lg"
              >
                <Text className="text-[#A855F7] font-bold text-base">Add</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {['#trending', '#foryou', '#viral', '#dance', '#comedy', '#music'].map(tag => (
                <Pressable 
                  key={tag}
                  onPress={() => {
                    if (!caption.includes(tag)) {
                      setCaption(prev => prev.length > 0 ? `${prev} ${tag}` : tag);
                    }
                  }}
                  className="mr-2 px-4 py-1.5 rounded-full bg-white/10"
                >
                  <Text className="text-white/80">{tag}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* CATEGORY */}
          <View className="p-4 border-b border-white/5">
            <Text className="text-[#9CA3AF] text-xs font-bold tracking-wider mb-3 uppercase">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {CATEGORIES.map(cat => (
                <Pressable 
                  key={cat}
                  onPress={() => handleCategorySelect(cat)}
                  className={`mr-3 px-5 py-2 rounded-full border ${selectedCategory === cat ? 'bg-[#3E2B5C] border-[#A855F7]' : 'bg-transparent border-white/10'}`}
                >
                  <Text className={selectedCategory === cat ? 'text-[#A855F7] font-bold' : 'text-white/70'}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* TAG PEOPLE & LOCATION */}
          <View className="p-4 border-b border-white/5 gap-2">
            <Pressable 
              onPress={() => setIsTagSheetOpen(true)}
              className="flex-row items-center justify-between py-2"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-[#1A0E2C] items-center justify-center border border-white/5">
                  <UserPlus size={20} color="#9CA3AF" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">Tag People</Text>
                  {taggedUsers.length > 0 && (
                    <Text className="text-[#A855F7] text-xs mt-0.5">{taggedUsers.length} people tagged</Text>
                  )}
                </View>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </Pressable>

            <Pressable 
              onPress={() => setIsLocationSheetOpen(true)}
              className="flex-row items-center justify-between py-2"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-[#1A0E2C] items-center justify-center border border-white/5">
                  <MapPin size={20} color="#9CA3AF" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">Add Location</Text>
                  {location && (
                    <Text className="text-[#A855F7] text-xs mt-0.5">{location.locationName.split(',')[0]}</Text>
                  )}
                </View>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* MONETISATION & REWARDS */}
          {params.mode !== 'POST' && (
            <View className="p-4 border-b border-white/5 gap-6">
              <Text className="text-[#9CA3AF] text-xs font-bold tracking-wider uppercase">Monetisation & Rewards</Text>
              
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <IndianRupee size={22} color="#10B981" />
                  <View>
                    <Text className="text-white font-bold text-base">Monetisation</Text>
                    <Text className="text-[#9CA3AF] text-xs mt-1">Earn from views ₹5 per 1,000 views</Text>
                  </View>
                </View>
                <Switch
                  trackColor={{ false: "#3E2B5C", true: "#10B981" }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#3E2B5C"
                  onValueChange={setIsMonetized}
                  value={isMonetized}
                />
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Gift size={22} color="#F59E0B" />
                  <View>
                    <Text className="text-white font-bold text-base">Allow Virtual Gifting</Text>
                    <Text className="text-[#9CA3AF] text-xs mt-1">Receive gifts from fans</Text>
                  </View>
                </View>
                <Switch
                  trackColor={{ false: "#3E2B5C", true: "#A855F7" }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#3E2B5C"
                  onValueChange={setAllowGifting}
                  value={allowGifting}
                />
              </View>
            </View>
          )}

          {/* VISIBILITY */}
          <View className="p-4 border-b border-white/5">
            <Text className="text-[#9CA3AF] text-xs font-bold tracking-wider mb-3 uppercase">Visibility</Text>
            <View className="flex-row rounded-lg border border-white/10 overflow-hidden">
              {['Public', 'Friends', 'Private'].map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => setVisibility(opt as any)}
                  className={`flex-1 py-3 items-center justify-center ${visibility === opt ? 'bg-[#3E2B5C]' : 'bg-[#1A0E2C]'}`}
                >
                  <Text className={visibility === opt ? 'text-[#A855F7] font-bold' : 'text-white/70'}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ENGAGEMENT CONTROLS */}
          <View className="p-4 border-b border-white/5 gap-6">
            <Text className="text-[#9CA3AF] text-xs font-bold tracking-wider uppercase">Engagement Controls</Text>
            
            <View className="flex-row items-center justify-between">
              <Text className="text-white font-bold text-base">Allow Comments</Text>
              <Switch
                trackColor={{ false: "#3E2B5C", true: "#A855F7" }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#3E2B5C"
                onValueChange={setAllowComments}
                value={allowComments}
              />
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-white font-bold text-base">Allow Duet / Remix</Text>
              <Switch
                trackColor={{ false: "#3E2B5C", true: "#A855F7" }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#3E2B5C"
                onValueChange={setAllowDuet}
                value={allowDuet}
              />
            </View>
          </View>

          {/* Disclaimer */}
          <View className="p-6">
            <Text className="text-[#6B7280] text-xs text-center leading-5">
              By posting, you agree to our Content Policy and acknowledge that monetization is subject to verification.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isLocationSheetOpen} animationType="slide" transparent>
        <LocationPickerSheet
          onClose={() => setIsLocationSheetOpen(false)}
          onSelect={setLocation}
          currentLocation={location}
        />
      </Modal>

      <Modal visible={isTagSheetOpen} animationType="slide" transparent>
        <TagPeopleSheet
          onClose={() => setIsTagSheetOpen(false)}
          onComplete={(users) => {
            setTaggedUsers(users);
            setIsTagSheetOpen(false);
          }}
          initialSelectedUsers={taggedUsers}
        />
      </Modal>

      {/* Footer Button */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-[#12081E] border-t border-white/5" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
        <Pressable 
          onPress={handlePostNow}
          className="bg-[#A855F7] py-4 rounded-xl items-center justify-center flex-row gap-2 active:scale-[0.98] transition-all"
        >
          <Text className="text-white font-bold text-lg">Post Now</Text>
        </Pressable>
      </View>
    </View>
  );
}
