import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Search, Play, Pause } from 'lucide-react-native';
import { useAudioPlayer } from 'expo-audio';

interface MusicPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (song: any) => void;
}

const TRENDING_SONGS = [
  { id: '1', title: 'Paint The Town Red', artist: 'Doja Cat', duration: '3:51', cover: 'https://picsum.photos/100?1', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: '2', title: 'Water', artist: 'Tyla', duration: '3:20', cover: 'https://picsum.photos/100?2', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: '3', title: 'Greedy', artist: 'Tate McRae', duration: '2:11', cover: 'https://picsum.photos/100?3', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: '4', title: 'Cruel Summer', artist: 'Taylor Swift', duration: '2:58', cover: 'https://picsum.photos/100?4', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: '5', title: 'Strangers', artist: 'Kenya Grace', duration: '2:52', cover: 'https://picsum.photos/100?5', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
];

export default function MusicPickerSheet({ visible, onClose, onSelect }: MusicPickerSheetProps) {
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [songs, setSongs] = useState<any[]>(TRENDING_SONGS);
  const [loading, setLoading] = useState(false);

  const player = useAudioPlayer();

  // Clean up audio when sheet is hidden or unmounted
  useEffect(() => {
    if (!visible) {
      player?.pause();
      setTimeout(() => setPlayingId(null), 0);
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      try { player?.pause(); } catch(e) {}
    };
  }, []);

  const fetchSongs = async (query: string) => {
    if (!query.trim()) {
      setSongs(TRENDING_SONGS);
      return;
    }
    setLoading(true);
    try {
      // Added country=in for Bollywood/Hindi songs and increased limit for better results
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=40&country=in`);
      const data = await res.json();
      
      const formatted = data.results
        .filter((track: any) => track.previewUrl) // Only show songs that have a playable preview
        .map((track: any) => ({
          id: track.trackId.toString(),
          title: track.trackName,
          artist: track.artistName,
          duration: '0:30', 
          cover: track.artworkUrl100,
          audioUrl: track.previewUrl
        }));
        
      setSongs(formatted);
    } catch (e) {
      console.warn("iTunes API Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchSongs(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const togglePlay = (id: string, url: string) => {
    if (playingId === id) {
      setPlayingId(null);
      player?.pause();
    } else {
      setPlayingId(id);
      player?.replace(url);
      player?.play();
    }
  };

  const handleSelect = (song: any) => {
    player?.pause();
    onSelect(song);
  };

  if (!visible) return null;

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-[#1A0E2C] rounded-t-3xl border-t border-white/10 z-50 h-[85%]">
      <View className="flex-row items-center justify-between p-4 border-b border-white/5">
        <View className="w-8" />
        <Text className="text-white text-lg font-bold">Pick Music</Text>
        <Pressable onPress={() => { player?.pause(); onClose(); }} className="w-8 h-8 items-center justify-center bg-white/10 rounded-full">
          <Text className="text-white text-sm font-bold">✕</Text>
        </Pressable>
      </View>

      <View className="p-4">
        <View className="flex-row items-center bg-black/40 rounded-full px-4 py-2.5 border border-white/10">
          <Search size={18} color="#6B7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search music..."
            placeholderTextColor="#6B7280"
            className="flex-1 ml-2 text-white font-medium"
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#A855F7" />
          <Text className="text-white mt-4 font-bold">Searching iTunes...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 60 }}>
          <Text className="text-neutral-grey text-xs font-bold uppercase mb-4 ml-2">
            {search.trim() ? 'Search Results' : 'Trending Now'}
          </Text>
          
          {songs.map((song) => (
            <View 
              key={song.id} 
              className="flex-row items-center justify-between mb-4 bg-black/20 p-3 rounded-2xl"
            >
              <Pressable onPress={() => handleSelect(song)} className="flex-row items-center gap-3 flex-1">
                <Image source={{ uri: song.cover }} className="w-12 h-12 rounded-lg" />
                <View className="flex-1 pr-2">
                  <Text className="text-white font-bold text-sm mb-1" numberOfLines={1}>{song.title}</Text>
                  <Text className="text-neutral-grey text-xs" numberOfLines={1}>{song.artist}</Text>
                </View>
              </Pressable>

              <View className="flex-row items-center gap-4 pl-2">
                <Text className="text-neutral-grey text-xs">{song.duration}</Text>
                <Pressable 
                  onPress={() => togglePlay(song.id, song.audioUrl)}
                  className={`w-10 h-10 rounded-full items-center justify-center ${playingId === song.id ? 'bg-[#A855F7]' : 'border border-white/20'}`}
                >
                  {playingId === song.id ? (
                    <Pause size={18} color="#FFFFFF" />
                  ) : (
                    <Play size={18} color="#FFFFFF" className="ml-0.5" />
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
