import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { showError } from '../../store/toastStore';
import { router } from 'expo-router';
import { useAuthStore } from '../../store';
import { apiClient } from '../../api/client';
import { Check, Cpu, Trophy, Music2, Palette, Gamepad2, Shirt, UtensilsCrossed, Laugh, Heart, PersonStanding, Wheat, Flame, Dumbbell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const INTERESTS = [
  { id: 'technology', label: 'Technology', icon: Cpu, description: 'Unboxing, tips & hacks' },
  { id: 'sports', label: 'Sports', icon: Trophy, description: 'Cricket, updates & plays' },
  { id: 'music', label: 'Music', icon: Music2, description: 'Songs, covers & beats' },
  { id: 'art', label: 'Art', icon: Palette, description: 'Painting, crafts & design' },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2, description: 'Pubg, streaming & clips' },
  { id: 'fashion', label: 'Fashion', icon: Shirt, description: 'Outfits, trends & beauty' },
  { id: 'food', label: 'Food', icon: UtensilsCrossed, description: 'Recipes, street food & vlogs' },
  { id: 'comedy', label: 'Comedy', icon: Laugh, description: 'Funny sketches & voiceovers' },
  { id: 'emotional', label: 'Emotional', icon: Heart, description: 'Drama, stories & poetry' },
  { id: 'dance', label: 'Dance', icon: PersonStanding, description: 'Reels, trends & beats' },
  { id: 'village_life', label: 'Village Life', icon: Wheat, description: 'Desi vloggers & culture' },
  { id: 'motivation', label: 'Motivation', icon: Flame, description: 'Success & daily quotes' },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell, description: 'Gym, workouts & health' },
];

export default function InterestsScreen() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [interests, setInterests] = useState<any[]>(INTERESTS);
  const [isSaving, setIsSaving] = useState(false);
  const { updateProfile } = useAuthStore();

useEffect(() => {
    // Use local INTERESTS as the source of truth for order and icons.
    // Only enrich descriptions from backend if available, never reorder.
    apiClient.get('/interests')
      .then(res => {
        if (res.data && res.data.length > 0) {
          const enriched = INTERESTS.map(local => {
            const backendMatch = res.data.find((i: any) =>
              i.name.toLowerCase() === local.label.toLowerCase()
            );
            return {
              ...local,
              // Use backend ID if matched (for API submission), else keep local id
              id: backendMatch?.id ?? local.id,
              description: backendMatch?.description || local.description,
            };
          });
          setInterests(enriched);
        }
        // If backend fails or returns empty, INTERESTS default is already set — do nothing
      })
      .catch(err => console.log('Interests fetch failed, using local data', err));
  }, []);

  const handleToggleInterest = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

const handleNext = async () => {
    if (selectedIds.length < 3 || isSaving) return;
    setIsSaving(true);

    try {
      const authState = useAuthStore.getState();
      const profile = authState.userProfile;

      const selectedNames = selectedIds.map(id => {
        const found = interests.find(i => i.id === id);
        return found ? found.label : id;
      });

     await apiClient.put('/users/me', {
  bio: profile.bio,
  category: profile.category,
  avatar: profile.avatar,
  interestNames: selectedNames,
});

useAuthStore.getState().setOnboardingStep('location');
await updateProfile({ selectedInterests: selectedIds } as any);
setTimeout(() => router.replace('/(auth)/location'), 50);
    } catch (error) {
      console.error('Failed to update profile:', error);
      showError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  const isMinSelected = selectedIds.length >= 3;
  const remaining = 3 - selectedIds.length;

return (
    <View style={{ flex: 1, backgroundColor: '#0D0015', paddingTop: Platform.OS === 'ios' ? 56 : 36 }}>
      <LinearGradient
        colors={['#1a0030', '#0D0015', '#0D0015']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      <View style={{ flex: 1, paddingHorizontal: 20 }}>

    {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FF2D6B', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 }}>popli</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,45,107,0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,45,107,0.2)' }}>
            <Text style={{ color: '#FF2D6B', fontSize: 10, fontWeight: '800' }}>
              {selectedIds.length}/5 selected
            </Text>
          </View>
        </View>

        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 }}>Pick Your Interests</Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20 }}>
          {isMinSelected
            ? 'Great choices! Select more if you wish.'
            : `Choose at least ${remaining} more topic${remaining > 1 ? 's' : ''} you love.`}
        </Text>

        {/* Grid */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {interests.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const IconComponent = item.icon;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleToggleInterest(item.id)}
                  style={{
                    width: '30.5%',
                    paddingVertical: 14,
                    paddingHorizontal: 10,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: isSelected ? '#FF2D6B' : 'rgba(255,255,255,0.08)',
                    backgroundColor: isSelected ? 'rgba(255,45,107,0.12)' : 'rgba(255,255,255,0.04)',
                    alignItems: 'center',
                    gap: 8,
                    position: 'relative',
                  }}
                >
                  {isSelected && (
                    <View style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 16, height: 16, borderRadius: 8,
                      backgroundColor: '#FF2D6B',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={9} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                  <View style={{
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: isSelected ? 'rgba(255,45,107,0.2)' : 'rgba(255,255,255,0.06)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IconComponent size={20} color={isSelected ? '#FF2D6B' : 'rgba(255,255,255,0.5)'} strokeWidth={1.8} />
                  </View>
                  <Text style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', textAlign: 'center' }}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Footer CTA */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 48 : 52,backgroundColor: 'rgba(13,0,21,0.95)' }}>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!isMinSelected || isSaving}
          activeOpacity={0.8}
          style={{
            backgroundColor: isMinSelected ? '#FF2D6B' : 'rgba(255,255,255,0.08)',
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: isMinSelected ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: '800' }}>
              {isMinSelected ? 'Continue' : `Choose ${remaining} More`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}