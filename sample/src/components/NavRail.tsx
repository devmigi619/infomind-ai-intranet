import {
  FileText,
  ClipboardCheck,
  BarChart3,
  Award,
  Car,
  CalendarDays,
  Calendar,
} from 'lucide-react';
import type { PanelType } from '@/types';

interface NavRailProps {
  activePanel: PanelType;
  onPanelClick: (panel: PanelType) => void;
}

export const navModules: { id: PanelType; icon: React.ElementType; label: string; unread?: number }[] = [
  { id: 'board', icon: FileText, label: '게시판' },
  { id: 'approval', icon: ClipboardCheck, label: '전자결재', unread: 2 },
  { id: 'weeklyReport', icon: BarChart3, label: '주간보고' },
  { id: 'certificate', icon: Award, label: '증명서' },
  { id: 'vehicle', icon: Car, label: '차량' },
  { id: 'meetingRoom', icon: CalendarDays, label: '회의실' },
  { id: 'calendar', icon: Calendar, label: '캘린더' },
];

export function NavRail({ activePanel, onPanelClick }: NavRailProps) {
  return (
    <nav
      className="fixed left-0 top-12 bottom-0 w-16 bg-white z-50 flex flex-col items-center pt-4"
      style={{ borderRight: '1px solid rgba(0, 0, 0, 0.08)' }}
    >
      <div className="flex flex-col items-center gap-2">
        {navModules.map((mod) => {
          const Icon = mod.icon;
          const isActive = activePanel === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => onPanelClick(mod.id)}
              className="relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 group"
              style={{
                background: isActive ? 'rgba(10, 36, 99, 0.08)' : 'transparent',
              }}
              title={mod.label}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#0A2463] rounded-r-full" />
              )}
              <Icon
                size={20}
                className="transition-colors duration-200"
                style={{ color: isActive ? '#0A2463' : '#000000' }}
              />
              {mod.unread && mod.unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full bg-[#0A2463] text-white text-micro flex items-center justify-center px-1">
                  {mod.unread}
                </span>
              )}
              {!isActive && (
                <span className="absolute inset-0 rounded-xl bg-black/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
