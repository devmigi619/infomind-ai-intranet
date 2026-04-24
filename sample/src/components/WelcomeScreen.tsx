import { motion } from 'framer-motion';
import { suggestedQueries } from '@/data/demo-data';

interface WelcomeScreenProps {
  onSendMessage: (text: string) => void;
}

export function WelcomeScreen({ onSendMessage }: WelcomeScreenProps) {
  const handleChipClick = (query: string) => {
    onSendMessage(query);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-12">
      {/* Brand Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <span className="text-4xl font-light tracking-[0.15em] text-[#0A2463]">Infomind</span>
      </motion.div>

      {/* Greeting */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="text-display text-black text-center mb-2"
      >
        안녕하세요, 김민수 님
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="text-body text-mori-body text-center mb-10"
      >
        무엇을 도와드릴까요?
      </motion.p>

      {/* Suggested Chips */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
        className="flex flex-wrap justify-center gap-2 max-w-lg"
      >
        {suggestedQueries.map((query, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.4 + index * 0.05 }}
            onClick={() => handleChipClick(query.query)}
            className="px-4 py-2.5 border rounded-full text-small text-mori-body hover:border-[#0A2463] hover:text-[#0A2463] hover:bg-[rgba(10,36,99,0.03)] transition-all duration-200 cursor-pointer bg-white"
            style={{ borderColor: 'rgba(0, 0, 0, 0.12)' }}
          >
            {query.label}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
