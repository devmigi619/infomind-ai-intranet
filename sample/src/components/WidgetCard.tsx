import { motion } from 'framer-motion';
import type { WidgetData, QuickAction, PanelType } from '@/types';
import {
  Mail,
  FileText,
  Calendar,
  ClipboardCheck,
  FolderOpen,
  Users,
} from 'lucide-react';

interface WidgetCardProps {
  widget: WidgetData;
  quickActions?: QuickAction[];
  onOpenPanel: (panel: PanelType) => void;
}

const panelIcons: Record<string, React.ElementType> = {
  mail: Mail,
  board: FileText,
  calendar: Calendar,
  approval: ClipboardCheck,
  drive: FolderOpen,
  contacts: Users,
};

export function WidgetCard({ widget, quickActions, onOpenPanel }: WidgetCardProps) {
  const Icon = widget.type ? panelIcons[widget.type] || FileText : FileText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="mt-3 mb-1"
    >
      {/* Widget Card */}
      <div
        className="bg-white rounded-md p-4 cursor-pointer hover:shadow-card transition-shadow duration-200"
        style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}
        onClick={() => widget.type && onOpenPanel(widget.type)}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Icon size={18} className="text-[#0A2463]" />
          <span className="text-module-heading text-[#0A2463]">{widget.title}</span>
        </div>

        {/* Items */}
        <div className="space-y-2">
          {widget.items.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-small text-black">{item.label}</span>
              {item.value && (
                <span className="text-micro text-mori-muted">{item.value}</span>
              )}
            </div>
          ))}
        </div>

        {/* View More Link */}
        <div className="mt-3 pt-2" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <span className="text-small text-[#0A2463] hover:underline">
            자세히 보기 &rarr;
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      {quickActions && quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                if (action.action.startsWith('open-')) {
                  const panel = action.action.replace('open-', '') as PanelType;
                  onOpenPanel(panel);
                }
              }}
              className="px-3.5 py-1.5 border rounded-full text-small text-mori-body hover:border-[#0A2463] hover:text-[#0A2463] transition-all duration-200 cursor-pointer bg-white"
              style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
