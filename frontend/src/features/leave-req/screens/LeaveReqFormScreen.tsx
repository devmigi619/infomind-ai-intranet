import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
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

// ─── 조직도 트리 유틸 ─────────────────────────────────────────────────────────



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
    <View style={{borderWidth:1,borderColor:theme.border.default,borderRadius:10,overflow:'hidden'}}>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,paddingVertical:10,backgroundColor:theme.bg.surfaceMute,borderBottomWidth:1,borderBottomColor:theme.border.subtle}}>
        <TouchableOpacity onPress={prevMonth} style={{padding:6}}><Text style={{fontSize:16,color:theme.text.muted}}>‹</Text></TouchableOpacity>
        <Text style={{fontSize:14,fontWeight:'700',color:theme.text.primary}}>{viewYear}년 {MONTH_NAMES[viewMonth]}</Text>
        <TouchableOpacity onPress={nextMonth} style={{padding:6}}><Text style={{fontSize:16,color:theme.text.muted}}>›</Text></TouchableOpacity>
      </View>
      <View style={{flexDirection:'row',backgroundColor:theme.bg.surfaceMute}}>
        {WEEKDAY_KR.map((w,i)=>(
          <View key={w} style={{flex:1,alignItems:'center',paddingVertical:6}}>
            <Text style={{fontSize:11,fontWeight:'600',color:i===0?'#EF4444':i===6?'#3B82F6':theme.text.muted}}>{w}</Text>
          </View>
        ))}
      </View>
      {rows.map((row,ri)=>(
        <View key={ri} style={{flexDirection:'row'}}>
          {row.map((day,ci)=>{
            if(!day) return <View key={ci} style={{flex:1,height:38}}/>;
            const ymd=toYmd(viewYear,viewMonth,day);
            const isSel=dates.includes(ymd), isToday=ymd===todayYmd, isAnchor=ymd===rangeAnchor, isWE=ci===0||ci===6;
            return (
              <TouchableOpacity key={ci} style={{flex:1,height:38,alignItems:'center',justifyContent:'center',backgroundColor:isSel||isAnchor?theme.brand.primary:'transparent'}} onPress={()=>handleDayPress(day)} activeOpacity={0.7}>
                <Text style={{fontSize:13,fontWeight:isSel||isAnchor||isToday?'700':'400',color:isSel||isAnchor?'#fff':isToday?theme.brand.primary:isWE?(ci===0?'#EF4444':'#3B82F6'):theme.text.primary}}>{day}</Text>
                {isToday&&!isSel&&<View style={{position:'absolute',bottom:4,width:4,height:4,borderRadius:2,backgroundColor:theme.brand.primary}}/>}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      {mode==='range'&&rangeAnchor&&(
        <View style={{paddingHorizontal:12,paddingVertical:6,backgroundColor:theme.brand.primaryTint,borderTopWidth:1,borderTopColor:theme.border.subtle}}>
          <Text style={{fontSize:12,color:theme.brand.primary}}>시작: {rangeAnchor.slice(0,4)}-{rangeAnchor.slice(4,6)}-{rangeAnchor.slice(6,8)} → 종료 날짜를 선택하세요</Text>
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

/**
 * 오전/오후 버튼 선택기.
 * 선택하면 시작·종료 시분이 고정 세팅되고 직접 수정 불가.
 */
function HalfDaySelector({ slot, onChange, theme }: {
  slot: HalfDaySlot;
  onChange: (slot: HalfDaySlot, st: string, end: string) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={hds.row}>
      {HALF_DAY_SLOTS.map((s) => {
        const active = slot === s.key;
        return (
          <TouchableOpacity
            key={s.key}
            onPress={() => onChange(s.key, s.st, s.end)}
            activeOpacity={0.75}
            style={[
              hds.btn,
              { borderColor: active ? theme.brand.primary : theme.border.default,
                backgroundColor: active ? theme.brand.primary : theme.bg.surfaceMute },
            ]}
          >
            <Text style={[hds.btnLabel, { color: active ? '#fff' : theme.text.body }]}>
              {s.label}
            </Text>
            <Text style={[hds.btnRange, { color: active ? 'rgba(255,255,255,0.85)' : theme.text.muted }]}>
              {s.range}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const hds = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center', gap: 4 },
  btnLabel: { fontSize: 15, fontWeight: '700' },
  btnRange: { fontSize: 12 },
});

function DateSelector({ dates, onChange, theme }: { dates:string[]; onChange:(d:string[])=>void; theme:ReturnType<typeof useTheme> }) {
  const [mode, setMode] = useState<DateMode>('manual');
  const fmtChip = (ymd:string) => ymd.length===8 ? `${ymd.slice(0,4)}-${ymd.slice(4,6)}-${ymd.slice(6,8)}` : ymd;
  return (
    <View style={{gap:10}}>
      <View style={{flexDirection:'row',borderRadius:8,overflow:'hidden',borderWidth:1,borderColor:theme.border.default,alignSelf:'flex-start'}}>
        {(['manual','range'] as DateMode[]).map(m=>(
          <TouchableOpacity key={m} style={{paddingHorizontal:14,paddingVertical:6,backgroundColor:mode===m?theme.brand.primary:'transparent'}} onPress={()=>setMode(m)}>
            <Text style={{fontSize:13,color:mode===m?'#fff':theme.text.muted,fontWeight:mode===m?'600':'400'}}>{m==='manual'?'날짜 선택':'범위 선택'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={{fontSize:12,color:theme.text.subtle}}>{mode==='manual'?'날짜를 탭하면 추가/제거됩니다':'첫 번째 날짜 → 마지막 날짜 순서로 탭하세요 (평일만 자동 선택)'}</Text>
      <CalendarGrid dates={dates} onChange={onChange} mode={mode} theme={theme}/>
      {dates.length>0&&(
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
          {dates.map(d=>(
            <TouchableOpacity key={d} style={{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:theme.brand.primaryTint,borderRadius:6,paddingHorizontal:8,paddingVertical:4}} onPress={()=>onChange(dates.filter(x=>x!==d))}>
              <Text style={{fontSize:12,color:theme.brand.primary,fontWeight:'500'}}>{fmtChip(d)}</Text>
              <X size={10} color={theme.brand.primary}/>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text style={{fontSize:12,color:theme.text.muted}}>총 {dates.length}일 선택됨</Text>
    </View>
  );
}

// ─── (OrgUserRow / DeptNode / OrgTreePanel / SelectionPanel / MobileViewTabs)
// → AprvLineEditorPanel.tsx 로 추출됨

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
      <View style={[ms.overlay, Platform.OS === 'web' && ms.overlayWeb]}>
        <View style={[
          ms.sheet,
          { backgroundColor: theme.bg.surface, width: modalW, maxHeight: modalH },
          Platform.OS === 'web' ? ms.sheetWeb : ms.sheetMobile,
        ]}>

          {/* 헤더 */}
          <View style={[ms.header, { borderBottomColor: theme.border.default }]}>
            <Text style={[ms.headerTitle, { color: theme.text.primary }]}>결재선 지정</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setTmplModalVisible(true)}
                style={[ms.tmplLoadBtn, { backgroundColor: theme.bg.surfaceMute, borderColor: theme.border.default }]}
                activeOpacity={0.75}
              >
                <Info size={13} color={theme.text.body} />
                <Text style={[ms.tmplLoadTxt, { color: theme.text.body }]}>불러오기</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <X size={20} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 템플릿 카드 */}
          {tmpls.length > 0 && (
            <View style={[ms.tmplSection, { borderBottomColor: theme.border.subtle }]}>
              <Text style={[ms.tmplLabel, { color: theme.text.muted }]}>내 결재선 템플릿</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2 }}>
                  {tmpls.map(t => {
                    const isSel = selectedTmplId === t.aprvlId;
                    return (
                      <TouchableOpacity key={t.aprvlId} onPress={() => applyTemplate(t)}
                        style={[ms.tmplCard, { borderColor: isSel ? theme.brand.primary : theme.border.default, backgroundColor: isSel ? theme.brand.primaryTint : theme.bg.surfaceMute }]}
                        activeOpacity={0.75}
                      >
                        {isSel && <View style={[ms.tmplCheck, { backgroundColor: theme.brand.primary }]}><Check size={10} color="#fff" /></View>}
                        <Text style={[ms.tmplNm, { color: isSel ? theme.brand.primary : theme.text.primary }]}>{t.aprvlNm}</Text>
                        <Text style={[ms.tmplMeta, { color: theme.text.muted }]}>
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
          <View style={ms.body}>
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
          <View style={[ms.footer, { borderTopColor: theme.border.default }]}>
            <TouchableOpacity
              style={[ms.footerBtn, { backgroundColor: theme.bg.surfaceMute, borderWidth: 1, borderColor: theme.border.default }]}
              onPress={onClose}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.body }}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ms.footerBtn, { backgroundColor: theme.brand.primary }]}
              onPress={() => onApply(aprvList, refList, deptRefYn)}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>적용</Text>
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

const ms = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'flex-end' },
  overlayWeb: { justifyContent:'center', alignItems:'center' },
  sheet: { overflow:'hidden' },
  sheetWeb: { borderRadius:16 },
  sheetMobile: { borderTopLeftRadius:20, borderTopRightRadius:20 },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:18, paddingVertical:14, borderBottomWidth:1 },
  headerTitle: { fontSize:16, fontWeight:'700' },
  tmplSection: { paddingHorizontal:14, paddingVertical:10, borderBottomWidth:1, gap:6 },
  tmplLabel: { fontSize:11, fontWeight:'600', letterSpacing:0.4 },
  tmplCard: { width:130, borderWidth:1.5, borderRadius:10, padding:10, position:'relative' },
  tmplCheck: { position:'absolute', top:7, right:7, width:17, height:17, borderRadius:9, alignItems:'center', justifyContent:'center' },
  tmplNm: { fontSize:12, fontWeight:'700', marginBottom:2 },
  tmplMeta: { fontSize:11 },
  body: { flex:1, overflow:'hidden' },
  footer: { flexDirection:'row', gap:10, padding:14, borderTopWidth:1 },
  footerBtn: { flex:1, paddingVertical:11, borderRadius:10, alignItems:'center', justifyContent:'center' },
  tmplLoadBtn: { flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:10, paddingVertical:6, borderRadius:7, borderWidth:1 },
  tmplLoadTxt: { fontSize:12, fontWeight:'600' },
});

// ─── 결재선 요약 카드 ─────────────────────────────────────────────────────────

function AprvSummaryCard({ aprvList, refList, deptRefYn, onEdit, theme }: {
  aprvList: AprvEntry[]; refList: AprvEntry[]; deptRefYn: boolean;
  onEdit: () => void; theme: ReturnType<typeof useTheme>;
}) {
  const isEmpty = aprvList.length === 0;
  return (
    <TouchableOpacity onPress={onEdit} activeOpacity={0.75}
      style={{ borderWidth:1, borderColor:isEmpty?theme.border.default:theme.brand.primary, borderRadius:10, padding:14, gap:8, backgroundColor:isEmpty?theme.bg.surfaceMute:theme.brand.primaryTint }}
    >
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
          <Users size={15} color={isEmpty ? theme.text.muted : theme.brand.primary} />
          <Text style={{ fontSize:13, fontWeight:'600', color:isEmpty?theme.text.muted:theme.brand.primary }}>
            {isEmpty ? '결재선을 지정해주세요'
              : `결재자 ${aprvList.length}명${refList.length>0?` · 수신참조 ${refList.length}명`:''}${deptRefYn?' · 부서원 포함':''}`}
          </Text>
        </View>
        <Text style={{ fontSize:12, color:theme.brand.primary, fontWeight:'600' }}>{isEmpty?'지정':'편집'}</Text>
      </View>
      {!isEmpty && (
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:4 }}>
          {aprvList.map((a, i) => (
            <View key={a.aprvUserId} style={{ flexDirection:'row', alignItems:'center', gap:3, backgroundColor:theme.bg.surface, borderRadius:5, paddingHorizontal:7, paddingVertical:3, borderWidth:1, borderColor:theme.brand.primary }}>
              <Text style={{ fontSize:11, color:theme.brand.primary, fontWeight:'600' }}>{i+1}</Text>
              <Text style={{ fontSize:11, color:theme.text.primary }}>{a.aprvUserNm}</Text>
              {a.jbgdNm && <Text style={{ fontSize:10, color:theme.text.muted }}>({a.jbgdNm})</Text>}
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
    <View style={{ gap: 8 }}>
      {files.length > 0 && (
        <View style={{ gap: 4 }}>
          {files.map((f, idx) => (
            <View key={idx} style={[fas.fileRow, { borderColor: theme.border.default, backgroundColor: theme.bg.surfaceMute }]}>
              <FileText size={14} color={theme.text.muted} />
              <Text style={[fas.fileName, { color: theme.text.body }]} numberOfLines={1}>{f.name}</Text>
              {f.size != null && (
                <Text style={[fas.fileSize, { color: theme.text.subtle }]}>
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
        style={[fas.pickBtn, { borderColor: theme.border.default, backgroundColor: theme.bg.surfaceMute }]}
        onPress={handlePick}
        activeOpacity={0.75}
      >
        <Paperclip size={14} color={theme.brand.primary} />
        <Text style={[fas.pickBtnText, { color: theme.brand.primary }]}>파일 첨부</Text>
      </TouchableOpacity>
    </View>
  );
}

const fas = StyleSheet.create({
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7 },
  fileName: { flex: 1, fontSize: 13 },
  fileSize: { fontSize: 11 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  pickBtnText: { fontSize: 13, fontWeight: '600' },
});

// ─── 폼 행 ────────────────────────────────────────────────────────────────────

function FormRow({ label, required, children, theme }: { label:string; required?:boolean; children:React.ReactNode; theme:ReturnType<typeof useTheme> }) {
  return (
    <View style={{ gap:6 }}>
      <Text style={{ fontSize:13, fontWeight:'600', color:theme.text.body }}>
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

  const s = makeFormStyles(theme);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={{ padding:4, marginRight:4 }} onPress={() => setActiveFullScreen('leave-req' as any)}>
          <ChevronLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>휴가신청</Text>
      </View>

      <ScrollView style={{ flex:1 }} contentContainerStyle={s.form}>
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
              <Text style={{ fontSize: 12, color: theme.text.muted }}>
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
          <TextInput style={s.textArea} value={leaveRsn} onChangeText={setLeaveRsn}
            placeholder="휴가 사유를 입력하세요" placeholderTextColor={theme.text.subtle}
            multiline numberOfLines={3} />
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

        <View style={s.footer}>
          <TouchableOpacity style={[s.btn, s.cancelBtn]} onPress={() => setActiveFullScreen('leave-req' as any)}>
            <Text style={[s.btnText, { color: theme.text.body }]}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.submitBtn, isBusy && { opacity: 0.6 }]}
            onPress={handleSubmit} disabled={isBusy}>
            {isBusy
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={[s.btnText, { color: '#fff' }]}>신청하기</Text>
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

function makeFormStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex:1, backgroundColor:theme.bg.surface },
    header: { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderBottomColor:theme.border.default },
    headerTitle: { fontSize:17, fontWeight:'700', color:theme.text.primary },
    form: { padding:20, gap:20, maxWidth:640, width:'100%', alignSelf:'center' },
    textArea: { borderWidth:1, borderColor:theme.border.default, borderRadius:8, paddingHorizontal:12, paddingVertical:10, fontSize:14, color:theme.text.primary, minHeight:80, textAlignVertical:'top', fontFamily:WEB_FONT },
    footer: { flexDirection:'row', justifyContent:'flex-end', gap:10, marginTop:8, paddingBottom:20 },
    btn: { paddingHorizontal:20, paddingVertical:10, borderRadius:8, alignItems:'center', justifyContent:'center', minWidth:80 },
    cancelBtn: { backgroundColor:theme.bg.surfaceMute, borderWidth:1, borderColor:theme.border.default },
    submitBtn: { backgroundColor:theme.brand.primary },
    btnText: { fontSize:14, fontWeight:'600' },
  });
}
