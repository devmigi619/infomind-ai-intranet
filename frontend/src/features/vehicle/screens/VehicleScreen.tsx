import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { ChevronLeft, ChevronRight, Plus, ArrowLeft, Car, X } from 'lucide-react-native';
import {
  useVehicles,
  useVehicleReservations,
  useCreateVehicleReservation,
  useCancelVehicleReservation,
  useReturnVehicle,
  useExtendReservation,
  type VehicleDto,
  type VehicleReservationDto,
  type CreateVehicleReservationRequest,
  type ReturnVehicleRequest,
  type ExtendReservationRequest,
} from '../api';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';

// ─── 상수 ──────────────────────────────────────────────────────────────

type Mode = 'grid' | 'my' | 'form';

const HOUR_START = 8;   // 08:00
const HOUR_END   = 20;  // 20:00
const TOTAL_HOURS = HOUR_END - HOUR_START;  // 12
const HOUR_HEIGHT = 72; // px per hour
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT; // 864
const TIME_LABEL_W = 52;
const HALF_SLOT_HHMM: string[] = (() => {
  const slots: string[] = [];
  for (let h = HOUR_START; h < HOUR_END; h++) {
    slots.push(`${String(h).padStart(2, '0')}00`);
    slots.push(`${String(h).padStart(2, '0')}30`);
  }
  return slots;
})();

// ─── 날짜·시간 유틸 ────────────────────────────────────────────────────

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function addDays(ymd: string, days: number): string {
  const d = new Date(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8));
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

function todayYmd(): string { return toYmd(new Date()); }
function maxYmd(): string   { return addDays(todayYmd(), 7); }

function fmtDate(ymd: string): string {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function fmtTime(hhmm: string): string {
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

/** HHMM → 08:00 기준 픽셀 top */
function toTop(hhmm: string): number {
  const h = Math.min(Math.max(+hhmm.slice(0, 2), HOUR_START), HOUR_END);
  const m = +hhmm.slice(2, 4);
  return ((h - HOUR_START) + m / 60) * HOUR_HEIGHT;
}

/** HHMM 두 개로 블록 height */
function toBlockH(stHhmm: string, endHhmm: string): number {
  const startMin = (+stHhmm.slice(0, 2) - HOUR_START) * 60 + +stHhmm.slice(2, 4);
  const endMin   = (+endHhmm.slice(0, 2) - HOUR_START) * 60 + +endHhmm.slice(2, 4);
  return Math.max(12, ((endMin - startMin) / 60) * HOUR_HEIGHT);
}

/** 종료 시각 선택지 (시작 이후만) */
function getEndOptions(startHhmm: string): string[] {
  const startIdx = TIME_HALF_SLOT_HHMM.indexOf(startHhmm);
  return TIME_HALF_SLOT_HHMM.slice(startIdx + 1);
}

const TIME_HALF_SLOT_HHMM = TIME_LABEL_W > 0 ? HALF_SLOT_HHMM : [];

// ─── 메인 화면 ─────────────────────────────────────────────────────────

export function VehicleScreen() {
  const theme = useTheme();
  const today = todayYmd();
  const max   = maxYmd();

  const [mode, setMode]               = useState<Mode>('grid');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedVehId, setSelectedVehId] = useState<string>('');

  // form state
  const [formVehId, setFormVehId]         = useState('');
  const [formDate, setFormDate]           = useState(today);
  const [formStartHhmm, setFormStartHhmm] = useState('0900');
  const [formEndHhmm, setFormEndHhmm]     = useState('1000');
  const [formRmk, setFormRmk]             = useState('');

  const { data: vehicles = [], isLoading: vehLoading } = useVehicles();
  const { data: reservations = [], isLoading: rsvLoading } =
    useVehicleReservations(selectedDate);

  const createMutation = useCreateVehicleReservation();
  const cancelMutation  = useCancelVehicleReservation();
  const returnMutation  = useReturnVehicle();
  const extendMutation  = useExtendReservation();

  const confirm = useConfirm();
  const toast   = useToast();

  // 반납 모달
  const [returnTarget, setReturnTarget] = useState<VehicleReservationDto | null>(null);
  // 연장 모달
  const [extendTarget, setExtendTarget] = useState<VehicleReservationDto | null>(null);

  // 차량 로드 시 첫 번째 자동 선택
  React.useEffect(() => {
    if (vehicles.length > 0 && !selectedVehId) {
      setSelectedVehId(vehicles[0].vehId);
    }
  }, [vehicles, selectedVehId]);

  // ── 날짜 네비게이터 ────────────────────────────────────────────────

  const goPrev = useCallback(() => {
    if (selectedDate <= today) return;
    setSelectedDate((d) => addDays(d, -1));
  }, [selectedDate, today]);

  const goNext = useCallback(() => {
    if (selectedDate >= max) return;
    setSelectedDate((d) => addDays(d, 1));
  }, [selectedDate, max]);

  // ── 폼 진입 ───────────────────────────────────────────────────────

  const openForm = useCallback((vehId: string, date: string, startHhmm: string) => {
    const opts = getEndOptions(startHhmm);
    const defaultEnd = opts[1] ?? opts[0] ?? '1000';
    setFormVehId(vehId);
    setFormDate(date);
    setFormStartHhmm(startHhmm);
    setFormEndHhmm(defaultEnd);
    setFormRmk('');
    setMode('form');
  }, []);

  // ── 예약 신청 ──────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!formVehId) { toast.warning('차량을 선택해주세요.'); return; }
    const req: CreateVehicleReservationRequest = {
      rsvStYmd: formDate, rsvStHhmm: formStartHhmm,
      rsvEndYmd: formDate, rsvEndHhmm: formEndHhmm,
      rmk: formRmk,
    };
    try {
      await createMutation.mutateAsync({ vehId: formVehId, data: req });
      toast.success('예약이 완료되었습니다.');
      setMode('grid');
    } catch (err: any) {
      if (!(err as any)?._handled) {
        toast.error(err?.response?.data?.message ?? '예약 신청에 실패했습니다.');
      }
    }
  }, [formVehId, formDate, formStartHhmm, formEndHhmm, formRmk, createMutation, toast]);

  // ── 예약 취소 ──────────────────────────────────────────────────────

  const handleCancel = useCallback(async (rsv: VehicleReservationDto) => {
    const ok = await confirm({
      title: '예약 취소',
      message: `${fmtDate(rsv.rsvStYmd)}  ${fmtTime(rsv.rsvStHhmm)} ~ ${fmtTime(rsv.rsvEndHhmm)}\n예약을 취소하시겠습니까?`,
      confirmText: '취소하기',
      danger: true,
    });
    if (!ok) return;
    try {
      await cancelMutation.mutateAsync({ vehId: rsv.vehId, rsvSn: rsv.rsvSn });
      toast.success('예약이 취소되었습니다.');
    } catch (err: any) {
      if (!(err as any)?._handled) {
        toast.error('예약 취소에 실패했습니다.');
      }
    }
  }, [cancelMutation, confirm, toast]);

  const s = makeStyles(theme);

  // ── 폼 모드 ───────────────────────────────────────────────────────

  if (mode === 'form') {
    return (
      <FormView
        vehicles={vehicles}
        formVehId={formVehId} formDate={formDate}
        formStartHhmm={formStartHhmm} formEndHhmm={formEndHhmm}
        formRmk={formRmk} todayYmd={today} maxYmd={max}
        loading={createMutation.isPending}
        onVehChange={setFormVehId} onDateChange={setFormDate}
        onStartChange={setFormStartHhmm} onEndChange={setFormEndHhmm}
        onRmkChange={setFormRmk}
        onSubmit={handleCreate} onBack={() => setMode('grid')}
        theme={theme}
      />
    );
  }

  const selectedVeh = vehicles.find((v) => v.vehId === selectedVehId);

  return (
    <View style={s.root}>

      {/* ── 탑바 ── */}
      <View style={s.topBar}>
        <View style={s.tabs}>
          {(['grid', 'my'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m} style={[s.tab, mode === m && s.tabActive]}
              onPress={() => setMode(m)} activeOpacity={0.7}
            >
              <Text style={[s.tabText, mode === m && s.tabTextActive]}>
                {m === 'grid' ? '전체 현황' : '내 예약'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={s.addBtn} activeOpacity={0.7}
          onPress={() => openForm(selectedVehId || vehicles[0]?.vehId || '', selectedDate, '0900')}
        >
          <Plus size={14} color="#fff" />
          <Text style={s.addBtnText}>예약하기</Text>
        </TouchableOpacity>
      </View>

      {/* ── 날짜 네비게이터 ── */}
      <View style={s.dateNav}>
        <TouchableOpacity
          onPress={goPrev} disabled={selectedDate <= today}
          activeOpacity={0.7}
          style={[s.navArrow, selectedDate <= today && s.navDisabled]}
        >
          <ChevronLeft size={20} color={selectedDate <= today ? theme.border.default : theme.text.primary} />
        </TouchableOpacity>

        <View style={s.dateCenter}>
          <Text style={s.dateText}>{fmtDate(selectedDate)}</Text>
          {selectedDate === today && (
            <View style={[s.todayBadge, { backgroundColor: theme.brand.primaryTint }]}>
              <Text style={[s.todayBadgeText, { color: theme.brand.primary }]}>오늘</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={goNext} disabled={selectedDate >= max}
          activeOpacity={0.7}
          style={[s.navArrow, selectedDate >= max && s.navDisabled]}
        >
          <ChevronRight size={20} color={selectedDate >= max ? theme.border.default : theme.text.primary} />
        </TouchableOpacity>
      </View>

      {/* ── 차량 선택 칩 ── */}
      {mode === 'grid' && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={s.vehChipScroll}
          contentContainerStyle={s.vehChipContent}
        >
          {vehLoading ? (
            <ActivityIndicator size="small" color={theme.brand.primary} style={{ marginLeft: 8 }} />
          ) : (
            vehicles.map((v) => {
              const active = v.vehId === selectedVehId;
              return (
                <TouchableOpacity
                  key={v.vehId}
                  style={[
                    s.vehChip,
                    {
                      backgroundColor: active ? theme.brand.primary : theme.bg.surface,
                      borderColor: active ? theme.brand.primary : theme.border.default,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedVehId(v.vehId)}
                >
                  <Car size={12} color={active ? '#fff' : theme.text.muted} />
                  <Text style={[s.vehChipName, { color: active ? '#fff' : theme.text.primary }]}>
                    {v.vehNm}
                  </Text>
                  <Text style={[s.vehChipNo, { color: active ? 'rgba(255,255,255,0.75)' : theme.text.muted }]}>
                    {v.vehNo}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── 콘텐츠 ── */}
      {mode === 'grid' ? (
        <TimelineView
          vehicle={selectedVeh ?? null}
          reservations={reservations.filter((r) => r.vehId === selectedVehId)}
          loading={vehLoading || rsvLoading}
          selectedDate={selectedDate}
          onEmptySlotPress={(hhmm) =>
            openForm(selectedVehId, selectedDate, hhmm)
          }
          onMinePress={handleCancel}
          theme={theme}
        />
      ) : (
        <MyView
          vehicles={vehicles}
          reservations={reservations.filter((r) => r.mine)}
          loading={rsvLoading}
          selectedDate={selectedDate}
          onCancel={handleCancel}
          onReturn={(rsv) => setReturnTarget(rsv)}
          onExtend={(rsv) => setExtendTarget(rsv)}
          theme={theme}
        />
      )}

      {/* 반납 모달 */}
      <ReturnModal
        visible={returnTarget !== null}
        reservation={returnTarget}
        loading={returnMutation.isPending}
        onClose={() => setReturnTarget(null)}
        onSubmit={async (req) => {
          if (!returnTarget) return;
          try {
            await returnMutation.mutateAsync({ vehId: returnTarget.vehId, rsvSn: returnTarget.rsvSn, data: req });
            toast.success('반납 처리가 완료되었습니다.');
            setReturnTarget(null);
          } catch (err: any) {
            if (!(err as any)?._handled) {
              toast.error(err?.response?.data?.message ?? '반납 처리에 실패했습니다.');
            }
          }
        }}
        theme={theme}
      />

      {/* 연장 모달 */}
      <ExtendModal
        visible={extendTarget !== null}
        reservation={extendTarget}
        maxYmd={max}
        loading={extendMutation.isPending}
        onClose={() => setExtendTarget(null)}
        onSubmit={async (req) => {
          if (!extendTarget) return;
          try {
            await extendMutation.mutateAsync({ vehId: extendTarget.vehId, rsvSn: extendTarget.rsvSn, data: req });
            toast.success('예약이 연장되었습니다.');
            setExtendTarget(null);
          } catch (err: any) {
            if (!(err as any)?._handled) {
              toast.error(err?.response?.data?.message ?? '예약 연장에 실패했습니다.');
            }
          }
        }}
        theme={theme}
      />
    </View>
  );
}

// ─── TimelineView — 세로 타임라인 ─────────────────────────────────────

interface TimelineViewProps {
  vehicle: VehicleDto | null;
  reservations: VehicleReservationDto[];
  loading: boolean;
  selectedDate: string;
  onEmptySlotPress: (hhmm: string) => void;
  onMinePress: (rsv: VehicleReservationDto) => void;
  theme: any;
}

function TimelineView({
  vehicle, reservations, loading, selectedDate,
  onEmptySlotPress, onMinePress, theme,
}: TimelineViewProps) {
  const s = makeStyles(theme);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={theme.brand.primary} /></View>;
  }
  if (!vehicle) {
    return (
      <View style={s.center}>
        <Car size={40} color={theme.text.subtle} />
        <Text style={[s.emptyText, { color: theme.text.muted }]}>등록된 차량이 없습니다.</Text>
      </View>
    );
  }

  // 빈 슬롯 탭: 겹치는 예약 없는 30분 슬롯 클릭 → 폼
  const occupiedSet = new Set<string>();
  for (const rsv of reservations) {
    const stIdx  = HALF_SLOT_HHMM.indexOf(rsv.rsvStHhmm);
    const endIdx = HALF_SLOT_HHMM.indexOf(rsv.rsvEndHhmm);
    for (let i = stIdx; i < endIdx; i++) {
      if (i >= 0) occupiedSet.add(HALF_SLOT_HHMM[i]);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator
    >
      {/* 헤더: 선택 차량명 */}
      <View style={[s.tlHeader, { backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.subtle }]}>
        <Car size={14} color={theme.brand.primary} />
        <Text style={[s.tlVehNm, { color: theme.text.primary }]}>{vehicle.vehNm}</Text>
        <Text style={[s.tlVehNo, { color: theme.text.muted }]}>{vehicle.vehNo}</Text>
      </View>

      {/* 타임라인 */}
      <View style={[s.tlBody, { height: TOTAL_HEIGHT }]}>

        {/* 시간 눈금 + 라벨 (배경 레이어) */}
        {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => i + HOUR_START).map((h) => {
          const top = (h - HOUR_START) * HOUR_HEIGHT;
          return (
            <View key={h} style={[s.hourLine, { top }]}>
              <Text style={[s.hourLabel, { color: theme.text.subtle }]}>
                {String(h).padStart(2, '0')}:00
              </Text>
              <View style={[s.hourRule, { backgroundColor: theme.border.default }]} />
            </View>
          );
        })}

        {/* 30분 눈금 (중간 점선) */}
        {Array.from({ length: TOTAL_HOURS }, (_, i) => i + HOUR_START).map((h) => {
          const top = (h - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2;
          return (
            <View key={`half-${h}`} style={[s.halfLine, { top }]}>
              <Text style={[s.halfLabel, { color: theme.text.subtle }]}>
                {String(h).padStart(2, '0')}:30
              </Text>
              <View style={[s.halfRule, { borderColor: theme.border.subtle }]} />
            </View>
          );
        })}

        {/* 빈 슬롯 탭 영역 */}
        {HALF_SLOT_HHMM.map((slot) => {
          if (occupiedSet.has(slot)) return null;
          return (
            <TouchableOpacity
              key={`empty-${slot}`}
              activeOpacity={0.15}
              style={[s.emptySlotTap, { top: toTop(slot), height: HOUR_HEIGHT / 2, left: TIME_LABEL_W }]}
              onPress={() => onEmptySlotPress(slot)}
            />
          );
        })}

        {/* 예약 블록 */}
        {reservations.map((rsv) => {
          const top    = toTop(rsv.rsvStHhmm);
          const height = toBlockH(rsv.rsvStHhmm, rsv.rsvEndHhmm);
          const isMine = rsv.mine;
          return (
            <TouchableOpacity
              key={`${rsv.vehId}-${rsv.rsvSn}`}
              activeOpacity={0.8}
              style={[
                s.rsvBlock,
                {
                  top,
                  height,
                  left: TIME_LABEL_W + 4,
                  backgroundColor: isMine ? theme.brand.primary : theme.bg.surfaceAlt,
                  borderColor:     isMine ? theme.brand.primary : theme.border.default,
                },
              ]}
              onPress={() => {
                if (isMine) {
                  onMinePress(rsv);
                } else {
                  Alert.alert(
                    '예약 정보',
                    `${rsv.userNm}\n${fmtTime(rsv.rsvStHhmm)} ~ ${fmtTime(rsv.rsvEndHhmm)}${rsv.rmk ? `\n${rsv.rmk}` : ''}`
                  );
                }
              }}
            >
              <Text style={[s.rsvBlockTitle, { color: isMine ? '#fff' : theme.text.primary }]} numberOfLines={1}>
                {rsv.userNm}
              </Text>
              <Text style={[s.rsvBlockTime, { color: isMine ? 'rgba(255,255,255,0.85)' : theme.text.muted }]}>
                {fmtTime(rsv.rsvStHhmm)} ~ {fmtTime(rsv.rsvEndHhmm)}
              </Text>
              {rsv.rmk ? (
                <Text style={[s.rsvBlockRmk, { color: isMine ? 'rgba(255,255,255,0.75)' : theme.text.muted }]} numberOfLines={1}>
                  {rsv.rmk}
                </Text>
              ) : null}
              {isMine && (
                <View style={s.mineDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── MyView — 내 예약 카드 ─────────────────────────────────────────────

interface MyViewProps {
  vehicles: VehicleDto[];
  reservations: VehicleReservationDto[];
  loading: boolean;
  selectedDate: string;
  onCancel: (rsv: VehicleReservationDto) => void;
  onReturn: (rsv: VehicleReservationDto) => void;
  onExtend: (rsv: VehicleReservationDto) => void;
  theme: any;
}

function MyView({ vehicles, reservations, loading, selectedDate, onCancel, onReturn, onExtend, theme }: MyViewProps) {
  const s = makeStyles(theme);
  const vehMap = Object.fromEntries(vehicles.map((v) => [v.vehId, v]));

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={theme.brand.primary} /></View>;
  }

  if (reservations.length === 0) {
    return (
      <View style={s.center}>
        <Car size={40} color={theme.text.subtle} />
        <Text style={[s.emptyText, { color: theme.text.muted }]}>
          {fmtDate(selectedDate)} 내 예약이 없습니다.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {reservations.map((rsv) => {
        const veh = vehMap[rsv.vehId];
        const dur =
          (+rsv.rsvEndHhmm.slice(0, 2) - +rsv.rsvStHhmm.slice(0, 2)) * 60 +
          (+rsv.rsvEndHhmm.slice(2, 4) - +rsv.rsvStHhmm.slice(2, 4));
        const returned = rsv.rtnYn === 'Y';
        const extended = rsv.extYn === 'Y';

        return (
          <View
            key={`${rsv.vehId}-${rsv.rsvSn}`}
            style={[
              s.myCard,
              {
                backgroundColor: theme.bg.surface,
                borderColor: returned ? theme.border.default : theme.brand.primary,
                marginBottom: 10,
              },
            ]}
          >
            {/* 왼쪽 색띠 */}
            <View style={[s.myCardAccent, { backgroundColor: returned ? theme.border.default : theme.brand.primary }]} />

            <View style={{ flex: 1, padding: 12, gap: 4 }}>
              {/* 차량명 + 상태 배지 */}
              <View style={s.myCardRow}>
                <Car size={13} color={returned ? theme.text.muted : theme.brand.primary} />
                <Text style={[s.myCardVeh, { color: theme.text.primary, flex: 1 }]} numberOfLines={1}>
                  {veh ? `${veh.vehNm}  ${veh.vehNo}` : rsv.vehId}
                </Text>
                {extended && (
                  <View style={[s.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[s.statusBadgeText, { color: '#D97706' }]}>연장됨</Text>
                  </View>
                )}
                {returned && (
                  <View style={[s.statusBadge, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[s.statusBadgeText, { color: '#059669' }]}>반납 완료</Text>
                  </View>
                )}
              </View>

              {/* 시간 + 소요 */}
              <View style={s.myCardTimeRow}>
                <Text style={[s.myCardTime, { color: theme.text.primary }]}>
                  {fmtTime(rsv.rsvStHhmm)} ~ {fmtTime(rsv.rsvEndHhmm)}
                </Text>
                <View style={[s.durBadge, { backgroundColor: theme.brand.primaryTint }]}>
                  <Text style={[s.durText, { color: theme.brand.primary }]}>
                    {dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? ` ${dur % 60}m` : ''}` : `${dur}m`}
                  </Text>
                </View>
              </View>

              {/* 반납 정보 */}
              {returned && rsv.rtnYmd && (
                <Text style={[s.myCardRmk, { color: theme.text.muted }]}>
                  반납: {fmtDate(rsv.rtnYmd)} {rsv.rtnHhmm ? fmtTime(rsv.rtnHhmm) : ''}
                  {rsv.rtnPlc ? `  ·  ${rsv.rtnPlc}` : ''}
                </Text>
              )}

              {/* 비고 */}
              {rsv.rmk ? (
                <Text style={[s.myCardRmk, { color: theme.text.muted }]} numberOfLines={2}>{rsv.rmk}</Text>
              ) : null}

              {/* 액션 버튼 행 */}
              <View style={[s.myCardBtns]}>
                {/* 연장 — 반납 완료 시 비활성 */}
                <TouchableOpacity
                  style={[
                    s.actionBtn,
                    { borderColor: returned ? theme.border.default : theme.brand.primary },
                    returned && { opacity: 0.4 },
                  ]}
                  activeOpacity={0.7}
                  disabled={returned}
                  onPress={() => onExtend(rsv)}
                >
                  <Text style={[s.actionBtnText, { color: returned ? theme.text.muted : theme.brand.primary }]}>연장</Text>
                </TouchableOpacity>

                {/* 반납 — 이미 반납 완료 시 비활성 */}
                <TouchableOpacity
                  style={[
                    s.actionBtn,
                    { borderColor: returned ? theme.border.default : '#10B981' },
                    returned && { opacity: 0.4 },
                  ]}
                  activeOpacity={0.7}
                  disabled={returned}
                  onPress={() => onReturn(rsv)}
                >
                  <Text style={[s.actionBtnText, { color: returned ? theme.text.muted : '#10B981' }]}>반납</Text>
                </TouchableOpacity>

                {/* 취소 — 반납 완료 시 비활성 */}
                <TouchableOpacity
                  style={[
                    s.actionBtn,
                    { borderColor: returned ? theme.border.default : '#EF4444' },
                    returned && { opacity: 0.4 },
                  ]}
                  activeOpacity={0.7}
                  disabled={returned}
                  onPress={() => onCancel(rsv)}
                >
                  <Text style={[s.actionBtnText, { color: returned ? theme.text.muted : '#EF4444' }]}>취소</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── FormView ─────────────────────────────────────────────────────────

interface FormViewProps {
  vehicles: VehicleDto[];
  formVehId: string; formDate: string;
  formStartHhmm: string; formEndHhmm: string; formRmk: string;
  todayYmd: string; maxYmd: string; loading: boolean;
  onVehChange: (v: string) => void; onDateChange: (v: string) => void;
  onStartChange: (v: string) => void; onEndChange: (v: string) => void;
  onRmkChange: (v: string) => void;
  onSubmit: () => void; onBack: () => void;
  theme: any;
}

function getDateOptions(todayYmd: string, maxYmd: string): string[] {
  const opts: string[] = [];
  let cur = todayYmd;
  while (cur <= maxYmd) { opts.push(cur); cur = addDays(cur, 1); }
  return opts;
}

function FormView({
  vehicles, formVehId, formDate, formStartHhmm, formEndHhmm, formRmk,
  todayYmd, maxYmd, loading,
  onVehChange, onDateChange, onStartChange, onEndChange, onRmkChange,
  onSubmit, onBack, theme,
}: FormViewProps) {
  const s = makeStyles(theme);
  const dateOptions = getDateOptions(todayYmd, maxYmd);
  const endOptions  = getEndOptions(formStartHhmm);
  const safeEnd     = endOptions.includes(formEndHhmm) ? formEndHhmm : endOptions[0] ?? formEndHhmm;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <TouchableOpacity style={s.backRow} onPress={onBack} activeOpacity={0.7}>
        <ArrowLeft size={16} color={theme.text.muted} />
        <Text style={[s.backText, { color: theme.text.muted }]}>뒤로</Text>
      </TouchableOpacity>

      <Text style={[s.formTitle, { color: theme.text.primary }]}>예약 신청</Text>

      {/* 차량 */}
      <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>차량</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
        {vehicles.map((v) => {
          const active = formVehId === v.vehId;
          return (
            <TouchableOpacity
              key={v.vehId}
              style={[s.chip, { backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }]}
              activeOpacity={0.7} onPress={() => onVehChange(v.vehId)}
            >
              <Text style={[s.chipText, { color: active ? '#fff' : theme.text.primary }]}>
                {v.vehNm}  <Text style={{ opacity: 0.75 }}>{v.vehNo}</Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 날짜 */}
      <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>날짜</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
        {dateOptions.map((d) => {
          const active = formDate === d;
          return (
            <TouchableOpacity
              key={d}
              style={[s.chip, { backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }]}
              activeOpacity={0.7} onPress={() => onDateChange(d)}
            >
              <Text style={[s.chipText, { color: active ? '#fff' : theme.text.primary }]}>
                {fmtDate(d)}{d === todayYmd ? '  (오늘)' : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 시작 시각 */}
      <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>시작 시각</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
        {HALF_SLOT_HHMM.slice(0, -1).map((slot) => {
          const active = formStartHhmm === slot;
          return (
            <TouchableOpacity
              key={slot}
              style={[s.chip, s.chipTime, { backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }]}
              activeOpacity={0.7}
              onPress={() => {
                onStartChange(slot);
                const newEnd = getEndOptions(slot);
                if (!newEnd.includes(safeEnd)) onEndChange(newEnd[1] ?? newEnd[0]);
              }}
            >
              <Text style={[s.chipText, { color: active ? '#fff' : theme.text.primary }]}>{fmtTime(slot)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 종료 시각 */}
      <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>종료 시각</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
        {endOptions.map((slot) => {
          const active = safeEnd === slot;
          return (
            <TouchableOpacity
              key={slot}
              style={[s.chip, s.chipTime, { backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }]}
              activeOpacity={0.7} onPress={() => onEndChange(slot)}
            >
              <Text style={[s.chipText, { color: active ? '#fff' : theme.text.primary }]}>{fmtTime(slot)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 비고 */}
      <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>비고 (선택)</Text>
      <TextInput
        style={[s.textArea, { backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.default, color: theme.text.primary }]}
        placeholder="사용 목적 등을 입력하세요"
        placeholderTextColor={theme.text.muted}
        value={formRmk} onChangeText={onRmkChange}
        multiline numberOfLines={3}
      />

      {/* 버튼 */}
      <View style={s.formBtns}>
        <TouchableOpacity
          style={[s.formBtn, { backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.default }]}
          onPress={onBack} activeOpacity={0.7}
        >
          <Text style={[s.formBtnText, { color: theme.text.primary }]}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.formBtn, { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary }]}
          onPress={onSubmit} activeOpacity={0.7} disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={[s.formBtnText, { color: '#fff' }]}>신청</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── ReturnModal — 반납 처리 ─────────────────────────────────────────────

interface ReturnModalProps {
  visible: boolean;
  reservation: VehicleReservationDto | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (req: ReturnVehicleRequest) => void;
  theme: any;
}

function ReturnModal({ visible, reservation, loading, onClose, onSubmit, theme }: ReturnModalProps) {
  const today = todayYmd();
  const [rtnYmd, setRtnYmd]   = useState(today);
  const [rtnHhmm, setRtnHhmm] = useState('');
  const [rtnPlc, setRtnPlc]   = useState('');

  React.useEffect(() => {
    if (visible && reservation) {
      setRtnYmd(today);
      setRtnPlc('');
      // 기본 시각: 예약 시작 시각 이후 슬롯 중 현재 시각과 가장 가까운 값
      const now = new Date();
      const h   = now.getHours();
      const m   = now.getMinutes() >= 30 ? 30 : 0;
      const cur = `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`;
      // 오늘이 예약 시작일이면 rsvStHhmm 이후, 다른 날이면 전체 슬롯
      const minSlot   = today === reservation.rsvStYmd ? reservation.rsvStHhmm : HALF_SLOT_HHMM[0];
      const validSlots = HALF_SLOT_HHMM.filter((s) => s >= minSlot);
      setRtnHhmm(validSlots.find((s) => s >= cur) ?? validSlots[validSlots.length - 1]);
    }
  }, [visible]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!reservation) return null;

  // 날짜 선택지: 예약 시작일 ~ 오늘
  const dateOptions: string[] = [];
  let cur = reservation.rsvStYmd;
  while (cur <= today) { dateOptions.push(cur); cur = addDays(cur, 1); }

  // 시각 선택지: 예약 시작일과 같은 날이면 rsvStHhmm 이후만, 다른 날은 전체
  const timeSlots = rtnYmd === reservation.rsvStYmd
    ? HALF_SLOT_HHMM.filter((s) => s >= reservation.rsvStHhmm)
    : HALF_SLOT_HHMM;
  const safeRtnHhmm = timeSlots.includes(rtnHhmm) ? rtnHhmm : (timeSlots[0] ?? rtnHhmm);

  const s = makeStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { backgroundColor: theme.bg.surface }]}>
          {/* 헤더 */}
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: theme.text.primary }]}>반납 처리</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          {/* 반납 날짜 */}
          <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>반납 날짜</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
            {dateOptions.map((d) => {
              const active = rtnYmd === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[s.chip, {
                    backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt,
                    borderColor: active ? theme.brand.primary : theme.border.default,
                  }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setRtnYmd(d);
                    // 날짜 변경 시 선택 가능한 최솟값이 달라지므로 시각 자동 보정
                    const newSlots = d === reservation.rsvStYmd
                      ? HALF_SLOT_HHMM.filter((s) => s >= reservation.rsvStHhmm)
                      : HALF_SLOT_HHMM;
                    if (!newSlots.includes(rtnHhmm)) setRtnHhmm(newSlots[0] ?? '');
                  }}
                >
                  <Text style={[s.chipText, { color: active ? '#fff' : theme.text.primary }]}>
                    {fmtDate(d)}{d === today ? '  (오늘)' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 반납 시각 — 예약 시작일과 같은 날이면 예약 시작 시각 이후만 표시 */}
          <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>반납 시각</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
            {timeSlots.map((slot) => {
              const active = safeRtnHhmm === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[s.chip, s.chipTime, {
                    backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt,
                    borderColor: active ? theme.brand.primary : theme.border.default,
                  }]}
                  activeOpacity={0.7}
                  onPress={() => setRtnHhmm(slot)}
                >
                  <Text style={[s.chipText, { color: active ? '#fff' : theme.text.primary }]}>
                    {fmtTime(slot)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 반납 장소 */}
          <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>반납 장소 (선택)</Text>
          <TextInput
            style={[s.modalInput, {
              backgroundColor: theme.bg.surfaceAlt,
              borderColor: theme.border.default,
              color: theme.text.primary,
            }]}
            placeholder="예: 주차장 B구역"
            placeholderTextColor={theme.text.muted}
            value={rtnPlc}
            onChangeText={setRtnPlc}
          />

          {/* 버튼 */}
          <View style={[s.formBtns, { marginTop: 20 }]}>
            <TouchableOpacity
              style={[s.formBtn, { backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.default }]}
              onPress={onClose} activeOpacity={0.7}
            >
              <Text style={[s.formBtnText, { color: theme.text.primary }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.formBtn, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
              onPress={() => onSubmit({ rtnYmd, rtnHhmm: safeRtnHhmm, rtnPlc: rtnPlc || undefined })}
              activeOpacity={0.7}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[s.formBtnText, { color: '#fff' }]}>반납 처리</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── ExtendModal — 예약 연장 ──────────────────────────────────────────────

interface ExtendModalProps {
  visible: boolean;
  reservation: VehicleReservationDto | null;
  maxYmd: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (req: ExtendReservationRequest) => void;
  theme: any;
}

function ExtendModal({ visible, reservation, maxYmd, loading, onClose, onSubmit, theme }: ExtendModalProps) {
  const [newEndYmd, setNewEndYmd]   = useState('');
  const [newEndHhmm, setNewEndHhmm] = useState('');

  React.useEffect(() => {
    if (visible && reservation) {
      setNewEndYmd(reservation.rsvEndYmd);
      // 현재 종료 이후 첫 슬롯을 기본값으로
      const afterEnd = getEndOptions(reservation.rsvEndHhmm);
      setNewEndHhmm(afterEnd[0] ?? '');
    }
  }, [visible, reservation]);

  if (!reservation) return null;

  // 날짜 선택지: 현재 종료일 ~ maxYmd
  const dateOptions: string[] = [];
  let cur = reservation.rsvEndYmd;
  while (cur <= maxYmd) { dateOptions.push(cur); cur = addDays(cur, 1); }

  // 시각 선택지: 현재 종료일과 같으면 종료 이후 슬롯만, 다른 날이면 전체
  const timeOptions =
    newEndYmd === reservation.rsvEndYmd
      ? getEndOptions(reservation.rsvEndHhmm)
      : HALF_SLOT_HHMM;

  const safeHhmm = timeOptions.includes(newEndHhmm) ? newEndHhmm : (timeOptions[0] ?? newEndHhmm);

  const s = makeStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { backgroundColor: theme.bg.surface }]}>
          {/* 헤더 */}
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: theme.text.primary }]}>예약 연장</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          {/* 현재 종료 (읽기 전용) */}
          <View style={[s.extInfoBox, { backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.subtle }]}>
            <Text style={[s.extInfoLabel, { color: theme.text.subtle }]}>현재 종료</Text>
            <Text style={[s.extInfoValue, { color: theme.text.primary }]}>
              {fmtDate(reservation.rsvEndYmd)}  {fmtTime(reservation.rsvEndHhmm)}
            </Text>
          </View>

          {/* 새 종료 날짜 */}
          <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>새 종료 날짜</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
            {dateOptions.map((d) => {
              const active = newEndYmd === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[s.chip, {
                    backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt,
                    borderColor: active ? theme.brand.primary : theme.border.default,
                  }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setNewEndYmd(d);
                    const opts =
                      d === reservation.rsvEndYmd
                        ? getEndOptions(reservation.rsvEndHhmm)
                        : HALF_SLOT_HHMM;
                    if (!opts.includes(safeHhmm)) setNewEndHhmm(opts[0] ?? '');
                  }}
                >
                  <Text style={[s.chipText, { color: active ? '#fff' : theme.text.primary }]}>
                    {fmtDate(d)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 새 종료 시각 */}
          <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>새 종료 시각</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
            {timeOptions.map((slot) => {
              const active = safeHhmm === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[s.chip, s.chipTime, {
                    backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt,
                    borderColor: active ? theme.brand.primary : theme.border.default,
                  }]}
                  activeOpacity={0.7}
                  onPress={() => setNewEndHhmm(slot)}
                >
                  <Text style={[s.chipText, { color: active ? '#fff' : theme.text.primary }]}>
                    {fmtTime(slot)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 버튼 */}
          <View style={[s.formBtns, { marginTop: 20 }]}>
            <TouchableOpacity
              style={[s.formBtn, { backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.default }]}
              onPress={onClose} activeOpacity={0.7}
            >
              <Text style={[s.formBtnText, { color: theme.text.primary }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.formBtn, { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary }]}
              onPress={() => onSubmit({ newEndYmd, newEndHhmm: safeHhmm })}
              activeOpacity={0.7}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[s.formBtnText, { color: '#fff' }]}>연장</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────

const FF = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

const makeStyles = (theme: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg.canvas },

  // 탑바
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: theme.bg.surface,
    borderBottomWidth: 1, borderBottomColor: theme.border.default,
  },
  tabs: { flexDirection: 'row', gap: 2 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 7 },
  tabActive: { backgroundColor: theme.brand.primaryTint },
  tabText: { fontSize: 13, color: theme.text.muted, fontFamily: FF },
  tabTextActive: { color: theme.brand.primary, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: theme.brand.primary,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 7,
  },
  addBtnText: { fontSize: 12, color: '#fff', fontWeight: '600', fontFamily: FF },

  // 날짜 네비게이터
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10,
    backgroundColor: theme.bg.surface,
    borderBottomWidth: 1, borderBottomColor: theme.border.subtle,
  },
  navArrow: { padding: 6, borderRadius: 6 },
  navDisabled: { opacity: 0.3 },
  dateCenter: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 140, justifyContent: 'center' },
  dateText: { fontSize: 15, fontWeight: '600', color: theme.text.primary, fontFamily: FF },
  todayBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  todayBadgeText: { fontSize: 11, fontWeight: '600', fontFamily: FF },

  // 차량 칩
  vehChipScroll: { backgroundColor: theme.bg.surface, borderBottomWidth: 1, borderBottomColor: theme.border.subtle, maxHeight: 56 },
  vehChipContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
  vehChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  vehChipName: { fontSize: 13, fontWeight: '500', fontFamily: FF },
  vehChipNo: { fontSize: 11, fontFamily: FF },

  // 타임라인
  tlHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tlVehNm: { fontSize: 14, fontWeight: '600', fontFamily: FF },
  tlVehNo: { fontSize: 12, fontFamily: FF },
  tlBody: { position: 'relative', marginHorizontal: 0 },

  hourLine: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    height: 1,
  },
  hourLabel: {
    width: TIME_LABEL_W, fontSize: 11, fontWeight: '600',
    textAlign: 'right', paddingRight: 10, fontFamily: FF,
    lineHeight: 16,
  },
  hourRule: { flex: 1, height: 1 },

  halfLine: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    height: 1,
  },
  halfLabel: {
    width: TIME_LABEL_W, fontSize: 9,
    textAlign: 'right', paddingRight: 10, fontFamily: FF,
    lineHeight: 14, opacity: 0.65,
  },
  halfRule: { flex: 1, borderTopWidth: 1, borderStyle: 'dashed' },

  emptySlotTap: { position: 'absolute', right: 0 },

  rsvBlock: {
    position: 'absolute', right: 6,
    borderRadius: 8, borderWidth: 1.5,
    paddingHorizontal: 10, paddingVertical: 6,
    overflow: 'hidden',
    // left is set inline
  },
  rsvBlockTitle: { fontSize: 13, fontWeight: '600', fontFamily: FF },
  rsvBlockTime:  { fontSize: 11, marginTop: 2, fontFamily: FF },
  rsvBlockRmk:   { fontSize: 11, marginTop: 1, fontFamily: FF },
  mineDot: {
    position: 'absolute', top: 6, right: 8,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  // 내 예약
  myCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, borderWidth: 1,
    overflow: 'hidden', marginBottom: 4,
  },
  myCardAccent: { width: 4, alignSelf: 'stretch' },
  myCardBody: { flex: 1, padding: 12, gap: 4 },
  myCardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  myCardVeh: { fontSize: 14, fontWeight: '600', fontFamily: FF },
  myCardTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  myCardTime: { fontSize: 14, fontFamily: FF },
  durBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  durText: { fontSize: 11, fontWeight: '600', fontFamily: FF },
  myCardRmk: { fontSize: 12, fontFamily: FF },
  cancelBtn: { marginRight: 12, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 7, borderWidth: 1 },
  cancelText: { fontSize: 12, color: '#EF4444', fontWeight: '600', fontFamily: FF },

  // 상태 배지
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '600', fontFamily: FF },

  // 내 예약 액션 버튼
  myCardBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  actionBtnText: { fontSize: 12, fontWeight: '600', fontFamily: FF },

  // 모달
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalBox: {
    width: '100%', maxWidth: 480, borderRadius: 14,
    padding: 20, shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 16, elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', fontFamily: FF },
  modalInput: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, fontFamily: FF,
  },
  extInfoBox: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 4,
  },
  extInfoLabel: { fontSize: 12, fontFamily: FF },
  extInfoValue: { fontSize: 14, fontWeight: '600', fontFamily: FF },

  // 공통
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 13, fontFamily: FF },

  // 폼
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  backText: { fontSize: 13, fontFamily: FF },
  formTitle: { fontSize: 20, fontWeight: '700', marginBottom: 24, fontFamily: FF },
  fieldLabel: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 8, marginTop: 20, fontFamily: FF,
  },
  chipScroll: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, marginRight: 8,
  },
  chipTime: { paddingHorizontal: 12 },
  chipText: { fontSize: 13, fontFamily: FF },
  textArea: {
    borderWidth: 1, borderRadius: 8, padding: 12,
    fontSize: 14, minHeight: 76, textAlignVertical: 'top', fontFamily: FF,
  },
  formBtns: { flexDirection: 'row', gap: 12, marginTop: 32 },
  formBtn: { flex: 1, height: 46, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  formBtnText: { fontSize: 14, fontWeight: '600', fontFamily: FF },
});
