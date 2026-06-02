import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Platform, ActivityIndicator, Alert, useWindowDimensions, Modal,
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
    <View style={[cal.wrap, { borderColor: theme.border.default, backgroundColor: theme.bg.surface }]}>
      {/* 월 이동 헤더 */}
      <View style={[cal.navRow, { backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn} activeOpacity={0.7}>
          <Text style={[cal.navArrow, { color: theme.text.muted }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[cal.navTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
          {viewYear}년 {MONTH_NAMES[viewMonth]}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn} activeOpacity={0.7}>
          <Text style={[cal.navArrow, { color: theme.text.muted }]}>›</Text>
        </TouchableOpacity>
      </View>
      {/* 요일 헤더 */}
      <View style={[cal.weekRow, { backgroundColor: theme.bg.surfaceAlt }]}>
        {WEEKDAY_KR.map((w, i) => (
          <View key={w} style={cal.weekCell}>
            <Text style={[cal.weekText, { color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : theme.text.muted, fontFamily: WEB_FONT }]}>
              {w}
            </Text>
          </View>
        ))}
      </View>
      {/* 날짜 */}
      {rows.map((row, ri) => (
        <View key={ri} style={cal.row}>
          {row.map((day, ci) => {
            if (!day) return <View key={ci} style={cal.dayCell} />;
            const ymd    = toYmd(viewYear, viewMonth, day);
            const isSel  = ymd === value;
            const isToday = ymd === todayYmd;
            const isWE   = ci === 0 || ci === 6;
            return (
              <TouchableOpacity
                key={ci}
                style={[cal.dayCell, isSel && { backgroundColor: theme.brand.primary, borderRadius: 8 }]}
                onPress={() => { onChange(ymd); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[
                  cal.dayText,
                  { color: isSel ? '#fff' : isToday ? theme.brand.primary : isWE ? (ci === 0 ? '#EF4444' : '#3B82F6') : theme.text.primary },
                  (isSel || isToday) && { fontWeight: '700' },
                  { fontFamily: WEB_FONT },
                ]}>
                  {day}
                </Text>
                {isToday && !isSel && (
                  <View style={[cal.todayDot, { backgroundColor: theme.brand.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const cal = StyleSheet.create({
  wrap:     { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  navRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1 },
  navBtn:   { padding: 8 },
  navArrow: { fontSize: 18, fontWeight: '600' },
  navTitle: { fontSize: 14, fontWeight: '700' },
  weekRow:  { flexDirection: 'row' },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekText: { fontSize: 11, fontWeight: '600' },
  row:      { flexDirection: 'row' },
  dayCell:  { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center' },
  dayText:  { fontSize: 13 },
  todayDot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2 },
});

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
    <View style={df.field}>
      <Text style={[df.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
        {field.aprvRefNm}
        {field.reqdYn === 'Y' && <Text style={{ color: '#EF4444' }}> *</Text>}
      </Text>

      {isDate ? (
        <>
          <TouchableOpacity
            onPress={() => setCalOpen(true)}
            activeOpacity={0.8}
            style={[df.dateBtn, { borderColor: theme.border.default, backgroundColor: theme.bg.surface }]}
          >
            <CalendarDays size={16} color={value ? theme.brand.primary : theme.text.muted} />
            <Text style={[df.dateBtnText, { color: value ? theme.text.primary : theme.text.muted, fontFamily: WEB_FONT }]}>
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
          style={[
            df.input,
            isMultiline && df.inputMultiline,
            { color: theme.text.primary, borderColor: theme.border.default, backgroundColor: theme.bg.surface, fontFamily: WEB_FONT },
          ]}
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

const df = StyleSheet.create({
  field:          { gap: 6 },
  label:          { fontSize: 12, fontWeight: '500' },
  input:          { height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 13 },
  inputMultiline: { height: 96, paddingTop: 10, textAlignVertical: 'top' },
  dateBtn:        { height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBtnText:    { flex: 1, fontSize: 13 },
});

// ─── 결재선 요약 카드 ─────────────────────────────────────────────────────────

function AprvSummaryCard({
  aprvList, refList, deptRefYn, onEdit, theme,
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
      style={[
        s.aprvCard,
        { borderColor: isEmpty ? theme.border.default : theme.brand.primary,
          backgroundColor: isEmpty ? theme.bg.surfaceAlt : theme.brand.primaryTint },
      ]}
    >
      {isEmpty ? (
        <Text style={[s.aprvCardEmpty, { color: theme.text.muted, fontFamily: WEB_FONT }]}>
          결재선을 지정해주세요
        </Text>
      ) : (
        <View style={s.aprvCardContent}>
          <View style={s.aprvCardMeta}>
            <Text style={[s.aprvCardCount, { color: theme.brand.primary, fontFamily: WEB_FONT }]}>
              결재 {aprvList.length}명
              {refList.length > 0 ? ` · 참조 ${refList.length}명` : ''}
              {deptRefYn ? ' · 부서원 자동포함' : ''}
            </Text>
          </View>
          <View style={s.aprvChips}>
            {aprvList.map((a, i) => (
              <View key={a.aprvUserId} style={[s.aprvChip, { backgroundColor: theme.brand.primary }]}>
                <Text style={[s.aprvChipText, { fontFamily: WEB_FONT }]}>
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
    <View style={[s.root, { backgroundColor: theme.bg.app }]}>
      {/* 헤더 */}
      <View style={[s.header, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }]}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={s.backBtn}>
          <ChevronLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>결재 신청</Text>
      </View>

      <ScrollView contentContainerStyle={[s.scrollBody, { alignItems: 'center' }]} showsVerticalScrollIndicator={false}>
        <View style={[s.formCard, { width: maxWidth, backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>

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
          <View style={df.field}>
            <Text style={[df.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
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
          <View style={s.btnRow}>
            <TouchableOpacity
              onPress={goBack}
              style={[s.cancelBtn, { borderColor: theme.border.default }]}
              activeOpacity={0.7}
            >
              <Text style={[s.cancelBtnText, { color: theme.text.body, fontFamily: WEB_FONT }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSaving}
              style={[s.submitBtn, { backgroundColor: theme.brand.primary }, isSaving && s.disabled]}
              activeOpacity={0.8}
            >
              {isSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[s.submitBtnText, { fontFamily: WEB_FONT }]}>신청</Text>}
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

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingHorizontal: 16, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '600' },

  scrollBody: { padding: 20 },
  formCard: {
    borderRadius: 16, borderWidth: 1, padding: 20, gap: 16,
  },

  aprvCard: {
    borderWidth: 1.5, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  aprvCardEmpty: { flex: 1, fontSize: 13 },
  aprvCardContent: { flex: 1, gap: 8 },
  aprvCardMeta: {},
  aprvCardCount: { fontSize: 13, fontWeight: '600' },
  aprvChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  aprvChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  aprvChipText: { color: '#fff', fontSize: 12, fontWeight: '500' },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  cancelBtnText: { fontSize: 14 },
  submitBtn: {
    flex: 2, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
