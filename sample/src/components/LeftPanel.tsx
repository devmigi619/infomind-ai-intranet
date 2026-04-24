import { AnimatePresence, motion } from 'framer-motion';
import type { PanelType } from '@/types';
import type { TabId } from '@/components/TabBar';
import { BoardPanel } from '@/panels/BoardPanel';
import { ApprovalPanel } from '@/panels/ApprovalPanel';
import { CalendarPanel } from '@/panels/CalendarPanel';
import { WeeklyReportPanel } from '@/panels/WeeklyReportPanel';
import { CertificatePanel } from '@/panels/CertificatePanel';
import { VehiclePanel } from '@/panels/VehiclePanel';
import { MeetingRoomPanel } from '@/panels/MeetingRoomPanel';

interface LeftPanelProps {
  activePanel: PanelType;
  onClose: () => void;
  onOpenFull: (tabId: TabId) => void;
}

const panelVariants = {
  hidden: { x: '-100%', opacity: 0.8 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring' as const, damping: 30, stiffness: 300 },
  },
  exit: {
    x: '-100%',
    opacity: 0.8,
    transition: { type: 'spring' as const, damping: 30, stiffness: 300 },
  },
};

const contentVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, delay: 0.05 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const panelToTab: Record<string, TabId> = {
  board: 'board',
  approval: 'approval',
  weeklyReport: 'weeklyReport',
  certificate: 'certificate',
  vehicle: 'vehicle',
  meetingRoom: 'meetingRoom',
  calendar: 'calendar',
};

function PanelContent({ panelType }: { panelType: PanelType }) {
  switch (panelType) {
    case 'board': return <BoardPanel />;
    case 'approval': return <ApprovalPanel />;
    case 'calendar': return <CalendarPanel />;
    case 'weeklyReport': return <WeeklyReportPanel />;
    case 'certificate': return <CertificatePanel />;
    case 'vehicle': return <VehiclePanel />;
    case 'meetingRoom': return <MeetingRoomPanel />;
    default: return null;
  }
}

export function LeftPanel({ activePanel, onClose, onOpenFull }: LeftPanelProps) {
  const tabId = activePanel ? panelToTab[activePanel] : null;

  return (
    <AnimatePresence>
      {activePanel && (
        <motion.div
          key="left-panel"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed left-16 top-12 bottom-0 bg-white z-40 flex flex-col"
          style={{
            width: 360,
            borderRight: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.06)',
          }}
        >
          {/* Panel Header with Fullscreen Button */}
          <div
            className="h-14 flex items-center justify-between px-5 shrink-0"
            style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-panel-title text-black">
                {activePanel === 'board' && '게시판'}
                {activePanel === 'approval' && '전자결재'}
                {activePanel === 'weeklyReport' && '주간보고'}
                {activePanel === 'certificate' && '증명서 출력'}
                {activePanel === 'vehicle' && '차량예약관리'}
                {activePanel === 'meetingRoom' && '회의실예약'}
                {activePanel === 'calendar' && '캘린더 및 일정관리'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {tabId && (
                <button
                  onClick={() => {
                    onOpenFull(tabId);
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded-md text-micro text-[#0A2463] hover:bg-[rgba(10,36,99,0.08)] transition-colors flex items-center gap-1"
                  title="전체 화면에서 보기"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                  전체화면
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/[0.35]">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePanel}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full"
              >
                <PanelContent panelType={activePanel} />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
