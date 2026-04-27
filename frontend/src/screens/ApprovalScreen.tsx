import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { approvalsApi } from '../api/approvals';
import { usersApi, UserInfo } from '../api/users';

interface ApprovalLine {
  seq: number;
  approverName: string;
  status: string;
  comment?: string;
  decidedAt?: string;
}

interface Approval {
  id: number;
  title: string;
  type: string;
  status: string;
  requesterName: string;
  createdAt: string;
  content: string;
  approvalLines: ApprovalLine[];
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B',
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
};

const TABS = [
  { key: 'my', label: '내 결재' },
  { key: 'pending', label: '대기 중' },
];

const APPROVAL_TYPES = [
  { key: 'VACATION', label: '연차' },
  { key: 'EXPENSE', label: '지출' },
  { key: 'GENERAL', label: '일반' },
];

export function ApprovalScreen() {
  const [activeTab, setActiveTab] = useState<'my' | 'pending'>('my');
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Approval | null>(null);

  // Submit form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitType, setSubmitType] = useState('GENERAL');
  const [submitContent, setSubmitContent] = useState('');
  const [approverIds, setApproverIds] = useState<number[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadApprovals = () => {
    setIsLoading(true);
    setError(null);
    approvalsApi.getList(activeTab)
      .then((res) => {
        setApprovals(res.data?.data?.content ?? []);
      })
      .catch(() => {
        setError('결재 목록을 불러오지 못했습니다.');
        setApprovals([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadApprovals();
  }, [activeTab]);

  const openSubmitForm = async () => {
    setIsSubmitting(true);
    try {
      const res = await usersApi.getAll();
      setUsers(res.data?.data ?? []);
    } catch {
      setUsers([]);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await approvalsApi.approve(id);
      setApprovals((prev) =>
        prev.map((a) => a.id === id ? { ...a, status: 'APPROVED' } : a)
      );
      if (selectedItem?.id === id) {
        setSelectedItem((prev) => prev ? { ...prev, status: 'APPROVED' } : null);
      }
    } catch {
      Alert.alert('오류', '승인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await approvalsApi.reject(id);
      setApprovals((prev) =>
        prev.map((a) => a.id === id ? { ...a, status: 'REJECTED' } : a)
      );
      if (selectedItem?.id === id) {
        setSelectedItem((prev) => prev ? { ...prev, status: 'REJECTED' } : null);
      }
    } catch {
      Alert.alert('오류', '반려 처리 중 오류가 발생했습니다.');
    }
  };

  const handleSubmit = async () => {
    if (!submitTitle || !submitContent) {
      Alert.alert('입력 오류', '제목과 내용을 입력해주세요.');
      return;
    }
    if (approverIds.length === 0) {
      Alert.alert('입력 오류', '결재자를 한 명 이상 선택해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      await approvalsApi.create({
        title: submitTitle,
        content: submitContent,
        type: submitType,
        approverIds,
      });
      setSubmitTitle('');
      setSubmitContent('');
      setSubmitType('GENERAL');
      setApproverIds([]);
      setIsSubmitting(false);
      loadApprovals();
    } catch {
      Alert.alert('상신 실패', '결재 상신 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleApprover = (userId: number) => {
    setApproverIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectItem = async (id: number) => {
    try {
      const res = await approvalsApi.getDetail(id);
      setSelectedItem(res.data?.data ?? null);
    } catch {
      Alert.alert('오류', '결재 상세를 불러오지 못했습니다.');
    }
  };

  if (selectedItem) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedItem(null)} activeOpacity={0.7}>
          <Text style={styles.backText}>← 목록으로</Text>
        </TouchableOpacity>
        <ScrollView style={styles.detail} contentContainerStyle={styles.detailContent}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleRow}>
              <Text style={styles.detailTitle}>{selectedItem.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[selectedItem.status] }]}>
                <Text style={styles.statusText}>{STATUS_LABEL[selectedItem.status]}</Text>
              </View>
            </View>
            <Text style={styles.detailMeta}>
              {selectedItem.requesterName} · {selectedItem.createdAt}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>내용</Text>
            <Text style={styles.sectionBody}>{selectedItem.content}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>결재선</Text>
            {selectedItem.approvalLines.map((line) => (
              <View key={line.seq} style={styles.approvalLine}>
                <View style={styles.approvalLineLeft}>
                  <Text style={styles.approvalSeq}>{line.seq}</Text>
                  <Text style={styles.approvalName}>{line.approverName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[line.status] }]}>
                  <Text style={styles.statusText}>{STATUS_LABEL[line.status] ?? line.status}</Text>
                </View>
              </View>
            ))}
          </View>

          {selectedItem.status === 'PENDING' && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => handleApprove(selectedItem.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.approveText}>승인</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleReject(selectedItem.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.rejectText}>반려</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (isSubmitting) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => setIsSubmitting(false)} activeOpacity={0.7}>
          <Text style={styles.backText}>← 목록으로</Text>
        </TouchableOpacity>
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <View style={styles.field}>
            <Text style={styles.label}>제목 *</Text>
            <TextInput
              style={styles.input}
              value={submitTitle}
              onChangeText={setSubmitTitle}
              placeholder="결재 제목을 입력하세요"
              placeholderTextColor="rgba(0,0,0,0.3)"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>유형</Text>
            <View style={styles.typeRow}>
              {APPROVAL_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeButton, submitType === t.key && styles.typeButtonActive]}
                  onPress={() => setSubmitType(t.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeText, submitType === t.key && styles.typeTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>내용 *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={submitContent}
              onChangeText={setSubmitContent}
              placeholder="결재 내용을 입력하세요"
              placeholderTextColor="rgba(0,0,0,0.3)"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>결재자 선택 *</Text>
            {users.length === 0 ? (
              <Text style={styles.emptyText}>사용자 목록을 불러오는 중...</Text>
            ) : (
              users.map((u) => {
                const selected = approverIds.includes(u.id);
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.userItem, selected && styles.userItemSelected]}
                    onPress={() => toggleApprover(u.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.userItemLeft}>
                      <Text style={[styles.userName, selected && styles.userNameSelected]}>{u.name}</Text>
                      <Text style={[styles.userDept, selected && styles.userDeptSelected]}>{u.department}</Text>
                    </View>
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.saveText}>상신</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsSubmitting(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <View style={styles.tabList}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as 'my' | 'pending')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={openSubmitForm} activeOpacity={0.7} style={styles.writeButton}>
          <Text style={styles.writeButtonText}>상신</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color="#0A2463" /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        <FlatList
          data={approvals}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => handleSelectItem(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.itemTop}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] }]}>
                  <Text style={styles.statusText}>{STATUS_LABEL[item.status]}</Text>
                </View>
              </View>
              <Text style={styles.itemMeta}>{item.requesterName} · {item.createdAt}</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 16,
  },
  tabList: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#0A2463',
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.45)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  tabTextActive: {
    color: '#0A2463',
    fontWeight: '600',
  },
  writeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  writeButtonText: {
    fontSize: 14,
    color: '#0A2463',
    fontWeight: '600',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  list: {
    paddingVertical: 8,
  },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  itemMeta: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.45)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  backText: {
    fontSize: 14,
    color: '#0A2463',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  detail: {
    flex: 1,
  },
  detailContent: {
    padding: 20,
    gap: 20,
  },
  detailHeader: {
    gap: 6,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  detailMeta: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.45)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  sectionBody: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 22,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  approvalLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  approvalLineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  approvalSeq: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.12)',
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 11,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '600',
  },
  approvalName: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  approveButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  rejectButton: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '600',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  // Form styles
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.65)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000000',
    backgroundColor: '#ffffff',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  textArea: {
    minHeight: 100,
    paddingTop: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  typeButtonActive: {
    backgroundColor: '#0A2463',
    borderColor: '#0A2463',
  },
  typeText: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.55)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  typeTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.35)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    marginBottom: 6,
  },
  userItemSelected: {
    backgroundColor: 'rgba(10,36,99,0.06)',
    borderColor: '#0A2463',
  },
  userItemLeft: {
    gap: 2,
  },
  userName: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  userNameSelected: {
    color: '#0A2463',
  },
  userDept: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.45)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  userDeptSelected: {
    color: 'rgba(10,36,99,0.6)',
  },
  checkmark: {
    fontSize: 16,
    color: '#0A2463',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#0A2463',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: 'rgba(0,0,0,0.55)',
    fontWeight: '500',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
});
