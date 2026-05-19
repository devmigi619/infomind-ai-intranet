import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme, AppTheme } from '../../../shared/hooks/useTheme';
import { getDeptColor } from '../../../shared/constants/colors';
import { fontSize, fontWeight } from '../../../shared/constants/typography';
import { spacing } from '../../../shared/constants/spacing';
import { toYmd, getWeekDates, WEEKEND_COLORS } from '../../../shared/utils/date';
import type { ScheduleResponse } from '../api';

interface WeekListViewProps {
  /** 그 주 안의 임의 날짜 — 내부에서 일~토로 정규화 */
  current: Date;
  /** 백엔드에서 받은 해당 주의 일정 (일요일 ~ 토요일 범위) */
  schedules: ScheduleResponse[];
  onSchedulePress?: (s: ScheduleResponse) => void;
  onEmptyCellPress?: (ymd: string) => void;
}

/** 모바일 주뷰 — 요일별 리스트 형태 */

/** 영문 요일 2글자 라벨 */
const DOW_LABELS_EN_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function fmtHhmm(hr: string | null | undefined): string {
  if (!hr) return '';
  if (hr.includes(':')) return hr;
  if (hr.length >= 4) return `${hr.slice(0, 2)}:${hr.slice(2, 4)}`;
  if (hr.length === 2) return `${hr}:00`;
  return hr;
}

/** "MM.DD" 형식 (헤더용) */
function fmtMonthDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${m}.${dd}`;
}

interface DaySection {
  ymd: string;
  date: Date;
  dow: number;
  schedules: ScheduleResponse[];
}

/** 주 일정을 요일별로 모은다. 시간 없는(종일/멀티데이) 일정은 그 일자에 걸치는 모든 날에 표시. */
function buildDaySections(
  weekDates: Date[],
  schedules: ScheduleResponse[],
): DaySection[] {
  return weekDates.map((d) => {
    const ymd = toYmd(d);
    const list = schedules
      .filter((s) => s.displayStYmd <= ymd && s.displayEndYmd >= ymd)
      .sort((a, b) => {
        // 종일 먼저 → 시간순
        if (a.allday !== b.allday) return a.allday ? -1 : 1;
        const ah = a.schdStHr ?? '0000';
        const bh = b.schdStHr ?? '0000';
        return ah.localeCompare(bh);
      });
    return { ymd, date: d, dow: d.getDay(), schedules: list };
  });
}

export function WeekListView({
  current,
  schedules,
  onSchedulePress,
  onEmptyCellPress,
}: WeekListViewProps) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const weekDates = useMemo(() => getWeekDates(current), [current]);
  const todayY = useMemo(() => toYmd(new Date()), []);

  const sections = useMemo(
    () => buildDaySections(weekDates, schedules),
    [weekDates, schedules],
  );

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scrollContent}>
      {sections.map((section) => {
        const isToday = section.ymd === todayY;
        const dowColor =
          section.dow === 0
            ? WEEKEND_COLORS.sun
            : section.dow === 6
            ? WEEKEND_COLORS.sat
            : theme.text.muted;
        const dateColor = isToday
          ? theme.brand.primary
          : section.dow === 0
          ? WEEKEND_COLORS.sun
          : section.dow === 6
          ? WEEKEND_COLORS.sat
          : theme.text.primary;

        return (
          <View
            key={section.ymd}
            style={[s.daySection, { borderBottomColor: theme.border.subtle }]}
          >
            {/* 요일 헤더 */}
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => onEmptyCellPress?.(section.ymd)}
              style={[
                s.dayHeader,
                {
                  backgroundColor: isToday
                    ? theme.brand.primaryTintSoft
                    : theme.bg.surfaceAlt,
                  borderBottomColor: theme.border.subtle,
                },
              ]}
            >
              <Text style={[s.dayHeaderDate, { color: dateColor }]}>
                {fmtMonthDay(section.date)}
              </Text>
              <Text style={[s.dayHeaderDow, { color: dowColor }]}>
                ({DOW_LABELS_EN_SHORT[section.dow]})
              </Text>
            </TouchableOpacity>

            {/* 일정 리스트 */}
            {section.schedules.length === 0 ? (
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => onEmptyCellPress?.(section.ymd)}
                style={s.emptyRow}
              >
                <Text style={[s.emptyText, { color: theme.text.subtle }]}>
                  일정 없음
                </Text>
              </TouchableOpacity>
            ) : (
              section.schedules.map((ev) => {
                const color = getDeptColor(ev.deptCd);
                const isTimedValid = !ev.allday && !!ev.schdStHr && !!ev.schdEndHr;
                return (
                  <TouchableOpacity
                    key={`${ev.schdSn}-${ev.occurrenceYmd ?? ev.displayStYmd}`}
                    activeOpacity={0.7}
                    onPress={() => onSchedulePress?.(ev)}
                    style={[s.listRow, { borderLeftColor: color }]}
                  >
                    <View style={s.listRowTimeWrap}>
                      {ev.allday || !isTimedValid ? (
                        <Text
                          style={[s.listRowTimeAllday, { color: theme.text.muted }]}
                        >
                          All day
                        </Text>
                      ) : (
                        <Text
                          style={[s.listRowTime, { color: theme.text.body }]}
                          numberOfLines={1}
                        >
                          {fmtHhmm(ev.schdStHr)}~{fmtHhmm(ev.schdEndHr)}
                        </Text>
                      )}
                    </View>
                    <View style={s.listRowBody}>
                      <Text
                        style={[s.listRowTitle, { color: theme.text.primary }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {ev.schdNm}
                      </Text>
                      {!!ev.deptNm && (
                        <Text
                          style={[s.listRowMeta, { color: theme.text.muted }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {ev.deptNm}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.bg.surface,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: spacing.lg,
    },
    daySection: {
      borderBottomWidth: 1,
    },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.xs + 2,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: 1,
    },
    dayHeaderDate: {
      fontSize: fontSize.bodyLg,
      fontWeight: fontWeight.bold,
      fontVariant: ['tabular-nums'] as any,
    },
    dayHeaderDow: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
    },
    emptyRow: {
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
    },
    emptyText: {
      fontSize: fontSize.caption,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm + 2,
      borderLeftWidth: 3,
    },
    listRowTimeWrap: {
      width: 86,
    },
    listRowTime: {
      fontSize: fontSize.small,
      fontWeight: fontWeight.bold,
      fontVariant: ['tabular-nums'] as any,
    },
    listRowTimeAllday: {
      fontSize: fontSize.micro,
      fontWeight: fontWeight.bold,
      letterSpacing: 0.3,
    },
    listRowBody: {
      flex: 1,
      minWidth: 0,
    },
    listRowTitle: {
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
    },
    listRowMeta: {
      fontSize: fontSize.micro,
      marginTop: 2,
    },
  });
