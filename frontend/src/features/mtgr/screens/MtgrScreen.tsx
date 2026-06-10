import React, { useState, useCallback } from 'react';
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
import { ChevronLeft, ChevronRight, Plus, ArrowLeft, Building2, X } from 'lucide-react-native';
import {
  useMtgrs,
  useMtgrReservations,
  useCreateMtgrReservation,
  useCancelMtgrReservation,
  useExtendMtgrReservation,
  type MtgrDto,
  type MtgrReservationDto,
  type CreateMtgrReservationRequest,
} from '../api';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';

// ─── 상수 ──────────────────────────────────────────────────────────────

type Mode = 'grid' | 'my' | 'form';

const HOUR_START = 8;   // 08:00
const HOUR_END   = 20;  // 20:00
const TOTAL_HOURS = HOUR_END - HOUR_START;
const HOUR_HEIGHT = 72;
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const TIME_LABEL_W = 52;
const HALF_SLOT_HHMM: string[] = (() => {
  const slots: string[] = [];
  for (let h = HOUR_START; h < HOUR_END; h++) {
    slots.push(`${String(h).padStart(2, '0')}00`);
    slots.push(`${String(h).padStart(2, '0')}30`);
  }
  return slots;
})();

const FF = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

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
function maxYmd(): string   { return addDays(todayYmd(), 14); }

function fmtDate(ymd: string): string {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function fmtTime(hhmm: string): string {
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

function getEffectiveEnd(rsv: MtgrReservationDto): { ymd: string; hhmm: string } {
  if (rsv.extYn === 'Y' && rsv.extYmd && rsv.extHhmm) {
    return { ymd: rsv.extYmd, hhmm: rsv.extHhmm };
  }
  return { ymd: rsv.rsvEndYmd, hhmm: rsv.rsvEndHhmm };
}

function toTop(hhmm: string): number {
  const h = Math.min(Math.max(+hhmm.slice(0, 2), HOUR_START), HOUR_END);
  const m = +hhmm.slice(2, 4);
  return ((h - HOUR_START) + m / 60) * HOUR_HEIGHT;
}

function toBlockH(stHhmm: string, endHhmm: string): number {
  const startMin = (+stHhmm.slice(0, 2) - HOUR_START) * 60 + +stHhmm.slice(2, 4);
  const endMin   = (+endHhmm.slice(0, 2) - HOUR_START) * 60 + +endHhmm.slice(2, 4);
  return Math.max(12, ((endMin - startMin) / 60) * HOUR_HEIGHT);
}

function getEndOptions(startHhmm: string): string[] {
  const startIdx = HALF_SLOT_HHMM.indexOf(startHhmm);
  return HALF_SLOT_HHMM.slice(startIdx + 1);
}

// ─── 메인 화면 ─────────────────────────────────────────────────────────

export function MtgrScreen() {
  const theme = useTheme();
  const today = todayYmd();
  const max   = maxYmd();

  const [mode, setMode]               = useState<Mode>('grid');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMtgrId, setSelectedMtgrId] = useState<string>('');

  // form state
  const [formMtgrId, setFormMtgrId]         = useState('');
  const [formDate, setFormDate]           = useState(today);
  const [formStartHhmm, setFormStartHhmm] = useState('0900');
  const [formEndHhmm, setFormEndHhmm]     = useState('1000');
  const [formRmk, setFormRmk]             = useState('');

  const { data: mtgrs = [], isLoading: mtgrLoading } = useMtgrs();
  const { data: reservations = [], isLoading: rsvLoading } =
    useMtgrReservations(selectedDate);

  const createMutation = useCreateMtgrReservation();
  const cancelMutation  = useCancelMtgrReservation();
  const extendMutation  = useExtendMtgrReservation();

  const confirm = useConfirm();
  const toast   = useToast();

  const [extendTarget, setExtendTarget] = useState<MtgrReservationDto | null>(null);

  React.useEffect(() => {
    if (mtgrs.length > 0 && !selectedMtgrId) {
      setSelectedMtgrId(mtgrs[0].mtgrId);
    }
  }, [mtgrs, selectedMtgrId]);

  const goPrev = useCallback(() => {
    if (selectedDate <= today) return;
    setSelectedDate((d) => addDays(d, -1));
  }, [selectedDate, today]);

  const goNext = useCallback(() => {
    if (selectedDate >= max) return;
    setSelectedDate((d) => addDays(d, 1));
  }, [selectedDate, max]);

  const openForm = useCallback((mtgrId: string, date: string, startHhmm: string) => {
    const opts = getEndOptions(startHhmm);
    const defaultEnd = opts[1] ?? opts[0] ?? '1000';
    setFormMtgrId(mtgrId);
    setFormDate(date);
    setFormStartHhmm(startHhmm);
    setFormEndHhmm(defaultEnd);
    setFormRmk('');
    setMode('form');
  }, []);

  const handleCreate = useCallback(async () => {
    if (!formMtgrId) { toast.warning('회의실을 선택해주세요.'); return; }
    const req: CreateMtgrReservationRequest = {
      rsvStYmd: formDate, rsvStHhmm: formStartHhmm,
      rsvEndYmd: formDate, rsvEndHhmm: formEndHhmm,
      rmk: formRmk,
    };
    try {
      await createMutation.mutateAsync({ mtgrId: formMtgrId, data: req });
      toast.success('예약이 완료되었습니다.');
      setMode('grid');
    } catch (err: any) {
      if (!(err as any)?._handled) {
        toast.error(err?.response?.data?.message ?? '예약 신청에 실패했습니다.');
      }
    }
  }, [formMtgrId, formDate, formStartHhmm, formEndHhmm, formRmk, createMutation, toast]);

  const handleCancel = useCallback(async (rsv: MtgrReservationDto) => {
    const ok = await confirm({
      title: '예약 취소',
      message: `${fmtDate(rsv.rsvStYmd)}  ${fmtTime(rsv.rsvStHhmm)} ~ ${fmtTime(rsv.rsvEndHhmm)}\n예약을 취소하시겠습니까?`,
      confirmText: '취소하기',
      danger: true,
    });

    if (!ok) return;
    try {
      await cancelMutation.mutateAsync({ mtgrId: rsv.mtgrId, rsvSn: rsv.rsvSn });
      toast.success('예약이 취소되었습니다.');
    } catch (err: any) {
      if (!(err as any)?._handled) {
        toast.error('예약 취소에 실패했습니다.');
      }
    }
  }, [cancelMutation, confirm, toast]);

  if (mode === 'form') {
    return (
      <FormView
        mtgrs={mtgrs}
        formMtgrId={formMtgrId} formDate={formDate}
        formStartHhmm={formStartHhmm} formEndHhmm={formEndHhmm}
        formRmk={formRmk} todayYmd={today} maxYmd={max}
        loading={createMutation.isPending}
        onMtgrChange={setFormMtgrId} onDateChange={setFormDate}
        onStartChange={setFormStartHhmm} onEndChange={setFormEndHhmm}
        onRmkChange={setFormRmk}
        onSubmit={handleCreate} onBack={() => setMode('grid')}
        theme={theme}
      />
    );
  }

  const selectedMtgr = mtgrs.find((v) => v.mtgrId === selectedMtgrId);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg.app }}>
      <View className="flex-row items-center justify-between px-4 h-14 border-b" style={{ borderBottomColor: theme.border.subtle, backgroundColor: theme.bg.surface }}>
        <View className="flex-row gap-4">
          {(['grid', 'my'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              className={`h-14 justify-center px-1 ${mode === m ? 'border-b-2' : ''}`}
              style={{ borderBottomColor: mode === m ? theme.brand.primary : 'transparent' }}
              onPress={() => setMode(m)} activeOpacity={0.7}
            >
              <Text
                className={`text-[15px] ${mode === m ? 'font-bold' : 'font-medium'}`}
                style={{ color: mode === m ? theme.brand.primary : theme.text.muted, fontFamily: FF }}
              >
                {m === 'grid' ? '전체 현황' : '내 예약'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          className="flex-row items-center px-3 py-2 rounded-lg gap-1.5"
          style={{ backgroundColor: theme.brand.primary }}
          activeOpacity={0.7}
          onPress={() => openForm(selectedMtgrId || mtgrs[0]?.mtgrId || '', selectedDate, '0900')}
        >
          <Plus size={14} color="#fff" />
          <Text className="text-white text-[13px] font-semibold" style={{ fontFamily: FF }}>예약하기</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center justify-center py-3 gap-5" style={{ backgroundColor: theme.bg.surface }}>
        <TouchableOpacity
          onPress={goPrev} disabled={selectedDate <= today}
          activeOpacity={0.7}
          className={`w-9 h-9 items-center justify-center rounded-full ${selectedDate <= today ? 'opacity-30' : ''}`}
        >
          <ChevronLeft size={20} color={selectedDate <= today ? theme.border.default : theme.text.primary} />
        </TouchableOpacity>

        <View className="items-center flex-row gap-2">
          <Text className="text-[17px] font-bold" style={{ color: theme.text.primary, fontFamily: FF }}>{fmtDate(selectedDate)}</Text>
          {selectedDate === today && (
            <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.brand.primaryTint }}>
              <Text className="text-[11px] font-bold" style={{ color: theme.brand.primary, fontFamily: FF }}>오늘</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={goNext} disabled={selectedDate >= max}
          activeOpacity={0.7}
          className={`w-9 h-9 items-center justify-center rounded-full ${selectedDate >= max ? 'opacity-30' : ''}`}
        >
          <ChevronRight size={20} color={selectedDate >= max ? theme.border.default : theme.text.primary} />
        </TouchableOpacity>
      </View>

      {mode === 'grid' && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          className="flex-grow-0 py-2.5 border-b"
          style={{ backgroundColor: theme.bg.surface, borderBottomColor: theme.border.subtle }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {mtgrLoading ? (
            <ActivityIndicator size="small" color={theme.brand.primary} style={{ marginLeft: 8 }} />
          ) : (
            mtgrs.map((v) => {
              const active = v.mtgrId === selectedMtgrId;
              return (
                <TouchableOpacity
                  key={v.mtgrId}
                  className="flex-row items-center px-3 py-2 rounded-full border gap-1.5"
                  style={{
                    backgroundColor: active ? theme.brand.primary : theme.bg.surface,
                    borderColor: active ? theme.brand.primary : theme.border.default,
                  }}
                  activeOpacity={0.7}
                  onPress={() => setSelectedMtgrId(v.mtgrId)}
                >
                  <Building2 size={12} color={active ? '#fff' : theme.text.muted} />
                  <Text className="text-[13px] font-semibold" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>
                    {v.mtgrNm}
                  </Text>
                  {v.mtgrSe === 'D' && (
                    <Text className="text-[11px] font-medium" style={{ color: active ? 'rgba(255,255,255,0.75)' : theme.brand.primary, fontFamily: FF }}>
                      부서
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {mode === 'grid' ? (
        <TimelineView
          mtgr={selectedMtgr ?? null}
          reservations={reservations.filter((r) => r.mtgrId === selectedMtgrId)}
          loading={mtgrLoading || rsvLoading}
          selectedDate={selectedDate}
          onEmptySlotPress={(hhmm) =>
            openForm(selectedMtgrId, selectedDate, hhmm)
          }
          onMinePress={handleCancel}
          theme={theme}
        />
      ) : (
        <MyView
          mtgrs={mtgrs}
          reservations={reservations.filter((r) => r.mine)}
          loading={rsvLoading}
          selectedDate={selectedDate}
          onCancel={handleCancel}
          onExtend={(rsv) => setExtendTarget(rsv)}
          theme={theme}
        />
      )}

      <ExtendModal
        visible={extendTarget !== null}
        reservation={extendTarget}
        maxYmd={max}
        loading={extendMutation.isPending}
        onClose={() => setExtendTarget(null)}
        onSubmit={async (req: any) => {
          if (!extendTarget) return;
          try {
            await extendMutation.mutateAsync({ mtgrId: extendTarget.mtgrId, rsvSn: extendTarget.rsvSn, data: req });
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

// ─── TimelineView ─────────────────────────────────────────────────────

interface TimelineViewProps {
  mtgr: MtgrDto | null;
  reservations: MtgrReservationDto[];
  loading: boolean;
  selectedDate: string;
  onEmptySlotPress: (hhmm: string) => void;
  onMinePress: (rsv: MtgrReservationDto) => void;
  theme: any;
}

function TimelineView({
  mtgr, reservations, loading,
  onEmptySlotPress, onMinePress, theme,
}: TimelineViewProps) {
  if (loading) {
    return <View className="flex-1 items-center justify-center gap-3 p-10"><ActivityIndicator size="large" color={theme.brand.primary} /></View>;
  }
  if (!mtgr) {
    return (
      <View className="flex-1 items-center justify-center gap-3 p-10">
        <Building2 size={40} color={theme.text.subtle} />
        <Text className="text-[14px]" style={{ color: theme.text.muted, fontFamily: FF }}>등록된 회의실이 없습니다.</Text>
      </View>
    );
  }

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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator>
      <View className="flex-row items-center px-5 py-3 border-b gap-2" style={{ backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.subtle }}>
        <Building2 size={14} color={theme.brand.primary} />
        <Text className="text-[15px] font-bold" style={{ color: theme.text.primary, fontFamily: FF }}>{mtgr.mtgrNm}</Text>
        <Text className="text-[13px]" style={{ color: theme.text.muted, fontFamily: FF }}>{mtgr.mtgrPlc}</Text>
      </View>

      <View className="w-full relative" style={{ height: TOTAL_HEIGHT }}>
        {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => i + HOUR_START).map((h) => {
          const top = (h - HOUR_START) * HOUR_HEIGHT;
          return (
            <View key={h} className="absolute left-0 right-0 h-[1px] flex-row items-center" style={{ top }}>
              <Text className="text-[11px] text-center" style={{ width: TIME_LABEL_W, color: theme.text.subtle, fontFamily: FF }}>{String(h).padStart(2, '0')}:00</Text>
              <View className="flex-1 h-[1px]" style={{ backgroundColor: theme.border.default }} />
            </View>
          );
        })}

        {Array.from({ length: TOTAL_HOURS }, (_, i) => i + HOUR_START).map((h) => {
          const top = (h - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2;
          return (
            <View key={`half-${h}`} className="absolute left-0 right-0 h-[1px] flex-row items-center" style={{ top }}>
              <Text className="text-[10px] text-center opacity-50" style={{ width: TIME_LABEL_W, color: theme.text.subtle, fontFamily: FF }}>{String(h).padStart(2, '0')}:30</Text>
              <View className="flex-1 border-t-[1px] border-dashed" style={{ borderColor: theme.border.subtle }} />
            </View>
          );
        })}

        {HALF_SLOT_HHMM.map((slot) => {
          if (occupiedSet.has(slot)) return null;
          return (
            <TouchableOpacity
              key={`empty-${slot}`}
              activeOpacity={0.15}
              className="absolute right-0 z-[1]"
              style={{ top: toTop(slot), height: HOUR_HEIGHT / 2, left: TIME_LABEL_W }}
              onPress={() => onEmptySlotPress(slot)}
            />
          );
        })}

        {reservations.map((rsv) => {
          const effEnd = getEffectiveEnd(rsv);
          const top    = toTop(rsv.rsvStHhmm);
          const height = toBlockH(rsv.rsvStHhmm, effEnd.hhmm);
          const isMine = rsv.mine;
          return (
            <TouchableOpacity
              key={`${rsv.mtgrId}-${rsv.rsvSn}`}
              activeOpacity={0.8}
              className="absolute right-3 rounded-md border p-2 z-10 justify-center"
              style={{
                top, height,
                left: TIME_LABEL_W + 4,
                backgroundColor: isMine ? theme.brand.primary : theme.bg.surfaceAlt,
                borderColor:     isMine ? theme.brand.primary : theme.border.default,
              }}
              onPress={() => {
                if (isMine) onMinePress(rsv);
                else {
                  Alert.alert('예약 정보', `${rsv.userNm}\n${fmtTime(rsv.rsvStHhmm)} ~ ${fmtTime(effEnd.hhmm)}${rsv.rmk ? `\n${rsv.rmk}` : ''}`);
                }
              }}
            >
              <Text className="text-[13px] font-bold" style={{ color: isMine ? '#fff' : theme.text.primary, fontFamily: FF }} numberOfLines={1}>{rsv.userNm}</Text>
              <Text className="text-[11px] mt-0.5" style={{ color: isMine ? 'rgba(255,255,255,0.85)' : theme.text.muted, fontFamily: FF }}>{fmtTime(rsv.rsvStHhmm)} ~ {fmtTime(effEnd.hhmm)}</Text>
              {rsv.rmk ? <Text className="text-[11px] mt-0.5 opacity-80" style={{ color: isMine ? 'rgba(255,255,255,0.75)' : theme.text.muted, fontFamily: FF }} numberOfLines={1}>{rsv.rmk}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── MyView ───────────────────────────────────────────────────────────

interface MyViewProps {
  mtgrs: MtgrDto[];
  reservations: MtgrReservationDto[];
  loading: boolean;
  selectedDate: string;
  onCancel: (rsv: MtgrReservationDto) => void;
  onExtend: (rsv: MtgrReservationDto) => void;
  theme: any;
}

function MyView({ mtgrs, reservations, loading, selectedDate, onCancel, onExtend, theme }: MyViewProps) {
  const mtgrMap = Object.fromEntries(mtgrs.map((v) => [v.mtgrId, v]));

  if (loading) return <View className="flex-1 items-center justify-center gap-3 p-10"><ActivityIndicator size="large" color={theme.brand.primary} /></View>;
  if (reservations.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-3 p-10">
        <Building2 size={40} color={theme.text.subtle} />
        <Text className="text-[14px]" style={{ color: theme.text.muted, fontFamily: FF }}>{fmtDate(selectedDate)} 내 예약이 없습니다.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {reservations.map((rsv) => {
        const mtgr = mtgrMap[rsv.mtgrId];
        const effEnd = getEffectiveEnd(rsv);
        const dur = (+effEnd.hhmm.slice(0, 2) - +rsv.rsvStHhmm.slice(0, 2)) * 60 + (+effEnd.hhmm.slice(2, 4) - +rsv.rsvStHhmm.slice(2, 4));
        const extended = rsv.extYn === 'Y';

        return (
          <View key={`${rsv.mtgrId}-${rsv.rsvSn}`} className="flex-row rounded-xl border overflow-hidden" style={{ backgroundColor: theme.bg.surface, borderColor: theme.brand.primary, marginBottom: 10 }}>
            <View className="w-1" style={{ backgroundColor: theme.brand.primary }} />
            <View style={{ flex: 1, padding: 12, gap: 4 }}>
              <View className="flex-row items-center gap-1.5">
                <Building2 size={13} color={theme.brand.primary} />
                <Text className="text-[15px] font-bold" style={{ color: theme.text.primary, flex: 1, fontFamily: FF }} numberOfLines={1}>{mtgr ? `${mtgr.mtgrNm} (${mtgr.mtgrPlc})` : rsv.mtgrId}</Text>
                {extended && (
                  <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEF3C7' }}><Text className="text-[10px] font-bold" style={{ color: '#D97706', fontFamily: FF }}>연장됨</Text></View>
                )}
              </View>
              <View className="flex-row items-center gap-2.5 mt-1">
                <Text className="text-[14px] font-semibold" style={{ color: theme.text.primary, fontFamily: FF }}>{fmtTime(rsv.rsvStHhmm)} ~ {fmtTime(effEnd.hhmm)}</Text>
                <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.brand.primaryTint }}><Text className="text-[11px] font-bold" style={{ color: theme.brand.primary, fontFamily: FF }}>{dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? ` ${dur % 60}m` : ''}` : `${dur}m`}</Text></View>
              </View>
              {rsv.rmk ? <Text className="text-[13px] mt-1.5 leading-[18px]" style={{ color: theme.text.muted, fontFamily: FF }} numberOfLines={2}>{rsv.rmk}</Text> : null}
              <View className="flex-row gap-2 mt-3">
                <TouchableOpacity className="flex-1 h-9 items-center justify-center rounded-lg border" style={{ borderColor: theme.brand.primary }} activeOpacity={0.7} onPress={() => onExtend(rsv)}><Text className="text-[13px] font-semibold" style={{ color: theme.brand.primary, fontFamily: FF }}>연장</Text></TouchableOpacity>
                <TouchableOpacity className="flex-1 h-9 items-center justify-center rounded-lg border" style={{ borderColor: '#EF4444' }} activeOpacity={0.7} onPress={() => onCancel(rsv)}><Text className="text-[13px] font-semibold" style={{ color: '#EF4444', fontFamily: FF }}>취소</Text></TouchableOpacity>
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
  mtgrs: MtgrDto[];
  formMtgrId: string; formDate: string;
  formStartHhmm: string; formEndHhmm: string; formRmk: string;
  todayYmd: string; maxYmd: string; loading: boolean;
  onMtgrChange: (v: string) => void; onDateChange: (v: string) => void;
  onStartChange: (v: string) => void; onEndChange: (v: string) => void;
  onRmkChange: (v: string) => void;
  onSubmit: () => void; onBack: () => void;
  theme: any;
}

function FormView({
  mtgrs, formMtgrId, formDate, formStartHhmm, formEndHhmm, formRmk,
  todayYmd, maxYmd, loading,
  onMtgrChange, onDateChange, onStartChange, onEndChange, onRmkChange,
  onSubmit, onBack, theme,
}: FormViewProps) {
  const dateOptions: string[] = [];
  let cur = todayYmd;
  while (cur <= maxYmd) { dateOptions.push(cur); cur = addDays(cur, 1); }
  const endOptions = getEndOptions(formStartHhmm);
  const safeEnd = endOptions.includes(formEndHhmm) ? formEndHhmm : endOptions[0] ?? formEndHhmm;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <TouchableOpacity className="flex-row items-center gap-1.5 mb-4" onPress={onBack} activeOpacity={0.7}><ArrowLeft size={16} color={theme.text.muted} /><Text className="text-[15px] font-medium" style={{ color: theme.text.muted, fontFamily: FF }}>뒤로</Text></TouchableOpacity>
      <Text className="text-2xl font-extrabold mb-6" style={{ color: theme.text.primary, fontFamily: FF }}>회의실 예약</Text>
      
      <Text className="text-[13px] font-semibold mb-2 mt-4" style={{ color: theme.text.subtle, fontFamily: FF }}>회의실</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0 mb-2">{mtgrs.map((v) => { const active = formMtgrId === v.mtgrId; return (<TouchableOpacity key={v.mtgrId} className="px-4 py-2.5 rounded-lg border mr-2" style={{ backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }} activeOpacity={0.7} onPress={() => onMtgrChange(v.mtgrId)}><Text className="text-[14px] font-semibold" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>{v.mtgrNm} <Text style={{ opacity: 0.7 }}>{v.mtgrPlc}</Text></Text></TouchableOpacity>); })}</ScrollView>
      
      <Text className="text-[13px] font-semibold mb-2 mt-4" style={{ color: theme.text.subtle, fontFamily: FF }}>날짜</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0 mb-2">{dateOptions.map((d) => { const active = formDate === d; return (<TouchableOpacity key={d} className="px-4 py-2.5 rounded-lg border mr-2" style={{ backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }} activeOpacity={0.7} onPress={() => onDateChange(d)}><Text className="text-[14px] font-semibold" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>{fmtDate(d)}{d === todayYmd ? ' (오늘)' : ''}</Text></TouchableOpacity>); })}</ScrollView>
      
      <Text className="text-[13px] font-semibold mb-2 mt-4" style={{ color: theme.text.subtle, fontFamily: FF }}>시작 시각</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0 mb-2">{HALF_SLOT_HHMM.slice(0, -1).map((slot) => { const active = formStartHhmm === slot; return (<TouchableOpacity key={slot} className="px-4 py-2.5 rounded-lg border mr-2 w-20 items-center" style={{ backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }} activeOpacity={0.7} onPress={() => { onStartChange(slot); const newEnd = getEndOptions(slot); if (!newEnd.includes(safeEnd)) onEndChange(newEnd[1] ?? newEnd[0]); }}><Text className="text-[14px] font-semibold" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>{fmtTime(slot)}</Text></TouchableOpacity>); })}</ScrollView>
      
      <Text className="text-[13px] font-semibold mb-2 mt-4" style={{ color: theme.text.subtle, fontFamily: FF }}>종료 시각</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0 mb-2">{endOptions.map((slot) => { const active = safeEnd === slot; return (<TouchableOpacity key={slot} className="px-4 py-2.5 rounded-lg border mr-2 w-20 items-center" style={{ backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }} activeOpacity={0.7} onPress={() => onEndChange(slot)}><Text className="text-[14px] font-semibold" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>{fmtTime(slot)}</Text></TouchableOpacity>); })}</ScrollView>
      
      <Text className="text-[13px] font-semibold mb-2 mt-4" style={{ color: theme.text.subtle, fontFamily: FF }}>회의 목적</Text>
      <TextInput className="border rounded-xl p-3 text-[15px] min-h-[100px]" style={{ backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.default, color: theme.text.primary, textAlignVertical: 'top', fontFamily: FF }} placeholder="회의 목적을 입력해주세요" placeholderTextColor={theme.text.muted} value={formRmk} onChangeText={onRmkChange} multiline numberOfLines={3} />
      
      <TouchableOpacity className="h-14 rounded-2xl items-center justify-center mt-8" style={{ backgroundColor: theme.brand.primary, opacity: loading ? 0.7 : 1 }} activeOpacity={0.7} onPress={onSubmit} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-[17px] font-bold" style={{ fontFamily: FF }}>예약 신청하기</Text>}</TouchableOpacity>
    </ScrollView>
  );
}

// ─── ExtendModal ──────────────────────────────────────────────────────

function ExtendModal({ visible, reservation, loading, onClose, onSubmit, theme }: any) {
  const [newEndHhmm, setNewEndHhmm] = useState('');
  const effEnd = reservation ? getEffectiveEnd(reservation) : { ymd: '', hhmm: '' };
  
  React.useEffect(() => {
    if (reservation) {
      const eff = getEffectiveEnd(reservation);
      setNewEndHhmm(getEndOptions(eff.hhmm)[1] ?? getEndOptions(eff.hhmm)[0] ?? '');
    }
  }, [reservation]);

  if (!reservation) return null;
  const endOptions = getEndOptions(effEnd.hhmm);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center p-5 bg-[rgba(0,0,0,0.5)]">
        <View className="rounded-[20px] overflow-hidden" style={{ backgroundColor: theme.bg.surface }}>
          <View className="flex-row items-center justify-between p-5 border-b border-b-[#eee]">
            <Text className="text-[18px] font-bold" style={{ color: theme.text.primary, fontFamily: FF }}>예약 연장</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={theme.text.muted} /></TouchableOpacity>
          </View>
          <View className="p-5">
            <Text className="text-[14px] mb-3" style={{ color: theme.text.subtle, fontFamily: FF }}>현재 종료: {fmtTime(effEnd.hhmm)}</Text>
            <Text className="text-[13px] font-semibold mb-2 mt-4" style={{ color: theme.text.subtle, fontFamily: FF }}>변경할 종료 시각</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0 mb-2">{endOptions.map((slot) => { const active = newEndHhmm === slot; return (<TouchableOpacity key={slot} className="px-4 py-2.5 rounded-lg border mr-2 w-20 items-center" style={{ backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }} activeOpacity={0.7} onPress={() => setNewEndHhmm(slot)}><Text className="text-[14px] font-semibold" style={{ color: active ? '#fff' : theme.text.primary, fontFamily: FF }}>{fmtTime(slot)}</Text></TouchableOpacity>); })}</ScrollView>
          </View>
          <View className="flex-row p-4 gap-3">
            <TouchableOpacity className="flex-1 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: theme.bg.surfaceAlt }} onPress={onClose}><Text style={{ color: theme.text.primary, fontFamily: FF }}>취소</Text></TouchableOpacity>
            <TouchableOpacity className="flex-1 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: theme.brand.primary }} onPress={() => onSubmit({ newEndYmd: effEnd.ymd, newEndHhmm })} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold', fontFamily: FF }}>연장하기</Text>}</TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
