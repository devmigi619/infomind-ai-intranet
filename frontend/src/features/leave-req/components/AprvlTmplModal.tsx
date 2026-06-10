/**
 * AprvlTmplModal — 결재선 템플릿 관리 모달 (공용)
 *
 * 사용처: LeaveReqFormScreen > AprvLineModal 내 "불러오기" 버튼
 * 향후 다른 결재 화면에서도 재사용 가능.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import {
  X,
  ChevronLeft,
  BookmarkPlus,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useToast } from '../../../shared/hooks/useToast';
import {
  useUserAprvlTmplList,
  useCreateUserAprvlTmpl,
  useUpdateUserAprvlTmpl,
  useDeleteUserAprvlTmpl,
  type UserAprvlTmplDto,
  type AprvEntry,
} from '../api';
import { AprvLineEditorPanel } from './AprvLineEditorPanel';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type TmplView = 'list' | 'edit';

interface EditState {
  aprvlId: string | null;   // null = 신규 생성
  aprvlNm: string;
  aprvList: AprvEntry[];
  refList: AprvEntry[];
  deptRefYn: boolean;
}

export interface AprvlTmplModalProps {
  visible: boolean;
  currentAprvList: AprvEntry[];
  currentRefList: AprvEntry[];
  currentDeptRefYn?: boolean;
  onApply: (aprvList: AprvEntry[], refList: AprvEntry[], deptRefYn: boolean) => void;
  onClose: () => void;
}

// ─── EDIT VIEW ────────────────────────────────────────────────────────────────

function EditView({
  state,
  currentUserId,
  onChange,
  onSave,
  onBack,
  isSaving,
  theme,
}: {
  state: EditState;
  currentUserId?: string;
  onChange: (s: Partial<EditState>) => void;
  onSave: () => void;
  onBack: () => void;
  isSaving: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View className="flex-1">
      {/* 헤더 */}
      <View className="flex-row items-center justify-between px-3.5 py-3 border-b" style={{ borderBottomColor: theme.border.default }}>
        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
          <ChevronLeft size={18} color={theme.text.muted} />
        </TouchableOpacity>
        <Text className="text-[15px] font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>
          {state.aprvlId ? '템플릿 수정' : '새 템플릿 저장'}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {/* 이름 입력 */}
      <View className="flex-row items-center gap-2.5 px-3.5 py-2.5 border-b" style={{ borderBottomColor: theme.border.subtle }}>
        <Text className="text-[13px] font-semibold w-9" style={{ color: theme.text.body, fontFamily: WEB_FONT }}>이름</Text>
        <TextInput
          value={state.aprvlNm}
          onChangeText={(v) => onChange({ aprvlNm: v })}
          placeholder="예) 팀내 결재선"
          placeholderTextColor={theme.text.subtle}
          className="flex-1 border rounded-lg px-3 py-1.75 text-[13px]"
          style={{ borderColor: theme.border.default, backgroundColor: theme.bg.surfaceMute, color: theme.text.primary, fontFamily: WEB_FONT }}
        />
      </View>

      {/* 결재선 편집 패널 (신청 결재선 지정 모달과 동일 UI) */}
      <AprvLineEditorPanel
        aprvList={state.aprvList}
        refList={state.refList}
        deptRefYn={state.deptRefYn}
        currentUserId={currentUserId}
        onAprvListChange={(list) => onChange({ aprvList: list })}
        onRefListChange={(list) => onChange({ refList: list })}
        onDeptRefToggle={(v) => onChange({ deptRefYn: v })}
        theme={theme}
      />

      {/* 푸터 */}
      <View className="flex-row gap-2.5 p-3.5 border-t" style={{ borderTopColor: theme.border.default }}>
        <TouchableOpacity
          className="flex-1 py-[11px] rounded-xl items-center justify-center border"
          style={{ backgroundColor: theme.bg.surfaceMute, borderColor: theme.border.default }}
          onPress={onBack}
        >
          <Text className="text-sm font-semibold" style={{ color: theme.text.body, fontFamily: WEB_FONT }}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 py-[11px] rounded-xl items-center justify-center"
          style={{ backgroundColor: theme.brand.primary, opacity: isSaving ? 0.6 : 1 }}
          onPress={onSave}
          disabled={isSaving}
        >
          {isSaving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text className="text-sm font-semibold text-white" style={{ fontFamily: WEB_FONT }}>저장</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── LIST VIEW ────────────────────────────────────────────────────────────────

function ListView({
  tmpls,
  isLoading,
  hasCurrentLine,
  onApply,
  onCreateNew,
  onEdit,
  onDelete,
  onClose,
  theme,
}: {
  tmpls: UserAprvlTmplDto[];
  isLoading: boolean;
  hasCurrentLine: boolean;
  onApply: (tmpl: UserAprvlTmplDto) => void;
  onCreateNew: () => void;
  onEdit: (tmpl: UserAprvlTmplDto) => void;
  onDelete: (tmpl: UserAprvlTmplDto) => void;
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View className="flex-1">
      {/* 헤더 */}
      <View className="flex-row items-center justify-between px-4 py-3.5 border-b" style={{ borderBottomColor: theme.border.default }}>
        <Text className="text-base font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>결재선 템플릿</Text>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <X size={20} color={theme.text.muted} />
        </TouchableOpacity>
      </View>

      {/* 현재 결재선 / 신규 생성 버튼 */}
      <TouchableOpacity
        className="flex-row items-center gap-2 mx-3 mt-3 px-3.5 py-2.5 border border-dashed rounded-xl"
        style={hasCurrentLine
          ? { borderColor: theme.brand.primary, backgroundColor: theme.brand.primaryTint }
          : { borderColor: theme.border.default, backgroundColor: theme.bg.surfaceMute }}
        onPress={onCreateNew}
        activeOpacity={0.75}
      >
        {hasCurrentLine
          ? <BookmarkPlus size={15} color={theme.brand.primary} />
          : <Plus size={15} color={theme.text.muted} />}
        <Text className="text-[13px] font-semibold" style={{ color: hasCurrentLine ? theme.brand.primary : theme.text.body, fontFamily: WEB_FONT }}>
          {hasCurrentLine ? '현재 결재선을 템플릿으로 저장' : '새 템플릿 만들기'}
        </Text>
      </TouchableOpacity>

      {/* 목록 */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 8 }}>
        {isLoading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={theme.brand.primary} />
          </View>
        ) : tmpls.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: theme.text.subtle }}>저장된 템플릿이 없습니다.</Text>
          </View>
        ) : (
          tmpls.map((t) => (
            <View
              key={t.aprvlId}
              className="flex-row items-start gap-2.5 border rounded-xl p-3 mb-1"
              style={{ borderColor: theme.border.default, backgroundColor: theme.bg.surfaceMute }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text className="text-[13px] font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{t.aprvlNm}</Text>
                  {t.deptRefYn === 'Y' && (
                    <View className="px-1.5 py-0.5 rounded-md" style={{ backgroundColor: theme.brand.primaryTint }}>
                      <Text style={{ fontSize: 10, color: theme.brand.primary, fontWeight: '600' }}>부서원</Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
                  결재 {t.aprvList.length}명{t.refList.length > 0 ? ` · 참조 ${t.refList.length}명` : ''}
                </Text>
                {t.aprvList.length > 0 && (
                  <Text className="text-[11px]" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }} numberOfLines={1}>
                    {t.aprvList.map((a) => a.aprvUserNm).join(' → ')}
                  </Text>
                )}
              </View>
              <View className="flex-row items-center gap-1.5 pt-0.5">
                <TouchableOpacity
                  className="px-3 py-1.5 rounded-md"
                  style={{ backgroundColor: theme.brand.primary }}
                  onPress={() => onApply(t)}
                  activeOpacity={0.75}
                >
                  <Text className="text-xs font-semibold text-white" style={{ fontFamily: WEB_FONT }}>불러오기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="w-[30px] h-[30px] rounded-md border items-center justify-center"
                  style={{ backgroundColor: theme.bg.surface, borderColor: theme.border.default }}
                  onPress={() => onEdit(t)}
                  activeOpacity={0.75}
                >
                  <Pencil size={13} color={theme.text.body} />
                </TouchableOpacity>
                <TouchableOpacity
                  className="w-[30px] h-[30px] rounded-md border items-center justify-center"
                  style={{ backgroundColor: theme.bg.surface, borderColor: theme.border.default }}
                  onPress={() => onDelete(t)}
                  activeOpacity={0.75}
                >
                  <Trash2 size={13} color={theme.semantic.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export function AprvlTmplModal({
  visible,
  currentAprvList,
  currentRefList,
  currentDeptRefYn = false,
  onApply,
  onClose,
}: AprvlTmplModalProps) {
  const theme = useTheme();
  const toast = useToast();
  const { width: winW, height: winH } = useWindowDimensions();

  const [view, setView] = useState<TmplView>('list');
  const [editState, setEditState] = useState<EditState>({
    aprvlId: null,
    aprvlNm: '',
    aprvList: [],
    refList: [],
    deptRefYn: false,
  });

  const { data: tmpls = [], isLoading } = useUserAprvlTmplList();
  const createMut = useCreateUserAprvlTmpl();
  const updateMut = useUpdateUserAprvlTmpl();
  const deleteMut = useDeleteUserAprvlTmpl();

  const isSaving = createMut.isPending || updateMut.isPending;

  // ── 목록 핸들러 ────────────────────────────────────────────────────────────

  const handleApply = useCallback(
    (tmpl: UserAprvlTmplDto) => {
      onApply(
        tmpl.aprvList.map((a) => ({ aprvUserId: a.aprvUserId, aprvUserNm: a.aprvUserNm })),
        tmpl.refList.map((r) => ({ aprvUserId: r.refUserId, aprvUserNm: r.refUserNm })),
        tmpl.deptRefYn === 'Y',
      );
      onClose();
    },
    [onApply, onClose],
  );

  const handleCreateNew = useCallback(() => {
    setEditState({
      aprvlId: null,
      aprvlNm: '',
      aprvList: [...currentAprvList],
      refList: [...currentRefList],
      deptRefYn: currentDeptRefYn,
    });
    setView('edit');
  }, [currentAprvList, currentRefList, currentDeptRefYn]);

  const handleEdit = useCallback((tmpl: UserAprvlTmplDto) => {
    setEditState({
      aprvlId: tmpl.aprvlId,
      aprvlNm: tmpl.aprvlNm,
      aprvList: tmpl.aprvList.map((a) => ({ aprvUserId: a.aprvUserId, aprvUserNm: a.aprvUserNm })),
      refList: tmpl.refList.map((r) => ({ aprvUserId: r.refUserId, aprvUserNm: r.refUserNm })),
      deptRefYn: tmpl.deptRefYn === 'Y',
    });
    setView('edit');
  }, []);

  const handleDelete = useCallback(
    (tmpl: UserAprvlTmplDto) => {
      const doDelete = () => {
        deleteMut.mutate(tmpl.aprvlId, {
          onSuccess: () => toast.success('템플릿이 삭제되었습니다.'),
          onError: () => toast.error('삭제 중 오류가 발생했습니다.'),
        });
      };
      if (Platform.OS === 'web') {
        if (window.confirm(`'${tmpl.aprvlNm}' 템플릿을 삭제하시겠습니까?`)) doDelete();
      } else {
        const { Alert } = require('react-native');
        Alert.alert('템플릿 삭제', `'${tmpl.aprvlNm}' 템플릿을 삭제하시겠습니까?`, [
          { text: '취소', style: 'cancel' },
          { text: '삭제', style: 'destructive', onPress: doDelete },
        ]);
      }
    },
    [deleteMut, toast],
  );

  // ── 편집 핸들러 ────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!editState.aprvlNm.trim()) { toast.error('템플릿 이름을 입력해주세요.'); return; }
    if (editState.aprvList.length === 0) { toast.error('결재자를 1명 이상 추가해주세요.'); return; }

    const data = {
      aprvlNm: editState.aprvlNm.trim(),
      deptRefYn: editState.deptRefYn ? 'Y' : 'N',
      aprvList: editState.aprvList.map((a) => ({ aprvUserId: a.aprvUserId })),
      refList: editState.refList.map((r) => r.aprvUserId),
    };

    try {
      if (editState.aprvlId) {
        await updateMut.mutateAsync({ aprvlId: editState.aprvlId, data });
        toast.success('템플릿이 수정되었습니다.');
      } else {
        await createMut.mutateAsync(data);
        toast.success('템플릿이 저장되었습니다.');
      }
      setView('list');
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    }
  }, [editState, createMut, updateMut, toast]);

  const handleBack = useCallback(() => setView('list'), []);

  const handleClose = useCallback(() => {
    setView('list');
    onClose();
  }, [onClose]);

  // ── 템플릿 모달 크기 ──────────────────────────────────────────────────────────────

  const modalW = Platform.OS === 'web'
    ? Math.min(winW * 0.92, view === 'edit' ? 820 : 520)
    : winW;
  const modalH = Platform.OS === 'web'
    ? Math.min(winH * 0.88, view === 'edit' ? 680 : 600)
    : winH * 0.9;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      onRequestClose={handleClose}
    >
      <View className={`flex-1 bg-black/55 justify-end ${Platform.OS === 'web' ? 'justify-center items-center' : ''}`}>
        <View
          className={`overflow-hidden ${Platform.OS === 'web' ? 'rounded-2xl' : 'rounded-t-[20px]'}`}
          style={{ backgroundColor: theme.bg.surface, width: modalW, maxHeight: modalH }}
        >
          {view === 'list' ? (
            <ListView
              tmpls={tmpls}
              isLoading={isLoading}
              hasCurrentLine={currentAprvList.length > 0}
              onApply={handleApply}
              onCreateNew={handleCreateNew}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onClose={handleClose}
              theme={theme}
            />
          ) : (
            <EditView
              state={editState}
              onChange={(partial) => setEditState((prev) => ({ ...prev, ...partial }))}
              onSave={handleSave}
              onBack={handleBack}
              isSaving={isSaving}
              theme={theme}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
