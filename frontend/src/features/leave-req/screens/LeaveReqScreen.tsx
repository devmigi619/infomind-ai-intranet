import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { CheckCircle, Clock, XCircle, ChevronRight, Download, FileText } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useCurrentUser } from '../../auth/api';
import { useUiStore } from '../../../store/uiStore';
import { useToast } from '../../../shared/hooks/useToast';
import { useConfirm } from '../../../shared/hooks/useConfirm';
import {
  useLeaveReqList,
  useLeaveReqDetail,
  useApproveLeaveReq,
  useRejectLeaveReq,
  useCancelLeaveReq,
  useMyLeaveBalance,
  type LeaveReqSummaryDto,
} from '../api';
import { useAttachmentList, type AttachmentFileMeta } from '../../attachment/api';
import { useDownloadAttachment } from '../../../shared/hooks/useDownloadAttachment';
import { AttachmentPreviewModal } from '../../../shared/components/AttachmentPreviewModal';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const SE_LABEL: Record<string, string> = {
  '1': '신청',
  '2': '진행 중',
  '3': '승인',
  '9': '반려',
};

const APRV_SE_LABEL: Record<string, string> = {
  '3': '승인',
  '9': '반려',
};

function StatusBadge({ se }: { se: string }) {
  const theme = useTheme();
  const colors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    '1': { bg: theme.semantic.info, text: '#fff', icon: <Clock size={11} color="#fff" /> },
    '2': { bg: theme.semantic.warning, text: '#fff', icon: <Clock size={11} color="#fff" /> },
    '3': { bg: theme.semantic.success, text: '#fff', icon: <CheckCircle size={11} color="#fff" /> },
    '9': { bg: theme.semantic.danger, text: '#fff', icon: <XCircle size={11} color="#fff" /> },
  };
  const c = colors[se] ?? colors['1'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
      {c.icon}
      <Text style={{ color: c.text, fontSize: 11, fontWeight: '600' }}>{SE_LABEL[se] ?? se}</Text>
    </View>
  );
}

// ─── 날짜 포맷 ─────────────────────────────────────────────────────────────────

function fmtYmd(ymd: string | null): string {
  if (!ymd) return '';
  if (ymd.length === 8) return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
  return ymd.slice(0, 10);
}

function dateRangeLabel(start: string | null, end: string | null): string {
  if (!start) return '-';
  if (start === end || !end) return fmtYmd(start);
  return `${fmtYmd(start)} ~ ${fmtYmd(end)}`;
}

// ─── 상세 패널 ────────────────────────────────────────────────────────────────

function DetailPanel({
  reqUserId,
  reqSn,
  currentUserId,
  onClose,
}: {
  reqUserId: string;
  reqSn: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectRmk, setRejectRmk] = useState('');
  const [previewFile, setPreviewFile] = useState<AttachmentFileMeta | null>(null);

  const { data: detail, isLoading } = useLeaveReqDetail(reqUserId, reqSn);
  const { data: attachments = [] } = useAttachmentList(detail?.afileId ?? null);
  const download = useDownloadAttachment();
  const approveMutation = useApproveLeaveReq();
  const rejectMutation = useRejectLeaveReq();
  const cancelMutation = useCancelLeaveReq();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.brand.primary} />
      </View>
    );
  }
  if (!detail) return null;

  // 내가 결재자이고 아직 미처리인 경우
  const myAprv = detail.aprvList.find(
    (a) => a.aprvUserId === currentUserId && a.aprvSe === null,
  );
  // aprv_ord 순서 체크: 내 앞 순서 결재자가 모두 처리 완료여야 내 차례
  const isMyTurn = myAprv
    ? detail.aprvList
        .filter((a) => a.aprvOrd < myAprv.aprvOrd)
        .every((a) => a.aprvSe !== null)
    : false;
  const canApprove = !!myAprv && isMyTurn && ['1', '2'].includes(detail.aprvRsltSe);
  const canCancel = detail.reqUserId === currentUserId && detail.aprvRsltSe === '1';

  const handleApprove = async () => {
    const ok = await confirm({ title: '승인하시겠습니까?' });
    if (!ok) return;
    try {
      await approveMutation.mutateAsync({ reqUserId, reqSn });
      toast.success('승인되었습니다.');
      onClose();
    } catch {
      toast.error('승인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleRejectSubmit = async () => {
    try {
      await rejectMutation.mutateAsync({ reqUserId, reqSn, rmk: rejectRmk });
      toast.success('반려되었습니다.');
      setRejectModalOpen(false);
      onClose();
    } catch {
      toast.error('반려 처리 중 오류가 발생했습니다.');
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({ title: '신청을 취소하시겠습니까?' });
    if (!ok) return;
    try {
      await cancelMutation.mutateAsync({ reqUserId, reqSn });
      toast.info('신청이 취소되었습니다.');
      onClose();
    } catch {
      toast.error('취소 처리 중 오류가 발생했습니다.');
    }
  };

  const s = makeDetailStyles(theme);

  return (
    <View style={s.root}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <ChevronRight size={20} color={theme.text.muted} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>신청 상세</Text>
        <StatusBadge se={detail.aprvRsltSe} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* 기본 정보 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>신청 정보</Text>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>신청자</Text>
            <Text style={s.infoValue}>{detail.reqUserNm}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>휴가유형</Text>
            <Text style={s.infoValue}>{detail.leaveMstNm}{detail.leaveDtlNm ? ` / ${detail.leaveDtlNm}` : ''}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>사용일수</Text>
            <Text style={s.infoValue}>{detail.leaveUseDcnt}일</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>사유</Text>
            <Text style={[s.infoValue, { flex: 1 }]}>{detail.leaveRsn ?? '-'}</Text>
          </View>
          {detail.crtAt && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>신청일</Text>
              <Text style={s.infoValue}>{detail.crtAt.slice(0, 10)}</Text>
            </View>
          )}
        </View>

        {/* 사용 날짜 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>사용 날짜 ({detail.dates.length}일)</Text>
          {detail.leaveStHhmm && detail.leaveEndHhmm && (
            <View style={[s.infoRow, { marginBottom: 8 }]}>
              <Text style={s.infoLabel}>시간</Text>
              <Text style={[s.infoValue, { color: theme.brand.primary }]}>
                {`${detail.leaveStHhmm.slice(0,2)}:${detail.leaveStHhmm.slice(2,4)}`}
                {' ~ '}
                {`${detail.leaveEndHhmm.slice(0,2)}:${detail.leaveEndHhmm.slice(2,4)}`}
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {detail.dates.map((d) => (
              <View key={d} style={s.dateChip}>
                <Text style={s.dateChipText}>{fmtYmd(d)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 결재선 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>결재선</Text>
          {detail.aprvList.map((a, idx) => {
            // 이 결재자보다 앞 순서 중 미처리가 있으면 대기 중
            const isWaiting = a.aprvSe === null &&
              detail.aprvList.some((x) => x.aprvOrd < a.aprvOrd && x.aprvSe === null);
            return (
              <View key={a.aprvUserId} style={[s.aprvRow, idx === detail.aprvList.length - 1 && { borderBottomWidth: 0 }]}>
                {/* 순번 뱃지 */}
                <View style={[
                  s.aprvOrd,
                  a.aprvSe === '3' && { backgroundColor: '#D1FAE5' },
                  a.aprvSe === '9' && { backgroundColor: '#FEE2E2' },
                ]}>
                  <Text style={[
                    s.aprvOrdText,
                    a.aprvSe === '3' && { color: '#10B981' },
                    a.aprvSe === '9' && { color: '#EF4444' },
                  ]}>{a.aprvOrd}</Text>
                </View>

                {/* 이름 + 처리 정보 */}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={s.aprvNm}>{a.aprvUserNm}</Text>
                  {a.aprvSe ? (
                    <Text style={{ fontSize: 12, color: a.aprvSe === '3' ? '#10B981' : '#EF4444', fontWeight: '500' }}>
                      {APRV_SE_LABEL[a.aprvSe]}{a.aprvYmd ? `  ${fmtYmd(a.aprvYmd)}` : ''}
                    </Text>
                  ) : isWaiting ? (
                    <Text style={{ fontSize: 12, color: theme.text.subtle }}>이전 결재자 처리 후 가능</Text>
                  ) : (
                    <Text style={{ fontSize: 12, color: theme.semantic.warning, fontWeight: '500' }}>결재 대기 중</Text>
                  )}
                  {a.rmk ? <Text style={{ fontSize: 12, color: theme.text.muted }}>사유: {a.rmk}</Text> : null}
                </View>

                {/* 상태 아이콘 */}
                {a.aprvSe === null && !isWaiting && <Clock size={15} color={theme.semantic.warning} />}
                {a.aprvSe === null && isWaiting && <Clock size={15} color={theme.text.subtle} />}
                {a.aprvSe === '3' && <CheckCircle size={15} color="#10B981" />}
                {a.aprvSe === '9' && <XCircle size={15} color="#EF4444" />}
              </View>
            );
          })}
          {detail.aprvList.length === 0 && (
            <Text style={{ color: theme.text.muted, fontSize: 13, marginTop: 8 }}>결재자 없음</Text>
          )}
        </View>

        {/* 내 차례가 아닌데 결재자로 등록된 경우 안내 */}
        {myAprv && !isMyTurn && (
          <View style={{
            backgroundColor: theme.bg.surfaceMute,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.border.default,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <Clock size={14} color={theme.text.muted} />
            <Text style={{ fontSize: 13, color: theme.text.muted, flex: 1 }}>
              이전 순서 결재자의 처리가 완료되면 승인/반려가 가능합니다.
            </Text>
          </View>
        )}

        {/* 수신참조 */}
        {detail.refList.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>수신참조</Text>
            <Text style={{ color: theme.text.body, fontSize: 13, marginTop: 4 }}>
              {detail.refList.map((r) => r.refUserNm).join(', ')}
            </Text>
          </View>
        )}

        {/* 첨부파일 */}
        {attachments.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>첨부파일 ({attachments.length})</Text>
            <View style={{ gap: 6, marginTop: 8 }}>
              {attachments.map((f) => (
                <View key={f.afileSn} style={[s.fileRow, { borderColor: theme.border.default }]}>
                  <FileText size={14} color={theme.text.muted} />
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setPreviewFile(f)} activeOpacity={0.7}>
                    <Text style={[s.fileName, { color: theme.brand.primary }]} numberOfLines={1}>
                      {f.oriFileNm}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      const r = await download(f);
                      if (!r.ok && r.message) toast.error(r.message);
                    }}
                    style={{ padding: 4 }}
                    activeOpacity={0.7}
                  >
                    <Download size={14} color={theme.text.muted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 액션 버튼 */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          {canApprove && (
            <>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={handleApprove}
              >
                <CheckCircle size={14} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>승인</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#EF4444' }]}
                onPress={() => setRejectModalOpen(true)}
              >
                <XCircle size={14} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>반려</Text>
              </TouchableOpacity>
            </>
          )}
          {canCancel && (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: theme.border.default }]}
              onPress={handleCancel}
            >
              <Text style={{ color: theme.text.body, fontWeight: '600', fontSize: 13 }}>취소</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* 파일 미리보기 모달 */}
      <AttachmentPreviewModal
        open={previewFile !== null}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* 반려 사유 모달 */}
      <Modal visible={rejectModalOpen} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>반려 사유</Text>
            <TextInput
              style={s.modalInput}
              value={rejectRmk}
              onChangeText={setRejectRmk}
              placeholder="반려 사유를 입력하세요 (선택)"
              multiline
              numberOfLines={4}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: theme.bg.surfaceMute }]}
                onPress={() => setRejectModalOpen(false)}
              >
                <Text style={{ color: theme.text.body, fontWeight: '600' }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleRejectSubmit}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>반려</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── 잔여 휴가 배너 ───────────────────────────────────────────────────────────

function LeaveSummaryBanner({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const { data, isLoading } = useMyLeaveBalance();

  if (isLoading) {
    return (
      <View style={{ padding: 14, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={theme.brand.primary} />
      </View>
    );
  }
  if (!data) return null;

  const cur = data.currentYear;
  const ent = cur.entitlementDcnt ?? 0;
  const used = cur.usedDcnt ?? 0;
  const remaining = cur.remainingDcnt ?? ent - used;
  const pct = Math.min(cur.usedPct ?? (ent > 0 ? Math.round((used / ent) * 100) : 0), 100);

  const fmtDcnt = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1));

  return (
    <View style={{
      margin: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border.default,
      backgroundColor: theme.bg.surfaceMute,
      overflow: 'hidden',
    }}>
      {/* 올해 요약 */}
      <View style={{ padding: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text.muted, marginBottom: 10 }}>
          {cur.year}년 연차 현황
        </Text>

        {/* 수치 행 */}
        <View style={{ flexDirection: 'row', gap: 0, marginBottom: 12 }}>
          {/* 기본 일수 */}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text.primary }}>
              {fmtDcnt(ent)}
            </Text>
            <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>기본일수</Text>
          </View>
          <View style={{ width: 1, backgroundColor: theme.border.subtle, marginVertical: 4 }} />
          {/* 사용 */}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.semantic.warning }}>
              {fmtDcnt(used)}
            </Text>
            <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>사용</Text>
          </View>
          <View style={{ width: 1, backgroundColor: theme.border.subtle, marginVertical: 4 }} />
          {/* 잔여 */}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.semantic.success }}>
              {fmtDcnt(remaining)}
            </Text>
            <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>잔여</Text>
          </View>
        </View>

        {/* 프로그레스 바 */}
        <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.border.default, overflow: 'hidden' }}>
          <View style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 4,
            backgroundColor: pct >= 80 ? theme.semantic.danger : pct >= 50 ? theme.semantic.warning : theme.brand.primary,
          }} />
        </View>
        <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 4, textAlign: 'right' }}>
          {pct}% 사용
        </Text>
      </View>

      {/* 지난 연도 이력 */}
      {data.history.length > 0 && (
        <View style={{
          borderTopWidth: 1,
          borderTopColor: theme.border.subtle,
          paddingHorizontal: 14,
          paddingVertical: 10,
          gap: 4,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.subtle, marginBottom: 4 }}>
            지난 연도 사용 내역
          </Text>
          {data.history.map((h) => (
            <View key={h.year} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: theme.text.muted }}>{h.year}년</Text>
              <Text style={{ fontSize: 12, color: theme.text.body, fontWeight: '600' }}>
                {fmtDcnt(h.usedDcnt)}일 사용
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── 목록 행 ──────────────────────────────────────────────────────────────────

function ReqRow({
  item,
  onPress,
  theme,
}: {
  item: LeaveReqSummaryDto;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const s = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.default,
      gap: 12,
    },
    name: { fontSize: 13, fontWeight: '600', color: theme.text.primary },
    sub: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
  });
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={s.name}>
          {item.leaveMstNm}{item.leaveDtlNm ? ` / ${item.leaveDtlNm}` : ''}
        </Text>
        <Text style={s.sub}>
          {dateRangeLabel(item.startYmd, item.endYmd)} · {item.leaveUseDcnt}일
          {item.reqUserNm ? ` · ${item.reqUserNm}` : ''}
        </Text>
      </View>
      <StatusBadge se={item.aprvRsltSe} />
      <ChevronRight size={14} color={theme.text.muted} />
    </TouchableOpacity>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export function LeaveReqScreen() {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { data: me } = useCurrentUser();
  const setActiveFullScreen = useUiStore((s) => s.setActiveFullScreen);

  const [activeTab, setActiveTab] = useState<'my' | 'approver'>('my');
  const [selectedKey, setSelectedKey] = useState<{ reqUserId: string; reqSn: number } | null>(null);

  const { data: list = [], isLoading } = useLeaveReqList(activeTab);

  const handleRowPress = (item: LeaveReqSummaryDto) => {
    setSelectedKey({ reqUserId: item.reqUserId, reqSn: item.reqSn });
  };

  const handleNewRequest = () => {
    setActiveFullScreen('leave-req-form' as any);
  };

  const s = makeStyles(theme);

  return (
    <View style={s.root}>
      {/* 헤더 */}
      <View style={s.header}>
        <Text style={s.headerTitle}>휴가신청</Text>
        <TouchableOpacity style={s.newBtn} onPress={handleNewRequest}>
          <Text style={s.newBtnText}>+ 신청하기</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View style={s.tabBar}>
        {(['my', 'approver'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tabItem, activeTab === tab && s.tabItemActive]}
            onPress={() => { setActiveTab(tab); setSelectedKey(null); }}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'my' ? '내 신청' : '결재 대기'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 본문 */}
      <View style={s.body}>
        {/* 목록 */}
        <View style={[s.listPane, selectedKey && !isMobile && s.listPaneNarrow]}>
          {/* 내 신청 탭에서만 잔여일수 배너 표시 */}
          {activeTab === 'my' && <LeaveSummaryBanner theme={theme} />}

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={theme.brand.primary} />
          ) : list.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>
                {activeTab === 'my' ? '신청 내역이 없습니다.' : '결재 대기 중인 건이 없습니다.'}
              </Text>
            </View>
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={list}
              keyExtractor={(item) => `${item.reqUserId}-${item.reqSn}`}
              renderItem={({ item }) => (
                <ReqRow
                  item={item}
                  theme={theme}
                  onPress={() => handleRowPress(item)}
                />
              )}
            />
          )}
        </View>

        {/* 상세 패널 (데스크탑: 우측, 모바일: 오버레이) */}
        {selectedKey && !isMobile && (
          <View style={s.detailPane}>
            <DetailPanel
              reqUserId={selectedKey.reqUserId}
              reqSn={selectedKey.reqSn}
              currentUserId={me?.userId ?? ''}
              onClose={() => setSelectedKey(null)}
            />
          </View>
        )}

        {/* 모바일 상세 모달 */}
        {selectedKey && isMobile && (
          <Modal visible animationType="slide" transparent={false}>
            <DetailPanel
              reqUserId={selectedKey.reqUserId}
              reqSn={selectedKey.reqSn}
              currentUserId={me?.userId ?? ''}
              onClose={() => setSelectedKey(null)}
            />
          </Modal>
        )}
      </View>
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg.surface },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.default,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: theme.text.primary },
    newBtn: {
      backgroundColor: theme.brand.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    newBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.border.default,
    },
    tabItem: { paddingHorizontal: 20, paddingVertical: 10 },
    tabItemActive: { borderBottomWidth: 2, borderBottomColor: theme.brand.primary },
    tabText: { fontSize: 14, color: theme.text.muted },
    tabTextActive: { color: theme.brand.primary, fontWeight: '600' },
    body: { flex: 1, flexDirection: 'row' },
    listPane: { flex: 1 },
    listPaneNarrow: { maxWidth: 380, borderRightWidth: 1, borderRightColor: theme.border.default },
    detailPane: { flex: 1 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
    emptyText: { color: theme.text.muted, fontSize: 14 },
  });
}

function makeDetailStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg.surface },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.default,
    },
    headerTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.text.primary },
    card: {
      backgroundColor: theme.bg.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border.default,
      padding: 14,
    },
    cardTitle: { fontSize: 13, fontWeight: '700', color: theme.text.muted, marginBottom: 8 },
    infoRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    infoLabel: { width: 64, fontSize: 13, color: theme.text.muted },
    infoValue: { fontSize: 13, color: theme.text.primary, fontWeight: '500' },
    dateChip: {
      backgroundColor: theme.brand.primaryTint,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    dateChipText: { fontSize: 12, color: theme.brand.primary },
    aprvRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.subtle,
    },
    aprvOrd: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.brand.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aprvOrdText: { fontSize: 11, fontWeight: '700', color: theme.brand.primary },
    aprvNm: { fontSize: 13, fontWeight: '600', color: theme.text.primary },
    fileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderRadius: 7,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    fileName: { flex: 1, fontSize: 13 },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    modalBox: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      padding: 20,
    },
    modalTitle: { fontSize: 16, fontWeight: '700', color: theme.text.primary, marginBottom: 12 },
    modalInput: {
      borderWidth: 1,
      borderColor: theme.border.default,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      color: theme.text.primary,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    modalBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
  });
}
