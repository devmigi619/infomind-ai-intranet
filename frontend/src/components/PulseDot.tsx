import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface PulseDotProps {
  // Color of the surrounding ring (visually merges with parent background).
  ringColor?: string;
  // Position from top-right of the parent (parent must be position:relative).
  top?: number;
  right?: number;
}

// Small red pulsing dot used to indicate "unread AI" notifications.
// 7x7px red core, surrounded by a 2px ring matching the parent background.
// Animates scale 1↔1.15 with a 1.5s loop.
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
      style={[
        styles.outer,
        { top, right, borderColor: ringColor, transform: [{ scale }] },
      ]}
      pointerEvents="none"
    >
      <View style={styles.inner} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 100,
    borderWidth: 2,
    // Mimic CSS `box-sizing: content-box` — the 7px is the inner red core,
    // the 2px ring sits outside. RN's default is content-box, so this matches.
    backgroundColor: '#EF4444',
  },
  inner: {
    flex: 1,
  },
});
