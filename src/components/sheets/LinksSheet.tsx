import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, Animated, PanResponder, Dimensions, Linking, Modal } from 'react-native';
import { ExternalLink } from 'lucide-react-native';

const { height } = Dimensions.get('window');

interface LinksSheetProps {
  isVisible: boolean;
  onClose: () => void;
  links: { title: string; url: string }[];
}

export const LinksSheet: React.FC<LinksSheetProps> = ({ isVisible, onClose, links }) => {
  const [panY] = useState(() => new Animated.Value(height));

  const resetPositionAnim = Animated.timing(panY, {
    toValue: 0,
    duration: 300,
    useNativeDriver: true,
  });

  const closeAnim = Animated.timing(panY, {
    toValue: height,
    duration: 300,
    useNativeDriver: true,
  });

  useEffect(() => {
    if (isVisible) {
      resetPositionAnim.start();
    } else {
      closeAnim.start();
    }
  }, [isVisible]);

  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderMove: Animated.event([null, { dy: panY }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gs) => {
        if (gs.dy > 100 || gs.vy > 1) {
          closeAnim.start(() => onClose());
        } else {
          resetPositionAnim.start();
        }
      },
    })
  );

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="absolute inset-0" onPress={() => closeAnim.start(() => onClose())} />
        
        <Animated.View
          style={{ transform: [{ translateY: panY }] }}
          {...panResponder.panHandlers}
          className="bg-[#1A0E2C] rounded-t-3xl border-t border-white/10"
        >
          {/* Handle */}
          <View className="w-full items-center pt-4 pb-2">
            <View className="w-12 h-1.5 bg-white/20 rounded-full" />
          </View>

          <View className="px-6 pb-12 pt-2">
            <Text className="text-white font-bold text-xl mb-6 text-center">Links</Text>
            
            <View className="gap-4">
              {links.map((link, index) => {
                let formattedUrl = link.url;
                if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
                  formattedUrl = 'https://' + formattedUrl;
                }
                
                return (
                  <Pressable 
                    key={index}
                    className="flex-row items-center justify-between bg-white/5 p-4 rounded-2xl active:bg-white/10"
                    onPress={() => {
                      Linking.openURL(formattedUrl).catch(err => console.error("Couldn't load page", err));
                    }}
                  >
                    <View className="flex-1 mr-4">
                      <Text className="text-white font-bold text-base mb-1">{link.title || 'Website'}</Text>
                      <Text className="text-white/50 text-xs" numberOfLines={1}>{link.url}</Text>
                    </View>
                    <View className="w-10 h-10 bg-white/10 rounded-full items-center justify-center">
                      <ExternalLink size={20} color="#FFFFFF" />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
