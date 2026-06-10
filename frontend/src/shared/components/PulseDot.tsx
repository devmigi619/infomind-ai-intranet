import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface PulseDotProps {
  ringColor?: string;
  top?: number;
  right?: number;
}

export function PulseDot({ ringColor = '#FAFAFA', top = 6, right = 6 }: PulseDotProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [scale]);

  return (
    <Animated.View
      style={{
        top,
        right,
        borderColor: ringColor,
        transform: [{ scale }],
      }}
      className="absolute w-[8px] h-[8px] rounded-full border-2 bg-red-500"
      pointerEvents="none"
    />
  );
}
