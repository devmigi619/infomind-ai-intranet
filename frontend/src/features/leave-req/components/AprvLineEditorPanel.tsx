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
      className="flex-row items-center gap-2 py-2 px-3"
      style={({ pressed }) => ({
        opacity: isAdded ? 0.4 : 1,
        backgroundColor: pressed && !isAdded ? theme.brand.primaryTint : undefined,
      })}
    >
      <View className="w-[30px] h-[30px] rounded-full items-center justify-center" style={{ backgroundColor: theme.brand.primaryTint }}>
        <Text className="text-xs font-bold" style={{ color: theme.brand.primary }}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text className="text-[13px]" style={{ color: theme.text.primary }}>{user.userNm}</Text>
        {sub ? <Text className="text-[11px] mt-[1px]" style={{ color: theme.text.muted }}>{sub}</Text> : null}
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
        className="flex-row items-center gap-1.5 py-[9px] pr-3"
        style={{ paddingLeft: 12 + depth * 14 }}
        activeOpacity={0.7}
      >
        <View className="w-4 h-4 items-center justify-center" style={isOpen ? { transform: [{ rotate: '90deg' }] } : undefined}>
          <ChevronRight size={13} color={theme.text.muted} />
        </View>
        <Text className="flex-1 text-[13px] font-semibold" style={{ color: theme.text.body }} numberOfLines={1}>
          {node.deptNm}
        </Text>
        <View className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: theme.bg.surfaceMute }}>
          <Text className="text-[11px] font-semibold" style={{ color: theme.text.muted }}>{total}</Text>
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
    <View className="flex-1 pt-2 border-r" style={{ borderRightColor: theme.border.default }}>
      <View className="flex-row items-center gap-2 mx-2.5 mb-1.5 px-2.5 py-[7px] border rounded-lg" style={{ borderColor: theme.border.default, backgroundColor: theme.bg.surfaceMute }}>
        <Search size={14} color={theme.text.muted} />
        <TextInput
          value={query} onChangeText={setQuery} placeholder="이름 검색"
          placeholderTextColor={theme.text.subtle}
          className="flex-1 text-[13px] p-0"
          style={{ color: theme.text.primary, fontFamily: WEB_FONT }}
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
    <View className="flex-1 flex-col">
      {showTabBar && (
        <View className="flex-row border rounded-lg overflow-hidden m-3" style={{ borderColor: theme.border.default }}>
          {(['aprv', 'ref'] as AprvTab[]).map((t) => (
            <TouchableOpacity
              key={t}
              className="flex-1 py-2 items-center"
              style={tab === t ? { backgroundColor: theme.brand.primary } : undefined}
              onPress={() => onTabChange(t)}
            >
              <Text className="text-[13px] font-semibold" style={{ color: tab === t ? '#fff' : theme.text.muted }}>
                {t === 'aprv' ? `결재자 ${aprvList.length}명` : `수신참조 ${refList.length}명`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {currentList.length === 0 ? (
        <View className="flex-1 items-center justify-center p-5">
          <Text style={{ fontSize: 13, color: theme.text.subtle, textAlign: 'center' }}>
            왼쪽 조직도에서 이름을 탭하세요
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 4 }} keyboardShouldPersistTaps="always">
          {currentList.map((entry, i) => (
            <View key={entry.aprvUserId} className="flex-row items-center gap-2 py-2.5 px-3 border-b" style={{ borderBottomColor: theme.border.subtle }}>
              {tab === 'aprv' && (
                <View className="w-[22px] h-[22px] rounded-full items-center justify-center" style={{ backgroundColor: theme.brand.primaryTint }}>
                  <Text className="text-[11px] font-bold" style={{ color: theme.brand.primary }}>{i + 1}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text className="text-[13px] font-medium" style={{ color: theme.text.primary }}>{entry.aprvUserNm}</Text>
                {(entry.deptNm || entry.jbgdNm) && (
                  <Text className="text-[11px] mt-0.5" style={{ color: theme.text.muted }}>
                    {[entry.deptNm, entry.jbgdNm].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
              <View className="flex-col gap-0">
                <TouchableOpacity onPress={() => moveItem(i, -1)} disabled={i === 0}
                  className="p-0.5" style={i === 0 ? { opacity: 0.2 } : undefined}>
                  <ChevronUp size={14} color={theme.text.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveItem(i, 1)} disabled={i === currentList.length - 1}
                  className="p-0.5" style={i === currentList.length - 1 ? { opacity: 0.2 } : undefined}>
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
        <View className="flex-row items-center gap-2 px-3 py-2.5 border-t" style={{ borderTopColor: theme.border.subtle }}>
          <Switch value={deptRefYn} onValueChange={onDeptRefToggle} />
          <Text style={{ fontSize: 13, color: theme.text.body }}>부서원 자동 포함</Text>
        </View>
      )}
    </View>
  );
}

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
    <View className="flex-row border-b" style={{ borderBottomColor: theme.border.default }}>
      {tabs.map(({ key, label }) => {
        const active = view === key;
        return (
          <TouchableOpacity
            key={key}
            className={`flex-1 items-center py-2.5 border-b-2 ${active ? '' : 'border-transparent'}`}
            style={active ? { borderBottomColor: theme.brand.primary } : undefined}
            onPress={() => onChangeView(key)}
          >
            <Text className="text-[13px] font-semibold" style={{ color: active ? theme.brand.primary : theme.text.muted }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

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
