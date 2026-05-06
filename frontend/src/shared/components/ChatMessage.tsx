import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { AppTheme } from '../hooks/useTheme';

interface ActionLink {
  label: string;
  target: string;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  actions?: ActionLink[];
  onActionPress?: (target: string) => void;
  isStreaming?: boolean;
  isThinking?: boolean;
}

// Three-dot thinking indicator. Each dot pulses with a 0.2s delay,
// 1.4s total cycle, scale 0.85↔1, opacity 0.3↔1.
function ThinkingDots({ theme }: { theme: AppTheme }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 560,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 840,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
    const a1 = makeLoop(dot1, 0);
    const a2 = makeLoop(dot2, 200);
    const a3 = makeLoop(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (val: Animated.Value) => ({
    opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [
      {
        scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
      },
    ],
  });

  return (
    <View style={[styles.thinkingBubble, { backgroundColor: theme.bg.surfaceMute }]}>
      <Animated.View style={[styles.dot, { backgroundColor: theme.text.subtle }, dotStyle(dot1)]} />
      <Animated.View style={[styles.dot, { backgroundColor: theme.text.subtle }, dotStyle(dot2)]} />
      <Animated.View style={[styles.dot, { backgroundColor: theme.text.subtle }, dotStyle(dot3)]} />
    </View>
  );
}

// Streaming cursor — blinks at 1s cycle.
function StreamingCursor({ theme }: { theme: AppTheme }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(500),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.Text style={[styles.cursor, { color: theme.brand.primary, opacity }]}>▎</Animated.Text>;
}

export function ChatMessage({
  role,
  content,
  actions,
  onActionPress,
  isStreaming,
  isThinking,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const theme = useTheme();

  // Thinking bubble: AI side, dots only (no text content yet).
  if (isThinking) {
    return (
      <View style={[styles.row, styles.rowAssistant]}>
        <ThinkingDots theme={theme} />
      </View>
    );
  }

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: theme.brand.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: theme.bg.surfaceMute, borderBottomLeftRadius: 4 },
        ]}
      >
        <Text style={[styles.text, { color: isUser ? theme.text.onBrand : theme.text.body }]}>
          {content}
          {isStreaming && !isUser && <StreamingCursor theme={theme} />}
        </Text>
        {actions && actions.length > 0 && (
          <View style={styles.actions}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.target}
                onPress={() => onActionPress?.(action.target)}
                style={[styles.actionButton, { borderColor: isUser ? theme.text.onBrand : theme.brand.primary }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionText, { color: isUser ? theme.text.onBrand : theme.brand.primary }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 0,
    paddingVertical: 4,
    flexDirection: 'row',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '70%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
  cursor: {
    fontSize: 14,
    lineHeight: 22,
    marginLeft: 2,
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
});
