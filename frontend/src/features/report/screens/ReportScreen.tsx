import React, { useEffect, useMemo, useState } from 'react';
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
  View,
} from 'react-native';
import { ArrowLeft, CheckCircle2, FileText, Save, X } from 'lucide-react-native';
import { useCurrentUser } from '../../auth/api';
import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import { useTheme } from '../../../shared/hooks/useTheme';
import { fmtYmdDash, getWeekRange, parseYmd, toYmd } from '../../../shared/utils/date';
import {
  type MyReportRound,
  type ReportStatus,
  type ReportSubmission,
  useMyReportRounds,
  useReportSubmissions,
  useSaveReportDraft,
  useSubmitReport,
} from '../api';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

type ViewMode = 'home' | 'form' | 'round';

interface ReportFormSummary {
  rptFormId: string;
  rptTtl: string;
  rptDesc: string;
  rptDtSe: string;
  rounds: MyReportRound[];
  currentRound: MyReportRound | null;
}

const statusLabel: Record<ReportStatus, string> = {
  NOT_WRITTEN: '미작성',
  DRAFT: '임시저장',
  SUBMITTED: '제출 완료',
};

const statusColor: Record<ReportStatus, { bg: string; text: string }> = {
  NOT_WRITTEN: { bg: '#F3F4F6', text: '#6B7280' },
  DRAFT: { bg: '#FEF3C7', text: '#92400E' },
  SUBMITTED: { bg: '#ECFDF5', text: '#065F46' },
};

export function ReportScreen() {
  const theme = useTheme();
  const confirm = useConfirm();
  const toast = useToast();
  const { data: currentUser } = useCurrentUser();
  const { data: rounds = [], isLoading, error } = useMyReportRounds();
  const saveDraft = useSaveReportDraft();
  const submitReport = useSubmitReport();

  const [mode, setMode] = useState<ViewMode>('home');
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedRoundSn, setSelectedRoundSn] = useState<number | null>(null);
  const [execDesc, setExecDesc] = useState('');
  const [planDesc, setPlanDesc] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<ReportSubmission | null>(null);
  const [writeModalOpen, setWriteModalOpen] = useState(false);

  const today = useMemo(() => toYmd(new Date()), []);
  const forms = useMemo(() => buildFormSummaries(rounds, today), [rounds, today]);
  const currentReports = useMemo(
    () => forms.map((f) => f.currentRound).filter(Boolean) as MyReportRound[],
    [forms],
  );
  const selectedForm = useMemo(
    () => forms.find((f) => f.rptFormId === selectedFormId) ?? null,
    [forms, selectedFormId],
  );
  const selectedRound = useMemo(
    () => selectedForm?.rounds.find((r) => r.roundSn === selectedRoundSn) ?? null,
    [selectedForm, selectedRoundSn],
  );

  const { data: submissions = [], isLoading: submissionsLoading } = useReportSubmissions(
    selectedRound?.rptFormId,
    selectedRound?.roundSn,
  );

  useEffect(() => {
    if (!selectedRound) return;
    setExecDesc(selectedRound.execDesc ?? '');
    setPlanDesc(selectedRound.planDesc ?? '');
  }, [selectedRound?.rptFormId, selectedRound?.roundSn, selectedRound?.execDesc, selectedRound?.planDesc]);

  useEffect(() => {
    if (!selectedFormId) return;
    const exists = forms.some((f) => f.rptFormId === selectedFormId);
    if (!exists) {
      setSelectedFormId(null);
      setSelectedRoundSn(null);
      setMode('home');
    }
  }, [forms, selectedFormId]);

  const openForm = (formId: string) => {
    setSelectedFormId(formId);
    setSelectedRoundSn(null);
    setMode('form');
  };

  const openRound = (round: MyReportRound) => {
    setSelectedFormId(round.rptFormId);
    setSelectedRoundSn(round.roundSn);
    setMode('round');
  };

  const goHome = () => {
    setSelectedFormId(null);
    setSelectedRoundSn(null);
    setMode('home');
  };

  const handleSaveDraft = async () => {
    if (!selectedRound) return;
    try {
      await saveDraft.mutateAsync({
        formId: selectedRound.rptFormId,
        roundSn: selectedRound.roundSn,
        data: { execDesc, planDesc },
      });
      toast.success('임시저장되었습니다.');
      setWriteModalOpen(false);
    } catch (e) {
      Alert.alert('오류', getErrorMessage(e));
    }
  };

  const handleSubmit = async () => {
    if (!selectedRound) return;
    if (!execDesc.trim()) return Alert.alert('오류', '수행 내용을 입력해주세요.');
    if (!planDesc.trim()) return Alert.alert('오류', '예정 내용을 입력해주세요.');

    setWriteModalOpen(false);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const ok = await confirm({
      title: '보고 제출',
      message: '제출 완료 후에는 수정할 수 없습니다. 제출하시겠습니까?',
      confirmText: '제출',
    });
    if (!ok) return;

    try {
      await submitReport.mutateAsync({
        formId: selectedRound.rptFormId,
        roundSn: selectedRound.roundSn,
        data: { execDesc, planDesc },
      });
      toast.success('제출되었습니다.');
      setWriteModalOpen(false);
    } catch (e) {
      Alert.alert('오류', getErrorMessage(e));
    }
  };

  if (isLoading) {
    return <CenterState><ActivityIndicator color={theme.brand.primary} /></CenterState>;
  }

  if (error) {
    return (
      <CenterState>
        <Text style={[styles.emptyText, { color: theme.semantic.danger }]}>
          보고 정보를 불러오지 못했습니다.
        </Text>
      </CenterState>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.surface }]}>
      {mode === 'home' && (
        <ReportHome
          forms={forms}
          currentReports={currentReports}
          onOpenForm={openForm}
          onOpenRound={openRound}
          theme={theme}
        />
      )}
      {mode === 'form' && selectedForm && (
        <ReportFormDetail
          form={selectedForm}
          onBack={goHome}
          onOpenRound={openRound}
          theme={theme}
        />
      )}
      {mode === 'round' && selectedForm && selectedRound && (
        <ReportRoundDetail
          form={selectedForm}
          round={selectedRound}
          submissions={submissions}
          submissionsLoading={submissionsLoading}
          currentUserId={currentUser?.userId ?? ''}
          onBack={() => setMode('form')}
          onOpenWrite={() => setWriteModalOpen(true)}
          onOpenSubmission={setSelectedSubmission}
          theme={theme}
        />
      )}
      <ReportWriteModal
        visible={writeModalOpen}
        round={selectedRound}
        execDesc={execDesc}
        planDesc={planDesc}
        setExecDesc={setExecDesc}
        setPlanDesc={setPlanDesc}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onClose={() => setWriteModalOpen(false)}
        pending={saveDraft.isPending || submitReport.isPending}
        theme={theme}
      />
      <SubmissionModal
        submission={selectedSubmission}
        round={selectedRound}
        onClose={() => setSelectedSubmission(null)}
        theme={theme}
      />
    </View>
  );
}

function ReportHome({
  forms,
  currentReports,
  onOpenForm,
  onOpenRound,
  theme,
}: {
  forms: ReportFormSummary[];
  currentReports: MyReportRound[];
  onOpenForm: (formId: string) => void;
  onOpenRound: (round: MyReportRound) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: theme.text.primary }]}>보고</Text>

      <View style={styles.section}>
        {currentReports.length === 0 ? (
          <EmptyBox text="현재 진행 중인 보고가 없습니다." theme={theme} />
        ) : (
          <View style={styles.cardGrid}>
            {currentReports.map((round) => (
              <TouchableOpacity
                key={`${round.rptFormId}-${round.roundSn}`}
                onPress={() => onOpenRound(round)}
                activeOpacity={0.75}
                style={[styles.homeCard, { borderColor: theme.border.subtle, backgroundColor: theme.bg.surfaceAlt }]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleBlock}>
                    <Text style={[styles.cardTitle, { color: theme.text.primary }]}>{round.rptTtl}</Text>
                    <Text style={[styles.cardMeta, { color: theme.text.muted }]}>
                      {round.roundNm} · {fmtDisplay(round.roundYmd)}
                    </Text>
                  </View>
                  <StatusBadge status={round.status} />
                </View>
                <View style={styles.cardFooter}>
                  <Text style={[styles.cardMeta, { color: theme.text.muted }]}>
                    제출 {round.submittedCount} / {round.targetCount}명
                  </Text>
                  <Text style={[styles.cardActionText, { color: theme.brand.primary }]}>
                    {round.status === 'NOT_WRITTEN' ? '보고하기' : round.status === 'DRAFT' ? '이어쓰기' : '보기'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>보고서 목록</Text>
        {forms.length === 0 ? (
          <EmptyBox text="사용 가능한 보고서가 없습니다." theme={theme} />
        ) : (
          <View style={[styles.table, { borderColor: theme.border.subtle }]}>
            <View style={[styles.tableHeader, { backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.subtle }]}>
              <Text style={[styles.th, { flex: 2, color: theme.text.muted }]}>보고서</Text>
              <Text style={[styles.th, { flex: 1, color: theme.text.muted }]}>최근 회차</Text>
              <Text style={[styles.th, { flex: 0.8, color: theme.text.muted }]}>회차</Text>
              <Text style={[styles.th, { flex: 0.8, color: theme.text.muted }]}>보기</Text>
            </View>
            {forms.map((form) => (
              <View key={form.rptFormId} style={[styles.tableRow, { borderBottomColor: theme.border.subtle }]}>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.tdStrong, { color: theme.text.primary }]}>{form.rptTtl}</Text>
                  <Text style={[styles.tdSub, { color: theme.text.muted }]} numberOfLines={1}>{form.rptDesc}</Text>
                </View>
                <Text style={[styles.td, { flex: 1, color: theme.text.body }]}>
                  {form.rounds[0] ? fmtDisplay(form.rounds[0].roundYmd) : '-'}
                </Text>
                <Text style={[styles.td, { flex: 0.8, color: theme.text.body }]}>{form.rounds.length}개</Text>
                <View style={{ flex: 0.8, alignItems: 'flex-start' }}>
                  <TouchableOpacity onPress={() => onOpenForm(form.rptFormId)} style={[styles.smallBtn, { borderColor: theme.border.default }]} activeOpacity={0.7}>
                    <Text style={[styles.smallBtnText, { color: theme.text.primary }]}>회차 보기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ReportFormDetail({
  form,
  onBack,
  onOpenRound,
  theme,
}: {
  form: ReportFormSummary;
  onBack: () => void;
  onOpenRound: (round: MyReportRound) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackButton label="보고 홈" onPress={onBack} theme={theme} />
      <View style={styles.titleBlock}>
        <Text style={[styles.pageTitle, { color: theme.text.primary }]}>{form.rptTtl}</Text>
        <Text style={[styles.pageSub, { color: theme.text.muted }]}>{form.rptDesc}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>회차 목록</Text>
        {form.rounds.length === 0 ? (
          <EmptyBox text="생성된 회차가 없습니다." theme={theme} />
        ) : (
          <View style={[styles.table, { borderColor: theme.border.subtle }]}>
            <View style={[styles.tableHeader, { backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.subtle }]}>
              <Text style={[styles.th, { flex: 1.8, color: theme.text.muted }]}>회차</Text>
              <Text style={[styles.th, { flex: 1, color: theme.text.muted }]}>제출 현황</Text>
              <Text style={[styles.th, { flex: 1, color: theme.text.muted }]}>내 작성</Text>
              <Text style={[styles.th, { flex: 0.8, color: theme.text.muted }]}>회차 보기</Text>
            </View>
            {form.rounds.map((round) => (
              <View key={`${round.rptFormId}-${round.roundSn}`} style={[styles.tableRow, { borderBottomColor: theme.border.subtle }]}>
                <View style={{ flex: 1.8 }}>
                  <Text style={[styles.tdStrong, { color: theme.text.primary }]}>{round.roundNm}</Text>
                  <Text style={[styles.tdSub, { color: theme.text.muted }]}>{fmtDisplay(round.roundYmd)}</Text>
                </View>
                <Text style={[styles.td, { flex: 1, color: theme.text.body }]}>
                  제출 {round.submittedCount} / {round.targetCount}명
                </Text>
                <View style={{ flex: 1, alignItems: 'flex-start' }}>
                  <StatusBadge status={round.status} />
                </View>
                <View style={{ flex: 0.8, alignItems: 'flex-start' }}>
                  <TouchableOpacity onPress={() => onOpenRound(round)} style={[styles.smallBtn, { borderColor: theme.border.default }]} activeOpacity={0.7}>
                    <Text style={[styles.smallBtnText, { color: theme.text.primary }]}>열기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ReportRoundDetail({
  form,
  round,
  submissions,
  submissionsLoading,
  currentUserId,
  onBack,
  onOpenWrite,
  onOpenSubmission,
  theme,
}: {
  form: ReportFormSummary;
  round: MyReportRound;
  submissions: ReportSubmission[];
  submissionsLoading: boolean;
  currentUserId: string;
  onBack: () => void;
  onOpenWrite: () => void;
  onOpenSubmission: (submission: ReportSubmission) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const submitted = submissions.filter((s) => s.status === 'SUBMITTED');
  const pendingUsers = submissions.filter((s) => s.status !== 'SUBMITTED');

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackButton label={form.rptTtl} onPress={onBack} theme={theme} />
      <View style={styles.titleBlock}>
        <Text style={[styles.pageTitle, { color: theme.text.primary }]}>{form.rptTtl}</Text>
        <Text style={[styles.pageSub, { color: theme.text.muted }]}>
          {round.roundNm} · {fmtDisplay(round.roundYmd)}
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            제출 현황 (제출 {round.submittedCount}명 / 대상 {round.targetCount}명)
          </Text>
        </View>
        {submissionsLoading ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color={theme.brand.primary} size="small" />
          </View>
        ) : (
          <>
            <PeopleSection
              title="미보고자"
              items={pendingUsers}
              currentUserId={currentUserId}
              theme={theme}
              onOpenOwn={onOpenWrite}
            />
            <PeopleSection
              title="보고자"
              items={submitted}
              currentUserId={currentUserId}
              theme={theme}
              onOpen={onOpenSubmission}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

function PeopleSection({
  title,
  items,
  currentUserId,
  theme,
  onOpen,
  onOpenOwn,
}: {
  title: string;
  items: ReportSubmission[];
  currentUserId: string;
  theme: ReturnType<typeof useTheme>;
  onOpen?: (submission: ReportSubmission) => void;
  onOpenOwn?: () => void;
}) {
  return (
    <View style={styles.peopleSection}>
      <Text style={[styles.peopleTitle, { color: theme.text.muted }]}>{title}</Text>
      {items.length === 0 ? (
        <Text style={[styles.inlineEmpty, { color: theme.text.subtle }]}>대상자가 없습니다.</Text>
      ) : (
        <View style={styles.peopleGrid}>
          {items.map((item) => {
            const isMe = item.userId === currentUserId;
            const clickable = item.status === 'SUBMITTED' ? !!onOpen : isMe && !!onOpenOwn;
            const handlePress = () => {
              if (item.status === 'SUBMITTED') {
                onOpen?.(item);
              } else if (isMe) {
                onOpenOwn?.();
              }
            };
            return (
              <TouchableOpacity
                key={item.userId}
                onPress={handlePress}
                disabled={!clickable}
                activeOpacity={0.75}
                style={[
                  styles.personCard,
                  {
                    borderColor: theme.border.subtle,
                    backgroundColor: isMe ? '#FFF4EA' : theme.bg.surfaceAlt,
                    opacity: clickable ? 1 : 0.86,
                  },
                ]}
              >
                <View style={styles.avatar}><Text style={styles.avatarText}>{(item.userNm || item.userId).slice(0, 1)}</Text></View>
                <View style={{ flex: 1 }}>
                  <View style={styles.personNameRow}>
                    <Text style={[styles.personName, { color: theme.text.primary }]}>{item.userNm}</Text>
                  </View>
                  <Text style={[styles.personMeta, { color: theme.text.muted }]}>
                    {statusLabel[item.status]}{item.sbmtYmd ? ` · ${fmtDisplay(item.sbmtYmd)}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function ReportWriteModal({
  visible,
  round,
  execDesc,
  planDesc,
  setExecDesc,
  setPlanDesc,
  onSaveDraft,
  onSubmit,
  onClose,
  pending,
  theme,
}: {
  visible: boolean;
  round: MyReportRound | null;
  execDesc: string;
  planDesc: string;
  setExecDesc: (value: string) => void;
  setPlanDesc: (value: string) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onClose: () => void;
  pending: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  if (!visible || !round) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, styles.wideModalCard, { backgroundColor: theme.bg.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border.subtle }]}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {round.status === 'DRAFT' ? '보고 이어쓰기' : '보고 작성'}
              </Text>
              <Text style={[styles.modalSub, { color: theme.text.muted }]}>
                {round.rptTtl} · {round.roundNm}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={styles.modalColumns}>
              <View style={[styles.field, styles.modalColumn]}>
                <Text style={[styles.label, { color: theme.text.body }]}>수행 내용</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.writeTextArea,
                    { borderColor: theme.border.default, color: theme.text.primary, backgroundColor: theme.bg.surface },
                  ]}
                  value={execDesc}
                  onChangeText={setExecDesc}
                  multiline
                  textAlignVertical="top"
                  placeholder="이번 회차에 수행한 업무를 작성하세요."
                  placeholderTextColor={theme.text.subtle}
                />
              </View>
              <View style={[styles.field, styles.modalColumn]}>
                <Text style={[styles.label, { color: theme.text.body }]}>예정 내용</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.writeTextArea,
                    { borderColor: theme.border.default, color: theme.text.primary, backgroundColor: theme.bg.surface },
                  ]}
                  value={planDesc}
                  onChangeText={setPlanDesc}
                  multiline
                  textAlignVertical="top"
                  placeholder="다음 회차까지 예정된 업무를 작성하세요."
                  placeholderTextColor={theme.text.subtle}
                />
              </View>
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: theme.border.subtle }]}>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={onClose} style={[styles.closeModalBtn, { borderColor: theme.border.default }]} activeOpacity={0.7}>
                <Text style={[styles.closeModalText, { color: theme.text.primary }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSaveDraft} disabled={pending} style={[styles.secondaryBtn, { borderColor: theme.brand.primary }, pending && styles.btnDisabled]} activeOpacity={0.8}>
                <Save size={14} color={theme.brand.primary} />
                <Text style={[styles.secondaryBtnText, { color: theme.brand.primary }]}>임시저장</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSubmit} disabled={pending} style={[styles.primaryBtn, { backgroundColor: theme.brand.primary }, pending && styles.btnDisabled]} activeOpacity={0.8}>
                {pending ? <ActivityIndicator size="small" color="#fff" /> : <CheckCircle2 size={14} color="#fff" />}
                <Text style={styles.primaryBtnText}>제출</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SubmissionModal({
  submission,
  round,
  onClose,
  theme,
}: {
  submission: ReportSubmission | null;
  round: MyReportRound | null;
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  if (!submission) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, styles.wideModalCard, { backgroundColor: theme.bg.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border.subtle }]}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>보고 내용</Text>
              <Text style={[styles.modalSub, { color: theme.text.muted }]}>
                {submission.userNm} · {round?.roundNm ?? ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={styles.modalColumns}>
            <DetailBlock label="수행 내용" value={submission.execDesc} theme={theme} />
            <DetailBlock label="예정 내용" value={submission.planDesc} theme={theme} />
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: theme.border.subtle }]}>
            <TouchableOpacity onPress={onClose} style={[styles.closeModalBtn, { borderColor: theme.border.default }]} activeOpacity={0.7}>
              <Text style={[styles.closeModalText, { color: theme.text.primary }]}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailBlock({
  label,
  value,
  theme,
}: {
  label: string;
  value: string | null;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.field, styles.modalColumn]}>
      <Text style={[styles.label, { color: theme.text.body }]}>{label}</Text>
      <View style={[styles.detailBox, { borderColor: theme.border.default, backgroundColor: theme.bg.surfaceAlt }]}>
        <Text style={[styles.detailText, { color: theme.text.body }]}>{value || '-'}</Text>
      </View>
    </View>
  );
}

function BackButton({
  label,
  onPress,
  theme,
}: {
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.backBtn} activeOpacity={0.7}>
      <ArrowLeft size={15} color={theme.brand.primary} />
      <Text style={[styles.backText, { color: theme.brand.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const meta = statusColor[status];
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.text }]}>{statusLabel[status]}</Text>
    </View>
  );
}

function EmptyBox({ text, theme }: { text: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.emptyBox, { borderColor: theme.border.subtle, backgroundColor: theme.bg.surfaceAlt }]}>
      <FileText size={24} color={theme.text.subtle} />
      <Text style={[styles.emptyText, { color: theme.text.muted }]}>{text}</Text>
    </View>
  );
}

function CenterState({ children }: { children: React.ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

function buildFormSummaries(rounds: MyReportRound[], today: string): ReportFormSummary[] {
  const map = new Map<string, ReportFormSummary>();
  for (const round of rounds) {
    const existing = map.get(round.rptFormId);
    if (existing) {
      existing.rounds.push(round);
    } else {
      map.set(round.rptFormId, {
        rptFormId: round.rptFormId,
        rptTtl: round.rptTtl,
        rptDesc: round.rptDesc,
        rptDtSe: round.rptDtSe,
        rounds: [round],
        currentRound: null,
      });
    }
  }
  return Array.from(map.values()).map((form) => {
    const sortedRounds = [...form.rounds].sort((a, b) => b.roundYmd.localeCompare(a.roundYmd));
    return {
      ...form,
      rounds: sortedRounds,
      currentRound: sortedRounds.find((round) => isCurrentRound(round, today)) ?? sortedRounds[0] ?? null,
    };
  });
}

function isCurrentRound(round: MyReportRound, today: string) {
  const cadence = (round.rptDtSe ?? '').toUpperCase();
  if (!isYmd(round.roundYmd)) return false;
  if (cadence.includes('MONTH') || cadence.includes('월')) return round.roundYmd.slice(0, 6) === today.slice(0, 6);
  if (cadence.includes('WEEK') || cadence.includes('주')) {
    const { st, end } = getWeekRange(parseYmd(today));
    return round.roundYmd >= st && round.roundYmd <= end;
  }
  if (cadence.includes('DAY') || cadence.includes('일')) return round.roundYmd === today;
  return Math.abs(diffDays(round.roundYmd, today)) <= 7;
}

function diffDays(ymd: string, today: string) {
  if (!isYmd(ymd) || !isYmd(today)) return 999;
  return Math.round((parseYmd(ymd).getTime() - parseYmd(today).getTime()) / 86400000);
}

function fmtDisplay(ymd: string | null | undefined) {
  if (!ymd || !isYmd(ymd)) return '-';
  return fmtYmdDash(ymd);
}

function isYmd(value: string | null | undefined) {
  return !!value && /^\d{8}$/.test(value);
}

function getErrorMessage(e: unknown) {
  if (typeof e === 'object' && e && 'response' in e) {
    const response = (e as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return e instanceof Error ? e.message : '요청 처리에 실패했습니다.';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 28, gap: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  pageTitle: { fontSize: 24, fontWeight: '700', fontFamily: WEB_FONT },
  pageSub: { fontSize: 14, lineHeight: 21, fontFamily: WEB_FONT },
  titleBlock: { gap: 8 },
  section: { gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', fontFamily: WEB_FONT },
  sectionMeta: { fontSize: 13, fontFamily: WEB_FONT },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  homeCard: { width: 280, minHeight: 136, borderWidth: 1, borderRadius: 14, padding: 16, justifyContent: 'space-between', gap: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardTitleBlock: { flex: 1, gap: 5 },
  cardTitle: { fontSize: 15, fontWeight: '700', fontFamily: WEB_FONT },
  cardMeta: { fontSize: 12, fontFamily: WEB_FONT },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardActionText: { fontSize: 13, fontWeight: '700', fontFamily: WEB_FONT },
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  th: { fontSize: 12, fontWeight: '700', fontFamily: WEB_FONT },
  td: { fontSize: 13, fontFamily: WEB_FONT },
  tdStrong: { fontSize: 13, fontWeight: '700', fontFamily: WEB_FONT },
  tdSub: { marginTop: 3, fontSize: 12, fontFamily: WEB_FONT },
  smallBtn: { height: 30, paddingHorizontal: 10, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  smallBtnText: { fontSize: 12, fontWeight: '600', fontFamily: WEB_FONT },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: WEB_FONT },
  emptyBox: { borderWidth: 1, borderRadius: 14, minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 14, fontFamily: WEB_FONT },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  backText: { fontSize: 13, fontWeight: '700', fontFamily: WEB_FONT },
  peopleSection: { gap: 8 },
  peopleTitle: { fontSize: 12, fontWeight: '700', fontFamily: WEB_FONT },
  peopleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  personCard: { width: 260, minHeight: 58, borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#6B7280', fontSize: 13, fontWeight: '700', fontFamily: WEB_FONT },
  personName: { fontSize: 13, fontWeight: '700', fontFamily: WEB_FONT },
  personNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  personMeta: { marginTop: 2, fontSize: 12, fontFamily: WEB_FONT },
  inlineLoading: { padding: 20, alignItems: 'center' },
  inlineEmpty: { fontSize: 13, fontFamily: WEB_FONT },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: '700', fontFamily: WEB_FONT },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: WEB_FONT },
  textArea: { minHeight: 130, lineHeight: 20, paddingTop: 10 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 2 },
  secondaryBtn: { height: 40, borderRadius: 9, borderWidth: 1, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 6 },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', fontFamily: WEB_FONT },
  primaryBtn: { height: 40, borderRadius: 9, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: WEB_FONT },
  btnDisabled: { opacity: 0.55 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 620, maxHeight: '86%', borderRadius: 18, overflow: 'hidden' },
  wideModalCard: { maxWidth: 920 },
  modalHeader: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 16, fontWeight: '700', fontFamily: WEB_FONT },
  modalSub: { marginTop: 4, fontSize: 12, fontFamily: WEB_FONT },
  modalBody: { padding: 20, gap: 14 },
  modalColumns: { flexDirection: 'row', gap: 14 },
  modalColumn: { flex: 1 },
  modalFooter: { padding: 14, borderTopWidth: 1, alignItems: 'flex-end' },
  closeModalBtn: { height: 38, paddingHorizontal: 16, borderWidth: 1, borderRadius: 9, justifyContent: 'center' },
  closeModalText: { fontSize: 14, fontWeight: '600', fontFamily: WEB_FONT },
  writeTextArea: { minHeight: 240, lineHeight: 20, paddingTop: 10 },
  detailBox: { borderWidth: 1, borderRadius: 10, minHeight: 110, padding: 12 },
  detailText: { fontSize: 14, lineHeight: 21, fontFamily: WEB_FONT },
});
