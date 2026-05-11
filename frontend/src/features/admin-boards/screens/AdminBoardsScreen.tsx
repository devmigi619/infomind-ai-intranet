import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Plus, X, Pencil, EyeOff, Eye } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useCodeList } from '../../../shared/hooks/useCodeList';
import { useConfirm } from '../../../shared/hooks/useConfirm';
import { AppDropdown } from '../../../shared/components/AppDropdown';
import {
  useAdminBoards,
  useCreateBoard,
  useUpdateBoard,
  useDisableBoard,
  useEnableBoard,
  type AdminBoard,
  type CreateBoardRequest,
  type UpdateBoardRequest,
} from '../api';
import { useDepartments } from '../../admin-dept/api';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

type ModalMode = 'create' | 'edit' | null;

interface CreateForm {
  brdId: string;
  brdSe: string;
  brdNm: string;
  brdDesc: string;
  deptCd: string;
  ord: string;
  fileUseYn: string;
  cmtUseYn: string;
}
interface EditForm {
  brdSe: string;
  brdNm: string;
  brdDesc: string;
  deptCd: string;
  ord: string;
  fileUseYn: string;
  cmtUseYn: string;
}

const EMPTY_CREATE: CreateForm = {
  brdId: '', brdSe: '', brdNm: '', brdDesc: '', deptCd: '',
  ord: '', fileUseYn: 'Y', cmtUseYn: 'Y',
};
const EMPTY_EDIT: EditForm = {
  brdSe: '', brdNm: '', brdDesc: '', deptCd: '',
  ord: '', fileUseYn: 'Y', cmtUseYn: 'Y',
};

// ─── 메인 화면 ───────────────────────────────────────────────────────────────

export function AdminBoardsScreen() {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { width } = useWindowDimensions();
  const confirm = useConfirm();

  const { data: boards = [], isLoading } = useAdminBoards();
  const { data: depts = [] } = useDepartments();
  const brdSeOptions = useCodeList('BRD_SE');

  const createBoard  = useCreateBoard();
  const updateBoard  = useUpdateBoard();
  const disableBoard = useDisableBoard();
  const enableBoard  = useEnableBoard();

  const [modalMode, setModalMode]         = useState<ModalMode>(null);
  const [selectedBoard, setSelectedBoard] = useState<AdminBoard | null>(null);
  const [createForm, setCreateForm]       = useState<CreateForm>(EMPTY_CREATE);
  const [editForm, setEditForm]           = useState<EditForm>(EMPTY_EDIT);

  const modalWidth = Math.min(480, width - 32);
  const isSaving   = createBoard.isPending || updateBoard.isPending;

  // ─── 옵션 목록 ────────────────────────────────────────────────────────────

  const deptOptions = [
    { label: '전체 공개', value: '' },
    ...depts.filter(d => d.useYn === 'Y').map(d => ({ label: d.deptNm, value: d.deptCd })),
  ];

  // ─── 라벨 헬퍼 ────────────────────────────────────────────────────────────

  const brdSeLabel = (cd: string | null) =>
    cd ? (brdSeOptions.find(o => o.value === cd)?.label ?? cd) : '-';
  const deptLabel = (cd: string | null) =>
    cd ? (depts.find(d => d.deptCd === cd)?.deptNm ?? cd) : '전체 공개';

  // ─── 열기 ─────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setCreateForm({
      ...EMPTY_CREATE,
      brdSe: brdSeOptions[0]?.value ?? '',
    });
    setModalMode('create');
  };

  const openEdit = (b: AdminBoard) => {
    setSelectedBoard(b);
    setEditForm({
      brdSe: b.brdSe ?? '',
      brdNm: b.brdNm ?? '',
      brdDesc: b.brdDesc ?? '',
      deptCd: b.deptCd ?? '',
      ord: b.ord != null ? String(b.ord) : '',
      fileUseYn: b.fileUseYn ?? 'Y',
      cmtUseYn: b.cmtUseYn ?? 'Y',
    });
    setModalMode('edit');
  };

  const closeModal = () => { setModalMode(null); setSelectedBoard(null); };

  // ─── 저장 ─────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createForm.brdId.trim()) return Alert.alert('오류', '게시판 ID를 입력해주세요.');
    if (!createForm.brdSe.trim()) return Alert.alert('오류', '게시판 구분을 선택해주세요.');
    if (!createForm.brdNm.trim()) return Alert.alert('오류', '게시판 이름을 입력해주세요.');
    try {
      const req: CreateBoardRequest = {
        brdId:     createForm.brdId.trim(),
        brdSe:     createForm.brdSe,
        brdNm:     createForm.brdNm.trim(),
        brdDesc:   createForm.brdDesc.trim() || undefined,
        deptCd:    createForm.deptCd || undefined,
        ord:       createForm.ord ? Number(createForm.ord) : undefined,
        fileUseYn: createForm.fileUseYn,
        cmtUseYn:  createForm.cmtUseYn,
      };
      await createBoard.mutateAsync(req);
      closeModal();
    } catch (e: unknown) { Alert.alert('오류', e instanceof Error ? e.message : '생성 실패'); }
  };

  const handleUpdate = async () => {
    if (!editForm.brdNm.trim()) return Alert.alert('오류', '게시판 이름을 입력해주세요.');
    try {
      const req: UpdateBoardRequest = {
        brdSe:     editForm.brdSe || undefined,
        brdNm:     editForm.brdNm.trim(),
        brdDesc:   editForm.brdDesc.trim() || undefined,
        deptCd:    editForm.deptCd || undefined,
        ord:       editForm.ord ? Number(editForm.ord) : undefined,
        fileUseYn: editForm.fileUseYn,
        cmtUseYn:  editForm.cmtUseYn,
      };
      await updateBoard.mutateAsync({ brdId: selectedBoard!.brdId, data: req });
      closeModal();
    } catch (e: unknown) { Alert.alert('오류', e instanceof Error ? e.message : '수정 실패'); }
  };

  const handleDisable = async (b: AdminBoard) => {
    const ok = await confirm({
      title: '게시판 비활성화',
      message: `'${b.brdNm ?? b.brdId}' 게시판을 비활성화하시겠습니까?`,
      confirmText: '비활성화',
      danger: true,
    });
    if (!ok) return;
    disableBoard.mutate(b.brdId);
  };

  const handleEnable = async (b: AdminBoard) => {
    const ok = await confirm({
      title: '게시판 활성화',
      message: `'${b.brdNm ?? b.brdId}' 게시판을 활성화하시겠습니까?`,
      confirmText: '활성화',
    });
    if (!ok) return;
    enableBoard.mutate(b.brdId);
  };

  // ─── 폼 필드 ──────────────────────────────────────────────────────────────

  const renderField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { placeholder?: string; required?: boolean; readOnly?: boolean; multiline?: boolean; keyboardType?: 'default' | 'numeric'; autoCapitalize?: 'characters' | 'none' }
  ) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
        {label}{opts?.required && <Text style={{ color: '#EF4444' }}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          opts?.multiline && styles.inputMultiline,
          {
            color: theme.text.primary,
            borderColor: theme.border.default,
            backgroundColor: opts?.readOnly ? theme.bg.surfaceAlt : theme.bg.surface,
            fontFamily: WEB_FONT,
          },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={opts?.placeholder ?? ''}
        placeholderTextColor={theme.text.muted}
        editable={!opts?.readOnly}
        multiline={opts?.multiline}
        keyboardType={opts?.keyboardType ?? 'default'}
        autoCapitalize={opts?.autoCapitalize ?? 'none'}
      />
    </View>
  );

  // ─── 토글 (Y/N) ───────────────────────────────────────────────────────────

  const renderToggle = (label: string, value: string, onChange: (v: string) => void) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>{label}</Text>
      <View style={styles.toggleRow}>
        {(['Y', 'N'] as const).map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => onChange(v)}
            style={[
              styles.toggleBtn,
              { borderColor: theme.border.default },
              value === v && { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.toggleBtnText,
              { color: value === v ? '#fff' : theme.text.body, fontFamily: WEB_FONT },
            ]}>
              {v === 'Y' ? '사용' : '미사용'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ─── 모달 ─────────────────────────────────────────────────────────────────

  const renderModal = () => {
    if (!modalMode) return null;

    const title = modalMode === 'create' ? '게시판 등록' : '게시판 수정';

    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { width: modalWidth, backgroundColor: theme.bg.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border.subtle }]}>
              <Text style={[styles.modalTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
                {title}
              </Text>
              <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
                <X size={18} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* ── 등록 폼 ── */}
              {modalMode === 'create' && (
                <>
                  {renderField('게시판 ID', createForm.brdId,
                    v => setCreateForm(f => ({ ...f, brdId: v })),
                    { required: true, placeholder: '영문 대문자/숫자/_ (예: NOTICE_GENERAL)', autoCapitalize: 'characters' })}
                  <AppDropdown
                    label="게시판 구분"
                    required
                    value={createForm.brdSe}
                    onChange={v => setCreateForm(f => ({ ...f, brdSe: v }))}
                    options={brdSeOptions}
                  />
                  {renderField('게시판 이름', createForm.brdNm,
                    v => setCreateForm(f => ({ ...f, brdNm: v })),
                    { required: true })}
                  {renderField('설명', createForm.brdDesc,
                    v => setCreateForm(f => ({ ...f, brdDesc: v })),
                    { placeholder: '게시판 설명', multiline: true })}
                  <AppDropdown
                    label="부서"
                    value={createForm.deptCd}
                    onChange={v => setCreateForm(f => ({ ...f, deptCd: v }))}
                    options={deptOptions}
                    search={deptOptions.length > 6}
                  />
                  {renderField('정렬 순서', createForm.ord,
                    v => setCreateForm(f => ({ ...f, ord: v.replace(/\D/g, '') })),
                    { placeholder: '숫자', keyboardType: 'numeric' })}
                  {renderToggle('파일 첨부', createForm.fileUseYn,
                    v => setCreateForm(f => ({ ...f, fileUseYn: v })))}
                  {renderToggle('댓글', createForm.cmtUseYn,
                    v => setCreateForm(f => ({ ...f, cmtUseYn: v })))}
                  <TouchableOpacity onPress={handleCreate} disabled={isSaving}
                    style={[styles.primaryBtn, { backgroundColor: theme.brand.primary }, isSaving && styles.btnDisabled]}
                    activeOpacity={0.8}>
                    {isSaving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={[styles.primaryBtnText, { fontFamily: WEB_FONT }]}>등록</Text>}
                  </TouchableOpacity>
                </>
              )}

              {/* ── 수정 폼 ── */}
              {modalMode === 'edit' && (
                <>
                  {renderField('게시판 ID', selectedBoard?.brdId ?? '', () => {}, { readOnly: true })}
                  <AppDropdown
                    label="게시판 구분"
                    value={editForm.brdSe}
                    onChange={v => setEditForm(f => ({ ...f, brdSe: v }))}
                    options={brdSeOptions}
                  />
                  {renderField('게시판 이름', editForm.brdNm,
                    v => setEditForm(f => ({ ...f, brdNm: v })),
                    { required: true })}
                  {renderField('설명', editForm.brdDesc,
                    v => setEditForm(f => ({ ...f, brdDesc: v })),
                    { placeholder: '게시판 설명', multiline: true })}
                  <AppDropdown
                    label="부서"
                    value={editForm.deptCd}
                    onChange={v => setEditForm(f => ({ ...f, deptCd: v }))}
                    options={deptOptions}
                    search={deptOptions.length > 6}
                  />
                  {renderField('정렬 순서', editForm.ord,
                    v => setEditForm(f => ({ ...f, ord: v.replace(/\D/g, '') })),
                    { placeholder: '숫자', keyboardType: 'numeric' })}
                  {renderToggle('파일 첨부', editForm.fileUseYn,
                    v => setEditForm(f => ({ ...f, fileUseYn: v })))}
                  {renderToggle('댓글', editForm.cmtUseYn,
                    v => setEditForm(f => ({ ...f, cmtUseYn: v })))}
                  <TouchableOpacity onPress={handleUpdate} disabled={isSaving}
                    style={[styles.primaryBtn, { backgroundColor: theme.brand.primary }, isSaving && styles.btnDisabled]}
                    activeOpacity={0.8}>
                    {isSaving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={[styles.primaryBtnText, { fontFamily: WEB_FONT }]}>저장</Text>}
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity onPress={closeModal}
                style={[styles.cancelBtn, { borderColor: theme.border.default }]}
                activeOpacity={0.7}>
                <Text style={[styles.cancelBtnText, { color: theme.text.body, fontFamily: WEB_FONT }]}>취소</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ─── 관리 버튼 ────────────────────────────────────────────────────────────

  const renderActions = (b: AdminBoard) => (
    <View style={styles.actionRow}>
      <TouchableOpacity onPress={() => openEdit(b)}
        style={[styles.iconBtn, { backgroundColor: theme.brand.primaryTint }]} activeOpacity={0.7}>
        <Pencil size={13} color={theme.brand.primary} />
      </TouchableOpacity>
      {b.useYn === 'Y' ? (
        <TouchableOpacity onPress={() => handleDisable(b)}
          style={[styles.iconBtn, { backgroundColor: '#FEF2F2' }]} activeOpacity={0.7}>
          <EyeOff size={13} color="#EF4444" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => handleEnable(b)}
          style={[styles.iconBtn, { backgroundColor: '#ECFDF5' }]} activeOpacity={0.7}>
          <Eye size={13} color="#10B981" />
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── 데스크탑 테이블 ──────────────────────────────────────────────────────

  const renderTable = () => (
    <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.tableHeader, { backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.default }]}>
        {[
          { label: 'ID',     flex: 1.4 },
          { label: '구분',   flex: 0.8 },
          { label: '이름',   flex: 1.5 },
          { label: '부서',   flex: 1   },
          { label: '순서',   flex: 0.5 },
          { label: '파일',   flex: 0.5 },
          { label: '댓글',   flex: 0.5 },
          { label: '상태',   flex: 0.6 },
          { label: '관리',   flex: 0.8 },
        ].map((h) => (
          <Text key={h.label} style={[styles.th, { color: theme.text.subtle, fontFamily: WEB_FONT, flex: h.flex }]}>
            {h.label}
          </Text>
        ))}
      </View>
      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.brand.primary} /></View>
      ) : boards.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>
            등록된 게시판이 없습니다.
          </Text>
        </View>
      ) : boards.map((b, idx) => {
        const isActive = b.useYn === 'Y';
        return (
          <View key={b.brdId} style={[styles.tableRow,
            { borderBottomColor: theme.border.subtle },
            idx % 2 === 1 && { backgroundColor: theme.bg.surfaceAlt }]}>
            <Text style={[styles.td, { flex: 1.4, color: theme.text.primary, fontFamily: WEB_FONT }]} numberOfLines={1}>{b.brdId}</Text>
            <Text style={[styles.td, { flex: 0.8, color: theme.text.body,    fontFamily: WEB_FONT }]} numberOfLines={1}>{brdSeLabel(b.brdSe)}</Text>
            <Text style={[styles.td, { flex: 1.5, color: theme.text.primary, fontFamily: WEB_FONT }]} numberOfLines={1}>{b.brdNm ?? '-'}</Text>
            <Text style={[styles.td, { flex: 1,   color: theme.text.body,    fontFamily: WEB_FONT }]} numberOfLines={1}>{deptLabel(b.deptCd)}</Text>
            <Text style={[styles.td, { flex: 0.5, color: theme.text.body,    fontFamily: WEB_FONT }]} numberOfLines={1}>{b.ord ?? '-'}</Text>
            <Text style={[styles.td, { flex: 0.5, color: theme.text.body,    fontFamily: WEB_FONT }]} numberOfLines={1}>{b.fileUseYn === 'Y' ? '○' : '×'}</Text>
            <Text style={[styles.td, { flex: 0.5, color: theme.text.body,    fontFamily: WEB_FONT }]} numberOfLines={1}>{b.cmtUseYn === 'Y' ? '○' : '×'}</Text>
            <View style={[styles.td, { flex: 0.6 }]}>
              <View style={[styles.badge,
                { backgroundColor: isActive ? '#ECFDF5' : '#F3F4F6' }]}>
                <Text style={[styles.badgeText, { color: isActive ? '#065F46' : '#6B7280', fontFamily: WEB_FONT }]}>
                  {isActive ? '활성' : '비활성'}
                </Text>
              </View>
            </View>
            <View style={[styles.td, { flex: 0.8 }]}>{renderActions(b)}</View>
          </View>
        );
      })}
    </ScrollView>
  );

  // ─── 모바일 카드 ──────────────────────────────────────────────────────────

  const renderCards = () => (
    <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent}
      showsVerticalScrollIndicator={false}>
      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.brand.primary} /></View>
      ) : boards.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>
            등록된 게시판이 없습니다.
          </Text>
        </View>
      ) : boards.map((b) => {
        const isActive = b.useYn === 'Y';
        return (
          <View key={b.brdId} style={[styles.card,
            { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: theme.text.primary, fontFamily: WEB_FONT }]}>{b.brdNm ?? '-'}</Text>
                <Text style={[styles.cardId,   { color: theme.text.muted,   fontFamily: WEB_FONT }]}>{b.brdId}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: isActive ? '#ECFDF5' : '#F3F4F6' }]}>
                <Text style={[styles.badgeText, { color: isActive ? '#065F46' : '#6B7280', fontFamily: WEB_FONT }]}>
                  {isActive ? '활성' : '비활성'}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardMeta, { color: theme.text.body, fontFamily: WEB_FONT }]}>
              {[brdSeLabel(b.brdSe), deptLabel(b.deptCd)].filter(v => v !== '-').join(' · ')}
            </Text>
            <View style={styles.cardActions}>{renderActions(b)}</View>
          </View>
        );
      })}
    </ScrollView>
  );

  // ─── 렌더 ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.app }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
          게시판 관리
        </Text>
        <TouchableOpacity onPress={openCreate}
          style={[styles.addBtn, { backgroundColor: theme.brand.primary }]} activeOpacity={0.8}>
          <Plus size={14} color="#fff" />
          <Text style={[styles.addBtnText, { fontFamily: WEB_FONT }]}>게시판 추가</Text>
        </TouchableOpacity>
      </View>

      {/* 목록 */}
      {isMobile ? renderCards() : renderTable()}

      {/* 모달 */}
      {renderModal()}
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // 검색
  searchBar: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    gap: 8, paddingHorizontal: 16, paddingVertical: 10,
  },
  searchInputWrap: {
    flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center',
    gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, height: 36,
  },
  searchInput: { flex: 1, fontSize: 13 },
  filterRow: { flexDirection: 'row', gap: 6 },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1,
  },
  filterBtnText: { fontSize: 12, fontWeight: '500' },

  // 데스크탑 테이블
  tableScroll: { flex: 1 },
  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  th: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  td: { fontSize: 13, alignItems: 'flex-start', justifyContent: 'center' },

  // 모바일 카드
  cardScroll: { flex: 1 },
  cardContent: { padding: 12, gap: 10 },
  card: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { gap: 2 },
  cardName: { fontSize: 14, fontWeight: '600' },
  cardId:   { fontSize: 12 },
  cardMeta: { fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },

  // 배지
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },

  // 관리 버튼
  actionRow: { flexDirection: 'row', gap: 6 },
  iconBtn:   { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  // 모달
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { borderRadius: 16, overflow: 'hidden', maxHeight: '85%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 15, fontWeight: '600' },
  modalBody:  { padding: 20, gap: 14 },

  // 폼
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '500' },
  input: { height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 13 },
  inputMultiline: { height: 72, paddingTop: 10, textAlignVertical: 'top' },

  // 토글
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1, height: 36, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleBtnText: { fontSize: 13, fontWeight: '500' },

  // 버튼
  primaryBtn: {
    height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnDisabled:    { opacity: 0.6 },
  cancelBtn: {
    height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  cancelBtnText: { fontSize: 14 },

  // 기타
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 13 },
});
