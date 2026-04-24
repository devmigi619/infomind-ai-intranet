import { useState } from 'react';
import { Search, Award, Download, Clock, CheckCircle2 } from 'lucide-react';
import { demoCertificateTypes } from '@/data/demo-data';

export function CertificatePanel() {
  const [search, setSearch] = useState('');

  const filtered = demoCertificateTypes.filter(
    (c) => !search || c.name.includes(search) || c.description.includes(search)
  );

  return (
    <div className="p-6">
      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/[0.35]" />
        <input
          type="text"
          placeholder="증명서 이름으로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 text-small bg-[#F9F9F9] rounded-lg outline-none border border-transparent focus:border-[rgba(10,36,99,0.2)] transition-colors"
        />
      </div>

      {/* Certificate Types */}
      <div className="space-y-3">
        {filtered.map((cert) => (
          <div
            key={cert.id}
            className="bg-white rounded-md p-4"
            style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(10, 36, 99, 0.06)' }}
              >
                <Award size={20} className="text-[#0A2463]" />
              </div>
              <div className="flex-1">
                <h4 className="text-small text-black font-medium">{cert.name}</h4>
                <p className="text-small text-mori-body mt-0.5">{cert.description}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Clock size={12} className="text-mori-muted" />
                  <span className="text-micro text-mori-muted">{cert.processingTime}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              <button
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-small text-white transition-opacity hover:opacity-90"
                style={{ background: '#0A2463' }}
              >
                <Download size={14} />
                발급 신청
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Requests */}
      <div className="mt-6">
        <h3 className="text-module-heading text-black mb-3">최근 발급 내역</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3 py-2">
            <CheckCircle2 size={14} className="text-[#43A047] flex-shrink-0" />
            <span className="text-small text-black">재직증명서</span>
            <span className="text-micro text-mori-muted ml-auto">6/5 발급완료</span>
          </div>
        </div>
      </div>
    </div>
  );
}
