import { Search } from 'lucide-react';
import { demoBoardPosts, demoApprovals, demoWeeklyReports, demoCalendarEvents, demoVehicleReservations, demoRoomReservations } from '@/data/demo-data';

interface SearchResultPageProps {
  query: string;
}

export function SearchResultPage({ query }: SearchResultPageProps) {
  if (!query) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <Search size={32} className="text-black/[0.15] mb-3" />
        <p className="text-small text-mori-muted">검색어를 입력하세요</p>
        <p className="text-micro text-mori-muted mt-1">이름, 업무, 제목, 규정 등으로 검색할 수 있습니다</p>
      </div>
    );
  }

  const q = query.toLowerCase();

  // Search across ALL data
  const boardResults = demoBoardPosts.filter(
    (p) => p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q) || (p.content && p.content.toLowerCase().includes(q))
  );
  const approvalResults = demoApprovals.filter(
    (a) => a.title.toLowerCase().includes(q) || a.requester.toLowerCase().includes(q) || a.type.toLowerCase().includes(q)
  );
  const reportResults = demoWeeklyReports.filter(
    (r) => r.author.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q) || r.department.toLowerCase().includes(q)
  );
  const eventResults = demoCalendarEvents.filter(
    (e) => e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q)
  );
  const vehicleResults = demoVehicleReservations.filter(
    (v) => v.vehicleName.toLowerCase().includes(q) || v.reserver.toLowerCase().includes(q) || v.purpose.toLowerCase().includes(q)
  );
  const roomResults = demoRoomReservations.filter(
    (r) => r.title.toLowerCase().includes(q) || r.roomName.toLowerCase().includes(q) || r.booker.toLowerCase().includes(q)
  );

  const totalResults = boardResults.length + approvalResults.length + reportResults.length + eventResults.length + vehicleResults.length + roomResults.length;

  if (totalResults === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <Search size={32} className="text-black/[0.15] mb-3" />
        <p className="text-small text-mori-muted">"{query}"에 대한 검색 결과가 없습니다</p>
        <p className="text-micro text-mori-muted mt-1">다른 키워드로 검색해보세요</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Search size={18} className="text-[#0A2463]" />
        <h2 className="text-panel-title text-black">"{query}" 검색 결과</h2>
        <span className="text-small text-mori-muted">총 {totalResults}건</span>
      </div>

      {/* Board Results */}
      {boardResults.length > 0 && (
        <section className="mb-6">
          <h3 className="text-module-heading text-black mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#0A2463] rounded-full" />
            게시판 <span className="text-small text-mori-muted font-normal">({boardResults.length})</span>
          </h3>
          <div className="space-y-2">
            {boardResults.map((p) => (
              <div key={p.id} className="p-3 bg-white rounded-md" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <span className="text-micro px-1.5 py-0.5 rounded" style={{ background: 'rgba(10, 36, 99, 0.08)', color: '#0A2463' }}>{p.category}</span>
                <p className="text-small text-black mt-1">{p.title}</p>
                <p className="text-micro text-mori-muted">{p.author} · {p.date} · 조회 {p.views.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Approval Results */}
      {approvalResults.length > 0 && (
        <section className="mb-6">
          <h3 className="text-module-heading text-black mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#43A047] rounded-full" />
            전자결재 <span className="text-small text-mori-muted font-normal">({approvalResults.length})</span>
          </h3>
          <div className="space-y-2">
            {approvalResults.map((a) => (
              <div key={a.id} className="p-3 bg-white rounded-md" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <p className="text-small text-black">{a.title}</p>
                <p className="text-micro text-mori-muted">{a.requester} · {a.type} · {a.date}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Weekly Report Results */}
      {reportResults.length > 0 && (
        <section className="mb-6">
          <h3 className="text-module-heading text-black mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#1E88E5] rounded-full" />
            주간보고 <span className="text-small text-mori-muted font-normal">({reportResults.length})</span>
          </h3>
          <div className="space-y-2">
            {reportResults.map((r) => (
              <div key={r.id} className="p-3 bg-white rounded-md" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <p className="text-small text-black">{r.author} ({r.department})</p>
                <p className="text-micro text-mori-muted">{r.summary}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Calendar Results */}
      {eventResults.length > 0 && (
        <section className="mb-6">
          <h3 className="text-module-heading text-black mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#FB8C00] rounded-full" />
            일정 <span className="text-small text-mori-muted font-normal">({eventResults.length})</span>
          </h3>
          <div className="space-y-2">
            {eventResults.map((e) => (
              <div key={e.id} className="p-3 bg-white rounded-md" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <p className="text-small text-black">{e.title}</p>
                <p className="text-micro text-mori-muted">{e.time} · {e.location}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Vehicle Results */}
      {vehicleResults.length > 0 && (
        <section className="mb-6">
          <h3 className="text-module-heading text-black mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#E53935] rounded-full" />
            차량예약 <span className="text-small text-mori-muted font-normal">({vehicleResults.length})</span>
          </h3>
          <div className="space-y-2">
            {vehicleResults.map((v) => (
              <div key={v.id} className="p-3 bg-white rounded-md" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <p className="text-small text-black">{v.vehicleName}</p>
                <p className="text-micro text-mori-muted">{v.date} {v.timeRange} · {v.purpose} · {v.reserver}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Meeting Room Results */}
      {roomResults.length > 0 && (
        <section className="mb-6">
          <h3 className="text-module-heading text-black mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#9C27B0] rounded-full" />
            회의실예약 <span className="text-small text-mori-muted font-normal">({roomResults.length})</span>
          </h3>
          <div className="space-y-2">
            {roomResults.map((r) => (
              <div key={r.id} className="p-3 bg-white rounded-md" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <p className="text-small text-black">{r.title}</p>
                <p className="text-micro text-mori-muted">{r.roomName} · {r.date} {r.timeRange} · {r.booker}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
