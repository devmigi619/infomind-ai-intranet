import { motion } from 'framer-motion';
import type { ChatMessage } from '@/types';
import dayjs from 'dayjs';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAI = message.sender === 'ai';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-5`}
    >
      <div className={`flex ${isAI ? 'flex-row' : 'flex-row-reverse'} items-start gap-3 max-w-[70%]`}>
        {/* Avatar (AI only) */}
        {isAI && (
          <div
            className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
            style={{ background: 'linear-gradient(135deg, #0A2463, #1E88E5)' }}
          />
        )}

        {/* Bubble + Meta Column */}
        <div className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
          {/* Bubble */}
          <div
            className={`px-4 py-3 ${isAI ? 'bubble-ai' : 'bubble-user'}`}
            style={{
              background: isAI ? 'rgba(10, 36, 99, 0.04)' : '#0A2463',
            }}
          >
            <p
              className="text-message whitespace-pre-wrap"
              style={{ color: isAI ? '#000000' : '#FFFFFF' }}
            >
              {message.text}
            </p>
          </div>

          {/* Timestamp */}
          <span className="text-micro mt-1.5" style={{ color: 'rgba(0, 0, 0, 0.35)' }}>
            {dayjs(message.timestamp).format('HH:mm')}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
