import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { FileCheck, Calendar, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../shared/hooks/useTheme';

interface RightPanelHomeProps {
  userName: string;
}

const QUICK_ACTIONS = [
  { id: 'vacation', emoji: '🏖️', label: '휴가 신청' },
  { id: 'report', emoji: '📝', label: '보고서 작성' },
  { id: 'vehicle', emoji: '🚗', label: '차량 예약' },
  { id: 'meeting', emoji: '🏢', label: '회의실 예약' },
];

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

export function RightPanelHome({ userName }: RightPanelHomeProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {/* 인사말 카드 */}
      <View style={[styles.greet, { backgroundColor: theme.brand.primaryTintSoft }]}>
        <Text style={[styles.greetText, { color: theme.brand.primary }]}>
          👋 좋은 아침입니다, {userName}님.{'\n'}
          오늘 챙기실 항목 3가지를 정리했어요.
        </Text>
      </View>

      {/* 결재 대기 카드 */}
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle },
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.cardHead}>
          <View style={[styles.cardIcon, { backgroundColor: theme.semanticTint.warning }]}>
            <FileCheck size={14} color={theme.semantic.warning} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.text.body }]}>결재 대기</Text>
          <Text style={[styles.cardCount, { color: theme.text.primary }]}>2</Text>
        </View>
        <Text style={[styles.cardBody, { color: theme.text.muted }]}>
          <Text style={[styles.cardBodyStrong, { color: theme.text.primary }]}>
            휴가 신청 (김철수)
          </Text>{' '}
          등 2건. 그 중 1건은 오늘 안 처리.
        </Text>
      </TouchableOpacity>

      {/* 오늘 일정 카드 */}
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle },
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.cardHead}>
          <View style={[styles.cardIcon, { backgroundColor: theme.brand.primaryTint }]}>
            <Calendar size={14} color={theme.brand.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.text.body }]}>오늘 일정</Text>
          <Text style={[styles.cardCount, { color: theme.text.primary }]}>3</Text>
        </View>
        <Text style={[styles.cardBody, { color: theme.text.muted }]}>
          10:00 팀 스탠드업 · 14:00 클라이언트 · 16:30 1on1
        </Text>
      </TouchableOpacity>

      {/* 마감 임박 카드 */}
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle },
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.cardHead}>
          <View style={[styles.cardIcon, { backgroundColor: theme.semanticTint.danger }]}>
            <AlertCircle size={14} color={theme.semantic.danger} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.text.body }]}>마감 임박</Text>
        </View>
        <Text style={[styles.cardBody, { color: theme.text.muted }]}>
          <Text style={[styles.cardBodyStrong, { color: theme.text.primary }]}>주간보고서</Text>가
          내일 마감입니다.
        </Text>
      </TouchableOpacity>

      {/* 빠른 액션 */}
      <Text style={[styles.sectionLabel, { color: theme.text.subtle }]}>빠른 액션</Text>
      <View style={styles.qaGrid}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.qaCard,
              { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle },
            ]}
            activeOpacity={0.7}
          >
            <Text style={styles.qaIcon}>{action.emoji}</Text>
            <Text style={[styles.qaLabel, { color: theme.text.muted }]}>{action.label}</Text>
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
  },
  greetText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: WEB_FONT,
  },
  card: {
    borderWidth: 1,
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
  cardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: WEB_FONT,
  },
  cardCount: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: WEB_FONT,
  },
  cardBody: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: WEB_FONT,
  },
  cardBodyStrong: {
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginHorizontal: 4,
    fontFamily: WEB_FONT,
  },
  qaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qaCard: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
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
    fontFamily: WEB_FONT,
  },
});
