import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { FileCheck, Calendar, ClipboardList } from 'lucide-react-native';
import { useTheme } from '../shared/hooks/useTheme';
import { useUiStore } from '../store/uiStore';
import { useChatStore } from '../store/chatStore';
import { useMyApprovals, usePendingApprovals } from '../features/approval/api';
import { useScheduleRange } from '../features/calendar/api';
import { useMyReportRounds } from '../features/report/api';

interface RightPanelHomeProps {
  userName: string;
}

// ── 상수 ────────────────────────────────────────────────────────────────────
const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

const QUICK_ACTIONS = [
  { id: 'vacation', emoji: '🏖️', label: '휴가 신청',    message: '휴가 신청해줘' },
  { id: 'report',   emoji: '📝', label: '보고서 작성',   message: '주간보고 작성해줘' },
  { id: 'vehicle',  emoji: '🚗', label: '차량 예약',     message: '차량 예약해줘' },
  { id: 'meeting',  emoji: '🏢', label: '회의실 예약',   message: '회의실 예약해줘' },
];

// ── 유틸 ────────────────────────────────────────────────────────────────────
function getTodayYmd(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return '좋은 아침';
  if (h < 17) return '좋은 오후';
  return '좋은 저녁';
}

/** "HH:MM" 형식 → "H:MM" (선행 0 제거) */
function fmtTime(t: string | null | undefined): string {
  if (!t) return '';
  return t.replace(/^0/, '');
}

// ── 로딩 스켈레톤 ────────────────────────────────────────────────────────────
function CardSkeleton({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <View
      className="border rounded-xl p-3.5"
      style={{
        backgroundColor: theme.bg.surface,
        borderColor: theme.border.subtle,
      }}
    >
      <View
        className="h-3 rounded-full"
        style={{ backgroundColor: theme.border.subtle, width: '60%' }}
      />
      <View
        className="h-3 rounded-full mt-1.5"
        style={{ backgroundColor: theme.border.subtle, width: '85%' }}
      />
    </View>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export function RightPanelHome({ userName }: RightPanelHomeProps) {
  const theme = useTheme();
  const handleNavClick       = useUiStore((s) => s.handleNavClick);
  const setPendingQuickMessage = useChatStore((s) => s.setPendingQuickMessage);

  const todayYmd = useMemo(() => getTodayYmd(), []);

  // ── 데이터 쿼리 ──────────────────────────────────────────────────────────
  const { data: pendingData,  isLoading: pendingLoading  } = usePendingApprovals();
  const { data: mineData,     isLoading: mineLoading     } = useMyApprovals();
  const { data: scheduleData, isLoading: scheduleLoading } = useScheduleRange({
    st:   todayYmd,
    end:  todayYmd,
    mine: true,
  });
  const { data: roundsData,   isLoading: roundsLoading   } = useMyReportRounds();

  // ── 결재 집계 ─────────────────────────────────────────────────────────────
  const aprvLoading    = pendingLoading || mineLoading;
  const pendingCount   = pendingData?.length ?? 0;
  const activeMineCount = mineData?.filter((m) => m.aprvRsltSe === '1' || m.aprvRsltSe === '2').length ?? 0;
  const totalAprvCount = pendingCount + activeMineCount;

  const firstPendingItem = pendingData?.[0] ?? mineData?.[0];

  // ── 오늘 일정 집계 ────────────────────────────────────────────────────────
  const scheduleCount = scheduleData?.length ?? 0;
  const scheduleBodyText = useMemo(() => {
    if (!scheduleData || scheduleData.length === 0) return '오늘 등록된 일정이 없습니다.';
    return scheduleData
      .slice(0, 3)
      .map((s) => {
        const time = s.allday ? '종일' : fmtTime(s.schdStHr) || '시간미정';
        return `${time} ${s.schdNm}`;
      })
      .join(' · ');
  }, [scheduleData]);

  // ── 업무보고 현황 ─────────────────────────────────────────────────────────
  const latestRound = roundsData?.[0] ?? null;
  const rptStatus   = latestRound?.status ?? null;
  const rptStatusLabel =
    rptStatus === 'SUBMITTED'   ? '제출완료' :
    rptStatus === 'DRAFT'       ? '작성 중' :
    rptStatus === 'NOT_WRITTEN' ? '미작성' : null;
  const rptStatusColor =
    rptStatus === 'SUBMITTED'   ? theme.semantic.success :
    rptStatus === 'DRAFT'       ? theme.semantic.warning :
    rptStatus === 'NOT_WRITTEN' ? theme.semantic.danger  : theme.text.subtle;
  const rptStatusBg =
    rptStatus === 'SUBMITTED'   ? theme.semanticTint.success :
    rptStatus === 'DRAFT'       ? theme.semanticTint.warning :
    rptStatus === 'NOT_WRITTEN' ? theme.semanticTint.danger  : theme.bg.surfaceMute;

  return (
    <View className="flex-col" style={{ gap: 12 }}>
      {/* 인사말 */}
      <View
        className="p-3.5 rounded-xl"
        style={{ backgroundColor: theme.brand.primaryTintSoft }}
      >
        <Text
          style={{
            fontSize: 13,
            lineHeight: 20,
            color: theme.brand.primary,
            fontFamily: WEB_FONT,
          }}
        >
          👋 {getGreeting()}입니다, {userName}님.{'\n'}
          오늘 챙기실 항목을 정리했어요.
        </Text>
      </View>

      {/* 결재 대기 카드 */}
      {aprvLoading ? (
        <CardSkeleton theme={theme} />
      ) : (
        <TouchableOpacity
          className="border rounded-xl p-3.5"
          style={{
            backgroundColor: theme.bg.surface,
            borderColor: theme.border.subtle,
          }}
          activeOpacity={0.8}
          onPress={() => handleNavClick('approval')}
        >
          <View className="flex-row items-center mb-1.5" style={{ gap: 8 }}>
            <View
              className="w-6 h-6 rounded-md items-center justify-center"
              style={{ backgroundColor: theme.semanticTint.warning }}
            >
              <FileCheck size={14} color={theme.semantic.warning} />
            </View>
            <Text
              className="flex-1 font-medium"
              style={{ fontSize: 13, color: theme.text.body, fontFamily: WEB_FONT }}
            >
              결재 대기
            </Text>
            <Text
              className="font-semibold"
              style={{ fontSize: 18, color: theme.text.primary, fontFamily: WEB_FONT }}
            >
              {totalAprvCount}
            </Text>
          </View>
          <Text
            style={{ fontSize: 12, lineHeight: 18, color: theme.text.muted, fontFamily: WEB_FONT }}
            numberOfLines={2}
          >
            {totalAprvCount > 0 ? (
              <>
                <Text
                  className="font-medium"
                  style={{ color: theme.text.primary }}
                >
                  {firstPendingItem?.aprvFormNm ?? ''}
                  {firstPendingItem?.reqUserNm ? ` (${firstPendingItem.reqUserNm})` : ''}
                </Text>
                {totalAprvCount > 1 ? ` 외 ${totalAprvCount - 1}건` : ''}
              </>
            ) : (
              '처리 대기 중인 결재가 없습니다.'
            )}
          </Text>
        </TouchableOpacity>
      )}

      {/* 오늘 일정 카드 */}
      {scheduleLoading ? (
        <CardSkeleton theme={theme} />
      ) : (
        <TouchableOpacity
          className="border rounded-xl p-3.5"
          style={{
            backgroundColor: theme.bg.surface,
            borderColor: theme.border.subtle,
          }}
          activeOpacity={0.8}
          onPress={() => handleNavClick('calendar')}
        >
          <View className="flex-row items-center mb-1.5" style={{ gap: 8 }}>
            <View
              className="w-6 h-6 rounded-md items-center justify-center"
              style={{ backgroundColor: theme.brand.primaryTint }}
            >
              <Calendar size={14} color={theme.brand.primary} />
            </View>
            <Text
              className="flex-1 font-medium"
              style={{ fontSize: 13, color: theme.text.body, fontFamily: WEB_FONT }}
            >
              오늘 일정
            </Text>
            {scheduleCount > 0 && (
              <Text
                className="font-semibold"
                style={{ fontSize: 18, color: theme.text.primary, fontFamily: WEB_FONT }}
              >
                {scheduleCount}
              </Text>
            )}
          </View>
          <Text
            style={{ fontSize: 12, lineHeight: 18, color: theme.text.muted, fontFamily: WEB_FONT }}
            numberOfLines={2}
          >
            {scheduleBodyText}
          </Text>
        </TouchableOpacity>
      )}

      {/* 업무보고 카드 */}
      {roundsLoading ? (
        <CardSkeleton theme={theme} />
      ) : (
        <TouchableOpacity
          className="border rounded-xl p-3.5"
          style={{
            backgroundColor: theme.bg.surface,
            borderColor: theme.border.subtle,
          }}
          activeOpacity={0.8}
          onPress={() => handleNavClick('report')}
        >
          <View className="flex-row items-center mb-1.5" style={{ gap: 8 }}>
            <View
              className="w-6 h-6 rounded-md items-center justify-center"
              style={{ backgroundColor: rptStatusBg }}
            >
              <ClipboardList size={14} color={rptStatusColor} />
            </View>
            <Text
              className="flex-1 font-medium"
              style={{ fontSize: 13, color: theme.text.body, fontFamily: WEB_FONT }}
            >
              업무보고
            </Text>
            {rptStatusLabel && (
              <View
                className="rounded-md px-2 py-0.5"
                style={{ backgroundColor: rptStatusBg }}
              >
                <Text
                  className="font-semibold"
                  style={{ fontSize: 11, color: rptStatusColor, fontFamily: WEB_FONT }}
                >
                  {rptStatusLabel}
                </Text>
              </View>
            )}
          </View>
          {latestRound ? (
            <Text
              style={{ fontSize: 12, lineHeight: 18, color: theme.text.muted, fontFamily: WEB_FONT }}
              numberOfLines={1}
            >
              {latestRound.roundNm} · {latestRound.roundYmd.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3')}
            </Text>
          ) : (
            <Text
              style={{ fontSize: 12, lineHeight: 18, color: theme.text.muted, fontFamily: WEB_FONT }}
            >
              등록된 업무보고 양식이 없습니다.
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* 빠른 액션 */}
      <Text
        className="uppercase mt-2 mx-1"
        style={{
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.6,
          color: theme.text.subtle,
          fontFamily: WEB_FONT,
        }}
      >
        빠른 액션
      </Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            className="flex-grow items-center p-3 border rounded-lg"
            style={{
              flexBasis: '48%',
              backgroundColor: theme.bg.surface,
              borderColor: theme.border.subtle,
            }}
            activeOpacity={0.7}
            onPress={() => setPendingQuickMessage(action.message)}
          >
            <Text className="mb-1" style={{ fontSize: 18 }}>
              {action.emoji}
            </Text>
            <Text
              style={{ fontSize: 12, color: theme.text.muted, fontFamily: WEB_FONT }}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
