import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { showSuccess, showError } from '../store/toastStore';
import { ChevronLeft, Trophy, Users, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { apiClient } from '../api/client';
interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  rewardPool: number;
  endDate: string;
  _count?: {
    participants: number;
  };
}

export default function ChallengesScreen() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const res = await apiClient.get('/challenges/active');
        setChallenges(res.data);
      } catch (error) {
        console.error('Failed to fetch challenges', error);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenges();
  }, []);

const handleJoin = async (id: string) => {
    try {
      await apiClient.post(`/challenges/${id}/join`);
      showSuccess('Successfully joined the challenge!');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to join challenge');
    }
  };

  return (
    <View className="flex-1 bg-[#0D0518]">
      <View className="flex-row items-center pt-14 pb-4 px-4 bg-[#1D1037]/80 border-b border-[#3E2B5C]">
        <Pressable 
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full bg-[#2D1B4E]"
        >
          <ChevronLeft color="white" size={24} />
        </Pressable>
        <Text className="text-white text-xl font-bold ml-4">Active Challenges</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#A78BFA" className="mt-10" />
        ) : challenges.length === 0 ? (
          <Text className="text-white/60 text-center mt-10">No active challenges right now.</Text>
        ) : (
          challenges.map((challenge, index) => (
            <View
              key={challenge.id}
              className="bg-[#1D1037] border border-[#3E2B5C] rounded-2xl p-5 mb-4"
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-white text-lg font-bold flex-1">{challenge.title}</Text>
                <View className="bg-yellow-500/20 px-3 py-1 rounded-full">
                  <Text className="text-yellow-400 font-bold">₹{challenge.rewardPool}</Text>
                </View>
              </View>
              
              <Text className="text-white/70 mb-4">{challenge.description}</Text>
              
              <View className="flex-row items-center gap-4 mb-4">
                <View className="flex-row items-center gap-1">
                  <Users size={16} color="#A78BFA" />
                  <Text className="text-white/60 text-xs">{challenge._count?.participants || 0} Joined</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Calendar size={16} color="#A78BFA" />
                  <Text className="text-white/60 text-xs">Ends {new Date(challenge.endDate).toLocaleDateString()}</Text>
                </View>
              </View>

              <Pressable 
                onPress={() => handleJoin(challenge.id)}
                className="bg-[#A855F7] py-3 rounded-full items-center active:scale-[0.98]"
              >
                <Text className="text-white font-bold text-base">Join Challenge</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
