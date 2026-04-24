import { useRef, useEffect } from 'react';
import { Paperclip, Send } from 'lucide-react';

interface ChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInputBar({ value, onChange, onSend }: ChatInputBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const hasText = value.trim().length > 0;

  return (
    <div
      className="shrink-0 bg-white flex items-center px-5 lg:px-12"
      style={{
        height: 80,
        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
      }}
    >
      <div className="flex items-center gap-3 w-full">
        {/* Input Field */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className="w-full h-11 px-4 text-chat-input bg-[#F9F9F9] border rounded-xl outline-none transition-all duration-200"
            style={{
              borderColor: 'rgba(0, 0, 0, 0.08)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(10, 36, 99, 0.3)';
              e.target.style.boxShadow = '0 0 0 2px rgba(10, 36, 99, 0.12)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Attachment Button */}
        <button
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors duration-200 shrink-0"
          title="첨부파일"
        >
          <Paperclip size={20} className="text-black/[0.35] hover:text-[#0A2463] transition-colors" />
        </button>

        {/* Send Button */}
        <button
          onClick={onSend}
          disabled={!hasText}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-all duration-200 shrink-0 disabled:opacity-40"
          title="볂내기"
        >
          <Send
            size={20}
            className="text-[#0A2463] transition-opacity duration-200"
            style={{ opacity: hasText ? 1 : 0.4 }}
          />
        </button>
      </div>
    </div>
  );
}
