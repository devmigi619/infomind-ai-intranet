import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ArrowRight, X, Building2 } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useUiStore } from '../../../store/uiStore';
import { useMtgrs, useMtgrReservations, type MtgrReservationDto } from '../api';

// ─── 날짜 유틸 ─────────────────────────────────────────────────────────

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function formatTime(hhmm: string): string {
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

/** 실제 종료시각: 연장이면 ext, 아니면 rsv_end */
function getEffectiveEndHhmm(rsv: MtgrReservationDto): string {
  if (rsv.extYn === 'Y' && rsv.extHhmm) {
    return rsv.extHhmm;
  }
  return rsv.rsvEndHhmm;
}

// ─── Props ─────────────────────────────────────────────────────────────

interface MtgrQuickPanelProps {
  onClose: () => void;
}

// ─── 컴포넌트 ──────────────────────────────────────────────────────────

export function MtgrQuickPanel({ onClose }: MtgrQuickPanelProps) {
  const theme = useTheme();
  const closeLeftPanel = useUiStore((s) => s.closeLeftPanel);
  const setActiveFullScreen = useUiStore((s) => s.setActiveFullScreen);

  const today = todayYmd();
  const { data: mtgrs = [], isLoading: mtgrLoading } = useMtgrs();
  const { data: reservations = [], isLoading: rsvLoading } = useMtgrReservations(today);

  const isLoading = mtgrLoading || rsvLoading;

  const handleOpenFull = () => {
    closeLeftPanel();
    setActiveFullScreen('meeting');
  };

  const rsvByMtgr: Record<string, typeof reservations> = {};
  for (const rsv of reservations) {
    if (!rsvByMtgr[rsv.mtgrId]) rsvByMtgr[rsv.mtgrId] = [];
    rsvByMtgr[rsv.mtgrId].push(rsv);
  }

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderBottomColor: theme.border.subtle }}>
        <Text className="text-sm font-medium" style={{ color: theme.text.primary, fontFamily }}>회의실</Text>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            onPress={handleOpenFull}
            className="flex-row items-center gap-1 px-3 py-[6px] rounded-md"
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

      {isLoading ? (
        <View className="flex-1 items-center justify-center gap-2 py-8">
          <ActivityIndicator size="small" color={theme.brand.primary} />
        </View>
      ) : mtgrs.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2 py-8">
          <Building2 size={28} color={theme.text.subtle} />
          <Text className="text-xs" style={{ color: theme.text.muted, fontFamily }}>
            등록된 회의실이 없습니다.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-[10px] font-semibold uppercase tracking-[0.6px] mb-[10px] mx-0.5" style={{ color: theme.text.subtle, fontFamily }}>
            오늘 예약 현황
          </Text>

          {mtgrs.map((mtgr) => {
            const mtgrRsvs = (rsvByMtgr[mtgr.mtgrId] ?? []).sort((a, b) =>
              a.rsvStHhmm.localeCompare(b.rsvStHhmm)
            );

            return (
              <View key={mtgr.mtgrId} className="mb-[14px]">
                <View className="flex-row items-center gap-[6px] pl-2 border-l-2 mb-[6px]" style={{ borderLeftColor: theme.brand.primary }}>
                  <Text className="text-xs font-semibold" style={{ color: theme.text.primary, fontFamily }}>
                    {mtgr.mtgrNm}
                  </Text>
                  <Text className="text-[11px]" style={{ color: theme.text.muted, fontFamily }}>{mtgr.mtgrPlc}</Text>
                </View>

                {mtgrRsvs.length === 0 ? (
                  <View
                    className="p-[10px] rounded-[7px] border mb-[5px]"
                    style={{
                      backgroundColor: theme.bg.surfaceAlt,
                      borderColor: theme.border.subtle,
                    }}
                  >
                    <Text className="text-[11px] italic" style={{ color: theme.text.muted, fontFamily }}>
                      예약 없음
                    </Text>
                  </View>
                ) : (
                  mtgrRsvs.map((rsv) => (
                    <View
                      key={`${rsv.mtgrId}-${rsv.rsvSn}`}
                      className="p-[10px] rounded-[7px] border mb-[5px]"
                      style={{
                        backgroundColor: rsv.mine
                          ? theme.brand.primaryTintSoft ?? theme.brand.primaryTint
                          : theme.bg.surfaceAlt,
                        borderColor: rsv.mine ? theme.brand.primary : theme.border.subtle,
                      }}
                    >
                      <View className="flex-row items-center justify-between mb-0.5">
                        <Text
                          className="text-xs font-medium"
                          style={{ color: rsv.mine ? theme.brand.primary : theme.text.body, fontFamily }}
                        >
                          {formatTime(rsv.rsvStHhmm)} ~ {formatTime(getEffectiveEndHhmm(rsv))}
                        </Text>
                        {rsv.mine && (
                          <View
                            className="px-[5px] py-0.5 rounded-[3px]"
                            style={{ backgroundColor: theme.brand.primary }}
                          >
                            <Text className="text-[9px] text-white font-semibold" style={{ fontFamily }}>내 예약</Text>
                          </View>
                        )}
                      </View>
                      <Text
                        className="text-[11px]"
                        style={{ color: theme.text.muted, fontFamily }}
                        numberOfLines={1}
                      >
                        {rsv.userNm}
                        {rsv.rmk ? `  ·  ${rsv.rmk}` : ''}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const fontFamily = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });
