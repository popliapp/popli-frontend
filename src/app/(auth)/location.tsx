import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, Platform, ActivityIndicator, TextInput, FlatList, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { useFeedStore, useAuthStore } from '../../store';
import { ChevronLeft, Sparkles, Navigation, ChevronRight, Search, MapPin, X } from 'lucide-react-native';
import { MotiView } from 'moti';
import * as Location from 'expo-location';
import { searchIndianCities, NominatimCity } from '../../services/geoService';

export default function LocationScreen() {
  const { setGPS, setNearbyEnabled } = useFeedStore();
  const { updateProfile } = useAuthStore();

  const [isGPSLoading, setIsGPSLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimCity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCity, setSelectedCity] = useState<NominatimCity | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    setSelectedCity(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const cities = await searchIndianCities(text);
      setResults(cities);
      setIsSearching(false);
    }, 400);
  }, []);

const handleSelectCity = (city: NominatimCity) => {
    Keyboard.dismiss();
    setSelectedCity(city);
    setQuery(city.name);
    setResults([]);
    setGPS(city.latitude, city.longitude, city.name);
    setNearbyEnabled(true);
    // Don't await — fire and forget so it doesn't trigger guard re-render
    updateProfile({ city: city.name }).catch(() => {});
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSelectedCity(null);
  };

const requestGPS = async () => {
    setIsGPSLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setIsGPSLoading(false); return; }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      const cityName = address?.city || address?.subregion || 'India';
     setGPS(location.coords.latitude, location.coords.longitude, cityName);
setNearbyEnabled(true);
useAuthStore.getState().setOnboardingStep('permissions');
updateProfile({ city: cityName }).catch(() => {});
setIsGPSLoading(false);
setTimeout(() => router.replace('/(auth)/permissions'), 50);
    } catch {
      setIsGPSLoading(false);
    }
  };

const handleNext = () => {
  if (!selectedCity) return;
  useAuthStore.getState().setOnboardingStep('permissions');
  setTimeout(() => router.replace('/(auth)/permissions'), 50);
};
  return (
    <View className="flex-1 bg-[#0B001A] px-6" style={{ paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 32 }}>

      {/* Top Nav */}
      <View className="flex-row items-center justify-between w-full h-12 mb-6">
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/interests')}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/5 items-center justify-center active:scale-[0.9]"
        >
          <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
        <View className="flex-row items-center space-x-1.5 bg-primary-pink/15 px-3 py-1.5 rounded-full border border-primary-pink/20">
          <Sparkles size={11} color="#EC4899" />
          <Text className="text-primary-pink text-[9px] font-black uppercase tracking-wider">Step 3 of 4</Text>
        </View>
      </View>

      {/* Heading */}
      <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 350 }}>
        <Text className="text-white font-black text-2xl tracking-tight mb-1">Where are you?</Text>
        <Text className="text-white/50 text-xs leading-5 mb-6">Search any city, town or district in India.</Text>
      </MotiView>

      {/* Search Bar */}
      <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 h-13 mb-2">
        {isSearching
          ? <ActivityIndicator size="small" color="#EC4899" style={{ marginRight: 10 }} />
          : <Search size={16} color="#ffffff60" style={{ marginRight: 10 }} />}
        <TextInput
          value={query}
          onChangeText={handleSearch}
          placeholder="Search city, town, district..."
          placeholderTextColor="#ffffff30"
          className="flex-1 text-white text-sm"
          autoCorrect={false}
          autoCapitalize="words"
        />
        {query.length > 0 && (
          <Pressable onPress={handleClear} className="ml-2 active:opacity-60">
            <X size={15} color="#ffffff50" />
          </Pressable>
        )}
      </View>

      {/* Results */}
      {results.length > 0 && (
        <MotiView
          from={{ opacity: 0, translateY: 6 }}
          animate={{ opacity: 1, translateY: 0 }}
          className="bg-[#160830] border border-white/8 rounded-2xl overflow-hidden mb-4"
        >
          <FlatList
            data={results}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 280 }}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => handleSelectCity(item)}
                className="flex-row items-start px-4 py-3 active:bg-white/5"
                style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: 'rgba(255,255,255,0.05)' }}
              >
                <MapPin size={14} color="#EC4899" style={{ marginTop: 2, marginRight: 10 }} />
                <View className="flex-1">
                  <Text className="text-white text-sm font-semibold">{item.name}</Text>
                  <Text className="text-white/40 text-xs mt-0.5" numberOfLines={1}>{item.displayName}</Text>
                </View>
              </Pressable>
            )}
          />
        </MotiView>
      )}

      {/* Selected City Badge */}
      {selectedCity && (
        <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-row items-center bg-primary-purple/15 border border-primary-pink/30 rounded-xl px-4 py-3 mb-4">
          <MapPin size={14} color="#EC4899" style={{ marginRight: 8 }} />
          <View className="flex-1">
            <Text className="text-white font-bold text-sm">{selectedCity.name}</Text>
            <Text className="text-white/40 text-xs" numberOfLines={1}>{selectedCity.displayName}</Text>
          </View>
        </MotiView>
      )}

      {/* Spacer */}
      <View className="flex-1" />

      {/* GPS Button */}
      <Pressable
        onPress={requestGPS}
        disabled={isGPSLoading}
        className="flex-row items-center justify-center space-x-2 py-3.5 rounded-2xl border border-white/10 bg-white/5 active:scale-[0.98] mb-3"
      >
        {isGPSLoading
          ? <ActivityIndicator color="#EC4899" size="small" />
          : <Navigation size={14} color="#EC4899" strokeWidth={2.5} />}
        <Text className="text-white/70 text-xs font-bold uppercase tracking-wider ml-2">Use My Current Location</Text>
      </Pressable>

      {/* Continue Button */}
      <Pressable
        onPress={handleNext}
        disabled={!selectedCity}
        className={`py-4 rounded-2xl items-center justify-center flex-row space-x-2 ${
          selectedCity ? 'bg-primary-purple active:scale-[0.98] shadow-lg shadow-primary-purple/40' : 'bg-white/5 border border-white/5 opacity-55'
        }`}
      >
        <Text className="text-white text-sm font-bold uppercase tracking-wider">
          {selectedCity ? 'Continue to Permissions' : 'Search & Select a City'}
        </Text>
        {selectedCity && <ChevronRight size={16} color="#FFFFFF" strokeWidth={3} />}
      </Pressable>

    </View>
  );
}