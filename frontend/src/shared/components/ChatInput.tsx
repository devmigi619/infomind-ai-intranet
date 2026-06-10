import React, { useState, useRef, useLayoutEffect } from 'react';
import {
  View,
  TextInput,
  Platform,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
} from 'react-native';
import { Paperclip, ArrowUp } from 'lucide-react-native';
import type { AppTheme } from '../hooks/useTheme';
import { Input, InputField } from './ui/input';
import { Button } from './ui/button';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  theme?: AppTheme;
  placeholder?: string;
}

const MIN_HEIGHT = 33;
const MAX_HEIGHT = 117;

export function ChatInput({ value, onChangeText, onSend, disabled, theme, placeholder }: ChatInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(MIN_HEIGHT);
  const inputRef = useRef<TextInput>(null);

  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = inputRef.current as any;
    if (!el) return;
    if (el.tagName === 'TEXTAREA') el.rows = 1;
    el.style.height = 'auto';
    const measured = Math.max(MIN_HEIGHT, Math.min(el.scrollHeight, MAX_HEIGHT));
    el.style.height = `${measured}px`;
  }, [value]);

  const handleContentSizeChange = (
    e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
  ) => {
    const h = e.nativeEvent.contentSize.height;
    const clamped = Math.min(Math.max(h, MIN_HEIGHT), MAX_HEIGHT);
    setInputHeight(clamped);
  };

  const handleSend = () => {
    if (disabled) return;
    if (!value.trim()) return;
    onSend();
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

  const canSend = !disabled && value.trim().length > 0;

  const bgColor = theme ? theme.bg.surface : '#ffffff';
  const inputBg = theme ? (theme.mode === 'dark' ? theme.bg.surfaceAlt : '#F5F5F5') : '#F5F5F5';
  const inputBgFocused = theme ? theme.bg.surface : '#ffffff';
  const borderFocused = theme ? theme.brand.primary : 'rgba(10,36,99,0.5)';
  const textColor = theme ? theme.text.primary : '#000000';
  const placeholderColor = theme ? theme.text.subtle : 'rgba(0,0,0,0.35)';
  const iconColor = theme ? theme.text.subtle : 'rgba(0,0,0,0.4)';
  const sendBg = theme ? theme.brand.primary : '#0A2463';

  return (
    <View style={{ backgroundColor: bgColor }} className="px-8 pt-4 pb-6">
      <Input
        style={{
          backgroundColor: isFocused ? inputBgFocused : inputBg,
          ...(isFocused
            ? {
                borderColor: borderFocused,
                ...(Platform.OS === 'web'
                  ? ({ boxShadow: `0 2px 12px ${theme ? theme.brand.primaryTint : 'rgba(10,36,99,0.08)'}` } as any)
                  : {
                      shadowColor: theme ? theme.brand.primary : '#0A2463',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08,
                      shadowRadius: 12,
                      elevation: 2,
                    }),
              }
            : { borderColor: 'transparent' }),
        }}
        className="flex-row items-end rounded-[18px] pt-2 pr-2 pb-2 pl-[18px] border-[1.5px] h-auto"
      >
        <InputField
          ref={inputRef as any}
          style={{
            color: textColor,
            ...(Platform.OS === 'web'
              ? ({ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT, outlineStyle: 'none', resize: 'none' } as any)
              : { height: inputHeight }),
          }}
          className="flex-1 text-[14px] pt-1.5 pb-1.5 leading-[21px]"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? '무엇이든 물어보세요'}
          placeholderTextColor={placeholderColor}
          multiline
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyPress={handleKeyPress}
          onContentSizeChange={Platform.OS !== 'web' ? handleContentSizeChange : undefined}
          blurOnSubmit={false}
        />
        <View className="flex-row items-center gap-1">
          <Button
            action="default"
            className="w-8 h-8 rounded-full items-center justify-center p-0 min-w-0"
          >
            <Paperclip size={18} color={iconColor} />
          </Button>
          <Button
            onPress={handleSend}
            style={canSend ? { backgroundColor: sendBg } : { backgroundColor: 'rgba(0,0,0,0.15)' }}
            className="w-8 h-8 rounded-full items-center justify-center p-0 min-w-0"
            disabled={!canSend}
          >
            <ArrowUp size={16} color="#ffffff" strokeWidth={2.5} />
          </Button>
        </View>
      </Input>
    </View>
  );
}
