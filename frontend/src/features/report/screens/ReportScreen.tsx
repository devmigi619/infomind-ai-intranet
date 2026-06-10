import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
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
        <Text className="text-[14px]" style={{ color: theme.semantic.danger, fontFamily: WEB_FONT }}>
          보고 정보를 불러오지 못했습니다.
        </Text>
      </CenterState>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg.surface }}>
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
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 28, gap: 28 }} showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>보고</Text>

      <View className="gap-[14px]">
        {currentReports.length === 0 ? (
          <EmptyBox text="현재 진행 중인 보고가 없습니다." theme={theme} />
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {currentReports.map((round) => (
              <TouchableOpacity
                key={`${round.rptFormId}-${round.roundSn}`}
                onPress={() => onOpenRound(round)}
                activeOpacity={0.75}
                className="w-[280px] min-h-[136px] border rounded-[14px] p-4 justify-between gap-4"
                style={{ borderColor: theme.border.subtle, backgroundColor: theme.bg.surfaceAlt }}
              >
                <View className="flex-row items-start justify-between gap-[10px]">
                  <View className="flex-1 gap-[5px]">
                    <Text className="text-[15px] font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{round.rptTtl}</Text>
                    <Text className="text-xs" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
                      {round.roundNm} · {fmtDisplay(round.roundYmd)}
                    </Text>
                  </View>
                  <StatusBadge status={round.status} />
                </View>
                <View className="flex-row items-center justify-between gap-[10px]">
                  <Text className="text-xs" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
                    제출 {round.submittedCount} / {round.targetCount}명
                  </Text>
                  <Text className="text-[13px] font-bold" style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}>
                    {round.status === 'NOT_WRITTEN' ? '보고하기' : round.status === 'DRAFT' ? '이어쓰기' : '보기'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View className="gap-[14px]">
        <Text className="text-base font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>보고서 목록</Text>
        {forms.length === 0 ? (
          <EmptyBox text="사용 가능한 보고서가 없습니다." theme={theme} />
        ) : (
          <View className="border rounded-xl overflow-hidden" style={{ borderColor: theme.border.subtle }}>
            <View className="flex-row items-center px-4 py-3 border-b" style={{ backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.subtle }}>
              <Text className="text-xs font-bold" style={{ flex: 2, color: theme.text.muted, fontFamily: WEB_FONT }}>보고서</Text>
              <Text className="text-xs font-bold" style={{ flex: 1, color: theme.text.muted, fontFamily: WEB_FONT }}>최근 회차</Text>
              <Text className="text-xs font-bold" style={{ flex: 0.8, color: theme.text.muted, fontFamily: WEB_FONT }}>회차</Text>
              <Text className="text-xs font-bold" style={{ flex: 0.8, color: theme.text.muted, fontFamily: WEB_FONT }}>보기</Text>
            </View>
            {forms.map((form) => (
              <View key={form.rptFormId} className="flex-row items-center px-4 py-3.5 border-b gap-3" style={{ borderBottomColor: theme.border.subtle }}>
                <View style={{ flex: 2 }}>
                  <Text className="text-[13px] font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{form.rptTtl}</Text>
                  <Text className="mt-[3px] text-xs" style={{ color: theme.text.muted, fontFamily: WEB_FONT }} numberOfLines={1}>{form.rptDesc}</Text>
                </View>
                <Text className="text-[13px]" style={{ flex: 1, color: theme.text.body, fontFamily: WEB_FONT }}>
                  {form.rounds[0] ? fmtDisplay(form.rounds[0].roundYmd) : '-'}
                </Text>
                <Text className="text-[13px]" style={{ flex: 0.8, color: theme.text.body, fontFamily: WEB_FONT }}>{form.rounds.length}개</Text>
                <View style={{ flex: 0.8, alignItems: 'flex-start' }}>
                  <TouchableOpacity onPress={() => onOpenForm(form.rptFormId)} className="h-[30px] px-2.5 border rounded-lg items-center justify-center" style={{ borderColor: theme.border.default }} activeOpacity={0.7}>
                    <Text className="text-xs font-semibold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>회차 보기</Text>
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
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 28, gap: 28 }} showsVerticalScrollIndicator={false}>
      <BackButton label="보고 홈" onPress={onBack} theme={theme} />
      <View className="gap-2">
        <Text className="text-2xl font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{form.rptTtl}</Text>
        <Text className="text-[14px] leading-[21px]" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>{form.rptDesc}</Text>
      </View>

      <View className="gap-[14px]">
        <Text className="text-base font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>회차 목록</Text>
        {form.rounds.length === 0 ? (
          <EmptyBox text="생성된 회차가 없습니다." theme={theme} />
        ) : (
          <View className="border rounded-xl overflow-hidden" style={{ borderColor: theme.border.subtle }}>
            <View className="flex-row items-center px-4 py-3 border-b" style={{ backgroundColor: theme.bg.surfaceAlt, borderBottomColor: theme.border.subtle }}>
              <Text className="text-xs font-bold" style={{ flex: 1.8, color: theme.text.muted, fontFamily: WEB_FONT }}>회차</Text>
              <Text className="text-xs font-bold" style={{ flex: 1, color: theme.text.muted, fontFamily: WEB_FONT }}>제출 현황</Text>
              <Text className="text-xs font-bold" style={{ flex: 1, color: theme.text.muted, fontFamily: WEB_FONT }}>내 작성</Text>
              <Text className="text-xs font-bold" style={{ flex: 0.8, color: theme.text.muted, fontFamily: WEB_FONT }}>회차 보기</Text>
            </View>
            {form.rounds.map((round) => (
              <View key={`${round.rptFormId}-${round.roundSn}`} className="flex-row items-center px-4 py-3.5 border-b gap-3" style={{ borderBottomColor: theme.border.subtle }}>
                <View style={{ flex: 1.8 }}>
                  <Text className="text-[13px] font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{round.roundNm}</Text>
                  <Text className="mt-[3px] text-xs" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>{fmtDisplay(round.roundYmd)}</Text>
                </View>
                <Text className="text-[13px]" style={{ flex: 1, color: theme.text.body, fontFamily: WEB_FONT }}>
                  제출 {round.submittedCount} / {round.targetCount}명
                </Text>
                <View style={{ flex: 1, alignItems: 'flex-start' }}>
                  <StatusBadge status={round.status} />
                </View>
                <View style={{ flex: 0.8, alignItems: 'flex-start' }}>
                  <TouchableOpacity onPress={() => onOpenRound(round)} className="h-[30px] px-2.5 border rounded-lg items-center justify-center" style={{ borderColor: theme.border.default }} activeOpacity={0.7}>
                    <Text className="text-xs font-semibold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>열기</Text>
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
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 28, gap: 28 }} showsVerticalScrollIndicator={false}>
      <BackButton label={form.rptTtl} onPress={onBack} theme={theme} />
      <View className="gap-2">
        <Text className="text-2xl font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{form.rptTtl}</Text>
        <Text className="text-[14px] leading-[21px]" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
          {round.roundNm} · {fmtDisplay(round.roundYmd)}
        </Text>
      </View>

      <View className="gap-[14px]">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-base font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>
            제출 현황 (제출 {round.submittedCount}명 / 대상 {round.targetCount}명)
          </Text>
        </View>
        {submissionsLoading ? (
          <View className="p-5 items-center">
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
    <View className="gap-2">
      <Text className="text-xs font-bold" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>{title}</Text>
      {items.length === 0 ? (
        <Text className="text-[13px]" style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}>대상자가 없습니다.</Text>
      ) : (
        <View className="flex-row flex-wrap gap-[10px]">
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
                className="w-[260px] min-h-[58px] border rounded-xl p-2.5 flex-row items-center gap-[10px]"
                style={{
                  borderColor: theme.border.subtle,
                  backgroundColor: isMe ? '#FFF4EA' : theme.bg.surfaceAlt,
                  opacity: clickable ? 1 : 0.86,
                }}
              >
                <View className="w-[34px] h-[34px] rounded-[17px] bg-[#E5E7EB] items-center justify-center">
                  <Text className="text-[#6B7280] text-[13px] font-bold" style={{ fontFamily: WEB_FONT }}>
                    {(item.userNm || item.userId).slice(0, 1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[13px] font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>{item.userNm}</Text>
                  </View>
                  <Text className="mt-0.5 text-xs" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
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
      <View className="flex-1 items-center justify-center p-6 bg-[rgba(0,0,0,0.38)]">
        <View className="w-full max-w-[920px] max-h-[86%] rounded-[18px] overflow-hidden" style={{ backgroundColor: theme.bg.surface }}>
          <View className="px-5 py-4 border-b flex-row items-center justify-between" style={{ borderBottomColor: theme.border.subtle }}>
            <View>
              <Text className="text-base font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>
                {round.status === 'DRAFT' ? '보고 이어쓰기' : '보고 작성'}
              </Text>
              <Text className="mt-1 text-xs" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
                {round.rptTtl} · {round.roundNm}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            <View className="flex-row gap-[14px]">
              <View className="flex-1 gap-[7px]">
                <Text className="text-[13px] font-bold" style={{ color: theme.text.body, fontFamily: WEB_FONT }}>수행 내용</Text>
                <TextInput
                  className="border rounded-lg px-3 py-2.5 text-[14px] min-h-[240px] pt-2.5"
                  style={{ borderColor: theme.border.default, color: theme.text.primary, backgroundColor: theme.bg.surface, fontFamily: WEB_FONT, lineHeight: 20 }}
                  value={execDesc}
                  onChangeText={setExecDesc}
                  multiline
                  textAlignVertical="top"
                  placeholder="이번 회차에 수행한 업무를 작성하세요."
                  placeholderTextColor={theme.text.subtle}
                />
              </View>
              <View className="flex-1 gap-[7px]">
                <Text className="text-[13px] font-bold" style={{ color: theme.text.body, fontFamily: WEB_FONT }}>예정 내용</Text>
                <TextInput
                  className="border rounded-lg px-3 py-2.5 text-[14px] min-h-[240px] pt-2.5"
                  style={{ borderColor: theme.border.default, color: theme.text.primary, backgroundColor: theme.bg.surface, fontFamily: WEB_FONT, lineHeight: 20 }}
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
          <View className="p-3.5 border-t items-end" style={{ borderTopColor: theme.border.subtle }}>
            <View className="flex-row justify-end gap-[10px] mt-0.5">
              <TouchableOpacity onPress={onClose} className="h-[38px] px-4 border rounded-[9px] justify-center" style={{ borderColor: theme.border.default }} activeOpacity={0.7}>
                <Text className="text-[14px] font-semibold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSaveDraft} disabled={pending} className={`h-10 rounded-[9px] border px-3.5 flex-row items-center gap-1.5 ${pending ? 'opacity-[0.55]' : ''}`} style={{ borderColor: theme.brand.primary }} activeOpacity={0.8}>
                <Save size={14} color={theme.brand.primary} />
                <Text className="text-[14px] font-bold" style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}>임시저장</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSubmit} disabled={pending} className={`h-10 rounded-[9px] px-[17px] flex-row items-center gap-1.5 ${pending ? 'opacity-[0.55]' : ''}`} style={{ backgroundColor: theme.brand.primary }} activeOpacity={0.8}>
                {pending ? <ActivityIndicator size="small" color="#fff" /> : <CheckCircle2 size={14} color="#fff" />}
                <Text className="text-white text-[14px] font-bold" style={{ fontFamily: WEB_FONT }}>제출</Text>
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
      <View className="flex-1 items-center justify-center p-6 bg-[rgba(0,0,0,0.38)]">
        <View className="w-full max-w-[920px] max-h-[86%] rounded-[18px] overflow-hidden" style={{ backgroundColor: theme.bg.surface }}>
          <View className="px-5 py-4 border-b flex-row items-center justify-between" style={{ borderBottomColor: theme.border.subtle }}>
            <View>
              <Text className="text-base font-bold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>보고 내용</Text>
              <Text className="mt-1 text-xs" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>
                {submission.userNm} · {round?.roundNm ?? ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            <View className="flex-row gap-[14px]">
              <DetailBlock label="수행 내용" value={submission.execDesc} theme={theme} />
              <DetailBlock label="예정 내용" value={submission.planDesc} theme={theme} />
            </View>
          </ScrollView>
          <View className="p-3.5 border-t items-end" style={{ borderTopColor: theme.border.subtle }}>
            <TouchableOpacity onPress={onClose} className="h-[38px] px-4 border rounded-[9px] justify-center" style={{ borderColor: theme.border.default }} activeOpacity={0.7}>
              <Text className="text-[14px] font-semibold" style={{ color: theme.text.primary, fontFamily: WEB_FONT }}>닫기</Text>
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
    <View className="flex-1 gap-[7px]">
      <Text className="text-[13px] font-bold" style={{ color: theme.text.body, fontFamily: WEB_FONT }}>{label}</Text>
      <View className="border rounded-lg min-h-[110px] p-3" style={{ borderColor: theme.border.default, backgroundColor: theme.bg.surfaceAlt }}>
        <Text className="text-[14px] leading-[21px]" style={{ color: theme.text.body, fontFamily: WEB_FONT }}>{value || '-'}</Text>
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
    <TouchableOpacity onPress={onPress} className="flex-row items-center gap-1.5 self-start py-1" activeOpacity={0.7}>
      <ArrowLeft size={15} color={theme.brand.primary} />
      <Text className="text-[13px] font-bold" style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const meta = statusColor[status];
  return (
    <View className="px-2 py-1 rounded-full self-start" style={{ backgroundColor: meta.bg }}>
      <Text className="text-[11px] font-bold" style={{ color: meta.text, fontFamily: WEB_FONT }}>{statusLabel[status]}</Text>
    </View>
  );
}

function EmptyBox({ text, theme }: { text: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View className="border rounded-[14px] min-h-[140px] items-center justify-center gap-2" style={{ borderColor: theme.border.subtle, backgroundColor: theme.bg.surfaceAlt }}>
      <FileText size={24} color={theme.text.subtle} />
      <Text className="text-[14px]" style={{ color: theme.text.muted, fontFamily: WEB_FONT }}>{text}</Text>
    </View>
  );
}

function CenterState({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 items-center justify-center p-6">{children}</View>;
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
