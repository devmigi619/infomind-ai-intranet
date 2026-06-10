import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { getDeptColor } from '../../../shared/constants/colors';
import { fontSize, fontWeight } from '../../../shared/constants/typography';
import { spacing } from '../../../shared/constants/spacing';
import {
  toYmd,
  parseYmd,
  addDays,
  DOW_LABELS,
  WEEKEND_COLORS,
} from '../../../shared/utils/date';
import type { ScheduleResponse } from '../api';
import { fmtHhmm } from './_dayTimeline';

interface ListViewProps {
  /** 리스트의 기준일(시작일). YYYYMMDD — 사용자가 prev/next로 이동 가능 */
  startYmd: string;
  /** 기준일부터 listLimit일치 일정 */
  schedules: ScheduleResponse[];
  /** 한 번에 표시할 일수 */
  listLimit: number;
  /** "N일 더 보기" 버튼 핸들러 — listLimit를 증가시킨다 */
  onLoadMore: () => void;
  /** 한 번에 더 불러올 일수 (버튼 라벨 표기용) */
  loadMoreStep?: number;
  onSchedulePress?: (s: ScheduleResponse) => void;
  onEmptyCellPress?: (ymd: string) => void;
}

interface DayBlock {
  date: Date;
  ymd: string;
  dow: number;
  items: ScheduleResponse[];
}

/** 시작일부터 listLimit일까지, 일정 있는 날만 추려서 묶는다.
 *  - 시간 일정은 그 날 시작일에만 표시
 *  - 종일/멀티데이는 그 날에 걸치면 표시 (시작일 한 번만 — mockup 패턴)
 *    → 시작일 != 그 날 인 멀티데이는 제외. 다만 시작일이 startYmd 이전이라
 *      이미 지나간 멀티데이는 startYmd에 한 번 표시해주는 게 자연스럽지만,
 *      과거 일정을 끌어오면 백엔드 범위 가정과 어긋남. 그래서 "시작일에만" 룰을 따른다. */
function buildDayBlocks(
  startYmd: string,
  listLimit: number,
  schedules: ScheduleResponse[],
): DayBlock[] {
  const startDate = parseYmd(startYmd);
  const blocks: DayBlock[] = [];
  for (let i = 0; i < listLimit; i++) {
    const d = addDays(startDate, i);
    const dy = toYmd(d);
    const items = schedules
      .filter((s) => s.displayStYmd === dy)
      .sort((a, b) => {
        // 종일 먼저 → 시간순
        if (a.allday !== b.allday) return a.allday ? -1 : 1;
        const ah = a.schdStHr ?? '0000';
        const bh = b.schdStHr ?? '0000';
        return ah.localeCompare(bh);
      });
    if (items.length > 0) {
      blocks.push({ date: d, ymd: dy, dow: d.getDay(), items });
    }
  }
  return blocks;
}

export function ListView({
  startYmd,
  schedules,
  listLimit,
  onLoadMore,
  loadMoreStep = 15,
  onSchedulePress,
  onEmptyCellPress,
}: ListViewProps) {
  const theme = useTheme();

  const todayY = useMemo(() => toYmd(new Date()), []);
  const tomorrowY = useMemo(() => toYmd(addDays(new Date(), 1)), []);

  const blocks = useMemo(
    () => buildDayBlocks(startYmd, listLimit, schedules),
    [startYmd, listLimit, schedules],
  );

  return (
    <ScrollView style={{ backgroundColor: theme.bg.surface }} className="flex-1" contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.lg }}>
      {blocks.length === 0 ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onEmptyCellPress?.(startYmd)}
          style={{ paddingVertical: spacing.xl, paddingHorizontal: spacing.base }}
          className="items-center"
        >
          <Text style={{ color: theme.text.subtle }} className="text-[12px]">
            앞으로 {listLimit}일간 일정이 없습니다.
          </Text>
        </TouchableOpacity>
      ) : (
        blocks.map((block) => {
          const isToday = block.ymd === todayY;
          const isTomorrow = block.ymd === tomorrowY;
          const lblMain = isToday
            ? '오늘'
            : isTomorrow
            ? '내일'
            : `${block.date.getMonth() + 1}/${block.date.getDate()}`;
          const lblSub =
            isToday || isTomorrow
              ? `${block.date.getMonth() + 1}/${block.date.getDate()} ${DOW_LABELS[block.dow]}`
              : `${DOW_LABELS[block.dow]}요일`;

          const dateColor = isToday
            ? theme.brand.primary
            : block.dow === 0
            ? WEEKEND_COLORS.sun
            : block.dow === 6
            ? WEEKEND_COLORS.sat
            : theme.text.primary;
          const subColor = isToday
            ? theme.brand.primary
            : theme.text.muted;

          return (
            <View
              key={block.ymd}
              style={{ borderBottomColor: theme.border.subtle }}
              className="flex-row border-b"
            >
              {/* 날짜 라벨 (왼쪽) */}
              <View style={{ width: 96, paddingHorizontal: spacing.base, paddingVertical: spacing.md }}>
                <Text style={{ color: dateColor }} className="text-[16px] font-bold">
                  {lblMain}
                </Text>
                <Text
                  style={{ color: subColor, opacity: isToday ? 0.8 : 1 }}
                  className="text-[12px] font-medium mt-0.5"
                  numberOfLines={1}
                >
                  {lblSub}
                </Text>
              </View>

              {/* 일정 리스트 (오른쪽) */}
              <View className="flex-1 min-w-0">
                {block.items.map((ev) => {
                  const color = getDeptColor(ev.deptCd);
                  const isTimed = !ev.allday && !!ev.schdStHr && !!ev.schdEndHr;
                  const isRange = ev.displayStYmd !== ev.displayEndYmd;
                  const rangeText = isRange
                    ? ` · ${ev.displayStYmd.slice(4, 6)}/${ev.displayStYmd.slice(6, 8)} – ${ev.displayEndYmd.slice(4, 6)}/${ev.displayEndYmd.slice(6, 8)}`
                    : '';
                  return (
                    <TouchableOpacity
                      key={`${ev.schdSn}-${ev.occurrenceYmd ?? ev.displayStYmd}`}
                      activeOpacity={0.7}
                      onPress={() => onSchedulePress?.(ev)}
                      style={{
                        borderLeftColor: color,
                        backgroundColor: theme.bg.surface,
                        borderBottomColor: theme.border.subtle,
                        borderLeftWidth: 3,
                        borderBottomWidth: 1,
                        paddingHorizontal: spacing.base,
                        paddingVertical: spacing.sm + 2,
                      }}
                      className="flex-row items-center gap-4"
                    >
                      <View className="w-16">
                        {isTimed ? (
                          <>
                            <Text
                              style={{ color: theme.text.primary }}
                              className="text-[14px] font-bold"
                              numberOfLines={1}
                            >
                              {fmtHhmm(ev.schdStHr)}
                            </Text>
                            <Text
                              style={{ color: theme.text.muted }}
                              className="text-[10px] font-medium mt-0.5"
                              numberOfLines={1}
                            >
                              {fmtHhmm(ev.schdEndHr)}
                            </Text>
                          </>
                        ) : (
                          <Text
                            style={{ color: theme.text.muted }}
                            className="text-[10px] font-bold tracking-[0.3px]"
                            numberOfLines={1}
                          >
                            종일
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
                        <Text
                          style={{ color: theme.text.muted }}
                          className="text-[10px] mt-1"
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          <Text style={{ color }} className="font-semibold">
                            {ev.deptNm || '전체공개'}
                          </Text>
                          {ev.userName ? ` · ${ev.userName}` : ''}
                          {rangeText}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })
      )}

      {/* "N일 더 보기" 버튼 — 일정이 있을 때만 노출 (mockup 패턴) */}
      {blocks.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onLoadMore}
          style={{
            borderColor: theme.border.default,
            backgroundColor: theme.bg.surfaceAlt,
            borderWidth: 1,
            borderRadius: 8,
            paddingVertical: spacing.sm + 2,
            marginHorizontal: spacing.base,
            marginTop: spacing.md,
          }}
          className="flex-row items-center justify-center gap-2"
        >
          <ChevronDown size={14} color={theme.text.muted} />
          <Text style={{ color: theme.text.body }} className="text-[14px] font-medium">
            {loadMoreStep}일 더 보기 (현재 {listLimit}일)
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

