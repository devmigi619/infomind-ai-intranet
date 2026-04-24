import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  MessageSquareText,
  Plus,
  X,
  FileText,
  CreditCard,
  MessageCircle,
  Briefcase,
  CalendarDays,
  Car,
  ArrowRight,
  Search,
} from 'lucide-react';
import type { ChatMessage, WidgetData } from '@/types';
import {
  demoCalendarEvents,
  demoApprovals,
  demoBoardPosts,
  demoWeeklyReports,
  getConversationContext,
} from '@/data/demo-data';

/* ===================== TYPES ===================== */

interface RightTabPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: 'dashboard' | 'conversation';
  onTabChange: (tab: 'dashboard' | 'conversation') => void;
  messages: ChatMessage[];
  lastUserQuery: string;
  searchQuery?: string;
  isMobile?: boolean;
}

interface DashboardWidget {
  id: string;
  type: 'calendar' | 'approval' | 'board' | 'weeklyReport';
  title: string;
}

/* ===================== DATA ===================== */

const defaultWidgets: DashboardWidget[] = [
  { id: 'w1', type: 'calendar', title: '오늘의 일정' },
  { id: 'w2', type: 'approval', title: '결재 현황' },
  { id: 'w3', type: 'weeklyReport', title: '주간보고' },
];

const availableWidgets: DashboardWidget[] = [
  { id: 'w4', type: 'board', title: '최근 공지' },
];

const iconMap: Record<string, React.ElementType> = {
  FileText, CreditCard, MessageCircle, Briefcase, CalendarDays, Car,
};

/* ===================== MAIN COMPONENT ===================== */

export function RightTabPanel({
  isOpen,
  onToggle,
  activeTab,
  onTabChange,
  messages,
  lastUserQuery,
  searchQuery,
  isMobile,
}: RightTabPanelProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);

  const removeWidget = (id: string) => setWidgets((prev) => prev.filter((w) => w.id !== id));
  const addWidget = (widget: DashboardWidget) => {
    if (!widgets.find((w) => w.id === widget.id)) {
      setWidgets((prev) => [...prev, widget]);
    }
  };

  // Get latest AI widget data
  const lastAiWidget = [...messages].reverse().find((m) => m.sender === 'ai' && m.widget)?.widget;
  const context = lastUserQuery ? getConversationContext(lastUserQuery) : null;

  // Determine panel width based on device
  const panelWidth = isMobile ? '100%' : 320;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0.8 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.8 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed right-0 top-12 bottom-0 bg-white z-40 flex flex-col"
          style={{
            width: panelWidth,
            borderLeft: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.06)',
          }}
        >
          {/* Tab Header */}
          <div
            className="flex items-center justify-between px-4 h-12 shrink-0"
            style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}
          >
            <div className="flex items-center gap-1">
              <button
                onClick={() => onTabChange('dashboard')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-small transition-all duration-200"
                style={{
                  background: activeTab === 'dashboard' ? 'rgba(10, 36, 99, 0.08)' : 'transparent',
                  color: activeTab === 'dashboard' ? '#0A2463' : 'rgba(0, 0, 0, 0.35)',
                  fontWeight: activeTab === 'dashboard' ? 400 : 300,
                }}
              >
                <LayoutDashboard size={14} />
                대시보드
              </button>
              <button
                onClick={() => onTabChange('conversation')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-small transition-all duration-200"
                style={{
                  background: activeTab === 'conversation' ? 'rgba(10, 36, 99, 0.08)' : 'transparent',
                  color: activeTab === 'conversation' ? '#0A2463' : 'rgba(0, 0, 0, 0.35)',
                  fontWeight: activeTab === 'conversation' ? 400 : 300,
                }}
              >
                <MessageSquareText size={14} />
                대화결과
              </button>
            </div>
            {isMobile && (
              <button
                onClick={onToggle}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/[0.04] transition-colors"
              >
                <X size={18} className="text-mori-muted" />
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' ? (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <DashboardTab widgets={widgets} onRemove={removeWidget} onAdd={addWidget} available={availableWidgets} />
                </motion.div>
              ) : (
                <motion.div
                  key="conversation"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ConversationTab context={context} widget={lastAiWidget} searchQuery={searchQuery} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ===================== DASHBOARD TAB ===================== */

function DashboardTab({
  widgets,
  onRemove,
  onAdd,
  available,
}: {
  widgets: DashboardWidget[];
  onRemove: (id: string) => void;
  onAdd: (w: DashboardWidget) => void;
  available: DashboardWidget[];
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <>
      <div className="space-y-4">
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className="bg-white rounded-md p-4 relative group"
            style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-small font-medium text-black">{widget.title}</span>
              <button
                onClick={() => onRemove(widget.id)}
                className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/[0.04]"
              >
                <X size={12} className="text-mori-muted" />
              </button>
            </div>
            <WidgetContent type={widget.type} />
          </div>
        ))}
      </div>

      {/* Add Widget */}
      <div className="relative mt-4">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full py-2.5 border border-dashed rounded-md text-small text-mori-muted hover:text-[#0A2463] hover:border-[#0A2463] transition-all duration-200 flex items-center justify-center gap-1.5"
          style={{ borderColor: 'rgba(0, 0, 0, 0.12)' }}
        >
          <Plus size={14} />
          위젯 추가
        </button>
        <AnimatePresence>
          {showAddMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md z-10"
              style={{ border: '1px solid rgba(0, 0, 0, 0.08)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }}
            >
              {available
                .filter((w) => !widgets.find((cw) => cw.id === w.id))
                .map((w) => (
                  <button
                    key={w.id}
                    onClick={() => onAdd(w)}
                    className="w-full text-left px-3 py-2.5 text-small text-black hover:bg-black/[0.04] transition-colors first:rounded-t-md last:rounded-b-md"
                  >
                    {w.title}
                  </button>
                ))}
              {available.filter((w) => !widgets.find((cw) => cw.id === w.id)).length === 0 && (
                <div className="px-3 py-2.5 text-small text-mori-muted">추가할 위젯이 없습니다</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function WidgetContent({ type }: { type: DashboardWidget['type'] }) {
  switch (type) {
    case 'calendar':
      return (
        <div className="space-y-2">
          {demoCalendarEvents.slice(0, 3).map((e) => (
            <div key={e.id} className="flex items-start gap-2">
              <span className="text-micro text-[#0A2463] font-medium w-10 flex-shrink-0">{e.time}</span>
              <div>
                <p className="text-small text-black">{e.title}</p>
                <p className="text-micro text-mori-muted">{e.location}</p>
              </div>
            </div>
          ))}
        </div>
      );
    case 'approval':
      return (
        <div className="space-y-2">
          {demoApprovals.filter((a) => a.status === 'pending').map((a) => (
            <div key={a.id}>
              <p className="text-small text-black">{a.title}</p>
              <p className="text-micro text-mori-muted">{a.requester} · {a.date}</p>
            </div>
          ))}
          {demoApprovals.filter((a) => a.status === 'pending').length === 0 && (
            <p className="text-small text-mori-muted">대기중인 결재가 없습니다</p>
          )}
        </div>
      );
    case 'weeklyReport':
      return (
        <div className="space-y-2">
          {demoWeeklyReports.slice(0, 4).map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.status === 'submitted' ? 'bg-[#43A047]' : 'bg-[#FB8C00]'}`} />
              <div className="min-w-0">
                <p className="text-small text-black truncate">{r.author} ({r.department})</p>
                <p className="text-micro text-mori-muted truncate">{r.summary}</p>
              </div>
            </div>
          ))}
        </div>
      );
    case 'board':
      return (
        <div className="space-y-2">
          {demoBoardPosts.filter((p) => p.category === '공지사항').slice(0, 2).map((p) => (
            <div key={p.id}>
              <span className="text-micro px-1.5 py-0.5 rounded" style={{ background: 'rgba(10, 36, 99, 0.08)', color: '#0A2463' }}>공지</span>
              <p className="text-small text-black mt-1">{p.title}</p>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

/* ===================== CONVERSATION TAB (Interactive Only) ===================== */

function ConversationTab({
  context,
  widget,
  searchQuery,
}: {
  context: ReturnType<typeof getConversationContext>;
  widget?: WidgetData;
  searchQuery?: string;
}) {
  // Search Results Mode
  if (searchQuery) {
    return <SearchResults query={searchQuery} />;
  }

  // Empty State
  if (!context && !widget) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MessageSquareText size={32} className="text-black/[0.1] mb-3" />
        <p className="text-small text-mori-muted">
          대화를 시작하면 관련 문서와 업무를 보여드립니다
        </p>
        <div className="mt-4 space-y-1.5">
          <p className="text-micro text-mori-muted">예시:</p>
          {['출장 규정 알려줘', '회의실 예약 현황', '휴가 신청 방법'].map((ex) => (
            <span
              key={ex}
              className="inline-block px-2.5 py-1 rounded-full text-micro mx-0.5"
              style={{ background: 'rgba(10, 36, 99, 0.06)', color: '#0A2463' }}
            >
              {ex}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Widget Card from AI Response */}
      {widget && (
        <div className="rounded-md p-4 bg-white" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-[#0A2463]" />
            <span className="text-small font-medium text-[#0A2463]">{widget.title}</span>
          </div>
          <div className="space-y-2">
            {widget.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-small text-black">{item.label}</span>
                {item.value && <span className="text-micro text-mori-muted">{item.value}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context-Aware Document + Tasks */}
      {context && (
        <>
          {/* Document Title + Tag */}
          <div className="flex items-center gap-2">
            <h3 className="text-module-heading text-black">{context.docTitle}</h3>
            <span
              className="text-micro px-2.5 py-0.5 rounded-full"
              style={{ background: `${context.docTagColor}15`, color: context.docTagColor }}
            >
              {context.docTag}
            </span>
          </div>

          {/* Summary + Thumbnail */}
          <div className="bg-white rounded-lg p-4" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-small font-medium text-black mb-2">주요 내용 요약</h4>
                <ul className="space-y-1.5">
                  {context.summary.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-black/30 mt-2 flex-shrink-0" />
                      <span className="text-small text-black">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-shrink-0">
                <div
                  className="w-20 h-28 rounded-md flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #f5f5f5, #e8e8e8)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <div className="text-center">
                    <FileText size={24} className="text-black/20 mx-auto mb-1" />
                    <span className="text-micro text-black/30 block">PDF</span>
                  </div>
                </div>
              </div>
            </div>
            <button className="mt-3 flex items-center gap-1 text-small text-[#0A2463] hover:underline">
              전체 규정 보기
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Related Tasks */}
          <div>
            <h4 className="text-small font-medium text-black mb-3">관련 업무 바로가기</h4>
            <div className="space-y-2">
              {context.relatedTasks.map((task, i) => {
                const Icon = iconMap[task.icon] || FileText;
                return (
                  <button
                    key={i}
                    className="w-full flex items-center gap-3 p-3 bg-white rounded-md hover:shadow-card transition-all duration-200 text-left group"
                    style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}
                  >
                    <div
                      className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(10, 36, 99, 0.06)' }}
                    >
                      <Icon size={18} className="text-[#0A2463]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-small text-black">{task.title}</p>
                      <p className="text-micro text-mori-muted">{task.subtitle}</p>
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-mori-muted group-hover:text-[#0A2463] transition-colors flex-shrink-0"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ===================== SEARCH RESULTS ===================== */

function SearchResults({ query }: { query: string }) {
  // Demo search across all data
  const boardResults = demoBoardPosts.filter(
    (p) => p.title.includes(query) || p.author.includes(query)
  );
  const approvalResults = demoApprovals.filter(
    (a) => a.title.includes(query) || a.requester.includes(query)
  );
  const reportResults = demoWeeklyReports.filter(
    (r) => r.author.includes(query) || r.summary.includes(query)
  );

  const hasResults = boardResults.length > 0 || approvalResults.length > 0 || reportResults.length > 0;

  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search size={28} className="text-black/[0.1] mb-2" />
        <p className="text-small text-mori-muted">"{query}"에 대한 검색 결과가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Search size={16} className="text-[#0A2463]" />
        <h3 className="text-module-heading text-black">"{query}" 검색 결과</h3>
      </div>

      {boardResults.length > 0 && (
        <div>
          <h4 className="text-micro text-mori-muted mb-2 uppercase tracking-wider">게시판</h4>
          <div className="space-y-2">
            {boardResults.map((p) => (
              <div key={p.id} className="p-3 bg-white rounded-md" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <span className="text-micro px-1.5 py-0.5 rounded" style={{ background: 'rgba(10, 36, 99, 0.08)', color: '#0A2463' }}>{p.category}</span>
                <p className="text-small text-black mt-1">{p.title}</p>
                <p className="text-micro text-mori-muted">{p.author} · {p.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {approvalResults.length > 0 && (
        <div>
          <h4 className="text-micro text-mori-muted mb-2 uppercase tracking-wider">전자결재</h4>
          <div className="space-y-2">
            {approvalResults.map((a) => (
              <div key={a.id} className="p-3 bg-white rounded-md" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <p className="text-small text-black">{a.title}</p>
                <p className="text-micro text-mori-muted">{a.requester} · {a.type}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportResults.length > 0 && (
        <div>
          <h4 className="text-micro text-mori-muted mb-2 uppercase tracking-wider">주간보고</h4>
          <div className="space-y-2">
            {reportResults.map((r) => (
              <div key={r.id} className="p-3 bg-white rounded-md" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <p className="text-small text-black">{r.author} ({r.department})</p>
                <p className="text-micro text-mori-muted">{r.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
