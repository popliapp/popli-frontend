import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { showInfo } from '../store/toastStore';
import { Play, X } from 'lucide-react-native';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store';

interface ChallengeSubmissionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  challengeId?: string;
}

export default function ChallengeSubmissionSheet({ visible, onClose, onSubmit, challengeId }: ChallengeSubmissionSheetProps) {
  const router = require('expo-router').useRouter();
  


  const [isChecking, setIsChecking] = useState(false);

  const handleRecordNew = async () => {
    if (challengeId) {
      setIsChecking(true);
      const { userProfile } = useAuthStore.getState();
      try {
        const res = await apiClient.get(`/reels/user/${userProfile?.id}`);
        const alreadySubmitted = res.data.some((r: any) => r.challengeId === challengeId);
      if (alreadySubmitted) {
          showInfo('You can only submit one reel per challenge');
          setIsChecking(false);
          onClose();
          return;
        }
      } catch(e) {
        console.warn("Failed to check if already submitted", e);
      }
      setIsChecking(false);
    }

    onClose();
    if (challengeId) {
      router.push({ pathname: '/(tabs)/create', params: { challengeId } });
    } else {
      router.push('/(tabs)/create');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />
        
        <View className="bg-[#1D1037] rounded-t-3xl pt-2 pb-8 px-4 border-t border-[#3E2B5C] min-h-[50%]">
          {/* Handle */}
          <View className="w-12 h-1.5 bg-[#3E2B5C] rounded-full self-center mb-6" />
          
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white font-bold text-xl">Submit Entry</Text>
            <Pressable onPress={onClose} className="p-2 -mr-2 bg-[#2D1B4E] rounded-full active:opacity-70">
              <X size={20} color="white" />
            </Pressable>
          </View>
          <Text className="text-white/60 mb-6">Record a new video or choose a recent one</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
            {/* Record New Button */}
            <Pressable
              onPress={handleRecordNew}
              disabled={isChecking}
              className="bg-gradient-to-r from-[#A855F7] to-[#D946EF] rounded-2xl p-4 flex-row items-center justify-center active:opacity-80 mt-2"
            >
              {isChecking ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">🎥 Record New Video</Text>
              )}
            </Pressable>

            {/* In a real implementation we would fetch user's recent reels here */}
            <View className="items-center justify-center mt-6 p-4">
              <Text className="text-white/40 text-sm text-center">To submit a recent video, go to your profile and link it to the challenge.</Text>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
