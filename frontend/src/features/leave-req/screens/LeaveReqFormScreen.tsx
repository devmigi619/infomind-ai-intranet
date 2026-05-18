import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Switch,
  ActivityIndicator,
  Modal,
  Alert,
  useWindowDimensions,
} from 'react-native';
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  X, Users, Check, Plus, Search, Paperclip, FileText,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useUiStore } from '../../../store/uiStore';
import { useCurrentUser } from '../../auth/api';
import { useToast } from '../../../shared/hooks/useToast';
import { AppDropdown } from '../../../shared/components/AppDropdown';
import {
  useLeaveMstList,
  useLeaveDtlList,
  useOrgDepts,
  useOrgJbgds,
  useOrgUsers,
  type OrgDeptDto,
  type OrgUserDto,
} from '../api';
import {
  useCreateLeaveReq,
  useUserAprvlTmplList,
  type UserAprvlTmplDto,
} from '../api';
import {
  useUploadAttachments,
  type DocumentAsset,
} from '../../../features/attachment/api';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── 조직도 트리 유틸 ─────────────────────────────────────────────────────────

interface OrgDeptNode extends OrgDeptDto {
  children: OrgDeptNode[];
  users: OrgUserDto[];
}

interface AprvEntry {
  aprvUserId: string;
  aprvUserNm: string;
  deptNm?: string;
  jbgdNm?: string;
}

type AprvTab = 'aprv' | 'ref';
type MobileView = 'tree' | 'aprv' | 'ref';

function buildOrgTree(depts: OrgDeptDto[], users: OrgUserDto[]): OrgDeptNode[] {
  const map = new Map<string, OrgDeptNode>();
  depts.forEach((d) => map.set(d.deptCd, { ...d, children: [], users: [] }));
  users.forEach((u) => {
    if (u.deptCd && map.has(u.deptCd)) map.get(u.deptCd)!.users.push(u);
  });
  const roots: OrgDeptNode[] = [];
  map.forEach((node) => {
    if (node.upDeptCd && map.has(node.upDeptCd)) map.get(node.upDeptCd)!.children.push(node);
    else roots.push(node);
  });
  return roots;
}

function countUsers(node: OrgDeptNode): number {
  return node.users.length + node.children.reduce((s, c) => s + countUsers(c), 0);
}

function nodeHasMatch(node: OrgDeptNode, q: string): boolean {
  if (!q) return true;
  if (node.users.some((u) => u.userNm.includes(q) || u.userId.includes(q))) return true;
  return node.children.some((c) => nodeHasMatch(c, q));
}

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

const HOUR_OPTS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i).padStart(2, '0'),
  label: `${String(i).padStart(2, '0')}시`,
}));

const MIN_OPTS = [
  { value: '00', label: '00분' },
  { value: '30', label: '30분' },
];

/** HHMM 문자열 → { h, m } */
function hhmmParts(hhmm: string | null): { h: string; m: string } {
  if (!hhmm || hhmm.length !== 4) return { h: '', m: '' };
  return { h: hhmm.slice(0, 2), m: hhmm.slice(2, 4) };
}

/** { h, m } → HHMM 또는 null */
function toHhmm(h: string, m: string): string | null {
  return h && m ? `${h}${m}` : null;
}

/** HHMM "0900" → "09:00" 표시용 */
function fmtHhmm(hhmm: string | null): string {
  if (!hhmm || hhmm.length !== 4) return '';
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

/**
 * 시작/종료 시분 선택기.
 * 차이가 정확히 2시간(0.25일) 또는 4시간(0.5일)일 때만 유효 표시.
 */
function HalfDayTimePicker({ stHhmm, endHhmm, onChangeStart, onChangeEnd, theme }: {
  stHhmm: string | null; endHhmm: string | null;
  onChangeStart: (v: string | null) => void;
  onChangeEnd: (v: string | null) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const st  = hhmmParts(stHhmm);
  const end = hhmmParts(endHhmm);

  const handleStH  = (h: string)  => onChangeStart(toHhmm(h, st.m));
  const handleStM  = (m: string)  => onChangeStart(toHhmm(st.h, m));
  const handleEndH = (h: string)  => onChangeEnd(toHhmm(h, end.m));
  const handleEndM = (m: string)  => onChangeEnd(toHhmm(end.h, m));

  // 유효성: 차이 계산
  let validityMsg: string | null = null;
  let validityOk = false;
  if (stHhmm && endHhmm) {
    const stMin  = parseInt(stHhmm.slice(0,2)) * 60 + parseInt(stHhmm.slice(2,4));
    const endMin = parseInt(endHhmm.slice(0,2)) * 60 + parseInt(endHhmm.slice(2,4));
    const diff   = endMin - stMin;
    if (diff === 120)      { validityMsg = '2시간 → 0.25일 적용';  validityOk = true; }
    else if (diff === 240) { validityMsg = '4시간 → 0.5일 적용';   validityOk = true; }
    else if (diff <= 0)    { validityMsg = '종료 시간이 시작보다 빠릅니다.'; }
    else                   { validityMsg = '2시간 또는 4시간 단위만 신청 가능합니다.'; }
  }

  return (
    <View style={[hdp.root, { borderColor: theme.border.default, backgroundColor: theme.bg.surfaceMute }]}>
      {/* 시작 시간 */}
      <View style={hdp.row}>
        <Text style={[hdp.label, { color: theme.text.muted }]}>시작</Text>
        <View style={hdp.dropRow}>
          <View style={{ width: 90 }}>
            <AppDropdown value={st.h} onChange={handleStH} options={HOUR_OPTS} placeholder="시" />
          </View>
          <Text style={[hdp.colon, { color: theme.text.muted }]}>:</Text>
          <View style={{ width: 80 }}>
            <AppDropdown value={st.m} onChange={handleStM} options={MIN_OPTS} placeholder="분" />
          </View>
        </View>
      </View>

      {/* 종료 시간 */}
      <View style={hdp.row}>
        <Text style={[hdp.label, { color: theme.text.muted }]}>종료</Text>
        <View style={hdp.dropRow}>
          <View style={{ width: 90 }}>
            <AppDropdown value={end.h} onChange={handleEndH} options={HOUR_OPTS} placeholder="시" />
          </View>
          <Text style={[hdp.colon, { color: theme.text.muted }]}>:</Text>
          <View style={{ width: 80 }}>
            <AppDropdown value={end.m} onChange={handleEndM} options={MIN_OPTS} placeholder="분" />
          </View>
        </View>
      </View>

      {/* 유효성 메시지 */}
      {validityMsg && (
        <Text style={[hdp.validity, { color: validityOk ? theme.semantic.success : theme.semantic.danger }]}>
          {validityOk ? '✓ ' : '✕ '}{validityMsg}
        </Text>
      )}
    </View>
  );
}

const hdp = StyleSheet.create({
  root: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { width: 32, fontSize: 13, fontWeight: '600' },
  dropRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  colon: { fontSize: 16, fontWeight: '700' },
  validity: { fontSize: 12, fontWeight: '500', paddingTop: 2 },
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

// ─── 조직도 사용자 행 ─────────────────────────────────────────────────────────

function OrgUserRow({ user, jbgdNm, deptNm, isAdded, onAdd, theme }: {
  user: OrgUserDto; jbgdNm: string; deptNm: string;
  isAdded: boolean; onAdd: (u: OrgUserDto) => void; theme: ReturnType<typeof useTheme>;
}) {
  const initial = user.userNm?.[0] ?? '?';
  const sub = [deptNm, jbgdNm].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => !isAdded && onAdd(user)}
      style={({ pressed }) => [
        ors.userRow,
        pressed && !isAdded && { backgroundColor: theme.brand.primaryTint },
        { opacity: isAdded ? 0.4 : 1 },
      ]}
    >
      <View style={[ors.avatar, { backgroundColor: theme.brand.primaryTint }]}>
        <Text style={[ors.avatarTxt, { color: theme.brand.primary }]}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ors.userNm, { color: theme.text.primary }]}>{user.userNm}</Text>
        {sub ? <Text style={[ors.sub, { color: theme.text.muted }]}>{sub}</Text> : null}
      </View>
      {isAdded
        ? <Check size={15} color={theme.brand.primary} />
        : <Plus size={15} color={theme.text.subtle} />
      }
    </Pressable>
  );
}

// ─── 부서 노드 (재귀) ─────────────────────────────────────────────────────────

function DeptNode({ node, depth, expanded, onToggle, jbgdMap, deptMap, addedIds, searchQuery, onAddUser, theme }: {
  node: OrgDeptNode; depth: number; expanded: Set<string>; onToggle: (cd: string) => void;
  jbgdMap: Map<string,string>; deptMap: Map<string,string>;
  addedIds: Set<string>; searchQuery: string;
  onAddUser: (u: OrgUserDto) => void; theme: ReturnType<typeof useTheme>;
}) {
  const q = searchQuery.trim();
  if (q && !nodeHasMatch(node, q)) return null;

  const isOpen = expanded.has(node.deptCd) || !!q;
  const total = countUsers(node);
  const visibleUsers = q ? node.users.filter(u => u.userNm.includes(q) || u.userId.includes(q)) : node.users;

  return (
    <View>
      <TouchableOpacity
        onPress={() => onToggle(node.deptCd)}
        style={[ors.deptRow, { paddingLeft: 12 + depth * 14 }]}
        activeOpacity={0.7}
      >
        <View style={[ors.chevronWrap, isOpen && { transform: [{ rotate: '90deg' }] }]}>
          <ChevronRight size={13} color={theme.text.muted} />
        </View>
        <Text style={[ors.deptNm, { color: theme.text.body }]} numberOfLines={1}>{node.deptNm}</Text>
        <View style={[ors.cntBadge, { backgroundColor: theme.bg.surfaceMute }]}>
          <Text style={[ors.cntTxt, { color: theme.text.muted }]}>{total}</Text>
        </View>
      </TouchableOpacity>

      {isOpen && (
        <>
          {visibleUsers.map(u => (
            <View key={u.userId} style={{ paddingLeft: depth * 14 }}>
              <OrgUserRow
                user={u}
                jbgdNm={jbgdMap.get(u.jbgdCd ?? '') ?? ''}
                deptNm={deptMap.get(u.deptCd ?? '') ?? ''}
                isAdded={addedIds.has(u.userId)}
                onAdd={onAddUser}
                theme={theme}
              />
            </View>
          ))}
          {node.children.map(child => (
            <DeptNode key={child.deptCd} node={child} depth={depth + 1}
              expanded={expanded} onToggle={onToggle}
              jbgdMap={jbgdMap} deptMap={deptMap}
              addedIds={addedIds} searchQuery={searchQuery}
              onAddUser={onAddUser} theme={theme}
            />
          ))}
        </>
      )}
    </View>
  );
}

// ─── 조직도 패널 ─────────────────────────────────────────────────────────────

function OrgTreePanel({ tree, jbgdMap, deptMap, expanded, onToggle, addedIds, onAddUser, theme }: {
  tree: OrgDeptNode[]; jbgdMap: Map<string,string>; deptMap: Map<string,string>;
  expanded: Set<string>; onToggle: (cd: string) => void;
  addedIds: Set<string>; onAddUser: (u: OrgUserDto) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const [query, setQuery] = useState('');

  return (
    <View style={[ors.treePanel, { borderRightColor: theme.border.default }]}>
      <View style={[ors.searchBox, { borderColor: theme.border.default, backgroundColor: theme.bg.surfaceMute }]}>
        <Search size={14} color={theme.text.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="이름 검색"
          placeholderTextColor={theme.text.subtle}
          style={[ors.searchInput, { color: theme.text.primary, fontFamily: WEB_FONT }]}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}><X size={13} color={theme.text.muted} /></TouchableOpacity>
        )}
      </View>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="always">
        {tree.map(node => (
          <DeptNode key={node.deptCd} node={node} depth={0}
            expanded={expanded} onToggle={onToggle}
            jbgdMap={jbgdMap} deptMap={deptMap}
            addedIds={addedIds} searchQuery={query}
            onAddUser={onAddUser} theme={theme}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const ors = StyleSheet.create({
  treePanel: { flex: 1, borderRightWidth: 1, paddingTop: 8 },
  searchBox: { flexDirection:'row', alignItems:'center', gap:8, marginHorizontal:10, marginBottom:6, paddingHorizontal:10, paddingVertical:7, borderWidth:1, borderRadius:8 },
  searchInput: { flex:1, fontSize:13, padding:0 },
  deptRow: { flexDirection:'row', alignItems:'center', gap:6, paddingVertical:9, paddingRight:12 },
  chevronWrap: { width:16, height:16, alignItems:'center', justifyContent:'center' },
  deptNm: { flex:1, fontSize:13, fontWeight:'600' },
  cntBadge: { paddingHorizontal:6, paddingVertical:2, borderRadius:10 },
  cntTxt: { fontSize:11, fontWeight:'600' },
  userRow: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:8, paddingHorizontal:12 },
  avatar: { width:30, height:30, borderRadius:15, alignItems:'center', justifyContent:'center' },
  avatarTxt: { fontSize:12, fontWeight:'700' },
  userNm: { fontSize:13 },
  sub: { fontSize:11, marginTop:1 },
});

// ─── 선택 패널 (결재자 / 수신참조) ───────────────────────────────────────────

function SelectionPanel({ tab, aprvList, refList, deptRefYn, showTabBar,
  onTabChange, onAprvListChange, onRefListChange, onDeptRefToggle, theme,
}: {
  tab: AprvTab;
  aprvList: AprvEntry[]; refList: AprvEntry[];
  deptRefYn: boolean; showTabBar: boolean;
  onTabChange: (t: AprvTab) => void;
  onAprvListChange: (list: AprvEntry[]) => void;
  onRefListChange: (list: AprvEntry[]) => void;
  onDeptRefToggle: (v: boolean) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const currentList = tab === 'aprv' ? aprvList : refList;
  const setCurrentList = tab === 'aprv' ? onAprvListChange : onRefListChange;

  const moveItem = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= currentList.length) return;
    const next = [...currentList];
    [next[i], next[j]] = [next[j], next[i]];
    setCurrentList(next);
  };

  const removeItem = (i: number) => setCurrentList(currentList.filter((_, idx) => idx !== i));

  return (
    <View style={sps.root}>
      {/* 탭 바 (wide에서만 표시) */}
      {showTabBar && (
        <View style={[sps.tabBar, { borderColor: theme.border.default }]}>
          {(['aprv', 'ref'] as AprvTab[]).map(t => (
            <TouchableOpacity key={t}
              style={[sps.tabBtn, tab === t && { backgroundColor: theme.brand.primary }]}
              onPress={() => onTabChange(t)}
            >
              <Text style={[sps.tabLabel, { color: tab === t ? '#fff' : theme.text.muted }]}>
                {t === 'aprv' ? `결재자 ${aprvList.length}명` : `수신참조 ${refList.length}명`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 목록 */}
      {currentList.length === 0 ? (
        <View style={sps.emptyHint}>
          <Text style={{ fontSize: 13, color: theme.text.subtle, textAlign: 'center' }}>
            왼쪽 조직도에서 이름을 탭하세요
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 4 }} keyboardShouldPersistTaps="always">
          {currentList.map((entry, i) => (
            <View key={entry.aprvUserId} style={[sps.entryRow, { borderBottomColor: theme.border.subtle }]}>
              {/* 순번 뱃지 (결재자만) */}
              {tab === 'aprv' && (
                <View style={[sps.ordBadge, { backgroundColor: theme.brand.primaryTint }]}>
                  <Text style={[sps.ordTxt, { color: theme.brand.primary }]}>{i + 1}</Text>
                </View>
              )}

              {/* 이름 + 부서/직급 */}
              <View style={{ flex: 1 }}>
                <Text style={[sps.entryNm, { color: theme.text.primary }]}>{entry.aprvUserNm}</Text>
                {(entry.deptNm || entry.jbgdNm) && (
                  <Text style={[sps.entrySub, { color: theme.text.muted }]}>
                    {[entry.deptNm, entry.jbgdNm].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>

              {/* 순서 변경 버튼 */}
              <View style={sps.reorderBtns}>
                <TouchableOpacity
                  onPress={() => moveItem(i, -1)}
                  disabled={i === 0}
                  style={[sps.reorderBtn, i === 0 && { opacity: 0.2 }]}
                >
                  <ChevronUp size={14} color={theme.text.muted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveItem(i, 1)}
                  disabled={i === currentList.length - 1}
                  style={[sps.reorderBtn, i === currentList.length - 1 && { opacity: 0.2 }]}
                >
                  <ChevronDown size={14} color={theme.text.muted} />
                </TouchableOpacity>
              </View>

              {/* 삭제 */}
              <TouchableOpacity onPress={() => removeItem(i)} style={{ padding: 4 }}>
                <X size={14} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* 부서원 자동포함 (수신참조 탭만) */}
      {tab === 'ref' && (
        <View style={[sps.deptRefRow, { borderTopColor: theme.border.subtle }]}>
          <Switch value={deptRefYn} onValueChange={onDeptRefToggle} />
          <Text style={{ fontSize: 13, color: theme.text.body }}>부서원 자동 포함</Text>
        </View>
      )}
    </View>
  );
}

const sps = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column' },
  tabBar: { flexDirection:'row', borderWidth:1, borderRadius:8, overflow:'hidden', margin:12 },
  tabBtn: { flex:1, paddingVertical:8, alignItems:'center' },
  tabLabel: { fontSize:13, fontWeight:'600' },
  emptyHint: { flex:1, alignItems:'center', justifyContent:'center', padding:20 },
  entryRow: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:10, paddingHorizontal:12, borderBottomWidth:1 },
  ordBadge: { width:22, height:22, borderRadius:11, alignItems:'center', justifyContent:'center' },
  ordTxt: { fontSize:11, fontWeight:'700' },
  entryNm: { fontSize:13, fontWeight:'500' },
  entrySub: { fontSize:11, marginTop:2 },
  reorderBtns: { flexDirection:'column', gap:0 },
  reorderBtn: { padding:2 },
  deptRefRow: { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:12, paddingVertical:10, borderTopWidth:1 },
});

// ─── 모바일 탭 바 (조직도 / 결재자 / 수신참조) ────────────────────────────────

function MobileViewTabs({ view, onChangeView, aprvCount, refCount, theme }: {
  view: MobileView; onChangeView: (v: MobileView) => void;
  aprvCount: number; refCount: number; theme: ReturnType<typeof useTheme>;
}) {
  const tabs: { key: MobileView; label: string }[] = [
    { key: 'tree', label: '조직도' },
    { key: 'aprv', label: `결재자 ${aprvCount}명` },
    { key: 'ref', label: `수신참조 ${refCount}명` },
  ];
  return (
    <View style={[mvt.bar, { borderBottomColor: theme.border.default }]}>
      {tabs.map(({ key, label }) => {
        const active = view === key;
        return (
          <TouchableOpacity key={key} style={[mvt.tab, active && { borderBottomColor: theme.brand.primary }]} onPress={() => onChangeView(key)}>
            <Text style={[mvt.label, { color: active ? theme.brand.primary : theme.text.muted }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const mvt = StyleSheet.create({
  bar: { flexDirection:'row', borderBottomWidth:1 },
  tab: { flex:1, alignItems:'center', paddingVertical:10, borderBottomWidth:2, borderBottomColor:'transparent' },
  label: { fontSize:13, fontWeight:'600' },
});

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
  const { width: winW, height: winH } = useWindowDimensions();
  const isWide = winW > 640;

  // 내부 상태
  const [wideTab, setWideTab] = useState<AprvTab>('aprv');
  const [mobileView, setMobileView] = useState<MobileView>('tree');
  const [aprvList, setAprvList] = useState<AprvEntry[]>([]);
  const [refList, setRefList] = useState<AprvEntry[]>([]);
  const [deptRefYn, setDeptRefYn] = useState(false);
  const [selectedTmplId, setSelectedTmplId] = useState<string | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  // 조직도 데이터
  const { data: orgDepts = [] } = useOrgDepts();
  const { data: orgJbgds = [] } = useOrgJbgds();
  const { data: orgUsers = [] } = useOrgUsers();

  // 본인 제외
  const filteredUsers = useMemo(
    () => orgUsers.filter(u => u.userId !== currentUserId),
    [orgUsers, currentUserId],
  );

  const orgTree = useMemo(() => buildOrgTree(orgDepts, filteredUsers), [orgDepts, filteredUsers]);
  const jbgdMap = useMemo(() => new Map(orgJbgds.map(j => [j.jbgdCd, j.jbgdNm])), [orgJbgds]);
  const deptMap = useMemo(() => new Map(orgDepts.map(d => [d.deptCd, d.deptNm])), [orgDepts]);

  // 조직도 전체 펼치기: 최초 로드 시 + 모달 열릴 때
  useEffect(() => {
    if (orgDepts.length > 0) {
      setExpandedDepts(new Set(orgDepts.map(d => d.deptCd)));
    }
  }, [orgDepts.length]);

  useEffect(() => {
    if (!visible || orgDepts.length === 0) return;
    setExpandedDepts(new Set(orgDepts.map(d => d.deptCd)));
  }, [visible]);

  // 항목 enrich (deptNm, jbgdNm 채우기)
  const enrich = useCallback((entry: AprvEntry): AprvEntry => {
    if (entry.deptNm && entry.jbgdNm) return entry;
    const u = orgUsers.find(x => x.userId === entry.aprvUserId);
    return {
      ...entry,
      deptNm: entry.deptNm ?? (u ? deptMap.get(u.deptCd ?? '') : undefined),
      jbgdNm: entry.jbgdNm ?? (u ? jbgdMap.get(u.jbgdCd ?? '') : undefined),
    };
  }, [orgUsers, deptMap, jbgdMap]);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (!visible) return;
    setAprvList(initialAprvList.map(enrich));
    setRefList(initialRefList.map(enrich));
    setDeptRefYn(initialDeptRefYn);
    setWideTab('aprv');
    setMobileView('tree');

    // 템플릿 1개 + 결재선 미설정이면 자동 적용
    if (initialAprvList.length === 0 && tmpls.length === 1) {
      const t = tmpls[0];
      setSelectedTmplId(t.aprvlId);
      setAprvList(t.aprvList.map(a => enrich({ aprvUserId: a.aprvUserId, aprvUserNm: a.aprvUserNm })));
      setRefList(t.refList.map(r => enrich({ aprvUserId: r.refUserId, aprvUserNm: r.refUserNm })));
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
      setSelectedTmplId(null); setAprvList([]); setRefList([]);
    } else {
      setSelectedTmplId(tmpl.aprvlId);
      setAprvList(tmpl.aprvList.map(a => enrich({ aprvUserId: a.aprvUserId, aprvUserNm: a.aprvUserNm })));
      setRefList(tmpl.refList.map(r => enrich({ aprvUserId: r.refUserId, aprvUserNm: r.refUserNm })));
    }
  };

  // 현재 탭 기준 추가된 사용자 집합
  const activeTab: AprvTab = isWide ? wideTab : (mobileView === 'ref' ? 'ref' : 'aprv');
  const addedIds = useMemo(
    () => new Set((activeTab === 'aprv' ? aprvList : refList).map(e => e.aprvUserId)),
    [activeTab, aprvList, refList],
  );

  const addUserToCurrentTab = useCallback((u: OrgUserDto) => {
    const entry: AprvEntry = {
      aprvUserId: u.userId,
      aprvUserNm: u.userNm,
      deptNm: deptMap.get(u.deptCd ?? '') ?? undefined,
      jbgdNm: jbgdMap.get(u.jbgdCd ?? '') ?? undefined,
    };
    if (activeTab === 'aprv') {
      setAprvList(prev => prev.find(a => a.aprvUserId === u.userId) ? prev : [...prev, entry]);
    } else {
      setRefList(prev => prev.find(r => r.aprvUserId === u.userId) ? prev : [...prev, entry]);
    }
    setSelectedTmplId(null);
  }, [activeTab, deptMap, jbgdMap]);

  const toggleDept = useCallback((cd: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      next.has(cd) ? next.delete(cd) : next.add(cd);
      return next;
    });
  }, []);

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
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color={theme.text.muted} />
            </TouchableOpacity>
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

          {/* 본문 */}
          {isWide ? (
            // ── Wide: 좌우 분할 ──────────────────────────────────────────────
            <View style={[ms.body, { flexDirection: 'row' }]}>
              <OrgTreePanel tree={orgTree} jbgdMap={jbgdMap} deptMap={deptMap}
                expanded={expandedDepts} onToggle={toggleDept}
                addedIds={addedIds} onAddUser={addUserToCurrentTab} theme={theme}
              />
              <SelectionPanel tab={wideTab} aprvList={aprvList} refList={refList}
                deptRefYn={deptRefYn} showTabBar={true}
                onTabChange={setWideTab}
                onAprvListChange={setAprvList} onRefListChange={setRefList}
                onDeptRefToggle={setDeptRefYn} theme={theme}
              />
            </View>
          ) : (
            // ── Mobile: 탭 + 전체화면 뷰 ──────────────────────────────────
            <View style={[ms.body, { flexDirection: 'column' }]}>
              <MobileViewTabs view={mobileView} onChangeView={setMobileView}
                aprvCount={aprvList.length} refCount={refList.length} theme={theme}
              />
              {mobileView === 'tree' ? (
                <OrgTreePanel tree={orgTree} jbgdMap={jbgdMap} deptMap={deptMap}
                  expanded={expandedDepts} onToggle={toggleDept}
                  addedIds={addedIds} onAddUser={addUserToCurrentTab} theme={theme}
                />
              ) : (
                <SelectionPanel tab={mobileView as AprvTab}
                  aprvList={aprvList} refList={refList}
                  deptRefYn={deptRefYn} showTabBar={false}
                  onTabChange={(t) => setMobileView(t)}
                  onAprvListChange={setAprvList} onRefListChange={setRefList}
                  onDeptRefToggle={setDeptRefYn} theme={theme}
                />
              )}
            </View>
          )}

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

  const { data: mstList = [] } = useLeaveMstList();
  const { data: dtlList = [] } = useLeaveDtlList(leaveCd || null);
  const { data: tmpls = [] as UserAprvlTmplDto[] } = useUserAprvlTmplList();
  const createMutation = useCreateLeaveReq();
  const uploadMutation = useUploadAttachments();

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

    // 반일 시간 유효성 검사
    if (isHalfDay) {
      if (!leaveStHhmm || !leaveEndHhmm) {
        toast.error('반일 신청 시 시작/종료 시간을 입력해주세요.'); return;
      }
      const stMin  = parseInt(leaveStHhmm.slice(0,2)) * 60 + parseInt(leaveStHhmm.slice(2,4));
      const endMin = parseInt(leaveEndHhmm.slice(0,2)) * 60 + parseInt(leaveEndHhmm.slice(2,4));
      const diff = endMin - stMin;
      if (diff !== 120 && diff !== 240) {
        toast.error('시간 차이는 2시간(0.25일) 또는 4시간(0.5일)이어야 합니다.'); return;
      }
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
                  setLeaveStHhmm('0900');
                  setLeaveEndHhmm('1300');
                } else {
                  setLeaveStHhmm(null);
                  setLeaveEndHhmm(null);
                }
              }}
              options={dtlOpts}
              placeholder="세부유형 선택"
              disabled={!leaveCd}
            />
          </FormRow>
        )}

        {isHalfDay && (
          <FormRow label="시간 입력" required theme={theme}>
            <HalfDayTimePicker
              stHhmm={leaveStHhmm}
              endHhmm={leaveEndHhmm}
              onChangeStart={setLeaveStHhmm}
              onChangeEnd={setLeaveEndHhmm}
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
