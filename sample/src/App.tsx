import { useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { TopHeader } from '@/components/TopHeader';
import { NavRail } from '@/components/NavRail';
import { MobileNavBar } from '@/components/MobileNavBar';
import { TabBar, type TabId } from '@/components/TabBar';
import { MainContentArea } from '@/components/MainContentArea';
import { LeftPanel } from '@/components/LeftPanel';
import { RightTabPanel } from '@/components/RightTabPanel';
import { usePanel } from '@/hooks/usePanel';
import { useChat } from '@/hooks/useChat';
import type { PanelType } from '@/types';
import {
  BoardPanel,
  ApprovalPanel,
  CalendarPanel,
  WeeklyReportPanel,
  CertificatePanel,
  VehiclePanel,
  MeetingRoomPanel,
} from '@/panels';
import './App.css';

/* ======== MOBILE LEFT PANEL ======== */
const mobilePanelConfig: Record<string, { title: string }> = {
  board: { title: '게시판' },
  approval: { title: '전자결재' },
  weeklyReport: { title: '주간보고' },
  certificate: { title: '증명서 출력' },
  vehicle: { title: '차량예약관리' },
  meetingRoom: { title: '회의실예약' },
  calendar: { title: '캘린더 및 일정관리' },
};

function MobileLeftPanel({
  activePanel,
  onClose,
  onOpenFull,
}: {
  activePanel: PanelType;
  onClose: () => void;
  onOpenFull: (tabId: TabId) => void;
}) {
  const config = activePanel ? mobilePanelConfig[activePanel] : null;
  const panelToTab: Record<string, TabId> = {
    board: 'board', approval: 'approval', weeklyReport: 'weeklyReport',
    certificate: 'certificate', vehicle: 'vehicle', meetingRoom: 'meetingRoom', calendar: 'calendar',
  };
  const tabId = activePanel ? panelToTab[activePanel] : null;

  return (
    <AnimatePresence>
      {activePanel && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[90] bg-white flex flex-col lg:hidden"
          style={{ paddingTop: 48 }}
        >
          <div className="h-12 flex items-center px-4 gap-2 shrink-0" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04]">
              <ArrowLeft size={20} className="text-black" />
            </button>
            <span className="text-panel-title text-black flex-1">{config?.title}</span>
            {tabId && (
              <button
                onClick={() => { onOpenFull(tabId); onClose(); }}
                className="px-2.5 py-1 rounded-md text-micro text-[#0A2463] hover:bg-[rgba(10,36,99,0.08)]"
              >
                전체화면
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {activePanel === 'board' && <BoardPanel />}
            {activePanel === 'approval' && <ApprovalPanel />}
            {activePanel === 'calendar' && <CalendarPanel />}
            {activePanel === 'weeklyReport' && <WeeklyReportPanel />}
            {activePanel === 'certificate' && <CertificatePanel />}
            {activePanel === 'vehicle' && <VehiclePanel />}
            {activePanel === 'meetingRoom' && <MeetingRoomPanel />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ======== MOBILE RIGHT PANEL ======== */
function MobileRightPanel({
  isOpen, onClose, messages, lastUserQuery, searchQuery,
}: {
  isOpen: boolean; onClose: () => void; messages: any[];
  lastUserQuery: string; searchQuery?: string;
}) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'conversation'>('conversation');
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden" style={{ paddingTop: 48 }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/20" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="absolute right-0 top-12 bottom-0 w-full max-w-sm bg-white flex flex-col">
            <RightTabPanel isOpen={true} onToggle={onClose} activeTab={activeTab} onTabChange={setActiveTab} messages={messages} lastUserQuery={lastUserQuery} searchQuery={searchQuery} isMobile={true} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ======== APP ======== */

function App() {
  const { activePanel, closePanel, togglePanel } = usePanel();
  const { messages, inputValue, setInputValue, sendMessage, isTyping } = useChat();

  const [tabs, setTabs] = useState<TabId[]>(['main']);
  const [activeTab, setActiveTab] = useState<TabId>('main');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState<'dashboard' | 'conversation'>('dashboard');
  const [isMobileRightOpen, setIsMobileRightOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsRightPanelOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closePanel(); setIsMobileRightOpen(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePanel]);

  const openTab = useCallback((tabId: TabId) => {
    setTabs((prev) => prev.includes(tabId) ? prev : [...prev, tabId]);
    setActiveTab(tabId);
  }, []);

  const closeTab = useCallback((tabId: TabId) => {
    setTabs((prev) => {
      const newTabs = prev.filter((t) => t !== tabId);
      if (activeTab === tabId) {
        const idx = prev.indexOf(tabId);
        setActiveTab(prev[idx - 1] || 'main');
      }
      return newTabs;
    });
  }, [activeTab]);

  const handleNavClick = useCallback((panel: PanelType) => {
    if (!panel) return;
    togglePanel(panel);
  }, [togglePanel]);

  const handleBrandClick = useCallback(() => {
    setActiveTab('main');
    closePanel();
  }, [closePanel]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    openTab('search');
    setActiveRightTab('conversation');
    if (isMobile) setIsMobileRightOpen(true);
    else setIsRightPanelOpen(true);
  }, [isMobile, openTab]);

  const handleToggleRightPanel = useCallback(() => {
    setIsRightPanelOpen((prev) => !prev);
  }, []);

  const handleOpenTabFromPanel = useCallback((tabId: TabId) => {
    openTab(tabId);
  }, [openTab]);

  const hasConversation = messages.some((m) => m.sender === 'ai');
  const showMobileResultBtn = hasConversation && isMobile && activeTab === 'main';

  return (
    <div className="h-screen w-screen bg-white overflow-hidden flex flex-col relative">
      {/* Top Header - Fixed */}
      <TopHeader
        onBrandClick={handleBrandClick}
        onToggleRightPanel={isMobile ? undefined : handleToggleRightPanel}
        isRightPanelOpen={isRightPanelOpen}
        onSearch={handleSearch}
        onToggleMobileResult={() => setIsMobileRightOpen(true)}
        showMobileResultButton={showMobileResultBtn}
      />

      {/* Desktop: NavRail + Content side by side */}
      <div className="flex-1 flex overflow-hidden relative" style={{ paddingTop: 48 }}>
        {/* Left: NavRail (desktop) */}
        <div className="hidden lg:block shrink-0">
          <NavRail activePanel={activePanel} onPanelClick={handleNavClick} />
        </div>

        {/* Left Panel (Quick Preview) - desktop */}
        <div className="hidden lg:block">
          <LeftPanel activePanel={activePanel} onClose={closePanel} onOpenFull={handleOpenTabFromPanel} />
        </div>

        {/* Center: TabBar + Main Content */}
        <div
          className="flex-1 flex flex-col overflow-hidden transition-all"
          style={{
            marginLeft: isMobile ? 0 : (activePanel ? 424 : 64),
            transitionDuration: '400ms',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Tab Bar */}
          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabClick={setActiveTab}
            onTabClose={closeTab}
            onNewTab={openTab}
          />

          {/* Main Content */}
          <main
            className="flex-1 overflow-hidden"
            style={{ marginRight: isMobile ? 0 : (isRightPanelOpen ? 320 : 0) }}
          >
            <MainContentArea
              activeTab={activeTab}
              messages={messages}
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSendMessage={sendMessage}
              isTyping={isTyping}
              searchQuery={searchQuery}
            />
          </main>
        </div>

        {/* Right: Desktop Panel */}
        <div className="hidden lg:block">
          <RightTabPanel
            isOpen={isRightPanelOpen}
            onToggle={handleToggleRightPanel}
            activeTab={activeRightTab}
            onTabChange={setActiveRightTab}
            messages={messages}
            lastUserQuery={messages.filter((m) => m.sender === 'user').pop()?.text || ''}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* Mobile Overlays */}
      <MobileLeftPanel activePanel={activePanel} onClose={closePanel} onOpenFull={handleOpenTabFromPanel} />
      <MobileRightPanel isOpen={isMobileRightOpen} onClose={() => setIsMobileRightOpen(false)} messages={messages} lastUserQuery={messages.filter((m) => m.sender === 'user').pop()?.text || ''} searchQuery={searchQuery} />
      <MobileNavBar activePanel={activePanel} onPanelClick={handleNavClick} />
    </div>
  );
}

export default App;
