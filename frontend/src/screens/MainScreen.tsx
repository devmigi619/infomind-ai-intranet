import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';

interface ActionLink {
  label: string;
  target: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: ActionLink[];
  isStreaming?: boolean;
  isThinking?: boolean;
}

interface MainScreenProps {
  user: { name: string } | null;
  onNavigate: (tabId: string) => void;
  onAiResponseComplete?: () => void;
}

export function MainScreen({
  user,
  onNavigate,
  onAiResponseComplete,
}: MainScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsgId = `u-${Date.now()}`;
      const thinkingId = 'thinking';

      const userMsg: Message = {
        id: userMsgId,
        role: 'user',
        content: text.trim(),
      };
      const thinkingMsg: Message = {
        id: thinkingId,
        role: 'assistant',
        content: '',
        isThinking: true,
      };

      setMessages((prev) => [...prev, userMsg, thinkingMsg]);
      setInputText('');
      setIsStreaming(true);

      try {
        const token = await AsyncStorage.getItem('token');
        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch('http://localhost/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({ message: text.trim(), history }),
        });

        if (!response.ok || !response.body) {
          throw new Error('SSE connection failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let actions: ActionLink[] = [];
        let firstTokenReceived = false;
        const streamingId = 'streaming';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'meta') {
                actions = data.actions || [];
              } else if (data.type === 'token') {
                // On first token: replace thinking bubble with streaming bubble
                if (!firstTokenReceived) {
                  firstTokenReceived = true;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === thinkingId
                        ? {
                            id: streamingId,
                            role: 'assistant',
                            content: data.content,
                            isStreaming: true,
                          }
                        : m,
                    ),
                  );
                } else {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === streamingId
                        ? { ...m, content: m.content + data.content }
                        : m,
                    ),
                  );
                }
              } else if (data.type === 'done') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamingId
                      ? {
                          ...m,
                          id: `a-${Date.now()}`,
                          actions,
                          isStreaming: false,
                        }
                      : m,
                  ),
                );
              }
            } catch {
              // ignore parse errors for incomplete chunks
            }
          }
        }

        // If stream ended without 'done' but with at least one token,
        // ensure streaming state is cleared.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? { ...m, id: `a-${Date.now()}`, isStreaming: false }
              : m,
          ),
        );
      } catch {
        // Replace thinking bubble with an error message.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === 'thinking' || m.id === 'streaming'
              ? {
                  id: `a-${Date.now()}`,
                  role: 'assistant',
                  content:
                    'AI 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
                  isStreaming: false,
                  isThinking: false,
                }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
        setTimeout(
          () => scrollRef.current?.scrollToEnd({ animated: true }),
          100,
        );
        // Notify parent that an AI response cycle completed.
        onAiResponseComplete?.();
      }
    },
    [isStreaming, messages, onAiResponseComplete],
  );

  const handleSend = useCallback(() => {
    sendMessage(inputText);
  }, [inputText, sendMessage]);

  const isEmpty = messages.length === 0;

  return (
    <View style={styles.container}>
      {isEmpty ? (
        <View style={styles.welcome}>
          <View style={styles.iconWrap}>
            <Sparkles size={32} color="#0A2463" />
          </View>
          <Text style={styles.welcomeTitle}>
            안녕하세요, {user?.name ?? ''}님
          </Text>
          <Text style={styles.welcomeSubtitle}>무엇을 도와드릴까요?</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              actions={msg.actions}
              onActionPress={(target) => onNavigate(target)}
              isStreaming={msg.isStreaming}
              isThinking={msg.isThinking}
            />
          ))}
        </ScrollView>
      )}

      <ChatInput
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        disabled={isStreaming}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  welcome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(10,36,99,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.55)',
    marginBottom: 16,
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 16,
  },
});
