import { useState, useRef, useEffect } from 'react';
import { Bell, Search, LayoutDashboard, X } from 'lucide-react';

interface TopHeaderProps {
  onBrandClick: () => void;
  onToggleRightPanel?: () => void;
  isRightPanelOpen?: boolean;
  onSearch?: (query: string) => void;
  onToggleMobileResult?: () => void;
  showMobileResultButton?: boolean;
}

export function TopHeader({
  onBrandClick,
  onToggleRightPanel,
  isRightPanelOpen,
  onSearch,
  onToggleMobileResult,
  showMobileResultButton,
}: TopHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 h-12 bg-white z-[100] flex items-center justify-between px-4 lg:px-5"
      style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}
    >
      {/* Left: Brand */}
      <button
        onClick={onBrandClick}
        className="text-lg font-normal tracking-[0.12em] text-black hover:opacity-60 transition-opacity duration-200 cursor-pointer bg-transparent border-none shrink-0"
        style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
      >
        Infomind
      </button>

      {/* Center: Search Bar (Desktop) */}
      <div className="hidden lg:flex flex-1 justify-center max-w-md mx-4">
        {searchOpen ? (
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색어를 입력하세요 (이름, 업무, 규정...)"
              className="w-full h-8 pl-3 pr-8 text-small bg-[#F9F9F9] rounded-lg outline-none border border-transparent focus:border-[rgba(10,36,99,0.2)] transition-colors"
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X size={14} className="text-mori-muted" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full h-8 flex items-center gap-2 px-3 bg-[#F9F9F9] rounded-lg text-micro text-mori-muted hover:bg-black/[0.04] transition-colors"
          >
            <Search size={14} />
            <span>검색어를 입력하세요...</span>
          </button>
        )}
      </div>

      {/* Mobile: Search icon */}
      <div className="flex lg:hidden items-center gap-1">
        {searchOpen ? (
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색..."
              className="h-8 w-40 px-2 text-small bg-[#F9F9F9] rounded-lg outline-none border border-transparent focus:border-[rgba(10,36,99,0.2)]"
            />
            <button type="button" onClick={() => setSearchOpen(false)}>
              <X size={18} className="text-mori-muted" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors"
          >
            <Search size={18} className="text-black/[0.55]" />
          </button>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Mobile: Conversation Result Button */}
        {showMobileResultButton && onToggleMobileResult && !searchOpen && (
          <button
            onClick={onToggleMobileResult}
            className="lg:hidden h-7 px-2.5 rounded-md text-micro text-[#0A2463] transition-colors"
            style={{ background: 'rgba(10, 36, 99, 0.08)' }}
          >
            대화결과
          </button>
        )}

        {/* Right Panel Toggle */}
        {onToggleRightPanel && !searchOpen && (
          <button
            onClick={onToggleRightPanel}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors"
            title={isRightPanelOpen ? '패널 닫기' : '패널 열기'}
          >
            <LayoutDashboard
              size={18}
              style={{
                color: isRightPanelOpen ? '#0A2463' : 'rgba(0, 0, 0, 0.35)',
              }}
            />
          </button>
        )}

        {/* Notification */}
        {!searchOpen && (
          <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors">
            <Bell size={18} className="text-black/[0.55]" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#E53935]" />
          </button>
        )}

        {/* Avatar */}
        {!searchOpen && (
          <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors">
            <div
              className="w-7 h-7 rounded-full"
              style={{ background: 'linear-gradient(135deg, #0A2463, #1E88E5)' }}
            />
          </button>
        )}
      </div>
    </header>
  );
}
