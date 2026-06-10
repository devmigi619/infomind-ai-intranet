import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, Easing } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import type { AppTheme } from '../hooks/useTheme';
import { Text } from './ui/text';
import { HStack } from './ui/hstack';
import { VStack } from './ui/vstack';
import { Card } from './ui/card';

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
  progressSteps?: string[];
  interruptType?: 'human' | 'excu' | 'form';
  onInterruptApprove?: () => void;
  onInterruptCancel?: () => void;
}

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
    <HStack style={{ backgroundColor: theme.bg.surfaceMute }} className="items-center gap-1 rounded-2xl rounded-bl-sm px-[18px] py-3.5">
      <Animated.View style={{ backgroundColor: theme.text.subtle, ...dotStyle(dot1) }} className="w-[7px] h-[7px] rounded-full" />
      <Animated.View style={{ backgroundColor: theme.text.subtle, ...dotStyle(dot2) }} className="w-[7px] h-[7px] rounded-full" />
      <Animated.View style={{ backgroundColor: theme.text.subtle, ...dotStyle(dot3) }} className="w-[7px] h-[7px] rounded-full" />
    </HStack>
  );
}

function ThinkingDot({ theme }: { theme: AppTheme }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 560, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 840, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        { backgroundColor: theme.text.subtle },
        {
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
        },
      ]}
      className="w-[7px] h-[7px] rounded-full"
    />
  );
}

function ProgressStep({
  text,
  done,
  theme,
}: {
  text: string;
  done: boolean;
  theme: AppTheme;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  return (
    <Animated.View
      style={{
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, done ? 0.55 : 1] }),
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }],
      }}
    >
      <HStack className="items-center gap-2">
        <View className="w-3.5 h-3.5 items-center justify-center">
          {done ? (
            <Check size={12} color={theme.text.subtle} strokeWidth={3} />
          ) : (
            <ThinkingDot theme={theme} />
          )}
        </View>
        <Text size="sm" style={{ color: done ? theme.text.subtle : theme.text.body }} className="text-[13px] leading-5">
          {text}
        </Text>
      </HStack>
    </Animated.View>
  );
}

function ProgressTimeline({ steps, theme }: { steps: string[]; theme: AppTheme }) {
  return (
    <VStack style={{ backgroundColor: theme.bg.surfaceMute }} className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3 gap-1.5">
      {steps.map((text, i) => (
        <ProgressStep
          key={`${i}-${text}`}
          text={text}
          done={i < steps.length - 1}
          theme={theme}
        />
      ))}
    </VStack>
  );
}

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

  return <Animated.Text style={{ color: theme.brand.primary, opacity } as any} className="text-[14px] leading-[22px] ml-0.5">▎</Animated.Text>;
}

export function ChatMessage({
  role,
  content,
  actions,
  onActionPress,
  isStreaming,
  isThinking,
  progressSteps,
  interruptType,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const theme = useTheme();

  if (isThinking) {
    return (
      <HStack className="px-0 py-1 justify-start">
        {progressSteps && progressSteps.length > 0 ? (
          <ProgressTimeline steps={progressSteps} theme={theme} />
        ) : content ? (
          <HStack style={{ backgroundColor: theme.bg.surfaceMute }} className="items-center gap-2 rounded-2xl rounded-bl-sm px-[18px] py-3.5">
            <ThinkingDot theme={theme} />
            <Text size="sm" style={{ color: theme.text.subtle }} className="text-[13px] leading-5">{content}</Text>
          </HStack>
        ) : (
          <ThinkingDots theme={theme} />
        )}
      </HStack>
    );
  }

  return (
    <HStack className={`px-0 py-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <Card
        variant="filled"
        style={
          isUser
            ? { backgroundColor: theme.brand.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: theme.bg.surfaceMute, borderBottomLeftRadius: 4 }
        }
        className="max-w-[70%] px-4 py-3 rounded-2xl"
      >
        <Text size="sm" style={{ color: isUser ? theme.text.onBrand : theme.text.body }} className="text-[14px] leading-[22px]">
          {content}
          {isStreaming && !isUser && <StreamingCursor theme={theme} />}
        </Text>
        {actions && actions.length > 0 && (
          <HStack className="flex-wrap gap-1.5 mt-2">
            {actions.map((action) => (
              <TouchableOpacity
                key={action.target}
                onPress={() => onActionPress?.(action.target)}
                style={{ borderColor: isUser ? theme.text.onBrand : theme.brand.primary }}
                className="border rounded-md px-2.5 py-1"
                activeOpacity={0.7}
              >
                <Text style={{ color: isUser ? theme.text.onBrand : theme.brand.primary }} className="text-[12px]">
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </HStack>
        )}
        {(interruptType === 'excu' || interruptType === 'form') && (
          <Text style={{ color: theme.brand.primary }} className="text-[12px] mt-2">
            {interruptType === 'form'
              ? '▸ 패널에서 양식을 작성해주세요'
              : '▸ 패널에서 실행 여부를 확인해주세요'}
          </Text>
        )}
        {interruptType === 'human' && (
          <Text style={{ color: theme.text.subtle }} className="text-[12px] mt-2">
            아래 입력창에 답변을 입력해주세요
          </Text>
        )}
      </Card>
    </HStack>
  );
}
