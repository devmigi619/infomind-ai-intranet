import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowRight, X } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing } from '../../../shared/constants/spacing';
import { radius } from '../../../shared/constants/radius';
import { fontSize, fontWeight } from '../../../shared/constants/typography';
import { fmtYmdDash, getWeekRange, parseYmd, toYmd } from '../../../shared/utils/date';
import { useUiStore } from '../../../store/uiStore';
import { type MyReportRound, type ReportStatus, useMyReportRounds } from '../api';

const fontFamily = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });
const MAX_ITEMS = 5;

interface ReportQuickPanelProps {
  onClose: () => void;
}

const STATUS_LABEL: Record<ReportStatus, string> = {
  NOT_WRITTEN: '미작성',
  DRAFT: '임시저장',
  SUBMITTED: '제출 완료',
};

export function ReportQuickPanel({ onClose }: ReportQuickPanelProps) {
  const theme = useTheme();
  const closeLeftPanel = useUiStore((s) => s.closeLeftPanel);
  const setActiveFullScreen = useUiStore((s) => s.setActiveFullScreen);
  const { data: rounds = [], isLoading, error } = useMyReportRounds();

  const today = useMemo(() => toYmd(new Date()), []);
  const currentReports = useMemo(
    () => rounds.filter((round) => isCurrentRound(round, today)).sort((a, b) => compareReportUrgency(a, b, today)).slice(0, MAX_ITEMS),
    [rounds, today],
  );

  const handleOpenFull = () => {
    closeLeftPanel();
    setActiveFullScreen('report');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>보고</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleOpenFull}
            style={[styles.openButton, { backgroundColor: theme.brand.primaryTint }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.openButtonText, { color: theme.brand.primary }]}>열기</Text>
            <ArrowRight size={12} color={theme.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <X size={14} color={theme.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.brand.primary} size="small" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.semantic.danger }]}>
            보고 정보를 불러오지 못했습니다.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {currentReports.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.text.subtle }]}>
              현재 진행 중인 보고가 없습니다.
            </Text>
          ) : (
            currentReports.map((round) => (
              <ReportCard
                key={`${round.rptFormId}-${round.roundSn}`}
                round={round}
                today={today}
                theme={theme}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function ReportCard({
  round,
  today,
  theme,
}: {
  round: MyReportRound;
  today: string;
  theme: ReturnType<typeof useTheme>;
}) {
  const urgency = getUrgency(round, today);
  const statusColor = getStatusColor(round.status, urgency, theme);
  const statusBg = getStatusBg(round.status, urgency, theme);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.bg.surfaceAlt,
          borderColor: urgency === 'HIGH' ? theme.semantic.danger : theme.border.subtle,
          borderLeftColor: statusColor,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardTitleBlock}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]} numberOfLines={1}>
            {round.rptTtl}
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.text.muted }]} numberOfLines={1}>
            {round.roundNm}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABEL[round.status]}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.metaText, { color: theme.text.muted }]}>
          기준일 {fmtSafeYmd(round.roundYmd)}
        </Text>
        <Text style={[styles.dueText, { color: statusColor }]}>
          {round.status === 'SUBMITTED' && round.sbmtYmd
            ? `제출 ${fmtSafeYmd(round.sbmtYmd)}`
            : getDateDistanceLabel(round.roundYmd, today)}
        </Text>
      </View>
    </View>
  );
}

function isCurrentRound(round: MyReportRound, today: string) {
  const cadence = (round.rptDtSe ?? '').toUpperCase();
  const roundYmd = round.roundYmd;
  if (!isYmd(roundYmd)) return false;

  if (cadence.includes('MONTH') || cadence.includes('월')) {
    return roundYmd.slice(0, 6) === today.slice(0, 6);
  }
  if (cadence.includes('WEEK') || cadence.includes('주')) {
    const { st, end } = getWeekRange(parseYmd(today));
    return roundYmd >= st && roundYmd <= end;
  }
  if (cadence.includes('DAY') || cadence.includes('일')) {
    return roundYmd === today;
  }

  const distance = diffDays(roundYmd, today);
  return distance >= -7 && distance <= 7;
}

function compareReportUrgency(a: MyReportRound, b: MyReportRound, today: string) {
  const rankA = getSortRank(a, today);
  const rankB = getSortRank(b, today);
  if (rankA !== rankB) return rankA - rankB;
  return Math.abs(diffDays(a.roundYmd, today)) - Math.abs(diffDays(b.roundYmd, today));
}

function getSortRank(round: MyReportRound, today: string) {
  if (round.status === 'SUBMITTED') return 3;
  const distance = diffDays(round.roundYmd, today);
  if (distance <= 1) return 0;
  if (distance <= 3) return 1;
  return 2;
}

function getUrgency(round: MyReportRound, today: string): 'HIGH' | 'NORMAL' | 'DONE' {
  if (round.status === 'SUBMITTED') return 'DONE';
  return diffDays(round.roundYmd, today) <= 1 ? 'HIGH' : 'NORMAL';
}

function getStatusColor(
  status: ReportStatus,
  urgency: 'HIGH' | 'NORMAL' | 'DONE',
  theme: ReturnType<typeof useTheme>,
) {
  if (status === 'SUBMITTED') return theme.semantic.success;
  if (urgency === 'HIGH') return theme.semantic.danger;
  if (status === 'DRAFT') return theme.semantic.warning;
  return theme.brand.primary;
}

function getStatusBg(
  status: ReportStatus,
  urgency: 'HIGH' | 'NORMAL' | 'DONE',
  theme: ReturnType<typeof useTheme>,
) {
  if (status === 'SUBMITTED') return theme.semanticTint.success;
  if (urgency === 'HIGH') return theme.semanticTint.danger;
  if (status === 'DRAFT') return theme.semanticTint.warning;
  return theme.brand.primaryTint;
}

function getDateDistanceLabel(ymd: string, today: string) {
  const distance = diffDays(ymd, today);
  if (distance === 0) return '기준일 오늘';
  if (distance > 0) return `D-${distance}`;
  return '기준일 지남';
}

function diffDays(ymd: string, today: string) {
  if (!isYmd(ymd) || !isYmd(today)) return 999;
  const lhs = parseYmd(ymd).getTime();
  const rhs = parseYmd(today).getTime();
  return Math.round((lhs - rhs) / 86400000);
}

function fmtSafeYmd(ymd: string | null) {
  if (!ymd || !isYmd(ymd)) return '-';
  return fmtYmdDash(ymd);
}

function isYmd(value: string | null | undefined) {
  return !!value && /^\d{8}$/.test(value);
}

const styles = StyleSheet.create({
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
    padding: spacing.lg,
  },
  body: {
    padding: spacing.md,
    gap: 4,
  },
  emptyText: {
    fontSize: fontSize.small,
    fontFamily,
    padding: spacing.md,
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
  cardSubtitle: {
    fontSize: fontSize.caption,
    fontFamily,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaText: {
    flex: 1,
    fontSize: fontSize.caption,
    fontFamily,
  },
  dueText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
});
