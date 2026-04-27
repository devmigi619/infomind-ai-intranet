import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  FileCheck,
  Calendar,
  AlertCircle,
} from 'lucide-react-native';

interface RightPanelHomeProps {
  userName: string;
}

const QUICK_ACTIONS = [
  { id: 'vacation', emoji: '🏖️', label: '휴가 신청' },
  { id: 'report', emoji: '📝', label: '보고서 작성' },
  { id: 'vehicle', emoji: '🚗', label: '차량 예약' },
  { id: 'meeting', emoji: '🏢', label: '회의실 예약' },
];

export function RightPanelHome({ userName }: RightPanelHomeProps) {
  return (
    <View style={styles.container}>
      <View style={styles.greet}>
        <Text style={styles.greetText}>
          👋 좋은 아침입니다, {userName}님.{'\n'}
          오늘 챙기실 항목 3가지를 정리했어요.
        </Text>
      </View>

      <TouchableOpacity style={styles.card} activeOpacity={0.8}>
        <View style={styles.cardHead}>
          <View style={[styles.cardIcon, styles.iconAmber]}>
            <FileCheck size={14} color="#F59E0B" />
          </View>
          <Text style={styles.cardTitle}>결재 대기</Text>
          <Text style={styles.cardCount}>2</Text>
        </View>
        <Text style={styles.cardBody}>
          <Text style={styles.cardBodyStrong}>휴가 신청 (김철수)</Text> 등 2건. 그
          중 1건은 오늘 안 처리.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} activeOpacity={0.8}>
        <View style={styles.cardHead}>
          <View style={[styles.cardIcon, styles.iconBlue]}>
            <Calendar size={14} color="#0A2463" />
          </View>
          <Text style={styles.cardTitle}>오늘 일정</Text>
          <Text style={styles.cardCount}>3</Text>
        </View>
        <Text style={styles.cardBody}>
          10:00 팀 스탠드업 · 14:00 클라이언트 · 16:30 1on1
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} activeOpacity={0.8}>
        <View style={styles.cardHead}>
          <View style={[styles.cardIcon, styles.iconRed]}>
            <AlertCircle size={14} color="#EF4444" />
          </View>
          <Text style={styles.cardTitle}>마감 임박</Text>
        </View>
        <Text style={styles.cardBody}>
          <Text style={styles.cardBodyStrong}>주간보고서</Text>가 내일 마감입니다.
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>빠른 액션</Text>
      <View style={styles.qaGrid}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.qaCard}
            activeOpacity={0.7}
          >
            <Text style={styles.qaIcon}>{action.emoji}</Text>
            <Text style={styles.qaLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  greet: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(10,36,99,0.06)',
  },
  greetText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#0A2463',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 12,
    padding: 14,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBlue: { backgroundColor: 'rgba(10,36,99,0.1)' },
  iconAmber: { backgroundColor: 'rgba(245,158,11,0.12)' },
  iconRed: { backgroundColor: 'rgba(239,68,68,0.12)' },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.85)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  cardCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  cardBody: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(0,0,0,0.6)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  cardBodyStrong: {
    color: '#000000',
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginHorizontal: 4,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  qaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qaCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  qaIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  qaLabel: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.7)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
});
