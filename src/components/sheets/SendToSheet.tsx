import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Search, Send, CheckCircle2 } from 'lucide-react-native';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store';

interface SendToSheetProps {
  onClose: () => void;
  onSend: (users: string[]) => void;
}

export default function SendToSheet({ onClose, onSend }: SendToSheetProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const currentUser = useAuthStore(state => state.userProfile);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        if (search.trim() === '') {
          if (currentUser?.id) {
            const res = await apiClient.get(`/social/${currentUser.id}/followers`);
            // The API might return { follower: { ... } } or just the user object
            setUsers(res.data.map((u: any) => u.follower || u));
          }
        } else {
          const res = await apiClient.get(`/users/search?q=${search}`);
          setUsers(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch users", err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSend = () => {
    onSend(selectedIds);
  };

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-[#1A0E2C] rounded-t-3xl border-t border-white/10 z-50 h-[85%]">
      <View className="flex-row items-center justify-between p-4 border-b border-white/5">
        <View className="w-8" />
        <Text className="text-white text-lg font-bold">Send To</Text>
        <Pressable onPress={onClose} className="w-8 h-8 items-center justify-center bg-white/10 rounded-full">
          <Text className="text-white text-sm font-bold">✕</Text>
        </Pressable>
      </View>

      <View className="p-4">
        <View className="flex-row items-center bg-black/40 rounded-full px-4 py-2.5 border border-white/10">
          <Search size={18} color="#6B7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search people..."
            placeholderTextColor="#6B7280"
            className="flex-1 ml-2 text-white font-medium"
            autoCapitalize="none"
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-neutral-grey text-xs font-bold uppercase mb-4 ml-2">{search ? 'Search Results' : 'Your Followers'}</Text>
        
        {loading && <ActivityIndicator color="#A855F7" className="mt-4" />}
        
        {!loading && users.map((user) => (
          <Pressable 
            key={user.id} 
            onPress={() => toggleSelect(user.id)}
            className="flex-row items-center justify-between mb-4 bg-black/20 p-3 rounded-2xl"
          >
            <View className="flex-row items-center gap-3">
              <Image source={{ uri: user.avatar || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200' }} className="w-12 h-12 rounded-full" />
              <View>
                <Text className="text-white font-bold text-sm">{user.name}</Text>
                <Text className="text-neutral-grey text-xs">@{user.username}</Text>
              </View>
            </View>

            <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedIds.includes(user.id) ? 'border-[#A855F7] bg-[#A855F7]' : 'border-white/20'}`}>
              {selectedIds.includes(user.id) && <CheckCircle2 size={16} color="white" />}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Fixed Bottom Send Button */}
      {selectedIds.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-[#1A0E2C] border-t border-white/10">
          <Pressable 
            onPress={handleSend}
            className="bg-[#A855F7] py-3 rounded-full flex-row items-center justify-center gap-2"
          >
            <Text className="text-white font-bold text-base">Send</Text>
            <Send size={18} color="white" />
          </Pressable>
        </View>
      )}
    </View>
  );
}
