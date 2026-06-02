import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Modal, TextInput, Platform,
} from 'react-native';
import {
  CheckCircle, Clock, XCircle, ChevronRight, Plus, X, AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useCurrentUser } from '../../auth/api';
import { useUiStore } from '../../../store/uiStore';
import { useToast } from '../../../shared/hooks/useToast';
import { useConfirm } from '../../../shared/hooks/useConfirm';
import {
  useMyApprovals,
  usePendingApprovals,
  useAprvDetail,
  useApproveAprv,
  useRejectAprv,
  useCancelAprv,
  type AprvSummary,
  type AprvReqKey,
} from '../api';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── 상태 코드 ────────────────────────────────────────────────────────────────

const SE_LABEL: Record<string, string> = {
  '1': '신청', '2': '진행 중', '3': '승인', '9': '반려',
};
const APRV_SE_LABEL: Record<string, string> = { '3': '승인', '9': '반려' };

const STATUS_FILTERS = [
  { label: '전체', value: '' },
  { label: '신청',   value: '1' },
  { label: '진행 중', value: '2' },
  { label: '승인',   value: '3' },
  { label: '반려',   value: '9' },
];

// ─── 상태 배지 ────────────────────────────────────────────────────────────────

function StatusBadge({ se }: { se: string }) {
  const theme = useTheme();
  const MAP: Record<string, { bg: string; icon: React.ReactNode }> = {
    '1': { bg: theme.semantic.info,    icon: <Clock       size={11} color="#fff" /> },
    '2': { bg: theme.semantic.warning, icon: <Clock       size={11} color="#fff" /> },
    '3': { bg: theme.semantic.success, icon: <CheckCircle size={11} color="#fff" /> },
    '9': { bg: theme.semantic.danger,  icon: <XCircle     size={11} color="#fff" /> },
  };
  const c = MAP[se] ?? MAP['1'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
      {c.icon}
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', fontFamily: WEB_FONT }}>
        {SE_LABEL[se] ?? se}
      </Text>
    </View>
  );
}

// ─── 날짜 포맷 ────────────────────────────────────────────────────────────────

function fmtYmd(ymd: string | null | undefined): string {
  if (!ymd) return '';
  if (ymd.length === 8) return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
  return ymd.slice(0, 10);
}

// ─── 상세 패널 ────────────────────────────────────────────────────────────────

function DetailPanel({
  reqKey,
  currentUserId,
  isPendingTab,
  onClose,
}: {
  reqKey:        AprvReqKey;
  currentUserId: string;
  isPendingTab:  boolean;
  onClose:       () => void;
}) {
  const theme = useTheme();
  const toast  = useToast();
  const confirm = useConfirm();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rmk, setRmk]               = useState('');

  const { data: detail, isLoading } = useAprvDetail(reqKey);
  const approveMut = useApproveAprv();
  const rejectMut  = useRejectAprv();
  const cancelMut  = useCancelAprv();

  if (isLoading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={theme.brand.primary} />
    </View>
  );
  if (!detail) return null;

  // 내 결재 차례인지 확인
  const myLine   = detail.aprvList.find((a) => a.aprvUserId === currentUserId && a.aprvSe === null);
  const prevDone = myLine
    ? detail.aprvList.filter((a) => a.aprvOrd < myLine.aprvOrd).every((a) => a.aprvSe !== null)
    : false;
  const canApprove = !!myLine && prevDone && isPendingTab;
  const canCancel  = detail.reqUserId === currentUserId && detail.aprvRsltSe === '1';

  const handleApprove = async () => {
    const ok = await confirm({ title: '결재 승인', message: '해당 건을 승인하시겠습니까?', confirmText: '승인' });
    if (!ok) return;
    try {
      await approveMut.mutateAsync({ key: reqKey });
      toast.success('승인 처리되었습니다.');
      onClose();
    } catch { toast.error('처리에 실패했습니다.'); }
  };

  const handleReject = async () => {
    try {
      await rejectMut.mutateAsync({ key: reqKey, data: { rmk } });
      toast.success('반려 처리되었습니다.');
      setRejectOpen(false);
      onClose();
    } catch { toast.error('처리에 실패했습니다.'); }
  };

  const handleCancel = async () => {
    const ok = await confirm({ title: '결재 취소', message: '신청을 취소하시겠습니까?', confirmText: '취소', danger: true });
    if (!ok) return;
    try {
      await cancelMut.mutateAsync(reqKey);
      toast.success('취소되었습니다.');
      onClose();
    } catch { toast.error('처리에 실패했습니다.'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg.surface }}>
      {/* 헤더 */}
      <View style={[s.detailHeader, { borderBottomColor: theme.border.default }]}>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={s.backBtn}>
          <ChevronRight size={18} color={theme.text.muted} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <Text style={[s.detailTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]} numberOfLines={1}>
          {detail.reqSum ?? '(제목 없음)'}
        </Text>
        <StatusBadge se={detail.aprvRsltSe} />
      </View>

      <ScrollView contentContainerStyle={s.detailBody} showsVerticalScrollIndicator={false}>
        {/* 기본 정보 */}
        <View style={[s.section, { borderColor: theme.border.subtle }]}>
          <Text style={[s.sectionTitle, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>기본 정보</Text>
          <InfoRow label="양식" value={detail.aprvFormNm} theme={theme} />
          <InfoRow label="신청자" value={detail.reqUserNm} theme={theme} />
          <InfoRow label="신청일" value={fmtYmd(detail.reqYmd)} theme={theme} />
        </View>

        {/* 동적 필드값 */}
        {detail.dtlFields.length > 0 && detail.aprvReqDesc && (
          <View style={[s.section, { borderColor: theme.border.subtle }]}>
            <Text style={[s.sectionTitle, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>신청 내용</Text>
            {detail.dtlFields.map((f) => (
              <InfoRow
                key={f.aprvRefCd}
                label={f.aprvRefNm}
                value={detail.aprvReqDesc?.[f.aprvRefCd] != null
                  ? String(detail.aprvReqDesc[f.aprvRefCd])
                  : '-'}
                theme={theme}
              />
            ))}
          </View>
        )}

        {/* 결재선 */}
        <View style={[s.section, { borderColor: theme.border.subtle }]}>
          <Text style={[s.sectionTitle, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>결재선</Text>
          {detail.aprvList.map((a) => {
            const SE_MAP: Record<string, { icon: React.ReactNode; color: string }> = {
              '3': { icon: <CheckCircle size={16} color="#10B981" />, color: '#10B981' },
              '9': { icon: <XCircle     size={16} color="#EF4444" />, color: '#EF4444' },
            };
            const status = a.aprvSe ? SE_MAP[a.aprvSe] : null;
            return (
              <View key={a.aprvUserId} style={s.aprvRow}>
                <View style={[s.aprvOrdBadge, { backgroundColor: theme.brand.primaryTint }]}>
                  <Text style={[s.aprvOrdText, { color: theme.brand.primary, fontFamily: WEB_FONT }]}>
                    {a.aprvOrd}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.aprvNm, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
                    {a.aprvUserNm}
                  </Text>
                  {a.aprvSe ? (
                    <Text style={[s.aprvMeta, { color: status?.color ?? theme.text.muted, fontFamily: WEB_FONT }]}>
                      {APRV_SE_LABEL[a.aprvSe]} · {fmtYmd(a.aprvYmd)}
                    </Text>
                  ) : (
                    <Text style={[s.aprvMeta, { color: theme.text.muted, fontFamily: WEB_FONT }]}>대기 중</Text>
                  )}
                  {a.rmk ? (
                    <Text style={[s.aprvRmk, { color: theme.text.body, fontFamily: WEB_FONT }]}>{a.rmk}</Text>
                  ) : null}
                </View>
                {status ? status.icon : <Clock size={16} color={theme.text.muted} />}
              </View>
            );
          })}
        </View>

        {/* 수신참조 */}
        {detail.refList.length > 0 && (
          <View style={[s.section, { borderColor: theme.border.subtle }]}>
            <Text style={[s.sectionTitle, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>수신참조</Text>
            <View style={s.refWrap}>
              {detail.refList.map((r) => (
                <View key={r.refUserId} style={[s.refChip, { backgroundColor: theme.bg.surfaceAlt }]}>
                  <Text style={[s.refNm, { color: theme.text.body, fontFamily: WEB_FONT }]}>{r.refUserNm}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 액션 버튼 */}
        {canApprove && (
          <View style={s.actionRow}>
            <TouchableOpacity
              onPress={() => setRejectOpen(true)}
              style={[s.rejectBtn, { borderColor: theme.semantic.danger }]}
              activeOpacity={0.8}
            >
              <Text style={[s.rejectBtnText, { color: theme.semantic.danger, fontFamily: WEB_FONT }]}>반려</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApprove}
              disabled={approveMut.isPending}
              style={[s.approveBtn, { backgroundColor: theme.semantic.success }, approveMut.isPending && s.disabled]}
              activeOpacity={0.8}
            >
              {approveMut.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[s.approveBtnText, { fontFamily: WEB_FONT }]}>승인</Text>}
            </TouchableOpacity>
          </View>
        )}
        {canCancel && (
          <TouchableOpacity
            onPress={handleCancel}
            style={[s.cancelReqBtn, { borderColor: theme.border.default }]}
            activeOpacity={0.8}
          >
            <Text style={[s.cancelReqBtnText, { color: theme.text.body, fontFamily: WEB_FONT }]}>결재 취소</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* 반려 의견 모달 */}
      <Modal visible={rejectOpen} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.rejectModal, { backgroundColor: theme.bg.surface }]}>
            <View style={[s.rejectModalHeader, { borderBottomColor: theme.border.subtle }]}>
              <Text style={[s.rejectModalTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>반려 의견</Text>
              <TouchableOpacity onPress={() => setRejectOpen(false)} activeOpacity={0.7}>
                <X size={18} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
            <View style={s.rejectModalBody}>
              <TextInput
                style={[s.rejectInput, { color: theme.text.primary, borderColor: theme.border.default, backgroundColor: theme.bg.surface, fontFamily: WEB_FONT }]}
                value={rmk}
                onChangeText={setRmk}
                placeholder="반려 사유를 입력해주세요 (선택)"
                placeholderTextColor={theme.text.muted}
                multiline
              />
              <TouchableOpacity
                onPress={handleReject}
                disabled={rejectMut.isPending}
                style={[s.rejectConfirmBtn, { backgroundColor: theme.semantic.danger }, rejectMut.isPending && s.disabled]}
                activeOpacity={0.8}
              >
                {rejectMut.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={[s.rejectConfirmText, { fontFamily: WEB_FONT }]}>반려 확인</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={s.infoRow}>
      <Text style={[s.infoLabel, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>{label}</Text>
      <Text style={[s.infoValue, { color: theme.text.primary, fontFamily: WEB_FONT }]}>{value || '-'}</Text>
    </View>
  );
}

// ─── 목록 행 ─────────────────────────────────────────────────────────────────

function ReqRow({
  item,
  isSelected,
  onPress,
  theme,
}: {
  item:       AprvSummary;
  isSelected: boolean;
  onPress:    () => void;
  theme:      ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        s.reqRow,
        { borderBottomColor: theme.border.subtle },
        isSelected && { backgroundColor: theme.brand.primaryTint },
      ]}
    >
      <View style={s.reqRowLeft}>
        <Text style={[s.reqFormNm, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>{item.aprvFormNm}</Text>
        <Text style={[s.reqSum, { color: theme.text.primary, fontFamily: WEB_FONT }]} numberOfLines={1}>
          {item.reqSum ?? '(제목 없음)'}
        </Text>
        <Text style={[s.reqMeta, { color: theme.text.muted, fontFamily: WEB_FONT }]}>
          {item.reqUserNm} · {fmtYmd(item.reqYmd)}
        </Text>
      </View>
      <View style={s.reqRowRight}>
        <StatusBadge se={item.aprvRsltSe} />
        <ChevronRight size={14} color={theme.text.muted} />
      </View>
    </TouchableOpacity>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────────────────

type TabType = 'mine' | 'pending';

export function ApprovalScreen() {
  const theme  = useTheme();
  const { isMobile } = useResponsive();
  const { data: user } = useCurrentUser();
  const setActiveFullScreen = useUiStore((s) => s.setActiveFullScreen);

  const [tab, setTab]               = useState<TabType>('mine');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedKey, setSelectedKey]   = useState<AprvReqKey | null>(null);

  const { data: mine    = [], isLoading: loadMine    } = useMyApprovals();
  const { data: pending = [], isLoading: loadPending } = usePendingApprovals();

  const isLoading = tab === 'mine' ? loadMine : loadPending;
  const rawList   = tab === 'mine' ? mine : pending;
  const list      = tab === 'mine' && statusFilter
    ? rawList.filter((r) => r.aprvRsltSe === statusFilter)
    : rawList;

  const handleSelect = (item: AprvSummary) => {
    setSelectedKey({ aprvFormId: item.aprvFormId, reqUserId: item.reqUserId, aprvReqSn: item.aprvReqSn });
  };

  const openForm = () => setActiveFullScreen('approval-form' as any);

  const desktopDetail = !isMobile && selectedKey;
  const mobileDetail  = isMobile && selectedKey;

  return (
    <View style={[s.root, { backgroundColor: theme.bg.app }]}>
      {/* 헤더 */}
      <View style={[s.header, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }]}>
        <Text style={[s.headerTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>전자결재</Text>
        <TouchableOpacity onPress={openForm} style={[s.newBtn, { backgroundColor: theme.brand.primary }]} activeOpacity={0.8}>
          <Plus size={14} color="#fff" />
          <Text style={[s.newBtnText, { fontFamily: WEB_FONT }]}>결재 신청</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View style={[s.tabBar, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }]}>
        {(['mine', 'pending'] as const).map((t) => {
          const label = t === 'mine' ? '내 결재함' : '결재 대기함';
          const cnt   = t === 'pending' ? pending.length : undefined;
          return (
            <TouchableOpacity key={t} onPress={() => { setTab(t); setSelectedKey(null); }} activeOpacity={0.8}
              style={[s.tab, tab === t && { borderBottomColor: theme.brand.primary, borderBottomWidth: 2 }]}>
              <Text style={[s.tabText, { color: tab === t ? theme.brand.primary : theme.text.subtle, fontFamily: WEB_FONT }]}>
                {label}
              </Text>
              {cnt != null && cnt > 0 && (
                <View style={[s.tabBadge, { backgroundColor: theme.semantic.danger }]}>
                  <Text style={[s.tabBadgeText, { fontFamily: WEB_FONT }]}>{cnt}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 내 결재함 상태 필터 */}
      {tab === 'mine' && (
        <View style={[s.filterWrap, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.subtle }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => setStatusFilter(f.value)}
              activeOpacity={0.7}
              style={[
                s.filterChip,
                { borderColor: theme.border.default },
                statusFilter === f.value && { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary },
              ]}
            >
              <Text style={[s.filterChipText, { color: statusFilter === f.value ? '#fff' : theme.text.body, fontFamily: WEB_FONT }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        </View>
      )}

      {/* 바디 */}
      <View style={s.body}>
        {/* 목록 */}
        <View style={[
          s.listPanel,
          desktopDetail ? { width: 380, borderRightWidth: 1, borderRightColor: theme.border.subtle } : { flex: 1 },
          mobileDetail  && { display: 'none' },
        ]}>
          {isLoading ? (
            <View style={s.center}><ActivityIndicator color={theme.brand.primary} /></View>
          ) : list.length === 0 ? (
            <View style={s.center}>
              <AlertCircle size={32} color={theme.text.muted} />
              <Text style={[s.emptyText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>
                {tab === 'mine' ? '결재 내역이 없습니다.' : '대기 중인 결재가 없습니다.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={list}
              keyExtractor={(r) => `${r.aprvFormId}-${r.reqUserId}-${r.aprvReqSn}`}
              renderItem={({ item }) => (
                <ReqRow
                  item={item}
                  isSelected={
                    selectedKey?.aprvFormId === item.aprvFormId &&
                    selectedKey?.reqUserId  === item.reqUserId &&
                    selectedKey?.aprvReqSn  === item.aprvReqSn
                  }
                  onPress={() => handleSelect(item)}
                  theme={theme}
                />
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* 상세 (데스크탑) */}
        {desktopDetail && (
          <View style={s.detailPanel}>
            <DetailPanel
              reqKey={selectedKey}
              currentUserId={user?.userId ?? ''}
              isPendingTab={tab === 'pending'}
              onClose={() => setSelectedKey(null)}
            />
          </View>
        )}
      </View>

      {/* 상세 (모바일 오버레이) */}
      {mobileDetail && (
        <View style={[s.mobileOverlay, { backgroundColor: theme.bg.surface }]}>
          <DetailPanel
            reqKey={selectedKey}
            currentUserId={user?.userId ?? ''}
            isPendingTab={tab === 'pending'}
            onClose={() => setSelectedKey(null)}
          />
        </View>
      )}
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16,
  },
  tab: { paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  filterWrap: { borderBottomWidth: 1 },
  filterRow: {
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
    alignSelf: 'center',
  },
  filterChipText: { fontSize: 12, fontWeight: '500' },

  body: { flex: 1, flexDirection: 'row' },
  listPanel: { flex: 1 },
  detailPanel: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 13 },

  reqRow: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  reqRowLeft: { flex: 1, gap: 3 },
  reqRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqFormNm: { fontSize: 11 },
  reqSum: { fontSize: 14, fontWeight: '500' },
  reqMeta: { fontSize: 12 },

  // 상세
  detailHeader: {
    height: 56, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  detailTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  detailBody: { padding: 16, gap: 12 },

  section: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

  infoRow: { flexDirection: 'row', gap: 8 },
  infoLabel: { width: 64, fontSize: 13 },
  infoValue: { flex: 1, fontSize: 13 },

  aprvRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  aprvOrdBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  aprvOrdText: { fontSize: 11, fontWeight: '700' },
  aprvNm: { fontSize: 14, fontWeight: '500' },
  aprvMeta: { fontSize: 12 },
  aprvRmk: { fontSize: 12, fontStyle: 'italic' },

  refWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  refChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  refNm: { fontSize: 12 },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  approveBtn: { flex: 1, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  approveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rejectBtn: { flex: 1, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  rejectBtnText: { fontSize: 15, fontWeight: '600' },
  cancelReqBtn: { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 8 },
  cancelReqBtnText: { fontSize: 14 },
  disabled: { opacity: 0.6 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  rejectModal: { width: 360, borderRadius: 16, overflow: 'hidden' },
  rejectModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  rejectModalTitle: { fontSize: 15, fontWeight: '600' },
  rejectModalBody: { padding: 20, gap: 14 },
  rejectInput: { height: 100, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, textAlignVertical: 'top' },
  rejectConfirmBtn: { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rejectConfirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  mobileOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
});
