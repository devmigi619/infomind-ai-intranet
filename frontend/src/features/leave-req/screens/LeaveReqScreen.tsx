import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
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

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

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
    <View
      className="flex-row items-center gap-1 px-2 py-[3px] rounded-full"
      style={{ backgroundColor: c.bg }}
    >
      {c.icon}
      <Text className="text-white text-[11px] font-semibold" style={{ fontFamily: WEB_FONT }}>{SE_LABEL[se] ?? se}</Text>
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
      <View className="flex-1 justify-center items-center">
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

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg.surface }}>
      {/* 헤더 */}
      <View className="flex-row items-center gap-2 px-4 py-3 border-b" style={{ borderBottomColor: theme.border.default }}>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <ChevronRight size={20} color={theme.text.muted} />
        </TouchableOpacity>
        <Text className="flex-1 text-[15px] font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>신청 상세</Text>
        <StatusBadge se={detail.aprvRsltSe} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* 기본 정보 */}
        <View className="rounded-xl border p-3.5" style={{ backgroundColor: theme.bg.surface, borderColor: theme.border.default }}>
          <Text className="text-[13px] font-bold mb-2" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>신청 정보</Text>
          <View className="flex-row gap-2 mb-1">
            <Text className="w-16 text-[13px]" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>신청자</Text>
            <Text className="text-[13px] font-medium" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{detail.reqUserNm}</Text>
          </View>
          <View className="flex-row gap-2 mb-1">
            <Text className="w-16 text-[13px]" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>휴가유형</Text>
            <Text className="text-[13px] font-medium" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{detail.leaveMstNm}{detail.leaveDtlNm ? ` / ${detail.leaveDtlNm}` : ''}</Text>
          </View>
          <View className="flex-row gap-2 mb-1">
            <Text className="w-16 text-[13px]" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>사용일수</Text>
            <Text className="text-[13px] font-medium" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{detail.leaveUseDcnt}일</Text>
          </View>
          <View className="flex-row gap-2 mb-1">
            <Text className="w-16 text-[13px]" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>사유</Text>
            <Text className="text-[13px] font-medium flex-1" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{detail.leaveRsn ?? '-'}</Text>
          </View>
          {detail.crtAt && (
            <View className="flex-row gap-2 mb-1">
              <Text className="w-16 text-[13px]" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>신청일</Text>
              <Text className="text-[13px] font-medium" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{detail.crtAt.slice(0, 10)}</Text>
            </View>
          )}
        </View>

        {/* 사용 날짜 */}
        <View className="rounded-xl border p-3.5" style={{ backgroundColor: theme.bg.surface, borderColor: theme.border.default }}>
          <Text className="text-[13px] font-bold mb-2" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>사용 날짜 ({detail.dates.length}일)</Text>
          {detail.leaveStHhmm && detail.leaveEndHhmm && (
            <View className="flex-row gap-2 mb-2">
              <Text className="w-16 text-[13px]" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>시간</Text>
              <Text className="text-[13px] font-semibold" style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}>
                {`${detail.leaveStHhmm.slice(0,2)}:${detail.leaveStHhmm.slice(2,4)}`}
                {' ~ '}
                {`${detail.leaveEndHhmm.slice(0,2)}:${detail.leaveEndHhmm.slice(2,4)}`}
              </Text>
            </View>
          )}
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            {detail.dates.map((d) => (
              <View key={d} className="rounded-lg px-2 py-[3px]" style={{ backgroundColor: theme.brand.primaryTint }}>
                <Text className="text-xs" style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}>{fmtYmd(d)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 결재선 */}
        <View className="rounded-xl border p-3.5" style={{ backgroundColor: theme.bg.surface, borderColor: theme.border.default }}>
          <Text className="text-[13px] font-bold mb-2" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>결재선</Text>
          {detail.aprvList.map((a, idx) => {
            // 이 결재자보다 앞 순서 중 미처리가 있으면 대기 중
            const isWaiting = a.aprvSe === null &&
              detail.aprvList.some((x) => x.aprvOrd < a.aprvOrd && x.aprvSe === null);
            return (
              <View key={a.aprvUserId} className="flex-row items-start gap-3 py-3.5 border-b" style={idx === detail.aprvList.length - 1 ? { borderBottomWidth: 0 } : { borderBottomColor: theme.border.subtle }}>
                {/* 순번 뱃지 */}
                <View className="w-6 h-6 rounded-full items-center justify-center" style={{
                  backgroundColor: a.aprvSe === '3' ? '#D1FAE5' : a.aprvSe === '9' ? '#FEE2E2' : theme.brand.primaryTint
                }}>
                  <Text className="text-[11px] font-bold" style={{
                    color: a.aprvSe === '3' ? '#10B981' : a.aprvSe === '9' ? '#EF4444' : theme.brand.primary,
                    fontFamily: WEB_FONT
                  }}>{a.aprvOrd}</Text>
                </View>

                {/* 이름 + 처리 정보 */}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text className="text-[13px] font-semibold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{a.aprvUserNm}</Text>
                  {a.aprvSe ? (
                    <Text className="text-xs" style={{ color: a.aprvSe === '3' ? '#10B981' : '#EF4444', fontWeight: '500', fontFamily: WEB_FONT }}>
                      {APRV_SE_LABEL[a.aprvSe]}{a.aprvYmd ? `  ${fmtYmd(a.aprvYmd)}` : ''}
                    </Text>
                  ) : isWaiting ? (
                    <Text className="text-xs" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}>이전 결재자 처리 후 가능</Text>
                  ) : (
                    <Text className="text-xs" style={{ color: theme.semantic.warning, fontWeight: '500', fontFamily: WEB_FONT }}>결재 대기 중</Text>
                  )}
                  {a.rmk ? <Text className="text-xs" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>사유: {a.rmk}</Text> : null}
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
            <Text style={{ color: theme.text.muted, fontSize: 13, marginTop: 8, fontFamily: WEB_FONT }}>결재자 없음</Text>
          )}
        </View>

        {/* 내 차례가 아닌데 결재자로 등록된 경우 안내 */}
        {myAprv && !isMyTurn && (
          <View className="rounded-lg border p-3 flex-row items-center gap-2" style={{
            backgroundColor: theme.bg.surfaceMute,
            borderColor: theme.border.default,
          }}>
            <Clock size={14} color={theme.text.muted} />
            <Text className="text-xs flex-1" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
              이전 순서 결재자의 처리가 완료되면 승인/반려가 가능합니다.
            </Text>
          </View>
        )}

        {/* 수신참조 */}
        {detail.refList.length > 0 && (
          <View className="rounded-xl border p-3.5" style={{ backgroundColor: theme.bg.surface, borderColor: theme.border.default }}>
            <Text className="text-[13px] font-bold mb-2" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>수신참조</Text>
            <View style={{ gap: 6, marginTop: 8 }}>
              {detail.refList.map((r) => (
                <View
                  key={r.refUserId}
                  className="flex-row items-center gap-2 py-1 border-b"
                  style={{ borderBottomColor: theme.border.subtle }}
                >
                  {/* 이름 */}
                  <Text className="flex-1 text-[13px] font-medium" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>
                    {r.refUserNm}
                  </Text>
                  {/* 조회여부 + 일자 */}
                  {r.qryYn === 'Y' ? (
                    <View style={{ alignItems: 'flex-end', gap: 1 }}>
                      <View className="rounded-md px-1.5 py-0.5" style={{ backgroundColor: '#D1FAE5' }}>
                        <Text className="text-[11px] font-semibold" style={{ color: '#10B981', fontFamily: WEB_FONT }}>조회</Text>
                      </View>
                      {r.updAt && (
                        <Text className="text-[11px]" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
                          {r.updAt.slice(0, 10)}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View className="rounded-md px-1.5 py-0.5" style={{ backgroundColor: theme.bg.surfaceMute }}>
                      <Text className="text-[11px] font-semibold" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}>미조회</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 첨부파일 */}
        {attachments.length > 0 && (
          <View className="rounded-xl border p-3.5" style={{ backgroundColor: theme.bg.surface, borderColor: theme.border.default }}>
            <Text className="text-[13px] font-bold mb-2" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>첨부파일 ({attachments.length})</Text>
            <View style={{ gap: 6, marginTop: 8 }}>
              {attachments.map((f) => (
                <View key={f.afileSn} className="flex-row items-center gap-2 border rounded-[7px] px-2.5 py-2" style={{ borderColor: theme.border.default }}>
                  <FileText size={14} color={theme.text.muted} />
                  <TouchableOpacity className="flex-1" onPress={() => setPreviewFile(f)} activeOpacity={0.7}>
                    <Text className="flex-1 text-[13px]" style={{ color: theme.brand.primary, fontFamily: WEB_FONT }} numberOfLines={1}>
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
        <View className="flex-row gap-2 mt-1">
          {canApprove && (
            <>
              <TouchableOpacity
                className="flex-row items-center gap-1 px-3.5 py-2 rounded-lg flex-1 justify-center"
                style={{ backgroundColor: '#10B981' }}
                onPress={handleApprove}
              >
                <CheckCircle size={14} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13, fontFamily: WEB_FONT }}>승인</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center gap-1 px-3.5 py-2 rounded-lg flex-1 justify-center"
                style={{ backgroundColor: '#EF4444' }}
                onPress={() => setRejectModalOpen(true)}
              >
                <XCircle size={14} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13, fontFamily: WEB_FONT }}>반려</Text>
              </TouchableOpacity>
            </>
          )}
          {canCancel && (
            <TouchableOpacity
              className="flex-row items-center gap-1 px-3.5 py-2 rounded-lg flex-1 justify-center border"
              style={{ backgroundColor: theme.bg.surface, borderColor: theme.border.default }}
              onPress={handleCancel}
            >
              <Text style={{ color: theme.text.body, fontWeight: '600', fontSize: 13, fontFamily: WEB_FONT }}>취소</Text>
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
        <View className="flex-1 bg-black/40 justify-center items-center px-4">
          <View className="w-full max-w-[400px] rounded-xl p-5" style={{ backgroundColor: theme.bg.surface }}>
            <Text className="text-base font-bold mb-3" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>반려 사유</Text>
            <TextInput
              className="border rounded-lg p-2.5 text-sm min-h-[80px]"
              style={{ color: theme.text.primary, borderColor: theme.border.default, fontFamily: WEB_FONT, textAlignVertical: 'top' }}
              value={rejectRmk}
              onChangeText={setRejectRmk}
              placeholder="반려 사유를 입력하세요 (선택)"
              multiline
              numberOfLines={4}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: theme.bg.surfaceMute }}
                onPress={() => setRejectModalOpen(false)}
              >
                <Text style={{ color: theme.text.body, fontWeight: '600', fontFamily: WEB_FONT }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: '#EF4444' }}
                onPress={handleRejectSubmit}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontFamily: WEB_FONT }}>반려</Text>
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
      <View className="p-3.5 items-center">
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
    <View className="m-3.5 rounded-xl border overflow-hidden" style={{
      borderColor: theme.border.default,
      backgroundColor: theme.bg.surfaceMute,
    }}>
      {/* 올해 요약 */}
      <View className="p-3.5">
        <Text className="text-xs font-bold mb-2.5" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
          {cur.year}년 연차 현황
        </Text>

        {/* 수치 행 */}
        <View className="flex-row mb-3">
          {/* 기본 일수 */}
          <View className="flex-1 items-center">
            <Text className="text-2xl font-extrabold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>
              {fmtDcnt(ent)}
            </Text>
            <Text className="text-[11px] mt-0.5" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>기본일수</Text>
          </View>
          <View className="w-[1px] m-1" style={{ backgroundColor: theme.border.subtle }} />
          {/* 사용 */}
          <View className="flex-1 items-center">
            <Text className="text-2xl font-extrabold" style={{ color: theme.semantic.warning, fontFamily: WEB_FONT }}>
              {fmtDcnt(used)}
            </Text>
            <Text className="text-[11px] mt-0.5" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>사용</Text>
          </View>
          <View className="w-[1px] m-1" style={{ backgroundColor: theme.border.subtle }} />
          {/* 잔여 */}
          <View className="flex-1 items-center">
            <Text className="text-2xl font-extrabold" style={{ color: theme.semantic.success, fontFamily: WEB_FONT }}>
              {fmtDcnt(remaining)}
            </Text>
            <Text className="text-[11px] mt-0.5" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>잔여</Text>
          </View>
        </View>

        {/* 프로그레스 바 */}
        <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.border.default }}>
          <View className="h-full rounded-full" style={{
            width: `${pct}%`,
            backgroundColor: pct >= 80 ? theme.semantic.danger : pct >= 50 ? theme.semantic.warning : theme.brand.primary,
          }} />
        </View>
        <Text className="text-[11px] mt-1 text-right" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
          {pct}% 사용
        </Text>
      </View>

      {/* 지난 연도 이력 */}
      {data.history.length > 0 && (
        <View className="border-t p-3.5 gap-1" style={{
          borderTopColor: theme.border.subtle,
        }}>
          <Text className="text-[11px] font-semibold mb-1" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}>
            지난 연도 사용 내역
          </Text>
          {data.history.map((h) => (
            <View key={h.year} className="flex-row justify-between">
              <Text className="text-xs" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>{h.year}년</Text>
              <Text className="text-xs font-semibold" style={{ color: theme.text.body, fontFamily: WEB_FONT }}>
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
  return (
    <TouchableOpacity
      className="flex-row items-center px-4 py-3 border-b gap-3"
      style={{ borderBottomColor: theme.border.default }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text className="text-[13px] font-semibold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>
          {item.leaveMstNm}{item.leaveDtlNm ? ` / ${item.leaveDtlNm}` : ''}
        </Text>
        <Text className="text-xs mt-0.5" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
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

  const [activeTab, setActiveTab] = useState<'my' | 'ref' | 'approver'>('my');
  const [selectedKey, setSelectedKey] = useState<{ reqUserId: string; reqSn: number } | null>(null);

  const { data: list = [], isLoading } = useLeaveReqList(activeTab);

  const handleRowPress = (item: LeaveReqSummaryDto) => {
    setSelectedKey({ reqUserId: item.reqUserId, reqSn: item.reqSn });
  };

  const handleNewRequest = () => {
    setActiveFullScreen('leave-req-form' as any);
  };

  const desktopDetail = selectedKey && !isMobile;
  const mobileDetail = selectedKey && isMobile;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg.surface }}>
      {/* 헤더 */}
      <View className="flex-row items-center justify-between px-5 py-3.5 border-b" style={{ borderBottomColor: theme.border.default }}>
        <Text className="text-[17px] font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>휴가신청</Text>
        <TouchableOpacity className="rounded-lg px-3 py-1.5" style={{ backgroundColor: theme.brand.primary }} onPress={handleNewRequest}>
          <Text className="text-white text-[13px] font-semibold" style={{ fontFamily: WEB_FONT }}>+ 신청하기</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View className="flex-row border-b" style={{ borderBottomColor: theme.border.default }}>
        {(['my', 'ref', 'approver'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            className={`px-5 py-2.5 ${activeTab === tab ? 'border-b-2' : ''}`}
            style={activeTab === tab ? { borderBottomColor: theme.brand.primary } : undefined}
            onPress={() => { setActiveTab(tab); setSelectedKey(null); }}
          >
            <Text className={`text-sm ${activeTab === tab ? 'font-semibold' : ''}`} style={{ color: activeTab === tab ? theme.brand.primary : theme.text.muted, fontFamily: WEB_FONT }}>
              {tab === 'my' ? '내 신청' : tab === 'ref' ? '결재 참조' : '결재 대기'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 본문 */}
      <View className="flex-1 flex-row">
        {/* 목록 */}
        <View className={`${desktopDetail ? "max-w-[380px] border-r" : "flex-1"}`} style={desktopDetail ? { borderRightColor: theme.border.default } : undefined}>
          {/* 내 신청 탭에서만 잔여일수 배너 표시 */}
          {activeTab === 'my' && <LeaveSummaryBanner theme={theme} />}

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={theme.brand.primary} />
          ) : list.length === 0 ? (
            <View className="flex-1 justify-center items-center pt-14">
              <Text className="text-sm" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
                {activeTab === 'my'
                  ? '신청 내역이 없습니다.'
                  : activeTab === 'ref'
                  ? '참조된 신청 건이 없습니다.'
                  : '결재 대기 중인 건이 없습니다.'}
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

        {/* 상세 패널 (데스크탑: 우측) */}
        {desktopDetail && (
          <View className="flex-1">
            <DetailPanel
              reqUserId={selectedKey.reqUserId}
              reqSn={selectedKey.reqSn}
              currentUserId={me?.userId ?? ''}
              onClose={() => setSelectedKey(null)}
            />
          </View>
        )}
      </View>

      {/* 모바일 상세 모달 */}
      {mobileDetail && (
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
  );
}
