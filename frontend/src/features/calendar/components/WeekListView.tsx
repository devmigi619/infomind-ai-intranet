import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { getDeptColor } from '../../../shared/constants/colors';
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

  const weekDates = useMemo(() => getWeekDates(current), [current]);
  const todayY = useMemo(() => toYmd(new Date()), []);

  const sections = useMemo(
    () => buildDaySections(weekDates, schedules),
    [weekDates, schedules],
  );

  return (
    <ScrollView style={{ backgroundColor: theme.bg.surface }} className="flex-1" contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.lg }}>
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
            style={{ borderBottomColor: theme.border.subtle }}
            className="border-b"
          >
            {/* 요일 헤더 */}
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => onEmptyCellPress?.(section.ymd)}
              style={{
                backgroundColor: isToday
                  ? theme.brand.primaryTintSoft
                  : theme.bg.surfaceAlt,
                borderBottomColor: theme.border.subtle,
                borderBottomWidth: 1,
                paddingHorizontal: spacing.base,
                paddingVertical: spacing.sm + 2,
              }}
              className="flex-row items-baseline gap-1.5"
            >
              <Text style={{ color: dateColor }} className="text-[16px] font-bold">
                {fmtMonthDay(section.date)}
              </Text>
              <Text style={{ color: dowColor }} className="text-[12px] font-semibold">
                ({DOW_LABELS_EN_SHORT[section.dow]})
              </Text>
            </TouchableOpacity>

            {/* 일정 리스트 */}
            {section.schedules.length === 0 ? (
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => onEmptyCellPress?.(section.ymd)}
                style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.md }}
              >
                <Text style={{ color: theme.text.subtle }} className="text-[12px]">
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
                    style={{
                      borderLeftColor: color,
                      borderLeftWidth: 3,
                      paddingHorizontal: spacing.base,
                      paddingVertical: spacing.sm + 2,
                    }}
                    className="flex-row items-center gap-4"
                  >
                    <View className="w-[86px]">
                      {ev.allday || !isTimedValid ? (
                        <Text
                          style={{ color: theme.text.muted }}
                          className="text-[10px] font-bold tracking-[0.3px]"
                        >
                          All day
                        </Text>
                      ) : (
                        <Text
                          style={{ color: theme.text.body }}
                          className="text-[14px] font-bold"
                          numberOfLines={1}
                        >
                          {fmtHhmm(ev.schdStHr)}~{fmtHhmm(ev.schdEndHr)}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text
                        style={{ color: theme.text.primary }}
                        className="text-[15px] font-medium"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {ev.schdNm}
                      </Text>
                      {!!ev.deptNm && (
                        <Text
                          style={{ color: theme.text.muted }}
                          className="text-[10px] mt-0.5"
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

