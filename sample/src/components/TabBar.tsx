import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, FileText, ClipboardCheck, BarChart3, Award, Car, CalendarDays, Calendar, Search, Plus } from 'lucide-react';

export type TabId = 'main' | 'board' | 'approval' | 'weeklyReport' | 'certificate' | 'vehicle' | 'meetingRoom' | 'calendar' | 'search';

const tabConfig: Record<TabId, { label: string; icon: React.ElementType; closable: boolean }> = {
  main: { label: '메인', icon: Home, closable: false },
  board: { label: '게시판', icon: FileText, closable: true },
  approval: { label: '전자결재', icon: ClipboardCheck, closable: true },
  weeklyReport: { label: '주간보고', icon: BarChart3, closable: true },
  certificate: { label: '증명서', icon: Award, closable: true },
  vehicle: { label: '차량예약', icon: Car, closable: true },
  meetingRoom: { label: '회의실', icon: CalendarDays, closable: true },
  calendar: { label: '캘린더', icon: Calendar, closable: true },
  search: { label: '검색결과', icon: Search, closable: true },
};

interface TabBarProps {
  tabs: TabId[];
  activeTab: TabId;
  onTabClick: (tab: TabId) => void;
  onTabClose: (tab: TabId) => void;
  onNewTab: (tab: TabId) => void;
}

export function TabBar({ tabs, activeTab, onTabClick, onTabClose, onNewTab }: TabBarProps) {
  const [showNewMenu, setShowNewMenu] = useState(false);

  const availableTabs = Object.keys(tabConfig).filter(
    (id) => id !== 'main' && id !== 'search' && !tabs.includes(id as TabId)
  ) as TabId[];

  return (
    <div 
      className="flex items-center px-2 overflow-hidden"
      style={{ 
        height: '48px', 
        backgroundColor: '#e5e5e5',
        borderBottom: '2px solid #cccccc',
        flexShrink: 0 
      }}
    >
      {/* Tab List */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {tabs.map((tabId) => {
          const config = tabConfig[tabId];
          const Icon = config.icon;
          const isActive = activeTab === tabId;

          return (
            <button
              key={tabId}
              onClick={() => onTabClick(tabId)}
              className="flex items-center gap-1.5 px-3 rounded-md text-sm shrink-0 transition-all"
              style={{
                height: '36px',
                backgroundColor: isActive ? '#0A2463' : '#ffffff',
                color: isActive ? '#ffffff' : '#333333',
                fontWeight: isActive ? 500 : 400,
                border: isActive ? '1px solid #0A2463' : '1px solid #bbbbbb',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              <Icon size={14} />
              <span>{config.label}</span>
              {config.closable && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tabId);
                  }}
                  className="ml-1 flex items-center justify-center rounded-full"
                  style={{ width: '16px', height: '16px', opacity: 0.7 }}
                >
                  <X size={11} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* New Tab Button */}
      <div className="relative shrink-0 ml-2">
        <button
          onClick={() => setShowNewMenu(!showNewMenu)}
          className="flex items-center justify-center rounded-md bg-white"
          style={{ width: '32px', height: '32px', border: '1px solid #bbbbbb' }}
        >
          <Plus size={16} style={{ color: '#666666' }} />
        </button>

        <AnimatePresence>
          {showNewMenu && availableTabs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg"
              style={{ minWidth: '160px', border: '1px solid #dddddd', zIndex: 60 }}
            >
              <div className="px-3 py-2 text-xs text-gray-400 border-b" style={{ borderColor: '#eeeeee' }}>
                메뉴 추가
              </div>
              {availableTabs.map((tabId) => {
                const config = tabConfig[tabId];
                const Icon = config.icon;
                return (
                  <button
                    key={tabId}
                    onClick={() => {
                      onNewTab(tabId);
                      setShowNewMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-black hover:bg-gray-50"
                  >
                    <Icon size={14} style={{ color: '#0A2463' }} />
                    {config.label}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
