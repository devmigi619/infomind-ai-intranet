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
import { Plus, X, Pencil, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import {
  useJobGrades,
  useCreateJobGrade,
  useUpdateJobGrade,
  useDeleteJobGrade,
  type JobGrade,
  type CreateJobGradeRequest,
  type UpdateJobGradeRequest,
} from '../api';

type FormMode = 'create' | 'edit';

interface FormState {
  jbgdCd: string;
  jbgdNm: string;
  jbgdSn: string;
  useYn: string;
  rmk: string;
}

const EMPTY_FORM: FormState = {
  jbgdCd: '',
  jbgdNm: '',
  jbgdSn: '',
  useYn: 'Y',
  rmk: '',
};

export function AdminJobGradeScreen() {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { width } = useWindowDimensions();

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<string | null>(null);

  const { data: jobGrades = [], isLoading } = useJobGrades();
  const createJobGrade = useCreateJobGrade();
  const updateJobGrade = useUpdateJobGrade();
  const deleteJobGrade = useDeleteJobGrade();

  const openCreate = () => {
    setFormMode('create');
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setFormVisible(true);
  };

  const openEdit = (item: JobGrade) => {
    setFormMode('edit');
    setForm({
      jbgdCd: item.jbgdCd,
      jbgdNm: item.jbgdNm,
      jbgdSn: String(item.jbgdSn ?? ''),
      useYn: item.useYn,
      rmk: item.rmk ?? '',
    });
    setEditTarget(item.jbgdCd);
    setFormVisible(true);
  };

  const handleDisable = (item: JobGrade) => {
    Alert.alert('비활성화', `'${item.jbgdNm}' 직급을 비활성화하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '비활성화',
        style: 'destructive',
        onPress: () =>
          deleteJobGrade.mutate(item.jbgdCd, {
            onError: () => Alert.alert('오류', '비활성화에 실패했습니다.'),
          }),
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!form.jbgdNm.trim()) {
      Alert.alert('입력 오류', '직급명을 입력해주세요.');
      return;
    }
    try {
      if (formMode === 'create') {
        if (!form.jbgdCd.trim()) {
          Alert.alert('입력 오류', '직급 코드를 입력해주세요.');
          return;
        }
        const req: CreateJobGradeRequest = {
          jbgdCd: form.jbgdCd.trim().toUpperCase(),
          jbgdNm: form.jbgdNm.trim(),
          jbgdSn: form.jbgdSn ? Number(form.jbgdSn) : undefined,
          rmk: form.rmk.trim() || undefined,
        };
        await createJobGrade.mutateAsync(req);
      } else if (editTarget) {
        const req: UpdateJobGradeRequest = {
          jbgdNm: form.jbgdNm.trim(),
          jbgdSn: form.jbgdSn ? Number(form.jbgdSn) : undefined,
          useYn: form.useYn,
          rmk: form.rmk.trim() || undefined,
        };
        await updateJobGrade.mutateAsync({ jbgdCd: editTarget, data: req });
      }
      setFormVisible(false);
      setForm(EMPTY_FORM);
    } catch {
      Alert.alert('오류', '저장에 실패했습니다.');
    }
  };

  const s = createStyles(theme);
  const modalWidth = Math.min(400, width - 32);

  const renderRow = (item: JobGrade) => (
    <View key={item.jbgdCd} style={isMobile ? s.mobileCard : s.tableRow}>
      {isMobile ? (
        // 모바일: 카드형
        <>
          <View style={s.mobileCardTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.mobileCardName}>{item.jbgdNm}</Text>
              <Text style={s.mobileCardCode}>{item.jbgdCd}</Text>
              {item.jbgdSn != null && (
                <Text style={s.mobileCardMeta}>순서: {item.jbgdSn}</Text>
              )}
            </View>
            <View
              style={[
                s.statusBadge,
                { backgroundColor: item.useYn === 'Y' ? '#D1FAE5' : '#F3F4F6', alignSelf: 'flex-start' },
              ]}
            >
              <Text style={[s.statusText, { color: item.useYn === 'Y' ? '#065F46' : '#6B7280' }]}>
                {item.useYn === 'Y' ? '활성' : '비활성'}
              </Text>
            </View>
          </View>
          <View style={s.mobileCardActions}>
            <TouchableOpacity onPress={() => openEdit(item)} style={s.mobileActionBtn}>
              <Pencil size={14} color={theme.brand.primary} />
              <Text style={[s.mobileActionText, { color: theme.brand.primary }]}>수정</Text>
            </TouchableOpacity>
            {item.useYn === 'Y' && (
              <TouchableOpacity onPress={() => handleDisable(item)} style={s.mobileActionBtn}>
                <EyeOff size={14} color='#EF4444' />
                <Text style={[s.mobileActionText, { color: '#EF4444' }]}>비활성화</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        // 데스크탑: 테이블 행
        <>
          <Text style={[s.tableCell, s.cellCode]} numberOfLines={1}>{item.jbgdCd}</Text>
          <Text style={[s.tableCell, s.cellName]} numberOfLines={1}>{item.jbgdNm}</Text>
          <Text style={[s.tableCell, s.cellSn, s.mutedText]}>{item.jbgdSn ?? '-'}</Text>
          <View style={[s.tableCell, s.cellStatus]}>
            <View style={[s.statusBadge, { backgroundColor: item.useYn === 'Y' ? '#D1FAE5' : '#F3F4F6' }]}>
              <Text style={[s.statusText, { color: item.useYn === 'Y' ? '#065F46' : '#6B7280' }]}>
                {item.useYn === 'Y' ? '활성' : '비활성'}
              </Text>
            </View>
          </View>
          <View style={[s.tableCell, s.cellActions, s.actionsRow]}>
            <TouchableOpacity onPress={() => openEdit(item)} style={s.actionBtn}>
              <Pencil size={14} color={theme.brand.primary} />
            </TouchableOpacity>
            {item.useYn === 'Y' && (
              <TouchableOpacity onPress={() => handleDisable(item)} style={s.actionBtn}>
                <EyeOff size={14} color='#EF4444' />
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={s.root}>
      {/* 헤더 */}
      <View style={s.header}>
        <Text style={s.headerTitle}>직급 관리</Text>
        <TouchableOpacity onPress={openCreate} style={s.addBtn}>
          <Plus size={16} color={theme.brand.primary} />
          <Text style={s.addBtnText}>직급 추가</Text>
        </TouchableOpacity>
      </View>

      {/* 목록 */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.brand.primary} />
      ) : (
        <ScrollView contentContainerStyle={isMobile ? { paddingVertical: 8 } : undefined}>
          {/* 데스크탑 테이블 헤더 */}
          {!isMobile && (
            <View style={[s.tableRow, s.tableHeader]}>
              <Text style={[s.tableCell, s.cellCode, s.headerText]}>코드</Text>
              <Text style={[s.tableCell, s.cellName, s.headerText]}>직급명</Text>
              <Text style={[s.tableCell, s.cellSn, s.headerText]}>순서</Text>
              <Text style={[s.tableCell, s.cellStatus, s.headerText]}>상태</Text>
              <Text style={[s.tableCell, s.cellActions, s.headerText]}>관리</Text>
            </View>
          )}
          {jobGrades.map(renderRow)}
          {jobGrades.length === 0 && (
            <Text style={s.emptyText}>직급이 없습니다. 직급을 추가해보세요.</Text>
          )}
        </ScrollView>
      )}

      {/* 추가/수정 모달 */}
      <Modal visible={formVisible} transparent animationType="fade" onRequestClose={() => setFormVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { width: modalWidth }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {formMode === 'edit' ? '직급 수정' : '직급 추가'}
              </Text>
              <TouchableOpacity onPress={() => setFormVisible(false)}>
                <X size={20} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody}>
              {formMode === 'create' && (
                <View style={s.formRow}>
                  <Text style={s.label}>직급 코드 *</Text>
                  <TextInput
                    style={s.input}
                    value={form.jbgdCd}
                    onChangeText={(v) => setForm((f) => ({ ...f, jbgdCd: v.toUpperCase() }))}
                    placeholder="예: MGR"
                    autoCapitalize="characters"
                  />
                </View>
              )}

              <View style={s.formRow}>
                <Text style={s.label}>직급명 *</Text>
                <TextInput
                  style={s.input}
                  value={form.jbgdNm}
                  onChangeText={(v) => setForm((f) => ({ ...f, jbgdNm: v }))}
                  placeholder="예: 과장"
                />
              </View>

              <View style={s.formRow}>
                <Text style={s.label}>정렬 순서</Text>
                <TextInput
                  style={s.input}
                  value={form.jbgdSn}
                  onChangeText={(v) => setForm((f) => ({ ...f, jbgdSn: v.replace(/\D/g, '') }))}
                  placeholder="숫자 입력"
                  keyboardType="numeric"
                />
              </View>

              <View style={s.formRow}>
                <Text style={s.label}>비고</Text>
                <TextInput
                  style={[s.input, s.inputMultiline]}
                  value={form.rmk}
                  onChangeText={(v) => setForm((f) => ({ ...f, rmk: v }))}
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
                        <Text style={[s.toggleText, form.useYn === v && s.toggleTextActive]}>
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
                disabled={createJobGrade.isPending || updateJobGrade.isPending}
              >
                {(createJobGrade.isPending || updateJobGrade.isPending) ? (
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
    root: { flex: 1, backgroundColor: theme.bg.surface },
    // ── 헤더 ──────────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.default,
    },
    headerTitle: { fontSize: 15, fontWeight: '600' as const, color: theme.text.primary },
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
    addBtnText: { fontSize: 13, color: theme.brand.primary, fontWeight: '500' as const },
    // ── 테이블 (데스크탑) ──────────────────────────────────────────────────
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.border.subtle,
      paddingHorizontal: 20,
      minHeight: 44,
    },
    tableHeader: { backgroundColor: theme.bg.surfaceAlt ?? '#FAFAFA' },
    tableCell: { fontSize: 13, color: theme.text.primary, paddingVertical: 10 },
    headerText: { fontSize: 12, fontWeight: '600' as const, color: theme.text.muted },
    mutedText: { color: theme.text.muted },
    cellCode: { width: 100 },
    cellName: { flex: 1 },
    cellSn: { width: 60, textAlign: 'center' as const },
    cellStatus: { width: 70, alignItems: 'center' as const },
    cellActions: { width: 70 },
    actionsRow: { flexDirection: 'row', gap: 8 },
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
    mobileCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    mobileCardName: { fontSize: 14, fontWeight: '600' as const, color: theme.text.primary },
    mobileCardCode: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
    mobileCardMeta: { fontSize: 11, color: theme.text.muted, marginTop: 1 },
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
    mobileActionText: { fontSize: 12, fontWeight: '500' as const },
    // ── 공통 ──────────────────────────────────────────────────────────────
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
    statusText: { fontSize: 11, fontWeight: '600' as const },
    emptyText: {
      fontSize: 13,
      color: theme.text.muted,
      textAlign: 'center',
      paddingVertical: 40,
    },
    // ── 모달 ──────────────────────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBox: {
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
    modalTitle: { fontSize: 16, fontWeight: '600' as const, color: theme.text.primary },
    modalBody: { paddingHorizontal: 20, paddingTop: 12 },
    formRow: { marginBottom: 14 },
    label: { fontSize: 12, fontWeight: '600' as const, color: theme.text.muted, marginBottom: 6 },
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
    inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
    toggleRow: { flexDirection: 'row', gap: 8 },
    toggleBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border.default,
    },
    toggleBtnActive: { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary },
    toggleText: { fontSize: 13, color: theme.text.muted },
    toggleTextActive: { color: '#FFFFFF', fontWeight: '600' as const },
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
    btnCancelText: { fontSize: 14, color: theme.text.muted },
    btnSave: {
      paddingHorizontal: 20,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: theme.brand.primary,
      minWidth: 72,
      alignItems: 'center',
    },
    btnSaveText: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF' },
  });
}
