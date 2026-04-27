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
import { reportsApi } from '../api/reports';

interface Report {
  id: number;
  weekStart: string;
  thisWeek: string;
  nextWeek: string;
  issues: string | null;
  createdAt: string;
}

const TABS = [
  { key: 'list', label: '목록' },
  { key: 'write', label: '작성' },
];

export function WeeklyReportScreen() {
  const [activeTab, setActiveTab] = useState<'list' | 'write'>('list');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [weekStart, setWeekStart] = useState('');
  const [thisWeek, setThisWeek] = useState('');
  const [nextWeek, setNextWeek] = useState('');
  const [issues, setIssues] = useState('');

  useEffect(() => {
    if (activeTab === 'list') {
      setIsLoading(true);
      setError(null);
      reportsApi.getList()
        .then((res) => {
          setReports(res.data?.data?.content ?? []);
        })
        .catch(() => {
          setError('주간보고를 불러오지 못했습니다.');
          setReports([]);
        })
        .finally(() => setIsLoading(false));
    }
  }, [activeTab]);

  const handleSave = async () => {
    if (!weekStart || !thisWeek || !nextWeek) {
      Alert.alert('입력 오류', '주차, 이번 주 업무, 다음 주 계획은 필수입니다.');
      return;
    }
    setIsSaving(true);
    try {
      await reportsApi.create({ weekStart, thisWeek, nextWeek, issues: issues || null });
      setWeekStart('');
      setThisWeek('');
      setNextWeek('');
      setIssues('');
      setActiveTab('list');
    } catch {
      Alert.alert('저장 실패', '서버에 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  if (selectedReport) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedReport(null)} activeOpacity={0.7}>
          <Text style={styles.backText}>← 목록으로</Text>
        </TouchableOpacity>
        <ScrollView style={styles.detail} contentContainerStyle={styles.detailContent}>
          <Text style={styles.detailWeek}>{selectedReport.weekStart} 주간보고</Text>
          <Text style={styles.detailDate}>작성일: {selectedReport.createdAt}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>이번 주 업무</Text>
            <Text style={styles.sectionBody}>{selectedReport.thisWeek}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>다음 주 계획</Text>
            <Text style={styles.sectionBody}>{selectedReport.nextWeek}</Text>
          </View>

          {selectedReport.issues ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>이슈사항</Text>
              <Text style={styles.sectionBody}>{selectedReport.issues}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as 'list' | 'write')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'list' ? (
        isLoading ? (
          <View style={styles.center}><ActivityIndicator color="#0A2463" /></View>
        ) : error ? (
          <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.item}
                onPress={() => setSelectedReport(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.itemTitle}>{item.weekStart} 주간보고</Text>
                <Text style={styles.itemMeta} numberOfLines={1}>{item.thisWeek.split('\n')[0]}</Text>
                <Text style={styles.itemDate}>{item.createdAt}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.list}
          />
        )
      ) : (
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <View style={styles.field}>
            <Text style={styles.label}>주차 (예: 2025-04-21)</Text>
            <TextInput
              style={styles.input}
              value={weekStart}
              onChangeText={setWeekStart}
              placeholder="2025-04-21"
              placeholderTextColor="rgba(0,0,0,0.3)"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>이번 주 업무 *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={thisWeek}
              onChangeText={setThisWeek}
              placeholder="- 완료한 업무를 작성하세요"
              placeholderTextColor="rgba(0,0,0,0.3)"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>다음 주 계획 *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={nextWeek}
              onChangeText={setNextWeek}
              placeholder="- 다음 주 업무를 작성하세요"
              placeholderTextColor="rgba(0,0,0,0.3)"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>이슈사항 (선택)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={issues}
              onChangeText={setIssues}
              placeholder="이슈 또는 공유사항을 작성하세요"
              placeholderTextColor="rgba(0,0,0,0.3)"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveText}>저장</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 16,
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
    gap: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  itemMeta: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.55)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  itemDate: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.35)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
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
  detailWeek: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  detailDate: {
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
    minHeight: 96,
    paddingTop: 10,
  },
  saveButton: {
    height: 48,
    backgroundColor: '#0A2463',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
});
