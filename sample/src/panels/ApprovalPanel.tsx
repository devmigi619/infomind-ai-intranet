import { useState } from 'react';
import { demoApprovals } from '@/data/demo-data';
import type { ApprovalItem } from '@/types';

const statusTabs = ['대기중', '진행중', '완료', '반려'];

const statusMap: Record<string, ApprovalItem['status']> = {
  '대기중': 'pending',
  '진행중': 'progress',
  '완료': 'completed',
  '반려': 'rejected',
};

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '대기중', color: '#0A2463' },
  progress: { text: '진행중', color: '#1E88E5' },
  completed: { text: '완료', color: '#43A047' },
  rejected: { text: '반려', color: '#E53935' },
};

export function ApprovalPanel() {
  const [activeTab, setActiveTab] = useState('대기중');
  const [approvals, setApprovals] = useState(demoApprovals);

  const targetStatus = statusMap[activeTab];
  const filtered = approvals.filter((a) => a.status === targetStatus);

  const handleApprove = (id: string) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'completed' as const } : a))
    );
  };

  const handleReject = (id: string) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'rejected' as const } : a))
    );
  };

  return (
    <div className="p-6">
      {/* Status Tabs */}
      <div className="flex gap-4 mb-6" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="pb-2 text-small transition-colors duration-200 relative"
            style={{
              color: activeTab === tab ? '#0A2463' : 'rgba(0, 0, 0, 0.35)',
              fontWeight: activeTab === tab ? 400 : 300,
            }}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0A2463] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Approval Cards */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const statusInfo = statusLabels[item.status];
          const isPending = item.status === 'pending';

          return (
            <div
              key={item.id}
              className="bg-white rounded-md p-4"
              style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}
            >
              {/* Top Row: Type + Status */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-micro px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(10, 36, 99, 0.06)',
                    color: '#0A2463',
                  }}
                >
                  {item.type}
                </span>
                <span className="text-micro" style={{ color: statusInfo.color }}>
                  {statusInfo.text}
                </span>
              </div>

              {/* Title */}
              <p className="text-small text-black mb-1">{item.title}</p>

              {/* Requester + Date */}
              <p className="text-small text-mori-body">
                {item.requester} · 요청일 {item.date}
              </p>

              {/* Action Buttons (pending only) */}
              {isPending && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="px-4 py-1.5 rounded-md text-small text-white transition-opacity duration-200 hover:opacity-90"
                    style={{ background: '#0A2463' }}
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    className="px-4 py-1.5 rounded-md text-small transition-colors duration-200 hover:bg-black/[0.04]"
                    style={{
                      border: '1px solid rgba(0, 0, 0, 0.15)',
                      color: 'rgba(0, 0, 0, 0.55)',
                    }}
                  >
                    반려
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-small text-mori-muted">해당 상태의 결재 문서가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
