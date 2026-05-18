/**
 * AprvLineEditorPanel — 결재선 편집 공용 패널
 *
 * OrgTreePanel (조직도) + SelectionPanel (결재자/수신참조) 구성.
 * Wide: 좌우 분할  |  Mobile: 탭 전환
 *
 * 사용처:
 *   - LeaveReqFormScreen > AprvLineModal   (결재선 지정)
 *   - AprvlTmplModal > EditView            (템플릿 편집)
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  Search,
  Check,
  Plus,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import {
  useOrgDepts,
  useOrgJbgds,
  useOrgUsers,
  type OrgDeptDto,
  type OrgUserDto,
  type AprvEntry,
} from '../api';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── 공개 타입 ────────────────────────────────────────────────────────────────

export type AprvTab = 'aprv' | 'ref';
export type MobileView = 'tree' | 'aprv' | 'ref';

export interface OrgDeptNode extends OrgDeptDto {
  children: OrgDeptNode[];
  users: OrgUserDto[];
}

// ─── 트리 유틸 ────────────────────────────────────────────────────────────────

export function buildOrgTree(depts: OrgDeptDto[], users: OrgUserDto[]): OrgDeptNode[] {
  const map = new Map<string, OrgDeptNode>();
  depts.forEach((d) => map.set(d.deptCd, { ...d, children: [], users: [] }));
  users.forEach((u) => {
    if (u.deptCd && map.has(u.deptCd)) map.get(u.deptCd)!.users.push(u);
  });
  const roots: OrgDeptNode[] = [];
  map.forEach((node) => {
    if (node.upDeptCd && map.has(node.upDeptCd))
      map.get(node.upDeptCd)!.children.push(node);
    else roots.push(node);
  });
  return roots;
}

export function countUsers(node: OrgDeptNode): number {
  return node.users.length + node.children.reduce((s, c) => s + countUsers(c), 0);
}

export function nodeHasMatch(node: OrgDeptNode, q: string): boolean {
  if (!q) return true;
  if (node.users.some((u) => u.userNm.includes(q) || u.userId.includes(q))) return true;
  return node.children.some((c) => nodeHasMatch(c, q));
}

// ─── OrgUserRow ───────────────────────────────────────────────────────────────

function OrgUserRow({
  user, jbgdNm, deptNm, isAdded, onAdd, theme,
}: {
  user: OrgUserDto; jbgdNm: string; deptNm: string;
  isAdded: boolean; onAdd: (u: OrgUserDto) => void;
  theme: ReturnType<typeof useTheme>;
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
        : <Plus size={15} color={theme.text.subtle} />}
    </Pressable>
  );
}

// ─── DeptNode (재귀) ──────────────────────────────────────────────────────────

function DeptNode({
  node, depth, expanded, onToggle, jbgdMap, deptMap,
  addedIds, searchQuery, onAddUser, theme,
}: {
  node: OrgDeptNode; depth: number;
  expanded: Set<string>; onToggle: (cd: string) => void;
  jbgdMap: Map<string, string>; deptMap: Map<string, string>;
  addedIds: Set<string>; searchQuery: string;
  onAddUser: (u: OrgUserDto) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const q = searchQuery.trim();
  if (q && !nodeHasMatch(node, q)) return null;

  const isOpen = expanded.has(node.deptCd) || !!q;
  const total = countUsers(node);
  const visibleUsers = q
    ? node.users.filter((u) => u.userNm.includes(q) || u.userId.includes(q))
    : node.users;

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
        <Text style={[ors.deptNm, { color: theme.text.body }]} numberOfLines={1}>
          {node.deptNm}
        </Text>
        <View style={[ors.cntBadge, { backgroundColor: theme.bg.surfaceMute }]}>
          <Text style={[ors.cntTxt, { color: theme.text.muted }]}>{total}</Text>
        </View>
      </TouchableOpacity>

      {isOpen && (
        <>
          {visibleUsers.map((u) => (
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
          {node.children.map((child) => (
            <DeptNode
              key={child.deptCd} node={child} depth={depth + 1}
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

// ─── OrgTreePanel ─────────────────────────────────────────────────────────────

function OrgTreePanel({
  tree, jbgdMap, deptMap, expanded, onToggle, addedIds, onAddUser, theme,
}: {
  tree: OrgDeptNode[]; jbgdMap: Map<string, string>; deptMap: Map<string, string>;
  expanded: Set<string>; onToggle: (cd: string) => void;
  addedIds: Set<string>; onAddUser: (u: OrgUserDto) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const [query, setQuery] = useState('');
  return (
    <View style={[ors.treePanel, { borderRightColor: theme.border.default }]}>
      <View style={[ors.searchBox, { borderColor: theme.border.default, backgroundColor: theme.bg.surfaceMute }]}>
        <Search size={14} color={theme.text.muted} />
        <TextInput
          value={query} onChangeText={setQuery} placeholder="이름 검색"
          placeholderTextColor={theme.text.subtle}
          style={[ors.searchInput, { color: theme.text.primary, fontFamily: WEB_FONT }]}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <X size={13} color={theme.text.muted} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="always">
        {tree.map((node) => (
          <DeptNode
            key={node.deptCd} node={node} depth={0}
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
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 10, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderRadius: 8 },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  deptRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingRight: 12 },
  chevronWrap: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  deptNm: { flex: 1, fontSize: 13, fontWeight: '600' },
  cntBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  cntTxt: { fontSize: 11, fontWeight: '600' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 12, fontWeight: '700' },
  userNm: { fontSize: 13 },
  sub: { fontSize: 11, marginTop: 1 },
});

// ─── SelectionPanel ───────────────────────────────────────────────────────────

function SelectionPanel({
  tab, aprvList, refList, deptRefYn, showTabBar,
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
      {showTabBar && (
        <View style={[sps.tabBar, { borderColor: theme.border.default }]}>
          {(['aprv', 'ref'] as AprvTab[]).map((t) => (
            <TouchableOpacity
              key={t}
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
              {tab === 'aprv' && (
                <View style={[sps.ordBadge, { backgroundColor: theme.brand.primaryTint }]}>
                  <Text style={[sps.ordTxt, { color: theme.brand.primary }]}>{i + 1}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[sps.entryNm, { color: theme.text.primary }]}>{entry.aprvUserNm}</Text>
                {(entry.deptNm || entry.jbgdNm) && (
                  <Text style={[sps.entrySub, { color: theme.text.muted }]}>
                    {[entry.deptNm, entry.jbgdNm].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
              <View style={sps.reorderBtns}>
                <TouchableOpacity onPress={() => moveItem(i, -1)} disabled={i === 0}
                  style={[sps.reorderBtn, i === 0 && { opacity: 0.2 }]}>
                  <ChevronUp size={14} color={theme.text.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveItem(i, 1)} disabled={i === currentList.length - 1}
                  style={[sps.reorderBtn, i === currentList.length - 1 && { opacity: 0.2 }]}>
                  <ChevronDown size={14} color={theme.text.muted} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => removeItem(i)} style={{ padding: 4 }}>
                <X size={14} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

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
  tabBar: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden', margin: 12 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  emptyHint: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1 },
  ordBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  ordTxt: { fontSize: 11, fontWeight: '700' },
  entryNm: { fontSize: 13, fontWeight: '500' },
  entrySub: { fontSize: 11, marginTop: 2 },
  reorderBtns: { flexDirection: 'column', gap: 0 },
  reorderBtn: { padding: 2 },
  deptRefRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
});

// ─── MobileViewTabs ───────────────────────────────────────────────────────────

function MobileViewTabs({
  view, onChangeView, aprvCount, refCount, theme,
}: {
  view: MobileView; onChangeView: (v: MobileView) => void;
  aprvCount: number; refCount: number;
  theme: ReturnType<typeof useTheme>;
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
          <TouchableOpacity
            key={key}
            style={[mvt.tab, active && { borderBottomColor: theme.brand.primary }]}
            onPress={() => onChangeView(key)}
          >
            <Text style={[mvt.label, { color: active ? theme.brand.primary : theme.text.muted }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const mvt = StyleSheet.create({
  bar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  label: { fontSize: 13, fontWeight: '600' },
});

// ─── 메인 export ──────────────────────────────────────────────────────────────

export interface AprvLineEditorPanelProps {
  aprvList: AprvEntry[];
  refList: AprvEntry[];
  deptRefYn: boolean;
  currentUserId?: string;
  onAprvListChange: (list: AprvEntry[]) => void;
  onRefListChange: (list: AprvEntry[]) => void;
  onDeptRefToggle: (v: boolean) => void;
  theme: ReturnType<typeof useTheme>;
}

export function AprvLineEditorPanel({
  aprvList, refList, deptRefYn, currentUserId,
  onAprvListChange, onRefListChange, onDeptRefToggle, theme,
}: AprvLineEditorPanelProps) {
  const { width: winW } = useWindowDimensions();
  const isWide = winW > 640;

  const [wideTab, setWideTab] = useState<AprvTab>('aprv');
  const [mobileView, setMobileView] = useState<MobileView>('tree');
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const { data: orgDepts = [] } = useOrgDepts();
  const { data: orgJbgds = [] } = useOrgJbgds();
  const { data: orgUsers = [] } = useOrgUsers();

  // 본인 제외
  const filteredUsers = useMemo(
    () => orgUsers.filter((u) => u.userId !== currentUserId),
    [orgUsers, currentUserId],
  );

  const orgTree = useMemo(
    () => buildOrgTree(orgDepts, filteredUsers),
    [orgDepts, filteredUsers],
  );
  const jbgdMap = useMemo(
    () => new Map(orgJbgds.map((j) => [j.jbgdCd, j.jbgdNm])),
    [orgJbgds],
  );
  const deptMap = useMemo(
    () => new Map(orgDepts.map((d) => [d.deptCd, d.deptNm])),
    [orgDepts],
  );

  // 부서 전체 펼치기 — 첫 로드 시
  useEffect(() => {
    if (orgDepts.length > 0) {
      setExpandedDepts(new Set(orgDepts.map((d) => d.deptCd)));
    }
  }, [orgDepts.length]);

  // 현재 탭 기준 이미 추가된 ID 집합
  const activeTab: AprvTab = isWide ? wideTab : mobileView === 'ref' ? 'ref' : 'aprv';
  const addedIds = useMemo(
    () => new Set((activeTab === 'aprv' ? aprvList : refList).map((e) => e.aprvUserId)),
    [activeTab, aprvList, refList],
  );

  const addUserToCurrentTab = useCallback(
    (u: OrgUserDto) => {
      const entry: AprvEntry = {
        aprvUserId: u.userId,
        aprvUserNm: u.userNm,
        deptNm: deptMap.get(u.deptCd ?? '') ?? undefined,
        jbgdNm: jbgdMap.get(u.jbgdCd ?? '') ?? undefined,
      };
      if (activeTab === 'aprv') {
        onAprvListChange(
          aprvList.find((a) => a.aprvUserId === u.userId) ? aprvList : [...aprvList, entry],
        );
      } else {
        onRefListChange(
          refList.find((r) => r.aprvUserId === u.userId) ? refList : [...refList, entry],
        );
      }
    },
    [activeTab, aprvList, refList, deptMap, jbgdMap, onAprvListChange, onRefListChange],
  );

  const toggleDept = useCallback((cd: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      next.has(cd) ? next.delete(cd) : next.add(cd);
      return next;
    });
  }, []);

  if (isWide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' }}>
        <OrgTreePanel
          tree={orgTree} jbgdMap={jbgdMap} deptMap={deptMap}
          expanded={expandedDepts} onToggle={toggleDept}
          addedIds={addedIds} onAddUser={addUserToCurrentTab} theme={theme}
        />
        <SelectionPanel
          tab={wideTab} aprvList={aprvList} refList={refList}
          deptRefYn={deptRefYn} showTabBar
          onTabChange={setWideTab}
          onAprvListChange={onAprvListChange} onRefListChange={onRefListChange}
          onDeptRefToggle={onDeptRefToggle} theme={theme}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
      <MobileViewTabs
        view={mobileView} onChangeView={setMobileView}
        aprvCount={aprvList.length} refCount={refList.length} theme={theme}
      />
      {mobileView === 'tree' ? (
        <OrgTreePanel
          tree={orgTree} jbgdMap={jbgdMap} deptMap={deptMap}
          expanded={expandedDepts} onToggle={toggleDept}
          addedIds={addedIds} onAddUser={addUserToCurrentTab} theme={theme}
        />
      ) : (
        <SelectionPanel
          tab={mobileView as AprvTab}
          aprvList={aprvList} refList={refList}
          deptRefYn={deptRefYn} showTabBar={false}
          onTabChange={(t) => setMobileView(t)}
          onAprvListChange={onAprvListChange} onRefListChange={onRefListChange}
          onDeptRefToggle={onDeptRefToggle} theme={theme}
        />
      )}
    </View>
  );
}
