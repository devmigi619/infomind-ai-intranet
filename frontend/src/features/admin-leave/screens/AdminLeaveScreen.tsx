import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Plus, X, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useCodeList } from '../../../shared/hooks/useCodeList';
import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import {
  useLeaveMstList, useCreateLeaveMst, useUpdateLeaveMst, useDeleteLeaveMst,
  useLeaveDtlList, useCreateLeaveDtl, useUpdateLeaveDtl, useDeleteLeaveDtl,
  useLeavePolList, useCreateLeavePol, useUpdateLeavePol, useDeleteLeavePol,
  type LeaveMstDto, type LeaveDtlDto, type LeavePolDto,
  type MstCreateRequest, type MstUpdateRequest,
  type DtlCreateRequest, type DtlUpdateRequest,
  type PolCreateRequest, type PolUpdateRequest,
} from '../api';

type TabKey = 'pol' | 'type';

const toNum = (v: string): number | null => {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};
const toInt = (v: string): number | null => {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
};
const polRangeLabel = (st: number | null, end: number | null): string => {
  if (st == null || end == null) return '-';
  return end >= 999 ? `${st}개월 이상` : `${st}~${end}개월`;
};

// ─── Root ─────────────────────────────────────────────────────────────────────

export function AdminLeaveScreen() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('pol');
  const s = createStyles(theme);

  return (
    <View style={s.root}>
      {/* 탭 헤더 */}
      <View style={s.tabBar}>
        {(['pol', 'type'] as TabKey[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tabItem, activeTab === tab && s.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'pol' ? '정책 관리' : '유형 관리'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'pol' ? <LeavePolSection /> : <LeaveMstDtlSection />}
    </View>
  );
}

// ─── 정책 관리 섹션 ───────────────────────────────────────────────────────────

interface PolFormState {
  leavePolCd: string;
  leavePolNm: string;
  leavePolDesc: string;
  polStMon: string;
  polEndMon: string;
  leaveDcnt: string;
  addDcnt: string;
  addCycMon: string;
  maxDcnt: string;
  useYn: string;
}

const EMPTY_POL: PolFormState = {
  leavePolCd: '', leavePolNm: '', leavePolDesc: '',
  polStMon: '', polEndMon: '', leaveDcnt: '',
  addDcnt: '', addCycMon: '', maxDcnt: '', useYn: 'Y',
};

function LeavePolSection() {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { width } = useWindowDimensions();
  const confirm = useConfirm();
  const toast = useToast();
  const s = createStyles(theme);
  const modalWidth = Math.min(420, width - 32);

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState<PolFormState>(EMPTY_POL);
  const [editTarget, setEditTarget] = useState<string | null>(null);

  const { data: pols = [], isLoading } = useLeavePolList();
  const createPol = useCreateLeavePol();
  const updatePol = useUpdateLeavePol();
  const deletePol = useDeleteLeavePol();

  const openCreate = () => {
    setFormMode('create');
    setForm(EMPTY_POL);
    setEditTarget(null);
    setFormVisible(true);
  };

  const openEdit = (item: LeavePolDto) => {
    setFormMode('edit');
    setForm({
      leavePolCd: item.leavePolCd,
      leavePolNm: item.leavePolNm,
      leavePolDesc: item.leavePolDesc ?? '',
      polStMon: item.polStMon != null ? String(item.polStMon) : '',
      polEndMon: item.polEndMon != null ? String(item.polEndMon) : '',
      leaveDcnt: item.leaveDcnt != null ? String(item.leaveDcnt) : '',
      addDcnt: item.addDcnt != null ? String(item.addDcnt) : '',
      addCycMon: item.addCycMon != null ? String(item.addCycMon) : '',
      maxDcnt: item.maxDcnt != null ? String(item.maxDcnt) : '',
      useYn: item.useYn,
    });
    setEditTarget(item.leavePolCd);
    setFormVisible(true);
  };

  const handleDelete = async (item: LeavePolDto) => {
    const ok = await confirm({
      title: '정책 삭제',
      message: `'${item.leavePolNm}' 정책을 삭제하시겠습니까?`,
      confirmText: '삭제',
      danger: true,
    });
    if (!ok) return;
    try {
      await deletePol.mutateAsync(item.leavePolCd);
      toast.success('삭제되었습니다.');
    } catch (err: any) {
      if (!err?._handled) toast.error('삭제에 실패했습니다.');
    }
  };

  const handleSubmit = async () => {
    if (!form.leavePolNm.trim()) { toast.warning('정책명을 입력해주세요.'); return; }
    try {
      if (formMode === 'create') {
        if (!form.leavePolCd.trim()) { toast.warning('정책 코드를 입력해주세요.'); return; }
        const req: PolCreateRequest = {
          leavePolCd: form.leavePolCd.trim().toUpperCase(),
          leavePolNm: form.leavePolNm.trim(),
          leavePolDesc: form.leavePolDesc.trim() || null,
          polStMon: toInt(form.polStMon),
          polEndMon: toInt(form.polEndMon),
          leaveDcnt: toNum(form.leaveDcnt),
          addDcnt: toNum(form.addDcnt),
          addCycMon: toInt(form.addCycMon),
          maxDcnt: toNum(form.maxDcnt),
          useYn: form.useYn,
        };
        await createPol.mutateAsync(req);
        toast.success('정책이 추가되었습니다.');
      } else if (editTarget) {
        const req: PolUpdateRequest = {
          leavePolNm: form.leavePolNm.trim(),
          leavePolDesc: form.leavePolDesc.trim() || null,
          polStMon: toInt(form.polStMon),
          polEndMon: toInt(form.polEndMon),
          leaveDcnt: toNum(form.leaveDcnt),
          addDcnt: toNum(form.addDcnt),
          addCycMon: toInt(form.addCycMon),
          maxDcnt: toNum(form.maxDcnt),
          useYn: form.useYn,
        };
        await updatePol.mutateAsync({ leavePolCd: editTarget, data: req });
        toast.success('수정되었습니다.');
      }
      setFormVisible(false);
    } catch (err: any) {
      if (!err?._handled) toast.error('저장에 실패했습니다.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* 섹션 헤더 */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>연차 근속별 정책</Text>
        <TouchableOpacity onPress={openCreate} style={s.addBtn}>
          <Plus size={15} color={theme.brand.primary} />
          <Text style={s.addBtnText}>정책 추가</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.brand.primary} />
      ) : (
        <ScrollView contentContainerStyle={isMobile ? { paddingVertical: 8 } : undefined}>
          {!isMobile && (
            <View style={[s.tableRow, s.tableHeader]}>
              <Text style={[s.tableCell, s.polCellCd, s.headerText]}>코드</Text>
              <Text style={[s.tableCell, s.polCellNm, s.headerText]}>정책명</Text>
              <Text style={[s.tableCell, s.polCellRange, s.headerText]}>적용 범위</Text>
              <Text style={[s.tableCell, s.polCellNum, s.headerText]}>기본 일수</Text>
              <Text style={[s.tableCell, s.polCellNum, s.headerText]}>최대 일수</Text>
              <Text style={[s.tableCell, s.polCellActions, s.headerText]}>관리</Text>
            </View>
          )}
          {pols.map((item) =>
            isMobile ? (
              <View key={item.leavePolCd} style={s.mobileCard}>
                <View style={s.mobileCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mobileCardName}>{item.leavePolNm}</Text>
                    <Text style={s.mobileCardCode}>{item.leavePolCd}</Text>
                    <Text style={s.mobileCardMeta}>
                      {polRangeLabel(item.polStMon, item.polEndMon)}
                      {item.leaveDcnt != null ? `  ·  기본 ${item.leaveDcnt}일` : ''}
                      {item.maxDcnt != null ? `  ·  최대 ${item.maxDcnt}일` : ''}
                    </Text>
                  </View>
                  <View style={[s.useYnBadge, { backgroundColor: item.useYn === 'Y' ? '#D1FAE5' : '#F3F4F6' }]}>
                    <Text style={[s.useYnText, { color: item.useYn === 'Y' ? '#065F46' : '#6B7280' }]}>
                      {item.useYn === 'Y' ? '사용' : '미사용'}
                    </Text>
                  </View>
                </View>
                <View style={s.mobileCardActions}>
                  <TouchableOpacity onPress={() => openEdit(item)} style={s.mobileActionBtn}>
                    <Pencil size={13} color={theme.brand.primary} />
                    <Text style={[s.mobileActionText, { color: theme.brand.primary }]}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={s.mobileActionBtn}>
                    <Trash2 size={13} color="#EF4444" />
                    <Text style={[s.mobileActionText, { color: '#EF4444' }]}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View key={item.leavePolCd} style={s.tableRow}>
                <Text style={[s.tableCell, s.polCellCd, s.mutedText]} numberOfLines={1}>{item.leavePolCd}</Text>
                <Text style={[s.tableCell, s.polCellNm]} numberOfLines={1}>{item.leavePolNm}</Text>
                <Text style={[s.tableCell, s.polCellRange, s.mutedText]}>
                  {polRangeLabel(item.polStMon, item.polEndMon)}
                </Text>
                <Text style={[s.tableCell, s.polCellNum, s.mutedText, { textAlign: 'center' }]}>
                  {item.leaveDcnt != null ? `${item.leaveDcnt}일` : '-'}
                </Text>
                <Text style={[s.tableCell, s.polCellNum, s.mutedText, { textAlign: 'center' }]}>
                  {item.maxDcnt != null ? `${item.maxDcnt}일` : '-'}
                </Text>
                <View style={[s.tableCell, s.polCellActions, { flexDirection: 'row', gap: 6 }]}>
                  <TouchableOpacity onPress={() => openEdit(item)} style={s.actionBtn}>
                    <Pencil size={13} color={theme.brand.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={s.actionBtn}>
                    <Trash2 size={13} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )
          )}
          {pols.length === 0 && (
            <Text style={s.emptyText}>등록된 정책이 없습니다.</Text>
          )}
        </ScrollView>
      )}

      {/* 모달 */}
      <Modal visible={formVisible} transparent animationType="fade" onRequestClose={() => setFormVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxWidth: modalWidth }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{formMode === 'edit' ? '정책 수정' : '정책 추가'}</Text>
              <TouchableOpacity onPress={() => setFormVisible(false)}>
                <X size={20} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody}>
              {formMode === 'create' && (
                <View style={s.formRow}>
                  <Text style={s.label}>정책 코드 *</Text>
                  <TextInput style={s.input} value={form.leavePolCd}
                    onChangeText={(v) => setForm((f) => ({ ...f, leavePolCd: v.toUpperCase() }))}
                    placeholder="예: POL_001" autoCapitalize="characters" />
                </View>
              )}
              <View style={s.formRow}>
                <Text style={s.label}>정책명 *</Text>
                <TextInput style={s.input} value={form.leavePolNm}
                  onChangeText={(v) => setForm((f) => ({ ...f, leavePolNm: v }))}
                  placeholder="예: 1년 미만" />
              </View>
              <View style={s.formRow}>
                <Text style={s.label}>적용 근속 범위</Text>
                <View style={s.inputWithUnit}>
                  <TextInput style={[s.input, { flex: 1 }]} value={form.polStMon}
                    onChangeText={(v) => setForm((f) => ({ ...f, polStMon: v.replace(/\D/g, '') }))}
                    placeholder="시작 개월" keyboardType="numeric" />
                  <Text style={s.unit}>개월~</Text>
                </View>
                <View style={[s.inputWithUnit, { marginTop: 8 }]}>
                  <TextInput style={[s.input, { flex: 1 }]} value={form.polEndMon}
                    onChangeText={(v) => setForm((f) => ({ ...f, polEndMon: v.replace(/\D/g, '') }))}
                    placeholder="종료 개월 (마지막: 999)" keyboardType="numeric" />
                  <Text style={s.unit}>개월</Text>
                </View>
              </View>
              <View style={s.formRow}>
                <Text style={s.label}>기본 연차 일수</Text>
                <View style={s.inputWithUnit}>
                  <TextInput style={[s.input, { flex: 1 }]} value={form.leaveDcnt}
                    onChangeText={(v) => setForm((f) => ({ ...f, leaveDcnt: v.replace(/[^0-9.]/g, '') }))}
                    placeholder="예: 11" keyboardType="decimal-pad" />
                  <Text style={s.unit}>일</Text>
                </View>
              </View>
              <View style={s.formRow}>
                <Text style={s.label}>추가 일수</Text>
                <View style={s.inputWithUnit}>
                  <TextInput style={[s.input, { flex: 1 }]} value={form.addDcnt}
                    onChangeText={(v) => setForm((f) => ({ ...f, addDcnt: v.replace(/[^0-9.]/g, '') }))}
                    placeholder="예: 1" keyboardType="decimal-pad" />
                  <Text style={s.unit}>일</Text>
                </View>
              </View>
              <View style={s.formRow}>
                <Text style={s.label}>추가 발생 주기</Text>
                <View style={s.inputWithUnit}>
                  <TextInput style={[s.input, { flex: 1 }]} value={form.addCycMon}
                    onChangeText={(v) => setForm((f) => ({ ...f, addCycMon: v.replace(/\D/g, '') }))}
                    placeholder="예: 24" keyboardType="numeric" />
                  <Text style={s.unit}>개월마다</Text>
                </View>
              </View>
              <View style={s.formRow}>
                <Text style={s.label}>최대 일수</Text>
                <View style={s.inputWithUnit}>
                  <TextInput style={[s.input, { flex: 1 }]} value={form.maxDcnt}
                    onChangeText={(v) => setForm((f) => ({ ...f, maxDcnt: v.replace(/[^0-9.]/g, '') }))}
                    placeholder="비워두면 무제한" keyboardType="decimal-pad" />
                  <Text style={s.unit}>일</Text>
                </View>
              </View>
              <View style={s.formRow}>
                <Text style={s.label}>설명</Text>
                <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]}
                  value={form.leavePolDesc} multiline
                  onChangeText={(v) => setForm((f) => ({ ...f, leavePolDesc: v }))}
                  placeholder="정책 설명 (선택)" />
              </View>
              <View style={s.formRow}>
                <Text style={s.label}>사용 여부</Text>
                <View style={s.toggleRow}>
                  {['Y', 'N'].map((v) => (
                    <TouchableOpacity key={v}
                      style={[s.toggleBtn, form.useYn === v && s.toggleBtnActive]}
                      onPress={() => setForm((f) => ({ ...f, useYn: v }))}>
                      <Text style={[s.toggleText, form.useYn === v && s.toggleTextActive]}>
                        {v === 'Y' ? '사용' : '미사용'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={s.modalFooter}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setFormVisible(false)}>
                <Text style={s.btnCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={handleSubmit}
                disabled={createPol.isPending || updatePol.isPending}>
                {(createPol.isPending || updatePol.isPending)
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.btnSaveText}>저장</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── 유형 관리 섹션 ───────────────────────────────────────────────────────────

interface MstFormState {
  leaveCd: string; leaveNm: string;
  dedYn: string; paidYn: string; useYn: string;
}
interface DtlFormState {
  leaveDtlCd: string; leaveDtlNm: string;
  leaveDtlDesc: string; leaveSe: string;
  useAvlDcnt: string; useYn: string;
}

const EMPTY_MST: MstFormState = { leaveCd: '', leaveNm: '', dedYn: 'N', paidYn: 'Y', useYn: 'Y' };
const EMPTY_DTL: DtlFormState = { leaveDtlCd: '', leaveDtlNm: '', leaveDtlDesc: '', leaveSe: '', useAvlDcnt: '', useYn: 'Y' };

function LeaveMstDtlSection() {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { width } = useWindowDimensions();
  const confirm = useConfirm();
  const toast = useToast();
  const leaveSeOptions = useCodeList('LEAVE_SE');
  const s = createStyles(theme);
  const modalWidth = Math.min(400, width - 32);

  // 모바일 전환
  const [mobileView, setMobileView] = useState<'mst' | 'dtl'>('mst');
  const [selectedMst, setSelectedMst] = useState<string | null>(null);

  // MST 폼
  const [mstFormVisible, setMstFormVisible] = useState(false);
  const [mstMode, setMstMode] = useState<'create' | 'edit'>('create');
  const [mstForm, setMstForm] = useState<MstFormState>(EMPTY_MST);
  const [mstEditTarget, setMstEditTarget] = useState<string | null>(null);

  // DTL 폼
  const [dtlFormVisible, setDtlFormVisible] = useState(false);
  const [dtlMode, setDtlMode] = useState<'create' | 'edit'>('create');
  const [dtlForm, setDtlForm] = useState<DtlFormState>(EMPTY_DTL);
  const [dtlEditTarget, setDtlEditTarget] = useState<{ leaveCd: string; leaveDtlCd: string } | null>(null);

  const { data: msts = [], isLoading: mstLoading } = useLeaveMstList();
  const { data: dtls = [], isLoading: dtlLoading } = useLeaveDtlList(selectedMst);

  const createMst = useCreateLeaveMst();
  const updateMst = useUpdateLeaveMst();
  const deleteMst = useDeleteLeaveMst();
  const createDtl = useCreateLeaveDtl();
  const updateDtl = useUpdateLeaveDtl();
  const deleteDtl = useDeleteLeaveDtl();

  const selectedMstItem = msts.find((m) => m.leaveCd === selectedMst);
  const leaveSeLabel = (cd: string | null) =>
    leaveSeOptions.find((o) => o.value === cd)?.label ?? cd ?? '-';

  // ── MST handlers ──
  const openMstCreate = () => {
    setMstMode('create'); setMstForm(EMPTY_MST); setMstEditTarget(null); setMstFormVisible(true);
  };
  const openMstEdit = (item: LeaveMstDto) => {
    setMstMode('edit');
    setMstForm({ leaveCd: item.leaveCd, leaveNm: item.leaveNm, dedYn: item.dedYn, paidYn: item.paidYn, useYn: item.useYn });
    setMstEditTarget(item.leaveCd);
    setMstFormVisible(true);
  };
  const handleMstDelete = async (item: LeaveMstDto) => {
    const ok = await confirm({ title: '유형 삭제', message: `'${item.leaveNm}' 유형을 삭제하시겠습니까?\n세부 유형이 있으면 삭제되지 않습니다.`, confirmText: '삭제', danger: true });
    if (!ok) return;
    try {
      await deleteMst.mutateAsync(item.leaveCd);
      if (selectedMst === item.leaveCd) setSelectedMst(null);
      toast.success('삭제되었습니다.');
    } catch (err: any) {
      if (!err?._handled) toast.error('삭제에 실패했습니다. 세부 유형을 먼저 삭제해주세요.');
    }
  };
  const handleMstSubmit = async () => {
    if (!mstForm.leaveNm.trim()) { toast.warning('휴가명을 입력해주세요.'); return; }
    try {
      if (mstMode === 'create') {
        if (!mstForm.leaveCd.trim()) { toast.warning('휴가 코드를 입력해주세요.'); return; }
        await createMst.mutateAsync({ leaveCd: mstForm.leaveCd.trim().toUpperCase(), leaveNm: mstForm.leaveNm.trim(), dedYn: mstForm.dedYn, paidYn: mstForm.paidYn, useYn: mstForm.useYn } as MstCreateRequest);
        toast.success('유형이 추가되었습니다.');
      } else if (mstEditTarget) {
        await updateMst.mutateAsync({ leaveCd: mstEditTarget, data: { leaveNm: mstForm.leaveNm.trim(), dedYn: mstForm.dedYn, paidYn: mstForm.paidYn, useYn: mstForm.useYn } as MstUpdateRequest });
        toast.success('수정되었습니다.');
      }
      setMstFormVisible(false);
    } catch (err: any) {
      if (!err?._handled) toast.error('저장에 실패했습니다.');
    }
  };

  // ── DTL handlers ──
  const openDtlCreate = () => {
    if (!selectedMst) return;
    setDtlMode('create');
    setDtlForm({ ...EMPTY_DTL, leaveSe: leaveSeOptions[0]?.value ?? '' });
    setDtlEditTarget(null);
    setDtlFormVisible(true);
  };
  const openDtlEdit = (item: LeaveDtlDto) => {
    setDtlMode('edit');
    setDtlForm({
      leaveDtlCd: item.leaveDtlCd, leaveDtlNm: item.leaveDtlNm ?? '',
      leaveDtlDesc: item.leaveDtlDesc ?? '', leaveSe: item.leaveSe ?? '',
      useAvlDcnt: item.useAvlDcnt != null ? String(item.useAvlDcnt) : '',
      useYn: item.useYn,
    });
    setDtlEditTarget({ leaveCd: item.leaveCd, leaveDtlCd: item.leaveDtlCd });
    setDtlFormVisible(true);
  };
  const handleDtlDelete = async (item: LeaveDtlDto) => {
    const ok = await confirm({ title: '세부 유형 삭제', message: `'${item.leaveDtlNm ?? item.leaveDtlCd}'을 삭제하시겠습니까?`, confirmText: '삭제', danger: true });
    if (!ok) return;
    try {
      await deleteDtl.mutateAsync({ leaveCd: item.leaveCd, leaveDtlCd: item.leaveDtlCd });
      toast.success('삭제되었습니다.');
    } catch (err: any) {
      if (!err?._handled) toast.error('삭제에 실패했습니다.');
    }
  };
  const handleDtlSubmit = async () => {
    if (!selectedMst) return;
    if (!dtlForm.leaveDtlNm.trim()) { toast.warning('세부명을 입력해주세요.'); return; }
    try {
      if (dtlMode === 'create') {
        if (!dtlForm.leaveDtlCd.trim()) { toast.warning('세부 코드를 입력해주세요.'); return; }
        await createDtl.mutateAsync({ leaveCd: selectedMst, leaveDtlCd: dtlForm.leaveDtlCd.trim().toUpperCase(), leaveDtlNm: dtlForm.leaveDtlNm.trim(), leaveDtlDesc: dtlForm.leaveDtlDesc.trim() || null, leaveSe: dtlForm.leaveSe || null, useAvlDcnt: toNum(dtlForm.useAvlDcnt), useYn: dtlForm.useYn } as DtlCreateRequest);
        toast.success('세부 유형이 추가되었습니다.');
      } else if (dtlEditTarget) {
        await updateDtl.mutateAsync({ leaveCd: dtlEditTarget.leaveCd, leaveDtlCd: dtlEditTarget.leaveDtlCd, data: { leaveDtlNm: dtlForm.leaveDtlNm.trim(), leaveDtlDesc: dtlForm.leaveDtlDesc.trim() || null, leaveSe: dtlForm.leaveSe || null, useAvlDcnt: toNum(dtlForm.useAvlDcnt), useYn: dtlForm.useYn } as DtlUpdateRequest });
        toast.success('수정되었습니다.');
      }
      setDtlFormVisible(false);
    } catch (err: any) {
      if (!err?._handled) toast.error('저장에 실패했습니다.');
    }
  };

  // ── 모바일 렌더 ──
  if (isMobile) {
    return (
      <View style={{ flex: 1 }}>
        {mobileView === 'mst' ? (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>휴가 유형</Text>
              <TouchableOpacity onPress={openMstCreate} style={s.addBtn}>
                <Plus size={15} color={theme.brand.primary} />
                <Text style={s.addBtnText}>유형 추가</Text>
              </TouchableOpacity>
            </View>
            {mstLoading ? <ActivityIndicator style={{ marginTop: 40 }} color={theme.brand.primary} /> : (
              <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
                {msts.map((item) => (
                  <TouchableOpacity key={item.leaveCd} style={s.mobileCard}
                    onPress={() => { setSelectedMst(item.leaveCd); setMobileView('dtl'); }}>
                    <View style={s.mobileCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.mobileCardName}>{item.leaveNm}</Text>
                        <Text style={s.mobileCardCode}>{item.leaveCd}</Text>
                        <Text style={s.mobileCardMeta}>
                          {item.paidYn === 'Y' ? '유급' : '무급'}  ·  {item.dedYn === 'Y' ? '차감' : '비차감'}
                        </Text>
                      </View>
                      <ChevronRight size={16} color={theme.text.muted} />
                    </View>
                  </TouchableOpacity>
                ))}
                {msts.length === 0 && <Text style={s.emptyText}>등록된 휴가 유형이 없습니다.</Text>}
              </ScrollView>
            )}
          </>
        ) : (
          <>
            <View style={s.sectionHeader}>
              <TouchableOpacity onPress={() => setMobileView('mst')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ChevronLeft size={16} color={theme.brand.primary} />
                <Text style={[s.sectionTitle, { color: theme.brand.primary }]}>{selectedMstItem?.leaveNm ?? '세부 유형'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openDtlCreate} style={s.addBtn}>
                <Plus size={15} color={theme.brand.primary} />
                <Text style={s.addBtnText}>세부 추가</Text>
              </TouchableOpacity>
            </View>
            {dtlLoading ? <ActivityIndicator style={{ marginTop: 40 }} color={theme.brand.primary} /> : (
              <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
                {dtls.map((item) => (
                  <View key={item.leaveDtlCd} style={s.mobileCard}>
                    <View style={s.mobileCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.mobileCardName}>{item.leaveDtlNm ?? item.leaveDtlCd}</Text>
                        <Text style={s.mobileCardMeta}>
                          {leaveSeLabel(item.leaveSe)}
                          {item.useAvlDcnt != null ? `  ·  ${item.useAvlDcnt}일` : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={s.mobileCardActions}>
                      <TouchableOpacity onPress={() => openDtlEdit(item)} style={s.mobileActionBtn}>
                        <Pencil size={13} color={theme.brand.primary} />
                        <Text style={[s.mobileActionText, { color: theme.brand.primary }]}>수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDtlDelete(item)} style={s.mobileActionBtn}>
                        <Trash2 size={13} color="#EF4444" />
                        <Text style={[s.mobileActionText, { color: '#EF4444' }]}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {dtls.length === 0 && <Text style={s.emptyText}>세부 유형이 없습니다.</Text>}
              </ScrollView>
            )}
          </>
        )}
        {/* 모달들 — 모바일 동일 */}
        <MstFormModal visible={mstFormVisible} mode={mstMode} form={mstForm} setForm={setMstForm}
          onClose={() => setMstFormVisible(false)} onSubmit={handleMstSubmit}
          isPending={createMst.isPending || updateMst.isPending} theme={theme} s={s} modalWidth={modalWidth} />
        <DtlFormModal visible={dtlFormVisible} mode={dtlMode} form={dtlForm} setForm={setDtlForm}
          onClose={() => setDtlFormVisible(false)} onSubmit={handleDtlSubmit}
          isPending={createDtl.isPending || updateDtl.isPending} theme={theme} s={s} modalWidth={modalWidth}
          leaveSeOptions={leaveSeOptions} />
      </View>
    );
  }

  // ── 데스크탑 렌더 ──
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {/* 좌측: MST 목록 */}
      <View style={s.mstPanel}>
        <View style={[s.sectionHeader, { borderBottomWidth: 1, borderBottomColor: theme.border.default }]}>
          <Text style={s.sectionTitle}>휴가 유형</Text>
          <TouchableOpacity onPress={openMstCreate} style={s.addBtnSmall}>
            <Plus size={13} color={theme.brand.primary} />
          </TouchableOpacity>
        </View>
        {mstLoading ? <ActivityIndicator style={{ marginTop: 20 }} color={theme.brand.primary} /> : (
          <ScrollView>
            {msts.map((item) => (
              <TouchableOpacity key={item.leaveCd}
                style={[s.mstItem, selectedMst === item.leaveCd && s.mstItemSelected]}
                onPress={() => setSelectedMst(item.leaveCd)}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.mstItemName, selectedMst === item.leaveCd && { color: theme.brand.primary }]} numberOfLines={1}>
                    {item.leaveNm}
                  </Text>
                  <Text style={s.mstItemMeta}>
                    {item.paidYn === 'Y' ? '유급' : '무급'} · {item.dedYn === 'Y' ? '차감' : '비차감'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity onPress={() => openMstEdit(item)} style={s.actionBtnSm}>
                    <Pencil size={11} color={theme.brand.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleMstDelete(item)} style={s.actionBtnSm}>
                    <Trash2 size={11} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
            {msts.length === 0 && <Text style={[s.emptyText, { fontSize: 12, paddingVertical: 20 }]}>유형 없음</Text>}
          </ScrollView>
        )}
      </View>

      {/* 우측: DTL 목록 */}
      <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: theme.border.default }}>
        {selectedMst ? (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>
                {selectedMstItem?.leaveNm ?? ''} — 세부 유형
              </Text>
              <TouchableOpacity onPress={openDtlCreate} style={s.addBtn}>
                <Plus size={15} color={theme.brand.primary} />
                <Text style={s.addBtnText}>세부 추가</Text>
              </TouchableOpacity>
            </View>
            {dtlLoading ? <ActivityIndicator style={{ marginTop: 40 }} color={theme.brand.primary} /> : (
              <ScrollView>
                <View style={[s.tableRow, s.tableHeader]}>
                  <Text style={[s.tableCell, s.dtlCellCd, s.headerText]}>코드</Text>
                  <Text style={[s.tableCell, s.dtlCellNm, s.headerText]}>세부명</Text>
                  <Text style={[s.tableCell, s.dtlCellSe, s.headerText]}>구분</Text>
                  <Text style={[s.tableCell, s.dtlCellNum, s.headerText]}>사용가능</Text>
                  <Text style={[s.tableCell, s.dtlCellYn, s.headerText]}>상태</Text>
                  <Text style={[s.tableCell, s.dtlCellActions, s.headerText]}>관리</Text>
                </View>
                {dtls.map((item) => (
                  <View key={item.leaveDtlCd} style={s.tableRow}>
                    <Text style={[s.tableCell, s.dtlCellCd, s.mutedText]} numberOfLines={1}>{item.leaveDtlCd}</Text>
                    <Text style={[s.tableCell, s.dtlCellNm]} numberOfLines={1}>{item.leaveDtlNm ?? '-'}</Text>
                    <Text style={[s.tableCell, s.dtlCellSe, s.mutedText, { textAlign: 'center' }]}>
                      {leaveSeLabel(item.leaveSe)}
                    </Text>
                    <Text style={[s.tableCell, s.dtlCellNum, s.mutedText, { textAlign: 'center' }]}>
                      {item.useAvlDcnt != null ? `${item.useAvlDcnt}일` : '-'}
                    </Text>
                    <View style={[s.tableCell, s.dtlCellYn, { alignItems: 'center' }]}>
                      <View style={[s.useYnBadge, { backgroundColor: item.useYn === 'Y' ? '#D1FAE5' : '#F3F4F6' }]}>
                        <Text style={[s.useYnText, { color: item.useYn === 'Y' ? '#065F46' : '#6B7280' }]}>
                          {item.useYn === 'Y' ? '사용' : '미사용'}
                        </Text>
                      </View>
                    </View>
                    <View style={[s.tableCell, s.dtlCellActions, { flexDirection: 'row', gap: 6 }]}>
                      <TouchableOpacity onPress={() => openDtlEdit(item)} style={s.actionBtn}>
                        <Pencil size={13} color={theme.brand.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDtlDelete(item)} style={s.actionBtn}>
                        <Trash2 size={13} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {dtls.length === 0 && <Text style={s.emptyText}>세부 유형이 없습니다. 추가해보세요.</Text>}
              </ScrollView>
            )}
          </>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[s.emptyText, { fontSize: 13 }]}>← 좌측에서 휴가 유형을 선택하세요.</Text>
          </View>
        )}
      </View>

      {/* 모달들 */}
      <MstFormModal visible={mstFormVisible} mode={mstMode} form={mstForm} setForm={setMstForm}
        onClose={() => setMstFormVisible(false)} onSubmit={handleMstSubmit}
        isPending={createMst.isPending || updateMst.isPending} theme={theme} s={s} modalWidth={modalWidth} />
      <DtlFormModal visible={dtlFormVisible} mode={dtlMode} form={dtlForm} setForm={setDtlForm}
        onClose={() => setDtlFormVisible(false)} onSubmit={handleDtlSubmit}
        isPending={createDtl.isPending || updateDtl.isPending} theme={theme} s={s} modalWidth={modalWidth}
        leaveSeOptions={leaveSeOptions} />
    </View>
  );
}

// ─── MST 모달 ─────────────────────────────────────────────────────────────────

function MstFormModal({ visible, mode, form, setForm, onClose, onSubmit, isPending, theme, s, modalWidth }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { maxWidth: modalWidth }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{mode === 'edit' ? '유형 수정' : '유형 추가'}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={theme.text.muted} /></TouchableOpacity>
          </View>
          <ScrollView style={s.modalBody}>
            {mode === 'create' && (
              <View style={s.formRow}>
                <Text style={s.label}>휴가 코드 *</Text>
                <TextInput style={s.input} value={form.leaveCd}
                  onChangeText={(v: string) => setForm((f: MstFormState) => ({ ...f, leaveCd: v.toUpperCase() }))}
                  placeholder="예: ANNUAL, SICK" autoCapitalize="characters" />
              </View>
            )}
            <View style={s.formRow}>
              <Text style={s.label}>휴가명 *</Text>
              <TextInput style={s.input} value={form.leaveNm}
                onChangeText={(v: string) => setForm((f: MstFormState) => ({ ...f, leaveNm: v }))}
                placeholder="예: 연차, 병가" />
            </View>
            <View style={s.formRow}>
              <Text style={s.label}>유급 여부</Text>
              <View style={s.toggleRow}>
                {[{ v: 'Y', l: '유급' }, { v: 'N', l: '무급' }].map(({ v, l }) => (
                  <TouchableOpacity key={v} style={[s.toggleBtn, form.paidYn === v && s.toggleBtnActive]}
                    onPress={() => setForm((f: MstFormState) => ({ ...f, paidYn: v }))}>
                    <Text style={[s.toggleText, form.paidYn === v && s.toggleTextActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={s.formRow}>
              <Text style={s.label}>연차 차감 여부</Text>
              <View style={s.toggleRow}>
                {[{ v: 'Y', l: '차감' }, { v: 'N', l: '비차감' }].map(({ v, l }) => (
                  <TouchableOpacity key={v} style={[s.toggleBtn, form.dedYn === v && s.toggleBtnActive]}
                    onPress={() => setForm((f: MstFormState) => ({ ...f, dedYn: v }))}>
                    <Text style={[s.toggleText, form.dedYn === v && s.toggleTextActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={s.formRow}>
              <Text style={s.label}>사용 여부</Text>
              <View style={s.toggleRow}>
                {[{ v: 'Y', l: '사용' }, { v: 'N', l: '미사용' }].map(({ v, l }) => (
                  <TouchableOpacity key={v} style={[s.toggleBtn, form.useYn === v && s.toggleBtnActive]}
                    onPress={() => setForm((f: MstFormState) => ({ ...f, useYn: v }))}>
                    <Text style={[s.toggleText, form.useYn === v && s.toggleTextActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={s.btnCancel} onPress={onClose}>
              <Text style={s.btnCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSave} onPress={onSubmit} disabled={isPending}>
              {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.btnSaveText}>저장</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── DTL 모달 ─────────────────────────────────────────────────────────────────

function DtlFormModal({ visible, mode, form, setForm, onClose, onSubmit, isPending, theme, s, modalWidth, leaveSeOptions }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { maxWidth: modalWidth }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{mode === 'edit' ? '세부 유형 수정' : '세부 유형 추가'}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={theme.text.muted} /></TouchableOpacity>
          </View>
          <ScrollView style={s.modalBody}>
            {mode === 'create' && (
              <View style={s.formRow}>
                <Text style={s.label}>세부 코드 *</Text>
                <TextInput style={s.input} value={form.leaveDtlCd}
                  onChangeText={(v: string) => setForm((f: DtlFormState) => ({ ...f, leaveDtlCd: v.toUpperCase() }))}
                  placeholder="예: ANNUAL_FULL" autoCapitalize="characters" />
              </View>
            )}
            <View style={s.formRow}>
              <Text style={s.label}>세부명 *</Text>
              <TextInput style={s.input} value={form.leaveDtlNm}
                onChangeText={(v: string) => setForm((f: DtlFormState) => ({ ...f, leaveDtlNm: v }))}
                placeholder="예: 연차 전일" />
            </View>
            <View style={s.formRow}>
              <Text style={s.label}>구분 (종일/반일)</Text>
              <View style={s.toggleRow}>
                {leaveSeOptions.map((opt: any) => (
                  <TouchableOpacity key={opt.value} style={[s.toggleBtn, form.leaveSe === opt.value && s.toggleBtnActive]}
                    onPress={() => setForm((f: DtlFormState) => ({ ...f, leaveSe: opt.value }))}>
                    <Text style={[s.toggleText, form.leaveSe === opt.value && s.toggleTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={s.formRow}>
              <Text style={s.label}>사용가능 일수</Text>
              <View style={s.inputWithUnit}>
                <TextInput style={[s.input, { flex: 1 }]} value={form.useAvlDcnt}
                  onChangeText={(v: string) => setForm((f: DtlFormState) => ({ ...f, useAvlDcnt: v.replace(/[^0-9.]/g, '') }))}
                  placeholder="예: 1, 0.5" keyboardType="decimal-pad" />
                <Text style={s.unit}>일</Text>
              </View>
            </View>
            <View style={s.formRow}>
              <Text style={s.label}>설명</Text>
              <TextInput style={[s.input, { height: 64, textAlignVertical: 'top' }]}
                value={form.leaveDtlDesc} multiline
                onChangeText={(v: string) => setForm((f: DtlFormState) => ({ ...f, leaveDtlDesc: v }))}
                placeholder="설명 (선택)" />
            </View>
            <View style={s.formRow}>
              <Text style={s.label}>사용 여부</Text>
              <View style={s.toggleRow}>
                {[{ v: 'Y', l: '사용' }, { v: 'N', l: '미사용' }].map(({ v, l }) => (
                  <TouchableOpacity key={v} style={[s.toggleBtn, form.useYn === v && s.toggleBtnActive]}
                    onPress={() => setForm((f: DtlFormState) => ({ ...f, useYn: v }))}>
                    <Text style={[s.toggleText, form.useYn === v && s.toggleTextActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={s.btnCancel} onPress={onClose}>
              <Text style={s.btnCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSave} onPress={onSubmit} disabled={isPending}>
              {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.btnSaveText}>저장</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createStyles(theme: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg.surface },
    // ── 탭 ──────────────────────────────────────────────────────────────────
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.border.default,
      backgroundColor: theme.bg.surface,
    },
    tabItem: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabItemActive: { borderBottomColor: theme.brand.primary },
    tabText: { fontSize: 14, color: theme.text.muted, fontWeight: '500' as const },
    tabTextActive: { color: theme.brand.primary, fontWeight: '600' as const },
    // ── 공통 헤더 ───────────────────────────────────────────────────────────
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sectionTitle: { fontSize: 13, fontWeight: '600' as const, color: theme.text.primary },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 7, borderWidth: 1, borderColor: theme.brand.primary,
    },
    addBtnText: { fontSize: 12, color: theme.brand.primary, fontWeight: '500' as const },
    addBtnSmall: {
      padding: 6, borderRadius: 6, borderWidth: 1, borderColor: theme.brand.primary,
    },
    // ── 테이블 공통 ─────────────────────────────────────────────────────────
    tableRow: {
      flexDirection: 'row', alignItems: 'center',
      borderBottomWidth: 1, borderBottomColor: theme.border.subtle,
      paddingHorizontal: 16, minHeight: 42,
    },
    tableHeader: { backgroundColor: theme.bg.surfaceAlt ?? '#FAFAFA' },
    tableCell: { fontSize: 13, color: theme.text.primary, paddingVertical: 8 },
    headerText: { fontSize: 11, fontWeight: '600' as const, color: theme.text.muted },
    mutedText: { color: theme.text.muted },
    // pol 열 너비
    polCellCd: { width: 100 },
    polCellNm: { flex: 1 },
    polCellRange: { width: 120 },
    polCellNum: { width: 80 },
    polCellActions: { width: 64 },
    // dtl 열 너비
    dtlCellCd: { width: 110 },
    dtlCellNm: { flex: 1 },
    dtlCellSe: { width: 60 },
    dtlCellNum: { width: 72 },
    dtlCellYn: { width: 64 },
    dtlCellActions: { width: 64 },
    // ── MST 패널 (데스크탑 좌측) ────────────────────────────────────────────
    mstPanel: { width: 200, borderRightWidth: 1, borderRightColor: theme.border.default },
    mstItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 12, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: theme.border.subtle,
    },
    mstItemSelected: { backgroundColor: (theme.brand as any).primaryTint ?? '#EFF6FF' },
    mstItemName: { fontSize: 13, color: theme.text.primary, fontWeight: '500' as const },
    mstItemMeta: { fontSize: 11, color: theme.text.muted, marginTop: 2 },
    actionBtn: {
      padding: 6, borderRadius: 6,
      backgroundColor: theme.bg.surfaceAlt ?? '#F5F5F5',
    },
    actionBtnSm: { padding: 4, borderRadius: 5 },
    // ── 배지 ────────────────────────────────────────────────────────────────
    useYnBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
    useYnText: { fontSize: 11, fontWeight: '600' as const },
    // ── 모바일 카드 ─────────────────────────────────────────────────────────
    mobileCard: {
      marginHorizontal: 12, marginVertical: 5,
      padding: 12, borderRadius: 10,
      backgroundColor: theme.bg.surface,
      borderWidth: 1, borderColor: theme.border.subtle,
    },
    mobileCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    mobileCardName: { fontSize: 14, fontWeight: '600' as const, color: theme.text.primary },
    mobileCardCode: { fontSize: 11, color: theme.text.muted, marginTop: 1 },
    mobileCardMeta: { fontSize: 11, color: theme.text.muted, marginTop: 2 },
    mobileCardActions: {
      flexDirection: 'row', gap: 8, marginTop: 8,
      borderTopWidth: 1, borderTopColor: theme.border.subtle, paddingTop: 8,
    },
    mobileActionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 7, borderWidth: 1, borderColor: theme.border.default,
    },
    mobileActionText: { fontSize: 12, fontWeight: '500' as const },
    // ── 공통 ────────────────────────────────────────────────────────────────
    emptyText: {
      fontSize: 13, color: theme.text.muted,
      textAlign: 'center', paddingVertical: 40,
    },
    // ── 모달 ────────────────────────────────────────────────────────────────
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 16,
    },
    modalBox: {
      maxHeight: '85%' as unknown as number,
      width: '100%' as unknown as number,
      alignSelf: 'center' as const,
      backgroundColor: theme.bg.surface,
      borderRadius: 16, overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: theme.border.default,
    },
    modalTitle: { fontSize: 15, fontWeight: '600' as const, color: theme.text.primary },
    modalBody: { paddingHorizontal: 20, paddingTop: 12 },
    formRow: { marginBottom: 14 },
    label: { fontSize: 12, fontWeight: '600' as const, color: theme.text.muted, marginBottom: 5 },
    input: {
      borderWidth: 1, borderColor: theme.border.default,
      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9,
      fontSize: 14, color: theme.text.primary, backgroundColor: theme.bg.surface,
    },
    inputWithUnit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    unit: { fontSize: 13, color: theme.text.muted, minWidth: 16 },
    toggleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' as const },
    toggleBtn: {
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 8, borderWidth: 1, borderColor: theme.border.default,
    },
    toggleBtnActive: { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary },
    toggleText: { fontSize: 13, color: theme.text.muted },
    toggleTextActive: { color: '#FFFFFF', fontWeight: '600' as const },
    modalFooter: {
      flexDirection: 'row', justifyContent: 'flex-end', gap: 10,
      paddingHorizontal: 20, paddingVertical: 14,
      borderTopWidth: 1, borderTopColor: theme.border.default,
    },
    btnCancel: {
      paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 8, borderWidth: 1, borderColor: theme.border.default,
    },
    btnCancelText: { fontSize: 14, color: theme.text.muted },
    btnSave: {
      paddingHorizontal: 20, paddingVertical: 8,
      borderRadius: 8, backgroundColor: theme.brand.primary,
      minWidth: 68, alignItems: 'center',
    },
    btnSaveText: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF' },
  });
}
