import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { HStack } from '../../../shared/components/ui/hstack';
import { VStack } from '../../../shared/components/ui/vstack';
import { Input, InputField } from '../../../shared/components/ui/input';
import { Textarea, TextareaInput } from '../../../shared/components/ui/textarea';
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
    <View style={{ backgroundColor: theme.bg.app }} className="flex-1">
      {/* 게시판 탭 */}
      <HStack style={{ borderBottomColor: theme.border.default }} className="min-h-[48px] border-b justify-center">
        {boardsLoading ? (
          <ActivityIndicator color={theme.brand.primary} size="small" className="ml-4" />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center', gap: 8 }}
          >
            {boards.map((b) => {
              const active = b.brdId === activeBrdId;
              return (
                <TouchableOpacity
                  key={b.brdId}
                  onPress={() => setActiveBrdId(b.brdId)}
                  activeOpacity={0.7}
                  style={active ? { borderBottomColor: theme.brand.primary } : undefined}
                  className="px-4 py-3 border-b-2 border-transparent"
                >
                  <Text
                    style={{ color: active ? theme.brand.primary : theme.text.muted }}
                    className={`text-[14px] ${active ? 'font-semibold' : ''}`}
                  >
                    {b.brdNm}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </HStack>

      {/* 도구바 */}
      <HStack
        style={{ borderBottomColor: theme.border.subtle, backgroundColor: theme.bg.surface }}
        className="items-center gap-2 px-4 py-3 border-b"
      >
        <Input
          style={{
            borderColor: theme.border.default,
            backgroundColor: theme.bg.surface,
          }}
          className="flex-1 h-9 border rounded-lg"
        >
          <InputField
            style={{ color: theme.text.primary }}
            className="text-[14px] px-3 placeholder:text-[14px]"
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            placeholder="제목/내용/작성자 검색"
            placeholderTextColor={theme.text.subtle}
          />
        </Input>
        <TouchableOpacity
          onPress={openWriteCreate}
          activeOpacity={0.7}
          style={{ backgroundColor: theme.brand.primary }}
          className="h-9 px-4 rounded-lg items-center justify-center"
          disabled={!activeBrdId}
        >
          <Text style={{ color: theme.text.onBrand }} className="text-[14px] font-semibold">+ 글쓰기</Text>
        </TouchableOpacity>
      </HStack>

      {/* 목록 */}
      {postsLoading ? (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator color={theme.brand.primary} />
        </View>
      ) : postsError ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text style={{ color: theme.semantic.danger }} className="text-[14px]">
            게시글을 불러오지 못했습니다.
          </Text>
        </View>
      ) : filteredPosts.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text style={{ color: theme.text.muted }} className="text-[14px]">
            {searchKeyword ? '검색 결과가 없습니다.' : '글이 없습니다.'}
          </Text>
        </View>
      ) : isMobile ? (
        // ─── 모바일: 카드 목록 ─────────────────────────
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => `${item.brdId}-${item.pstSn}`}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          renderItem={({ item }) => {
            const isNotice = item.ntcYn === 'Y';
            return (
              <TouchableOpacity
                onPress={() => {
                  setSelectedPstSn(item.pstSn);
                  setMode('detail');
                }}
                activeOpacity={0.7}
                style={{
                  backgroundColor: isNotice ? NTC_ROW_BG : theme.bg.surface,
                  borderColor: theme.border.subtle,
                }}
                className="p-4 rounded-lg border mb-2 gap-1.5"
              >
                {isNotice && (
                  <View style={{ backgroundColor: NTC_BADGE_BG }} className="self-start px-2 py-0.5 rounded">
                    <Text className="text-[11px] text-white font-bold">공지</Text>
                  </View>
                )}
                <Text
                  style={{ color: theme.text.primary }}
                  className="text-[15px] font-semibold"
                  numberOfLines={2}
                >
                  {item.pstTtl}
                </Text>
                <Text style={{ color: theme.text.muted }} className="text-[12px]">
                  {item.userId} · {formatDate(item.crtAt)} · 조회 {item.qryCnt} · 댓글 0
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        // ─── PC: 테이블 ───────────────────────────────
        <View className="flex-1">
          <HStack
            style={{ borderBottomColor: theme.border.default, backgroundColor: theme.bg.surfaceAlt }}
            className="items-center px-4 py-3 border-b"
          >
            <Text style={{ color: theme.text.muted }} className="w-20 text-left text-[13px]">구분</Text>
            <Text style={{ color: theme.text.muted }} className="flex-1 px-2 text-[13px]">제목</Text>
            <Text style={{ color: theme.text.muted }} className="w-[100px] text-[13px]">작성자</Text>
            <Text style={{ color: theme.text.muted }} className="w-[140px] text-[13px]">작성일</Text>
            <Text style={{ color: theme.text.muted }} className="w-[60px] text-right text-[13px]">조회</Text>
            <Text style={{ color: theme.text.muted }} className="w-[60px] text-right text-[13px]">댓글</Text>
          </HStack>
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
                  style={{
                    borderBottomColor: theme.border.subtle,
                    backgroundColor: isNotice ? NTC_ROW_BG : 'transparent',
                  }}
                  className="flex-row items-center px-4 py-3 border-b"
                >
                  <View className="w-20 items-start">
                    {isNotice ? (
                      <View style={{ backgroundColor: NTC_BADGE_BG }} className="px-2 py-0.5 rounded">
                        <Text className="text-[11px] text-white font-bold">공지</Text>
                      </View>
                    ) : (
                      <Text style={{ color: theme.text.subtle }} className="text-[12px]">일반</Text>
                    )}
                  </View>
                  <Text
                    style={{ color: theme.text.primary, fontWeight: isNotice ? '600' : '500' }}
                    className="flex-1 px-2 text-[14px]"
                    numberOfLines={1}
                  >
                    {item.pstTtl}
                  </Text>
                  <Text style={{ color: theme.text.body }} className="w-[100px] text-[12px]">
                    {item.userId}
                  </Text>
                  <Text style={{ color: theme.text.muted }} className="w-[140px] text-[12px]">
                    {formatDate(item.crtAt)}
                  </Text>
                  <Text style={{ color: theme.text.muted }} className="w-[60px] text-[12px] text-right">
                    {item.qryCnt}
                  </Text>
                  <Text style={{ color: theme.text.muted }} className="w-[60px] text-[12px] text-right">
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
    <View style={{ backgroundColor: theme.bg.app }} className="flex-1">
      <TouchableOpacity
        onPress={onCancel}
        activeOpacity={0.7}
        style={{ borderBottomColor: theme.border.subtle }}
        className="px-4 py-3 border-b"
      >
        <Text style={{ color: theme.brand.primary }} className="text-[14px] font-medium">
          ← 취소
        </Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text style={{ color: theme.text.primary }} className="text-[20px] font-semibold mb-4">
          {isEdit ? '글 수정' : '글 작성'} · {boardName}
        </Text>

        <VStack className="gap-1.5 mb-4">
          <Text style={{ color: theme.text.muted }} className="text-[13px] font-medium">제목 *</Text>
          <Input
            style={{
              borderColor: theme.border.default,
              backgroundColor: theme.bg.surface,
            }}
            className="h-10 border rounded-lg"
          >
            <InputField
              style={{ color: theme.text.primary }}
              className="text-[14px] px-3 placeholder:text-[14px]"
              value={title}
              onChangeText={onTitleChange}
              placeholder="제목을 입력하세요"
              placeholderTextColor={theme.text.subtle}
            />
          </Input>
        </VStack>

        <VStack className="gap-1.5 mb-4">
          <Text style={{ color: theme.text.muted }} className="text-[13px] font-medium">본문 *</Text>
          <Textarea
            style={{
              borderColor: theme.border.default,
              backgroundColor: theme.bg.surface,
            }}
            className="h-[200px] border rounded-lg"
          >
            <TextareaInput
              style={{ color: theme.text.primary }}
              className="text-[14px] p-3 placeholder:text-[14px]"
              value={content}
              onChangeText={onContentChange}
              placeholder="내용을 입력하세요"
              placeholderTextColor={theme.text.subtle}
              multiline
              numberOfLines={10}
            />
          </Textarea>
        </VStack>

        <TouchableOpacity
          onPress={() => onNoticeChange(!notice)}
          activeOpacity={0.7}
          className="flex-row items-center gap-2 py-2"
        >
          <View
            style={
              notice
                ? { borderColor: theme.brand.primary, backgroundColor: theme.brand.primary }
                : { borderColor: theme.border.strong, backgroundColor: 'transparent' }
            }
            className="w-5 h-5 border-[1.5px] rounded items-center justify-center"
          >
            {notice && <Text className="text-white text-[12px] font-bold">✓</Text>}
          </View>
          <Text style={{ color: theme.text.body }} className="text-[14px]">
            공지로 등록 (상단 고정)
          </Text>
        </TouchableOpacity>

        {/* 첨부 영역 */}
        <VStack className="gap-1.5 mb-4">
          <HStack className="items-center justify-between mb-1.5">
            <Text style={{ color: theme.text.muted }} className="text-[13px] font-medium">첨부 파일</Text>
            <TouchableOpacity
              onPress={handlePickFiles}
              activeOpacity={0.7}
              style={{ borderColor: theme.border.default, backgroundColor: theme.bg.surface }}
              className="px-3 py-1.5 border rounded-lg"
            >
              <Text style={{ color: theme.brand.primary }} className="text-[13px] font-semibold">
                + 파일 선택
              </Text>
            </TouchableOpacity>
          </HStack>

          {existingFiles.length === 0 && pendingAttachments.length === 0 ? (
            <Text style={{ color: theme.text.subtle }} className="text-[12px] py-2">
              첨부된 파일이 없습니다.
            </Text>
          ) : (
            <View
              style={{ borderColor: theme.border.subtle, backgroundColor: theme.bg.surface }}
              className="border rounded-lg overflow-hidden"
            >
              {existingFiles.map((f) => (
                <View
                  key={`ex-${f.afileSn}`}
                  style={{ borderBottomColor: theme.border.subtle }}
                  className="flex-row items-center px-3 py-2 border-b gap-2"
                >
                  <View className="flex-1 gap-0.5">
                    <Text
                      style={{ color: theme.text.primary }}
                      className="text-[14px] font-medium"
                      numberOfLines={1}
                    >
                      {f.oriFileNm}
                    </Text>
                    <Text style={{ color: theme.text.muted }} className="text-[11px]">
                      {formatBytes(f.fileSize)} · 업로드됨
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveExisting(f)}
                    activeOpacity={0.7}
                    className="px-2 py-1"
                  >
                    <Text style={{ color: theme.semantic.danger }} className="text-[13px] font-medium">
                      삭제
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
              {pendingAttachments.map((f, idx) => (
                <View
                  key={`pn-${idx}-${f.name}`}
                  style={{ borderBottomColor: theme.border.subtle }}
                  className="flex-row items-center px-3 py-2 border-b gap-2"
                >
                  <View className="flex-1 gap-0.5">
                    <Text
                      style={{ color: theme.text.primary }}
                      className="text-[14px] font-medium"
                      numberOfLines={1}
                    >
                      {f.name}
                    </Text>
                    <Text style={{ color: theme.brand.primary }} className="text-[11px]">
                      {formatBytes(f.size)} · 업로드 대기
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onRemovePending(idx)}
                    activeOpacity={0.7}
                    className="px-2 py-1"
                  >
                    <Text style={{ color: theme.text.muted }} className="text-[13px] font-medium">
                      제거
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </VStack>

        <HStack className="gap-3 mt-4">
          <TouchableOpacity
            onPress={onSave}
            activeOpacity={0.8}
            disabled={saving}
            style={saving ? { backgroundColor: theme.brand.primary, opacity: 0.6 } : { backgroundColor: theme.brand.primary }}
            className="flex-1 h-11 rounded-lg items-center justify-center"
          >
            {saving ? (
              <ActivityIndicator color={theme.text.onBrand} size="small" />
            ) : (
              <Text style={{ color: theme.text.onBrand }} className="text-[14px] font-semibold">
                {isEdit ? '수정 완료' : '등록'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onCancel}
            activeOpacity={0.8}
            style={{ borderColor: theme.border.default }}
            className="flex-1 h-11 rounded-lg border items-center justify-center"
          >
            <Text style={{ color: theme.text.body }} className="text-[14px] font-medium">취소</Text>
          </TouchableOpacity>
        </HStack>
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
    <View style={{ backgroundColor: theme.bg.app }} className="flex-1">
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.7}
        style={{ borderBottomColor: theme.border.subtle }}
        className="px-4 py-3 border-b"
      >
        <Text style={{ color: theme.brand.primary }} className="text-[14px] font-medium">
          ← 목록으로
        </Text>
      </TouchableOpacity>

      {isLoading ? (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator color={theme.brand.primary} />
        </View>
      ) : error || !post ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text style={{ color: theme.semantic.danger }} className="text-[14px]">
            게시글을 불러오지 못했습니다.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          {/* 헤더 */}
          <VStack className="gap-3 pb-4">
            <HStack className="justify-between items-center">
              <View
                style={{ backgroundColor: theme.brand.primaryTint }}
                className="px-3 py-1 rounded-full"
              >
                <Text style={{ color: theme.brand.primary }} className="text-[11px] font-semibold">
                  {post.ntcYn === 'Y' ? '공지' : boardName}
                </Text>
              </View>
              <HStack className="gap-3">
                <Text style={{ color: theme.text.muted }} className="text-[12px]">
                  조회 {post.qryCnt}
                </Text>
                <Text style={{ color: theme.text.muted }} className="text-[12px]">
                  좋아요 {post.likeNum}
                </Text>
              </HStack>
            </HStack>
            <Text style={{ color: theme.text.primary }} className="text-[20px] font-bold leading-7">
              {post.pstTtl}
            </Text>
            <HStack className="items-center gap-3">
              <View
                style={{ backgroundColor: theme.brand.primaryTint }}
                className="w-9 h-9 rounded-full items-center justify-center"
              >
                <Text style={{ color: theme.brand.primary }} className="text-[14px] font-bold">
                  {(post.userId ?? '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={{ color: theme.text.primary }} className="text-[14px] font-medium">
                  {post.userId}
                </Text>
                <Text style={{ color: theme.text.muted }} className="text-[12px]">
                  {formatDate(post.crtAt)}
                </Text>
              </View>
            </HStack>
          </VStack>

          {/* 본문 */}
          <Text style={{ color: theme.text.body }} className="text-[14px] leading-6 py-4">
            {post.pstDesc}
          </Text>

          {/* 첨부 영역 */}
          {attachments.length > 0 && (
            <VStack
              style={{ borderColor: theme.border.subtle, backgroundColor: theme.bg.surface }}
              className="border rounded-lg p-4 gap-2"
            >
              <Text style={{ color: theme.text.muted }} className="text-[12px] font-semibold mb-1">
                첨부 파일 {attachments.length}
              </Text>
              {attachments.map((f) => {
                const previewable = isImageExt(f.fileExt) || isPdfExt(f.fileExt);
                return (
                  <HStack
                    key={`atc-${f.afileSn}`}
                    style={{ borderTopColor: theme.border.subtle }}
                    className="items-center justify-between py-2 border-t gap-2"
                  >
                    <View className="flex-1 gap-0.5">
                      <Text
                        style={{ color: theme.text.primary }}
                        className="text-[14px] font-medium"
                        numberOfLines={1}
                      >
                        [{(f.fileExt ?? '').toUpperCase()}] {f.oriFileNm}
                      </Text>
                      <Text style={{ color: theme.text.muted }} className="text-[11px]">
                        {formatBytes(f.fileSize)}
                      </Text>
                    </View>
                    <HStack className="gap-1.5">
                      {previewable && (
                        <TouchableOpacity
                          onPress={() => setPreviewFile(f)}
                          activeOpacity={0.7}
                          style={{ borderColor: theme.border.default }}
                          className="px-2 py-1.5 border rounded-md"
                        >
                          <Text
                            style={{ color: theme.brand.primary }}
                            className="text-[11px] font-semibold"
                          >
                            미리보기
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleDownload(f)}
                        activeOpacity={0.7}
                        style={{ borderColor: theme.border.default }}
                        className="px-2 py-1.5 border rounded-md"
                      >
                        <Text style={{ color: theme.text.body }} className="text-[11px] font-semibold">
                          다운로드
                        </Text>
                      </TouchableOpacity>
                    </HStack>
                  </HStack>
                );
              })}
            </VStack>
          )}

          {/* 액션 row */}
          <HStack style={{ borderTopColor: theme.border.subtle }} className="gap-2 pt-4 border-t">
            <TouchableOpacity
              onPress={handleLike}
              activeOpacity={0.7}
              disabled={likePost.isPending}
              style={{ borderColor: theme.border.default }}
              className="px-4 py-2 border rounded-lg"
            >
              <Text style={{ color: theme.text.body }} className="text-[12px] font-medium">
                좋아요 {post.likeNum}
              </Text>
            </TouchableOpacity>
            {canEdit && (
              <TouchableOpacity
                onPress={() => onEdit(post)}
                activeOpacity={0.7}
                style={{ borderColor: theme.border.default }}
                className="px-4 py-2 border rounded-lg"
              >
                <Text style={{ color: theme.text.body }} className="text-[12px] font-medium">수정</Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                onPress={() => onDelete(post)}
                activeOpacity={0.7}
                style={{ borderColor: theme.semantic.danger }}
                className="px-4 py-2 border rounded-lg"
              >
                <Text style={{ color: theme.semantic.danger }} className="text-[12px] font-medium">삭제</Text>
              </TouchableOpacity>
            )}
          </HStack>

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
    <VStack style={{ borderTopColor: theme.border.subtle }} className="mt-6 pt-4 border-t gap-2">
      <Text style={{ color: theme.text.primary }} className="text-[14px] font-semibold mb-2">
        댓글 {comments.length}
      </Text>

      {isLoading ? (
        <ActivityIndicator color={theme.brand.primary} size="small" className="my-3" />
      ) : tree.length === 0 ? (
        <Text style={{ color: theme.text.muted }} className="text-[12px] p-4 text-center">
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
              <VStack
                key={`r-${r.cmtSn}`}
                style={{ borderLeftColor: theme.brand.primaryTint }}
                className="ml-8 border-l-2 pl-3"
              >
                <HStack className="items-center gap-1 mt-2">
                  <Text style={{ color: theme.text.muted }} className="text-[14px]">↳</Text>
                  <Text style={{ color: theme.text.muted }} className="text-[11px]">
                    @{comment.userId}에게
                  </Text>
                </HStack>
                <CommentItem
                  comment={r}
                  currentUserId={currentUserId}
                  isAdminMode={isAdminMode}
                  theme={theme}
                  onDelete={() => handleDelete(r)}
                />
              </VStack>
            ))}
            {replyTo?.cmtSn === comment.cmtSn && (
              <VStack
                style={{ borderColor: theme.border.default, backgroundColor: theme.bg.surface }}
                className="ml-8 mt-2 border rounded-lg p-3"
              >
                <TextInput
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder={`@${comment.userId}에게 답글`}
                  placeholderTextColor={theme.text.subtle}
                  multiline
                  style={{ color: theme.text.primary }}
                  className="min-h-[56px] text-[12px] p-2"
                />
                <HStack className="justify-end gap-2 mt-2">
                  <TouchableOpacity
                    onPress={() => {
                      setReplyTo(null);
                      setReplyText('');
                    }}
                    style={{ borderColor: theme.border.default }}
                    className="px-3 py-1.5 border rounded-md"
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: theme.text.muted }} className="text-[12px]">
                      취소
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleReply}
                    disabled={createComment.isPending}
                    style={{ backgroundColor: theme.brand.primary }}
                    className="px-3 py-1.5 rounded-md"
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: theme.text.onBrand }} className="text-[12px] font-semibold">
                      답글 등록
                    </Text>
                  </TouchableOpacity>
                </HStack>
              </VStack>
            )}
          </View>
        ))
      )}

      {/* 새 댓글 입력 */}
      <VStack
        style={{ borderColor: theme.border.default, backgroundColor: theme.bg.surface }}
        className="mt-4 border rounded-lg p-3"
      >
        <TextInput
          value={newComment}
          onChangeText={setNewComment}
          placeholder="댓글을 입력하세요"
          placeholderTextColor={theme.text.subtle}
          multiline
          style={{ color: theme.text.primary }}
          className="min-h-[64px] text-[14px] p-2"
        />
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={createComment.isPending || !newComment.trim()}
          activeOpacity={0.7}
          style={
            createComment.isPending || !newComment.trim()
              ? { backgroundColor: theme.brand.primary, opacity: 0.5 }
              : { backgroundColor: theme.brand.primary }
          }
          className="self-end px-4 py-2 rounded-md mt-2"
        >
          <Text style={{ color: theme.text.onBrand }} className="text-[12px] font-semibold">
            등록
          </Text>
        </TouchableOpacity>
      </VStack>
    </VStack>
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
    <VStack style={{ borderBottomColor: theme.border.subtle }} className="py-3 border-b gap-1">
      <HStack className="items-center gap-3">
        <Text style={{ color: theme.text.primary }} className="text-[12px] font-semibold">
          {comment.userId}
        </Text>
        <Text style={{ color: theme.text.muted }} className="text-[11px]">
          {formatDate(comment.crtAt)}
        </Text>
      </HStack>
      <Text style={{ color: theme.text.body }} className="text-[14px] leading-[21px]">
        {comment.cmtDesc}
      </Text>
      <HStack className="gap-4 mt-1">
        {onReply && (
          <TouchableOpacity onPress={onReply} activeOpacity={0.7}>
            <Text style={{ color: theme.brand.primary }} className="text-[11px] font-medium">
              답글
            </Text>
          </TouchableOpacity>
        )}
        {canDelete && (
          <TouchableOpacity onPress={onDelete} activeOpacity={0.7}>
            <Text style={{ color: theme.semantic.danger }} className="text-[11px] font-medium">
              삭제
            </Text>
          </TouchableOpacity>
        )}
      </HStack>
    </VStack>
  );
}
