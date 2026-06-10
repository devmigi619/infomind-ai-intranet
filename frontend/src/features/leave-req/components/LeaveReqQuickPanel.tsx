import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ArrowRight, X, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useUiStore } from '../../../store/uiStore';
import { useLeaveReqList, type LeaveReqSummaryDto } from '../api';

const fontFamily = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// 섹션당 최대 표시 건수
const MAX_PER_SECTION = 3;

// ─── 상태 표시 ────────────────────────────────────────────────────────────────

const SE_LABEL: Record<string, string> = {
  '1': '신청',
  '2': '진행 중',
  '3': '승인',
  '9': '반려',
};

function StatusBadge({ se, theme }: { se: string; theme: ReturnType<typeof useTheme> }) {
  const cfg: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    '1': { bg: theme.semantic.info,    text: '#fff', icon: <Clock size={9} color="#fff" /> },
    '2': { bg: theme.semantic.warning, text: '#fff', icon: <Clock size={9} color="#fff" /> },
    '3': { bg: theme.semantic.success, text: '#fff', icon: <CheckCircle size={9} color="#fff" /> },
    '9': { bg: theme.semantic.danger,  text: '#fff', icon: <XCircle size={9} color="#fff" /> },
  };
  const c = cfg[se] ?? cfg['1'];
  return (
    <View className="flex-row items-center gap-[3px] rounded-full px-1.5 py-0.5" style={{ backgroundColor: c.bg }}>
      {c.icon}
      <Text className="text-[10px] font-semibold" style={{ color: c.text, fontFamily }}>{SE_LABEL[se] ?? se}</Text>
    </View>
  );
}

// ─── 날짜 포맷 ────────────────────────────────────────────────────────────────

function fmtYmd(ymd: string | null): string {
  if (!ymd) return '';
  if (ymd.length === 8) return `${ymd.slice(4, 6)}/${ymd.slice(6, 8)}`;
  return ymd.slice(5, 10); // ISO → MM-DD
}

function dateRangeLabel(start: string | null, end: string | null): string {
  if (!start) return '-';
  if (!end || start === end) return fmtYmd(start);
  return `${fmtYmd(start)} ~ ${fmtYmd(end)}`;
}

// ─── 카드 ─────────────────────────────────────────────────────────────────────

function LeaveCard({
  item,
  showRequester,
  onPress,
  theme,
}: {
  item: LeaveReqSummaryDto;
  showRequester: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const typeName = [item.leaveMstNm, item.leaveDtlNm].filter(Boolean).join(' / ');
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="p-3 rounded-lg border mb-2 gap-1"
      style={{ backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.subtle }}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-[13px] font-medium" style={{ color: theme.text.primary, fontFamily }} numberOfLines={1}>
          {typeName}
        </Text>
        <StatusBadge se={item.aprvRsltSe} theme={theme} />
      </View>
      <Text className="text-[11px]" style={{ color: theme.text.muted, fontFamily }} numberOfLines={1}>
        {showRequester ? `${item.reqUserNm} · ` : ''}
        {dateRangeLabel(item.startYmd, item.endYmd)} · {
          item.leaveUseDcnt % 1 === 0
            ? item.leaveUseDcnt
            : Number(item.leaveUseDcnt).toFixed(1)
        }일
      </Text>
    </TouchableOpacity>
  );
}

// ─── 섹션 헤더 ────────────────────────────────────────────────────────────────

function SectionLabel({ label, theme }: { label: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <Text className="text-[10px] font-semibold uppercase tracking-wider mt-3 mb-1 mx-1" style={{ color: theme.text.subtle, fontFamily }}>{label}</Text>
  );
}

// ─── 섹션 내 빈 상태 ──────────────────────────────────────────────────────────

function SectionEmpty({ message, theme }: { message: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <Text className="text-[13px] px-1 py-1" style={{ color: theme.text.subtle, fontFamily }}>{message}</Text>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

interface LeaveReqQuickPanelProps {
  onClose: () => void;
}

export function LeaveReqQuickPanel({ onClose }: LeaveReqQuickPanelProps) {
  const theme = useTheme();
  const setActiveFullScreen = useUiStore((st) => st.setActiveFullScreen);
  const closeLeftPanel = useUiStore((st) => st.closeLeftPanel);

  const { data: approverList = [], isLoading: approverLoading } = useLeaveReqList('approver');
  const { data: myList = [],      isLoading: myLoading }       = useLeaveReqList('my');
  const { data: refList = [],     isLoading: refLoading }      = useLeaveReqList('ref');

  const isLoading = approverLoading || myLoading || refLoading;

  const handleOpenFull = () => {
    closeLeftPanel();
    setActiveFullScreen('leave-req' as any);
  };

  const handleItemPress = () => {
    closeLeftPanel();
    setActiveFullScreen('leave-req' as any);
  };

  return (
    <View className="flex-1">
      {/* 헤더 */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderBottomColor: theme.border.subtle }}>
        <Text className="text-sm font-medium" style={{ color: theme.text.primary, fontFamily }}>휴가신청</Text>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            onPress={handleOpenFull}
            className="flex-row items-center gap-1 px-3 py-1.5 rounded-md"
            style={{ backgroundColor: theme.brand.primaryTint }}
            activeOpacity={0.7}
          >
            <Text className="text-xs font-medium" style={{ color: theme.brand.primary, fontFamily }}>열기</Text>
            <ArrowRight size={12} color={theme.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} className="w-7 h-7 items-center justify-center rounded-md" activeOpacity={0.7}>
            <X size={14} color={theme.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 본문 */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.brand.primary} size="small" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, gap: 4 }} showsVerticalScrollIndicator={false}>

          {/* ── 결재 대기 ── */}
          <SectionLabel label="결재 대기" theme={theme} />
          {approverList.length === 0 ? (
            <SectionEmpty message="결재 대기 중인 건이 없습니다." theme={theme} />
          ) : (
            approverList.slice(0, MAX_PER_SECTION).map((item) => (
              <LeaveCard
                key={`aprv-${item.reqUserId}-${item.reqSn}`}
                item={item}
                showRequester
                onPress={handleItemPress}
                theme={theme}
              />
            ))
          )}
          {approverList.length > MAX_PER_SECTION && (
            <TouchableOpacity onPress={handleOpenFull} activeOpacity={0.7}>
              <Text className="text-[11px] text-center py-1 mb-1" style={{ color: theme.brand.primary, fontFamily }}>
                +{approverList.length - MAX_PER_SECTION}건 더 보기
              </Text>
            </TouchableOpacity>
          )}

          {/* ── 내 신청 ── */}
          <SectionLabel label="내 신청" theme={theme} />
          {myList.length === 0 ? (
            <SectionEmpty message="신청 내역이 없습니다." theme={theme} />
          ) : (
            myList.slice(0, MAX_PER_SECTION).map((item) => (
              <LeaveCard
                key={`my-${item.reqUserId}-${item.reqSn}`}
                item={item}
                showRequester={false}
                onPress={handleItemPress}
                theme={theme}
              />
            ))
          )}
          {myList.length > MAX_PER_SECTION && (
            <TouchableOpacity onPress={handleOpenFull} activeOpacity={0.7}>
              <Text className="text-[11px] text-center py-1 mb-1" style={{ color: theme.brand.primary, fontFamily }}>
                +{myList.length - MAX_PER_SECTION}건 더 보기
              </Text>
            </TouchableOpacity>
          )}

          {/* ── 결재 참조 ── */}
          <SectionLabel label="결재 참조" theme={theme} />
          {refList.length === 0 ? (
            <SectionEmpty message="참조된 신청 건이 없습니다." theme={theme} />
          ) : (
            refList.slice(0, MAX_PER_SECTION).map((item) => (
              <LeaveCard
                key={`ref-${item.reqUserId}-${item.reqSn}`}
                item={item}
                showRequester
                onPress={handleItemPress}
                theme={theme}
              />
            ))
          )}
          {refList.length > MAX_PER_SECTION && (
            <TouchableOpacity onPress={handleOpenFull} activeOpacity={0.7}>
              <Text className="text-[11px] text-center py-1 mb-1" style={{ color: theme.brand.primary, fontFamily }}>
                +{refList.length - MAX_PER_SECTION}건 더 보기
              </Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      )}
    </View>
  );
}
