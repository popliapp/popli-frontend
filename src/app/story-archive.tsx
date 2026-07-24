import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, Dimensions, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, Calendar, Bookmark, Plus, Check, Play, AlertCircle } from 'lucide-react-native';
import { useStoryArchiveStore, useStoryHighlightStore, useAuthStore } from '../store';
import { showSuccess, showError } from '../store/toastStore';

const { width } = Dimensions.get('window');
const colWidth = (width - 40) / 3;

export default function StoryArchiveScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { archivedStories, fetchArchivedStories } = useStoryArchiveStore();
  const { highlights, createHighlight, fetchHighlights } = useStoryHighlightStore();

  const [activeTab, setActiveTab] = useState<'archive' | 'calendar' | 'highlights'>('archive');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);
  
  const [isTitleModalVisible, setIsTitleModalVisible] = useState(false);
  const [highlightTitle, setHighlightTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState('');

  React.useEffect(() => {
    fetchArchivedStories();
    if (userProfile?.username) {
      fetchHighlights(userProfile.username);
    }
  }, []);

  const toggleSelection = (id: string) => {
    if (selectedStoryIds.includes(id)) {
      setSelectedStoryIds(prev => prev.filter(storyId => storyId !== id));
    } else {
      setSelectedStoryIds(prev => [...prev, id]);
    }
  };

const handleActionPress = () => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      return;
    }

    if (selectedStoryIds.length === 0) {
      showError('Select at least 1 story to create a highlight');
      return;
    }

    setIsTitleModalVisible(true);
  };

  const handleSaveHighlight = async () => {
    const titleTrimmed = highlightTitle.trim();
    if (!titleTrimmed) {
      setTitleError('Please enter a title for the highlight');
      return;
    }

    setIsSaving(true);
    try {
      // Find the first selected story to use as the cover image
      const firstSelectedStory = archivedStories.find(s => s.id === selectedStoryIds[0]);
      const coverUrl = firstSelectedStory?.mediaUrl || '';

      await createHighlight(titleTrimmed, coverUrl, selectedStoryIds);
      
      setIsSaving(false);
      setIsTitleModalVisible(false);
      setIsSelectionMode(false);
      setSelectedStoryIds([]);
      setHighlightTitle('');
      showSuccess('Highlight created');
      
      // Navigate back to profile
      router.back();
    } catch (error) {
      console.error(error);
      setIsSaving(false);
      showError('Failed to create highlight. Try again.');
    }
  };

  const getGroupedStories = () => {
    const groups: Record<string, typeof archivedStories> = {};
    archivedStories.forEach(story => {
      const date = new Date(story.createdAt);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(story);
    });
    return groups;
  };

  return (
    <View className="flex-1 bg-[#12081E] pt-12">
      <View className="flex-row items-center px-4 pb-4 border-b border-white/10 justify-between">
        <Pressable 
          onPress={() => {
            if (isSelectionMode) {
              setIsSelectionMode(false);
              setSelectedStoryIds([]);
            } else {
              router.back();
            }
          }} 
          className="p-2 -ml-2"
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-bold">
          {isSelectionMode ? `${selectedStoryIds.length} Selected` : 'Story Archive'}
        </Text>
        <View className="w-10" />
      </View>

      {/* Tabs - Only show when not in selection mode */}
      {!isSelectionMode && (
        <View className="flex-row border-b border-white/10">
          <Pressable onPress={() => setActiveTab('archive')} className={`flex-1 py-4 items-center ${activeTab === 'archive' ? 'border-b-2 border-white' : ''}`}>
            <Clock size={20} color={activeTab === 'archive' ? '#FFFFFF' : '#9CA3AF'} />
          </Pressable>
          <Pressable onPress={() => setActiveTab('calendar')} className={`flex-1 py-4 items-center ${activeTab === 'calendar' ? 'border-b-2 border-white' : ''}`}>
            <Calendar size={20} color={activeTab === 'calendar' ? '#FFFFFF' : '#9CA3AF'} />
          </Pressable>
          <Pressable onPress={() => setActiveTab('highlights')} className={`flex-1 py-4 items-center ${activeTab === 'highlights' ? 'border-b-2 border-white' : ''}`}>
            <Bookmark size={20} color={activeTab === 'highlights' ? '#FFFFFF' : '#9CA3AF'} />
          </Pressable>
        </View>
      )}

      <ScrollView className="flex-1">
        {activeTab === 'archive' && (
          archivedStories.length === 0 ? (
            <View className="items-center justify-center pt-20">
              <View className="w-24 h-24 rounded-full border-2 border-dashed border-white/30 items-center justify-center mb-4">
                <Clock size={40} color="rgba(255,255,255,0.3)" />
              </View>
              <Text className="text-white font-bold text-lg">No Stories Yet</Text>
              <Text className="text-neutral-grey text-sm mt-2">Stories you share will appear here.</Text>
            </View>
          ) : (
            <View className="p-4 flex-row flex-wrap gap-2">
              {archivedStories.map(story => {
                const isSelected = selectedStoryIds.includes(story.id);
                return (
                  <Pressable 
                    key={story.id} 
                    onPress={() => isSelectionMode ? toggleSelection(story.id) : null}
                    className={`rounded-xl overflow-hidden ${isSelected ? 'border-2 border-[#A855F7]' : 'border-2 border-transparent'}`} 
                    style={{ width: colWidth, height: colWidth * 1.5 }}
                  >
                    <Image source={{ uri: story.mediaUrl }} className="w-full h-full opacity-100" style={{ opacity: isSelectionMode && !isSelected ? 0.5 : 1 }} />
                    
                    {isSelectionMode && (
                      <View className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected ? 'bg-[#A855F7] border-[#A855F7]' : 'border-white/50 bg-black/30'}`}>
                        {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                      </View>
                    )}
                    
                    {!isSelectionMode && (
                      <View className="absolute top-2 right-2 bg-black/50 px-1.5 py-0.5 rounded text-[10px]">
                        <Text className="text-white text-[10px]">
                          {new Date(story.createdAt).getDate()} {new Date(story.createdAt).toLocaleString('en-US', { month: 'short' })}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )
        )}

        {activeTab === 'calendar' && (
          archivedStories.length === 0 ? (
            <View className="items-center justify-center pt-20">
              <View className="w-24 h-24 rounded-full border-2 border-dashed border-white/30 items-center justify-center mb-4">
                <Calendar size={40} color="rgba(255,255,255,0.3)" />
              </View>
              <Text className="text-white font-bold text-lg">No Archive Data</Text>
              <Text className="text-neutral-grey text-sm mt-2">Your stories grouped by date will appear here.</Text>
            </View>
          ) : (
            <View className="p-4">
              {Object.entries(getGroupedStories()).map(([monthYear, stories]) => (
                <View key={monthYear} className="mb-6">
                  <Text className="text-white font-bold text-lg mb-3 ml-1">{monthYear}</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {stories.map(story => (
                      <Pressable 
                        key={story.id} 
                        className="rounded-xl overflow-hidden border-2 border-transparent" 
                        style={{ width: colWidth, height: colWidth * 1.5 }}
                      >
                        <Image source={{ uri: story.mediaUrl }} className="w-full h-full" />
                        <View className="absolute top-2 right-2 bg-black/50 px-2 py-1 rounded-full text-[10px]">
                          <Text className="text-white text-xs font-bold">{new Date(story.createdAt).getDate()}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )
        )}

        {activeTab === 'highlights' && (
          highlights.length === 0 ? (
            <View className="items-center justify-center pt-20">
              <View className="w-24 h-24 rounded-full border-2 border-dashed border-white/30 items-center justify-center mb-4">
                <Bookmark size={40} color="rgba(255,255,255,0.3)" />
              </View>
              <Text className="text-white font-bold text-lg">No Highlights</Text>
              <Text className="text-neutral-grey text-sm mt-2">Create highlights to save your favorite stories.</Text>
            </View>
          ) : (
            <View className="p-6 flex-row flex-wrap gap-6">
              {highlights.map(highlight => (
                <Pressable key={highlight.id} className="items-center gap-2" style={{ width: 80 }} onPress={() => router.push({ pathname: '/highlight-viewer/[id]', params: { id: highlight.id } } as any)}>
                  <View className="w-20 h-20 rounded-full border-2 border-white/20 overflow-hidden bg-white/5">
                    <Image source={{ uri: highlight.coverUrl }} className="w-full h-full" />
                  </View>
                  <Text className="text-white text-xs text-center font-bold" numberOfLines={1}>{highlight.title}</Text>
                </Pressable>
              ))}
            </View>
          )
        )}
      </ScrollView>

      {/* Bottom Floating Action: Create Highlight or Next */}
      {activeTab === 'archive' && (
        <Pressable 
          className={`absolute bottom-8 self-center px-6 py-3 rounded-full shadow-lg flex-row items-center gap-2 ${isSelectionMode ? 'bg-[#A855F7]' : 'bg-white'}`}
          onPress={handleActionPress}
        >
          {!isSelectionMode && <Plus size={20} color="#000000" />}
          <Text className={`font-bold ${isSelectionMode ? 'text-white' : 'text-black'}`}>
            {isSelectionMode ? `Next (${selectedStoryIds.length})` : 'Create Highlight'}
          </Text>
        </Pressable>
      )}

      {/* Title Input Modal */}
      <Modal visible={isTitleModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-center items-center px-6">
          <View className="bg-[#1D1037] w-full p-6 rounded-3xl border border-white/10">
            <Text className="text-white text-xl font-bold text-center mb-4">Name Your Highlight</Text>
            
          <TextInput
              value={highlightTitle}
              onChangeText={(v) => { setHighlightTitle(v); if (titleError) setTitleError(''); }}
              placeholder="e.g. Goa Trip 🌴"
              placeholderTextColor="rgba(255,255,255,0.3)"
              className={`bg-black/50 border rounded-2xl px-4 py-4 text-white text-base text-center ${titleError ? 'border-red-500' : 'border-white/10'}`}
              autoFocus
            />
            {titleError ? (
              <View className="flex-row items-center justify-center gap-1.5 mb-4 -mt-3">
                <AlertCircle size={12} color="#EF4444" />
                <Text className="text-red-400 text-xs font-medium">{titleError}</Text>
              </View>
            ) : (
              <View className="mb-6" />
            )}

            <View className="flex-row gap-3">
              <Pressable 
                onPress={() => { setIsTitleModalVisible(false); setTitleError(''); }}
                className="flex-1 py-3.5 rounded-2xl items-center border border-white/10"
                disabled={isSaving}
              >
                <Text className="text-white font-bold">Cancel</Text>
              </Pressable>
              
              <Pressable 
                onPress={handleSaveHighlight}
                className="flex-1 py-3.5 rounded-2xl items-center bg-[#A855F7]"
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold">Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}
