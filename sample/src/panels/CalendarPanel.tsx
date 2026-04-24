import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import { demoCalendarEvents } from '@/data/demo-data';

export function CalendarPanel() {
  const [currentDate, setCurrentDate] = useState(dayjs());

  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');
  const startOfCalendar = startOfMonth.startOf('week');
  const endOfCalendar = endOfMonth.endOf('week');

  const days: dayjs.Dayjs[] = [];
  let day = startOfCalendar;
  while (day.isBefore(endOfCalendar) || day.isSame(endOfCalendar, 'day')) {
    days.push(day);
    day = day.add(1, 'day');
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const today = dayjs();

  return (
    <div className="p-6">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentDate(currentDate.subtract(1, 'month'))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors"
        >
          <ChevronLeft size={20} className="text-black/[0.35]" />
        </button>
        <span className="text-panel-title text-black">
          {currentDate.format('YYYY년 M월')}
        </span>
        <button
          onClick={() => setCurrentDate(currentDate.add(1, 'month'))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors"
        >
          <ChevronRight size={20} className="text-black/[0.35]" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((wd) => (
          <div key={wd} className="text-center text-micro text-mori-muted py-2">
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
        {days.map((d, i) => {
          const isCurrentMonth = d.month() === currentDate.month();
          const isToday = d.isSame(today, 'day');
          const hasEvent = isCurrentMonth && d.date() === today.date();

          return (
            <div
              key={i}
              className="h-9 flex flex-col items-center justify-center relative"
              style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.04)' }}
            >
              <span
                className="text-body w-7 h-7 flex items-center justify-center rounded-full"
                style={{
                  color: isToday ? '#FFFFFF' : isCurrentMonth ? '#000000' : 'rgba(0, 0, 0, 0.2)',
                  background: isToday ? '#0A2463' : 'transparent',
                  fontWeight: isToday ? 500 : 300,
                }}
              >
                {d.date()}
              </span>
              {hasEvent && !isToday && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#0A2463]" />
              )}
            </div>
          );
        })}
      </div>

      {/* Today's Events */}
      <div className="mt-8">
        <h3 className="text-module-heading text-black mb-4">오늘의 일정</h3>
        <div className="space-y-3">
          {demoCalendarEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 rounded-md hover:bg-black/[0.02] transition-colors cursor-pointer"
            >
              <span className="text-small text-[#0A2463] font-medium flex-shrink-0 w-12">
                {event.time}
              </span>
              <div>
                <p className="text-small text-black">{event.title}</p>
                <p className="text-small text-mori-body">{event.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
