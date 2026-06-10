import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { HStack } from '../../../shared/components/ui/hstack';
import { VStack } from '../../../shared/components/ui/vstack';
import { ArrowRight, X } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useUiStore } from '../../../store/uiStore';
import { spacing } from '../../../shared/constants/spacing';
import { radius } from '../../../shared/constants/radius';
import { fontSize, fontWeight } from '../../../shared/constants/typography';
import {
  useBoards,
  useBoardPosts,
  usePostDetail,
  usePostComments,
  type Board,
  type Post,
} from '../api';

const fontFamily = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

interface BoardQuickPanelProps {
  onClose: () => void;
}

type LpMode = 'list' | 'detail';

function isNoticeBoard(b: Board): boolean {
  return b.brdSe === 'NOTICE' || b.brdNm === '공지사항';
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return iso.replace('T', ' ').slice(0, 16);
}

/**
 * LP — 게시판 퀵뷰
 * - list: 공지사항 게시판의 NTC 2 + 일반 3 최대 5개
 * - detail: LP 전체가 그 글 상세로 교체 (LP 내부 토글)
 * - 열기 버튼은 LeftPanel 표준 (헤더 우측 ArrowRight 액션)을 그대로 재현
 */
export function BoardQuickPanel({ onClose }: BoardQuickPanelProps) {
  const theme = useTheme();
  const setActiveFullScreen = useUiStore((s) => s.setActiveFullScreen);
  const setBoardLpHandoff = useUiStore((s) => s.setBoardLpHandoff);
  const closeLeftPanel = useUiStore((s) => s.closeLeftPanel);

  const [lpMode, setLpMode] = useState<LpMode>('list');
  const [selectedPstSn, setSelectedPstSn] = useState<number | null>(null);

  const { data: boards = [], isLoading: boardsLoading } = useBoards();
  const noticeBoard = boards.find(isNoticeBoard);

  const { data: posts = [], isLoading: postsLoading } = useBoardPosts(noticeBoard?.brdId);

  // NTC=Y 2개 + 일반 3개, 총 최대 5개
  const previewPosts = useMemo<Post[]>(() => {
    const notice = posts.filter((p) => p.ntcYn === 'Y').slice(0, 2);
    const normal = posts.filter((p) => p.ntcYn !== 'Y').slice(0, 3);
    return [...notice, ...normal].slice(0, 5);
  }, [posts]);

  const handleOpenFull = () => {
    if (!noticeBoard) {
      // 공지 게시판이 없으면 그냥 board 풀뷰 진입
      closeLeftPanel();
      setActiveFullScreen('board');
      return;
    }
    setBoardLpHandoff({
      brdId: noticeBoard.brdId,
      pstSn: lpMode === 'detail' && selectedPstSn != null ? selectedPstSn : undefined,
    });
    closeLeftPanel();
    setActiveFullScreen('board');
  };

  const isLoading = boardsLoading || postsLoading;

  // ─── LP — Detail 모드 ────────────────────────────────────────────
  if (lpMode === 'detail' && noticeBoard && selectedPstSn != null) {
    return (
      <LpPostDetail
        brdId={noticeBoard.brdId}
        pstSn={selectedPstSn}
        onBack={() => {
          setLpMode('list');
          setSelectedPstSn(null);
        }}
        onClose={onClose}
        onOpenFull={handleOpenFull}
      />
    );
  }

  // ─── LP — List 모드 ──────────────────────────────────────────────
  return (
    <View className="flex-1">
      <HStack style={{ borderBottomColor: theme.border.subtle }} className="items-center justify-between px-4 py-3 border-b">
        <Text style={{ color: theme.text.primary }} className="text-[14px] font-medium">게시판</Text>
        <HStack className="items-center gap-1">
          <TouchableOpacity
            onPress={handleOpenFull}
            style={{ backgroundColor: theme.brand.primaryTint }}
            className="flex-row items-center gap-1 px-3 py-1.5 rounded-md"
            activeOpacity={0.7}
          >
            <Text style={{ color: theme.brand.primary }} className="text-[11px] font-medium">열기</Text>
            <ArrowRight size={12} color={theme.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} className="w-7 h-7 items-center justify-center rounded-md" activeOpacity={0.7}>
            <X size={14} color={theme.text.muted} />
          </TouchableOpacity>
        </HStack>
      </HStack>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: theme.text.subtle }} className="text-[10px] font-semibold uppercase tracking-wider mt-2 mb-1 mx-1">
          공지사항
        </Text>

        {isLoading ? (
          <View className="p-8 items-center justify-center">
            <ActivityIndicator color={theme.brand.primary} size="small" />
          </View>
        ) : !noticeBoard ? (
          <Text style={{ color: theme.text.muted }} className="text-[13px] text-center p-4">
            공지사항 게시판이 없습니다.
          </Text>
        ) : previewPosts.length === 0 ? (
          <Text style={{ color: theme.text.muted }} className="text-[13px] text-center p-4">
            최근 공지 없음
          </Text>
        ) : (
          previewPosts.map((p) => (
            <TouchableOpacity
              key={`${p.brdId}-${p.pstSn}`}
              onPress={() => {
                setSelectedPstSn(p.pstSn);
                setLpMode('detail');
              }}
              activeOpacity={0.7}
              style={{
                backgroundColor: theme.bg.surfaceAlt,
                borderColor: theme.border.subtle,
              }}
              className="p-3.5 rounded-xl border mb-2"
            >
              <HStack className="items-center gap-1.5 mb-1">
                {p.ntcYn === 'Y' && (
                  <Text className="text-[13px]">
                    📌
                  </Text>
                )}
                <Text
                  style={{ color: theme.text.primary }}
                  className="flex-1 text-[13px] font-medium"
                  numberOfLines={1}
                >
                  {p.pstTtl}
                </Text>
              </HStack>
              <Text style={{ color: theme.text.muted }} className="text-[11px]" numberOfLines={1}>
                {p.userId} · {formatDate(p.crtAt)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
// LP 내부 — 글 상세
// ─────────────────────────────────────────────────────────────────────
interface LpPostDetailProps {
  brdId: string;
  pstSn: number;
  onBack: () => void;
  onClose: () => void;
  onOpenFull: () => void;
}

function LpPostDetail({ brdId, pstSn, onBack, onClose, onOpenFull }: LpPostDetailProps) {
  const theme = useTheme();
  const { data: post, isLoading, error } = usePostDetail(brdId, pstSn);
  const { data: comments = [] } = usePostComments(brdId, pstSn);

  return (
    <View className="flex-1">
      <HStack style={{ borderBottomColor: theme.border.subtle }} className="items-center justify-between px-4 py-3 border-b">
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={{ color: theme.brand.primary }} className="text-[13px] font-medium">← 목록</Text>
        </TouchableOpacity>
        <HStack className="items-center gap-1">
          <TouchableOpacity
            onPress={onOpenFull}
            style={{ backgroundColor: theme.brand.primaryTint }}
            className="flex-row items-center gap-1 px-3 py-1.5 rounded-md"
            activeOpacity={0.7}
          >
            <Text style={{ color: theme.brand.primary }} className="text-[11px] font-medium">열기</Text>
            <ArrowRight size={12} color={theme.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} className="w-7 h-7 items-center justify-center rounded-md" activeOpacity={0.7}>
            <X size={14} color={theme.text.muted} />
          </TouchableOpacity>
        </HStack>
      </HStack>
      {isLoading ? (
        <View className="p-8 items-center justify-center">
          <ActivityIndicator color={theme.brand.primary} size="small" />
        </View>
      ) : error || !post ? (
        <View className="p-8 items-center justify-center">
          <Text style={{ color: theme.semantic.danger }} className="text-[13px] text-center">
            글을 불러오지 못했습니다.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
          <VStack className="gap-1.5 mb-4 pb-4">
            {post.ntcYn === 'Y' && (
              <View className="self-start bg-red-600 px-2 py-0.5 rounded">
                <Text className="text-[11px] text-white font-bold">공지</Text>
              </View>
            )}
            <Text style={{ color: theme.text.primary }} className="text-[16px] font-semibold leading-6">
              {post.pstTtl}
            </Text>
            <Text style={{ color: theme.text.muted }} className="text-[11px]">
              {post.userId} · {formatDate(post.crtAt)}
            </Text>
            <Text style={{ color: theme.text.subtle }} className="text-[11px]">
              조회 {post.qryCnt} · 좋아요 {post.likeNum} · 댓글 {comments.length}
            </Text>
          </VStack>
          <Text style={{ color: theme.text.body }} className="text-[13px] leading-5" numberOfLines={20}>
            {post.pstDesc}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
