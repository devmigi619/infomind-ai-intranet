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
} from 'react-native';
import { Plus, X, Pencil, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import {
  useCategories,
  useCommonCodes,
  useCreateCode,
  useUpdateCode,
  useDeleteCode,
  type CommonCode,
  type CreateCodeRequest,
  type UpdateCodeRequest,
} from '../api';

type FormMode = 'create' | 'edit';

interface CodeFormState {
  upCd: string;
  cd: string;
  cdNm: string;
  cdOrd: string;
  cdRmk: string;
  engCdNm: string;
  useYn: string;
}

const EMPTY_FORM: CodeFormState = {
  upCd: '',
  cd: '',
  cdNm: '',
  cdOrd: '',
  cdRmk: '',
  engCdNm: '',
  useYn: 'Y',
};

export function AdminCommonCodeScreen() {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { width } = useWindowDimensions();
  // 모바일: 'list' = 상위코드 목록, 'codes' = 하위코드 목록
  const [mobileView, setMobileView] = useState<'list' | 'codes'>('list');
  const [selectedUpCd, setSelectedUpCd] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formIsCategory, setFormIsCategory] = useState(false);
  const [form, setForm] = useState<CodeFormState>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<{ upCd: string; cd: string } | null>(null);

  const { data: categories = [], isLoading: catLoading } = useCategories();
  const { data: codes = [], isLoading: codesLoading } = useCommonCodes(selectedUpCd ?? '');
  const createCode = useCreateCode();
  const updateCode = useUpdateCode();
  const deleteCode = useDeleteCode();

  const handleSelectUpCd = (upCd: string) => {
    setSelectedUpCd(upCd);
    if (isMobile) setMobileView('codes');
  };

  const handleMobileBack = () => {
    setMobileView('list');
  };

  const openCreateCategory = () => {
    setFormMode('create');
    setFormIsCategory(true);
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setFormVisible(true);
  };

  const openCreateCode = () => {
    setFormMode('create');
    setFormIsCategory(false);
    setForm({ ...EMPTY_FORM, upCd: selectedUpCd ?? '' });
    setEditTarget(null);
    setFormVisible(true);
  };

  const openEdit = (code: CommonCode) => {
    setFormMode('edit');
    setFormIsCategory(code.upCd === code.cd);
    setForm({
      upCd: code.upCd,
      cd: code.cd,
      cdNm: code.cdNm,
      cdOrd: String(code.cdOrd ?? ''),
      cdRmk: code.cdRmk ?? '',
      engCdNm: code.engCdNm ?? '',
      useYn: code.useYn,
    });
    setEditTarget({ upCd: code.upCd, cd: code.cd });
    setFormVisible(true);
  };

  const handleDisable = (code: CommonCode) => {
    Alert.alert('비활성화', `'${code.cdNm}' 코드를 비활성화하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '비활성화',
        style: 'destructive',
        onPress: () =>
          deleteCode.mutate(
            { upCd: code.upCd, cd: code.cd },
            { onError: () => Alert.alert('오류', '비활성화에 실패했습니다.') },
          ),
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!form.cdNm.trim()) {
      Alert.alert('입력 오류', '코드명을 입력해주세요.');
      return;
    }

    try {
      if (formMode === 'create') {
        const upCd = formIsCategory ? form.cd.trim() : form.upCd.trim();
        if (!form.cd.trim()) {
          Alert.alert('입력 오류', '코드값을 입력해주세요.');
          return;
        }
        const req: CreateCodeRequest = {
          upCd,
          cd: form.cd.trim(),
          cdNm: form.cdNm.trim(),
          cdOrd: form.cdOrd ? Number(form.cdOrd) : undefined,
          cdRmk: form.cdRmk.trim() || undefined,
          engCdNm: form.engCdNm.trim() || undefined,
        };
        await createCode.mutateAsync(req);
      } else if (editTarget) {
        const req: UpdateCodeRequest = {
          cdNm: form.cdNm.trim(),
          useYn: form.useYn,
          cdOrd: form.cdOrd ? Number(form.cdOrd) : undefined,
          cdRmk: form.cdRmk.trim() || undefined,
          engCdNm: form.engCdNm.trim() || undefined,
        };
        await updateCode.mutateAsync({ upCd: editTarget.upCd, cd: editTarget.cd, data: req });
      }
      setFormVisible(false);
      setForm(EMPTY_FORM);
    } catch {
      Alert.alert('오류', '저장에 실패했습니다.');
    }
  };

  const s = createStyles(theme);
  const modalWidth = Math.min(440, width - 32);

  // ── 상위코드 목록 (사이드바 / 모바일 전체화면) ─────────────────────────
  const renderUpCdList = () => (
    <View style={[s.sidebar, isMobile && s.sidebarMobile]}>
      <View style={s.sidebarHeader}>
        <Text style={s.sidebarTitle}>상위코드</Text>
        <TouchableOpacity onPress={openCreateCategory} style={s.addBtn}>
          <Plus size={16} color={theme.brand.primary} />
        </TouchableOpacity>
      </View>
      {catLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={theme.brand.primary} />
      ) : (
        <ScrollView>
          {categories.map((cat) => {
            const isSelected = selectedUpCd === cat.upCd;
            return (
              <TouchableOpacity
                key={cat.upCd}
                style={[s.categoryItem, isSelected && s.categoryItemActive]}
                onPress={() => handleSelectUpCd(cat.upCd)}
                activeOpacity={0.7}
              >
                <View style={s.categoryRow}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[s.categoryText, isSelected && s.categoryTextActive]}
                      numberOfLines={1}
                    >
                      {cat.cdNm}
                    </Text>
                    <Text style={s.categoryCode}>{cat.upCd}</Text>
                    {cat.useYn === 'N' && <Text style={s.inactiveTag}>비활성</Text>}
                  </View>
                  {isMobile && (
                    <ChevronRight size={16} color={isSelected ? theme.brand.primary : theme.text.muted} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          {categories.length === 0 && (
            <Text style={s.emptyText}>상위코드가 없습니다</Text>
          )}
        </ScrollView>
      )}
    </View>
  );

  // ── 하위코드 목록 (메인 / 모바일 전체화면) ───────────────────────────────
  const renderCodeList = () => (
    <View style={[s.main, isMobile && s.mainMobile]}>
      <View style={s.mainHeader}>
        {isMobile && (
          <TouchableOpacity onPress={handleMobileBack} style={s.backBtn}>
            <ChevronLeft size={20} color={theme.brand.primary} />
          </TouchableOpacity>
        )}
        <Text style={s.mainTitle}>
          {selectedUpCd
            ? `${categories.find((c) => c.upCd === selectedUpCd)?.cdNm ?? selectedUpCd} 코드`
            : '상위코드를 선택하세요'}
        </Text>
        {selectedUpCd && (
          <TouchableOpacity onPress={openCreateCode} style={s.addBtn}>
            <Plus size={16} color={theme.brand.primary} />
            <Text style={s.addBtnText}>코드 추가</Text>
          </TouchableOpacity>
        )}
      </View>

      {!selectedUpCd ? (
        <View style={s.emptyState}>
          <Text style={s.emptyStateText}>상위코드를 선택하세요</Text>
        </View>
      ) : codesLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={theme.brand.primary} />
      ) : isMobile ? (
        // 모바일: 카드형 목록
        <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
          {codes.map((code) => (
            <View key={code.cd} style={s.mobileCard}>
              <View style={s.mobileCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.mobileCardName}>{code.cdNm}</Text>
                  <Text style={s.mobileCardCode}>{code.cd}</Text>
                  {!!code.engCdNm && (
                    <Text style={s.mobileCardEng}>{code.engCdNm}</Text>
                  )}
                </View>
                <View
                  style={[
                    s.statusBadge,
                    { backgroundColor: code.useYn === 'Y' ? '#D1FAE5' : '#F3F4F6', alignSelf: 'flex-start' },
                  ]}
                >
                  <Text
                    style={[s.statusText, { color: code.useYn === 'Y' ? '#065F46' : '#6B7280' }]}
                  >
                    {code.useYn === 'Y' ? '활성' : '비활성'}
                  </Text>
                </View>
              </View>
              <View style={s.mobileCardActions}>
                <TouchableOpacity onPress={() => openEdit(code)} style={s.mobileActionBtn}>
                  <Pencil size={14} color={theme.brand.primary} />
                  <Text style={[s.mobileActionText, { color: theme.brand.primary }]}>수정</Text>
                </TouchableOpacity>
                {code.useYn === 'Y' && (
                  <TouchableOpacity onPress={() => handleDisable(code)} style={s.mobileActionBtn}>
                    <EyeOff size={14} color='#EF4444' />
                    <Text style={[s.mobileActionText, { color: '#EF4444' }]}>비활성화</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          {codes.length === 0 && (
            <Text style={s.emptyText}>코드가 없습니다. 코드를 추가해보세요.</Text>
          )}
        </ScrollView>
      ) : (
        // 데스크탑: 테이블형
        <ScrollView>
          <View style={[s.tableRow, s.tableHeader]}>
            <Text style={[s.tableCell, s.cellCode, s.headerText]}>코드값</Text>
            <Text style={[s.tableCell, s.cellName, s.headerText]}>코드명</Text>
            <Text style={[s.tableCell, s.cellEng, s.headerText]}>영문명</Text>
            <Text style={[s.tableCell, s.cellOrd, s.headerText]}>순서</Text>
            <Text style={[s.tableCell, s.cellStatus, s.headerText]}>상태</Text>
            <Text style={[s.tableCell, s.cellActions, s.headerText]}>관리</Text>
          </View>
          {codes.map((code) => (
            <View key={code.cd} style={s.tableRow}>
              <Text style={[s.tableCell, s.cellCode]} numberOfLines={1}>
                {code.cd}
              </Text>
              <Text style={[s.tableCell, s.cellName]} numberOfLines={1}>
                {code.cdNm}
              </Text>
              <Text style={[s.tableCell, s.cellEng, s.mutedText]} numberOfLines={1}>
                {code.engCdNm ?? '-'}
              </Text>
              <Text style={[s.tableCell, s.cellOrd, s.mutedText]}>
                {code.cdOrd ?? '-'}
              </Text>
              <View style={[s.tableCell, s.cellStatus]}>
                <View
                  style={[
                    s.statusBadge,
                    { backgroundColor: code.useYn === 'Y' ? '#D1FAE5' : '#F3F4F6' },
                  ]}
                >
                  <Text
                    style={[
                      s.statusText,
                      { color: code.useYn === 'Y' ? '#065F46' : '#6B7280' },
                    ]}
                  >
                    {code.useYn === 'Y' ? '활성' : '비활성'}
                  </Text>
                </View>
              </View>
              <View style={[s.tableCell, s.cellActions, s.actionsRow]}>
                <TouchableOpacity onPress={() => openEdit(code)} style={s.actionBtn}>
                  <Pencil size={14} color={theme.brand.primary} />
                </TouchableOpacity>
                {code.useYn === 'Y' && (
                  <TouchableOpacity onPress={() => handleDisable(code)} style={s.actionBtn}>
                    <EyeOff size={14} color='#EF4444' />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          {codes.length === 0 && (
            <Text style={s.emptyText}>코드가 없습니다. 코드를 추가해보세요.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={s.root}>
      {isMobile ? (
        // 모바일: 단계형 뷰 (상위코드 목록 → 하위코드 목록)
        mobileView === 'list' ? renderUpCdList() : renderCodeList()
      ) : (
        // 데스크탑: 사이드바 + 메인 병렬 레이아웃
        <>
          {renderUpCdList()}
          {renderCodeList()}
        </>
      )}

      {/* 코드 추가/수정 모달 */}
      <Modal visible={formVisible} transparent animationType="fade" onRequestClose={() => setFormVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { width: modalWidth }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {formMode === 'edit'
                  ? `코드 수정`
                  : formIsCategory
                    ? '상위코드 추가'
                    : '코드 추가'}
              </Text>
              <TouchableOpacity onPress={() => setFormVisible(false)}>
                <X size={20} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody}>
              {/* 상위코드 추가 또는 코드 추가(create)일 때만 cd 입력 */}
              {formMode === 'create' && (
                <>
                  {!formIsCategory && (
                    <View style={s.formRow}>
                      <Text style={s.label}>상위코드</Text>
                      <TextInput
                        style={[s.input, s.inputDisabled]}
                        value={form.upCd}
                        editable={false}
                      />
                    </View>
                  )}
                  <View style={s.formRow}>
                    <Text style={s.label}>코드값 *</Text>
                    <TextInput
                      style={s.input}
                      value={form.cd}
                      onChangeText={(v) => setForm((f) => ({ ...f, cd: v.toUpperCase() }))}
                      placeholder="예: ADMIN"
                      autoCapitalize="characters"
                    />
                  </View>
                </>
              )}

              <View style={s.formRow}>
                <Text style={s.label}>코드명 *</Text>
                <TextInput
                  style={s.input}
                  value={form.cdNm}
                  onChangeText={(v) => setForm((f) => ({ ...f, cdNm: v }))}
                  placeholder="코드명을 입력하세요"
                />
              </View>

              <View style={s.formRow}>
                <Text style={s.label}>영문명</Text>
                <TextInput
                  style={s.input}
                  value={form.engCdNm}
                  onChangeText={(v) => setForm((f) => ({ ...f, engCdNm: v }))}
                  placeholder="English name"
                />
              </View>

              <View style={s.formRow}>
                <Text style={s.label}>정렬순서</Text>
                <TextInput
                  style={s.input}
                  value={form.cdOrd}
                  onChangeText={(v) => setForm((f) => ({ ...f, cdOrd: v.replace(/\D/g, '') }))}
                  placeholder="숫자 입력"
                  keyboardType="numeric"
                />
              </View>

              <View style={s.formRow}>
                <Text style={s.label}>비고</Text>
                <TextInput
                  style={[s.input, s.inputMultiline]}
                  value={form.cdRmk}
                  onChangeText={(v) => setForm((f) => ({ ...f, cdRmk: v }))}
                  placeholder="비고 입력"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {formMode === 'edit' && (
                <View style={s.formRow}>
                  <Text style={s.label}>사용여부</Text>
                  <View style={s.toggleRow}>
                    {['Y', 'N'].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[s.toggleBtn, form.useYn === v && s.toggleBtnActive]}
                        onPress={() => setForm((f) => ({ ...f, useYn: v }))}
                      >
                        <Text
                          style={[s.toggleText, form.useYn === v && s.toggleTextActive]}
                        >
                          {v === 'Y' ? '활성' : '비활성'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setFormVisible(false)}>
                <Text style={s.btnCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.btnSave}
                onPress={handleSubmit}
                disabled={createCode.isPending || updateCode.isPending}
              >
                {(createCode.isPending || updateCode.isPending) ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.btnSaveText}>저장</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createStyles(theme: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: theme.bg.app,
    },
    // ── 사이드바 ──────────────────────────────────────────────────────────
    sidebar: {
      width: 220,
      backgroundColor: theme.bg.surface,
      borderRightWidth: 1,
      borderRightColor: theme.border.default,
    },
    // 모바일: 전체 너비
    sidebarMobile: {
      width: undefined,
      flex: 1,
      borderRightWidth: 0,
    },
    sidebarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.default,
    },
    sidebarTitle: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: theme.text.primary,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.subtle,
    },
    categoryItemActive: {
      backgroundColor: theme.brand.primaryTint,
    },
    categoryText: {
      fontSize: 13,
      color: theme.text.primary,
      fontWeight: '500' as const,
    },
    categoryTextActive: {
      color: theme.brand.primary,
      fontWeight: '600' as const,
    },
    categoryCode: {
      fontSize: 11,
      color: theme.text.muted,
      marginTop: 2,
    },
    inactiveTag: {
      fontSize: 10,
      color: '#9CA3AF',
      marginTop: 2,
    },
    // ── 메인 ─────────────────────────────────────────────────────────────
    main: {
      flex: 1,
      backgroundColor: theme.bg.surface,
    },
    mainMobile: {
      flex: 1,
    },
    mainHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.default,
    },
    mainTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: theme.text.primary,
      flex: 1,
    },
    backBtn: {
      padding: 4,
      marginRight: 8,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.brand.primary,
    },
    addBtnText: {
      fontSize: 13,
      color: theme.brand.primary,
      fontWeight: '500' as const,
    },
    // ── 테이블 (데스크탑) ──────────────────────────────────────────────────
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.border.subtle,
      paddingHorizontal: 20,
      minHeight: 44,
    },
    tableHeader: {
      backgroundColor: theme.bg.surfaceAlt ?? '#FAFAFA',
    },
    tableCell: {
      fontSize: 13,
      color: theme.text.primary,
      paddingVertical: 10,
    },
    headerText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: theme.text.muted,
    },
    mutedText: {
      color: theme.text.muted,
    },
    cellCode: { width: 100 },
    cellName: { flex: 1 },
    cellEng: { width: 120 },
    cellOrd: { width: 50, textAlign: 'center' as const },
    cellStatus: { width: 70, alignItems: 'center' as const },
    cellActions: { width: 70 },
    actionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      padding: 6,
      borderRadius: 6,
      backgroundColor: theme.bg.surfaceAlt ?? '#F5F5F5',
    },
    // ── 카드 (모바일) ──────────────────────────────────────────────────────
    mobileCard: {
      marginHorizontal: 12,
      marginVertical: 6,
      padding: 14,
      borderRadius: 12,
      backgroundColor: theme.bg.surface,
      borderWidth: 1,
      borderColor: theme.border.subtle,
    },
    mobileCardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    mobileCardName: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: theme.text.primary,
    },
    mobileCardCode: {
      fontSize: 12,
      color: theme.text.muted,
      marginTop: 2,
    },
    mobileCardEng: {
      fontSize: 11,
      color: theme.text.muted,
      marginTop: 1,
    },
    mobileCardActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border.subtle,
      paddingTop: 10,
    },
    mobileActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border.default,
    },
    mobileActionText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    // ── 공통 ──────────────────────────────────────────────────────────────
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 20,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.text.muted,
    },
    emptyText: {
      fontSize: 13,
      color: theme.text.muted,
      textAlign: 'center',
      paddingVertical: 32,
    },
    // ── 모달 ──────────────────────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBox: {
      // width는 인라인 스타일로 동적 적용 (Math.min(440, screenWidth - 32))
      maxHeight: '80%' as unknown as number,
      backgroundColor: theme.bg.surface,
      borderRadius: 16,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.default,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: theme.text.primary,
    },
    modalBody: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    formRow: {
      marginBottom: 14,
    },
    label: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: theme.text.muted,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border.default,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 14,
      color: theme.text.primary,
      backgroundColor: theme.bg.surface,
    },
    inputDisabled: {
      backgroundColor: theme.bg.surfaceAlt ?? '#F5F5F5',
      color: theme.text.muted,
    },
    inputMultiline: {
      minHeight: 72,
      textAlignVertical: 'top',
    },
    toggleRow: {
      flexDirection: 'row',
      gap: 8,
    },
    toggleBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border.default,
    },
    toggleBtnActive: {
      backgroundColor: theme.brand.primary,
      borderColor: theme.brand.primary,
    },
    toggleText: {
      fontSize: 13,
      color: theme.text.muted,
    },
    toggleTextActive: {
      color: '#FFFFFF',
      fontWeight: '600' as const,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border.default,
    },
    btnCancel: {
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border.default,
    },
    btnCancelText: {
      fontSize: 14,
      color: theme.text.muted,
    },
    btnSave: {
      paddingHorizontal: 20,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: theme.brand.primary,
      minWidth: 72,
      alignItems: 'center',
    },
    btnSaveText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
  });
}
