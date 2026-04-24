import { X } from 'lucide-react';
import type { PanelType } from '@/types';
import {
  FileText,
  ClipboardCheck,
  BarChart3,
  Award,
  Car,
  CalendarDays,
  Calendar,
} from 'lucide-react';

interface PanelHeaderProps {
  panelType: PanelType;
  onClose: () => void;
}

const panelConfig: Record<string, { icon: React.ElementType; title: string }> = {
  board: { icon: FileText, title: '게시판' },
  approval: { icon: ClipboardCheck, title: '전자결재' },
  weeklyReport: { icon: BarChart3, title: '주간보고' },
  certificate: { icon: Award, title: '증명서 출력' },
  vehicle: { icon: Car, title: '차량예약관리' },
  meetingRoom: { icon: CalendarDays, title: '회의실예약' },
  calendar: { icon: Calendar, title: '캘린더 및 일정관리' },
};

export function PanelHeader({ panelType, onClose }: PanelHeaderProps) {
  const config = panelType ? panelConfig[panelType] : null;
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className="h-14 flex items-center justify-between px-6 shrink-0"
      style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}
    >
      <div className="flex items-center gap-2.5">
        <Icon size={20} className="text-[#0A2463]" />
        <span className="text-panel-title text-black">{config.title}</span>
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors duration-200"
      >
        <X size={20} className="text-black/[0.35] hover:text-black transition-colors" />
      </button>
    </div>
  );
}
