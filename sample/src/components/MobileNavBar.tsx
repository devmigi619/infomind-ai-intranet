import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ClipboardCheck,
  CalendarDays,
  BarChart3,
  Car,
  MoreHorizontal,
  FileText,
  Award,
  Calendar,
  X,
} from 'lucide-react';
import type { PanelType } from '@/types';

interface MobileNavBarProps {
  activePanel: PanelType;
  onPanelClick: (panel: PanelType) => void;
}

/* Main tabs - most frequently used 4 */
const mainTabs: { id: PanelType; icon: React.ElementType; label: string }[] = [
  { id: 'approval', icon: ClipboardCheck, label: '결재' },
  { id: 'weeklyReport', icon: BarChart3, label: '주간보고' },
  { id: 'calendar', icon: Calendar, label: '캘린더' },
  { id: 'vehicle', icon: Car, label: '차량' },
];

/* More menu items */
const moreItems: { id: PanelType; icon: React.ElementType; label: string }[] = [
  { id: 'board', icon: FileText, label: '게시판' },
  { id: 'meetingRoom', icon: CalendarDays, label: '회의실' },
  { id: 'certificate', icon: Award, label: '증명서' },
];

export function MobileNavBar({ activePanel, onPanelClick }: MobileNavBarProps) {
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = moreItems.some((t) => t.id === activePanel);

  return (
    <>
      {/* More Menu Overlay */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] bg-black/20 lg:hidden"
            onClick={() => setShowMore(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-14 left-0 right-0 bg-white rounded-t-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-module-heading text-black">더보기</h3>
                <button
                  onClick={() => setShowMore(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04]"
                >
                  <X size={18} className="text-mori-muted" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePanel === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onPanelClick(item.id);
                        setShowMore(false);
                      }}
                      className="flex flex-col items-center gap-2 py-4 rounded-xl transition-all"
                      style={{
                        background: isActive ? 'rgba(10, 36, 99, 0.08)' : 'rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      <Icon
                        size={24}
                        style={{ color: isActive ? '#0A2463' : 'rgba(0, 0, 0, 0.5)' }}
                      />
                      <span
                        className="text-small"
                        style={{
                          color: isActive ? '#0A2463' : 'rgba(0, 0, 0, 0.6)',
                          fontWeight: isActive ? 500 : 300,
                        }}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-14 bg-white z-[100] flex items-center justify-around lg:hidden"
        style={{
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.04)',
        }}
      >
        {mainTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPanelClick(item.id)}
              className="flex flex-col items-center justify-center gap-0.5 w-14 h-full"
            >
              <Icon
                size={20}
                style={{ color: isActive ? '#0A2463' : 'rgba(0, 0, 0, 0.35)' }}
              />
              <span
                className="text-micro"
                style={{
                  color: isActive ? '#0A2463' : 'rgba(0, 0, 0, 0.35)',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => setShowMore(true)}
          className="flex flex-col items-center justify-center gap-0.5 w-14 h-full"
        >
          <MoreHorizontal
            size={20}
            style={{ color: isMoreActive ? '#0A2463' : 'rgba(0, 0, 0, 0.35)' }}
          />
          <span
            className="text-micro"
            style={{
              color: isMoreActive ? '#0A2463' : 'rgba(0, 0, 0, 0.35)',
              fontWeight: isMoreActive ? 500 : 400,
            }}
          >
            더보기
          </span>
        </button>
      </nav>
    </>
  );
}
