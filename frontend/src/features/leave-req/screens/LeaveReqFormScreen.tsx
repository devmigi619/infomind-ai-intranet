import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  useWindowDimensions,
} from 'react-native';
import {
  ChevronLeft,
  X, Users, Check, Info, Paperclip, FileText,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useUiStore } from '../../../store/uiStore';
import { useCurrentUser } from '../../auth/api';
import { useToast } from '../../../shared/hooks/useToast';
import { AppDropdown } from '../../../shared/components/AppDropdown';
import {
  useLeaveMstList,
  useLeaveDtlList,
  useCreateLeaveReq,
  useUserAprvlTmplList,
  type UserAprvlTmplDto,
  type AprvEntry,
} from '../api';
import { AprvlTmplModal } from '../components/AprvlTmplModal';
import { AprvLineEditorPanel } from '../components/AprvLineEditorPanel';
import {
  useUploadAttachments,
  type DocumentAsset,
} from '../../../features/attachment/api';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── 캘린더 ───────────────────────────────────────────────────────────────────

type DateMode = 'manual' | 'range';
const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function toYmd(y: number, m: number, d: number) {
  return `${y}${String(m + 1).padStart(2, '0')}${String(d).padStart(2, '0')}`;
}

function CalendarGrid({ dates, onChange, mode, theme }: {
  dates: string[]; onChange: (d: string[]) => void; mode: DateMode; theme: ReturnType<typeof useTheme>;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => viewMonth === 0 ? (setViewYear(y => y - 1), setViewMonth(11)) : setViewMonth(m => m - 1);
  const nextMonth = () => viewMonth === 11 ? (setViewYear(y => y + 1), setViewMonth(0)) : setViewMonth(m => m + 1);

  const handleDayPress = (day: number) => {
    const ymd = toYmd(viewYear, viewMonth, day);
    if (mode === 'manual') {
      onChange(dates.includes(ymd) ? dates.filter(d => d !== ymd) : [...dates, ymd].sort());
    } else {
      if (!rangeAnchor) { setRangeAnchor(ymd); return; }
      const [start, end] = rangeAnchor <= ymd ? [rangeAnchor, ymd] : [ymd, rangeAnchor];
      const result: string[] = [];
      const cur = new Date(+start.slice(0,4), +start.slice(4,6)-1, +start.slice(6,8));
      const last = new Date(+end.slice(0,4), +end.slice(4,6)-1, +end.slice(6,8));
      while (cur <= last) {
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 6) {
          const s = `${cur.getFullYear()}${String(cur.getMonth()+1).padStart(2,'0')}${String(cur.getDate()).padStart(2,'0')}`;
          if (!dates.includes(s)) result.push(s);
        }
        cur.setDate(cur.getDate() + 1);
      }
      onChange([...dates, ...result].sort());
      setRangeAnchor(null);
    }
  };

  const todayYmd = toYmd(today.getFullYear(), today.getMonth(), today.getDate());
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number|null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i+7));

  return (
    <View className="border rounded-xl overflow-hidden" style={{ borderColor: theme.border.default }}>
      <View className="flex-row items-center justify-between px-3 py-2.5 border-b" style={{ backgroundColor: theme.bg.surfaceMute, borderBottomColor: theme.border.subtle }}>
        <TouchableOpacity onPress={prevMonth} style={{padding:6}}><Text style={{fontSize:16,color:theme.text.muted}}>‹</Text></TouchableOpacity>
        <Text style={{fontSize:14,fontWeight:'700',color:theme.text.primary, fontFamily: WEB_FONT}}>{viewYear}년 {MONTH_NAMES[viewMonth]}</Text>
        <TouchableOpacity onPress={nextMonth} style={{padding:6}}><Text style={{fontSize:16,color:theme.text.muted}}>›</Text></TouchableOpacity>
      </View>
      <View className="flex-row" style={{ backgroundColor: theme.bg.surfaceMute }}>
        {WEEKDAY_KR.map((w,i)=>(
          <View key={w} className="flex-1 items-center py-1.5">
            <Text style={{fontSize:11,fontWeight:'600',color:i===0?'#EF4444':i===6?'#3B82F6':theme.text.muted, fontFamily: WEB_FONT}}>{w}</Text>
          </View>
        ))}
      </View>
      {rows.map((row,ri)=>(
        <View key={ri} className="flex-row">
          {row.map((day,ci)=>{
            if(!day) return <View key={ci} className="flex-1 h-[38px]"/>;
            const ymd=toYmd(viewYear,viewMonth,day);
            const isSel=dates.includes(ymd), isToday=ymd===todayYmd, isAnchor=ymd===rangeAnchor, isWE=ci===0||ci===6;
            return (
              <TouchableOpacity key={ci} className="flex-1 h-[38px] items-center justify-center" style={{backgroundColor:isSel||isAnchor?theme.brand.primary:'transparent'}} onPress={()=>handleDayPress(day)} activeOpacity={0.7}>
                <Text style={{fontSize:13,fontWeight:isSel||isAnchor||isToday?'700':'400',color:isSel||isAnchor?'#fff':isToday?theme.brand.primary:isWE?(ci===0?'#EF4444':'#3B82F6'):theme.text.primary, fontFamily: WEB_FONT}}>{day}</Text>
                {isToday&&!isSel&&<View style={{position:'absolute',bottom:4,width:4,height:4,borderRadius:2,backgroundColor:theme.brand.primary}}/>}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      {mode==='range'&&rangeAnchor&&(
        <View className="px-3 py-1.5 border-t" style={{backgroundColor:theme.brand.primaryTint, borderTopColor:theme.border.subtle}}>
          <Text style={{fontSize:12,color:theme.brand.primary, fontFamily: WEB_FONT}}>시작: {rangeAnchor.slice(0,4)}-{rangeAnchor.slice(4,6)}-{rangeAnchor.slice(6,8)} → 종료 날짜를 선택하세요</Text>
        </View>
      )}
    </View>
  );
}

// ─── 반일 시간 선택기 ──────────────────────────────────────────────────────────

type HalfDaySlot = 'am' | 'pm';

const HALF_DAY_SLOTS: { key: HalfDaySlot; label: string; range: string; st: string; end: string }[] = [
  { key: 'am', label: '오전', range: '09:00 ~ 14:00', st: '0900', end: '1400' },
  { key: 'pm', label: '오후', range: '14:00 ~ 18:00', st: '1400', end: '1800' },
];

function HalfDaySelector({ slot, onChange, theme }: {
  slot: HalfDaySlot;
  onChange: (slot: HalfDaySlot, st: string, end: string) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View className="flex-row gap-2.5">
      {HALF_DAY_SLOTS.map((s) => {
        const active = slot === s.key;
        return (
          <TouchableOpacity
            key={s.key}
            onPress={() => onChange(s.key, s.st, s.end)}
            activeOpacity={0.75}
            className="flex-1 border-[1.5px] rounded-xl py-3 items-center gap-1"
            style={{
              borderColor: active ? theme.brand.primary : theme.border.default,
              backgroundColor: active ? theme.brand.primary : theme.bg.surfaceMute,
            }}
          >
            <Text className="text-[15px] font-bold" style={{ color: active ? '#fff' : theme.text.body, fontFamily: WEB_FONT }}>
              {s.label}
            </Text>
            <Text className="text-xs" style={{ color: active ? 'rgba(255,255,255,0.85)' : theme.text.muted, fontFamily: WEB_FONT }}>
              {s.range}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function DateSelector({ dates, onChange, theme }: { dates:string[]; onChange:(d:string[])=>void; theme:ReturnType<typeof useTheme> }) {
  const [mode, setMode] = useState<DateMode>('manual');
  const fmtChip = (ymd:string) => ymd.length===8 ? `${ymd.slice(0,4)}-${ymd.slice(4,6)}-${ymd.slice(6,8)}` : ymd;
  return (
    <View className="gap-2.5">
      <View className="flex-row rounded-lg overflow-hidden border self-start" style={{ borderColor: theme.border.default }}>
        {(['manual','range'] as DateMode[]).map(m=>(
          <TouchableOpacity key={m} className="px-3.5 py-1.5" style={{ backgroundColor: mode === m ? theme.brand.primary : 'transparent' }} onPress={()=>setMode(m)}>
            <Text className={`text-[13px] ${mode === m ? 'font-semibold' : ''}`} style={{ color: mode === m ? '#fff' : theme.text.muted, fontFamily: WEB_FONT }}>{m==='manual'?'날짜 선택':'범위 선택'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text className="text-xs" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}>{mode==='manual'?'날짜를 탭하면 추가/제거됩니다':'첫 번째 날짜 → 마지막 날짜 순서로 탭하세요 (평일만 자동 선택)'}</Text>
      <CalendarGrid dates={dates} onChange={onChange} mode={mode} theme={theme}/>
      {dates.length>0&&(
        <View className="flex-row flex-wrap gap-1.5">
          {dates.map(d=>(
            <TouchableOpacity key={d} className="flex-row items-center gap-1 bg-brand-primaryTint rounded-md px-2 py-1" style={{ backgroundColor: theme.brand.primaryTint }} onPress={()=>onChange(dates.filter(x=>x!==d))}>
              <Text className="text-xs font-medium" style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}>{fmtChip(d)}</Text>
              <X size={10} color={theme.brand.primary}/>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text className="text-xs" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>총 {dates.length}일 선택됨</Text>
    </View>
  );
}

// ─── 결재선 지정 모달 ─────────────────────────────────────────────────────────

function AprvLineModal({ visible, initialAprvList, initialRefList, initialDeptRefYn,
  tmpls, currentUserId, onApply, onClose, theme,
}: {
  visible: boolean;
  initialAprvList: AprvEntry[]; initialRefList: AprvEntry[];
  initialDeptRefYn: boolean;
  tmpls: UserAprvlTmplDto[];
  currentUserId: string | undefined;
  onApply: (aprv: AprvEntry[], ref: AprvEntry[], deptRef: boolean) => void;
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const [tmplModalVisible, setTmplModalVisible] = React.useState(false);
  const { width: winW, height: winH } = useWindowDimensions();

  // 내부 상태
  const [aprvList, setAprvList] = useState<AprvEntry[]>([]);
  const [refList, setRefList] = useState<AprvEntry[]>([]);
  const [deptRefYn, setDeptRefYn] = useState(false);
  const [selectedTmplId, setSelectedTmplId] = useState<string | null>(null);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (!visible) return;
    setAprvList(initialAprvList);
    setRefList(initialRefList);
    setDeptRefYn(initialDeptRefYn);

    // 템플릿 1개 + 결재선 미설정이면 자동 적용
    if (initialAprvList.length === 0 && tmpls.length === 1) {
      const t = tmpls[0];
      setSelectedTmplId(t.aprvlId);
      setAprvList(t.aprvList.map(a => ({ aprvUserId: a.aprvUserId, aprvUserNm: a.aprvUserNm })));
      setRefList(t.refList.map(r => ({ aprvUserId: r.refUserId, aprvUserNm: r.refUserNm })));
      setDeptRefYn(t.deptRefYn === 'Y');
    } else {
      const matched = tmpls.find(t =>
        t.aprvList.length === initialAprvList.length &&
        t.aprvList.every((a, i) => a.aprvUserId === initialAprvList[i]?.aprvUserId),
      );
      setSelectedTmplId(matched?.aprvlId ?? null);
    }
  }, [visible]);

  const applyTemplate = (tmpl: UserAprvlTmplDto) => {
    if (selectedTmplId === tmpl.aprvlId) {
      setSelectedTmplId(null); setAprvList([]); setRefList([]); setDeptRefYn(false);
    } else {
      setSelectedTmplId(tmpl.aprvlId);
      setAprvList(tmpl.aprvList.map(a => ({ aprvUserId: a.aprvUserId, aprvUserNm: a.aprvUserNm })));
      setRefList(tmpl.refList.map(r => ({ aprvUserId: r.refUserId, aprvUserNm: r.refUserNm })));
      setDeptRefYn(tmpl.deptRefYn === 'Y');
    }
  };

  const modalW = Platform.OS === 'web' ? Math.min(winW * 0.92, 820) : winW;
  const modalH = Platform.OS === 'web' ? Math.min(winH * 0.88, 680) : winH * 0.9;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <View className={`flex-1 bg-black/45 justify-end ${Platform.OS === 'web' ? 'justify-center items-center' : ''}`}>
        <View
          className={`overflow-hidden ${Platform.OS === 'web' ? 'rounded-2xl' : 'rounded-t-[20px]'}`}
          style={{ backgroundColor: theme.bg.surface, width: modalW, maxHeight: modalH }}
        >

          {/* 헤더 */}
          <View className="flex-row items-center justify-between px-[18px] py-3.5 border-b" style={{ borderBottomColor: theme.border.default }}>
            <Text className="text-base font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>결재선 지정</Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => setTmplModalVisible(true)}
                className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg border"
                style={{ backgroundColor: theme.bg.surfaceMute, borderColor: theme.border.default }}
                activeOpacity={0.75}
              >
                <Info size={13} color={theme.text.body} />
                <Text className="text-xs font-semibold" style={{ color: theme.text.body, fontFamily: WEB_FONT }}>불러오기</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <X size={20} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 템플릿 카드 */}
          {tmpls.length > 0 && (
            <View className="px-3.5 py-2.5 border-b gap-1.5" style={{ borderBottomColor: theme.border.subtle }}>
              <Text className="text-[11px] font-semibold tracking-wider" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>내 결재선 템플릿</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2" style={{ paddingHorizontal: 2 }}>
                  {tmpls.map(t => {
                    const isSel = selectedTmplId === t.aprvlId;
                    return (
                      <TouchableOpacity key={t.aprvlId} onPress={() => applyTemplate(t)}
                        className="w-[130px] border-[1.5px] rounded-xl p-2.5 relative"
                        style={{ borderColor: isSel ? theme.brand.primary : theme.border.default, backgroundColor: isSel ? theme.brand.primaryTint : theme.bg.surfaceMute }}
                        activeOpacity={0.75}
                      >
                        {isSel && <View className="absolute top-1.5 right-1.5 w-[17px] h-[17px] rounded-full items-center justify-center" style={{ backgroundColor: theme.brand.primary }}><Check size={10} color="#fff" /></View>}
                        <Text className="text-xs font-bold mb-0.5" style={{ color: isSel ? theme.brand.primary : theme.text.primary, fontFamily: WEB_FONT }} numberOfLines={1}>{t.aprvlNm}</Text>
                        <Text className="text-[11px]" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
                          결재 {t.aprvList.length}명{t.refList.length > 0 ? ` · 참조 ${t.refList.length}명` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* 본문 — 조직도 + 결재자/수신참조 선택 패널 */}
          <View className="flex-1 overflow-hidden">
            <AprvLineEditorPanel
              aprvList={aprvList}
              refList={refList}
              deptRefYn={deptRefYn}
              currentUserId={currentUserId}
              onAprvListChange={(list) => { setAprvList(list); setSelectedTmplId(null); }}
              onRefListChange={(list) => { setRefList(list); setSelectedTmplId(null); }}
              onDeptRefToggle={setDeptRefYn}
              theme={theme}
            />
          </View>

          {/* 푸터 */}
          <View className="flex-row gap-2.5 p-3.5 border-t" style={{ borderTopColor: theme.border.default }}>
            <TouchableOpacity
              className="flex-1 py-3 rounded-lg items-center justify-center border"
              style={{ backgroundColor: theme.bg.surfaceMute, borderColor: theme.border.default }}
              onPress={onClose}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.body, fontFamily: WEB_FONT }}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 rounded-lg items-center justify-center"
              style={{ backgroundColor: theme.brand.primary }}
              onPress={() => onApply(aprvList, refList, deptRefYn)}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: WEB_FONT }}>적용</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 결재선 템플릿 관리 모달 (모달 위 모달) */}
      <AprvlTmplModal
        visible={tmplModalVisible}
        currentAprvList={aprvList}
        currentRefList={refList}
        currentDeptRefYn={deptRefYn}
        onApply={(newAprv, newRef, newDeptRef) => {
          setAprvList(newAprv);
          setRefList(newRef);
          setDeptRefYn(newDeptRef);
          setSelectedTmplId(null);
          setTmplModalVisible(false);
        }}
        onClose={() => setTmplModalVisible(false)}
      />
    </Modal>
  );
}

// ─── 결재선 요약 카드 ─────────────────────────────────────────────────────────

function AprvSummaryCard({ aprvList, refList, deptRefYn, onEdit, theme }: {
  aprvList: AprvEntry[]; refList: AprvEntry[]; deptRefYn: boolean;
  onEdit: () => void; theme: ReturnType<typeof useTheme>;
}) {
  const isEmpty = aprvList.length === 0;
  return (
    <TouchableOpacity onPress={onEdit} activeOpacity={0.75}
      className="border rounded-xl p-3.5 gap-2"
      style={{
        borderColor: isEmpty ? theme.border.default : theme.brand.primary,
        backgroundColor: isEmpty ? theme.bg.surfaceMute : theme.brand.primaryTint
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Users size={15} color={isEmpty ? theme.text.muted : theme.brand.primary} />
          <Text className="text-[13px] font-semibold" style={{ color: isEmpty ? theme.text.muted : theme.brand.primary, fontFamily: WEB_FONT }}>
            {isEmpty ? '결재선을 지정해주세요'
              : `결재자 ${aprvList.length}명${refList.length>0?` · 수신참조 ${refList.length}명`:''}${deptRefYn?' · 부서원 포함':''}`}
          </Text>
        </View>
        <Text className="text-xs font-semibold" style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}>{isEmpty?'지정':'편집'}</Text>
      </View>
      {!isEmpty && (
        <View className="flex-row flex-wrap gap-1">
          {aprvList.map((a, i) => (
            <View key={a.aprvUserId} className="flex-row items-center gap-1 bg-white rounded-md px-2 py-1 border" style={{ backgroundColor: theme.bg.surface, borderColor: theme.brand.primary }}>
              <Text className="text-[11px] font-bold" style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}>{i+1}</Text>
              <Text className="text-[11px]" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{a.aprvUserNm}</Text>
              {a.jbgdNm && <Text className="text-[10px]" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>({a.jbgdNm})</Text>}
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── 첨부파일 섹션 ────────────────────────────────────────────────────────────

function FileAttachSection({
  files,
  onAddFiles,
  onRemoveFile,
  theme,
}: {
  files: DocumentAsset[];
  onAddFiles: (picked: DocumentAsset[]) => void;
  onRemoveFile: (idx: number) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const handlePick = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.onchange = () => {
        const list = input.files;
        if (!list || list.length === 0) return;
        const picked: DocumentAsset[] = [];
        for (let i = 0; i < list.length; i++) {
          const f = list[i];
          picked.push({ uri: URL.createObjectURL(f), name: f.name, size: f.size, mimeType: f.type || 'application/octet-stream', file: f });
        }
        onAddFiles(picked);
      };
      input.click();
    } else {
      Alert.alert('추후 지원', '모바일 첨부 선택은 expo-document-picker 설치 후 지원 예정입니다.');
    }
  };

  return (
    <View className="gap-2">
      {files.length > 0 && (
        <View className="gap-1">
          {files.map((f, idx) => (
            <View key={idx} className="flex-row items-center gap-1.5 border rounded-[7px] px-2.5 py-[7px]" style={{ borderColor: theme.border.default, backgroundColor: theme.bg.surfaceMute }}>
              <FileText size={14} color={theme.text.muted} />
              <Text className="flex-1 text-[13px]" style={{ color: theme.text.body, fontFamily: WEB_FONT }} numberOfLines={1}>{f.name}</Text>
              {f.size != null && (
                <Text className="text-[11px]" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}>
                  {f.size < 1024 * 1024
                    ? `${(f.size / 1024).toFixed(0)} KB`
                    : `${(f.size / 1024 / 1024).toFixed(1)} MB`}
                </Text>
              )}
              <TouchableOpacity onPress={() => onRemoveFile(idx)} style={{ padding: 2 }}>
                <X size={13} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity
        className="flex-row items-center gap-1.5 border border-dashed rounded-[7px] px-3 py-2 self-start"
        style={{ borderColor: theme.border.default, backgroundColor: theme.bg.surfaceMute }}
        onPress={handlePick}
        activeOpacity={0.75}
      >
        <Paperclip size={14} color={theme.brand.primary} />
        <Text className="text-[13px] font-semibold" style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}>파일 첨부</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── 폼 행 ────────────────────────────────────────────────────────────────────

function FormRow({ label, required, children, theme }: { label:string; required?:boolean; children:React.ReactNode; theme:ReturnType<typeof useTheme> }) {
  return (
    <View className="gap-1.5">
      <Text className="text-[13px] font-semibold" style={{ color:theme.text.body, fontFamily: WEB_FONT }}>
        {label}{required && <Text style={{ color:'#EF4444' }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

// ─── 메인 폼 ─────────────────────────────────────────────────────────────────

export function LeaveReqFormScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { data: me } = useCurrentUser();
  const setActiveFullScreen = useUiStore(s => s.setActiveFullScreen);

  const [leaveCd, setLeaveCd] = useState('');
  const [leaveDtlCd, setLeaveDtlCd] = useState('');
  const [leaveRsn, setLeaveRsn] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [aprvList, setAprvList] = useState<AprvEntry[]>([]);
  const [refList, setRefList] = useState<AprvEntry[]>([]);
  const [deptRefYn, setDeptRefYn] = useState(false);
  const [aprvModalVisible, setAprvModalVisible] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<DocumentAsset[]>([]);
  const [leaveStHhmm, setLeaveStHhmm] = useState<string | null>(null);
  const [leaveEndHhmm, setLeaveEndHhmm] = useState<string | null>(null);
  const [leaveSlot, setLeaveSlot] = useState<HalfDaySlot>('am');

  const { data: mstList = [] } = useLeaveMstList();
  const { data: dtlList = [] } = useLeaveDtlList(leaveCd || null);
  const { data: tmpls = [] as UserAprvlTmplDto[] } = useUserAprvlTmplList();
  const createMutation = useCreateLeaveReq();
  const uploadMutation = useUploadAttachments();

  // 최초 진입 시 최근 템플릿(첫 번째) 자동 세팅
  const autoSeedDone = useRef(false);
  useEffect(() => {
    if (autoSeedDone.current) return;
    if (tmpls.length === 0) return;
    if (aprvList.length > 0) return; // 이미 지정된 결재선이 있으면 스킵
    const latest = tmpls[0]; // crtAt DESC 정렬 — 가장 최근
    setAprvList(latest.aprvList.map(a => ({ aprvUserId: a.aprvUserId, aprvUserNm: a.aprvUserNm })));
    setRefList(latest.refList.map(r => ({ aprvUserId: r.refUserId, aprvUserNm: r.refUserNm })));
    setDeptRefYn(latest.deptRefYn === 'Y');
    autoSeedDone.current = true;
  }, [tmpls]);

  // 자비스패널(ai-context) 드래프트 이양 — 날짜·사유는 즉시, 휴가유형은 목록 로딩 후 이름 매칭
  const leaveReqHandoff = useUiStore(s => s.leaveReqHandoff);
  useEffect(() => {
    if (!leaveReqHandoff) return;
    if (leaveReqHandoff.leaveNm && mstList.length === 0) return; // 목록 로딩 대기 후 재실행
    if (leaveReqHandoff.dates?.length) setDates(leaveReqHandoff.dates);
    if (leaveReqHandoff.reason) setLeaveRsn(leaveReqHandoff.reason);
    if (leaveReqHandoff.leaveNm) {
      const nm = leaveReqHandoff.leaveNm;
      const matched = mstList.find(m => m.useYn === 'Y' && (m.leaveNm === nm || m.leaveNm.includes(nm)));
      if (matched) setLeaveCd(matched.leaveCd);
    }
    useUiStore.getState().setLeaveReqHandoff(null); // 1회 소비
  }, [leaveReqHandoff, mstList]);

  const mstOpts = mstList.filter(m => m.useYn === 'Y').map(m => ({ value: m.leaveCd, label: m.leaveNm }));
  const dtlOpts = dtlList.filter(d => d.useYn === 'Y').map(d => ({ value: d.leaveDtlCd, label: d.leaveDtlNm ?? d.leaveDtlCd }));

  // 선택된 세부유형의 leaveSe ('H'=반일, 'F'=종일)
  const selectedDtl = dtlList.find(d => d.leaveDtlCd === leaveDtlCd);
  const isHalfDay = selectedDtl?.leaveSe === 'H';

  const isBusy = createMutation.isPending || uploadMutation.isPending;

  const handleSubmit = async () => {
    if (!leaveCd) { toast.error('휴가유형을 선택해주세요.'); return; }
    if (dates.length === 0) { toast.error('신청 날짜를 선택해주세요.'); return; }
    if (aprvList.length === 0) { toast.error('결재자를 추가해주세요.'); return; }

    // 반일 시간 선택 확인
    if (isHalfDay && (!leaveStHhmm || !leaveEndHhmm)) {
      toast.error('오전/오후를 선택해주세요.'); return;
    }

    try {
      // 첨부파일이 있으면 먼저 업로드 후 afileId 획득
      let afileId: string | null = null;
      if (pendingFiles.length > 0) {
        const uploaded = await uploadMutation.mutateAsync({ files: pendingFiles, prefix: 'LEAVE', embedEnabled: false });
        afileId = uploaded.afileId;
      }

      await createMutation.mutateAsync({
        leaveCd, leaveDtlCd: leaveDtlCd || null, leaveRsn,
        deptRefYn: deptRefYn ? 'Y' : 'N',
        afileId,
        leaveStHhmm:  isHalfDay ? leaveStHhmm  : null,
        leaveEndHhmm: isHalfDay ? leaveEndHhmm : null,
        dates,
        aprvList: aprvList.map(a => ({ aprvUserId: a.aprvUserId })),
        refList: refList.map(r => r.aprvUserId),
      });
      toast.success('휴가신청이 완료되었습니다.');
      setActiveFullScreen('leave-req' as any);
    } catch {
      toast.error('신청 중 오류가 발생했습니다.');
    }
  };

  const { width } = useWindowDimensions();
  const maxWidth = Math.min(640, width - 32);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg.surface }}>
      <View className="flex-row items-center px-4 py-3 border-b" style={{ borderBottomColor: theme.border.default }}>
        <TouchableOpacity style={{ padding:4, marginRight:4 }} onPress={() => setActiveFullScreen('leave-req' as any)}>
          <ChevronLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text className="text-[17px] font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>휴가신청</Text>
      </View>

      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding: 20, gap: 20, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <FormRow label="신청 날짜" required theme={theme}>
          <DateSelector dates={dates} onChange={setDates} theme={theme} />
        </FormRow>

        <FormRow label="휴가유형" required theme={theme}>
          <AppDropdown value={leaveCd} onChange={cd => { setLeaveCd(cd); setLeaveDtlCd(''); }}
            options={mstOpts} placeholder="휴가유형 선택" />
        </FormRow>

        {dtlOpts.length > 0 && (
          <FormRow label="세부유형" theme={theme}>
            <AppDropdown
              value={leaveDtlCd}
              onChange={(v) => {
                setLeaveDtlCd(v);
                const dtl = dtlList.find(d => d.leaveDtlCd === v);
                if (dtl?.leaveSe === 'H') {
                  // 오전 기본값 세팅
                  setLeaveSlot('am');
                  setLeaveStHhmm('0900');
                  setLeaveEndHhmm('1400');
                } else {
                  setLeaveStHhmm(null);
                  setLeaveEndHhmm(null);
                }
              }}
              options={dtlOpts}
              placeholder="세부유형 선택"
              disabled={!leaveCd}
            />
            {selectedDtl && selectedDtl.useAvlDcnt != null && (
              <Text style={{ fontSize: 12, color: theme.text.muted, fontFamily: WEB_FONT }}>
                사용 가능 일수:{' '}
                <Text style={{ fontWeight: '700', color: theme.brand.primary }}>
                  {selectedDtl.useAvlDcnt % 1 === 0
                    ? selectedDtl.useAvlDcnt
                    : selectedDtl.useAvlDcnt.toFixed(1)}일
                </Text>
              </Text>
            )}
          </FormRow>
        )}

        {isHalfDay && (
          <FormRow label="오전 / 오후" required theme={theme}>
            <HalfDaySelector
              slot={leaveSlot}
              onChange={(slot, st, end) => {
                setLeaveSlot(slot);
                setLeaveStHhmm(st);
                setLeaveEndHhmm(end);
              }}
              theme={theme}
            />
          </FormRow>
        )}

        <FormRow label="사유" theme={theme}>
          <TextInput
            className="border rounded-lg px-3 py-2.5 text-sm min-h-[80px]"
            style={{ borderColor: theme.border.default, color: theme.text.primary, textAlignVertical: 'top', fontFamily: WEB_FONT }}
            value={leaveRsn}
            onChangeText={setLeaveRsn}
            placeholder="휴가 사유를 입력하세요"
            placeholderTextColor={theme.text.subtle}
            multiline
            numberOfLines={3}
          />
        </FormRow>

        <FormRow label="결재선 설정" required theme={theme}>
          <AprvSummaryCard aprvList={aprvList} refList={refList} deptRefYn={deptRefYn}
            onEdit={() => setAprvModalVisible(true)} theme={theme} />
        </FormRow>

        <FormRow label="첨부파일" theme={theme}>
          <FileAttachSection
            files={pendingFiles}
            onAddFiles={(picked) => setPendingFiles(prev => [...prev, ...picked])}
            onRemoveFile={(idx) => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}
            theme={theme}
          />
        </FormRow>

        <View className="flex-row justify-end gap-2.5 mt-2 pb-5">
          <TouchableOpacity className="px-5 py-2.5 rounded-lg items-center justify-center border" style={{ backgroundColor: theme.bg.surfaceMute, borderColor: theme.border.default, minWidth: 80 }} onPress={() => setActiveFullScreen('leave-req' as any)}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.body, fontFamily: WEB_FONT }}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-5 py-2.5 rounded-lg items-center justify-center" style={{ backgroundColor: theme.brand.primary, minWidth: 80, opacity: isBusy ? 0.6 : 1 }}
            onPress={handleSubmit} disabled={isBusy}>
            {isBusy
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: WEB_FONT }}>신청하기</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AprvLineModal
        visible={aprvModalVisible}
        initialAprvList={aprvList} initialRefList={refList}
        initialDeptRefYn={deptRefYn}
        tmpls={tmpls}
        currentUserId={(me as any)?.userId}
        onApply={(aprv, ref, dept) => { setAprvList(aprv); setRefList(ref); setDeptRefYn(dept); setAprvModalVisible(false); }}
        onClose={() => setAprvModalVisible(false)}
        theme={theme}
      />
    </View>
  );
}
