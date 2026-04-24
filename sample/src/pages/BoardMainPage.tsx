import { useState } from 'react';
import { Search, ArrowLeft, Eye, MessageCircle } from 'lucide-react';
import { demoBoardPosts } from '@/data/demo-data';
import type { BoardPost } from '@/types';

const categories = ['전체', '공지사항', '경조사', '자유게시판', '기술블로그'];

/* ===================== POST DETAIL ===================== */

function PostDetail({ post, onBack }: { post: BoardPost; onBack: () => void }) {
  return (
    <div className="p-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-small text-mori-body hover:text-[#0A2463] transition-colors mb-4">
        <ArrowLeft size={16} />
        목록으로
      </button>

      <span className="inline-block text-micro px-2 py-0.5 rounded mb-3" style={{ background: 'rgba(10, 36, 99, 0.08)', color: '#0A2463' }}>
        {post.category}
      </span>

      <h2 className="text-panel-title text-black mb-3">{post.title}</h2>

      <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-micro font-medium" style={{ background: 'linear-gradient(135deg, #0A2463, #1E88E5)' }}>
          {post.author.charAt(0)}
        </div>
        <div>
          <p className="text-small text-black">{post.author}</p>
          <p className="text-micro text-mori-muted">{post.date}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1 text-micro text-mori-muted"><Eye size={12} />{post.views.toLocaleString()}</span>
          <span className="flex items-center gap-1 text-micro text-mori-muted"><MessageCircle size={12} />{post.comments}</span>
        </div>
      </div>

      <div className="text-body text-black leading-relaxed">
        <p>{post.content || '내용을 준비 중입니다.'}</p>
      </div>

      <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
        <h4 className="text-small font-medium text-black mb-3">댓글 {post.comments}개</h4>
        <p className="text-small text-mori-muted">댓글 기능은 준비 중입니다.</p>
      </div>
    </div>
  );
}

/* ===================== BOARD MAIN PAGE ===================== */

export function BoardMainPage() {
  const [activeCategory, setActiveCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<BoardPost | null>(null);

  const filteredPosts = demoBoardPosts.filter((post) => {
    const matchCategory = activeCategory === '전체' || post.category === activeCategory;
    const matchSearch = !searchQuery || post.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  if (selectedPost) {
    return <PostDetail post={selectedPost} onBack={() => setSelectedPost(null)} />;
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-panel-title text-black">게시판</h2>
        <span className="text-small text-mori-muted">총 {demoBoardPosts.length}개 게시글</span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/[0.35]" />
        <input type="text" placeholder="게시글 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-9 pl-9 pr-3 text-small bg-[#F9F9F9] rounded-lg outline-none border border-transparent focus:border-[rgba(10,36,99,0.2)] transition-colors" />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className="px-3 py-1.5 rounded-full text-micro transition-all duration-200" style={{ background: activeCategory === cat ? '#0A2463' : 'transparent', color: activeCategory === cat ? '#FFFFFF' : 'rgba(0, 0, 0, 0.55)', border: activeCategory === cat ? 'none' : '1px solid rgba(0, 0, 0, 0.12)' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-2">
        {filteredPosts.map((post) => (
          <button key={post.id} onClick={() => setSelectedPost(post)} className="w-full text-left bg-[#F9F9F9] rounded-md p-4 hover:shadow-card transition-all duration-200">
            <span className="inline-block text-micro px-2 py-0.5 rounded" style={{ background: 'rgba(10, 36, 99, 0.08)', color: '#0A2463' }}>{post.category}</span>
            <p className="text-small text-black mt-1.5">{post.title}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-small text-mori-body">{post.author} · {post.date}</span>
              <span className="text-micro text-mori-muted">조회 {post.views.toLocaleString()} · 댓글 {post.comments}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
