import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
  Platform,
} from 'react-native';
import {
  Plus,
  X,
  Pencil,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Network,
  ChevronLeft,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import {
  useDepartments,
  useCreateDept,
  useUpdateDept,
  useDisableDept,
  buildTree,
  type Department,
  type DeptTreeNode,
} from '../api';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

type RightPanelMode = 'idle' | 'create' | 'edit';

interface FormState {
  deptCd: string;
  deptNm: string;
}

const EMPTY_FORM: FormState = { deptCd: '', deptNm: '' };

// ─── 트리 노드 컴포넌트 ──────────────────────────────────────────────────────

interface TreeNodeProps {
  node: DeptTreeNode;
  selectedCd: string | null;
  onSelect: (dept: Department) => void;
  depth?: number;
}

function TreeNode({ node, selectedCd, onSelect, depth = 0 }: TreeNodeProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedCd === node.deptCd;
  const isDisabled = node.useYn === 'N';

  return (
    <View>
      <TouchableOpacity
        onPress={() => onSelect(node)}
        activeOpacity={0.7}
        style={[
          styles.treeRow,
          { paddingLeft: 12 + depth * 20 },
          isSelected && { backgroundColor: theme.brand.primaryTint },
        ]}
      >
        {/* 펼치기/접기 버튼 */}
        <TouchableOpacity
          onPress={() => hasChildren && setExpanded((v) => !v)}
          style={styles.expandBtn}
          activeOpacity={hasChildren ? 0.7 : 1}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={14} color={theme.text.muted} />
            ) : (
              <ChevronRight size={14} color={theme.text.muted} />
            )
          ) : (
            <View style={styles.expandPlaceholder} />
          )}
        </TouchableOpacity>

        <Network size={14} color={isSelected ? theme.brand.primary : theme.text.muted} style={styles.nodeIcon} />

        <Text
          style={[
            styles.treeNodeText,
            { color: isSelected ? theme.brand.primary : isDisabled ? theme.text.muted : theme.text.primary },
            isSelected && styles.treeNodeTextActive,
            isDisabled && styles.treeNodeTextDisabled,
            { fontFamily: WEB_FONT },
          ]}
          numberOfLines={1}
        >
          {node.deptNm}
        </Text>

        {isDisabled && (
          <View style={[styles.disabledBadge, { backgroundColor: theme.border.default }]}>
            <Text style={[styles.disabledBadgeText, { color: theme.text.muted }]}>비활성</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 하위 노드 */}
      {hasChildren && expanded && (
        <View>
          {node.children.map((child) => (
            <TreeNode
              key={child.deptCd}
              node={child}
              selectedCd={selectedCd}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── 메인 화면 ───────────────────────────────────────────────────────────────

export function AdminDeptScreen() {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { width } = useWindowDimensions();

  const { data: depts = [], isLoading } = useDepartments();
  const createDept = useCreateDept();
  const updateDept = useUpdateDept();
  const disableDept = useDisableDept();

  const treeData = buildTree(depts);

  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [rightMode, setRightMode] = useState<RightPanelMode>('idle');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [parentForCreate, setParentForCreate] = useState<Department | null>(null);

  // 모바일: 트리 보기 vs 상세 보기
  const [mobileView, setMobileView] = useState<'tree' | 'detail'>('tree');

  // 모달 (모바일에서 추가/수정 폼)
  const [modalVisible, setModalVisible] = useState(false);

  // ─── 선택 핸들러 ─────────────────────────────────────────────────────────

  const handleSelect = useCallback((dept: Department) => {
    setSelectedDept(dept);
    setRightMode('idle');
    if (isMobile) setMobileView('detail');
  }, [isMobile]);

  // ─── 하위 부서 추가 ──────────────────────────────────────────────────────

  const handleAddChild = () => {
    setParentForCreate(selectedDept);
    setForm(EMPTY_FORM);
    setRightMode('create');
    if (isMobile) setModalVisible(true);
  };

  // ─── 최상위 부서 추가 ────────────────────────────────────────────────────

  const handleAddRoot = () => {
    setParentForCreate(null);
    setForm(EMPTY_FORM);
    setRightMode('create');
    if (isMobile) setModalVisible(true);
  };

  // ─── 수정 시작 ───────────────────────────────────────────────────────────

  const handleEdit = () => {
    if (!selectedDept) return;
    setForm({ deptCd: selectedDept.deptCd, deptNm: selectedDept.deptNm });
    setRightMode('edit');
    if (isMobile) setModalVisible(true);
  };

  // ─── 저장 ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.deptNm.trim()) {
      Alert.alert('오류', '부서명을 입력해주세요.');
      return;
    }

    try {
      if (rightMode === 'create') {
        if (!form.deptCd.trim()) {
          Alert.alert('오류', '부서 코드를 입력해주세요.');
          return;
        }
        await createDept.mutateAsync({
          deptCd: form.deptCd.trim(),
          deptNm: form.deptNm.trim(),
          upDeptCd: parentForCreate?.deptCd ?? null,
        });
      } else if (rightMode === 'edit' && selectedDept) {
        await updateDept.mutateAsync({
          deptCd: selectedDept.deptCd,
          data: { deptNm: form.deptNm.trim() },
        });
      }
      setRightMode('idle');
      setModalVisible(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '오류가 발생했습니다.';
      Alert.alert('오류', msg);
    }
  };

  // ─── 비활성화 ────────────────────────────────────────────────────────────

  const handleDisable = () => {
    if (!selectedDept) return;
    Alert.alert(
      '비활성화 확인',
      `'${selectedDept.deptNm}' 및 하위 부서를 모두 비활성화하겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '비활성화',
          style: 'destructive',
          onPress: async () => {
            try {
              await disableDept.mutateAsync(selectedDept.deptCd);
              setSelectedDept(null);
              setRightMode('idle');
              if (isMobile) setMobileView('tree');
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : '오류가 발생했습니다.';
              Alert.alert('오류', msg);
            }
          },
        },
      ],
    );
  };

  const isSaving = createDept.isPending || updateDept.isPending;
  const modalWidth = Math.min(440, width - 32);

  // ─── 폼 내용 (데스크탑 우측 패널 / 모바일 모달 공유) ───────────────────

  const renderForm = () => (
    <View style={styles.formBody}>
      {rightMode === 'create' && (
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
            부서 코드 <Text style={{ color: '#EF4444' }}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text.primary,
                borderColor: theme.border.default,
                backgroundColor: theme.bg.surfaceAlt,
                fontFamily: WEB_FONT,
              },
            ]}
            value={form.deptCd}
            onChangeText={(v) => setForm((f) => ({ ...f, deptCd: v.toUpperCase() }))}
            placeholder="예: DEPT_001"
            placeholderTextColor={theme.text.muted}
            autoCapitalize="characters"
          />
        </View>
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
          부서명 <Text style={{ color: '#EF4444' }}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text.primary,
              borderColor: theme.border.default,
              backgroundColor: theme.bg.surfaceAlt,
              fontFamily: WEB_FONT,
            },
          ]}
          value={form.deptNm}
          onChangeText={(v) => setForm((f) => ({ ...f, deptNm: v }))}
          placeholder="부서명 입력"
          placeholderTextColor={theme.text.muted}
        />
      </View>

      {rightMode === 'create' && (
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
            상위 부서
          </Text>
          <View
            style={[
              styles.readonlyBox,
              { backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.default },
            ]}
          >
            <Text style={[styles.readonlyText, { color: theme.text.body, fontFamily: WEB_FONT }]}>
              {parentForCreate ? parentForCreate.deptNm : '없음 (최상위)'}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        onPress={handleSave}
        disabled={isSaving}
        style={[
          styles.saveBtn,
          { backgroundColor: theme.brand.primary },
          isSaving && styles.saveBtnDisabled,
        ]}
        activeOpacity={0.8}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={[styles.saveBtnText, { fontFamily: WEB_FONT }]}>저장</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => { setRightMode('idle'); setModalVisible(false); }}
        style={[styles.cancelBtn, { borderColor: theme.border.default }]}
        activeOpacity={0.7}
      >
        <Text style={[styles.cancelBtnText, { color: theme.text.body, fontFamily: WEB_FONT }]}>
          취소
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ─── 트리 패널 ───────────────────────────────────────────────────────────

  const renderTree = () => (
    <View style={[styles.treePanel, { borderRightColor: theme.border.default, backgroundColor: theme.bg.surface }]}>
      {/* 트리 헤더 */}
      <View style={[styles.treePanelHeader, { borderBottomColor: theme.border.subtle }]}>
        <Text style={[styles.treePanelTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
          조직도
        </Text>
        <TouchableOpacity
          onPress={handleAddRoot}
          style={[styles.addRootBtn, { backgroundColor: theme.brand.primaryTint }]}
          activeOpacity={0.7}
        >
          <Plus size={13} color={theme.brand.primary} />
          <Text style={[styles.addRootBtnText, { color: theme.brand.primary, fontFamily: WEB_FONT }]}>
            최상위 추가
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.brand.primary} />
        </View>
      ) : depts.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>
            등록된 부서가 없습니다.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.treeScroll} showsVerticalScrollIndicator={false}>
          {treeData.map((root) => (
            <TreeNode
              key={root.deptCd}
              node={root}
              selectedCd={selectedDept?.deptCd ?? null}
              onSelect={handleSelect}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );

  // ─── 우측 상세 패널 ──────────────────────────────────────────────────────

  const renderDetail = () => {
    if (rightMode === 'create' || rightMode === 'edit') {
      const title = rightMode === 'create'
        ? (parentForCreate ? `'${parentForCreate.deptNm}' 하위 부서 추가` : '최상위 부서 추가')
        : '부서 수정';

      return (
        <View style={styles.detailPanel}>
          <View style={[styles.detailHeader, { borderBottomColor: theme.border.subtle }]}>
            <Text style={[styles.detailTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={() => setRightMode('idle')} activeOpacity={0.7}>
              <X size={18} color={theme.text.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent}>
            {renderForm()}
          </ScrollView>
        </View>
      );
    }

    if (!selectedDept) {
      return (
        <View style={[styles.detailPanel, styles.centered]}>
          <Network size={40} color={theme.border.default} />
          <Text style={[styles.placeholderText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>
            부서를 선택하세요
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.detailPanel}>
        {/* 상세 헤더 */}
        <View style={[styles.detailHeader, { borderBottomColor: theme.border.subtle }]}>
          <View>
            <Text style={[styles.detailTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
              {selectedDept.deptNm}
            </Text>
            <Text style={[styles.detailSubtitle, { color: theme.text.muted, fontFamily: WEB_FONT }]}>
              {selectedDept.deptCd}
            </Text>
          </View>
          <View style={styles.detailActions}>
            <TouchableOpacity
              onPress={handleEdit}
              style={[styles.actionBtn, { backgroundColor: theme.brand.primaryTint }]}
              activeOpacity={0.7}
            >
              <Pencil size={14} color={theme.brand.primary} />
              <Text style={[styles.actionBtnText, { color: theme.brand.primary, fontFamily: WEB_FONT }]}>
                수정
              </Text>
            </TouchableOpacity>
            {selectedDept.useYn === 'Y' && (
              <TouchableOpacity
                onPress={handleDisable}
                style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}
                activeOpacity={0.7}
              >
                <EyeOff size={14} color="#EF4444" />
                <Text style={[styles.actionBtnText, { color: '#EF4444', fontFamily: WEB_FONT }]}>
                  비활성화
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 상세 정보 */}
        <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent}>
          <View style={[styles.infoCard, { backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.subtle }]}>
            <InfoRow label="부서 코드" value={selectedDept.deptCd} theme={theme} />
            <InfoRow label="부서명" value={selectedDept.deptNm} theme={theme} />
            <InfoRow
              label="상위 부서"
              value={selectedDept.upDeptCd
                ? (depts.find(d => d.deptCd === selectedDept.upDeptCd)?.deptNm ?? selectedDept.upDeptCd)
                : '없음 (최상위)'}
              theme={theme}
            />
            <InfoRow label="레벨" value={`${selectedDept.deptLvl}단계`} theme={theme} />
            <InfoRow
              label="상태"
              value={selectedDept.useYn === 'Y' ? '활성' : '비활성'}
              valueColor={selectedDept.useYn === 'Y' ? '#10B981' : '#EF4444'}
              theme={theme}
            />
          </View>

          {/* 하위 부서 추가 버튼 */}
          {selectedDept.useYn === 'Y' && (
            <TouchableOpacity
              onPress={handleAddChild}
              style={[
                styles.addChildBtn,
                { borderColor: theme.brand.primary, backgroundColor: theme.brand.primaryTint },
              ]}
              activeOpacity={0.8}
            >
              <Plus size={15} color={theme.brand.primary} />
              <Text style={[styles.addChildBtnText, { color: theme.brand.primary, fontFamily: WEB_FONT }]}>
                하위 부서 추가
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  // ─── 모바일 모달 (추가/수정 폼) ─────────────────────────────────────────

  const renderModal = () => {
    const title = rightMode === 'create'
      ? (parentForCreate ? `'${parentForCreate.deptNm}' 하위 추가` : '최상위 부서 추가')
      : '부서 수정';

    return (
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { width: modalWidth, backgroundColor: theme.bg.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border.subtle }]}>
              <Text style={[styles.modalTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
                {title}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setRightMode('idle'); }}>
                <X size={18} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {renderForm()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ─── 렌더 ────────────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg.app }]}>
        {/* 헤더 */}
        <View style={[styles.header, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }]}>
          {mobileView === 'detail' ? (
            <TouchableOpacity onPress={() => setMobileView('tree')} style={styles.backBtn} activeOpacity={0.7}>
              <ChevronLeft size={18} color={theme.brand.primary} />
              <Text style={[styles.backBtnText, { color: theme.brand.primary, fontFamily: WEB_FONT }]}>
                조직도
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.headerTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
              부서 관리
            </Text>
          )}
        </View>

        {mobileView === 'tree' ? renderTree() : renderDetail()}
        {renderModal()}
      </View>
    );
  }

  // 데스크탑: 좌측 트리 + 우측 상세
  return (
    <View style={[styles.container, { backgroundColor: theme.bg.app }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
          부서 관리
        </Text>
      </View>

      <View style={styles.body}>
        {renderTree()}
        {renderDetail()}
      </View>
    </View>
  );
}

// ─── 정보 행 컴포넌트 ────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  valueColor,
  theme,
}: {
  label: string;
  value: string;
  valueColor?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme: any;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.text.muted, fontFamily: WEB_FONT }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor ?? theme.text.primary, fontFamily: WEB_FONT }]}>
        {value}
      </Text>
    </View>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '600' },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtnText: { fontSize: 14, fontWeight: '500' },

  body: { flex: 1, flexDirection: 'row' },

  // ── 트리 패널 ─────────────────────────────────────────────────────────────
  treePanel: {
    width: 280,
    borderRightWidth: 1,
    flexDirection: 'column',
  },
  treePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  treePanelTitle: { fontSize: 13, fontWeight: '600' },
  addRootBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addRootBtnText: { fontSize: 11, fontWeight: '500' },
  treeScroll: { flex: 1 },

  // ── 트리 노드 ─────────────────────────────────────────────────────────────
  treeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingRight: 12,
    gap: 4,
  },
  expandBtn: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  expandPlaceholder: { width: 14 },
  nodeIcon: { flexShrink: 0 },
  treeNodeText: { flex: 1, fontSize: 13 },
  treeNodeTextActive: { fontWeight: '600' },
  treeNodeTextDisabled: { textDecorationLine: 'line-through' },
  disabledBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  disabledBadgeText: { fontSize: 9, fontWeight: '600' },

  // ── 상세 패널 ─────────────────────────────────────────────────────────────
  detailPanel: { flex: 1, flexDirection: 'column' },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  detailTitle: { fontSize: 15, fontWeight: '600' },
  detailSubtitle: { fontSize: 11, marginTop: 2 },
  detailActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnText: { fontSize: 12, fontWeight: '500' },
  detailScroll: { flex: 1 },
  detailScrollContent: { padding: 20, gap: 16 },

  // ── 정보 카드 ─────────────────────────────────────────────────────────────
  infoCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  infoLabel: { width: 80, fontSize: 12 },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '500' },

  // ── 하위 부서 추가 버튼 ───────────────────────────────────────────────────
  addChildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
  },
  addChildBtnText: { fontSize: 14, fontWeight: '500' },

  // ── 폼 ───────────────────────────────────────────────────────────────────
  formBody: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '500' },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  readonlyBox: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  readonlyText: { fontSize: 13 },
  saveBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cancelBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 14 },

  // ── 모달 ─────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 15, fontWeight: '600' },
  modalBody: { padding: 20, gap: 16 },

  // ── 기타 ─────────────────────────────────────────────────────────────────
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 13 },
  placeholderText: { fontSize: 13, marginTop: 8 },
});
