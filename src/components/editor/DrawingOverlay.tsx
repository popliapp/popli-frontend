import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedProps, runOnJS } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Undo, PenTool, Check, Eraser } from 'lucide-react-native';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const { width, height } = Dimensions.get('window');

export type DrawingPath = {
  id: string;
  path: string;
  color: string;
  strokeWidth: number;
};

interface DrawingOverlayProps {
  initialPaths?: DrawingPath[];
  onComplete: (paths: DrawingPath[] | null) => void;
}

const COLORS = [
  '#FFFFFF', '#000000', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'
];

export default function DrawingOverlay({ initialPaths = [], onComplete }: DrawingOverlayProps) {
  const [paths, setPaths] = useState<DrawingPath[]>(initialPaths);
  const [color, setColor] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [isEraser, setIsEraser] = useState(false);

  // Shared value for the active path being drawn (runs on UI thread for 60fps)
  const currentPathStr = useSharedValue('');
  const isDrawing = useSharedValue(false);

  const savePath = (pathString: string) => {
    if (pathString) {
      setPaths(prev => [...prev, {
        id: Date.now().toString(),
        path: pathString,
        color: isEraser ? 'transparent' : color,
        strokeWidth,
      }]);
      currentPathStr.value = '';
      isDrawing.value = false;
    }
  };

  const panGesture = Gesture.Pan()
    .minDistance(1)
    .onStart((e) => {
      isDrawing.value = true;
      currentPathStr.value = `M ${e.x} ${e.y}`;
    })
    .onUpdate((e) => {
      currentPathStr.value = `${currentPathStr.value} L ${e.x} ${e.y}`;
    })
    .onEnd(() => {
      runOnJS(savePath)(currentPathStr.value);
    });

  const animatedProps = useAnimatedProps(() => {
    return {
      d: currentPathStr.value,
    };
  });

  const handleUndo = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const handleDone = () => {
    onComplete(paths);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <View className="flex-1 bg-black/50 z-50">
        
        {/* Top Controls */}
        <View className="flex-row justify-between items-center px-4 pt-16 pb-4 z-10 absolute top-0 left-0 right-0">
          <View className="flex-row gap-4">
            <TouchableOpacity onPress={handleUndo} disabled={paths.length === 0} className={`w-10 h-10 items-center justify-center rounded-full ${paths.length === 0 ? 'bg-black/20' : 'bg-black/60'}`}>
              <Undo size={20} color={paths.length === 0 ? 'rgba(255,255,255,0.3)' : '#FFF'} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleDone} className="bg-white px-4 py-2 rounded-full flex-row items-center gap-2">
            <Check size={16} color="#000" />
            <Text className="text-black font-bold">Done</Text>
          </TouchableOpacity>
        </View>

        {/* Drawing Canvas */}
        <View className="flex-1 mt-12 mb-20 rounded-3xl overflow-hidden">
          <GestureDetector gesture={panGesture}>
            <View className="flex-1 w-full h-full">
              <Svg width="100%" height="100%">
              {paths.map(p => (
                <Path
                  key={p.id}
                  d={p.path}
                  stroke={p.color}
                  strokeWidth={p.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
              <AnimatedPath
                animatedProps={animatedProps}
                stroke={isEraser ? 'transparent' : color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              </Svg>
            </View>
          </GestureDetector>
        </View>

        {/* Bottom Controls */}
        <View className="absolute bottom-10 left-0 right-0 items-center px-4">
          <View className="bg-black/60 backdrop-blur-md rounded-full px-4 py-3 flex-row gap-4 border border-white/20">
            {COLORS.map(c => (
              <TouchableOpacity 
                key={c}
                onPress={() => { setColor(c); setIsEraser(false); }}
                className="w-8 h-8 rounded-full border-2 items-center justify-center"
                style={{
                  borderColor: color === c && !isEraser ? '#FFF' : 'transparent',
                  transform: [{ scale: color === c && !isEraser ? 1.1 : 1 }]
                }}
              >
                <View className="w-6 h-6 rounded-full border border-black/20" style={{ backgroundColor: c }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </View>
    </View>
  );
}
