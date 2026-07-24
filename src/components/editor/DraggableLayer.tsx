import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DraggableLayerProps {
  id: string;
  children: React.ReactNode;
  isActive: boolean;
  onActivate: (id: string) => void;
  onUpdate?: (id: string, state: { x: number; y: number; scale: number; rotation: number }) => void;
  initialX?: number;
  initialY?: number;
  initialScale?: number;
  initialRotation?: number;
}

export default function DraggableLayer({
  id,
  children,
  isActive,
  onActivate,
  onUpdate,
  initialX = 0,
  initialY = 0,
  initialScale = 1,
  initialRotation = 0,
}: DraggableLayerProps) {
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const scale = useSharedValue(initialScale);
  const rotation = useSharedValue(initialRotation);

  const savedTranslateX = useSharedValue(initialX);
  const savedTranslateY = useSharedValue(initialY);
  const savedScale = useSharedValue(initialScale);
  const savedRotation = useSharedValue(initialRotation);

  const isInteracting = useSharedValue(false);

  // Pan Gesture (Drag)
  const panGesture = Gesture.Pan()
    .hitSlop({ top: 40, bottom: 40, left: 40, right: 40 })
    .onStart(() => {
      isInteracting.value = true;
      runOnJS(onActivate)(id);
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      isInteracting.value = false;
      if (onUpdate) {
        runOnJS(onUpdate)(id, {
          x: translateX.value,
          y: translateY.value,
          scale: scale.value,
          rotation: rotation.value,
        });
      }
    });

  // Pinch Gesture (Scale)
  const pinchGesture = Gesture.Pinch()
    .hitSlop({ top: 50, bottom: 50, left: 50, right: 50 })
    .onStart(() => {
      isInteracting.value = true;
      runOnJS(onActivate)(id);
    })
    .onUpdate((e) => {
      const newScale = savedScale.value * e.scale;
      scale.value = Math.max(0.2, Math.min(newScale, 5.0));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      isInteracting.value = false;
      if (onUpdate) {
        runOnJS(onUpdate)(id, {
          x: translateX.value,
          y: translateY.value,
          scale: scale.value,
          rotation: rotation.value,
        });
      }
    });

  // Rotation Gesture
  const rotationGesture = Gesture.Rotation()
    .hitSlop({ top: 50, bottom: 50, left: 50, right: 50 })
    .onStart(() => {
      isInteracting.value = true;
      runOnJS(onActivate)(id);
    })
    .onUpdate((e) => {
      rotation.value = savedRotation.value + e.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
      isInteracting.value = false;
      if (onUpdate) {
        runOnJS(onUpdate)(id, {
          x: translateX.value,
          y: translateY.value,
          scale: scale.value,
          rotation: rotation.value,
        });
      }
    });

  // Compose Gestures
  // Simulataneous gestures allow dragging, pinching, and rotating at the same time
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture, rotationGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotateZ: `${rotation.value}rad` },
      ],
      // Give visual feedback when layer is active
      borderWidth: isActive && !isInteracting.value ? 2 : 0,
      borderColor: 'rgba(255, 255, 255, 0.5)',
      borderRadius: 8,
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%', // Center initially
  },
});
