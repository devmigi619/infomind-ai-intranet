import { useState } from 'react';
import { Search, BarChart3, CheckCircle2, Circle } from 'lucide-react';
import { demoWeeklyReports } from '@/data/demo-data';

const departments = ['전체 부서', '개발팀', '디자인팀', '마케팅팀', '영업팀'];

export function WeeklyReportMainPage() {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('전체 부서');

  const filtered = demoWeeklyReports.filter((r) => {
    const matchDept = selectedDept === '전체 부서' || r.department === selectedDept;
    const matchSearch = !search || r.author.includes(search) || r.summary.includes(search);
    return matchDept && matchSearch;
  });

  const submittedCount = filtered.filter((r) => r.status === 'submitted').length;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-panel-title text-black">주간보고</h2>
        <span className="text-small text-mori-muted">6월 2주차</span>
      </div>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/[0.35]" />
        <input type="text" placeholder="작성자, 내용 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-9 pl-9 pr-3 text-small bg-[#F9F9F9] rounded-lg outline-none border border-transparent focus:border-[rgba(10,36,99,0.2)] transition-colors" />
      </div>

      <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="w-full h-9 px-3 text-small bg-white rounded-md outline-none mb-4 cursor-pointer" style={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
        {departments.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>

      <div className="flex items-center gap-2 mb-4 px-1">
        <BarChart3 size={16} className="text-[#0A2463]" />
        <span className="text-small text-black">제출 현황: <strong>{submittedCount}/{filtered.length}</strong></span>
      </div>

      <div className="space-y-3">
        {filtered.map((report) => (
          <div key={report.id} className="bg-white rounded-md p-4" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-small text-black font-medium">{report.author}</span>
                  <span className="text-micro text-mori-muted">{report.department}</span>
                </div>
                <p className="text-small text-black">{report.summary}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-micro text-mori-muted">{report.week}</span>
                  {report.submittedAt && <span className="text-micro text-mori-muted">제출: {report.submittedAt}</span>}
                </div>
              </div>
              {report.status === 'submitted' ? <CheckCircle2 size={18} className="text-[#43A047]" /> : <Circle size={18} className="text-[#FB8C00]" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
