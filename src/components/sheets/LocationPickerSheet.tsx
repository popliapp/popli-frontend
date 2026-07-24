import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Keyboard } from 'react-native';
import { MapPin, Search, X, Navigation } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestGPSLocation, searchIndianCities, NominatimCity } from '../../services/geoService';

interface LocationPickerSheetProps {
  onSelect: (location: { locationName: string; latitude: number; longitude: number; placeId: string } | null) => void;
  onClose: () => void;
  currentLocation?: { locationName: string; latitude?: number; longitude?: number; placeId?: string } | null;
}

export default function LocationPickerSheet({ onSelect, onClose, currentLocation }: LocationPickerSheetProps) {
  const insets = useSafeAreaInsets();
const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<{ locationName: string; latitude: number; longitude: number } | null>(null);

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    const gps = await requestGPSLocation(true);
    if (gps) {
      const loc = { locationName: gps.city, latitude: gps.latitude, longitude: gps.longitude, placeId: '' };
      setDetectedLocation(loc);
    } else {
      setDetectedLocation(null);
    }
    setIsDetecting(false);
  };

  useEffect(() => {
    handleAutoDetect();
  }, []);
const searchLocations = async (q: string) => {
    try {
      setIsLoading(true);
      const cities = await searchIndianCities(q);
  setResults(cities.map(c => ({
        locationName: c.name,
        displayName: c.displayName,
        latitude: c.latitude,
        longitude: c.longitude,
        placeId: `${c.latitude},${c.longitude}`,
      })));
    } catch (err) {
      console.warn("Failed to search locations", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!query) {
      setTimeout(() => setResults([]), 0);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      searchLocations(query);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <View className="flex-1 bg-[#12081E]" style={{ paddingTop: Math.max(insets.top, 16) }}>
      <View className="flex-row items-center justify-between px-4 pb-4 border-b border-white/10">
        <Text className="text-white font-bold text-lg">Add Location</Text>
        <Pressable onPress={onClose} className="p-2">
          <X size={24} color="#FFFFFF" />
        </Pressable>
      </View>

   {/* Auto Detect Button */}
      <View className="px-4 pt-4 pb-2">
        <Pressable
          onPress={handleAutoDetect}
          disabled={isDetecting}
          className="flex-row items-center justify-between bg-[#1A0E2C] rounded-xl px-4 py-3 border border-[#A855F7]/30"
        >
          <View className="flex-row items-center gap-3">
            <Navigation size={20} color="#A855F7" />
            <View>
              <Text className="text-white font-bold text-sm">Use Current Location</Text>
              {isDetecting ? (
                <Text className="text-[#9CA3AF] text-xs mt-0.5">Detecting...</Text>
              ) : detectedLocation ? (
                <Text className="text-[#A855F7] text-xs mt-0.5">{detectedLocation.locationName}</Text>
              ) : (
                <Text className="text-[#9CA3AF] text-xs mt-0.5">Tap to detect your location</Text>
              )}
            </View>
          </View>
          {isDetecting ? (
            <ActivityIndicator size="small" color="#A855F7" />
          ) : detectedLocation ? (
            <Pressable onPress={() => { onSelect({ ...detectedLocation, placeId: '' }); onClose(); }}
              className="bg-[#A855F7] px-3 py-1.5 rounded-lg">
              <Text className="text-white text-xs font-bold">Use</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </View>

      <View className="p-4">
        <View className="flex-row items-center bg-[#1A0E2C] rounded-xl px-4 py-3 border border-white/5">
          <Search size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 text-white ml-3 text-base"
            placeholder="Search places..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <X size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        {currentLocation && !query && (
          <View className="mb-4">
            <Text className="text-[#9CA3AF] text-xs font-bold mb-2 uppercase">Current Selection</Text>
            <Pressable
              onPress={() => {
                onSelect(null);
                onClose();
              }}
              className="flex-row items-center py-3 border-b border-white/5"
            >
              <View className="w-10 h-10 rounded-full bg-[#10B981]/20 items-center justify-center mr-3">
                <MapPin size={20} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base" numberOfLines={1}>{currentLocation.locationName}</Text>
                <Text className="text-[#10B981] text-xs mt-0.5">Remove location</Text>
              </View>
            </Pressable>
          </View>
        )}

        {isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator size="small" color="#A855F7" />
            <Text className="text-[#9CA3AF] mt-4">Searching places...</Text>
          </View>
        ) : (
          <View>
            {results.map((loc, idx) => (
              <Pressable
                key={loc.placeId || idx}
                onPress={() => {
                  Keyboard.dismiss();
                  onSelect(loc);
                  onClose();
                }}
                className="flex-row items-center py-3 border-b border-white/5"
              >
                <View className="w-10 h-10 rounded-full bg-[#3E2B5C] items-center justify-center mr-3">
                  <MapPin size={20} color="#A855F7" />
                </View>
                <View className="flex-1">
                <Text className="text-white font-bold text-base" numberOfLines={1}>{loc.locationName}</Text>
                  <Text className="text-[#9CA3AF] text-xs mt-0.5" numberOfLines={1}>{loc.displayName}</Text>
                </View>
              </Pressable>
            ))}

            {query.length > 0 && results.length === 0 && !isLoading && (
              <View className="py-8 items-center">
                <Text className="text-[#9CA3AF]">No locations found for &quot;{query}&quot;</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
