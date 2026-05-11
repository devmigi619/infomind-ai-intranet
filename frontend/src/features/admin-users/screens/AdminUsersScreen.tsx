import React, { useState } from 'react';
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
import { Plus, X, Pencil, EyeOff, Eye, Search, KeyRound } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useCodeList } from '../../../shared/hooks/useCodeList';
import { AppDropdown } from '../../../shared/components/AppDropdown';
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useResetPassword,
  useDisableUser,
  useEnableUser,
  type AdminUser,
  type CreateUserRequest,
  type UpdateUserRequest,
} from '../api';
import { useDepartments } from '../../admin-dept/api';
import { useJobGrades } from '../../admin-job-grade/api';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

type ModalMode = 'create' | 'edit' | 'reset-password' | null;

interface CreateForm {
  userId: string; userNm: string; pwd: string; userSe: string;
  deptCd: string; jbgdCd: string; eml: string; mtelno: string; hireYmd: string;
}
interface EditForm {
  userNm: string; userSe: string; deptCd: string; jbgdCd: string;
  eml: string; mtelno: string; hireYmd: string;
}

const EMPTY_CREATE: CreateForm = {
  userId: '', userNm: '', pwd: '', userSe: 'USER',
  deptCd: '', jbgdCd: '', eml: '', mtelno: '', hireYmd: '',
};
const EMPTY_EDIT: EditForm = {
  userNm: '', userSe: 'USER', deptCd: '', jbgdCd: '', eml: '', mtelno: '', hireYmd: '',
};

// ─── 배지 헬퍼 ──────────────────────────────────────────────────────────────

function roleBadge(userSe: string) {
  switch (userSe) {
    case 'ADMIN':   return { label: '관리자', bg: '#EFF6FF', text: '#1D4ED8' };
    case 'INVALID': return { label: '비활성',  bg: '#F3F4F6', text: '#6B7280' };
    default:        return { label: '일반',    bg: '#ECFDF5', text: '#065F46' };
  }
}

// ─── 메인 화면 ───────────────────────────────────────────────────────────────

export function AdminUsersScreen() {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { width } = useWindowDimensions();

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const { data: users = [], isLoading } = useAdminUsers(
    keyword.trim() || undefined,
    status,
  );
  const { data: depts = [] } = useDepartments();
  const { data: grades = [] } = useJobGrades();
  const roleOptions = useCodeList('USER_SE');

  const createUser  = useCreateUser();
  const updateUser  = useUpdateUser();
  const resetPwd    = useResetPassword();
  const disableUser = useDisableUser();
  const enableUser  = useEnableUser();

  const [modalMode, setModalMode]       = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [createForm, setCreateForm]     = useState<CreateForm>(EMPTY_CREATE);
  const [editForm, setEditForm]         = useState<EditForm>(EMPTY_EDIT);
  const [newPwd, setNewPwd]             = useState('');

  const modalWidth = Math.min(480, width - 32);
  const isSaving   = createUser.isPending || updateUser.isPending || resetPwd.isPending;

  // ─── 옵션 목록 ────────────────────────────────────────────────────────────

  const deptOptions = [
    { label: '없음', value: '' },
    ...depts.filter(d => d.useYn === 'Y').map(d => ({ label: d.deptNm, value: d.deptCd })),
  ];
  const gradeOptions = [
    { label: '없음', value: '' },
    ...grades.filter(g => g.useYn === 'Y').map(g => ({ label: g.jbgdNm, value: g.jbgdCd })),
  ];

  // ─── 열기 ─────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setCreateForm(EMPTY_CREATE);
    setModalMode('create');
  };

  const openEdit = (u: AdminUser) => {
    setSelectedUser(u);
    setEditForm({
      userNm: u.userNm ?? '',
      userSe: u.userSe ?? 'USER',
      deptCd: u.deptCd ?? '',
      jbgdCd: u.jbgdCd ?? '',
      eml: u.eml ?? '',
      mtelno: u.mtelno ?? '',
      hireYmd: u.hireYmd ?? '',
    });
    setModalMode('edit');
  };

  const openResetPwd = (u: AdminUser) => {
    setSelectedUser(u);
    setNewPwd('');
    setModalMode('reset-password');
  };

  const closeModal = () => { setModalMode(null); setSelectedUser(null); };

  // ─── 저장 ─────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createForm.userId.trim()) return Alert.alert('오류', '아이디를 입력해주세요.');
    if (!createForm.userNm.trim()) return Alert.alert('오류', '이름을 입력해주세요.');
    if (!createForm.pwd.trim())    return Alert.alert('오류', '비밀번호를 입력해주세요.');
    try {
      const req: CreateUserRequest = {
        userId:  createForm.userId.trim(),
        userNm:  createForm.userNm.trim(),
        pwd:     createForm.pwd,
        userSe:  createForm.userSe || 'USER',
        deptCd:  createForm.deptCd || undefined,
        jbgdCd:  createForm.jbgdCd || undefined,
        eml:     createForm.eml || undefined,
        mtelno:  createForm.mtelno || undefined,
        hireYmd: createForm.hireYmd || undefined,
      };
      await createUser.mutateAsync(req);
      closeModal();
    } catch (e: unknown) { Alert.alert('오류', e instanceof Error ? e.message : '생성 실패'); }
  };

  const handleUpdate = async () => {
    if (!editForm.userNm.trim()) return Alert.alert('오류', '이름을 입력해주세요.');
    try {
      const req: UpdateUserRequest = {
        userNm:  editForm.userNm.trim(),
        userSe:  editForm.userSe || undefined,
        deptCd:  editForm.deptCd || undefined,
        jbgdCd:  editForm.jbgdCd || undefined,
        eml:     editForm.eml || undefined,
        mtelno:  editForm.mtelno || undefined,
        hireYmd: editForm.hireYmd || undefined,
      };
      await updateUser.mutateAsync({ userId: selectedUser!.userId, data: req });
      closeModal();
    } catch (e: unknown) { Alert.alert('오류', e instanceof Error ? e.message : '수정 실패'); }
  };

  const handleResetPwd = async () => {
    if (!newPwd.trim()) return Alert.alert('오류', '새 비밀번호를 입력해주세요.');
    try {
      await resetPwd.mutateAsync({ userId: selectedUser!.userId, data: { newPassword: newPwd } });
      Alert.alert('완료', '비밀번호가 초기화됐습니다.');
      closeModal();
    } catch (e: unknown) { Alert.alert('오류', e instanceof Error ? e.message : '초기화 실패'); }
  };

  const handleDisable = (u: AdminUser) => {
    Alert.alert('비활성화', `'${u.userNm}' 계정을 비활성화하겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '비활성화', style: 'destructive', onPress: () => disableUser.mutate(u.userId) },
    ]);
  };

  const handleEnable = (u: AdminUser) => {
    Alert.alert('활성화', `'${u.userNm}' 계정을 활성화하겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '활성화', onPress: () => enableUser.mutate(u.userId) },
    ]);
  };

  // ─── 폼 필드 ──────────────────────────────────────────────────────────────

  const renderField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { placeholder?: string; secureTextEntry?: boolean; required?: boolean; readOnly?: boolean }
  ) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
        {label}{opts?.required && <Text style={{ color: '#EF4444' }}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          { color: theme.text.primary, borderColor: theme.border.default,
            backgroundColor: opts?.readOnly ? theme.bg.surfaceAlt : theme.bg.surface,
            fontFamily: WEB_FONT },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={opts?.placeholder ?? ''}
        placeholderTextColor={theme.text.muted}
        secureTextEntry={opts?.secureTextEntry}
        editable={!opts?.readOnly}
      />
    </View>
  );

  // ─── 모달 ─────────────────────────────────────────────────────────────────

  const renderModal = () => {
    if (!modalMode) return null;

    const titles: Record<string, string> = {
      create: '사용자 등록', edit: '사용자 수정', 'reset-password': '비밀번호 초기화',
    };

    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { width: modalWidth, backgroundColor: theme.bg.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border.subtle }]}>
              <Text style={[styles.modalTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
                {titles[modalMode]}
              </Text>
              <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
                <X size={18} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* ── 등록 폼 ── */}
              {modalMode === 'create' && (
                <>
                  {renderField('아이디', createForm.userId,
                    v => setCreateForm(f => ({ ...f, userId: v })),
                    { required: true, placeholder: '로그인 아이디' })}
                  {renderField('이름', createForm.userNm,
                    v => setCreateForm(f => ({ ...f, userNm: v })),
                    { required: true })}
                  {renderField('비밀번호', createForm.pwd,
                    v => setCreateForm(f => ({ ...f, pwd: v })),
                    { required: true, secureTextEntry: true })}
                  <AppDropdown
                    label="권한"
                    value={createForm.userSe}
                    onChange={v => setCreateForm(f => ({ ...f, userSe: v }))}
                    options={roleOptions}
                  />
                  <AppDropdown
                    label="부서"
                    value={createForm.deptCd}
                    onChange={v => setCreateForm(f => ({ ...f, deptCd: v }))}
                    options={deptOptions}
                    search={deptOptions.length > 6}
                  />
                  <AppDropdown
                    label="직급"
                    value={createForm.jbgdCd}
                    onChange={v => setCreateForm(f => ({ ...f, jbgdCd: v }))}
                    options={gradeOptions}
                  />
                  {renderField('이메일', createForm.eml,
                    v => setCreateForm(f => ({ ...f, eml: v })),
                    { placeholder: 'example@company.com' })}
                  {renderField('휴대폰', createForm.mtelno,
                    v => setCreateForm(f => ({ ...f, mtelno: v })),
                    { placeholder: '010-0000-0000' })}
                  {renderField('입사일', createForm.hireYmd,
                    v => setCreateForm(f => ({ ...f, hireYmd: v })),
                    { placeholder: 'YYYYMMDD' })}
                  <TouchableOpacity onPress={handleCreate} disabled={isSaving}
                    style={[styles.primaryBtn, { backgroundColor: theme.brand.primary }, isSaving && styles.btnDisabled]}
                    activeOpacity={0.8}>
                    {isSaving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={[styles.primaryBtnText, { fontFamily: WEB_FONT }]}>등록</Text>}
                  </TouchableOpacity>
                </>
              )}

              {/* ── 수정 폼 ── */}
              {modalMode === 'edit' && (
                <>
                  {renderField('아이디', selectedUser?.userId ?? '', () => {}, { readOnly: true })}
                  {renderField('이름', editForm.userNm,
                    v => setEditForm(f => ({ ...f, userNm: v })),
                    { required: true })}
                  <AppDropdown
                    label="권한"
                    value={editForm.userSe}
                    onChange={v => setEditForm(f => ({ ...f, userSe: v }))}
                    options={roleOptions}
                  />
                  <AppDropdown
                    label="부서"
                    value={editForm.deptCd}
                    onChange={v => setEditForm(f => ({ ...f, deptCd: v }))}
                    options={deptOptions}
                    search={deptOptions.length > 6}
                  />
                  <AppDropdown
                    label="직급"
                    value={editForm.jbgdCd}
                    onChange={v => setEditForm(f => ({ ...f, jbgdCd: v }))}
                    options={gradeOptions}
                  />
                  {renderField('이메일', editForm.eml,
                    v => setEditForm(f => ({ ...f, eml: v })))}
                  {renderField('휴대폰', editForm.mtelno,
                    v => setEditForm(f => ({ ...f, mtelno: v })))}
                  {renderField('입사일', editForm.hireYmd,
                    v => setEditForm(f => ({ ...f, hireYmd: v })),
                    { placeholder: 'YYYYMMDD' })}
                  <TouchableOpacity onPress={handleUpdate} disabled={isSaving}
                    style={[styles.primaryBtn, { backgroundColor: theme.brand.primary }, isSaving && styles.btnDisabled]}
                    activeOpacity={0.8}>
                    {isSaving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={[styles.primaryBtnText, { fontFamily: WEB_FONT }]}>저장</Text>}
                  </TouchableOpacity>
                  <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
                  <TouchableOpacity
                    onPress={() => { closeModal(); openResetPwd(selectedUser!); }}
                    style={[styles.secondaryBtn, { borderColor: theme.border.default }]}
                    activeOpacity={0.7}>
                    <KeyRound size={14} color={theme.text.body} />
                    <Text style={[styles.secondaryBtnText, { color: theme.text.body, fontFamily: WEB_FONT }]}>
                      비밀번호 초기화
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ── 비밀번호 초기화 ── */}
              {modalMode === 'reset-password' && (
                <>
                  {renderField('대상', selectedUser?.userNm ?? '', () => {}, { readOnly: true })}
                  {renderField('새 비밀번호', newPwd, setNewPwd,
                    { required: true, secureTextEntry: true, placeholder: '새 비밀번호 입력' })}
                  <TouchableOpacity onPress={handleResetPwd} disabled={isSaving}
                    style={[styles.primaryBtn, { backgroundColor: theme.brand.primary }, isSaving && styles.btnDisabled]}
                    activeOpacity={0.8}>
                    {isSaving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={[styles.primaryBtnText, { fontFamily: WEB_FONT }]}>초기화</Text>}
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity onPress={closeModal}
                style={[styles.cancelBtn, { borderColor: theme.border.default }]}
                activeOpacity={0.7}>
                <Text style={[styles.cancelBtnText, { color: theme.text.body, fontFamily: WEB_FONT }]}>취소</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ─── 관리 버튼 ────────────────────────────────────────────────────────────

  const renderActions = (u: AdminUser) => (
    <View style={styles.actionRow}>
      <TouchableOpacity onPress={() => openEdit(u)}
        style={[styles.iconBtn, { backgroundColor: theme.brand.primaryTint }]} activeOpacity={0.7}>
        <Pencil size={13} color={theme.brand.primary} />
      </TouchableOpacity>
      {u.userSe === 'INVALID' ? (
        <TouchableOpacity onPress={() => handleEnable(u)}
          style={[styles.iconBtn, { backgroundColor: '#ECFDF5' }]} activeOpacity={0.7}>
          <Eye size={13} color="#10B981" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => handleDisable(u)}
          style={[styles.iconBtn, { backgroundColor: '#FEF2F2' }]} activeOpacity={0.7}>
          <EyeOff size={13} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── 검색/필터 바 ─────────────────────────────────────────────────────────

  const renderSearchBar = () => (
    <View style={styles.searchBar}>
      <View style={[styles.searchInputWrap, { borderColor: theme.border.default, backgroundColor: theme.bg.surface }]}>
        <Search size={14} color={theme.text.muted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text.primary, fontFamily: WEB_FONT }]}
          value={keyword}
          onChangeText={setKeyword}
          placeholder="이름 또는 아이디 검색"
          placeholderTextColor={theme.text.muted}
        />
        {keyword.length > 0 && (
          <TouchableOpacity onPress={() => setKeyword('')} activeOpacity={0.7}>
            <X size={13} color={theme.text.muted} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.filterRow}>
        {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
          <TouchableOpacity key={s} onPress={() => setStatus(s)}
            style={[styles.filterBtn,
              status === s && { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary },
              { borderColor: theme.border.default }]}
            activeOpacity={0.7}>
            <Text style={[styles.filterBtnText,
              { color: status === s ? '#fff' : theme.text.body, fontFamily: WEB_FONT }]}>
              {s === 'ALL' ? '전체' : s === 'ACTIVE' ? '활성' : '비활성'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ─── 데스크탑 테이블 ──────────────────────────────────────────────────────

  const deptName  = (cd: string | null) => cd ? (depts.find(d => d.deptCd === cd)?.deptNm ?? cd) : '-';
  const gradeName = (cd: string | null) => cd ? (grades.find(g => g.jbgdCd === cd)?.jbgdNm ?? cd) : '-';

  const renderTable = () => (
    <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.tableHeader, { backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.default }]}>
        {['아이디', '이름', '부서', '직급', '권한', '관리'].map((h, i) => (
          <Text key={h} style={[styles.th, { color: theme.text.subtle, fontFamily: WEB_FONT,
            flex: [1.2, 1, 1, 0.8, 0.8, 0.8][i] }]}>{h}</Text>
        ))}
      </View>
      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.brand.primary} /></View>
      ) : users.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>
            {keyword ? '검색 결과가 없습니다.' : '등록된 사용자가 없습니다.'}
          </Text>
        </View>
      ) : users.map((u, idx) => {
        const badge = roleBadge(u.userSe);
        return (
          <View key={u.userId} style={[styles.tableRow,
            { borderBottomColor: theme.border.subtle },
            idx % 2 === 1 && { backgroundColor: theme.bg.surfaceAlt }]}>
            <Text style={[styles.td, { flex: 1.2, color: theme.text.primary, fontFamily: WEB_FONT }]} numberOfLines={1}>{u.userId}</Text>
            <Text style={[styles.td, { flex: 1,   color: theme.text.primary, fontFamily: WEB_FONT }]} numberOfLines={1}>{u.userNm ?? '-'}</Text>
            <Text style={[styles.td, { flex: 1,   color: theme.text.body,    fontFamily: WEB_FONT }]} numberOfLines={1}>{deptName(u.deptCd)}</Text>
            <Text style={[styles.td, { flex: 0.8, color: theme.text.body,    fontFamily: WEB_FONT }]} numberOfLines={1}>{gradeName(u.jbgdCd)}</Text>
            <View style={[styles.td, { flex: 0.8 }]}>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text, fontFamily: WEB_FONT }]}>{badge.label}</Text>
              </View>
            </View>
            <View style={[styles.td, { flex: 0.8 }]}>{renderActions(u)}</View>
          </View>
        );
      })}
    </ScrollView>
  );

  // ─── 모바일 카드 ──────────────────────────────────────────────────────────

  const renderCards = () => (
    <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent}
      showsVerticalScrollIndicator={false}>
      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.brand.primary} /></View>
      ) : users.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>
            {keyword ? '검색 결과가 없습니다.' : '등록된 사용자가 없습니다.'}
          </Text>
        </View>
      ) : users.map((u) => {
        const badge = roleBadge(u.userSe);
        return (
          <View key={u.userId} style={[styles.card,
            { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: theme.text.primary, fontFamily: WEB_FONT }]}>{u.userNm ?? '-'}</Text>
                <Text style={[styles.cardId,   { color: theme.text.muted,   fontFamily: WEB_FONT }]}>{u.userId}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text, fontFamily: WEB_FONT }]}>{badge.label}</Text>
              </View>
            </View>
            {(u.deptCd || u.jbgdCd) && (
              <Text style={[styles.cardMeta, { color: theme.text.body, fontFamily: WEB_FONT }]}>
                {[deptName(u.deptCd), gradeName(u.jbgdCd)].filter(v => v !== '-').join(' · ')}
              </Text>
            )}
            <View style={styles.cardActions}>{renderActions(u)}</View>
          </View>
        );
      })}
    </ScrollView>
  );

  // ─── 렌더 ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.app }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
          사용자 관리
        </Text>
        <TouchableOpacity onPress={openCreate}
          style={[styles.addBtn, { backgroundColor: theme.brand.primary }]} activeOpacity={0.8}>
          <Plus size={14} color="#fff" />
          <Text style={[styles.addBtnText, { fontFamily: WEB_FONT }]}>사용자 추가</Text>
        </TouchableOpacity>
      </View>

      {/* 검색/필터 */}
      {renderSearchBar()}

      {/* 목록 */}
      {isMobile ? renderCards() : renderTable()}

      {/* 모달 */}
      {renderModal()}
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // 검색
  searchBar: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    gap: 8, paddingHorizontal: 16, paddingVertical: 10,
  },
  searchInputWrap: {
    flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center',
    gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, height: 36,
  },
  searchInput: { flex: 1, fontSize: 13 },
  filterRow: { flexDirection: 'row', gap: 6 },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1,
  },
  filterBtnText: { fontSize: 12, fontWeight: '500' },

  // 데스크탑 테이블
  tableScroll: { flex: 1 },
  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  th: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  td: { fontSize: 13, alignItems: 'flex-start', justifyContent: 'center' },

  // 모바일 카드
  cardScroll: { flex: 1 },
  cardContent: { padding: 12, gap: 10 },
  card: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { gap: 2 },
  cardName: { fontSize: 14, fontWeight: '600' },
  cardId:   { fontSize: 12 },
  cardMeta: { fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },

  // 배지
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  // 관리 버튼
  actionRow: { flexDirection: 'row', gap: 6 },
  iconBtn:   { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  // 모달
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { borderRadius: 16, overflow: 'hidden', maxHeight: '85%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 15, fontWeight: '600' },
  modalBody:  { padding: 20, gap: 14 },

  // 폼
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '500' },
  input: { height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 13 },
  divider: { height: 1, marginVertical: 4 },

  // 버튼
  primaryBtn: {
    height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnDisabled:    { opacity: 0.6 },
  secondaryBtn: {
    height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, flexDirection: 'row', gap: 6,
  },
  secondaryBtnText: { fontSize: 13 },
  cancelBtn: {
    height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  cancelBtnText: { fontSize: 14 },

  // 기타
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 13 },
});
