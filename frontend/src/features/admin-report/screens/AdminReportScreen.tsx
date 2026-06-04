import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { CalendarDays, Eye, EyeOff, FileText, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react-native';
import { AppDropdown } from '../../../shared/components/AppDropdown';
import { useCodeList } from '../../../shared/hooks/useCodeList';
import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useDepartments } from '../../admin-dept/api';
import { useAdminUsers } from '../../admin-users/api';
import {
  type FormRequest,
  type ReportForm,
  type ReportRound,
  type Submission,
  useCreateReportForm,
  useCreateReportRound,
  useDeleteReportRound,
  useGenerateReportSummary,
  useReportForms,
  useReportRounds,
  useReportSubmissions,
  useToggleReportForm,
  useUpdateReportForm,
  useUpdateReportRound,
  useUpdateReportSummary,
} from '../api';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });
const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

type TabKey = 'forms' | 'rounds' | 'reports';
type ModalMode = 'form-create' | 'form-edit' | 'round-create' | 'round-edit' | 'submission' | 'summary' | null;
type CalendarField = 'formStart' | 'roundYmd' | null;

const EMPTY_FORM: FormRequest = {
  rptFormId: '',
  rptTtl: '',
  rptDesc: '',
  rptDtSe: '',
  rptAdmId: '',
  stYmd: '',
  deptCd: '',
  openYn: 'Y',
  useYn: 'Y',
  rmk: '',
};

const EMPTY_ROUND = { roundNm: '', roundYmd: '' };

const statusLabel: Record<Submission['status'], string> = {
  NOT_WRITTEN: '미작성',
  DRAFT: '임시저장',
  SUBMITTED: '제출 완료',
};

const statusColor: Record<Submission['status'], { bg: string; text: string }> = {
  NOT_WRITTEN: { bg: '#F3F4F6', text: '#6B7280' },
  DRAFT: { bg: '#FEF3C7', text: '#92400E' },
  SUBMITTED: { bg: '#ECFDF5', text: '#065F46' },
};

function toYmd(year: number, month: number, day: number) {
  return `${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

function fmtDisplay(ymd: string | null | undefined) {
  if (!ymd || ymd.length !== 8) return ymd ?? '';
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

export function AdminReportScreen() {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { width } = useWindowDimensions();
  const confirm = useConfirm();

  const intervals = useCodeList('RPT_DT_SE');
  const { data: departments = [] } = useDepartments();
  const { data: users = [] } = useAdminUsers(undefined, 'ACTIVE');
  const { data: forms = [], isLoading: formsLoading } = useReportForms();

  const [tab, setTab] = useState<TabKey>('forms');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedForm, setSelectedForm] = useState<ReportForm | null>(null);
  const [formDraft, setFormDraft] = useState<FormRequest>(EMPTY_FORM);
  const [roundFormId, setRoundFormId] = useState('');
  const [reportFormId, setReportFormId] = useState('');
  const [reportRoundSn, setReportRoundSn] = useState<number | undefined>();
  const [selectedRound, setSelectedRound] = useState<ReportRound | null>(null);
  const [roundDraft, setRoundDraft] = useState(EMPTY_ROUND);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [calendarField, setCalendarField] = useState<CalendarField>(null);

  const { data: roundRows = [], isLoading: roundsLoading } = useReportRounds(roundFormId);
  const { data: reportRounds = [] } = useReportRounds(reportFormId);
  const selectedReportRound = reportRounds.find((r) => r.roundSn === reportRoundSn) ?? null;
  const { data: submissions = [], isLoading: submissionsLoading } = useReportSubmissions(reportFormId, reportRoundSn);

  const createForm = useCreateReportForm();
  const updateForm = useUpdateReportForm();
  const toggleForm = useToggleReportForm();
  const createRound = useCreateReportRound();
  const updateRound = useUpdateReportRound();
  const deleteRound = useDeleteReportRound();
  const generateSummary = useGenerateReportSummary();
  const updateSummary = useUpdateReportSummary();

  const modalWidth = Math.min(560, width - 32);
  const isSaving = createForm.isPending || updateForm.isPending || createRound.isPending || updateRound.isPending || updateSummary.isPending;

  const deptOptions = departments.filter((d) => d.useYn === 'Y').map((d) => ({ value: d.deptCd, label: d.deptNm }));
  const userOptions = users.map((u) => ({ value: u.userId, label: `${u.userNm} (${u.userId})` }));
  const formOptions = forms.map((f) => ({ value: f.rptFormId, label: `${f.rptTtl} (${f.rptFormId})` }));
  const reportRoundOptions = reportRounds.map((r) => ({ value: String(r.roundSn), label: `${r.roundNm} (${fmtDisplay(r.roundYmd)})` }));
  const submittedCount = useMemo(() => submissions.filter((s) => s.status === 'SUBMITTED').length, [submissions]);

  const intervalLabel = (cd: string) => intervals.find((o) => o.value === cd)?.label ?? cd ?? '-';
  const deptLabel = (cd: string) => departments.find((d) => d.deptCd === cd)?.deptNm ?? cd ?? '-';
  const userLabel = (id: string) => users.find((u) => u.userId === id)?.userNm ?? id ?? '-';

  const closeModal = () => {
    setModalMode(null);
    setSelectedForm(null);
    setSelectedRound(null);
    setSelectedSubmission(null);
    setCalendarField(null);
  };

  const openCreateForm = () => {
    setFormDraft(EMPTY_FORM);
    setSelectedForm(null);
    setModalMode('form-create');
  };

  const openEditForm = (form: ReportForm) => {
    setSelectedForm(form);
    setFormDraft({ ...form });
    setModalMode('form-edit');
  };

  const openCreateRound = () => {
    if (!roundFormId) return Alert.alert('오류', '회차를 생성할 양식을 선택해주세요.');
    setSelectedRound(null);
    setRoundDraft(EMPTY_ROUND);
    setModalMode('round-create');
  };

  const openEditRound = (round: ReportRound) => {
    setSelectedRound(round);
    setRoundDraft({ roundNm: round.roundNm, roundYmd: round.roundYmd });
    setModalMode('round-edit');
  };

  const handleSaveForm = async () => {
    if (!formDraft.rptFormId.trim()) return Alert.alert('오류', '양식 ID를 입력해주세요.');
    if (!formDraft.rptTtl.trim()) return Alert.alert('오류', '제목을 입력해주세요.');
    if (!formDraft.rptDesc.trim()) return Alert.alert('오류', '설명을 입력해주세요.');
    if (!formDraft.rptDtSe) return Alert.alert('오류', '보고 주기를 선택해주세요.');
    if (!formDraft.deptCd) return Alert.alert('오류', '대상 부서를 선택해주세요.');
    if (!formDraft.rptAdmId) return Alert.alert('오류', '보고 관리자를 선택해주세요.');

    try {
      const payload: FormRequest = {
        ...formDraft,
        rptFormId: formDraft.rptFormId.trim(),
        rptTtl: formDraft.rptTtl.trim(),
        rptDesc: formDraft.rptDesc.trim(),
        stYmd: formDraft.stYmd?.trim() || null,
        rmk: formDraft.rmk?.trim() || null,
      };
      if (modalMode === 'form-edit' && selectedForm) {
        await updateForm.mutateAsync({ id: selectedForm.rptFormId, data: payload });
      } else {
        await createForm.mutateAsync(payload);
      }
      closeModal();
    } catch (e) {
      Alert.alert('오류', getErrorMessage(e));
    }
  };

  const handleToggleForm = async (form: ReportForm) => {
    const enabled = form.useYn !== 'Y';
    const ok = await confirm({
      title: enabled ? '양식 활성화' : '양식 비활성화',
      message: `'${form.rptTtl}' 양식을 ${enabled ? '활성화' : '비활성화'}하시겠습니까?`,
      confirmText: enabled ? '활성화' : '비활성화',
      danger: !enabled,
    });
    if (!ok) return;
    toggleForm.mutate({ id: form.rptFormId, enabled });
  };

  const handleSaveRound = async () => {
    if (!roundFormId) return Alert.alert('오류', '양식을 선택해주세요.');
    if (!roundDraft.roundNm.trim()) return Alert.alert('오류', '회차명을 입력해주세요.');
    if (!roundDraft.roundYmd.trim()) return Alert.alert('오류', '기준일을 입력해주세요.');
    try {
      const data = { roundNm: roundDraft.roundNm.trim(), roundYmd: roundDraft.roundYmd.trim() };
      if (modalMode === 'round-edit' && selectedRound) {
        await updateRound.mutateAsync({ id: roundFormId, sn: selectedRound.roundSn, data });
      } else {
        await createRound.mutateAsync({ id: roundFormId, data });
      }
      closeModal();
    } catch (e) {
      Alert.alert('오류', getErrorMessage(e));
    }
  };

  const handleDeleteRound = async (round: ReportRound) => {
    const ok = await confirm({
      title: '회차 삭제',
      message: `'${round.roundNm}' 회차를 삭제하시겠습니까?`,
      confirmText: '삭제',
      danger: true,
    });
    if (!ok) return;
    deleteRound.mutate({ id: roundFormId, sn: round.roundSn });
  };

  const handleGenerateSummary = async () => {
    if (!reportFormId || !selectedReportRound) return;
    if (selectedReportRound.rptSum) {
      const ok = await confirm({
        title: 'AI 요약 재생성',
        message: '기존 요약을 덮어쓰시겠습니까?',
        confirmText: '재생성',
      });
      if (!ok) return;
    }
    try {
      await generateSummary.mutateAsync({ id: reportFormId, sn: selectedReportRound.roundSn });
    } catch (e) {
      Alert.alert('오류', getErrorMessage(e));
    }
  };

  const openSummaryEdit = () => {
    if (!selectedReportRound) return;
    setSummaryDraft(selectedReportRound.rptSum ?? '');
    setModalMode('summary');
  };

  const handleSaveSummary = async () => {
    if (!reportFormId || !selectedReportRound) return;
    try {
      await updateSummary.mutateAsync({ id: reportFormId, sn: selectedReportRound.roundSn, summary: summaryDraft });
      closeModal();
    } catch (e) {
      Alert.alert('오류', getErrorMessage(e));
    }
  };

  const renderTabs = () => (
    <View style={[styles.tabBar, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }]}>
      {([
        ['forms', '양식관리'],
        ['rounds', '회차관리'],
        ['reports', '보고관리'],
      ] as const).map(([key, label]) => (
        <TouchableOpacity
          key={key}
          onPress={() => setTab(key)}
          style={[
            styles.tabItem,
            tab === key && { borderBottomColor: theme.brand.primary },
          ]}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: tab === key ? theme.brand.primary : theme.text.muted, fontFamily: WEB_FONT }, tab === key && styles.tabTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFormActions = (form: ReportForm) => (
    <View style={styles.actionRow}>
      <TouchableOpacity onPress={() => openEditForm(form)} style={[styles.iconBtn, { backgroundColor: theme.brand.primaryTint }]} activeOpacity={0.7}>
        <Pencil size={13} color={theme.brand.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleToggleForm(form)}
        style={[styles.iconBtn, { backgroundColor: form.useYn === 'Y' ? '#FEF2F2' : '#ECFDF5' }]}
        activeOpacity={0.7}
      >
        {form.useYn === 'Y' ? <EyeOff size={13} color="#EF4444" /> : <Eye size={13} color="#10B981" />}
      </TouchableOpacity>
    </View>
  );

  const renderRoundActions = (round: ReportRound) => {
    if (round.locked) return <Text style={[styles.mutedText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>-</Text>;
    return (
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => openEditRound(round)} style={[styles.iconBtn, { backgroundColor: theme.brand.primaryTint }]} activeOpacity={0.7}>
          <Pencil size={13} color={theme.brand.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteRound(round)} style={[styles.iconBtn, { backgroundColor: '#FEF2F2' }]} activeOpacity={0.7}>
          <Trash2 size={13} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderFormsTable = () => (
    <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.tableHeader, { backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.default }]}>
        {[
          { label: '양식 ID', flex: 1.3 },
          { label: '제목', flex: 1.7 },
          { label: '주기', flex: 0.8 },
          { label: '대상부서', flex: 1 },
          { label: '관리자', flex: 1 },
          { label: '상태', flex: 0.7 },
          { label: '관리', flex: 0.8 },
        ].map((h) => (
          <Text key={h.label} style={[styles.th, { color: theme.text.subtle, fontFamily: WEB_FONT, flex: h.flex }]}>{h.label}</Text>
        ))}
      </View>
      {formsLoading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.brand.primary} /></View>
      ) : forms.length === 0 ? (
        <View style={styles.centered}><Text style={[styles.emptyText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>등록된 보고 양식이 없습니다.</Text></View>
      ) : forms.map((form, idx) => (
        <View key={form.rptFormId} style={[styles.tableRow, { borderBottomColor: theme.border.subtle }, idx % 2 === 1 && { backgroundColor: theme.bg.surfaceAlt }]}>
          <Text style={[styles.td, { flex: 1.3, color: theme.text.primary, fontFamily: WEB_FONT }]} numberOfLines={1}>{form.rptFormId}</Text>
          <Text style={[styles.td, { flex: 1.7, color: theme.text.primary, fontFamily: WEB_FONT }]} numberOfLines={1}>{form.rptTtl}</Text>
          <Text style={[styles.td, { flex: 0.8, color: theme.text.body, fontFamily: WEB_FONT }]} numberOfLines={1}>{intervalLabel(form.rptDtSe)}</Text>
          <Text style={[styles.td, { flex: 1, color: theme.text.body, fontFamily: WEB_FONT }]} numberOfLines={1}>{deptLabel(form.deptCd)}</Text>
          <Text style={[styles.td, { flex: 1, color: theme.text.body, fontFamily: WEB_FONT }]} numberOfLines={1}>{userLabel(form.rptAdmId)}</Text>
          <View style={[styles.td, { flex: 0.7 }]}>{renderUseBadge(form.useYn)}</View>
          <View style={[styles.td, { flex: 0.8 }]}>{renderFormActions(form)}</View>
        </View>
      ))}
    </ScrollView>
  );

  const renderFormsCards = () => (
    <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
      {formsLoading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.brand.primary} /></View>
      ) : forms.length === 0 ? (
        <View style={styles.centered}><Text style={[styles.emptyText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>등록된 보고 양식이 없습니다.</Text></View>
      ) : forms.map((form) => (
        <View key={form.rptFormId} style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
          <View style={styles.cardTop}>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardName, { color: theme.text.primary, fontFamily: WEB_FONT }]}>{form.rptTtl}</Text>
              <Text style={[styles.cardId, { color: theme.text.muted, fontFamily: WEB_FONT }]}>{form.rptFormId}</Text>
            </View>
            {renderUseBadge(form.useYn)}
          </View>
          <Text style={[styles.cardMeta, { color: theme.text.body, fontFamily: WEB_FONT }]}>
            {[intervalLabel(form.rptDtSe), deptLabel(form.deptCd), userLabel(form.rptAdmId)].join(' · ')}
          </Text>
          <View style={styles.cardActions}>{renderFormActions(form)}</View>
        </View>
      ))}
    </ScrollView>
  );

  const renderRoundsTable = () => (
    <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.tableHeader, { backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.default }]}>
        {[
          { label: '회차번호', flex: 0.7 },
          { label: '회차명', flex: 1.8 },
          { label: '기준일', flex: 1 },
          { label: '작성상태', flex: 1 },
          { label: '회차 설정', flex: 0.8 },
          { label: '관리', flex: 0.8 },
        ].map((h) => (
          <Text key={h.label} style={[styles.th, { color: theme.text.subtle, fontFamily: WEB_FONT, flex: h.flex }]}>{h.label}</Text>
        ))}
      </View>
      {roundsLoading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.brand.primary} /></View>
      ) : roundRows.length === 0 ? (
        <View style={styles.centered}><Text style={[styles.emptyText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>등록된 회차가 없습니다.</Text></View>
      ) : roundRows.map((round, idx) => (
        <View key={round.roundSn} style={[styles.tableRow, { borderBottomColor: theme.border.subtle }, idx % 2 === 1 && { backgroundColor: theme.bg.surfaceAlt }]}>
          <Text style={[styles.td, { flex: 0.7, color: theme.text.primary, fontFamily: WEB_FONT }]}>{round.roundSn}</Text>
          <Text style={[styles.td, { flex: 1.8, color: theme.text.primary, fontFamily: WEB_FONT }]} numberOfLines={1}>{round.roundNm}</Text>
          <Text style={[styles.td, { flex: 1, color: theme.text.body, fontFamily: WEB_FONT }]}>{fmtDisplay(round.roundYmd)}</Text>
          <Text style={[styles.td, { flex: 1, color: theme.text.body, fontFamily: WEB_FONT }]}>제출 {round.submittedCount}건 / 작성 {round.writtenCount}건</Text>
          <View style={[styles.td, { flex: 0.8 }]}>{renderRoundEditBadge(round.locked)}</View>
          <View style={[styles.td, { flex: 0.8 }]}>{renderRoundActions(round)}</View>
        </View>
      ))}
    </ScrollView>
  );

  const renderReports = () => (
    <ScrollView style={styles.reportScroll} contentContainerStyle={styles.reportContent} showsVerticalScrollIndicator={false}>
      {!reportFormId || !selectedReportRound ? (
        <View style={styles.inlineEmpty}>
          <Text style={[styles.emptyText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>보고를 확인할 양식과 회차를 선택하세요.</Text>
        </View>
      ) : (
        <>
          <View style={[styles.reportHeader, { borderColor: theme.border.subtle, backgroundColor: theme.bg.surface }]}>
            <Text style={[styles.reportTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
              제출 현황: 제출 {submittedCount}명 / 대상 {submissions.length}명
            </Text>
          </View>

          {selectedReportRound.rptSum && (
            <View style={[styles.summaryCard, { borderColor: theme.border.subtle, backgroundColor: theme.bg.surface }]}>
              <View style={styles.summaryHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>AI 회차 요약</Text>
                <TouchableOpacity onPress={openSummaryEdit} style={[styles.smallTextBtn, { borderColor: theme.border.default }]} activeOpacity={0.7}>
                  <Pencil size={13} color={theme.text.body} />
                  <Text style={[styles.smallTextBtnText, { color: theme.text.body, fontFamily: WEB_FONT }]}>수정</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.summaryText, { color: theme.text.body, fontFamily: WEB_FONT }]}>{selectedReportRound.rptSum}</Text>
            </View>
          )}

          {submissionsLoading ? (
            <View style={styles.centered}><ActivityIndicator color={theme.brand.primary} /></View>
          ) : submissions.length === 0 ? (
            <View style={styles.inlineEmpty}>
              <Text style={[styles.emptyText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>제출 대상자가 없습니다.</Text>
            </View>
          ) : (
            <View style={styles.submissionGrid}>
              {submissions.map((submission) => renderSubmissionCard(submission))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  const renderSubmissionCard = (submission: Submission) => {
    const colors = statusColor[submission.status];
    return (
      <View key={submission.userId} style={[styles.submissionCard, { borderColor: theme.border.subtle, backgroundColor: theme.bg.surface }]}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: theme.text.primary, fontFamily: WEB_FONT }]}>{submission.userNm}</Text>
            <Text style={[styles.cardId, { color: theme.text.muted, fontFamily: WEB_FONT }]}>{submission.userId}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text, fontFamily: WEB_FONT }]}>{statusLabel[submission.status]}</Text>
          </View>
        </View>
        <Text style={[styles.cardMeta, { color: theme.text.body, fontFamily: WEB_FONT }]}>
          {submission.sbmtYmd ? `제출일 ${fmtDisplay(submission.sbmtYmd)}` : '제출일 없음'}
        </Text>
        <Text style={[styles.previewText, { color: theme.text.muted, fontFamily: WEB_FONT }]} numberOfLines={2}>
          {submission.execDesc || submission.planDesc || '작성 내용이 없습니다.'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setSelectedSubmission(submission);
            setModalMode('submission');
          }}
          style={[styles.smallTextBtn, { borderColor: theme.border.default }]}
          activeOpacity={0.7}
        >
          <FileText size={13} color={theme.text.body} />
          <Text style={[styles.smallTextBtnText, { color: theme.text.body, fontFamily: WEB_FONT }]}>내용 보기</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFormsTab = () => (
    <>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>양식관리</Text>
        <TouchableOpacity onPress={openCreateForm} style={[styles.addBtn, { borderColor: theme.brand.primary }]} activeOpacity={0.8}>
          <Plus size={15} color={theme.brand.primary} />
          <Text style={[styles.addBtnText, { color: theme.brand.primary, fontFamily: WEB_FONT }]}>양식 추가</Text>
        </TouchableOpacity>
      </View>
      {isMobile ? renderFormsCards() : renderFormsTable()}
    </>
  );

  const renderRoundsTab = () => (
    <>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>회차관리</Text>
        <TouchableOpacity
          onPress={openCreateRound}
          disabled={!roundFormId}
          style={[styles.addBtn, { borderColor: theme.brand.primary }, !roundFormId && styles.btnDisabled]}
          activeOpacity={0.8}
        >
          <Plus size={15} color={theme.brand.primary} />
          <Text style={[styles.addBtnText, { color: theme.brand.primary, fontFamily: WEB_FONT }]}>회차 생성</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.controlRow}>
        <View style={styles.controlCol}>
          <AppDropdown
            label="양식 선택"
            value={roundFormId}
            options={formOptions}
            onChange={setRoundFormId}
            search={formOptions.length > 6}
          />
        </View>
      </View>
      {!roundFormId ? (
        <View style={styles.inlineEmpty}>
          <Text style={[styles.emptyText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>회차를 관리할 양식을 먼저 선택하세요.</Text>
        </View>
      ) : renderRoundsTable()}
    </>
  );

  const renderReportsTab = () => (
    <>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>보고관리</Text>
        {selectedReportRound ? (
          <TouchableOpacity
            onPress={handleGenerateSummary}
            disabled={generateSummary.isPending}
            style={[styles.addBtn, { borderColor: theme.brand.primary }, generateSummary.isPending && styles.btnDisabled]}
            activeOpacity={0.8}
          >
            <Sparkles size={15} color={theme.brand.primary} />
            <Text style={[styles.addBtnText, { color: theme.brand.primary, fontFamily: WEB_FONT }]}>
              {selectedReportRound.rptSum ? 'AI 요약 재생성' : 'AI 요약 생성'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActionPlaceholder} />
        )}
      </View>
      <View style={styles.controlRow}>
        <View style={styles.controlCol}>
          <AppDropdown
            label="양식 선택"
            value={reportFormId}
            options={formOptions}
            onChange={(v) => {
              setReportFormId(v);
              setReportRoundSn(undefined);
            }}
            search={formOptions.length > 6}
          />
        </View>
        <View style={styles.controlCol}>
          <AppDropdown
            label="회차 선택"
            value={reportRoundSn ? String(reportRoundSn) : ''}
            options={reportRoundOptions}
            onChange={(v) => setReportRoundSn(Number(v))}
            disabled={!reportFormId}
          />
        </View>
      </View>
      {renderReports()}
    </>
  );

  const renderModal = () => {
    if (!modalMode) return null;
    const titleMap: Record<Exclude<ModalMode, null>, string> = {
      'form-create': '보고 양식 등록',
      'form-edit': '보고 양식 수정',
      'round-create': '회차 생성',
      'round-edit': '회차 수정',
      submission: '보고 내용',
      summary: 'AI 회차 요약 수정',
    };
    const canSave = modalMode !== 'submission';
    const saveLabel = modalMode === 'round-create' ? '생성' : modalMode === 'form-create' ? '등록' : '저장';
    const handleSave = () => {
      if (modalMode === 'form-create' || modalMode === 'form-edit') return handleSaveForm();
      if (modalMode === 'round-create' || modalMode === 'round-edit') return handleSaveRound();
      if (modalMode === 'summary') return handleSaveSummary();
    };

    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { width: modalWidth, backgroundColor: theme.bg.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border.subtle }]}>
              <Text style={[styles.modalTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>{titleMap[modalMode]}</Text>
              <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
                <X size={18} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={[styles.modalBody, modalMode === 'submission' && styles.submissionModalBody]} showsVerticalScrollIndicator={false}>
              {(modalMode === 'form-create' || modalMode === 'form-edit') && renderFormEditor()}
              {(modalMode === 'round-create' || modalMode === 'round-edit') && renderRoundEditor()}
              {modalMode === 'submission' && renderSubmissionDetail()}
              {modalMode === 'summary' && renderSummaryEditor()}
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: theme.border.default }]}>
              <TouchableOpacity onPress={closeModal} style={[styles.cancelBtn, { borderColor: theme.border.default }]} activeOpacity={0.7}>
                <Text style={[styles.cancelBtnText, { color: theme.text.muted, fontFamily: WEB_FONT }]}>{canSave ? '취소' : '닫기'}</Text>
              </TouchableOpacity>
              {canSave && (
                <TouchableOpacity onPress={handleSave} disabled={isSaving} style={[styles.saveBtn, { backgroundColor: theme.brand.primary }, isSaving && styles.btnDisabled]} activeOpacity={0.8}>
                  {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.saveBtnText, { fontFamily: WEB_FONT }]}>{saveLabel}</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderFormEditor = () => (
    <>
      {renderField('양식 ID', formDraft.rptFormId, (v) => setFormDraft((f) => ({ ...f, rptFormId: v.toUpperCase() })), { required: true, readOnly: modalMode === 'form-edit', autoCapitalize: 'characters' })}
      {renderField('제목', formDraft.rptTtl, (v) => setFormDraft((f) => ({ ...f, rptTtl: v })), { required: true })}
      {renderField('설명', formDraft.rptDesc, (v) => setFormDraft((f) => ({ ...f, rptDesc: v })), { required: true, multiline: true })}
      <AppDropdown label="보고 주기" required value={formDraft.rptDtSe} options={intervals} disabled={!!selectedForm?.hasRounds} onChange={(v) => setFormDraft((f) => ({ ...f, rptDtSe: v }))} />
      <AppDropdown label="대상 부서" required value={formDraft.deptCd} options={deptOptions} disabled={!!selectedForm?.hasRounds} search={deptOptions.length > 6} onChange={(v) => setFormDraft((f) => ({ ...f, deptCd: v }))} />
      <AppDropdown label="보고 관리자" required value={formDraft.rptAdmId} options={userOptions} search={userOptions.length > 6} onChange={(v) => setFormDraft((f) => ({ ...f, rptAdmId: v }))} />
      {renderToggle('전체 조회 허용', formDraft.openYn, (v) => setFormDraft((f) => ({ ...f, openYn: v })), '허용', '허용 안 함')}
      {renderDateField('시작일', formDraft.stYmd ?? '', (v) => setFormDraft((f) => ({ ...f, stYmd: v })), 'formStart', { readOnly: !!selectedForm?.hasRounds })}
      {renderField('비고', formDraft.rmk ?? '', (v) => setFormDraft((f) => ({ ...f, rmk: v })), { multiline: true })}
    </>
  );

  const renderRoundEditor = () => (
    <>
      {renderField('회차명', roundDraft.roundNm, (v) => setRoundDraft((r) => ({ ...r, roundNm: v })), { required: true })}
      {renderDateField('기준일', roundDraft.roundYmd, (v) => setRoundDraft((r) => ({ ...r, roundYmd: v })), 'roundYmd', { required: true })}
    </>
  );

  const renderSubmissionDetail = () => {
    if (!selectedSubmission) return null;
    const colors = statusColor[selectedSubmission.status];
    return (
      <>
        <View style={styles.detailHeader}>
          <View>
            <Text style={[styles.detailTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>{selectedSubmission.userNm}</Text>
            <Text style={[styles.cardId, { color: theme.text.muted, fontFamily: WEB_FONT }]}>{selectedSubmission.userId}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text, fontFamily: WEB_FONT }]}>{statusLabel[selectedSubmission.status]}</Text>
          </View>
        </View>
        <Text style={[styles.detailLabel, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>수행 내용</Text>
        <Text style={[styles.detailBody, { color: theme.text.body, borderColor: theme.border.subtle, backgroundColor: theme.bg.surfaceAlt, fontFamily: WEB_FONT }]}>
          {selectedSubmission.execDesc || '작성 내용이 없습니다.'}
        </Text>
        <Text style={[styles.detailLabel, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>예정 내용</Text>
        <Text style={[styles.detailBody, { color: theme.text.body, borderColor: theme.border.subtle, backgroundColor: theme.bg.surfaceAlt, fontFamily: WEB_FONT }]}>
          {selectedSubmission.planDesc || '작성 내용이 없습니다.'}
        </Text>
      </>
    );
  };

  const renderSummaryEditor = () => (
    <>
      <TextInput
        style={[styles.input, styles.inputMultilineLarge, { color: theme.text.primary, borderColor: theme.border.default, backgroundColor: theme.bg.surface, fontFamily: WEB_FONT }]}
        value={summaryDraft}
        onChangeText={setSummaryDraft}
        placeholder="회차 요약"
        placeholderTextColor={theme.text.muted}
        multiline
      />
    </>
  );

  const renderField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { required?: boolean; readOnly?: boolean; multiline?: boolean; placeholder?: string; autoCapitalize?: 'characters' | 'none' },
  ) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
        {label}{opts?.required && <Text style={{ color: '#EF4444' }}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          opts?.multiline && styles.inputMultiline,
          {
            color: theme.text.primary,
            borderColor: theme.border.default,
            backgroundColor: opts?.readOnly ? theme.bg.surfaceAlt : theme.bg.surface,
            fontFamily: WEB_FONT,
          },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={opts?.placeholder ?? ''}
        placeholderTextColor={theme.text.muted}
        editable={!opts?.readOnly}
        multiline={opts?.multiline}
        autoCapitalize={opts?.autoCapitalize ?? 'none'}
      />
    </View>
  );

  const renderDateField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    field: Exclude<CalendarField, null>,
    opts?: { required?: boolean; readOnly?: boolean },
  ) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
        {label}{opts?.required && <Text style={{ color: '#EF4444' }}> *</Text>}
      </Text>
      <TouchableOpacity
        onPress={() => !opts?.readOnly && setCalendarField(calendarField === field ? null : field)}
        activeOpacity={0.8}
        style={[
          styles.dateBtn,
          {
            borderColor: theme.border.default,
            backgroundColor: opts?.readOnly ? theme.bg.surfaceAlt : theme.bg.surface,
          },
        ]}
        disabled={opts?.readOnly}
      >
        <CalendarDays size={16} color={value ? theme.brand.primary : theme.text.muted} />
        <Text style={[styles.dateBtnText, { color: value ? theme.text.primary : theme.text.muted, fontFamily: WEB_FONT }]}>
          {value ? fmtDisplay(value) : '날짜를 선택하세요'}
        </Text>
        {value && !opts?.readOnly ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: theme.text.muted, fontSize: 16 }}>×</Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
      {calendarField === field && (
        <MiniCalendar
          value={value}
          onChange={onChange}
          onClose={() => setCalendarField(null)}
          theme={theme}
        />
      )}
    </View>
  );

  const renderToggle = (label: string, value: string, onChange: (v: string) => void, yesLabel: string, noLabel: string) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>{label}</Text>
      <View style={styles.toggleRow}>
        {(['Y', 'N'] as const).map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => onChange(v)}
            style={[
              styles.toggleBtn,
              { borderColor: theme.border.default },
              value === v && { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleBtnText, { color: value === v ? '#fff' : theme.text.body, fontFamily: WEB_FONT }]}>
              {v === 'Y' ? yesLabel : noLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderUseBadge = (useYn: string) => (
    <View style={[styles.badge, { backgroundColor: useYn === 'Y' ? '#ECFDF5' : '#F3F4F6' }]}>
      <Text style={[styles.badgeText, { color: useYn === 'Y' ? '#065F46' : '#6B7280', fontFamily: WEB_FONT }]}>
        {useYn === 'Y' ? '활성' : '비활성'}
      </Text>
    </View>
  );

  const renderRoundEditBadge = (locked: boolean) => (
    <View style={[styles.badge, { backgroundColor: locked ? '#FEF2F2' : '#ECFDF5' }]}>
      <Text style={[styles.badgeText, { color: locked ? '#B91C1C' : '#065F46', fontFamily: WEB_FONT }]}>
        {locked ? '변경 불가' : '변경 가능'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.surface }]}>
      {renderTabs()}
      {tab === 'forms' && renderFormsTab()}
      {tab === 'rounds' && renderRoundsTab()}
      {tab === 'reports' && renderReportsTab()}
      {renderModal()}
    </View>
  );
}

function getErrorMessage(e: unknown) {
  if (typeof e === 'object' && e && 'response' in e) {
    const response = (e as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return e instanceof Error ? e.message : '요청 처리에 실패했습니다.';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabTextActive: { fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600' },
  headerActionPlaceholder: { height: 29 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  addBtnText: { fontSize: 12, fontWeight: '500' },
  btnDisabled: { opacity: 0.5 },
  controlRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  controlCol: { width: 320, maxWidth: '100%' },
  tableScroll: { flex: 1 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 42,
    borderBottomWidth: 1,
  },
  th: { fontSize: 11, fontWeight: '600' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 42,
    borderBottomWidth: 1,
  },
  td: { fontSize: 13, alignItems: 'flex-start', justifyContent: 'center', paddingVertical: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 40 },
  inlineEmpty: { paddingHorizontal: 16 },
  cardScroll: { flex: 1 },
  cardContent: { padding: 12, gap: 10 },
  card: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardInfo: { gap: 2, flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600' },
  cardId: { fontSize: 12 },
  cardMeta: { fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 6 },
  iconBtn: { padding: 6, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  mutedText: { fontSize: 13 },
  reportScroll: { flex: 1 },
  reportContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 12 },
  selectorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  selectorCol: { flex: 1, minWidth: 260 },
  reportHeader: {
    borderWidth: 1, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  reportTitle: { fontSize: 15, fontWeight: '600' },
  summaryCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryText: { fontSize: 13, lineHeight: 21 },
  submissionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  submissionCard: { width: 280, borderRadius: 10, borderWidth: 1, padding: 14, gap: 8 },
  previewText: { fontSize: 12, lineHeight: 18 },
  smallTextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, alignSelf: 'flex-start',
  },
  smallTextBtnText: { fontSize: 12, fontWeight: '500' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { borderRadius: 16, overflow: 'hidden', maxHeight: '85%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 15, fontWeight: '600' },
  modalBody: { paddingHorizontal: 20, paddingTop: 12 },
  submissionModalBody: { paddingBottom: 14 },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  inputMultiline: { height: 80, paddingTop: 10, textAlignVertical: 'top' },
  inputMultilineLarge: { minHeight: 180, paddingTop: 10, textAlignVertical: 'top' },
  dateBtn: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateBtnText: { flex: 1, fontSize: 14 },
  toggleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBtnText: { fontSize: 13 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 14 },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 68,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  detailTitle: { fontSize: 15, fontWeight: '600' },
  detailLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  detailBody: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 74, fontSize: 13, lineHeight: 20 },
});

function MiniCalendar({
  value, onChange, onClose, theme,
}: {
  value: string;
  onChange: (ymd: string) => void;
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const today = new Date();
  const initYear = value?.length === 8 ? parseInt(value.slice(0, 4), 10) : today.getFullYear();
  const initMonth = value?.length === 8 ? parseInt(value.slice(4, 6), 10) - 1 : today.getMonth();
  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);

  const prevMonth = () => viewMonth === 0
    ? (setViewYear((y) => y - 1), setViewMonth(11))
    : setViewMonth((m) => m - 1);
  const nextMonth = () => viewMonth === 11
    ? (setViewYear((y) => y + 1), setViewMonth(0))
    : setViewMonth((m) => m + 1);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const todayYmd = toYmd(today.getFullYear(), today.getMonth(), today.getDate());
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={[cal.wrap, { borderColor: theme.border.default, backgroundColor: theme.bg.surface }]}>
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
      <View style={[cal.weekRow, { backgroundColor: theme.bg.surfaceAlt }]}>
        {WEEKDAY_KR.map((w, i) => (
          <View key={w} style={cal.weekCell}>
            <Text style={[cal.weekText, { color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : theme.text.muted, fontFamily: WEB_FONT }]}>
              {w}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={cal.row}>
          {row.map((day, ci) => {
            if (!day) return <View key={ci} style={cal.dayCell} />;
            const ymd = toYmd(viewYear, viewMonth, day);
            const isSel = ymd === value;
            const isToday = ymd === todayYmd;
            const isWeekend = ci === 0 || ci === 6;
            return (
              <TouchableOpacity
                key={ci}
                style={[cal.dayCell, isSel && { backgroundColor: theme.brand.primary, borderRadius: 8 }]}
                onPress={() => { onChange(ymd); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[
                  cal.dayText,
                  { color: isSel ? '#fff' : isToday ? theme.brand.primary : isWeekend ? (ci === 0 ? '#EF4444' : '#3B82F6') : theme.text.primary },
                  (isSel || isToday) && { fontWeight: '700' },
                  { fontFamily: WEB_FONT },
                ]}>
                  {day}
                </Text>
                {isToday && !isSel && <View style={[cal.todayDot, { backgroundColor: theme.brand.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const cal = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1 },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 18, fontWeight: '600' },
  navTitle: { fontSize: 14, fontWeight: '700' },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekText: { fontSize: 11, fontWeight: '600' },
  row: { flexDirection: 'row' },
  dayCell: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 13 },
  todayDot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2 },
});
