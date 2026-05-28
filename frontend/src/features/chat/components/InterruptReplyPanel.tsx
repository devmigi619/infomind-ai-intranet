import React, { useState, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
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

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bg.surface, borderTopColor: theme.brand.primaryTint },
      ]}
    >
      {/* 질문 레이블 */}
      <View style={[styles.questionBadge, { backgroundColor: theme.brand.primaryTint }]}>
        <MessageCircleQuestion size={13} color={theme.brand.primary} />
        <Text style={[styles.questionLabel, { color: theme.brand.primary }]}>AI 질문에 답변 중</Text>
      </View>

      <Text
        style={[styles.questionText, { color: theme.text.primary }]}
        numberOfLines={3}
      >
        {question}
      </Text>

      {/* 입력 영역 */}
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: theme.mode === 'dark' ? theme.bg.surfaceAlt : '#F5F5F5',
            borderColor: isFocused ? theme.brand.primary : 'transparent',
          },
          isFocused &&
            (Platform.OS === 'web'
              ? ({ boxShadow: `0 2px 12px ${theme.brand.primaryTint}` } as any)
              : {
                  shadowColor: theme.brand.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  elevation: 2,
                }),
          isFocused && { backgroundColor: theme.bg.surface },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { color: theme.text.primary },
            Platform.OS === 'web'
              ? ({ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT } as any)
              : { height: inputHeight },
          ]}
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
        <View style={styles.actions}>
          {/* 취소 버튼 */}
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.text.subtle }]}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <X size={14} color={theme.text.muted} />
            <Text style={[styles.cancelText, { color: theme.text.muted }]}>취소</Text>
          </TouchableOpacity>
          {/* 전송 버튼 */}
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendButton,
              { backgroundColor: theme.brand.primary },
              !canSend && styles.sendButtonDisabled,
            ]}
            activeOpacity={0.8}
            disabled={!canSend}
          >
            <ArrowUp size={16} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 2,
    gap: 10,
  },
  questionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  questionLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
  questionText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 18,
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 18,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingTop: 6,
    paddingBottom: 6,
    lineHeight: 21,
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', resize: 'none' } as any) : {}),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 12,
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
});
