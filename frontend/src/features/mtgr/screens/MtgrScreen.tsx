import React, { useState, useCallback } from 'react';
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
  type ExtendMtgrReservationRequest,
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

  const s = makeStyles(theme);

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
    <View style={s.root}>
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
          onPress={() => openForm(selectedMtgrId || mtgrs[0]?.mtgrId || '', selectedDate, '0900')}
        >
          <Plus size={14} color="#fff" />
          <Text style={s.addBtnText}>예약하기</Text>
        </TouchableOpacity>
      </View>

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

      {mode === 'grid' && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={s.vehChipScroll}
          contentContainerStyle={s.vehChipContent}
        >
          {mtgrLoading ? (
            <ActivityIndicator size="small" color={theme.brand.primary} style={{ marginLeft: 8 }} />
          ) : (
            mtgrs.map((v) => {
              const active = v.mtgrId === selectedMtgrId;
              return (
                <TouchableOpacity
                  key={v.mtgrId}
                  style={[
                    s.vehChip,
                    {
                      backgroundColor: active ? theme.brand.primary : theme.bg.surface,
                      borderColor: active ? theme.brand.primary : theme.border.default,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedMtgrId(v.mtgrId)}
                >
                  <Building2 size={12} color={active ? '#fff' : theme.text.muted} />
                  <Text style={[s.vehChipName, { color: active ? '#fff' : theme.text.primary }]}>
                    {v.mtgrNm}
                  </Text>
                  {v.mtgrSe === 'D' && (
                    <Text style={[s.vehChipNo, { color: active ? 'rgba(255,255,255,0.75)' : theme.brand.primary }]}>
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
        onSubmit={async (req) => {
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
  const s = makeStyles(theme);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={theme.brand.primary} /></View>;
  }
  if (!mtgr) {
    return (
      <View style={s.center}>
        <Building2 size={40} color={theme.text.subtle} />
        <Text style={[s.emptyText, { color: theme.text.muted }]}>등록된 회의실이 없습니다.</Text>
      </View>
    );
  }

  const occupiedSet = new Set<string>();
  for (const rsv of reservations) {
    const stIdx  = HALF_SLOT_HHMM.indexOf(rsv.rsvStHhmm);
    const endIdx = HALF_SLOT_HHMM.indexOf(rsv.rsvEndHhmm);
    for (let i = stIdx; i < endIdx; i++) {
      if (i >= 0) occupiedSet.add(HALF_SLOT_HHMM[i]);
    }
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator>
      <View style={[s.tlHeader, { backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.subtle }]}>
        <Building2 size={14} color={theme.brand.primary} />
        <Text style={[s.tlVehNm, { color: theme.text.primary }]}>{mtgr.mtgrNm}</Text>
        <Text style={[s.tlVehNo, { color: theme.text.muted }]}>{mtgr.mtgrPlc}</Text>
      </View>

      <View style={[s.tlBody, { height: TOTAL_HEIGHT }]}>
        {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => i + HOUR_START).map((h) => {
          const top = (h - HOUR_START) * HOUR_HEIGHT;
          return (
            <View key={h} style={[s.hourLine, { top }]}>
              <Text style={[s.hourLabel, { color: theme.text.subtle }]}>{String(h).padStart(2, '0')}:00</Text>
              <View style={[s.hourRule, { backgroundColor: theme.border.default }]} />
            </View>
          );
        })}

        {Array.from({ length: TOTAL_HOURS }, (_, i) => i + HOUR_START).map((h) => {
          const top = (h - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2;
          return (
            <View key={`half-${h}`} style={[s.halfLine, { top }]}>
              <Text style={[s.halfLabel, { color: theme.text.subtle }]}>{String(h).padStart(2, '0')}:30</Text>
              <View style={[s.halfRule, { borderColor: theme.border.subtle }]} />
            </View>
          );
        })}

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

        {reservations.map((rsv) => {
          const top    = toTop(rsv.rsvStHhmm);
          const height = toBlockH(rsv.rsvStHhmm, rsv.rsvEndHhmm);
          const isMine = rsv.mine;
          return (
            <TouchableOpacity
              key={`${rsv.mtgrId}-${rsv.rsvSn}`}
              activeOpacity={0.8}
              style={[
                s.rsvBlock,
                {
                  top, height,
                  left: TIME_LABEL_W + 4,
                  backgroundColor: isMine ? theme.brand.primary : theme.bg.surfaceAlt,
                  borderColor:     isMine ? theme.brand.primary : theme.border.default,
                },
              ]}
              onPress={() => {
                if (isMine) onMinePress(rsv);
                else {
                  Alert.alert('예약 정보', `${rsv.userNm}\n${fmtTime(rsv.rsvStHhmm)} ~ ${fmtTime(rsv.rsvEndHhmm)}${rsv.rmk ? `\n${rsv.rmk}` : ''}`);
                }
              }}
            >
              <Text style={[s.rsvBlockTitle, { color: isMine ? '#fff' : theme.text.primary }]} numberOfLines={1}>{rsv.userNm}</Text>
              <Text style={[s.rsvBlockTime, { color: isMine ? 'rgba(255,255,255,0.85)' : theme.text.muted }]}>{fmtTime(rsv.rsvStHhmm)} ~ {fmtTime(rsv.rsvEndHhmm)}</Text>
              {rsv.rmk ? <Text style={[s.rsvBlockRmk, { color: isMine ? 'rgba(255,255,255,0.75)' : theme.text.muted }]} numberOfLines={1}>{rsv.rmk}</Text> : null}
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
  const s = makeStyles(theme);
  const mtgrMap = Object.fromEntries(mtgrs.map((v) => [v.mtgrId, v]));

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={theme.brand.primary} /></View>;
  if (reservations.length === 0) {
    return (
      <View style={s.center}>
        <Building2 size={40} color={theme.text.subtle} />
        <Text style={[s.emptyText, { color: theme.text.muted }]}>{fmtDate(selectedDate)} 내 예약이 없습니다.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {reservations.map((rsv) => {
        const mtgr = mtgrMap[rsv.mtgrId];
        const dur = (+rsv.rsvEndHhmm.slice(0, 2) - +rsv.rsvStHhmm.slice(0, 2)) * 60 + (+rsv.rsvEndHhmm.slice(2, 4) - +rsv.rsvStHhmm.slice(2, 4));
        const extended = rsv.extYn === 'Y';

        return (
          <View key={`${rsv.mtgrId}-${rsv.rsvSn}`} style={[s.myCard, { backgroundColor: theme.bg.surface, borderColor: theme.brand.primary, marginBottom: 10 }]}>
            <View style={[s.myCardAccent, { backgroundColor: theme.brand.primary }]} />
            <View style={{ flex: 1, padding: 12, gap: 4 }}>
              <View style={s.myCardRow}>
                <Building2 size={13} color={theme.brand.primary} />
                <Text style={[s.myCardVeh, { color: theme.text.primary, flex: 1 }]} numberOfLines={1}>{mtgr ? `${mtgr.mtgrNm} (${mtgr.mtgrPlc})` : rsv.mtgrId}</Text>
                {extended && (
                  <View style={[s.statusBadge, { backgroundColor: '#FEF3C7' }]}><Text style={[s.statusBadgeText, { color: '#D97706' }]}>연장됨</Text></View>
                )}
              </View>
              <View style={s.myCardTimeRow}>
                <Text style={[s.myCardTime, { color: theme.text.primary }]}>{fmtTime(rsv.rsvStHhmm)} ~ {fmtTime(rsv.rsvEndHhmm)}</Text>
                <View style={[s.durBadge, { backgroundColor: theme.brand.primaryTint }]}><Text style={[s.durText, { color: theme.brand.primary }]}>{dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? ` ${dur % 60}m` : ''}` : `${dur}m`}</Text></View>
              </View>
              {rsv.rmk ? <Text style={[s.myCardRmk, { color: theme.text.muted }]} numberOfLines={2}>{rsv.rmk}</Text> : null}
              <View style={s.myCardBtns}>
                <TouchableOpacity style={[s.actionBtn, { borderColor: theme.brand.primary }]} activeOpacity={0.7} onPress={() => onExtend(rsv)}><Text style={[s.actionBtnText, { color: theme.brand.primary }]}>연장</Text></TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { borderColor: '#EF4444' }]} activeOpacity={0.7} onPress={() => onCancel(rsv)}><Text style={[s.actionBtnText, { color: '#EF4444' }]}>취소</Text></TouchableOpacity>
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
  const s = makeStyles(theme);
  const dateOptions: string[] = [];
  let cur = todayYmd;
  while (cur <= maxYmd) { dateOptions.push(cur); cur = addDays(cur, 1); }
  const endOptions = getEndOptions(formStartHhmm);
  const safeEnd = endOptions.includes(formEndHhmm) ? formEndHhmm : endOptions[0] ?? formEndHhmm;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <TouchableOpacity style={s.backRow} onPress={onBack} activeOpacity={0.7}><ArrowLeft size={16} color={theme.text.muted} /><Text style={[s.backText, { color: theme.text.muted }]}>뒤로</Text></TouchableOpacity>
      <Text style={[s.formTitle, { color: theme.text.primary }]}>회의실 예약</Text>
      <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>회의실</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>{mtgrs.map((v) => { const active = formMtgrId === v.mtgrId; return (<TouchableOpacity key={v.mtgrId} style={[s.chip, { backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }]} activeOpacity={0.7} onPress={() => onMtgrChange(v.mtgrId)}><Text style={[s.chipText, { color: active ? '#fff' : theme.text.primary }]}>{v.mtgrNm} <Text style={{ opacity: 0.7 }}>{v.mtgrPlc}</Text></Text></TouchableOpacity>); })}</ScrollView>
      <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>날짜</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>{dateOptions.map((d) => { const active = formDate === d; return (<TouchableOpacity key={d} style={[s.chip, { backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }]} activeOpacity={0.7} onPress={() => onDateChange(d)}><Text style={[s.chipText, { color: active ? '#fff' : theme.text.primary }]}>{fmtDate(d)}{d === todayYmd ? ' (오늘)' : ''}</Text></TouchableOpacity>); })}</ScrollView>
      <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>시작 시각</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>{HALF_SLOT_HHMM.slice(0, -1).map((slot) => { const active = formStartHhmm === slot; return (<TouchableOpacity key={slot} style={[s.chip, s.chipTime, { backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }]} activeOpacity={0.7} onPress={() => { onStartChange(slot); const newEnd = getEndOptions(slot); if (!newEnd.includes(safeEnd)) onEndChange(newEnd[1] ?? newEnd[0]); }}><Text style={[s.chipText, { color: active ? '#fff' : theme.text.primary }]}>{fmtTime(slot)}</Text></TouchableOpacity>); })}</ScrollView>
      <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>종료 시각</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>{endOptions.map((slot) => { const active = safeEnd === slot; return (<TouchableOpacity key={slot} style={[s.chip, s.chipTime, { backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }]} activeOpacity={0.7} onPress={() => onEndChange(slot)}><Text style={[s.chipText, { color: active ? '#fff' : theme.text.primary }]}>{fmtTime(slot)}</Text></TouchableOpacity>); })}</ScrollView>
      <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>회의 목적</Text>
      <TextInput style={[s.input, { backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.default, color: theme.text.primary }]} placeholder="회의 목적을 입력해주세요" placeholderTextColor={theme.text.muted} value={formRmk} onChangeText={onRmkChange} multiline numberOfLines={3} />
      <TouchableOpacity style={[s.submitBtn, { backgroundColor: theme.brand.primary }, loading && { opacity: 0.7 }]} activeOpacity={0.7} onPress={onSubmit} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>예약 신청하기</Text>}</TouchableOpacity>
    </ScrollView>
  );
}

// ─── ExtendModal ──────────────────────────────────────────────────────

function ExtendModal({ visible, reservation, maxYmd, loading, onClose, onSubmit, theme }: any) {
  const s = makeStyles(theme);
  const [newEndHhmm, setNewEndHhmm] = useState('');
  React.useEffect(() => { if (reservation) setNewEndHhmm(getEndOptions(reservation.rsvEndHhmm)[1] ?? getEndOptions(reservation.rsvEndHhmm)[0] ?? ''); }, [reservation]);
  if (!reservation) return null;
  const endOptions = getEndOptions(reservation.rsvEndHhmm);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: theme.bg.surface }]}>
          <View style={s.modalHeader}><Text style={[s.modalTitle, { color: theme.text.primary }]}>예약 연장</Text><TouchableOpacity onPress={onClose}><X size={20} color={theme.text.muted} /></TouchableOpacity></View>
          <View style={s.modalBody}>
            <Text style={[s.modalInfo, { color: theme.text.subtle }]}>현재 종료: {fmtTime(reservation.rsvEndHhmm)}</Text>
            <Text style={[s.fieldLabel, { color: theme.text.subtle }]}>변경할 종료 시각</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>{endOptions.map((slot) => { const active = newEndHhmm === slot; return (<TouchableOpacity key={slot} style={[s.chip, s.chipTime, { backgroundColor: active ? theme.brand.primary : theme.bg.surfaceAlt, borderColor: active ? theme.brand.primary : theme.border.default }]} activeOpacity={0.7} onPress={() => setNewEndHhmm(slot)}><Text style={[s.chipText, { color: active ? '#fff' : theme.text.primary }]}>{fmtTime(slot)}</Text></TouchableOpacity>); })}</ScrollView>
          </View>
          <View style={s.modalFooter}><TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.bg.surfaceAlt }]} onPress={onClose}><Text style={{ color: theme.text.primary }}>취소</Text></TouchableOpacity><TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.brand.primary }]} onPress={() => onSubmit({ newEndYmd: reservation.rsvEndYmd, newEndHhmm })} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>연장하기</Text>}</TouchableOpacity></View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────

const makeStyles = (theme: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56, borderBottomWidth: 1, borderBottomColor: theme.border.subtle, backgroundColor: theme.bg.surface },
  tabs: { flexDirection: 'row', gap: 16 },
  tab: { height: 56, justifyContent: 'center', paddingHorizontal: 4 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: theme.brand.primary },
  tabText: { fontSize: 15, color: theme.text.muted, fontWeight: '500' },
  tabTextActive: { color: theme.brand.primary, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.brand.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: theme.bg.surface, gap: 20 },
  navArrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  navDisabled: { opacity: 0.3 },
  dateCenter: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  dateText: { fontSize: 17, fontWeight: '700', color: theme.text.primary },
  todayBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  todayBadgeText: { fontSize: 11, fontWeight: '700' },
  vehChipScroll: { flexGrow: 0, paddingVertical: 10, backgroundColor: theme.bg.surface, borderBottomWidth: 1, borderBottomColor: theme.border.subtle },
  vehChipContent: { paddingHorizontal: 16, gap: 8 },
  vehChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 6 },
  vehChipName: { fontSize: 13, fontWeight: '600' },
  vehChipNo: { fontSize: 11, fontWeight: '500' },
  tlHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  tlVehNm: { fontSize: 15, fontWeight: '700' },
  tlVehNo: { fontSize: 13 },
  tlBody: { width: '100%', position: 'relative' },
  hourLine: { position: 'absolute', left: 0, right: 0, height: 1, flexDirection: 'row', alignItems: 'center' },
  hourLabel: { width: TIME_LABEL_W, fontSize: 11, textAlign: 'center' },
  hourRule: { flex: 1, height: 1 },
  halfLine: { position: 'absolute', left: 0, right: 0, height: 1, flexDirection: 'row', alignItems: 'center' },
  halfLabel: { width: TIME_LABEL_W, fontSize: 10, textAlign: 'center', opacity: 0.5 },
  halfRule: { flex: 1, borderTopWidth: 1, borderStyle: 'dashed' },
  emptySlotTap: { position: 'absolute', right: 0, zIndex: 1 },
  rsvBlock: { position: 'absolute', right: 12, borderRadius: 6, borderWidth: 1, padding: 8, zIndex: 10, justifyContent: 'center' },
  rsvBlockTitle: { fontSize: 13, fontWeight: '700' },
  rsvBlockTime: { fontSize: 11, marginTop: 2 },
  rsvBlockRmk: { fontSize: 11, marginTop: 2, opacity: 0.8 },
  myCard: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  myCardAccent: { width: 4 },
  myCardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  myCardVeh: { fontSize: 15, fontWeight: '700' },
  myCardTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  myCardTime: { fontSize: 14, fontWeight: '600' },
  durBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  durText: { fontSize: 11, fontWeight: '700' },
  myCardRmk: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  myCardBtns: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 15, fontWeight: '500' },
  formTitle: { fontSize: 24, fontWeight: '800', marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  chipScroll: { flexGrow: 0, marginBottom: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginRight: 8 },
  chipTime: { width: 80, alignItems: 'center' },
  chipText: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 100, textAlignVertical: 'top' },
  submitBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 20 },
  modalInfo: { fontSize: 14, marginBottom: 12 },
  modalFooter: { flexDirection: 'row', padding: 16, gap: 12 },
  modalBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
