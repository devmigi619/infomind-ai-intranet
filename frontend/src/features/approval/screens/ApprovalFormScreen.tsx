import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Platform, ActivityIndicator, Alert, useWindowDimensions,
} from 'react-native';
import { ChevronLeft, Users, CalendarDays } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useUiStore } from '../../../store/uiStore';
import { useCurrentUser } from '../../auth/api';
import { useToast } from '../../../shared/hooks/useToast';
import { AppDropdown } from '../../../shared/components/AppDropdown';
import { AprvlTmplModal } from '../../leave-req/components/AprvlTmplModal';
import { AprvLineEditorPanel } from '../../leave-req/components/AprvLineEditorPanel';
import type { AprvEntry } from '../../leave-req/api';
import {
  useAprvFormList,
  useAprvFormDetail,
  useCreateAprv,
  type AprvFormField,
} from '../api';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── 미니 캘린더 ──────────────────────────────────────────────────────────────

const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function toYmd(y: number, m: number, d: number) {
  return `${y}${String(m + 1).padStart(2, '0')}${String(d).padStart(2, '0')}`;
}

function fmtDisplay(ymd: string) {
  if (!ymd || ymd.length !== 8) return ymd;
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function MiniCalendar({
  value, onChange, onClose, theme,
}: {
  value:    string;
  onChange: (ymd: string) => void;
  onClose:  () => void;
  theme:    ReturnType<typeof useTheme>;
}) {
  const today = new Date();
  const initYear  = value?.length === 8 ? parseInt(value.slice(0, 4)) : today.getFullYear();
  const initMonth = value?.length === 8 ? parseInt(value.slice(4, 6)) - 1 : today.getMonth();

  const [viewYear,  setViewYear]  = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);

  const prevMonth = () => viewMonth === 0
    ? (setViewYear(y => y - 1), setViewMonth(11))
    : setViewMonth(m => m - 1);
  const nextMonth = () => viewMonth === 11
    ? (setViewYear(y => y + 1), setViewMonth(0))
    : setViewMonth(m => m + 1);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const todayYmd    = toYmd(today.getFullYear(), today.getMonth(), today.getDate());
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View className="border rounded-xl overflow-hidden" style={{ borderColor: theme.border.default, backgroundColor: theme.bg.surface }}>
      {/* 월 이동 헤더 */}
      <View className="flex-row items-center justify-between px-2 py-2.5 border-b" style={{ backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.subtle }}>
        <TouchableOpacity onPress={prevMonth} className="p-2" activeOpacity={0.7}>
          <Text className="text-lg font-semibold" style={{ color: theme.text.muted }}>‹</Text>
        </TouchableOpacity>
        <Text className="text-sm font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>
          {viewYear}년 {MONTH_NAMES[viewMonth]}
        </Text>
        <TouchableOpacity onPress={nextMonth} className="p-2" activeOpacity={0.7}>
          <Text className="text-lg font-semibold" style={{ color: theme.text.muted }}>›</Text>
        </TouchableOpacity>
      </View>
      {/* 요일 헤더 */}
      <View className="flex-row" style={{ backgroundColor: theme.bg.surfaceAlt }}>
        {WEEKDAY_KR.map((w, i) => (
          <View key={w} className="flex-1 items-center py-1.5">
            <Text className="text-[11px] font-semibold" style={{ color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : theme.text.muted, fontFamily: WEB_FONT }}>
              {w}
            </Text>
          </View>
        ))}
      </View>
      {/* 날짜 */}
      {rows.map((row, ri) => (
        <View key={ri} className="flex-row">
          {row.map((day, ci) => {
            if (!day) return <View key={ci} className="flex-1 h-[38px]" />;
            const ymd    = toYmd(viewYear, viewMonth, day);
            const isSel  = ymd === value;
            const isToday = ymd === todayYmd;
            const isWE   = ci === 0 || ci === 6;
            return (
              <TouchableOpacity
                key={ci}
                className={`flex-1 h-[38px] items-center justify-center ${isSel ? 'rounded-lg' : ''}`}
                style={isSel ? { backgroundColor: theme.brand.primary } : undefined}
                onPress={() => { onChange(ymd); onClose(); }}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-[13px] ${(isSel || isToday) ? 'font-bold' : ''}`}
                  style={{
                    color: isSel ? '#fff' : isToday ? theme.brand.primary : isWE ? (ci === 0 ? '#EF4444' : '#3B82F6') : theme.text.primary,
                    fontFamily: WEB_FONT,
                  }}
                >
                  {day}
                </Text>
                {isToday && !isSel && (
                  <View className="absolute bottom-1 w-1 h-1 rounded-full" style={{ backgroundColor: theme.brand.primary }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── 동적 필드 입력 ───────────────────────────────────────────────────────────

function DynamicField({
  field,
  value,
  onChange,
  theme,
}: {
  field:    AprvFormField;
  value:    string;
  onChange: (v: string) => void;
  theme:    ReturnType<typeof useTheme>;
}) {
  const [calOpen, setCalOpen] = useState(false);
  const isDate      = field.aprvRefSe === 'DATE';
  const isMultiline = field.aprvRefSe === 'EDIT';
  const isNumeric   = field.aprvRefSe === 'NUMBER';

  return (
    <View className="gap-1.5">
      <Text className="text-xs font-medium" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}>
        {field.aprvRefNm}
        {field.reqdYn === 'Y' && <Text style={{ color: '#EF4444' }}> *</Text>}
      </Text>

      {isDate ? (
        <>
          <TouchableOpacity
            onPress={() => setCalOpen(true)}
            activeOpacity={0.8}
            className="h-10 border rounded-lg px-3 flex-row items-center gap-2"
            style={{ borderColor: theme.border.default, backgroundColor: theme.bg.surface }}
          >
            <CalendarDays size={16} color={value ? theme.brand.primary : theme.text.muted} />
            <Text className="flex-1 text-[13px]" style={{ color: value ? theme.text.primary : theme.text.muted, fontFamily: WEB_FONT }}>
              {value ? fmtDisplay(value) : '날짜를 선택하세요'}
            </Text>
            {value ? (
              <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: theme.text.muted, fontSize: 16 }}>×</Text>
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>

          {calOpen && (
            <MiniCalendar
              value={value}
              onChange={onChange}
              onClose={() => setCalOpen(false)}
              theme={theme}
            />
          )}
        </>
      ) : (
        <TextInput
          className={`h-10 border rounded-lg px-3 text-[13px] ${isMultiline ? 'h-24 pt-2.5' : ''}`}
          style={{
            color: theme.text.primary,
            borderColor: theme.border.default,
            backgroundColor: theme.bg.surface,
            fontFamily: WEB_FONT,
            textAlignVertical: isMultiline ? 'top' : 'center',
          }}
          value={value}
          onChangeText={onChange}
          placeholder={
            field.aprvRefSe === 'TIME'   ? 'HH:MM' :
            field.aprvRefSe === 'NUMBER' ? '숫자 입력' :
            ''
          }
          placeholderTextColor={theme.text.muted}
          multiline={isMultiline}
          keyboardType={isNumeric ? 'numeric' : 'default'}
        />
      )}
    </View>
  );
}

// ─── 결재선 요약 카드 ─────────────────────────────────────────────────────────

function AprvSummaryCard({
  aprvList,
  refList,
  deptRefYn,
  onEdit,
  theme,
}: {
  aprvList:  AprvEntry[];
  refList:   AprvEntry[];
  deptRefYn: boolean;
  onEdit:    () => void;
  theme:     ReturnType<typeof useTheme>;
}) {
  const isEmpty = aprvList.length === 0;
  return (
    <TouchableOpacity
      onPress={onEdit}
      activeOpacity={0.8}
      className="border-[1.5px] rounded-xl p-3.5 flex-row items-center gap-2.5"
      style={{
        borderColor: isEmpty ? theme.border.default : theme.brand.primary,
        backgroundColor: isEmpty ? theme.bg.surfaceAlt : theme.brand.primaryTint,
      }}
    >
      {isEmpty ? (
        <Text className="flex-1 text-[13px]" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
          결재선을 지정해주세요
        </Text>
      ) : (
        <View className="flex-1 gap-2">
          <View>
            <Text className="text-[13px] font-semibold" style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}>
              결재 {aprvList.length}명
              {refList.length > 0 ? ` · 참조 ${refList.length}명` : ''}
              {deptRefYn ? ' · 부서원 자동포함' : ''}
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-1.5">
            {aprvList.map((a, i) => (
              <View key={a.aprvUserId} className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: theme.brand.primary }}>
                <Text className="text-white text-xs font-medium" style={{ fontFamily: WEB_FONT }}>
                  {i + 1}. {a.aprvUserNm}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <Users size={18} color={isEmpty ? theme.text.muted : theme.brand.primary} />
    </TouchableOpacity>
  );
}

// ─── 메인 폼 화면 ─────────────────────────────────────────────────────────────

export function ApprovalFormScreen() {
  const theme  = useTheme();
  const { width } = useWindowDimensions();
  const { data: user } = useCurrentUser();
  const setActiveFullScreen = useUiStore((s) => s.setActiveFullScreen);
  const goBack = () => setActiveFullScreen('approval' as any);
  const toast   = useToast();

  const { data: forms = [] } = useAprvFormList();
  const formOptions = forms.map((f) => ({ label: f.aprvFormNm, value: f.aprvFormId }));

  const [selectedFormId, setSelectedFormId] = useState('');
  const { data: formDetail } = useAprvFormDetail(selectedFormId);

  const [reqSum, setReqSum]           = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [aprvList, setAprvList]       = useState<AprvEntry[]>([]);
  const [refList, setRefList]         = useState<AprvEntry[]>([]);
  const [deptRefYn, setDeptRefYn]     = useState(false);
  const [aprvModalVisible, setAprvModalVisible] = useState(false);

  const createMut = useCreateAprv();
  const isSaving  = createMut.isPending;

  // 양식 변경 시: 필드값 초기화 + 제목 자동 설정
  useEffect(() => {
    setFieldValues({});
    setReqSum('');
  }, [selectedFormId]);

  // 양식 상세 로드 시 제목을 양식명으로 자동 세팅
  useEffect(() => {
    if (formDetail?.aprvFormNm) {
      setReqSum(formDetail.aprvFormNm);
    }
  }, [formDetail?.aprvFormNm]);

  const updateField = (cd: string, val: string) =>
    setFieldValues((prev) => ({ ...prev, [cd]: val }));

  const handleSubmit = async () => {
    if (!selectedFormId) return Alert.alert('오류', '결재 양식을 선택해주세요.');
    if (aprvList.length === 0) return Alert.alert('오류', '결재자를 한 명 이상 지정해주세요.');

    // 필수 필드 검증
    const requiredFields = (formDetail?.dtls ?? []).filter((f) => f.reqdYn === 'Y');
    for (const f of requiredFields) {
      if (!fieldValues[f.aprvRefCd]?.trim()) {
        return Alert.alert('오류', `'${f.aprvRefNm}' 항목을 입력해주세요.`);
      }
    }

    try {
      const desc: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fieldValues)) {
        if (v.trim()) desc[k] = v.trim();
      }

      await createMut.mutateAsync({
        aprvFormId:   selectedFormId,
        reqSum:       reqSum.trim(),
        aprvReqDesc:  desc,
        deptRefYn:    deptRefYn ? 'Y' : 'N',
        aprvList:     aprvList.map((a, i) => ({ aprvUserId: a.aprvUserId, aprvOrd: i + 1 })),
        refUserIds:   refList.map((r) => r.aprvUserId),
      });
      toast.success('결재가 신청되었습니다.');
      goBack();
    } catch (e: unknown) {
      Alert.alert('오류', e instanceof Error ? e.message : '신청에 실패했습니다.');
    }
  };

  const maxWidth = Math.min(640, width - 32);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg.app }}>
      {/* 헤더 */}
      <View className="h-14 flex-row items-center gap-2 px-4 border-b" style={{ backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7} className="p-1">
          <ChevronLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text className="text-base font-semibold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>결재 신청</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
        <View className="rounded-2xl border p-5 gap-4" style={{ width: maxWidth, backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }}>

          {/* 양식 선택 */}
          <AppDropdown
            label="결재 양식"
            required
            value={selectedFormId}
            onChange={setSelectedFormId}
            options={formOptions}
            placeholder="양식을 선택해주세요"
          />

          {/* 동적 필드 */}
          {(formDetail?.dtls ?? []).map((field) => (
            <DynamicField
              key={field.aprvRefCd}
              field={field}
              value={fieldValues[field.aprvRefCd] ?? ''}
              onChange={(v) => updateField(field.aprvRefCd, v)}
              theme={theme}
            />
          ))}

          {/* 결재선 */}
          <View className="gap-1.5">
            <Text className="text-xs font-medium" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}>
              결재선<Text style={{ color: '#EF4444' }}> *</Text>
            </Text>
            <AprvSummaryCard
              aprvList={aprvList}
              refList={refList}
              deptRefYn={deptRefYn}
              onEdit={() => setAprvModalVisible(true)}
              theme={theme}
            />
          </View>

          {/* 제출/취소 버튼 */}
          <View className="flex-row gap-3 mt-2">
            <TouchableOpacity
              onPress={goBack}
              className="flex-1 h-11 rounded-lg items-center justify-center border"
              style={{ borderColor: theme.border.default }}
              activeOpacity={0.7}
            >
              <Text className="text-sm" style={{ color: theme.text.body, fontFamily: WEB_FONT }}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSaving}
              className="flex-[2] h-11 rounded-lg items-center justify-center"
              style={{ backgroundColor: theme.brand.primary, opacity: isSaving ? 0.6 : 1 }}
              activeOpacity={0.8}
            >
              {isSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text className="text-white text-[15px] font-semibold" style={{ fontFamily: WEB_FONT }}>신청</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 결재선 선택 모달 */}
      <AprvlTmplModal
        visible={aprvModalVisible}
        currentAprvList={aprvList}
        currentRefList={refList}
        onApply={(newAprv, newRef, newDeptRef) => {
          setAprvList(newAprv);
          setRefList(newRef);
          setDeptRefYn(newDeptRef);
          setAprvModalVisible(false);
        }}
        onClose={() => setAprvModalVisible(false)}
      />
    </View>
  );
}
