import React from 'react';
import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Download, HardDrive } from 'lucide-react-native';

export default function DownloadsScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#12081E] pt-14">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-6 border-b border-white/5">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white font-bold text-base ml-2">Downloads</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        contentContainerStyle={{ gap: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-[#1A0E2C] border border-white/5 rounded-3xl p-4 gap-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-[#3B82F6]/10 items-center justify-center border border-[#3B82F6]/20">
                <HardDrive size={20} color="#3B82F6" />
              </View>
              <View>
                <Text className="text-white font-bold text-sm">Storage Usage</Text>
                <Text className="text-neutral-grey text-[10px] mt-1">0 MB used by downloads</Text>
              </View>
            </View>
          </View>
          <View className="h-2 w-full bg-[#12081E] rounded-full overflow-hidden">
            <View className="h-full bg-[#3B82F6] rounded-full" style={{ width: '0%' }} />
          </View>
        </View>

        <View className="flex-row items-center justify-between bg-[#1A0E2C] border border-white/5 rounded-2xl p-4">
          <View>
            <Text className="text-white font-bold text-sm">Download over Wi-Fi only</Text>
            <Text className="text-neutral-grey text-[10px] mt-1">Save your mobile data</Text>
          </View>
          <Switch
            value={true}
            onValueChange={() => {}}
            trackColor={{ false: '#374151', true: '#A855F7' }}
            thumbColor={'#FFFFFF'}
          />
        </View>

        <View className="flex-1 items-center justify-center py-12 opacity-50">
          <Download size={48} color="#9CA3AF" />
          <Text className="text-white text-lg font-bold mt-4">No downloaded videos</Text>
          <Text className="text-neutral-grey text-sm text-center px-8 mt-2">
            Videos you download will appear here for offline viewing.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}
