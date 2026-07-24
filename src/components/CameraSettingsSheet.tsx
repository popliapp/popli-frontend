import React from 'react';
import { View, Text, Pressable, Switch, ScrollView } from 'react-native';

import { useCameraSettingsStore } from '../store';
import { Settings, Save, Grid, Camera, Navigation, Zap, Video, Image as ImageIcon, Sparkles, Activity } from 'lucide-react-native';

interface CameraSettingsSheetProps {
  onClose: () => void;
}

export default function CameraSettingsSheet({ onClose }: CameraSettingsSheetProps) {
  const settings = useCameraSettingsStore();

  return (
    <View
      className="absolute bottom-0 left-0 right-0 bg-[#1A0E2C] rounded-t-3xl border-t border-white/10 z-50 h-[80%]"
    >
      <View className="flex-row items-center justify-between p-4 border-b border-white/5">
        <View className="w-8" />
        <Text className="text-white text-lg font-bold">Camera Settings</Text>
        <Pressable onPress={onClose} className="w-8 h-8 items-center justify-center bg-white/10 rounded-full">
          <Text className="text-white text-sm font-bold">✕</Text>
        </Pressable>
      </View>

      <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Save Options */}
        <Text className="text-neutral-grey text-xs font-bold uppercase mb-2">Save Options</Text>
        <View className="bg-black/20 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <Save size={20} color="#FFFFFF" />
              <Text className="text-white text-sm">Save Original Photos</Text>
            </View>
            <Switch 
              value={settings.saveOriginals} 
              onValueChange={(v) => settings.updateSetting('saveOriginals', v)}
              trackColor={{ false: '#374151', true: '#A855F7' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Video size={20} color="#FFFFFF" />
              <Text className="text-white text-sm">Save Original Videos</Text>
            </View>
            <Switch 
              value={settings.saveOriginals} 
              onValueChange={(v) => settings.updateSetting('saveOriginals', v)}
              trackColor={{ false: '#374151', true: '#A855F7' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Camera Tools */}
        <Text className="text-neutral-grey text-xs font-bold uppercase mb-2">Camera Tools</Text>
        <View className="bg-black/20 rounded-2xl p-4 mb-6 gap-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <ImageIcon size={20} color="#FFFFFF" />
              <Text className="text-white text-sm">HDR Capture</Text>
            </View>
            <Switch 
              value={settings.hdr} 
              onValueChange={(v) => settings.updateSetting('hdr', v)}
              trackColor={{ false: '#374151', true: '#A855F7' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Grid size={20} color="#FFFFFF" />
              <Text className="text-white text-sm">Grid Lines</Text>
            </View>
            <Switch 
              value={settings.grid} 
              onValueChange={(v) => settings.updateSetting('grid', v)}
              trackColor={{ false: '#374151', true: '#A855F7' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Camera size={20} color="#FFFFFF" />
              <Text className="text-white text-sm">Mirror Front Camera</Text>
            </View>
            <Switch 
              value={settings.mirrorFront} 
              onValueChange={(v) => settings.updateSetting('mirrorFront', v)}
              trackColor={{ false: '#374151', true: '#A855F7' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Video Quality */}
        <Text className="text-neutral-grey text-xs font-bold uppercase mb-2">Video Quality</Text>
        <View className="bg-black/20 rounded-2xl p-4 mb-6 gap-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Activity size={20} color="#FFFFFF" />
              <Text className="text-white text-sm">Frame Rate (FPS)</Text>
            </View>
            <View className="flex-row bg-white/10 rounded-lg p-1">
              <Pressable 
                onPress={() => settings.updateSetting('fps', 30)}
                className={`px-3 py-1 rounded ${settings.fps === 30 ? 'bg-[#A855F7]' : ''}`}
              >
                <Text className="text-white text-xs">30</Text>
              </Pressable>
              <Pressable 
                onPress={() => settings.updateSetting('fps', 60)}
                className={`px-3 py-1 rounded ${settings.fps === 60 ? 'bg-[#A855F7]' : ''}`}
              >
                <Text className="text-white text-xs">60</Text>
              </Pressable>
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Sparkles size={20} color="#FFFFFF" />
              <Text className="text-white text-sm">Stabilization</Text>
            </View>
            <Switch 
              value={settings.stabilization} 
              onValueChange={(v) => settings.updateSetting('stabilization', v)}
              trackColor={{ false: '#374151', true: '#A855F7' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View className="flex-row items-center justify-between mt-2">
            <View className="flex-row items-center gap-3">
              <Activity size={20} color="#FFFFFF" />
              <Text className="text-white text-sm">Video Resolution</Text>
            </View>
            <View className="flex-row bg-white/10 rounded-lg p-1">
              <Pressable 
                onPress={() => settings.updateSetting('videoResolution', '1080p')}
                className={`px-3 py-1 rounded ${settings.videoResolution === '1080p' ? 'bg-[#A855F7]' : ''}`}
              >
                <Text className="text-white text-xs">1080p</Text>
              </Pressable>
              <Pressable 
                onPress={() => settings.updateSetting('videoResolution', '4K')}
                className={`px-3 py-1 rounded ${settings.videoResolution === '4K' ? 'bg-[#A855F7]' : ''}`}
              >
                <Text className="text-white text-xs">4K</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Beauty Features */}
        <Text className="text-neutral-grey text-xs font-bold uppercase mb-2">Effects & Beauty</Text>
        <View className="bg-black/20 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <Sparkles size={20} color="#FFFFFF" />
              <Text className="text-white text-sm">Beauty Filter Strength</Text>
            </View>
            <Text className="text-[#A855F7] font-bold">{settings.beautyStrength}%</Text>
          </View>
          <View className="h-1 bg-white/20 rounded-full w-full">
            <View className="h-full bg-[#A855F7] rounded-full" style={{ width: `${settings.beautyStrength}%` }} />
          </View>
          <View className="flex-row justify-between mt-4">
            <Pressable onPress={() => settings.updateSetting('beautyStrength', Math.max(0, settings.beautyStrength - 10))} className="bg-white/10 px-4 py-1 rounded-full"><Text className="text-white">-</Text></Pressable>
            <Pressable onPress={() => settings.updateSetting('beautyStrength', Math.min(100, settings.beautyStrength + 10))} className="bg-white/10 px-4 py-1 rounded-full"><Text className="text-white">+</Text></Pressable>
          </View>
        </View>
        
        {/* Additional */}
        <Text className="text-neutral-grey text-xs font-bold uppercase mb-2">Location & Privacy</Text>
        <View className="bg-black/20 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Navigation size={20} color="#FFFFFF" />
              <Text className="text-white text-sm">Save Location Info</Text>
            </View>
            <Switch 
              value={settings.locationTagging} 
              onValueChange={(v) => settings.updateSetting('locationTagging', v)}
              trackColor={{ false: '#374151', true: '#A855F7' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
