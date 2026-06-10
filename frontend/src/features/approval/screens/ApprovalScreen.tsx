import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
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
    <View
      className="flex-row items-center gap-1 px-2 py-[3px] rounded-full"
      style={{ backgroundColor: c.bg }}
    >
      {c.icon}
      <Text
        className="text-white text-[11px] font-semibold"
        style={{ fontFamily: WEB_FONT }}
      >
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
    <View className="flex-1 justify-center items-center">
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
    <View className="flex-1" style={{ backgroundColor: theme.bg.surface }}>
      {/* 헤더 */}
      <View className="h-14 flex-row items-center gap-2 px-4 border-b" style={{ borderBottomColor: theme.border.default }}>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1">
          <ChevronRight size={18} color={theme.text.muted} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <Text className="flex-1 text-[15px] font-semibold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }} numberOfLines={1}>
          {detail.reqSum ?? '(제목 없음)'}
        </Text>
        <StatusBadge se={detail.aprvRsltSe} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
        {/* 기본 정보 */}
        <View className="rounded-xl border p-3.5 gap-2.5" style={{ borderColor: theme.border.subtle }}>
          <Text className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}>기본 정보</Text>
          <InfoRow label="양식" value={detail.aprvFormNm} theme={theme} />
          <InfoRow label="신청자" value={detail.reqUserNm} theme={theme} />
          <InfoRow label="신청일" value={fmtYmd(detail.reqYmd)} theme={theme} />
        </View>

        {/* 동적 필드값 */}
        {detail.dtlFields.length > 0 && detail.aprvReqDesc && (
          <View className="rounded-xl border p-3.5 gap-2.5" style={{ borderColor: theme.border.subtle }}>
            <Text className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}>신청 내용</Text>
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
        <View className="rounded-xl border p-3.5 gap-2.5" style={{ borderColor: theme.border.subtle }}>
          <Text className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}>결재선</Text>
          {detail.aprvList.map((a) => {
            const SE_MAP: Record<string, { icon: React.ReactNode; color: string }> = {
              '3': { icon: <CheckCircle size={16} color="#10B981" />, color: '#10B981' },
              '9': { icon: <XCircle     size={16} color="#EF4444" />, color: '#EF4444' },
            };
            const status = a.aprvSe ? SE_MAP[a.aprvSe] : null;
            return (
              <View key={a.aprvUserId} className="flex-row items-start gap-2.5">
                <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: theme.brand.primaryTint }}>
                  <Text className="text-[11px] font-bold" style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}>
                    {a.aprvOrd}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text className="text-sm font-medium" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>
                    {a.aprvUserNm}
                  </Text>
                  {a.aprvSe ? (
                    <Text className="text-xs" style={{ color: status?.color ?? theme.text.muted, fontFamily: WEB_FONT }}>
                      {APRV_SE_LABEL[a.aprvSe]} · {fmtYmd(a.aprvYmd)}
                    </Text>
                  ) : (
                    <Text className="text-xs" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>대기 중</Text>
                  )}
                  {a.rmk ? (
                    <Text className="text-xs italic" style={{ color: theme.text.body, fontFamily: WEB_FONT }}>{a.rmk}</Text>
                  ) : null}
                </View>
                {status ? status.icon : <Clock size={16} color={theme.text.muted} />}
              </View>
            );
          })}
        </View>

        {/* 수신참조 */}
        {detail.refList.length > 0 && (
          <View className="rounded-xl border p-3.5 gap-2.5" style={{ borderColor: theme.border.subtle }}>
            <Text className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}>수신참조</Text>
            <View className="flex-row flex-wrap gap-2">
              {detail.refList.map((r) => (
                <View key={r.refUserId} className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: theme.bg.surfaceAlt }}>
                  <Text className="text-xs" style={{ color: theme.text.body, fontFamily: WEB_FONT }}>{r.refUserNm}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 액션 버튼 */}
        {canApprove && (
          <View className="flex-row gap-3 mt-2">
            <TouchableOpacity
              onPress={() => setRejectOpen(true)}
              className="flex-1 h-11 rounded-lg items-center justify-center border-[1.5px]"
              style={{ borderColor: theme.semantic.danger }}
              activeOpacity={0.8}
            >
              <Text className="text-sm font-semibold" style={{ color: theme.semantic.danger, fontFamily: WEB_FONT }}>반려</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApprove}
              disabled={approveMut.isPending}
              className="flex-1 h-11 rounded-lg items-center justify-center"
              style={{ backgroundColor: theme.semantic.success, opacity: approveMut.isPending ? 0.6 : 1 }}
              activeOpacity={0.8}
            >
              {approveMut.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text className="text-white text-sm font-semibold" style={{ fontFamily: WEB_FONT }}>승인</Text>}
            </TouchableOpacity>
          </View>
        )}
        {canCancel && (
          <TouchableOpacity
            onPress={handleCancel}
            className="h-11 rounded-lg items-center justify-center border mt-2"
            style={{ borderColor: theme.border.default }}
            activeOpacity={0.8}
          >
            <Text className="text-sm" style={{ color: theme.text.body, fontFamily: WEB_FONT }}>결재 취소</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* 반려 의견 모달 */}
      <Modal visible={rejectOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/40 items-center justify-center">
          <View className="w-[360px] rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bg.surface }}>
            <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderBottomColor: theme.border.subtle }}>
              <Text className="text-[15px] font-semibold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>반려 의견</Text>
              <TouchableOpacity onPress={() => setRejectOpen(false)} activeOpacity={0.7}>
                <X size={18} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
            <View className="p-5 gap-3.5">
              <TextInput
                className="h-[100px] border rounded-xl p-3 text-[13px]"
                style={{ color: theme.text.primary, borderColor: theme.border.default, backgroundColor: theme.bg.surface, fontFamily: WEB_FONT, textAlignVertical: 'top' }}
                value={rmk}
                onChangeText={setRmk}
                placeholder="반려 사유를 입력해주세요 (선택)"
                placeholderTextColor={theme.text.muted}
                multiline
              />
              <TouchableOpacity
                onPress={handleReject}
                disabled={rejectMut.isPending}
                className="h-11 rounded-lg items-center justify-center"
                style={{ backgroundColor: theme.semantic.danger, opacity: rejectMut.isPending ? 0.6 : 1 }}
                activeOpacity={0.8}
              >
                {rejectMut.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text className="text-white text-sm font-semibold" style={{ fontFamily: WEB_FONT }}>반려 확인</Text>}
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
    <View className="flex-row gap-2">
      <Text className="w-16 text-sm" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}>{label}</Text>
      <Text className="flex-1 text-sm" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{value || '-'}</Text>
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
      className="px-4 py-3.5 flex-row items-center border-b"
      style={{
        borderBottomColor: theme.border.subtle,
        backgroundColor: isSelected ? theme.brand.primaryTint : undefined,
      }}
    >
      <View className="flex-1 gap-[3px]">
        <Text className="text-[11px]" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}>{item.aprvFormNm}</Text>
        <Text className="text-sm font-medium" style={{ color: theme.text.primary, fontFamily: WEB_FONT }} numberOfLines={1}>
          {item.reqSum ?? '(제목 없음)'}
        </Text>
        <Text className="text-xs" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
          {item.reqUserNm} · {fmtYmd(item.reqYmd)}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
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
    <View className="flex-1" style={{ backgroundColor: theme.bg.app }}>
      {/* 헤더 */}
      <View className="h-14 flex-row items-center justify-between px-5 border-b" style={{ backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }}>
        <Text className="text-base font-semibold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>전자결재</Text>
        <TouchableOpacity onPress={openForm} className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-lg" style={{ backgroundColor: theme.brand.primary }} activeOpacity={0.8}>
          <Plus size={14} color="#fff" />
          <Text className="text-white text-[13px] font-semibold" style={{ fontFamily: WEB_FONT }}>결재 신청</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View className="flex-row border-b px-4" style={{ backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }}>
        {(['mine', 'pending'] as const).map((t) => {
          const label = t === 'mine' ? '내 결재함' : '결재 대기함';
          const cnt   = t === 'pending' ? pending.length : undefined;
          return (
            <TouchableOpacity key={t} onPress={() => { setTab(t); setSelectedKey(null); }} activeOpacity={0.8}
              className="px-3 py-3 flex-row items-center gap-1.5"
              style={tab === t ? { borderBottomColor: theme.brand.primary, borderBottomWidth: 2 } : undefined}>
              <Text className="text-sm font-medium" style={{ color: tab === t ? theme.brand.primary : theme.text.subtle, fontFamily: WEB_FONT }}>
                {label}
              </Text>
              {cnt != null && cnt > 0 && (
                <View className="rounded-full px-1.5 py-0.5 min-w-[18px] items-center" style={{ backgroundColor: theme.semantic.danger }}>
                  <Text className="text-white text-[10px] font-bold" style={{ fontFamily: WEB_FONT }}>{cnt}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 내 결재함 상태 필터 */}
      {tab === 'mine' && (
        <View className="border-b" style={{ backgroundColor: theme.bg.surface, borderBottomColor: theme.border.subtle }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' }}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                onPress={() => setStatusFilter(f.value)}
                activeOpacity={0.7}
                className="px-3 py-1.5 rounded-full border self-center"
                style={
                  statusFilter === f.value
                    ? { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary }
                    : { borderColor: theme.border.default }
                }
              >
                <Text className="text-xs font-medium" style={{ color: statusFilter === f.value ? '#fff' : theme.text.body, fontFamily: WEB_FONT }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 바디 */}
      <View className="flex-1 flex-row">
        {/* 목록 */}
        <View className={`${desktopDetail ? "w-[380px] border-r" : "flex-1"} ${mobileDetail ? "hidden" : ""}`} style={desktopDetail ? { borderRightColor: theme.border.subtle } : undefined}>
          {isLoading ? (
            <View className="flex-1 items-center justify-center gap-3"><ActivityIndicator color={theme.brand.primary} /></View>
          ) : list.length === 0 ? (
            <View className="flex-1 items-center justify-center gap-3">
              <AlertCircle size={32} color={theme.text.muted} />
              <Text className="text-[13px]" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
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
          <View className="flex-1">
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
        <View className="absolute inset-0 z-10" style={{ backgroundColor: theme.bg.surface }}>
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
