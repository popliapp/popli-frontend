import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Keyboard, Image } from 'react-native';
import { Search, X, Check, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../api/client';

interface TagPeopleSheetProps {
  onComplete: (users: any[]) => void;
  onClose: () => void;
  initialSelectedUsers?: any[];
}

export default function TagPeopleSheet({ onComplete, onClose, initialSelectedUsers = [] }: TagPeopleSheetProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<any[]>(initialSelectedUsers);

  const searchUsers = async (q: string) => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/search?q=${encodeURIComponent(q)}`);
      if (res.data && res.data.users) {
        setResults(res.data.users);
      }
    } catch (err) {
      console.warn("Failed to search users:", err);
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
      searchUsers(query);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const toggleUserSelection = (user: any) => {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    if (isSelected) {
      setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
    } else {
      if (selectedUsers.length >= 10) {
        return; // Max 10 tags
      }
      setSelectedUsers(prev => [...prev, user]);
    }
  };

  return (
    <View className="flex-1 bg-[#12081E]" style={{ paddingTop: Math.max(insets.top, 16) }}>
      <View className="flex-row items-center justify-between px-4 pb-4 border-b border-white/10">
        <Pressable onPress={onClose} className="p-2 -ml-2">
          <X size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white font-bold text-lg">Tag People</Text>
        <Pressable 
          onPress={() => onComplete(selectedUsers)} 
          className="p-2 -mr-2"
        >
          <Text className="text-[#A855F7] font-bold text-base">Done</Text>
        </Pressable>
      </View>

      <View className="p-4">
        <View className="flex-row items-center bg-[#1A0E2C] rounded-xl px-4 py-3 border border-white/5">
          <Search size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 text-white ml-3 text-base"
            placeholder="Search for a user..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <X size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      {selectedUsers.length > 0 && (
        <View className="px-4 pb-4 border-b border-white/5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {selectedUsers.map(u => (
              <Pressable 
                key={u.id}
                onPress={() => toggleUserSelection(u)}
                className="flex-row items-center bg-[#3E2B5C] pl-2 pr-1 py-1 rounded-full mr-2"
              >
                {u.avatar ? (
                  <Image source={{ uri: u.avatar }} className="w-5 h-5 rounded-full mr-1.5" />
                ) : (
                  <View className="w-5 h-5 rounded-full bg-white/20 items-center justify-center mr-1.5">
                    <User size={12} color="#FFFFFF" />
                  </View>
                )}
                <Text className="text-white text-xs font-medium mr-1">{u.username}</Text>
                <View className="w-4 h-4 items-center justify-center">
                  <X size={12} color="#9CA3AF" />
                </View>
              </Pressable>
            ))}
          </ScrollView>
          <Text className="text-[#9CA3AF] text-[10px] text-right mt-2">{selectedUsers.length}/10 Tagged</Text>
        </View>
      )}

      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        {isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator size="small" color="#A855F7" />
          </View>
        ) : (
          <View>
            {results.map((u) => {
              const isSelected = selectedUsers.some(selected => selected.id === u.id);
              return (
                <Pressable
                  key={u.id}
                  onPress={() => toggleUserSelection(u)}
                  className="flex-row items-center py-3 border-b border-white/5"
                >
                  {u.avatar ? (
                    <Image source={{ uri: u.avatar }} className="w-12 h-12 rounded-full mr-3 bg-white/10" />
                  ) : (
                    <View className="w-12 h-12 rounded-full bg-white/10 items-center justify-center mr-3">
                      <User size={24} color="#FFFFFF" />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-white font-bold text-base">{u.username}</Text>
                    <Text className="text-[#9CA3AF] text-xs">{u.name}</Text>
                  </View>
                  <View className={`w-6 h-6 rounded-full border items-center justify-center ${isSelected ? 'bg-[#10B981] border-[#10B981]' : 'border-white/20 bg-transparent'}`}>
                    {isSelected && <Check size={14} color="#12081E" />}
                  </View>
                </Pressable>
              );
            })}

            {query.length > 0 && results.length === 0 && !isLoading && (
              <View className="py-8 items-center">
                <Text className="text-[#9CA3AF]">No users found for &quot;{query}&quot;</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
