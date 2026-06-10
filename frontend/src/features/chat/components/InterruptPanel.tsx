import React, { useRef, useEffect } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { InterruptSheetContent } from './InterruptSheetContent';
import type { FormField } from '../types';
import type { AprvEntry } from '../../leave-req/api';

const PANEL_WIDTH = 360;

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

export function InterruptPanel({
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
  const widthAnim = useRef(new Animated.Value(isOpen ? PANEL_WIDTH : 0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: isOpen ? PANEL_WIDTH : 0,
      duration: 260,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: false,
    }).start();
  }, [isOpen, widthAnim]);

  return (
    <Animated.View
      style={{
        width: widthAnim,
        boxShadow: Platform.OS === 'web' ? '-2px 0 16px rgba(0,0,0,0.07)' : undefined,
      } as any}
      className="overflow-hidden border-l border-outline-100 bg-background-0"
    >
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
  );
}
