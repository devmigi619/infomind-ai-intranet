import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from 'react-native';

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
function ThinkingDots() {
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
    <View style={styles.thinkingBubble}>
      <Animated.View style={[styles.dot, dotStyle(dot1)]} />
      <Animated.View style={[styles.dot, dotStyle(dot2)]} />
      <Animated.View style={[styles.dot, dotStyle(dot3)]} />
    </View>
  );
}

// Streaming cursor — blinks at 1s cycle.
function StreamingCursor() {
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

  return (
    <Animated.Text style={[styles.cursor, { opacity }]}>▎</Animated.Text>
  );
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

  // Thinking bubble: AI side, dots only (no text content yet).
  if (isThinking) {
    return (
      <View style={[styles.row, styles.rowAssistant]}>
        <ThinkingDots />
      </View>
    );
  }

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <Text
          style={[
            styles.text,
            isUser ? styles.textUser : styles.textAssistant,
          ]}
        >
          {content}
          {isStreaming && !isUser && <StreamingCursor />}
        </Text>
        {actions && actions.length > 0 && (
          <View style={styles.actions}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.target}
                onPress={() => onActionPress?.(action.target)}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <Text style={styles.actionText}>{action.label}</Text>
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
  bubbleUser: {
    backgroundColor: '#0A2463',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#F5F5F5',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 22, // ~1.6 line height
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
  textUser: {
    color: '#ffffff',
  },
  textAssistant: {
    color: '#000000',
  },
  cursor: {
    color: '#0A2463',
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
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: '#0A2463',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#0A2463',
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
});
