import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Easing,
  View,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { InterruptSheetContent } from './InterruptSheetContent';
import type { FormField } from '../types';
import type { AprvEntry } from '../../leave-req/api';

interface Props {
  isOpen: boolean;
  interruptType: 'excu' | 'form' | null;
  previewText?: string;
  formTitle?: string;
  formFields?: FormField[] | null;
  aprvlList?: AprvEntry[] | null;
  refList?: AprvEntry[];
  currentUserId?: string;
  onApprove: (resumeValue: string, displayText?: string) => void;
  onCancel: () => void;
}

const SHEET_RATIO = 0.68;

export function MobileInterruptSheet({
  isOpen,
  interruptType,
  previewText,
  formTitle,
  formFields,
  aprvlList,
  refList,
  currentUserId,
  onApprove,
  onCancel,
}: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const SHEET_HEIGHT = Math.round(screenHeight * SHEET_RATIO);

  const translateY      = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 240,
          easing: Easing.bezier(0.4, 0, 1, 1),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, SHEET_HEIGHT, translateY, overlayOpacity]);

  if (!isOpen && !interruptType) return null;

  return (
    <View className="absolute inset-0" pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* 딤 오버레이 — 터치 시 취소 */}
      <Animated.View
        style={{ opacity: overlayOpacity } as any}
        className="absolute inset-0 bg-black/40"
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <Pressable className="absolute inset-0" onPress={onCancel} />
      </Animated.View>

      {/* 시트 본체 */}
      <Animated.View
        style={{
          height: SHEET_HEIGHT,
          transform: [{ translateY }],
        }}
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-hidden shadow-2xl bg-background-0"
      >
        {/* 드래그 핸들 */}
        <View className="items-center pt-2.5 pb-1">
          <View className="w-9 h-1 rounded bg-outline-200" />
        </View>

        {interruptType ? (
          <InterruptSheetContent
            interruptType={interruptType}
            previewText={previewText}
            formTitle={formTitle}
            formFields={formFields}
            aprvlList={aprvlList}
            refList={refList}
            currentUserId={currentUserId}
            onApprove={onApprove}
            onCancel={onCancel}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}
