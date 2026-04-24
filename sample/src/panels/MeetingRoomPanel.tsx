import { useState } from 'react';
import { Monitor, Tv, Mic, Presentation, Clock } from 'lucide-react';
import { demoMeetingRooms, demoRoomReservations } from '@/data/demo-data';

const facilityIcons: Record<string, React.ElementType> = {
  프로젝터: Presentation,
  화이트보드: Monitor,
  영상회의: Monitor,
  TV: Tv,
  마이크: Mic,
};

export function MeetingRoomPanel() {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const todayReservations = demoRoomReservations.filter(
    (r) => r.date === '2025-06-10'
  );

  return (
    <div className="p-6">
      {/* Room Grid */}
      <div className="grid grid-cols-1 gap-3 mb-6">
        {demoMeetingRooms.map((room) => {
          const isSelected = selectedRoom === room.id;
          const roomReservations = todayReservations.filter(
            (r) => r.roomId === room.id
          );
          const isOccupied = roomReservations.length > 0;

          return (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(isSelected ? null : room.id)}
              className="bg-white rounded-md p-4 text-left transition-all duration-200"
              style={{
                border: isSelected
                  ? '1px solid #0A2463'
                  : '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: isSelected ? '0 0 0 2px rgba(10, 36, 99, 0.08)' : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-small text-black font-medium">
                    {room.name}
                  </span>
                  <span className="text-micro text-mori-muted ml-2">
                    {room.capacity}인
                  </span>
                </div>
                {isOccupied ? (
                  <span className="text-micro px-2 py-0.5 rounded-full" style={{ background: 'rgba(10, 36, 99, 0.08)', color: '#0A2463' }}>
                    예약됨
                  </span>
                ) : (
                  <span className="text-micro px-2 py-0.5 rounded-full" style={{ background: 'rgba(67, 160, 71, 0.08)', color: '#43A047' }}>
                    사용 가능
                  </span>
                )}
              </div>

              {/* Facilities */}
              <div className="flex flex-wrap gap-1.5">
                {room.facilities.map((f) => {
                  const FIcon = facilityIcons[f] || Monitor;
                  return (
                    <span
                      key={f}
                      className="flex items-center gap-1 text-micro px-2 py-0.5 rounded"
                      style={{ background: 'rgba(0, 0, 0, 0.04)', color: 'rgba(0, 0, 0, 0.55)' }}
                    >
                      <FIcon size={10} />
                      {f}
                    </span>
                  );
                })}
              </div>

              {/* Reservations for this room */}
              {isSelected && roomReservations.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
                  <p className="text-micro text-mori-muted mb-1.5">오늘의 예약</p>
                  {roomReservations.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 py-1">
                      <Clock size={12} className="text-[#0A2463]" />
                      <span className="text-micro text-[#0A2463] font-medium">{r.timeRange}</span>
                      <span className="text-micro text-black">{r.title}</span>
                      <span className="text-micro text-mori-muted">· {r.booker}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Today Summary */}
      <div>
        <h3 className="text-module-heading text-black mb-3">오늘의 전체 예약</h3>
        {todayReservations.length > 0 ? (
          <div className="space-y-2">
            {todayReservations.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-2">
                <span className="text-micro text-[#0A2463] font-medium w-24 flex-shrink-0">
                  {r.timeRange}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-small text-black truncate">{r.title}</p>
                  <p className="text-micro text-mori-muted">
                    {r.roomName} · {r.booker}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-small text-mori-muted">오늘의 예약이 없습니다</p>
        )}
      </div>
    </div>
  );
}
