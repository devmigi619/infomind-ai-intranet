import { useState } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { demoApprovals } from '@/data/demo-data';
import type { ApprovalItem } from '@/types';

const statusTabs = ['대기중', '진행중', '완료', '반려'];

const statusMap: Record<string, ApprovalItem['status']> = {
  '대기중': 'pending', '진행중': 'progress', '완료': 'completed', '반려': 'rejected',
};

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '대기중', color: '#0A2463' },
  progress: { text: '진행중', color: '#1E88E5' },
  completed: { text: '완료', color: '#43A047' },
  rejected: { text: '반려', color: '#E53935' },
};

function ApprovalDetail({ item, onBack }: { item: ApprovalItem; onBack: () => void }) {
  return (
    <div className="p-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-small text-mori-body hover:text-[#0A2463] transition-colors mb-4">
        <ArrowLeft size={16} />목록으로
      </button>
      <span className="inline-block text-micro px-2 py-0.5 rounded mb-3" style={{ background: 'rgba(10, 36, 99, 0.08)', color: '#0A2463' }}>{item.type}</span>
      <h2 className="text-panel-title text-black mb-3">{item.title}</h2>
      <div className="space-y-3 mb-6 pb-6" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
        <div className="flex gap-4">
          <span className="text-small text-mori-muted w-16">요청자</span>
          <span className="text-small text-black">{item.requester}</span>
        </div>
        <div className="flex gap-4">
          <span className="text-small text-mori-muted w-16">요청일</span>
          <span className="text-small text-black">{item.date}</span>
        </div>
        <div className="flex gap-4">
          <span className="text-small text-mori-muted w-16">상태</span>
          <span className="text-small font-medium" style={{ color: statusLabels[item.status].color }}>{statusLabels[item.status].text}</span>
        </div>
      </div>
      <p className="text-small text-mori-muted">문서 내용은 준비 중입니다.</p>
    </div>
  );
}

export function ApprovalMainPage() {
  const [activeTab, setActiveTab] = useState('대기중');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);

  const targetStatus = statusMap[activeTab];
  const filtered = demoApprovals.filter((a) => {
    const matchStatus = a.status === targetStatus;
    const matchSearch = !searchQuery || a.title.includes(searchQuery) || a.requester.includes(searchQuery);
    return matchStatus && matchSearch;
  });

  if (selectedItem) return <ApprovalDetail item={selectedItem} onBack={() => setSelectedItem(null)} />;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-panel-title text-black">전자결재</h2>
        <span className="text-small text-mori-muted">총 {demoApprovals.length}건</span>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/[0.35]" />
        <input type="text" placeholder="제목, 요청자 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-9 pl-9 pr-3 text-small bg-[#F9F9F9] rounded-lg outline-none border border-transparent focus:border-[rgba(10,36,99,0.2)] transition-colors" />
      </div>

      <div className="flex gap-4 mb-4" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
        {statusTabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="pb-2 text-small transition-colors duration-200 relative" style={{ color: activeTab === tab ? '#0A2463' : 'rgba(0, 0, 0, 0.35)', fontWeight: activeTab === tab ? 400 : 300 }}>
            {tab}
            {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0A2463] rounded-t-full" />}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((item) => {
          const statusInfo = statusLabels[item.status];
          return (
            <button key={item.id} onClick={() => setSelectedItem(item)} className="w-full text-left bg-white rounded-md p-4 transition-all" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-micro px-2 py-0.5 rounded" style={{ background: 'rgba(10, 36, 99, 0.06)', color: '#0A2463' }}>{item.type}</span>
                <span className="text-micro" style={{ color: statusInfo.color }}>{statusInfo.text}</span>
              </div>
              <p className="text-small text-black">{item.title}</p>
              <p className="text-small text-mori-body">{item.requester} · 요청일 {item.date}</p>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="text-small text-mori-muted text-center py-8">해당 상태의 결재 문서가 없습니다</p>}
      </div>
    </div>
  );
}
