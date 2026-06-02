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
import { Plus, X, Pencil, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useConfirm } from '../../../shared/hooks/useConfirm';
import { AppDropdown } from '../../../shared/components/AppDropdown';
import { useCommonCodes } from '../../admin-common-code/api';
import {
  useAdminAprvForms,
  useCreateAprvForm,
  useUpdateAprvForm,
  useDeleteAprvForm,
  type AprvFormSummary,
  type AprvFormDtlItem,
} from '../api';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

type ModalMode = 'create' | 'edit' | null;

interface DtlRow {
  aprvRefCd: string;
  aprvRefNm: string;
  aprvRefSe: string;
  reqdYn: string;
}

interface CreateForm {
  aprvFormId: string;
  aprvFormNm: string;
  fileYn: string;
  rmk: string;
  dtls: DtlRow[];
}

interface EditForm {
  aprvFormNm: string;
  fileYn: string;
  rmk: string;
  dtls: DtlRow[];
}

const EMPTY_DTL: DtlRow = { aprvRefCd: '', aprvRefNm: '', aprvRefSe: 'TEXT', reqdYn: 'N' };

const EMPTY_CREATE: CreateForm = {
  aprvFormId: '', aprvFormNm: '', fileYn: 'N', rmk: '', dtls: [],
};

const EMPTY_EDIT: EditForm = {
  aprvFormNm: '', fileYn: 'N', rmk: '', dtls: [],
};

// ─── 메인 화면 ───────────────────────────────────────────────────────────────

export function AdminAprvFormScreen() {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { width } = useWindowDimensions();
  const confirm = useConfirm();

  const { data: forms = [], isLoading } = useAdminAprvForms();
  const { data: refSeCodes = [] } = useCommonCodes('APRV_REF_SE');

  const createForm_  = useCreateAprvForm();
  const updateForm_  = useUpdateAprvForm();
  const deleteForm_  = useDeleteAprvForm();

  const [modalMode, setModalMode]           = useState<ModalMode>(null);
  const [selectedForm, setSelectedForm]     = useState<AprvFormSummary | null>(null);
  const [createForm, setCreateForm]         = useState<CreateForm>(EMPTY_CREATE);
  const [editForm, setEditForm]             = useState<EditForm>(EMPTY_EDIT);
  const [loadingDetail, setLoadingDetail]   = useState(false);

  const modalWidth  = Math.min(560, width - 32);
  const isSaving    = createForm_.isPending || updateForm_.isPending;

  // APRV_REF_SE 드롭다운 옵션 (레벨2만)
  const refSeOptions = refSeCodes
    .filter((c) => c.cdLvl === 2)
    .map((c) => ({ label: c.cdNm, value: c.cd }));

  const refSeLabel = (cd: string | null) =>
    cd ? (refSeOptions.find((o) => o.value === cd)?.label ?? cd) : '-';

  // ─── 열기 ─────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setCreateForm({ ...EMPTY_CREATE, dtls: [] });
    setModalMode('create');
  };

  const openEdit = async (f: AprvFormSummary) => {
    setSelectedForm(f);
    setLoadingDetail(true);
    setModalMode('edit');
    try {
      const { apiClient } = await import('../../../shared/api/client');
      const res = await apiClient.get(`/api/admin/aprv-forms/${f.aprvFormId}`);
      const data = res.data?.data;
      setEditForm({
        aprvFormNm: data.aprvFormNm ?? '',
        fileYn: data.fileYn ?? 'N',
        rmk: data.rmk ?? '',
        dtls: (data.dtls ?? []).map((d: AprvFormDtlItem) => ({
          aprvRefCd: d.aprvRefCd,
          aprvRefNm: d.aprvRefNm,
          aprvRefSe: d.aprvRefSe ?? 'TEXT',
          reqdYn: d.reqdYn ?? 'N',
        })),
      });
    } catch {
      Alert.alert('오류', '양식 상세 조회에 실패했습니다.');
      setModalMode(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeModal = () => { setModalMode(null); setSelectedForm(null); };

  // ─── 저장 ─────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createForm.aprvFormId.trim()) return Alert.alert('오류', '양식 ID를 입력해주세요.');
    if (!createForm.aprvFormNm.trim()) return Alert.alert('오류', '양식명을 입력해주세요.');
    for (const d of createForm.dtls) {
      if (!d.aprvRefCd.trim()) return Alert.alert('오류', '필드코드를 모두 입력해주세요.');
      if (!d.aprvRefNm.trim()) return Alert.alert('오류', '필드명을 모두 입력해주세요.');
    }
    try {
      await createForm_.mutateAsync({
        aprvFormId: createForm.aprvFormId.trim(),
        aprvFormNm: createForm.aprvFormNm.trim(),
        fileYn: createForm.fileYn,
        rmk: createForm.rmk.trim() || undefined,
        dtls: createForm.dtls.map((d) => ({
          aprvRefCd: d.aprvRefCd.trim(),
          aprvRefNm: d.aprvRefNm.trim(),
          aprvRefSe: d.aprvRefSe || null,
          reqdYn: d.reqdYn,
        })),
      });
      closeModal();
    } catch (e: unknown) { Alert.alert('오류', e instanceof Error ? e.message : '등록 실패'); }
  };

  const handleUpdate = async () => {
    if (!editForm.aprvFormNm.trim()) return Alert.alert('오류', '양식명을 입력해주세요.');
    for (const d of editForm.dtls) {
      if (!d.aprvRefCd.trim()) return Alert.alert('오류', '필드코드를 모두 입력해주세요.');
      if (!d.aprvRefNm.trim()) return Alert.alert('오류', '필드명을 모두 입력해주세요.');
    }
    try {
      await updateForm_.mutateAsync({
        aprvFormId: selectedForm!.aprvFormId,
        data: {
          aprvFormNm: editForm.aprvFormNm.trim(),
          fileYn: editForm.fileYn,
          rmk: editForm.rmk.trim() || undefined,
          dtls: editForm.dtls.map((d) => ({
            aprvRefCd: d.aprvRefCd.trim(),
            aprvRefNm: d.aprvRefNm.trim(),
            aprvRefSe: d.aprvRefSe || null,
            reqdYn: d.reqdYn,
          })),
        },
      });
      closeModal();
    } catch (e: unknown) { Alert.alert('오류', e instanceof Error ? e.message : '수정 실패'); }
  };

  const handleDelete = async (f: AprvFormSummary) => {
    const ok = await confirm({
      title: '양식 삭제',
      message: `'${f.aprvFormNm}' 양식을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      danger: true,
    });
    if (!ok) return;
    deleteForm_.mutate(f.aprvFormId);
  };

  // ─── DTL 행 편집 헬퍼 ────────────────────────────────────────────────────

  const updateCreateDtl = (idx: number, patch: Partial<DtlRow>) =>
    setCreateForm((f) => ({
      ...f,
      dtls: f.dtls.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    }));

  const updateEditDtl = (idx: number, patch: Partial<DtlRow>) =>
    setEditForm((f) => ({
      ...f,
      dtls: f.dtls.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    }));

  const addDtlRow = (mode: 'create' | 'edit') => {
    const row: DtlRow = { ...EMPTY_DTL, aprvRefSe: refSeOptions[0]?.value ?? 'TEXT' };
    if (mode === 'create') setCreateForm((f) => ({ ...f, dtls: [...f.dtls, row] }));
    else setEditForm((f) => ({ ...f, dtls: [...f.dtls, row] }));
  };

  const removeDtlRow = (mode: 'create' | 'edit', idx: number) => {
    if (mode === 'create') setCreateForm((f) => ({ ...f, dtls: f.dtls.filter((_, i) => i !== idx) }));
    else setEditForm((f) => ({ ...f, dtls: f.dtls.filter((_, i) => i !== idx) }));
  };

  // ─── 폼 필드 렌더 ────────────────────────────────────────────────────────

  const renderField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: {
      placeholder?: string;
      required?: boolean;
      readOnly?: boolean;
      multiline?: boolean;
      autoCapitalize?: 'characters' | 'none';
    }
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
        autoCapitalize={opts?.autoCapitalize ?? 'none'}
      />
    </View>
  );

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

  // ─── DTL 필드 목록 렌더 ──────────────────────────────────────────────────

  const renderDtlEditor = (dtls: DtlRow[], mode: 'create' | 'edit') => (
    <View style={styles.dtlSection}>
      <View style={styles.dtlSectionHeader}>
        <Text style={[styles.dtlSectionTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
          양식 필드
        </Text>
        <TouchableOpacity
          onPress={() => addDtlRow(mode)}
          style={[styles.addDtlBtn, { backgroundColor: theme.brand.primaryTint }]}
          activeOpacity={0.7}
        >
          <Plus size={13} color={theme.brand.primary} />
          <Text style={[styles.addDtlBtnText, { color: theme.brand.primary, fontFamily: WEB_FONT }]}>
            필드 추가
          </Text>
        </TouchableOpacity>
      </View>

      {dtls.length === 0 && (
        <Text style={[styles.dtlEmpty, { color: theme.text.muted, fontFamily: WEB_FONT }]}>
          필드를 추가해주세요.
        </Text>
      )}

      {dtls.map((d, idx) => {
        const updateDtl = mode === 'create'
          ? (patch: Partial<DtlRow>) => updateCreateDtl(idx, patch)
          : (patch: Partial<DtlRow>) => updateEditDtl(idx, patch);

        return (
          <View
            key={idx}
            style={[styles.dtlRow, { borderColor: theme.border.subtle, backgroundColor: theme.bg.surfaceAlt }]}
          >
            <View style={styles.dtlRowHeader}>
              <Text style={[styles.dtlRowNum, { color: theme.text.muted, fontFamily: WEB_FONT }]}>
                #{idx + 1}
              </Text>
              <TouchableOpacity
                onPress={() => removeDtlRow(mode, idx)}
                style={[styles.removeDtlBtn, { backgroundColor: '#FEF2F2' }]}
                activeOpacity={0.7}
              >
                <Trash2 size={12} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.dtlFields}>
              <View style={styles.dtlFieldHalf}>
                <Text style={[styles.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
                  필드코드<Text style={{ color: '#EF4444' }}> *</Text>
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.text.primary, borderColor: theme.border.default, backgroundColor: theme.bg.surface, fontFamily: WEB_FONT }]}
                  value={d.aprvRefCd}
                  onChangeText={(v) => updateDtl({ aprvRefCd: v.toUpperCase() })}
                  placeholder="예: START_DT"
                  placeholderTextColor={theme.text.muted}
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.dtlFieldHalf}>
                <Text style={[styles.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
                  필드명<Text style={{ color: '#EF4444' }}> *</Text>
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.text.primary, borderColor: theme.border.default, backgroundColor: theme.bg.surface, fontFamily: WEB_FONT }]}
                  value={d.aprvRefNm}
                  onChangeText={(v) => updateDtl({ aprvRefNm: v })}
                  placeholder="예: 시작일자"
                  placeholderTextColor={theme.text.muted}
                />
              </View>
            </View>

            <View style={styles.dtlFields}>
              <View style={styles.dtlFieldHalf}>
                <AppDropdown
                  label="필드구분"
                  value={d.aprvRefSe}
                  onChange={(v) => updateDtl({ aprvRefSe: v })}
                  options={refSeOptions}
                />
              </View>
              <View style={styles.dtlFieldHalf}>
                <Text style={[styles.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
                  필수여부
                </Text>
                <View style={styles.toggleRow}>
                  {(['Y', 'N'] as const).map((v) => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => updateDtl({ reqdYn: v })}
                      style={[
                        styles.toggleBtn,
                        { borderColor: theme.border.default },
                        d.reqdYn === v && { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.toggleBtnText,
                        { color: d.reqdYn === v ? '#fff' : theme.text.body, fontFamily: WEB_FONT },
                      ]}>
                        {v === 'Y' ? '필수' : '선택'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );

  // ─── 모달 ─────────────────────────────────────────────────────────────────

  const renderModal = () => {
    if (!modalMode) return null;
    const title = modalMode === 'create' ? '결재 양식 등록' : '결재 양식 수정';

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

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {loadingDetail ? (
                <View style={styles.centered}>
                  <ActivityIndicator color={theme.brand.primary} />
                </View>
              ) : (
                <>
                  {/* ── 등록 폼 ── */}
                  {modalMode === 'create' && (
                    <>
                      {renderField('양식 ID', createForm.aprvFormId,
                        (v) => setCreateForm((f) => ({ ...f, aprvFormId: v.toUpperCase() })),
                        { required: true, placeholder: '예: VACATION_FORM', autoCapitalize: 'characters' })}
                      {renderField('양식명', createForm.aprvFormNm,
                        (v) => setCreateForm((f) => ({ ...f, aprvFormNm: v })),
                        { required: true, placeholder: '예: 연차 신청서' })}
                      {renderToggle('파일 첨부', createForm.fileYn,
                        (v) => setCreateForm((f) => ({ ...f, fileYn: v })))}
                      {renderField('비고', createForm.rmk,
                        (v) => setCreateForm((f) => ({ ...f, rmk: v })),
                        { multiline: true, placeholder: '양식에 대한 설명' })}
                      {renderDtlEditor(createForm.dtls, 'create')}
                      <TouchableOpacity
                        onPress={handleCreate}
                        disabled={isSaving}
                        style={[styles.primaryBtn, { backgroundColor: theme.brand.primary }, isSaving && styles.btnDisabled]}
                        activeOpacity={0.8}
                      >
                        {isSaving
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={[styles.primaryBtnText, { fontFamily: WEB_FONT }]}>등록</Text>}
                      </TouchableOpacity>
                    </>
                  )}

                  {/* ── 수정 폼 ── */}
                  {modalMode === 'edit' && (
                    <>
                      {renderField('양식 ID', selectedForm?.aprvFormId ?? '', () => {}, { readOnly: true })}
                      {renderField('양식명', editForm.aprvFormNm,
                        (v) => setEditForm((f) => ({ ...f, aprvFormNm: v })),
                        { required: true })}
                      {renderToggle('파일 첨부', editForm.fileYn,
                        (v) => setEditForm((f) => ({ ...f, fileYn: v })))}
                      {renderField('비고', editForm.rmk,
                        (v) => setEditForm((f) => ({ ...f, rmk: v })),
                        { multiline: true })}
                      {renderDtlEditor(editForm.dtls, 'edit')}
                      <TouchableOpacity
                        onPress={handleUpdate}
                        disabled={isSaving}
                        style={[styles.primaryBtn, { backgroundColor: theme.brand.primary }, isSaving && styles.btnDisabled]}
                        activeOpacity={0.8}
                      >
                        {isSaving
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={[styles.primaryBtnText, { fontFamily: WEB_FONT }]}>저장</Text>}
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    onPress={closeModal}
                    style={[styles.cancelBtn, { borderColor: theme.border.default }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelBtnText, { color: theme.text.body, fontFamily: WEB_FONT }]}>취소</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ─── 관리 버튼 ────────────────────────────────────────────────────────────

  const renderActions = (f: AprvFormSummary) => (
    <View style={styles.actionRow}>
      <TouchableOpacity
        onPress={() => openEdit(f)}
        style={[styles.iconBtn, { backgroundColor: theme.brand.primaryTint }]}
        activeOpacity={0.7}
      >
        <Pencil size={13} color={theme.brand.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleDelete(f)}
        style={[styles.iconBtn, { backgroundColor: '#FEF2F2' }]}
        activeOpacity={0.7}
      >
        <Trash2 size={13} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  // ─── 데스크탑 테이블 ──────────────────────────────────────────────────────

  const renderTable = () => (
    <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.tableHeader, { backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.default }]}>
        {[
          { label: '양식 ID',  flex: 1.8 },
          { label: '양식명',   flex: 1.8 },
          { label: '필드 수',  flex: 0.7 },
          { label: '파일첨부', flex: 0.7 },
          { label: '등록일',   flex: 1.2 },
          { label: '관리',     flex: 0.8 },
        ].map((h) => (
          <Text key={h.label} style={[styles.th, { color: theme.text.subtle, fontFamily: WEB_FONT, flex: h.flex }]}>
            {h.label}
          </Text>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.brand.primary} /></View>
      ) : forms.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>
            등록된 결재 양식이 없습니다.
          </Text>
        </View>
      ) : forms.map((f, idx) => (
        <View
          key={f.aprvFormId}
          style={[
            styles.tableRow,
            { borderBottomColor: theme.border.subtle },
            idx % 2 === 1 && { backgroundColor: theme.bg.surfaceAlt },
          ]}
        >
          <Text style={[styles.td, { flex: 1.8, color: theme.text.primary, fontFamily: WEB_FONT }]} numberOfLines={1}>
            {f.aprvFormId}
          </Text>
          <Text style={[styles.td, { flex: 1.8, color: theme.text.primary, fontFamily: WEB_FONT }]} numberOfLines={1}>
            {f.aprvFormNm}
          </Text>
          <Text style={[styles.td, { flex: 0.7, color: theme.text.body, fontFamily: WEB_FONT }]} numberOfLines={1}>
            {f.dtlCount}개
          </Text>
          <View style={[styles.td, { flex: 0.7 }]}>
            <View style={[styles.badge, { backgroundColor: f.fileYn === 'Y' ? '#EFF6FF' : '#F3F4F6' }]}>
              <Text style={[styles.badgeText, { color: f.fileYn === 'Y' ? '#1D4ED8' : '#6B7280', fontFamily: WEB_FONT }]}>
                {f.fileYn === 'Y' ? '허용' : '미허용'}
              </Text>
            </View>
          </View>
          <Text style={[styles.td, { flex: 1.2, color: theme.text.body, fontFamily: WEB_FONT }]} numberOfLines={1}>
            {f.crtAt ? f.crtAt.slice(0, 10) : '-'}
          </Text>
          <View style={[styles.td, { flex: 0.8 }]}>{renderActions(f)}</View>
        </View>
      ))}
    </ScrollView>
  );

  // ─── 모바일 카드 ──────────────────────────────────────────────────────────

  const renderCards = () => (
    <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.brand.primary} /></View>
      ) : forms.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>
            등록된 결재 양식이 없습니다.
          </Text>
        </View>
      ) : forms.map((f) => (
        <View key={f.aprvFormId} style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
          <View style={styles.cardTop}>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardName, { color: theme.text.primary, fontFamily: WEB_FONT }]}>{f.aprvFormNm}</Text>
              <Text style={[styles.cardId, { color: theme.text.muted, fontFamily: WEB_FONT }]}>{f.aprvFormId}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: f.fileYn === 'Y' ? '#EFF6FF' : '#F3F4F6' }]}>
              <Text style={[styles.badgeText, { color: f.fileYn === 'Y' ? '#1D4ED8' : '#6B7280', fontFamily: WEB_FONT }]}>
                {f.fileYn === 'Y' ? '파일허용' : '파일불가'}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardMeta, { color: theme.text.body, fontFamily: WEB_FONT }]}>
            필드 {f.dtlCount}개 · {f.crtAt ? f.crtAt.slice(0, 10) : ''}
          </Text>
          <View style={styles.cardActions}>{renderActions(f)}</View>
        </View>
      ))}
    </ScrollView>
  );

  // ─── 렌더 ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.app }]}>
      <View style={[styles.header, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
          결재 양식 관리
        </Text>
        <TouchableOpacity
          onPress={openCreate}
          style={[styles.addBtn, { backgroundColor: theme.brand.primary }]}
          activeOpacity={0.8}
        >
          <Plus size={14} color="#fff" />
          <Text style={[styles.addBtnText, { fontFamily: WEB_FONT }]}>양식 추가</Text>
        </TouchableOpacity>
      </View>

      {isMobile ? renderCards() : renderTable()}
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

  tableScroll: { flex: 1 },
  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  th: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  td: { fontSize: 13, alignItems: 'flex-start', justifyContent: 'center' },

  cardScroll: { flex: 1 },
  cardContent: { padding: 12, gap: 10 },
  card: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { gap: 2, flex: 1, marginRight: 8 },
  cardName: { fontSize: 14, fontWeight: '600' },
  cardId:   { fontSize: 12 },
  cardMeta: { fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },

  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 6 },
  iconBtn:   { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { borderRadius: 16, overflow: 'hidden', maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 15, fontWeight: '600' },
  modalBody:  { padding: 20, gap: 14 },

  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '500' },
  input: { height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 13 },
  inputMultiline: { height: 72, paddingTop: 10, textAlignVertical: 'top' },

  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1, height: 36, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleBtnText: { fontSize: 13, fontWeight: '500' },

  primaryBtn: {
    height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnDisabled:    { opacity: 0.6 },
  cancelBtn: {
    height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  cancelBtnText: { fontSize: 14 },

  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 13 },

  // DTL 에디터
  dtlSection: { gap: 10 },
  dtlSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dtlSectionTitle: { fontSize: 13, fontWeight: '600' },
  addDtlBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
  },
  addDtlBtnText: { fontSize: 12, fontWeight: '500' },
  dtlEmpty: { fontSize: 12, textAlign: 'center', paddingVertical: 12 },
  dtlRow: {
    borderRadius: 10, borderWidth: 1, padding: 12, gap: 10,
  },
  dtlRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dtlRowNum: { fontSize: 11, fontWeight: '600' },
  removeDtlBtn: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  dtlFields: { flexDirection: 'row', gap: 10 },
  dtlFieldHalf: { flex: 1, gap: 6 },
});
