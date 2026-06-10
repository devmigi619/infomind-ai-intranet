import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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

/** 실제 종료시각: 연장이면 ext, 아니면 rsv_end */
function getEffectiveEnd(rsv: VehicleReservationDto): { ymd: string; hhmm: string } {
  if (rsv.extYn === 'Y' && rsv.extYmd && rsv.extHhmm) {
    return { ymd: rsv.extYmd, hhmm: rsv.extHhmm };
  }
  return { ymd: rsv.rsvEndYmd, hhmm: rsv.rsvEndHhmm };
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
    <View className="flex-1" style={{ backgroundColor: theme.bg.app }}>

      {/* ── 탑바 ── */}
      <View className="flex-row items-center justify-between px-4 py-2.5 border-b" style={{ backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }}>
        <View className="flex-row gap-0.5">
          {(['grid', 'my'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              className="px-[14px] py-[7px] rounded-[7px]"
              style={{ backgroundColor: mode === m ? theme.brand.primaryTint : 'transparent' }}
              onPress={() => setMode(m)} activeOpacity={0.7}
            >
              <Text
                className={`text-[13px] ${mode === m ? 'font-semibold' : ''}`}
                style={{ color: mode === m ? theme.brand.primary : theme.text.muted, fontFamily: FF }}
              >
                {m === 'grid' ? '전체 현황' : '내 예약'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          className="flex-row items-center gap-[5px] px-[13px] py-2 rounded-[7px]"
          style={{ backgroundColor: theme.brand.primary }}
          activeOpacity={0.7}
          onPress={() => openForm(selectedVehId || vehicles[0]?.vehId || '', selectedDate, '0900')}
        >
          <Plus size={14} color="#fff" />
          <Text className="text-xs text-white font-semibold" style={{ fontFamily: FF }}>예약하기</Text>
        </TouchableOpacity>
      </View>

      {/* ── 날짜 네비게이터 ── */}
      <View className="flex-row items-center justify-center gap-2 py-2.5 border-b" style={{ backgroundColor: theme.bg.surface, borderBottomColor: theme.border.subtle }}>
        <TouchableOpacity
          onPress={goPrev} disabled={selectedDate <= today}
          activeOpacity={0.7}
          className={`p-1.5 rounded-md ${selectedDate <= today ? 'opacity-30' : ''}`}
        >
          <ChevronLeft size={20} color={selectedDate <= today ? theme.border.default : theme.text.primary} />
        </TouchableOpacity>

        <View className="flex-row items-center justify-center gap-2 min-w-[140px]">
          <Text className="text-[15px] font-semibold" style={{ color: theme.text.primary, fontFamily: FF }}>{fmtDate(selectedDate)}</Text>
          {selectedDate === today && (
            <View className="px-[7px] py-0.5 rounded" style={{ backgroundColor: theme.brand.primaryTint }}>
              <Text className="text-[11px] font-semibold" style={{ color: theme.brand.primary, fontFamily: FF }}>오늘</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={goNext} disabled={selectedDate >= max}
          activeOpacity={0.7}
          className={`p-1.5 rounded-md ${selectedDate >= max ? 'opacity-30' : ''}`}
        >
          <ChevronRight size={20} color={selectedDate >= max ? theme.border.default : theme.text.primary} />
        </TouchableOpacity>
      </View>

      {/* ── 차량 선택 칩 ── */}
      {mode === 'grid' && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          className="max-h-14 border-b"
          style={{ backgroundColor: theme.bg.surface, borderBottomColor: theme.border.subtle }}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' }}
        >
          {vehLoading ? (
            <ActivityIndicator size="small" color={theme.brand.primary} style={{ marginLeft: 8 }} />
          ) : (
            vehicles.map((v) => {
              const active = v.vehId === selectedVehId;
              return (
                <TouchableOpacity
                  key={v.vehId}
                  className="flex-row items-center gap-[5px] px-3 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: active ? theme.brand.primary : theme.bg.surface,
                    borderColor: active ? theme.brand.primary : theme.border.default,
                  }}
                  activeOpacity={0.7}
                  onPress={() => setSelectedVehId(v.vehId)}
                >
                  <Car size={12} color={active ? '#fff' : theme.text.muted} />
                  <Text className="text-[13px] font-medium" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>
                    {v.vehNm}
                  </Text>
                  <Text className="text-[11px]" style={{ color: active ? 'rgba(255,255,255,0.75)' : theme.text.muted, fontFamily: FF }}>
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
  if (loading) {
    return <View className="flex-1 items-center justify-center gap-2.5"><ActivityIndicator size="large" color={theme.brand.primary} /></View>;
  }
  if (!vehicle) {
    return (
      <View className="flex-1 items-center justify-center gap-2.5">
        <Car size={40} color={theme.text.subtle} />
        <Text className="text-[13px]" style={{ color: theme.text.muted, fontFamily: FF }}>등록된 차량이 없습니다.</Text>
      </View>
    );
  }

  // 빈 슬롯 탭: 겹치는 예약 없는 30분 슬롯 클릭 → 폼
  const occupiedSet = new Set<string>();
  for (const rsv of reservations) {
    const effEnd = getEffectiveEnd(rsv);
    const stIdx  = HALF_SLOT_HHMM.indexOf(rsv.rsvStHhmm);
    const endIdx = HALF_SLOT_HHMM.indexOf(effEnd.hhmm);
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
      <View className="flex-row items-center gap-2 px-4 py-2.5 border-b" style={{ backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.subtle }}>
        <Car size={14} color={theme.brand.primary} />
        <Text className="text-sm font-semibold" style={{ color: theme.text.primary, fontFamily: FF }}>{vehicle.vehNm}</Text>
        <Text className="text-xs" style={{ color: theme.text.muted, fontFamily: FF }}>{vehicle.vehNo}</Text>
      </View>

      {/* 타임라인 */}
      <View className="relative mx-0" style={{ height: TOTAL_HEIGHT }}>

        {/* 시간 눈금 + 라벨 (배경 레이어) */}
        {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => i + HOUR_START).map((h) => {
          const top = (h - HOUR_START) * HOUR_HEIGHT;
          return (
            <View key={h} className="absolute left-0 right-0 flex-row items-center h-[1px]" style={{ top }}>
              <Text
                className="text-[11px] font-semibold text-right pr-2.5 leading-4"
                style={{ width: TIME_LABEL_W, color: theme.text.subtle, fontFamily: FF }}
              >
                {String(h).padStart(2, '0')}:00
              </Text>
              <View className="flex-1 h-px" style={{ backgroundColor: theme.border.default }} />
            </View>
          );
        })}

        {/* 30분 눈금 (중간 점선) */}
        {Array.from({ length: TOTAL_HOURS }, (_, i) => i + HOUR_START).map((h) => {
          const top = (h - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2;
          return (
            <View key={`half-${h}`} className="absolute left-0 right-0 flex-row items-center h-[1px]" style={{ top }}>
              <Text
                className="text-[9px] text-right pr-2.5 leading-[14px] opacity-65"
                style={{ width: TIME_LABEL_W, color: theme.text.subtle, fontFamily: FF }}
              >
                {String(h).padStart(2, '0')}:30
              </Text>
              <View className="flex-1 border-t border-dashed" style={{ borderColor: theme.border.subtle }} />
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
              className="absolute right-0"
              style={{ top: toTop(slot), height: HOUR_HEIGHT / 2, left: TIME_LABEL_W }}
              onPress={() => onEmptySlotPress(slot)}
            />
          );
        })}

        {/* 예약 블록 */}
        {reservations.map((rsv) => {
          const effEnd = getEffectiveEnd(rsv);
          const top    = toTop(rsv.rsvStHhmm);
          const height = toBlockH(rsv.rsvStHhmm, effEnd.hhmm);
          const isMine = rsv.mine;
          return (
            <TouchableOpacity
              key={`${rsv.vehId}-${rsv.rsvSn}`}
              activeOpacity={0.8}
              className="absolute right-1.5 rounded-lg border-[1.5px] px-2.5 py-1.5 overflow-hidden"
              style={{
                top,
                height,
                left: TIME_LABEL_W + 4,
                backgroundColor: isMine ? theme.brand.primary : theme.bg.surfaceAlt,
                borderColor:     isMine ? theme.brand.primary : theme.border.default,
              }}
              onPress={() => {
                if (isMine) {
                  onMinePress(rsv);
                } else {
                  Alert.alert(
                    '예약 정보',
                    `${rsv.userNm}\n${fmtTime(rsv.rsvStHhmm)} ~ ${fmtTime(effEnd.hhmm)}${rsv.rmk ? `\n${rsv.rmk}` : ''}`
                  );
                }
              }}
            >
              <Text className="text-[13px] font-semibold" style={{ color: isMine ? '#fff' : theme.text.primary, fontFamily: FF }} numberOfLines={1}>
                {rsv.userNm}
              </Text>
              <Text className="text-[11px] mt-0.5" style={{ color: isMine ? 'rgba(255,255,255,0.85)' : theme.text.muted, fontFamily: FF }}>
                {fmtTime(rsv.rsvStHhmm)} ~ {fmtTime(effEnd.hhmm)}
              </Text>
              {rsv.rmk ? (
                <Text className="text-[11px] mt-px" style={{ color: isMine ? 'rgba(255,255,255,0.75)' : theme.text.muted, fontFamily: FF }} numberOfLines={1}>
                  {rsv.rmk}
                </Text>
              ) : null}
              {isMine && (
                <View className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-[rgba(255,255,255,0.6)]" />
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
  const vehMap = Object.fromEntries(vehicles.map((v) => [v.vehId, v]));

  if (loading) {
    return <View className="flex-1 items-center justify-center gap-2.5"><ActivityIndicator size="large" color={theme.brand.primary} /></View>;
  }

  if (reservations.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-2.5">
        <Car size={40} color={theme.text.subtle} />
        <Text className="text-[13px]" style={{ color: theme.text.muted, fontFamily: FF }}>
          {fmtDate(selectedDate)} 내 예약이 없습니다.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {reservations.map((rsv) => {
        const veh = vehMap[rsv.vehId];
        const effEnd = getEffectiveEnd(rsv);
        const dur =
          (+effEnd.hhmm.slice(0, 2) - +rsv.rsvStHhmm.slice(0, 2)) * 60 +
          (+effEnd.hhmm.slice(2, 4) - +rsv.rsvStHhmm.slice(2, 4));
        const returned = rsv.rtnYn === 'Y';
        const extended = rsv.extYn === 'Y';

        return (
          <View
            key={`${rsv.vehId}-${rsv.rsvSn}`}
            className="flex-row rounded-[10px] border overflow-hidden mb-2.5"
            style={{
              backgroundColor: theme.bg.surface,
              borderColor: returned ? theme.border.default : theme.brand.primary,
            }}
          >
            {/* 왼쪽 색띠 */}
            <View className="w-1 self-stretch" style={{ backgroundColor: returned ? theme.border.default : theme.brand.primary }} />

            <View className="flex-1 p-3 gap-1">
              {/* 차량명 + 상태 배지 */}
              <View className="flex-row items-center gap-1.5">
                <Car size={13} color={returned ? theme.text.muted : theme.brand.primary} />
                <Text className="flex-1 text-sm font-semibold" style={{ color: theme.text.primary, fontFamily: FF }} numberOfLines={1}>
                  {veh ? `${veh.vehNm}  ${veh.vehNo}` : rsv.vehId}
                </Text>
                {extended && (
                  <View className="px-[7px] py-0.5 rounded" style={{ backgroundColor: '#FEF3C7' }}>
                    <Text className="text-[10px] font-semibold" style={{ color: '#D97706', fontFamily: FF }}>연장됨</Text>
                  </View>
                )}
                {returned && (
                  <View className="px-[7px] py-0.5 rounded" style={{ backgroundColor: '#D1FAE5' }}>
                    <Text className="text-[10px] font-semibold" style={{ color: '#059669', fontFamily: FF }}>반납 완료</Text>
                  </View>
                )}
              </View>

              {/* 시간 + 소요 */}
              <View className="flex-row items-center gap-2">
                <Text className="text-sm" style={{ color: theme.text.primary, fontFamily: FF }}>
                  {fmtTime(rsv.rsvStHhmm)} ~ {fmtTime(effEnd.hhmm)}
                </Text>
                <View className="px-[7px] py-0.5 rounded" style={{ backgroundColor: theme.brand.primaryTint }}>
                  <Text className="text-[11px] font-semibold" style={{ color: theme.brand.primary, fontFamily: FF }}>
                    {dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? ` ${dur % 60}m` : ''}` : `${dur}m`}
                  </Text>
                </View>
              </View>

              {/* 반납 정보 */}
              {returned && rsv.rtnYmd && (
                <Text className="text-xs" style={{ color: theme.text.muted, fontFamily: FF }}>
                  반납: {fmtDate(rsv.rtnYmd)} {rsv.rtnHhmm ? fmtTime(rsv.rtnHhmm) : ''}
                  {rsv.rtnPlc ? `  ·  ${rsv.rtnPlc}` : ''}
                </Text>
              )}

              {/* 비고 */}
              {rsv.rmk ? (
                <Text className="text-xs" style={{ color: theme.text.muted, fontFamily: FF }} numberOfLines={2}>{rsv.rmk}</Text>
              ) : null}

              {/* 액션 버튼 행 */}
              <View className="flex-row gap-2 mt-2">
                {/* 연장 — 반납 완료 시 비활성 */}
                <TouchableOpacity
                  className="px-3 py-1.5 rounded-md border"
                  style={{
                    borderColor: returned ? theme.border.default : theme.brand.primary,
                    opacity: returned ? 0.4 : 1,
                  }}
                  activeOpacity={0.7}
                  disabled={returned}
                  onPress={() => onExtend(rsv)}
                >
                  <Text className="text-xs font-semibold" style={{ color: returned ? theme.text.muted : theme.brand.primary, fontFamily: FF }}>연장</Text>
                </TouchableOpacity>

                {/* 반납 — 이미 반납 완료 시 비활성 */}
                <TouchableOpacity
                  className="px-3 py-1.5 rounded-md border"
                  style={{
                    borderColor: returned ? theme.border.default : '#10B981',
                    opacity: returned ? 0.4 : 1,
                  }}
                  activeOpacity={0.7}
                  disabled={returned}
                  onPress={() => onReturn(rsv)}
                >
                  <Text className="text-xs font-semibold" style={{ color: returned ? theme.text.muted : '#10B981', fontFamily: FF }}>반납</Text>
                </TouchableOpacity>

                {/* 취소 — 반납 완료 시 비활성 */}
                <TouchableOpacity
                  className="px-3 py-1.5 rounded-md border"
                  style={{
                    borderColor: returned ? theme.border.default : '#EF4444',
                    opacity: returned ? 0.4 : 1,
                  }}
                  activeOpacity={0.7}
                  disabled={returned}
                  onPress={() => onCancel(rsv)}
                >
                  <Text className="text-xs font-semibold" style={{ color: returned ? theme.text.muted : '#EF4444', fontFamily: FF }}>취소</Text>
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
  const dateOptions = getDateOptions(todayYmd, maxYmd);
  const endOptions  = getEndOptions(formStartHhmm);
  const safeEnd     = endOptions.includes(formEndHhmm) ? formEndHhmm : endOptions[0] ?? formEndHhmm;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <TouchableOpacity className="flex-row items-center gap-1 mb-4" onPress={onBack} activeOpacity={0.7}>
        <ArrowLeft size={16} color={theme.text.muted} />
        <Text className="text-[13px]" style={{ color: theme.text.muted, fontFamily: FF }}>뒤로</Text>
      </TouchableOpacity>

      <Text className="text-xl font-bold mb-6" style={{ color: theme.text.primary, fontFamily: FF }}>예약 신청</Text>

      {/* 차량 */}
      <Text className="text-[10px] font-bold uppercase tracking-[0.8px] mb-2 mt-5" style={{ color: theme.text.subtle, fontFamily: FF }}>차량</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
        {vehicles.map((v) => {
          const active = formVehId === v.vehId;
          return (
            <TouchableOpacity
              key={v.vehId}
              className="px-[14px] py-2 rounded-full border mr-2"
              style={{ backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }}
              activeOpacity={0.7} onPress={() => onVehChange(v.vehId)}
            >
              <Text className="text-[13px]" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>
                {v.vehNm}  <Text style={{ opacity: 0.75 }}>{v.vehNo}</Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 날짜 */}
      <Text className="text-[10px] font-bold uppercase tracking-[0.8px] mb-2 mt-5" style={{ color: theme.text.subtle, fontFamily: FF }}>날짜</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
        {dateOptions.map((d) => {
          const active = formDate === d;
          return (
            <TouchableOpacity
              key={d}
              className="px-[14px] py-2 rounded-full border mr-2"
              style={{ backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }}
              activeOpacity={0.7} onPress={() => onDateChange(d)}
            >
              <Text className="text-[13px]" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>
                {fmtDate(d)}{d === todayYmd ? '  (오늘)' : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 시작 시각 */}
      <Text className="text-[10px] font-bold uppercase tracking-[0.8px] mb-2 mt-5" style={{ color: theme.text.subtle, fontFamily: FF }}>시작 시각</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
        {HALF_SLOT_HHMM.slice(0, -1).map((slot) => {
          const active = formStartHhmm === slot;
          return (
            <TouchableOpacity
              key={slot}
              className="px-3 py-2 rounded-full border mr-2"
              style={{ backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }}
              activeOpacity={0.7}
              onPress={() => {
                onStartChange(slot);
                const newEnd = getEndOptions(slot);
                if (!newEnd.includes(safeEnd)) onEndChange(newEnd[1] ?? newEnd[0]);
              }}
            >
              <Text className="text-[13px]" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>{fmtTime(slot)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 종료 시각 */}
      <Text className="text-[10px] font-bold uppercase tracking-[0.8px] mb-2 mt-5" style={{ color: theme.text.subtle, fontFamily: FF }}>종료 시각</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
        {endOptions.map((slot) => {
          const active = safeEnd === slot;
          return (
            <TouchableOpacity
              key={slot}
              className="px-3 py-2 rounded-full border mr-2"
              style={{ backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }}
              activeOpacity={0.7} onPress={() => onEndChange(slot)}
            >
              <Text className="text-[13px]" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>{fmtTime(slot)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 비고 */}
      <Text className="text-[10px] font-bold uppercase tracking-[0.8px] mb-2 mt-5" style={{ color: theme.text.subtle, fontFamily: FF }}>비고 (선택)</Text>
      <TextInput
        className="border rounded-lg p-3 text-sm min-h-[76px]"
        style={{ backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.default, color: theme.text.primary, textAlignVertical: 'top', fontFamily: FF }}
        placeholder="사용 목적 등을 입력하세요"
        placeholderTextColor={theme.text.muted}
        value={formRmk} onChangeText={onRmkChange}
        multiline numberOfLines={3}
      />

      {/* 버튼 */}
      <View className="flex-row gap-3 mt-8">
        <TouchableOpacity
          className="flex-1 h-[46px] rounded-[9px] border items-center justify-center"
          style={{ backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.default }}
          onPress={onBack} activeOpacity={0.7}
        >
          <Text className="text-sm font-semibold" style={{ color: theme.text.primary, fontFamily: FF }}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 h-[46px] rounded-[9px] border items-center justify-center"
          style={{ backgroundColor: theme.brand.primary, borderColor: theme.brand.primary }}
          onPress={onSubmit} activeOpacity={0.7} disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text className="text-sm font-semibold" style={{ color: '#fff', fontFamily: FF }}>신청</Text>
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center p-5 bg-[rgba(0,0,0,0.45)]">
        <View
          className="w-full max-w-[480px] rounded-[14px] p-5 shadow-lg"
          style={{ backgroundColor: theme.bg.surface }}
        >
          {/* 헤더 */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[17px] font-bold" style={{ color: theme.text.primary, fontFamily: FF }}>반납 처리</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          {/* 반납 날짜 */}
          <Text className="text-[10px] font-bold uppercase tracking-[0.8px] mb-2 mt-5" style={{ color: theme.text.subtle, fontFamily: FF }}>반납 날짜</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
            {dateOptions.map((d) => {
              const active = rtnYmd === d;
              return (
                <TouchableOpacity
                  key={d}
                  className="px-[14px] py-2 rounded-full border mr-2"
                  style={{
                    backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt,
                    borderColor: active ? theme.brand.primary : theme.border.default,
                  }}
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
                  <Text className="text-[13px]" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>
                    {fmtDate(d)}{d === today ? '  (오늘)' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 반납 시각 — 예약 시작일과 같은 날이면 예약 시작 시각 이후만 표시 */}
          <Text className="text-[10px] font-bold uppercase tracking-[0.8px] mb-2 mt-5" style={{ color: theme.text.subtle, fontFamily: FF }}>반납 시각</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
            {timeSlots.map((slot) => {
              const active = safeRtnHhmm === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  className="px-3 py-2 rounded-full border mr-2"
                  style={{
                    backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt,
                    borderColor: active ? theme.brand.primary : theme.border.default,
                  }}
                  activeOpacity={0.7}
                  onPress={() => setRtnHhmm(slot)}
                >
                  <Text className="text-[13px]" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>
                    {fmtTime(slot)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 반납 장소 */}
          <Text className="text-[10px] font-bold uppercase tracking-[0.8px] mb-2 mt-5" style={{ color: theme.text.subtle, fontFamily: FF }}>반납 장소 (선택)</Text>
          <TextInput
            className="border rounded-lg px-3 py-2.5 text-sm"
            style={{
              backgroundColor: theme.bg.surfaceAlt,
              borderColor: theme.border.default,
              color: theme.text.primary,
              fontFamily: FF,
            }}
            placeholder="예: 주차장 B구역"
            placeholderTextColor={theme.text.muted}
            value={rtnPlc}
            onChangeText={setRtnPlc}
          />

          {/* 버튼 */}
          <View className="flex-row gap-3 mt-5">
            <TouchableOpacity
              className="flex-1 h-[46px] rounded-[9px] border items-center justify-center"
              style={{ backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.default }}
              onPress={onClose} activeOpacity={0.7}
            >
              <Text className="text-sm font-semibold" style={{ color: theme.text.primary, fontFamily: FF }}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 h-[46px] rounded-[9px] border items-center justify-center"
              style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
              onPress={() => onSubmit({ rtnYmd, rtnHhmm: safeRtnHhmm, rtnPlc: rtnPlc || undefined })}
              activeOpacity={0.7}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text className="text-sm font-semibold" style={{ color: '#fff', fontFamily: FF }}>반납 처리</Text>
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

  // 실제 종료시간 (연장 반영)
  const effEnd = reservation ? getEffectiveEnd(reservation) : { ymd: '', hhmm: '' };

  React.useEffect(() => {
    if (visible && reservation) {
      const eff = getEffectiveEnd(reservation);
      setNewEndYmd(eff.ymd);
      // 현재 실제 종료 이후 첫 슬롯을 기본값으로
      const afterEnd = getEndOptions(eff.hhmm);
      setNewEndHhmm(afterEnd[0] ?? '');
    }
  }, [visible, reservation]);

  if (!reservation) return null;

  // 날짜 선택지: 현재 실제 종료일 ~ maxYmd
  const dateOptions: string[] = [];
  let cur = effEnd.ymd;
  while (cur <= maxYmd) { dateOptions.push(cur); cur = addDays(cur, 1); }

  // 시각 선택지: 현재 실제 종료일과 같으면 종료 이후 슬롯만, 다른 날이면 전체
  const timeOptions =
    newEndYmd === effEnd.ymd
      ? getEndOptions(effEnd.hhmm)
      : HALF_SLOT_HHMM;

  const safeHhmm = timeOptions.includes(newEndHhmm) ? newEndHhmm : (timeOptions[0] ?? newEndHhmm);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center p-5 bg-[rgba(0,0,0,0.45)]">
        <View
          className="w-full max-w-[480px] rounded-[14px] p-5 shadow-lg"
          style={{ backgroundColor: theme.bg.surface }}
        >
          {/* 헤더 */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[17px] font-bold" style={{ color: theme.text.primary, fontFamily: FF }}>예약 연장</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          {/* 현재 종료 (읽기 전용) */}
          <View className="flex-row items-center justify-between border rounded-lg px-3 py-2.5 mb-1" style={{ backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.subtle }}>
            <Text className="text-xs" style={{ color: theme.text.subtle, fontFamily: FF }}>현재 종료</Text>
            <Text className="text-sm font-semibold" style={{ color: theme.text.primary, fontFamily: FF }}>
              {fmtDate(effEnd.ymd)}  {fmtTime(effEnd.hhmm)}
            </Text>
          </View>

          {/* 새 종료 날짜 */}
          <Text className="text-[10px] font-bold uppercase tracking-[0.8px] mb-2 mt-5" style={{ color: theme.text.subtle, fontFamily: FF }}>새 종료 날짜</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
            {dateOptions.map((d) => {
              const active = newEndYmd === d;
              return (
                <TouchableOpacity
                  key={d}
                  className="px-[14px] py-2 rounded-full border mr-2"
                  style={{
                    backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt,
                    borderColor: active ? theme.brand.primary : theme.border.default,
                  }}
                  activeOpacity={0.7}
                  onPress={() => {
                    setNewEndYmd(d);
                    const opts =
                      d === effEnd.ymd
                        ? getEndOptions(effEnd.hhmm)
                        : HALF_SLOT_HHMM;
                    if (!opts.includes(safeHhmm)) setNewEndHhmm(opts[0] ?? '');
                  }}
                >
                  <Text className="text-[13px]" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>
                    {fmtDate(d)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 새 종료 시각 */}
          <Text className="text-[10px] font-bold uppercase tracking-[0.8px] mb-2 mt-5" style={{ color: theme.text.subtle, fontFamily: FF }}>새 종료 시각</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
            {timeOptions.map((slot) => {
              const active = safeHhmm === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  className="px-3 py-2 rounded-full border mr-2"
                  style={{
                    backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt,
                    borderColor: active ? theme.brand.primary : theme.border.default,
                  }}
                  activeOpacity={0.7}
                  onPress={() => setNewEndHhmm(slot)}
                >
                  <Text className="text-[13px]" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>
                    {fmtTime(slot)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 버튼 */}
          <View className="flex-row gap-3 mt-5">
            <TouchableOpacity
              className="flex-1 h-[46px] rounded-[9px] border items-center justify-center"
              style={{ backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.default }}
              onPress={onClose} activeOpacity={0.7}
            >
              <Text className="text-sm font-semibold" style={{ color: theme.text.primary, fontFamily: FF }}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 h-[46px] rounded-[9px] border items-center justify-center"
              style={{ backgroundColor: theme.brand.primary, borderColor: theme.brand.primary }}
              onPress={() => onSubmit({ newEndYmd, newEndHhmm: safeHhmm })}
              activeOpacity={0.7}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text className="text-sm font-semibold" style={{ color: '#fff', fontFamily: FF }}>연장</Text>
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
