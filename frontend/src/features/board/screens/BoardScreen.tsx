import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useDownloadAttachment } from '../../../shared/hooks/useDownloadAttachment';
import { AttachmentPreviewModal } from '../../../shared/components/AttachmentPreviewModal';
import { useUiStore } from '../../../store/uiStore';
import { useCurrentUser } from '../../auth/api';
import { spacing } from '../../../shared/constants/spacing';
import { radius } from '../../../shared/constants/radius';
import { fontSize, fontWeight } from '../../../shared/constants/typography';
import {
  useBoards,
  useBoardPosts,
  usePostDetail,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  useLikePost,
  usePostComments,
  useCreateComment,
  useDeleteComment,
  type Post,
  type PostComment,
} from '../api';
import {
  useAttachmentList,
  useUploadAttachments,
  useDeleteAttachment,
  type AttachmentFileMeta,
  type DocumentAsset,
} from '../../attachment/api';

const fontFamily = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

type Mode = 'list' | 'detail' | 'write';
type WriteMode = 'create' | 'edit';

// NTC 행/카드 강조 색 — PM 사양으로 고정
const NTC_ROW_BG = 'rgba(220,38,38,0.03)';
const NTC_BADGE_BG = '#DC2626';

function formatDate(iso?: string): string {
  if (!iso) return '';
  // ISO LocalDateTime 형식 (예: 2026-05-11T14:23:00) — 앞 16자만
  const d = iso.replace('T', ' ').slice(0, 16);
  return d;
}

function formatBytes(bytes?: number): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
function isImageExt(ext?: string): boolean {
  return !!ext && IMAGE_EXT.has(ext.toLowerCase());
}
function isPdfExt(ext?: string): boolean {
  return (ext ?? '').toLowerCase() === 'pdf';
}

export function BoardScreen() {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { data: currentUser } = useCurrentUser();
  const isAdminMode = useUiStore((s) => s.isAdminMode);
  const boardLpHandoff = useUiStore((s) => s.boardLpHandoff);
  const setBoardLpHandoff = useUiStore((s) => s.setBoardLpHandoff);
  const confirm = useConfirm();

  const currentUserId = currentUser?.userId ?? '';

  const [mode, setMode] = useState<Mode>('list');
  const [activeBrdId, setActiveBrdId] = useState<string | null>(null);
  const [selectedPstSn, setSelectedPstSn] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');

  // Write form
  const [writeMode, setWriteMode] = useState<WriteMode>('create');
  const [writeTitle, setWriteTitle] = useState('');
  const [writeContent, setWriteContent] = useState('');
  const [writeNotice, setWriteNotice] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<DocumentAsset[]>([]);
  const [writeAfileId, setWriteAfileId] = useState<string | null>(null);

  const { data: boards = [], isLoading: boardsLoading } = useBoards();

  // 첫 로드 시 첫 번째 게시판으로 초기화
  useEffect(() => {
    if (!activeBrdId && boards.length > 0) {
      setActiveBrdId(boards[0].brdId);
    }
  }, [boards, activeBrdId]);

  // LP 핸드오프 적용
  useEffect(() => {
    if (!boardLpHandoff) return;
    setActiveBrdId(boardLpHandoff.brdId);
    if (boardLpHandoff.pstSn != null) {
      setSelectedPstSn(boardLpHandoff.pstSn);
      setMode('detail');
    } else {
      setSelectedPstSn(null);
      setMode('list');
    }
    setBoardLpHandoff(null);
  }, [boardLpHandoff, setBoardLpHandoff]);

  const { data: posts = [], isLoading: postsLoading, error: postsError } = useBoardPosts(activeBrdId);

  const filteredPosts = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return posts;
    return posts.filter(
      (p) =>
        p.pstTtl.toLowerCase().includes(kw) ||
        (p.pstDesc ?? '').toLowerCase().includes(kw) ||
        (p.userId ?? '').toLowerCase().includes(kw),
    );
  }, [posts, searchKeyword]);

  const activeBoard = boards.find((b) => b.brdId === activeBrdId);

  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();
  const uploadAttachments = useUploadAttachments();

  const openWriteCreate = () => {
    setWriteMode('create');
    setWriteTitle('');
    setWriteContent('');
    setWriteNotice(false);
    setPendingAttachments([]);
    setWriteAfileId(null);
    setMode('write');
  };

  const openWriteEdit = (post: Post) => {
    setWriteMode('edit');
    setWriteTitle(post.pstTtl);
    setWriteContent(post.pstDesc);
    setWriteNotice(post.ntcYn === 'Y');
    setPendingAttachments([]);
    setWriteAfileId(post.afileId ?? null);
    setMode('write');
  };

  const handleSavePost = async () => {
    if (!activeBrdId) return;
    if (!writeTitle.trim() || !writeContent.trim()) {
      Alert.alert('입력 오류', '제목과 내용을 입력해주세요.');
      return;
    }
    if (!currentUserId) {
      Alert.alert('인증 오류', '로그인 정보를 확인할 수 없습니다.');
      return;
    }

    // 1단계: 첨부 업로드 (있을 때만)
    let attachedAfileId: string | null = writeAfileId;
    if (pendingAttachments.length > 0) {
      try {
        const uploaded = await uploadAttachments.mutateAsync({
          files: pendingAttachments,
          prefix: 'BRD',
          afileId: writeAfileId ?? undefined,
        });
        attachedAfileId = uploaded.afileId;
      } catch {
        Alert.alert('첨부 업로드 실패', '파일 업로드에 실패해 저장을 중단합니다.');
        return;
      }
    }

    // 2단계: 글 저장
    try {
      if (writeMode === 'create') {
        const data = {
          pstTtl: writeTitle.trim(),
          pstDesc: writeContent.trim(),
          userId: currentUserId,
          ntcYn: writeNotice ? 'Y' : 'N',
          afileId: attachedAfileId ?? undefined,
        };
        await createPost.mutateAsync({
          brdId: activeBrdId,
          data,
        });
      } else if (selectedPstSn != null) {
        const data = {
          pstTtl: writeTitle.trim(),
          pstDesc: writeContent.trim(),
          ntcYn: writeNotice ? 'Y' : 'N',
          afileId: attachedAfileId ?? undefined,
        };
        await updatePost.mutateAsync({
          brdId: activeBrdId,
          pstSn: selectedPstSn,
          data,
        });
      }
      setPendingAttachments([]);
      setWriteAfileId(null);
      setMode(writeMode === 'edit' ? 'detail' : 'list');
    } catch {
      Alert.alert('저장 실패', '서버에 저장하지 못했습니다.');
    }
  };

  const handleDeletePost = async (post: Post) => {
    if (!activeBrdId) return;
    const ok = await confirm({ title: '게시글 삭제', message: '정말 삭제하시겠습니까?', danger: true });
    if (!ok) return;
    try {
      await deletePost.mutateAsync({
        brdId: activeBrdId,
        pstSn: post.pstSn,
        data: { userId: currentUserId, admin: isAdminMode },
      });
      setMode('list');
      setSelectedPstSn(null);
    } catch {
      Alert.alert('삭제 실패', '삭제 권한이 없거나 서버 오류입니다.');
    }
  };

  // ─── 풀뷰 — Write 상태 ─────────────────────────────────────────────
  if (mode === 'write') {
    return (
      <WriteForm
        title={writeTitle}
        content={writeContent}
        notice={writeNotice}
        isEdit={writeMode === 'edit'}
        boardName={activeBoard?.brdNm ?? ''}
        saving={
          createPost.isPending ||
          updatePost.isPending ||
          uploadAttachments.isPending
        }
        existingAfileId={writeAfileId}
        pendingAttachments={pendingAttachments}
        onTitleChange={setWriteTitle}
        onContentChange={setWriteContent}
        onNoticeChange={setWriteNotice}
        onAddAttachments={(files) =>
          setPendingAttachments((prev) => [...prev, ...files])
        }
        onRemovePending={(idx) =>
          setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))
        }
        onSave={handleSavePost}
        onCancel={() => setMode(writeMode === 'edit' ? 'detail' : 'list')}
      />
    );
  }

  // ─── 풀뷰 — Detail 상태 ────────────────────────────────────────────
  if (mode === 'detail' && activeBrdId && selectedPstSn != null) {
    return (
      <PostDetail
        brdId={activeBrdId}
        pstSn={selectedPstSn}
        boardName={activeBoard?.brdNm ?? ''}
        currentUserId={currentUserId}
        isAdminMode={isAdminMode}
        onBack={() => {
          setMode('list');
          setSelectedPstSn(null);
        }}
        onEdit={(post) => openWriteEdit(post)}
        onDelete={(post) => handleDeletePost(post)}
      />
    );
  }

  // ─── 풀뷰 — List 상태 ──────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: theme.bg.app }]}>
      {/* 게시판 탭 */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border.default }]}>
        {boardsLoading ? (
          <ActivityIndicator color={theme.brand.primary} size="small" style={styles.tabLoader} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScroll}
          >
            {boards.map((b) => {
              const active = b.brdId === activeBrdId;
              return (
                <TouchableOpacity
                  key={b.brdId}
                  onPress={() => setActiveBrdId(b.brdId)}
                  activeOpacity={0.7}
                  style={[
                    styles.tab,
                    active && { borderBottomColor: theme.brand.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: active ? theme.brand.primary : theme.text.muted },
                      active && { fontWeight: fontWeight.semibold },
                    ]}
                  >
                    {b.brdNm}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 도구바 */}
      <View
        style={[
          styles.toolbar,
          { borderBottomColor: theme.border.subtle, backgroundColor: theme.bg.surface },
        ]}
      >
        <TextInput
          style={[
            styles.searchInput,
            {
              borderColor: theme.border.default,
              color: theme.text.primary,
              backgroundColor: theme.bg.surface,
            },
          ]}
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          placeholder="제목/내용/작성자 검색"
          placeholderTextColor={theme.text.subtle}
        />
        <TouchableOpacity
          onPress={openWriteCreate}
          activeOpacity={0.7}
          style={[styles.writeButton, { backgroundColor: theme.brand.primary }]}
          disabled={!activeBrdId}
        >
          <Text style={[styles.writeButtonText, { color: theme.text.onBrand }]}>+ 글쓰기</Text>
        </TouchableOpacity>
      </View>

      {/* 목록 */}
      {postsLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.brand.primary} />
        </View>
      ) : postsError ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: theme.semantic.danger }]}>
            게시글을 불러오지 못했습니다.
          </Text>
        </View>
      ) : filteredPosts.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.text.muted }]}>
            {searchKeyword ? '검색 결과가 없습니다.' : '글이 없습니다.'}
          </Text>
        </View>
      ) : isMobile ? (
        // ─── 모바일: 카드 목록 ─────────────────────────
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => `${item.brdId}-${item.pstSn}`}
          contentContainerStyle={styles.cardListContent}
          renderItem={({ item }) => {
            const isNotice = item.ntcYn === 'Y';
            return (
              <TouchableOpacity
                onPress={() => {
                  setSelectedPstSn(item.pstSn);
                  setMode('detail');
                }}
                activeOpacity={0.7}
                style={[
                  styles.card,
                  {
                    backgroundColor: isNotice ? NTC_ROW_BG : theme.bg.surface,
                    borderColor: theme.border.subtle,
                  },
                ]}
              >
                {isNotice && (
                  <View style={[styles.noticeBadge, { backgroundColor: NTC_BADGE_BG }]}>
                    <Text style={styles.noticeBadgeText}>공지</Text>
                  </View>
                )}
                <Text
                  style={[styles.cardTitle, { color: theme.text.primary }]}
                  numberOfLines={2}
                >
                  {item.pstTtl}
                </Text>
                <Text style={[styles.cardMeta, { color: theme.text.muted }]}>
                  {item.userId} · {formatDate(item.crtAt)} · 조회 {item.qryCnt} · 댓글 0
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        // ─── PC: 테이블 ───────────────────────────────
        <View style={styles.tableWrap}>
          <View
            style={[
              styles.tableHeader,
              { borderBottomColor: theme.border.default, backgroundColor: theme.bg.surfaceAlt },
            ]}
          >
            <Text style={[styles.thTag, { color: theme.text.muted }]}>구분</Text>
            <Text style={[styles.thTitle, { color: theme.text.muted }]}>제목</Text>
            <Text style={[styles.thAuthor, { color: theme.text.muted }]}>작성자</Text>
            <Text style={[styles.thDate, { color: theme.text.muted }]}>작성일</Text>
            <Text style={[styles.thNum, { color: theme.text.muted }]}>조회</Text>
            <Text style={[styles.thNum, { color: theme.text.muted }]}>댓글</Text>
          </View>
          <FlatList
            data={filteredPosts}
            keyExtractor={(item) => `${item.brdId}-${item.pstSn}`}
            renderItem={({ item }) => {
              const isNotice = item.ntcYn === 'Y';
              return (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedPstSn(item.pstSn);
                    setMode('detail');
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.row,
                    {
                      borderBottomColor: theme.border.subtle,
                      backgroundColor: isNotice ? NTC_ROW_BG : 'transparent',
                    },
                  ]}
                >
                  <View style={styles.thTag}>
                    {isNotice ? (
                      <View style={[styles.noticeBadgeSm, { backgroundColor: NTC_BADGE_BG }]}>
                        <Text style={styles.noticeBadgeText}>공지</Text>
                      </View>
                    ) : (
                      <Text style={[styles.cellText, { color: theme.text.subtle }]}>일반</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.thTitle,
                      styles.titleCell,
                      { color: theme.text.primary, fontWeight: isNotice ? '600' : '500' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.pstTtl}
                  </Text>
                  <Text style={[styles.thAuthor, styles.cellText, { color: theme.text.body }]}>
                    {item.userId}
                  </Text>
                  <Text style={[styles.thDate, styles.cellText, { color: theme.text.muted }]}>
                    {formatDate(item.crtAt)}
                  </Text>
                  <Text style={[styles.thNum, styles.cellText, { color: theme.text.muted }]}>
                    {item.qryCnt}
                  </Text>
                  <Text style={[styles.thNum, styles.cellText, { color: theme.text.muted }]}>
                    0
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 글쓰기/수정 폼
// ─────────────────────────────────────────────────────────────────────
interface WriteFormProps {
  title: string;
  content: string;
  notice: boolean;
  isEdit: boolean;
  boardName: string;
  saving: boolean;
  existingAfileId: string | null;
  pendingAttachments: DocumentAsset[];
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onNoticeChange: (v: boolean) => void;
  onAddAttachments: (files: DocumentAsset[]) => void;
  onRemovePending: (idx: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

function WriteForm({
  title,
  content,
  notice,
  isEdit,
  boardName,
  saving,
  existingAfileId,
  pendingAttachments,
  onTitleChange,
  onContentChange,
  onNoticeChange,
  onAddAttachments,
  onRemovePending,
  onSave,
  onCancel,
}: WriteFormProps) {
  const theme = useTheme();
  const confirm = useConfirm();
  const { data: existingFiles = [] } = useAttachmentList(existingAfileId);
  const deleteAttachment = useDeleteAttachment();

  const handlePickFiles = async () => {
    if (Platform.OS === 'web') {
      // 웹: 숨겨진 input[type=file] 다중 선택
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.onchange = () => {
        const list = input.files;
        if (!list || list.length === 0) return;
        const picked: DocumentAsset[] = [];
        for (let i = 0; i < list.length; i++) {
          const f = list[i];
          picked.push({
            uri: URL.createObjectURL(f),
            name: f.name,
            size: f.size,
            mimeType: f.type || 'application/octet-stream',
            file: f,
          });
        }
        onAddAttachments(picked);
      };
      input.click();
      return;
    }
    // 네이티브: expo-document-picker 미설치 → 안내
    Alert.alert(
      '추후 지원',
      '모바일 첨부 선택은 expo-document-picker 설치 후 지원 예정입니다.',
    );
  };

  const handleRemoveExisting = async (file: AttachmentFileMeta) => {
    const ok = await confirm({
      title: '첨부 삭제',
      message: `"${file.oriFileNm}" 파일을 삭제하시겠습니까?`,
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteAttachment.mutateAsync({
        afileId: file.afileId,
        afileSn: file.afileSn,
      });
    } catch {
      Alert.alert('삭제 실패', '첨부 파일을 삭제하지 못했습니다.');
    }
  };
  return (
    <View style={[styles.container, { backgroundColor: theme.bg.app }]}>
      <TouchableOpacity
        onPress={onCancel}
        activeOpacity={0.7}
        style={[styles.backBar, { borderBottomColor: theme.border.subtle }]}
      >
        <Text style={[styles.backText, { color: theme.brand.primary }]}>
          ← 취소
        </Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.writeContent}>
        <Text style={[styles.writeTitle, { color: theme.text.primary }]}>
          {isEdit ? '글 수정' : '글 작성'} · {boardName}
        </Text>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.text.muted }]}>제목 *</Text>
          <TextInput
            value={title}
            onChangeText={onTitleChange}
            placeholder="제목을 입력하세요"
            placeholderTextColor={theme.text.subtle}
            style={[
              styles.input,
              {
                borderColor: theme.border.default,
                color: theme.text.primary,
                backgroundColor: theme.bg.surface,
              },
            ]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.text.muted }]}>본문 *</Text>
          <TextInput
            value={content}
            onChangeText={onContentChange}
            placeholder="내용을 입력하세요"
            placeholderTextColor={theme.text.subtle}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            style={[
              styles.input,
              styles.textArea,
              {
                borderColor: theme.border.default,
                color: theme.text.primary,
                backgroundColor: theme.bg.surface,
              },
            ]}
          />
        </View>

        <TouchableOpacity
          onPress={() => onNoticeChange(!notice)}
          activeOpacity={0.7}
          style={styles.checkboxRow}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: notice ? theme.brand.primary : theme.border.strong,
                backgroundColor: notice ? theme.brand.primary : 'transparent',
              },
            ]}
          >
            {notice && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
          <Text style={[styles.checkboxLabel, { color: theme.text.body }]}>
            공지로 등록 (상단 고정)
          </Text>
        </TouchableOpacity>

        {/* 첨부 영역 */}
        <View style={styles.field}>
          <View style={styles.attachHeader}>
            <Text style={[styles.fieldLabel, { color: theme.text.muted }]}>첨부 파일</Text>
            <TouchableOpacity
              onPress={handlePickFiles}
              activeOpacity={0.7}
              style={[
                styles.attachAddBtn,
                { borderColor: theme.border.default, backgroundColor: theme.bg.surface },
              ]}
            >
              <Text style={[styles.attachAddBtnText, { color: theme.brand.primary }]}>
                + 파일 선택
              </Text>
            </TouchableOpacity>
          </View>

          {existingFiles.length === 0 && pendingAttachments.length === 0 ? (
            <Text style={[styles.attachEmpty, { color: theme.text.subtle }]}>
              첨부된 파일이 없습니다.
            </Text>
          ) : (
            <View
              style={[
                styles.attachList,
                { borderColor: theme.border.subtle, backgroundColor: theme.bg.surface },
              ]}
            >
              {existingFiles.map((f) => (
                <View
                  key={`ex-${f.afileSn}`}
                  style={[styles.attachItem, { borderBottomColor: theme.border.subtle }]}
                >
                  <View style={styles.attachInfo}>
                    <Text
                      style={[styles.attachName, { color: theme.text.primary }]}
                      numberOfLines={1}
                    >
                      {f.oriFileNm}
                    </Text>
                    <Text style={[styles.attachMeta, { color: theme.text.muted }]}>
                      {formatBytes(f.fileSize)} · 업로드됨
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveExisting(f)}
                    activeOpacity={0.7}
                    style={styles.attachRemoveBtn}
                  >
                    <Text style={[styles.attachRemoveText, { color: theme.semantic.danger }]}>
                      삭제
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
              {pendingAttachments.map((f, idx) => (
                <View
                  key={`pn-${idx}-${f.name}`}
                  style={[styles.attachItem, { borderBottomColor: theme.border.subtle }]}
                >
                  <View style={styles.attachInfo}>
                    <Text
                      style={[styles.attachName, { color: theme.text.primary }]}
                      numberOfLines={1}
                    >
                      {f.name}
                    </Text>
                    <Text style={[styles.attachMeta, { color: theme.brand.primary }]}>
                      {formatBytes(f.size)} · 업로드 대기
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onRemovePending(idx)}
                    activeOpacity={0.7}
                    style={styles.attachRemoveBtn}
                  >
                    <Text style={[styles.attachRemoveText, { color: theme.text.muted }]}>
                      제거
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.writeActions}>
          <TouchableOpacity
            onPress={onSave}
            activeOpacity={0.8}
            disabled={saving}
            style={[
              styles.primaryButton,
              { backgroundColor: theme.brand.primary, opacity: saving ? 0.6 : 1 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={theme.text.onBrand} size="small" />
            ) : (
              <Text style={[styles.primaryButtonText, { color: theme.text.onBrand }]}>
                {isEdit ? '수정 완료' : '등록'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onCancel}
            activeOpacity={0.8}
            style={[
              styles.secondaryButton,
              { borderColor: theme.border.default },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.text.body }]}>취소</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 게시글 상세
// ─────────────────────────────────────────────────────────────────────
interface PostDetailProps {
  brdId: string;
  pstSn: number;
  boardName: string;
  currentUserId: string;
  isAdminMode: boolean;
  onBack: () => void;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
}

function PostDetail({
  brdId,
  pstSn,
  boardName,
  currentUserId,
  isAdminMode,
  onBack,
  onEdit,
  onDelete,
}: PostDetailProps) {
  const theme = useTheme();
  const { data: post, isLoading, error } = usePostDetail(brdId, pstSn);
  const likePost = useLikePost();
  const download = useDownloadAttachment();
  const { data: attachments = [] } = useAttachmentList(post?.afileId ?? null);
  const [previewFile, setPreviewFile] = useState<AttachmentFileMeta | null>(null);

  const canEdit = post?.userId === currentUserId;
  const canDelete = canEdit || isAdminMode;

  const handleLike = () => {
    if (!post) return;
    likePost.mutate({ brdId: post.brdId, pstSn: post.pstSn });
  };

  const handleDownload = async (f: AttachmentFileMeta) => {
    const result = await download(f);
    if (!result.ok && result.message) {
      Alert.alert('다운로드', result.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.app }]}>
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.7}
        style={[styles.backBar, { borderBottomColor: theme.border.subtle }]}
      >
        <Text style={[styles.backText, { color: theme.brand.primary }]}>
          ← 목록으로
        </Text>
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.brand.primary} />
        </View>
      ) : error || !post ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: theme.semantic.danger }]}>
            게시글을 불러오지 못했습니다.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.detailContent}>
          {/* 헤더 */}
          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderTop}>
              <View
                style={[
                  styles.categoryTag,
                  { backgroundColor: theme.brand.primaryTint },
                ]}
              >
                <Text style={[styles.categoryTagText, { color: theme.brand.primary }]}>
                  {post.ntcYn === 'Y' ? '공지' : boardName}
                </Text>
              </View>
              <View style={styles.detailStats}>
                <Text style={[styles.statText, { color: theme.text.muted }]}>
                  조회 {post.qryCnt}
                </Text>
                <Text style={[styles.statText, { color: theme.text.muted }]}>
                  좋아요 {post.likeNum}
                </Text>
              </View>
            </View>
            <Text style={[styles.detailTitleText, { color: theme.text.primary }]}>
              {post.pstTtl}
            </Text>
            <View style={styles.detailMetaRow}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: theme.brand.primaryTint },
                ]}
              >
                <Text style={[styles.avatarText, { color: theme.brand.primary }]}>
                  {(post.userId ?? '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={[styles.detailAuthor, { color: theme.text.primary }]}>
                  {post.userId}
                </Text>
                <Text style={[styles.detailDate, { color: theme.text.muted }]}>
                  {formatDate(post.crtAt)}
                </Text>
              </View>
            </View>
          </View>

          {/* 본문 */}
          <Text style={[styles.detailBody, { color: theme.text.body }]}>
            {post.pstDesc}
          </Text>

          {/* 첨부 영역 */}
          {attachments.length > 0 && (
            <View
              style={[
                styles.detailAttachWrap,
                { borderColor: theme.border.subtle, backgroundColor: theme.bg.surface },
              ]}
            >
              <Text style={[styles.detailAttachTitle, { color: theme.text.muted }]}>
                첨부 파일 {attachments.length}
              </Text>
              {attachments.map((f) => {
                const previewable = isImageExt(f.fileExt) || isPdfExt(f.fileExt);
                return (
                  <View
                    key={`atc-${f.afileSn}`}
                    style={[
                      styles.detailAttachItem,
                      { borderTopColor: theme.border.subtle },
                    ]}
                  >
                    <View style={styles.detailAttachInfo}>
                      <Text
                        style={[styles.attachName, { color: theme.text.primary }]}
                        numberOfLines={1}
                      >
                        [{(f.fileExt ?? '').toUpperCase()}] {f.oriFileNm}
                      </Text>
                      <Text style={[styles.attachMeta, { color: theme.text.muted }]}>
                        {formatBytes(f.fileSize)}
                      </Text>
                    </View>
                    <View style={styles.detailAttachActions}>
                      {previewable && (
                        <TouchableOpacity
                          onPress={() => setPreviewFile(f)}
                          activeOpacity={0.7}
                          style={[
                            styles.detailAttachBtn,
                            { borderColor: theme.border.default },
                          ]}
                        >
                          <Text
                            style={[styles.detailAttachBtnText, { color: theme.brand.primary }]}
                          >
                            미리보기
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleDownload(f)}
                        activeOpacity={0.7}
                        style={[
                          styles.detailAttachBtn,
                          { borderColor: theme.border.default },
                        ]}
                      >
                        <Text style={[styles.detailAttachBtnText, { color: theme.text.body }]}>
                          다운로드
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* 액션 row */}
          <View style={[styles.actionRow, { borderTopColor: theme.border.subtle }]}>
            <TouchableOpacity
              onPress={handleLike}
              activeOpacity={0.7}
              disabled={likePost.isPending}
              style={[
                styles.actionButton,
                { borderColor: theme.border.default },
              ]}
            >
              <Text style={[styles.actionText, { color: theme.text.body }]}>
                좋아요 {post.likeNum}
              </Text>
            </TouchableOpacity>
            {canEdit && (
              <TouchableOpacity
                onPress={() => onEdit(post)}
                activeOpacity={0.7}
                style={[styles.actionButton, { borderColor: theme.border.default }]}
              >
                <Text style={[styles.actionText, { color: theme.text.body }]}>수정</Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                onPress={() => onDelete(post)}
                activeOpacity={0.7}
                style={[styles.actionButton, { borderColor: theme.semantic.danger }]}
              >
                <Text style={[styles.actionText, { color: theme.semantic.danger }]}>삭제</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 댓글 섹션 */}
          <CommentsSection
            brdId={post.brdId}
            pstSn={post.pstSn}
            currentUserId={currentUserId}
            isAdminMode={isAdminMode}
          />
        </ScrollView>
      )}

      <AttachmentPreviewModal
        open={!!previewFile}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 댓글 섹션
// ─────────────────────────────────────────────────────────────────────
interface CommentsSectionProps {
  brdId: string;
  pstSn: number;
  currentUserId: string;
  isAdminMode: boolean;
}

interface CommentNode {
  comment: PostComment;
  replies: PostComment[];
}

function buildCommentTree(comments: PostComment[]): CommentNode[] {
  // 트리 깊이 2단계만 가정 (cmt_lvl = 1 / 2)
  const roots = comments.filter((c) => c.cmtLvl === 1);
  return roots.map((root) => ({
    comment: root,
    replies: comments.filter((c) => c.cmtLvl === 2 && c.upCmtSn === root.cmtSn),
  }));
}

function CommentsSection({
  brdId,
  pstSn,
  currentUserId,
  isAdminMode,
}: CommentsSectionProps) {
  const theme = useTheme();
  const confirm = useConfirm();
  const { data: comments = [], isLoading } = usePostComments(brdId, pstSn);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();

  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [replyText, setReplyText] = useState('');

  const tree = useMemo(() => buildCommentTree(comments), [comments]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !currentUserId) return;
    try {
      await createComment.mutateAsync({
        brdId,
        pstSn,
        data: {
          cmtDesc: newComment.trim(),
          userId: currentUserId,
          cmtLvl: 1,
        },
      });
      setNewComment('');
    } catch {
      Alert.alert('등록 실패', '댓글을 등록하지 못했습니다.');
    }
  };

  const handleReply = async () => {
    if (!replyTo || !replyText.trim() || !currentUserId) return;
    try {
      await createComment.mutateAsync({
        brdId,
        pstSn,
        data: {
          cmtDesc: replyText.trim(),
          userId: currentUserId,
          cmtLvl: 2,
          upCmtSn: replyTo.cmtSn,
        },
      });
      setReplyText('');
      setReplyTo(null);
    } catch {
      Alert.alert('등록 실패', '답글을 등록하지 못했습니다.');
    }
  };

  const handleDelete = async (cmt: PostComment) => {
    const ok = await confirm({ title: '댓글 삭제', message: '댓글을 삭제하시겠습니까?', danger: true });
    if (!ok) return;
    try {
      await deleteComment.mutateAsync({
        brdId,
        pstSn,
        cmtSn: cmt.cmtSn,
        data: { userId: currentUserId, admin: isAdminMode },
      });
    } catch {
      Alert.alert('삭제 실패', '삭제 권한이 없거나 서버 오류입니다.');
    }
  };

  return (
    <View style={[styles.commentSection, { borderTopColor: theme.border.subtle }]}>
      <Text style={[styles.commentSectionTitle, { color: theme.text.primary }]}>
        댓글 {comments.length}
      </Text>

      {isLoading ? (
        <ActivityIndicator color={theme.brand.primary} size="small" style={{ marginVertical: spacing.md }} />
      ) : tree.length === 0 ? (
        <Text style={[styles.emptyComments, { color: theme.text.muted }]}>
          첫 댓글을 남겨주세요.
        </Text>
      ) : (
        tree.map(({ comment, replies }) => (
          <View key={`c-${comment.cmtSn}`}>
            <CommentItem
              comment={comment}
              currentUserId={currentUserId}
              isAdminMode={isAdminMode}
              theme={theme}
              onReply={() => setReplyTo(comment)}
              onDelete={() => handleDelete(comment)}
            />
            {replies.map((r) => (
              <View
                key={`r-${r.cmtSn}`}
                style={[
                  styles.replyWrap,
                  { borderLeftColor: theme.brand.primaryTint },
                ]}
              >
                <View style={styles.replyHeader}>
                  <Text style={[styles.replyArrow, { color: theme.text.muted }]}>↳</Text>
                  <Text style={[styles.replyTo, { color: theme.text.muted }]}>
                    @{comment.userId}에게
                  </Text>
                </View>
                <CommentItem
                  comment={r}
                  currentUserId={currentUserId}
                  isAdminMode={isAdminMode}
                  theme={theme}
                  onDelete={() => handleDelete(r)}
                />
              </View>
            ))}
            {replyTo?.cmtSn === comment.cmtSn && (
              <View
                style={[
                  styles.replyInputWrap,
                  { borderColor: theme.border.default, backgroundColor: theme.bg.surface },
                ]}
              >
                <TextInput
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder={`@${comment.userId}에게 답글`}
                  placeholderTextColor={theme.text.subtle}
                  multiline
                  style={[styles.replyInput, { color: theme.text.primary }]}
                />
                <View style={styles.replyActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setReplyTo(null);
                      setReplyText('');
                    }}
                    style={[
                      styles.commentBtnSmSecondary,
                      { borderColor: theme.border.default },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.commentBtnTextSecondary, { color: theme.text.muted }]}>
                      취소
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleReply}
                    disabled={createComment.isPending}
                    style={[
                      styles.commentBtnSmPrimary,
                      { backgroundColor: theme.brand.primary },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.commentBtnTextPrimary, { color: theme.text.onBrand }]}>
                      답글 등록
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))
      )}

      {/* 새 댓글 입력 */}
      <View
        style={[
          styles.commentInputWrap,
          { borderColor: theme.border.default, backgroundColor: theme.bg.surface },
        ]}
      >
        <TextInput
          value={newComment}
          onChangeText={setNewComment}
          placeholder="댓글을 입력하세요"
          placeholderTextColor={theme.text.subtle}
          multiline
          style={[styles.commentInput, { color: theme.text.primary }]}
        />
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={createComment.isPending || !newComment.trim()}
          activeOpacity={0.7}
          style={[
            styles.commentSubmit,
            {
              backgroundColor: theme.brand.primary,
              opacity: createComment.isPending || !newComment.trim() ? 0.5 : 1,
            },
          ]}
        >
          <Text style={[styles.commentSubmitText, { color: theme.text.onBrand }]}>
            등록
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 댓글 한 줄 컴포넌트
// ─────────────────────────────────────────────────────────────────────
interface CommentItemProps {
  comment: PostComment;
  currentUserId: string;
  isAdminMode: boolean;
  theme: ReturnType<typeof useTheme>;
  onReply?: () => void;
  onDelete: () => void;
}

function CommentItem({
  comment,
  currentUserId,
  isAdminMode,
  theme,
  onReply,
  onDelete,
}: CommentItemProps) {
  const canDelete = comment.userId === currentUserId || isAdminMode;
  return (
    <View style={[styles.commentItem, { borderBottomColor: theme.border.subtle }]}>
      <View style={styles.commentHeader}>
        <Text style={[styles.commentAuthor, { color: theme.text.primary }]}>
          {comment.userId}
        </Text>
        <Text style={[styles.commentDate, { color: theme.text.muted }]}>
          {formatDate(comment.crtAt)}
        </Text>
      </View>
      <Text style={[styles.commentBody, { color: theme.text.body }]}>
        {comment.cmtDesc}
      </Text>
      <View style={styles.commentActions}>
        {onReply && (
          <TouchableOpacity onPress={onReply} activeOpacity={0.7}>
            <Text style={[styles.commentActionText, { color: theme.brand.primary }]}>
              답글
            </Text>
          </TouchableOpacity>
        )}
        {canDelete && (
          <TouchableOpacity onPress={onDelete} activeOpacity={0.7}>
            <Text style={[styles.commentActionText, { color: theme.semantic.danger }]}>
              삭제
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorText: { fontSize: fontSize.body, fontFamily },
  emptyText: { fontSize: fontSize.body, fontFamily },

  // ─ 탭 ─
  tabBar: {
    minHeight: 48,
    borderBottomWidth: 1,
    justifyContent: 'center',
  },
  tabLoader: { marginLeft: spacing.base },
  tabScroll: {
    paddingHorizontal: spacing.base,
    alignItems: 'center',
    gap: spacing.xs,
  },
  tab: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: fontSize.body,
    fontFamily,
  },

  // ─ 도구바 ─
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
    fontFamily,
  },
  writeButton: {
    height: 36,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  writeButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },

  // ─ PC 테이블 ─
  tableWrap: { flex: 1 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  thTag: { width: 80, alignItems: 'flex-start' },
  thTitle: { flex: 1, paddingHorizontal: spacing.sm },
  thAuthor: { width: 100 },
  thDate: { width: 140 },
  thNum: { width: 60, textAlign: 'right' },
  titleCell: {
    fontSize: fontSize.body,
    fontFamily,
  },
  cellText: {
    fontSize: fontSize.small,
    fontFamily,
  },

  // ─ 모바일 카드 ─
  cardListContent: { padding: spacing.md, gap: spacing.sm },
  card: {
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: 6,
  },
  cardTitle: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
  cardMeta: {
    fontSize: fontSize.small,
    fontFamily,
  },

  // ─ 공지 뱃지 ─
  noticeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  noticeBadgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  noticeBadgeText: {
    fontSize: fontSize.caption,
    color: '#FFFFFF',
    fontWeight: fontWeight.bold,
    fontFamily,
  },

  // ─ 뒤로가기 바 ─
  backBar: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    fontFamily,
  },

  // ─ 상세 ─
  detailContent: {
    padding: spacing.lg,
    gap: spacing.base,
  },
  detailHeader: {
    gap: spacing.md,
    paddingBottom: spacing.base,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  categoryTagText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
  detailStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statText: {
    fontSize: fontSize.small,
    fontFamily,
  },
  detailTitleText: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    fontFamily,
    lineHeight: fontSize.title * 1.4,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    fontFamily,
  },
  detailAuthor: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    fontFamily,
  },
  detailDate: {
    fontSize: fontSize.small,
    fontFamily,
  },
  detailBody: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.8,
    fontFamily,
    paddingVertical: spacing.base,
  },

  // ─ 액션 row ─
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.base,
    borderTopWidth: 1,
  },
  actionButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  actionText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    fontFamily,
  },

  // ─ 댓글 ─
  commentSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  commentSectionTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    fontFamily,
    marginBottom: spacing.sm,
  },
  emptyComments: {
    fontSize: fontSize.small,
    fontFamily,
    padding: spacing.md,
    textAlign: 'center',
  },
  commentItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentAuthor: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
  commentDate: {
    fontSize: fontSize.caption,
    fontFamily,
  },
  commentBody: {
    fontSize: fontSize.body,
    fontFamily,
    lineHeight: fontSize.body * 1.5,
  },
  commentActions: {
    flexDirection: 'row',
    gap: spacing.base,
    marginTop: 4,
  },
  commentActionText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    fontFamily,
  },

  // ─ 답글 (대댓글) ─
  replyWrap: {
    marginLeft: 32,
    borderLeftWidth: 2,
    paddingLeft: spacing.md,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  replyArrow: {
    fontSize: fontSize.body,
  },
  replyTo: {
    fontSize: fontSize.caption,
    fontFamily,
  },
  replyInputWrap: {
    marginLeft: 32,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  replyInput: {
    minHeight: 56,
    fontSize: fontSize.small,
    fontFamily,
    padding: spacing.sm,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  commentBtnSmPrimary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  commentBtnSmSecondary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  commentBtnTextPrimary: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
  commentBtnTextSecondary: {
    fontSize: fontSize.small,
    fontFamily,
  },

  // ─ 새 댓글 입력 ─
  commentInputWrap: {
    marginTop: spacing.base,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  commentInput: {
    minHeight: 64,
    fontSize: fontSize.body,
    fontFamily,
    padding: spacing.sm,
  },
  commentSubmit: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  commentSubmitText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },

  // ─ Write Form ─
  writeContent: {
    padding: spacing.lg,
    gap: spacing.base,
  },
  writeTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    fontFamily,
    marginBottom: spacing.md,
  },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    fontFamily,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    fontFamily,
  },
  textArea: {
    minHeight: 200,
    paddingTop: spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: fontWeight.bold,
  },
  checkboxLabel: {
    fontSize: fontSize.body,
    fontFamily,
  },
  writeActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.base,
  },
  primaryButton: {
    flex: 1,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    fontFamily,
  },

  // ─ 첨부 (Write/Detail 공통) ─
  attachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachAddBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  attachAddBtnText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
  attachEmpty: {
    fontSize: fontSize.small,
    fontFamily,
    paddingVertical: spacing.sm,
  },
  attachList: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  attachItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  attachInfo: { flex: 1, gap: 2 },
  attachName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    fontFamily,
  },
  attachMeta: {
    fontSize: fontSize.caption,
    fontFamily,
  },
  attachRemoveBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  attachRemoveText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    fontFamily,
  },

  // ─ Detail 전용 첨부 박스 ─
  detailAttachWrap: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  detailAttachTitle: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    fontFamily,
    marginBottom: spacing.xs,
  },
  detailAttachItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  detailAttachInfo: { flex: 1, gap: 2 },
  detailAttachActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  detailAttachBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  detailAttachBtnText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
});
