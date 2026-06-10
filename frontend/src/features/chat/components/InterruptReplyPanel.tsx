import React, { useState, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { ArrowUp, X, MessageCircleQuestion } from 'lucide-react-native';
import type { AppTheme } from '../../../shared/hooks/useTheme';

interface InterruptReplyPanelProps {
  /** AI가 던진 명확화 질문 텍스트 */
  question: string;
  theme: AppTheme;
  onSend: (answer: string) => void;
  onCancel: () => void;
}

const MIN_HEIGHT = 33;
const MAX_HEIGHT = 117;
const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

/**
 * human interrupt 상태에서 ChatInput 대신 표시되는 인터뷰 패널.
 * AI 질문을 레이블로 보여주고 답변 입력 + 취소 버튼을 제공한다.
 */
export function InterruptReplyPanel({ question, theme, onSend, onCancel }: InterruptReplyPanelProps) {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(MIN_HEIGHT);
  const inputRef = useRef<TextInput>(null);

  // Web: textarea 높이 자동 조정
  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = inputRef.current as any;
    if (!el) return;
    if (el.tagName === 'TEXTAREA') el.rows = 1;
    el.style.height = 'auto';
    const measured = Math.max(MIN_HEIGHT, Math.min(el.scrollHeight, MAX_HEIGHT));
    el.style.height = `${measured}px`;
  }, [text]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyPress = (e: any) => {
    if (Platform.OS !== 'web') return;
    const key = e?.nativeEvent?.key;
    const shift = e?.nativeEvent?.shiftKey;
    if (key === 'Enter' && !shift) {
      e.preventDefault?.();
      handleSend();
    }
  };

  const canSend = text.trim().length > 0;

  // 포커스 상태 그림자/보더 스타일
  const focusShadowStyle = isFocused
    ? Platform.OS === 'web'
      ? ({ boxShadow: `0 2px 12px ${theme.brand.primaryTint}` } as any)
      : {
          shadowColor: theme.brand.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 2,
        }
    : {};

  return (
    <View
      style={{
        backgroundColor: theme.bg.surface,
        borderTopColor: theme.brand.primaryTint,
      }}
      className="px-8 pt-3 pb-6 border-t-2 gap-2.5"
    >
      {/* 질문 레이블 */}
      <View
        style={{ backgroundColor: theme.brand.primaryTint }}
        className="flex-row items-center self-start px-2.5 py-1 rounded-full gap-1"
      >
        <MessageCircleQuestion size={13} color={theme.brand.primary} />
        <Text
          style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}
          className="text-[12px] font-semibold"
        >
          AI 질문에 답변 중
        </Text>
      </View>

      <Text
        style={{ color: theme.text.primary, fontFamily: WEB_FONT }}
        className="text-[13px] leading-5"
        numberOfLines={3}
      >
        {question}
      </Text>

      {/* 입력 영역 */}
      <View
        style={{
          backgroundColor: isFocused
            ? theme.bg.surface
            : (theme.mode === 'dark' ? theme.bg.surfaceAlt : '#F5F5F5'),
          borderColor: isFocused ? theme.brand.primary : 'transparent',
          ...focusShadowStyle,
        }}
        className="flex-row items-end rounded-[18px] pt-2 pr-2 pb-2 pl-[18px] border-[1.5px]"
      >
        <TextInput
          ref={inputRef}
          style={{
            color: theme.text.primary,
            fontFamily: WEB_FONT,
            ...(Platform.OS === 'web'
              ? ({ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT, outlineStyle: 'none', resize: 'none' } as any)
              : { height: inputHeight }),
          }}
          className="flex-1 text-[14px] py-1.5 leading-[21px]"
          value={text}
          onChangeText={setText}
          placeholder="답변을 입력하세요"
          placeholderTextColor={theme.text.subtle}
          multiline
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyPress={handleKeyPress}
          onContentSizeChange={
            Platform.OS !== 'web'
              ? (e) => {
                  const h = e.nativeEvent.contentSize.height;
                  setInputHeight(Math.min(Math.max(h, MIN_HEIGHT), MAX_HEIGHT));
                }
              : undefined
          }
          blurOnSubmit={false}
          autoFocus
        />
        <View className="flex-row items-center gap-1.5">
          {/* 취소 버튼 */}
          <TouchableOpacity
            style={{ borderColor: theme.text.subtle }}
            onPress={onCancel}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-xl border"
          >
            <X size={14} color={theme.text.muted} />
            <Text
              style={{ color: theme.text.muted, fontFamily: WEB_FONT }}
              className="text-[12px]"
            >
              취소
            </Text>
          </TouchableOpacity>
          {/* 전송 버튼 */}
          <TouchableOpacity
            onPress={handleSend}
            style={
              canSend
                ? { backgroundColor: theme.brand.primary }
                : { backgroundColor: 'rgba(0,0,0,0.15)' }
            }
            activeOpacity={0.8}
            disabled={!canSend}
            className="w-8 h-8 rounded-full items-center justify-center"
          >
            <ArrowUp size={16} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

