import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
} from 'react-native';
import { Paperclip, ArrowUp } from 'lucide-react-native';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

// 1줄 ≈ lineHeight(21) + padding(top 6 + bottom 6) = 33px
// 5줄 ≈ lineHeight(21)*5 + padding 12 = 117px
const MIN_HEIGHT = 33;
const MAX_HEIGHT = 117;

export function ChatInput({ value, onChangeText, onSend, disabled }: ChatInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(MIN_HEIGHT);
  const inputRef = useRef<TextInput>(null);

  // Reset to MIN_HEIGHT immediately when value is cleared
  useEffect(() => {
    if (value === '') {
      setInputHeight(MIN_HEIGHT);
    }
  }, [value]);

  // Native: rely on onContentSizeChange
  const handleContentSizeChange = (
    e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
  ) => {
    const h = e.nativeEvent.contentSize.height;
    const clamped = Math.min(Math.max(h, MIN_HEIGHT), MAX_HEIGHT);
    setInputHeight(clamped);
  };

  // Web: measure scrollHeight after each keystroke (auto-reset trick)
  const handleChange = (text: string) => {
    onChangeText(text);
    if (Platform.OS === 'web') {
      requestAnimationFrame(() => {
        const el = inputRef.current as any;
        if (!el) return;
        el.style.height = 'auto';
        const newHeight = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
        setInputHeight(newHeight);
      });
    }
  };

  const handleSend = () => {
    if (disabled) return;
    if (!value.trim()) return;
    onSend();
  };

  // Web-only: Enter to send, Shift+Enter to newline
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

  return (
    <View style={styles.container}>
      <View style={[styles.inputWrap, isFocused && styles.inputWrapFocused]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { height: inputHeight }]}
          value={value}
          onChangeText={handleChange}
          placeholder="AI에게 물어보거나 작업을 요청하세요..."
          placeholderTextColor="rgba(0,0,0,0.35)"
          multiline
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyPress={handleKeyPress}
          // Web uses the scrollHeight approach; native uses onContentSizeChange
          onContentSizeChange={Platform.OS !== 'web' ? handleContentSizeChange : undefined}
          // For native: keep the regular submit behavior off so newlines work.
          // Native users use the send button.
          blurOnSubmit={false}
        />
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.attachButton}
            activeOpacity={0.6}
            // Phase 2: 첨부 동작 미구현
          >
            <Paperclip size={18} color="rgba(0,0,0,0.4)" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            activeOpacity={0.8}
            disabled={!canSend}
          >
            <ArrowUp size={16} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.hint}>Shift+Enter로 줄바꿈 · Enter로 전송</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 18,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapFocused: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(10,36,99,0.5)',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 12px rgba(10,36,99,0.08)' } as any)
      : {
          shadowColor: '#0A2463',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
        }),
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
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
    gap: 4,
  },
  attachButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0A2463',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  hint: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.35)',
    marginTop: 6,
    textAlign: 'center',
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
});
