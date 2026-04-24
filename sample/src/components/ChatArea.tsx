import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '@/types';
import { WelcomeScreen } from './WelcomeScreen';
import { MessageBubble } from './MessageBubble';
import { ChatInputBar } from './ChatInputBar';

interface ChatAreaProps {
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (text: string) => void;
  isTyping: boolean;
}

export function ChatArea({
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  isTyping,
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
    }
  };

  return (
    <div className="flex flex-col h-full pb-14 lg:pb-0">
      {/* Message History - Text Only */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 lg:px-12 lg:py-8">
        <AnimatePresence mode="wait">
          {isEmpty ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <WelcomeScreen
                onSendMessage={onSendMessage}
              />
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                />
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start mb-5"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: 'linear-gradient(135deg, #0A2463, #1E88E5)' }}
                    />
                    <div
                      className="px-4 py-3 bubble-ai"
                      style={{ background: 'rgba(10, 36, 99, 0.04)' }}
                    >
                      <div className="flex gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-black/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-black/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-black/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Bar */}
      <ChatInputBar
        value={inputValue}
        onChange={onInputChange}
        onSend={handleSend}
      />
    </div>
  );
}
