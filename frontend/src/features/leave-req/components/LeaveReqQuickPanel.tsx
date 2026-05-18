import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ArrowRight, X, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useUiStore } from '../../../store/uiStore';
import { spacing } from '../../../shared/constants/spacing';
import { radius } from '../../../shared/constants/radius';
import { fontSize, fontWeight } from '../../../shared/constants/typography';
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
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      {c.icon}
      <Text style={[s.badgeText, { color: c.text }]}>{SE_LABEL[se] ?? se}</Text>
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
      style={[s.card, { backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.subtle }]}
    >
      <View style={s.cardTop}>
        <Text style={[s.cardTitle, { color: theme.text.primary }]} numberOfLines={1}>
          {typeName}
        </Text>
        <StatusBadge se={item.aprvRsltSe} theme={theme} />
      </View>
      <Text style={[s.cardMeta, { color: theme.text.muted }]} numberOfLines={1}>
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
    <Text style={[s.sectionLabel, { color: theme.text.subtle }]}>{label}</Text>
  );
}

// ─── 섹션 내 빈 상태 ──────────────────────────────────────────────────────────

function SectionEmpty({ message, theme }: { message: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <Text style={[s.emptyText, { color: theme.text.subtle }]}>{message}</Text>
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
    <View style={s.container}>
      {/* 헤더 */}
      <View style={[s.header, { borderBottomColor: theme.border.subtle }]}>
        <Text style={[s.headerTitle, { color: theme.text.primary }]}>휴가신청</Text>
        <View style={s.headerActions}>
          <TouchableOpacity
            onPress={handleOpenFull}
            style={[s.openButton, { backgroundColor: theme.brand.primaryTint }]}
            activeOpacity={0.7}
          >
            <Text style={[s.openButtonText, { color: theme.brand.primary }]}>열기</Text>
            <ArrowRight size={12} color={theme.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={s.closeButton} activeOpacity={0.7}>
            <X size={14} color={theme.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 본문 */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={theme.brand.primary} size="small" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

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
              <Text style={[s.moreText, { color: theme.brand.primary }]}>
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
              <Text style={[s.moreText, { color: theme.brand.primary }]}>
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
              <Text style={[s.moreText, { color: theme.brand.primary }]}>
                +{refList.length - MAX_PER_SECTION}건 더 보기
              </Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      )}
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    fontFamily,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  openButtonText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.medium,
    fontFamily,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    padding: spacing.md,
    gap: 4,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    marginHorizontal: 4,
    fontFamily,
  },

  emptyText: {
    fontSize: fontSize.small,
    fontFamily,
    paddingHorizontal: 4,
    paddingVertical: spacing.xs,
  },

  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    fontFamily,
  },
  cardMeta: {
    fontSize: fontSize.caption,
    fontFamily,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },

  moreText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    fontFamily,
    textAlign: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
});
