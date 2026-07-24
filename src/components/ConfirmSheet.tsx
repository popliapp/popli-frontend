import React from 'react';
import { Modal, View, Text, Pressable, TouchableOpacity } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface ConfirmSheetProps {
  isVisible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  isVisible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity
        className="flex-1 bg-black/60 justify-end"
        activeOpacity={1}
        onPress={onCancel}
      >
        <View
          className="bg-[#1A0E2C] w-full rounded-t-3xl overflow-hidden border-t border-white/5 pb-8 px-5 pt-6"
          onStartShouldSetResponder={() => true}
        >
          <View className="items-center mb-4">
            <View className={`w-14 h-14 rounded-full items-center justify-center ${destructive ? 'bg-[#EF4444]/10' : 'bg-[#A855F7]/10'}`}>
              <AlertTriangle size={26} color={destructive ? '#EF4444' : '#A855F7'} />
            </View>
          </View>

          <Text className="text-white font-bold text-lg text-center mb-2">{title}</Text>
          <Text className="text-neutral-grey text-sm text-center mb-6">{message}</Text>

          <Pressable
            onPress={onConfirm}
            className={`py-3.5 rounded-2xl items-center mb-2.5 active:opacity-80 ${destructive ? 'bg-[#EF4444]' : 'bg-[#A855F7]'}`}
          >
            <Text className="text-white font-bold text-sm">{confirmLabel}</Text>
          </Pressable>

          <Pressable
            onPress={onCancel}
            className="py-3.5 rounded-2xl items-center border border-white/10 active:opacity-70"
          >
            <Text className="text-white/70 font-bold text-sm">{cancelLabel}</Text>
          </Pressable>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}