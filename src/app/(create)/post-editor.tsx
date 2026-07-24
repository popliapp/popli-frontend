import React, { useState, useEffect } from 'react';
import { View, Text, Image, TextInput, Pressable, Platform, ScrollView, ActivityIndicator, Modal, FlatList, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MapPin, Users, Music, ChevronRight, Check, Search, X, IndianRupee, Camera, ImageIcon, RefreshCw, Navigation, Pencil } from 'lucide-react-native';
import { useFeedStore, useAuthStore } from '../../store';
import { apiClient } from '../../api/client';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { searchIndianCities } from '../../services/geoService';
import { showError, showInfo } from '../../store/toastStore';

const MUSIC_TRACKS = ['Trending Track 1', 'Bollywood Mashup', 'Lo-Fi Chill', 'Gym Motivation', 'Romantic Hits', 'Aesthetic Vibes', 'Viral Audio 2026'];

export default function PostEditorScreen() {
  const router = useRouter();
  const { uri: paramUri, mode, type } = useLocalSearchParams<{ uri: string, mode: string, type?: string }>();

  const [mediaUri, setMediaUri] = useState<string>(paramUri || '');
  const [caption, setCaption] = useState('');
  const [isPosting, setIsPosting] = useState(false);

 const [taggedUsers, setTaggedUsers] = useState<any[]>([]);
  const [musicName, setMusicName] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [isMonetized, setIsMonetized] = useState<boolean>(true);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Manual location selection
  const [locationMode, setLocationMode] = useState<'auto' | 'manual' | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Auto-detect location on mount
  useEffect(() => {
    autoDetectLocation();
  }, []);

 const autoDetectLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return; // Don't ask again if not granted

      setIsLoadingLocation(true);
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geo?.city) {
        setCity(geo.city);
        setLocationMode('auto');
      } else if (geo?.region) {
        setCity(geo.region);
        setLocationMode('auto');
      }
    } catch (e) {
      // Silently fail — location is optional
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const requestAndDetectLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showInfo('Location permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geo?.city) {
        setCity(geo.city);
        setLocationMode('auto');
      } else if (geo?.region) {
        setCity(geo.region);
        setLocationMode('auto');
      } else {
        showInfo('Could not detect city');
      }
    } catch (e) {
      showError('Failed to detect location');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Use current (auto-detected) location from within the location modal
  const handleUseCurrentLocation = async () => {
    await requestAndDetectLocation();
    setIsLocationModalOpen(false);
    setLocationQuery('');
    setLocationResults([]);
  };

  // Forward-geocode a free-text query into a list of selectable place suggestions
const searchLocations = async (query: string) => {
    if (!query.trim()) {
      setLocationResults([]);
      return;
    }
    setIsSearchingLocation(true);
    try {
      const cities = await searchIndianCities(query);
      setLocationResults(cities.map(c => ({
        id: `${c.latitude}-${c.longitude}`,
        name: c.name,
        displayName: c.displayName,
        latitude: c.latitude,
        longitude: c.longitude,
      })));
    } catch (e) {
      setLocationResults([]);
    } finally {
      setIsSearchingLocation(false);
    }
  };
  useEffect(() => {
    if (locationQuery.trim().length > 1) {
      const delayDebounceFn = setTimeout(() => searchLocations(locationQuery), 500);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setTimeout(() => setLocationResults([]), 0);
    }
  }, [locationQuery]);

  const selectManualLocation = (loc: any) => {
    setCity(loc.name);
    setLocationMode('manual');
    setLocationQuery('');
    setLocationResults([]);
    setIsLocationModalOpen(false);
  };

  const clearLocation = () => {
    setCity('');
    setLocationMode(null);
    setLocationQuery('');
    setLocationResults([]);
  };

  const openGallery = async () => {
    setIsMediaPickerOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const openCamera = async () => {
    setIsMediaPickerOpen(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showError('Camera permission required');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const searchUsers = async (q: string) => {
    setIsSearching(true);
    try {
      const res = await apiClient.get(`/users/search?q=${q}`);
      setSearchResults(res.data);
    } catch (e) {
      console.log('Error searching users', e);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (searchQuery.length > 1) {
      const delayDebounceFn = setTimeout(() => searchUsers(searchQuery), 500);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setTimeout(() => setSearchResults([]), 0);
    }
  }, [searchQuery]);

  const toggleTagUser = (user: any) => {
    if (taggedUsers.find(u => u.id === user.id)) {
      setTaggedUsers(taggedUsers.filter(u => u.id !== user.id));
    } else {
      setTaggedUsers([...taggedUsers, user]);
    }
  };

  const handlePost = () => {
    if (!mediaUri) {
      showError('Please select an image first');
      return;
    }
  router.push({
      pathname: '/(create)/share',
      params: {
        uri: mediaUri,
        type: type || 'photo',
        mode: mode || 'POST',
        isStory: 'false',
        musicName,
        isVideoMuted: 'false',
      },
    });
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-[#12081E] pt-12">
      {/* Header */}
      <View className="flex-row items-center px-4 pb-4 border-b border-white/10">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={28} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white font-bold text-lg ml-2">New Post</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Media Preview + Caption */}
        <View className="flex-row p-4 border-b border-white/5">
          {/* Image picker / preview */}
          <Pressable
            onPress={() => setIsMediaPickerOpen(true)}
            className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 items-center justify-center border border-white/10"
          >
            {mediaUri ? (
              <>
                <Image source={{ uri: mediaUri }} className="w-full h-full" resizeMode="cover" />
                {/* Change overlay */}
                <View className="absolute inset-0 bg-black/30 items-center justify-center">
                  <RefreshCw size={16} color="#fff" />
                </View>
              </>
            ) : (
              <View className="items-center gap-1">
                <Camera size={24} color="rgba(255,255,255,0.4)" />
                <Text className="text-white/40 text-[9px] font-bold">ADD PHOTO</Text>
              </View>
            )}
          </Pressable>

          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a caption..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            className="flex-1 ml-4 text-white text-base h-20"
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Tag People */}
        <Pressable onPress={() => setIsTagModalOpen(true)} className="flex-row items-center justify-between p-4 border-b border-white/5 bg-black/10">
          <View className="flex-row items-center gap-3">
            <Users size={20} color={taggedUsers.length > 0 ? "#A855F7" : "#FFFFFF"} />
            <Text className="text-white text-base">
              {taggedUsers.length > 0 ? `${taggedUsers.length} People Tagged` : 'Tag people'}
            </Text>
          </View>
          <ChevronRight size={20} color="#6B7280" />
        </Pressable>

        {/* Music */}
        <Pressable onPress={() => setIsMusicModalOpen(true)} className="flex-row items-center justify-between p-4 border-b border-white/5 bg-black/10">
          <View className="flex-row items-center gap-3">
            <Music size={20} color={musicName ? "#A855F7" : "#FFFFFF"} />
            <Text className="text-white text-base">{musicName || 'Add music'}</Text>
          </View>
          <ChevronRight size={20} color="#6B7280" />
        </Pressable>

    {/* Location */}
        <Pressable
          onPress={() => setIsLocationModalOpen(true)}
          className="flex-row items-center justify-between p-4 border-b border-white/5 active:bg-white/5"
        >
          <View className="flex-row items-center gap-3 flex-1">
            <MapPin size={20} color="#A855F7" />
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color="#A855F7" />
            ) : (
              <View className="flex-1">
                <Text className="text-white text-base" numberOfLines={1}>{city || 'Add Location'}</Text>
                {city ? (
                  <Text className="text-neutral-grey text-[10px] mt-0.5 font-bold uppercase">
                    {locationMode === 'manual' ? 'Manually selected' : 'Auto-detected'}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
          {city ? (
            <View className="flex-row items-center gap-4">
              <Pressable onPress={() => setIsLocationModalOpen(true)} hitSlop={8}>
                <Pencil size={16} color="#6B7280" />
              </Pressable>
              <Pressable onPress={clearLocation} hitSlop={8}>
                <X size={16} color="#6B7280" />
              </Pressable>
            </View>
          ) : (
            <ChevronRight size={20} color="#6B7280" />
          )}
        </Pressable>

    

        <View className="p-4 mt-4">
          <Text className="text-neutral-grey text-xs">By sharing, you agree to our Terms of Service and Community Guidelines.</Text>
        </View>
      </ScrollView>

      {/* Share Button */}
      <View className="p-4 pb-8 border-t border-white/5 bg-[#12081E]">
        <Pressable
          onPress={handlePost}
          disabled={isPosting || !mediaUri}
          className="py-4 rounded-full items-center justify-center flex-row gap-2"
          style={{ backgroundColor: mediaUri ? '#A855F7' : 'rgba(168,85,247,0.3)' }}
        >
          {isPosting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold text-base">Share Post</Text>
          )}
        </Pressable>
      </View>

      {/* Media Picker Bottom Sheet */}
      <Modal visible={isMediaPickerOpen} transparent animationType="slide" onRequestClose={() => setIsMediaPickerOpen(false)}>
        <Pressable className="flex-1 bg-black/50" onPress={() => setIsMediaPickerOpen(false)} />
        <View className="bg-[#1A0E2C] rounded-t-3xl px-5 pt-4 pb-10 border-t border-white/5">
          <View className="w-12 h-1 bg-white/20 rounded-full self-center mb-6" />
          <Text className="text-white font-bold text-lg mb-4">Select Photo</Text>

          <Pressable onPress={openCamera} className="flex-row items-center gap-4 py-4 border-b border-white/5 active:opacity-70">
            <View className="w-12 h-12 rounded-full bg-[#A855F7]/20 items-center justify-center">
              <Camera size={22} color="#A855F7" />
            </View>
            <View>
              <Text className="text-white font-bold text-base">Take a Photo</Text>
              <Text className="text-white/50 text-xs mt-0.5">Use your camera</Text>
            </View>
          </Pressable>

          <Pressable onPress={openGallery} className="flex-row items-center gap-4 py-4 active:opacity-70">
            <View className="w-12 h-12 rounded-full bg-[#A855F7]/20 items-center justify-center">
              <ImageIcon size={22} color="#A855F7" />
            </View>
            <View>
              <Text className="text-white font-bold text-base">Choose from Gallery</Text>
              <Text className="text-white/50 text-xs mt-0.5">Pick an existing photo</Text>
            </View>
          </Pressable>

          {mediaUri ? (
            <Pressable onPress={() => { setMediaUri(''); setIsMediaPickerOpen(false); }} className="flex-row items-center gap-4 py-4 border-t border-white/5 active:opacity-70">
              <View className="w-12 h-12 rounded-full bg-red-500/20 items-center justify-center">
                <X size={22} color="#EF4444" />
              </View>
              <Text className="text-red-400 font-bold text-base">Remove Photo</Text>
            </Pressable>
          ) : null}
        </View>
      </Modal>

      {/* Tag People Modal */}
      <Modal visible={isTagModalOpen} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-[#1A0B2E] pt-10">
          <View className="flex-row items-center justify-between px-4 pb-4 border-b border-white/10">
            <Text className="text-white font-bold text-lg">Tag People</Text>
            <Pressable onPress={() => setIsTagModalOpen(false)}>
              <Text className="text-[#A855F7] font-bold">Done</Text>
            </Pressable>
          </View>
          <View className="p-4 border-b border-white/10">
            <View className="flex-row items-center bg-black/30 rounded-xl px-4 py-2">
              <Search size={20} color="#6B7280" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search usernames..."
                placeholderTextColor="#6B7280"
                className="flex-1 ml-3 text-white h-10"
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <X size={20} color="#6B7280" />
                </Pressable>
              )}
            </View>
          </View>

          {taggedUsers.length > 0 && (
            <View className="p-4 border-b border-white/10">
              <Text className="text-neutral-grey mb-2 text-xs font-bold">TAGGED ({taggedUsers.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {taggedUsers.map(u => (
                  <Pressable key={u.id} onPress={() => toggleTagUser(u)} className="mr-3 items-center bg-black/20 p-2 rounded-xl">
                    <Image source={{ uri: u.avatar || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200' }} className="w-12 h-12 rounded-full mb-1" />
                    <Text className="text-white text-xs">@{u.username}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {isSearching ? (
            <ActivityIndicator className="mt-10" color="#A855F7" />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const isSelected = taggedUsers.find(u => u.id === item.id);
                return (
                  <Pressable onPress={() => toggleTagUser(item)} className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center">
                      <Image source={{ uri: item.avatar || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200' }} className="w-12 h-12 rounded-full" />
                      <View className="ml-3">
                        <Text className="text-white font-bold">{item.name}</Text>
                        <Text className="text-neutral-grey">@{item.username}</Text>
                      </View>
                    </View>
                    {isSelected && <Check size={24} color="#A855F7" />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={() => (
                <Text className="text-neutral-grey text-center mt-10">
                  {searchQuery.length > 0 ? 'No users found' : 'Search to tag people'}
                </Text>
              )}
            />
          )}
        </View>
      </Modal>
 {/* Music Modal */}
      <Modal visible={isMusicModalOpen} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-[#1A0B2E] pt-10">
          <View className="flex-row items-center justify-between px-4 pb-4 border-b border-white/10">
            <Text className="text-white font-bold text-lg">Add Music</Text>
            <Pressable onPress={() => setIsMusicModalOpen(false)}>
              <Text className="text-[#A855F7] font-bold">Cancel</Text>
            </Pressable>
          </View>
          <FlatList
            data={MUSIC_TRACKS}
            keyExtractor={(item) => item}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { setMusicName(item); setIsMusicModalOpen(false); }}
                className="flex-row items-center justify-between py-4 border-b border-white/5"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-black/30 rounded-lg items-center justify-center">
                    <Music size={20} color="#A855F7" />
                  </View>
                  <Text className="text-white text-base">{item}</Text>
                </View>
                {musicName === item && <Check size={24} color="#A855F7" />}
              </Pressable>
            )}
            ListHeaderComponent={() => (
              <Pressable onPress={() => { setMusicName(''); setIsMusicModalOpen(false); }} className="py-4 border-b border-white/5 mb-2">
                <Text className="text-red-400 font-bold">Remove Music</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {/* Location Modal — Auto Detect + Manual Search */}
      <Modal
        visible={isLocationModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsLocationModalOpen(false)}
      >
        <View className="flex-1 bg-[#1A0B2E] pt-10">
          <View className="flex-row items-center justify-between px-4 pb-4 border-b border-white/10">
            <Text className="text-white font-bold text-lg">Location</Text>
            <Pressable
              onPress={() => {
                setIsLocationModalOpen(false);
                setLocationQuery('');
                setLocationResults([]);
              }}
            >
              <Text className="text-[#A855F7] font-bold">Done</Text>
            </Pressable>
          </View>

          {/* Currently selected location */}
          {city ? (
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20">
              <View className="flex-row items-center gap-3 flex-1">
                <MapPin size={18} color="#A855F7" />
                <View className="flex-1">
                  <Text className="text-white text-sm" numberOfLines={1}>{city}</Text>
                  <Text className="text-neutral-grey text-[10px] font-bold uppercase mt-0.5">
                    {locationMode === 'manual' ? 'Manually selected' : 'Auto-detected'}
                  </Text>
                </View>
              </View>
              <Pressable onPress={clearLocation} hitSlop={8} className="ml-3">
                <Text className="text-red-400 text-xs font-bold">Clear</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Use current location */}
          <Pressable
            onPress={handleUseCurrentLocation}
            disabled={isLoadingLocation}
            className="flex-row items-center gap-4 px-4 py-4 border-b border-white/10 active:opacity-70"
          >
            <View className="w-11 h-11 rounded-full bg-[#A855F7]/20 items-center justify-center">
              {isLoadingLocation ? (
                <ActivityIndicator size="small" color="#A855F7" />
              ) : (
                <Navigation size={20} color="#A855F7" />
              )}
            </View>
            <View>
              <Text className="text-white font-bold text-base">Use Current Location</Text>
              <Text className="text-white/50 text-xs mt-0.5">Auto-detect using GPS</Text>
            </View>
          </Pressable>

          {/* Manual search */}
          <View className="p-4 border-b border-white/10">
            <View className="flex-row items-center bg-black/30 rounded-xl px-4 py-2">
              <Search size={20} color="#6B7280" />
              <TextInput
                value={locationQuery}
                onChangeText={setLocationQuery}
                placeholder="Search for a city or place..."
                placeholderTextColor="#6B7280"
                className="flex-1 ml-3 text-white h-10"
                autoCapitalize="words"
              />
              {locationQuery.length > 0 && (
                <Pressable onPress={() => { setLocationQuery(''); setLocationResults([]); }}>
                  <X size={20} color="#6B7280" />
                </Pressable>
              )}
            </View>
          </View>

          {isSearchingLocation ? (
            <ActivityIndicator className="mt-10" color="#A855F7" />
          ) : (
            <FlatList
              data={locationResults}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => selectManualLocation(item)}
                  className="flex-row items-center justify-between mb-4"
                >
                  <View className="flex-row items-center flex-1 pr-3">
                    <View className="w-10 h-10 rounded-full bg-black/30 items-center justify-center">
                      <MapPin size={18} color="#A855F7" />
                    </View>
                  <View className="flex-1 ml-3">
                      <Text className="text-white font-semibold text-sm" numberOfLines={1}>{item.name}</Text>
                      {item.displayName && (
                        <Text className="text-white/40 text-xs mt-0.5" numberOfLines={1}>{item.displayName}</Text>
                      )}
                    </View>
                  </View>
                  {city === item.name && <Check size={22} color="#A855F7" />}
                </Pressable>
              )}
              ListEmptyComponent={() => (
                <Text className="text-neutral-grey text-center mt-10">
                  {locationQuery.length > 0 ? 'No places found' : 'Search to find a location'}
                </Text>
              )}
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}