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
        position: 'absolute',
        top,
        right,
        width: 8,
        height: 8,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: ringColor,
        backgroundColor: '#EF4444',
        transform: [{ scale }],
      }}
      pointerEvents="none"
    />
  );
}
