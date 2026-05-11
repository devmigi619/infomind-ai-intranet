import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
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
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>게시판</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleOpenFull}
            style={[styles.openButton, { backgroundColor: theme.brand.primaryTint }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.openButtonText, { color: theme.brand.primary }]}>열기</Text>
            <ArrowRight size={12} color={theme.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <X size={14} color={theme.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: theme.text.subtle }]}>공지사항</Text>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.brand.primary} size="small" />
          </View>
        ) : !noticeBoard ? (
          <Text style={[styles.emptyText, { color: theme.text.muted }]}>
            공지사항 게시판이 없습니다.
          </Text>
        ) : previewPosts.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.text.muted }]}>
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
              style={[
                styles.previewCard,
                {
                  backgroundColor: theme.bg.surfaceAlt,
                  borderColor: theme.border.subtle,
                },
              ]}
            >
              <View style={styles.previewTitleRow}>
                {p.ntcYn === 'Y' && (
                  <Text style={[styles.pinIcon, { color: theme.semantic.danger }]}>
                    📌
                  </Text>
                )}
                <Text
                  style={[styles.previewTitle, { color: theme.text.primary }]}
                  numberOfLines={1}
                >
                  {p.pstTtl}
                </Text>
              </View>
              <Text style={[styles.previewMeta, { color: theme.text.muted }]} numberOfLines={1}>
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
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: theme.brand.primary }]}>← 목록</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={onOpenFull}
            style={[styles.openButton, { backgroundColor: theme.brand.primaryTint }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.openButtonText, { color: theme.brand.primary }]}>열기</Text>
            <ArrowRight size={12} color={theme.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <X size={14} color={theme.text.muted} />
          </TouchableOpacity>
        </View>
      </View>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.brand.primary} size="small" />
        </View>
      ) : error || !post ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.semantic.danger }]}>
            글을 불러오지 못했습니다.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.lpDetailHeader}>
            {post.ntcYn === 'Y' && (
              <View style={[styles.lpNoticeBadge, { backgroundColor: '#DC2626' }]}>
                <Text style={styles.lpNoticeBadgeText}>공지</Text>
              </View>
            )}
            <Text style={[styles.lpDetailTitle, { color: theme.text.primary }]}>
              {post.pstTtl}
            </Text>
            <Text style={[styles.lpDetailMeta, { color: theme.text.muted }]}>
              {post.userId} · {formatDate(post.crtAt)}
            </Text>
            <Text style={[styles.lpDetailStats, { color: theme.text.subtle }]}>
              조회 {post.qryCnt} · 좋아요 {post.likeNum} · 댓글 {comments.length}
            </Text>
          </View>
          <Text style={[styles.lpDetailBody, { color: theme.text.body }]} numberOfLines={20}>
            {post.pstDesc}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    fontFamily,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  openButtonText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.medium,
    fontFamily,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  backText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    fontFamily,
  },

  body: {
    padding: spacing.md,
    gap: 4,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    marginHorizontal: 4,
    fontFamily,
  },
  emptyText: {
    fontSize: fontSize.small,
    fontFamily,
    padding: spacing.md,
    textAlign: 'center',
  },
  center: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  pinIcon: {
    fontSize: fontSize.small,
  },
  previewTitle: {
    flex: 1,
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    fontFamily,
  },
  previewMeta: {
    fontSize: fontSize.caption,
    fontFamily,
  },

  lpDetailHeader: {
    gap: 6,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
  },
  lpNoticeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  lpNoticeBadgeText: {
    fontSize: fontSize.caption,
    color: '#FFFFFF',
    fontWeight: fontWeight.bold,
    fontFamily,
  },
  lpDetailTitle: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.semibold,
    fontFamily,
    lineHeight: fontSize.bodyLg * 1.4,
  },
  lpDetailMeta: {
    fontSize: fontSize.caption,
    fontFamily,
  },
  lpDetailStats: {
    fontSize: fontSize.caption,
    fontFamily,
  },
  lpDetailBody: {
    fontSize: fontSize.small,
    lineHeight: fontSize.small * 1.7,
    fontFamily,
  },
});
