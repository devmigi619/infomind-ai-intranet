import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ArrowRight, X, Car } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useUiStore } from '../../../store/uiStore';
import { useVehicles, useVehicleReservations, type VehicleReservationDto } from '../api';

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
function getEffectiveEndHhmm(rsv: VehicleReservationDto): string {
  if (rsv.extYn === 'Y' && rsv.extHhmm) {
    return rsv.extHhmm;
  }
  return rsv.rsvEndHhmm;
}

// ─── Props ─────────────────────────────────────────────────────────────

interface VehicleQuickPanelProps {
  onClose: () => void;
}

// ─── 컴포넌트 ──────────────────────────────────────────────────────────

export function VehicleQuickPanel({ onClose }: VehicleQuickPanelProps) {
  const theme = useTheme();
  const closeLeftPanel = useUiStore((s) => s.closeLeftPanel);
  const setActiveFullScreen = useUiStore((s) => s.setActiveFullScreen);

  const today = todayYmd();
  const { data: vehicles = [], isLoading: vehLoading } = useVehicles();
  const { data: reservations = [], isLoading: rsvLoading } = useVehicleReservations(today);

  const isLoading = vehLoading || rsvLoading;

  const handleOpenFull = () => {
    closeLeftPanel();
    setActiveFullScreen('vehicle');
  };

  // 차량별 예약 맵
  const rsvByVeh: Record<string, typeof reservations> = {};
  for (const rsv of reservations) {
    if (!rsvByVeh[rsv.vehId]) rsvByVeh[rsv.vehId] = [];
    rsvByVeh[rsv.vehId].push(rsv);
  }

  // 차량명 맵
  const vehNmMap: Record<string, string> = {};
  const vehNoMap: Record<string, string> = {};
  for (const v of vehicles) {
    vehNmMap[v.vehId] = v.vehNm;
    vehNoMap[v.vehId] = v.vehNo;
  }

  return (
    <View className="flex-1">
      {/* 헤더 */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderBottomColor: theme.border.subtle }}>
        <Text className="text-sm font-medium" style={{ color: theme.text.primary, fontFamily }}>차량</Text>
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

      {/* 콘텐츠 */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center gap-2 py-8">
          <ActivityIndicator size="small" color={theme.brand.primary} />
        </View>
      ) : vehicles.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2 py-8">
          <Car size={28} color={theme.text.subtle} />
          <Text className="text-xs" style={{ color: theme.text.muted, fontFamily }}>
            등록된 차량이 없습니다.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 오늘 날짜 배지 */}
          <Text className="text-[10px] font-semibold uppercase tracking-[0.6px] mb-[10px] mx-0.5" style={{ color: theme.text.subtle, fontFamily }}>
            오늘 예약 현황
          </Text>

          {vehicles.map((veh) => {
            const vehRsvs = (rsvByVeh[veh.vehId] ?? []).sort((a, b) =>
              a.rsvStHhmm.localeCompare(b.rsvStHhmm)
            );

            return (
              <View key={veh.vehId} className="mb-[14px]">
                {/* 차량명 행 */}
                <View className="flex-row items-center gap-[6px] pl-2 border-l-2 mb-[6px]" style={{ borderLeftColor: theme.brand.primary }}>
                  <Text className="text-xs font-semibold" style={{ color: theme.text.primary, fontFamily }}>
                    {veh.vehNm}
                  </Text>
                  <Text className="text-[11px]" style={{ color: theme.text.muted, fontFamily }}>{veh.vehNo}</Text>
                </View>

                {/* 예약 없음 */}
                {vehRsvs.length === 0 ? (
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
                  vehRsvs.map((rsv) => (
                    <View
                      key={`${rsv.vehId}-${rsv.rsvSn}`}
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
