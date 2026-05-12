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
import { ArrowRight, X, Car } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useUiStore } from '../../../store/uiStore';
import { useVehicles, useVehicleReservations } from '../api';

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
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>차량</Text>
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

      {/* 콘텐츠 */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.brand.primary} />
        </View>
      ) : vehicles.length === 0 ? (
        <View style={styles.center}>
          <Car size={28} color={theme.text.subtle} />
          <Text style={[styles.emptyText, { color: theme.text.muted }]}>
            등록된 차량이 없습니다.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 오늘 날짜 배지 */}
          <Text style={[styles.dateLabel, { color: theme.text.subtle }]}>
            오늘 예약 현황
          </Text>

          {vehicles.map((veh) => {
            const vehRsvs = (rsvByVeh[veh.vehId] ?? []).sort((a, b) =>
              a.rsvStHhmm.localeCompare(b.rsvStHhmm)
            );

            return (
              <View key={veh.vehId} style={styles.vehBlock}>
                {/* 차량명 행 */}
                <View style={[styles.vehHeader, { borderLeftColor: theme.brand.primary }]}>
                  <Text style={[styles.vehNm, { color: theme.text.primary }]}>
                    {veh.vehNm}
                  </Text>
                  <Text style={[styles.vehNo, { color: theme.text.muted }]}>{veh.vehNo}</Text>
                </View>

                {/* 예약 없음 */}
                {vehRsvs.length === 0 ? (
                  <View
                    style={[
                      styles.rsvCard,
                      {
                        backgroundColor: theme.bg.surfaceAlt,
                        borderColor: theme.border.subtle,
                      },
                    ]}
                  >
                    <Text style={[styles.rsvEmpty, { color: theme.text.muted }]}>
                      예약 없음
                    </Text>
                  </View>
                ) : (
                  vehRsvs.map((rsv) => (
                    <View
                      key={`${rsv.vehId}-${rsv.rsvSn}`}
                      style={[
                        styles.rsvCard,
                        {
                          backgroundColor: rsv.mine
                            ? theme.brand.primaryTintSoft ?? theme.brand.primaryTint
                            : theme.bg.surfaceAlt,
                          borderColor: rsv.mine ? theme.brand.primary : theme.border.subtle,
                        },
                      ]}
                    >
                      <View style={styles.rsvRow}>
                        <Text
                          style={[
                            styles.rsvTime,
                            { color: rsv.mine ? theme.brand.primary : theme.text.body },
                          ]}
                        >
                          {formatTime(rsv.rsvStHhmm)} ~ {formatTime(rsv.rsvEndHhmm)}
                        </Text>
                        {rsv.mine && (
                          <View
                            style={[
                              styles.mineBadge,
                              { backgroundColor: theme.brand.primary },
                            ]}
                          >
                            <Text style={styles.mineBadgeText}>내 예약</Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[styles.rsvUser, { color: theme.text.muted }]}
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

// ─── StyleSheet ────────────────────────────────────────────────────────

const fontFamily = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  openButtonText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 12,
    fontFamily,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginHorizontal: 2,
    fontFamily,
  },
  vehBlock: {
    marginBottom: 14,
  },
  vehHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    marginBottom: 6,
  },
  vehNm: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily,
  },
  vehNo: {
    fontSize: 11,
    fontFamily,
  },
  rsvCard: {
    padding: 10,
    borderRadius: 7,
    borderWidth: 1,
    marginBottom: 5,
  },
  rsvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  rsvTime: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily,
  },
  mineBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  mineBadgeText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '600',
    fontFamily,
  },
  rsvUser: {
    fontSize: 11,
    fontFamily,
  },
  rsvEmpty: {
    fontSize: 11,
    fontStyle: 'italic',
    fontFamily,
  },
});
