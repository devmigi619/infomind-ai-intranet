import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { MessageSquareText } from 'lucide-react-native';
import { colors } from '../../../shared/constants/colors';
import { getAssistantResponse } from '../api';
import { ActionCard } from './ActionCard';
import { InfoCard } from './InfoCard';
import { StatusCard } from './StatusCard';
import type { AssistantCard } from '../types';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconBox}>
        <MessageSquareText size={28} color={colors.brand.primary} style={{ opacity: 0.5 }} />
      </View>
      <Text style={styles.emptyTitle}>AI에게 물어보면 여기에 나타납니다</Text>
      <Text style={styles.emptyDesc}>
        메시지를 보내면 관련 액션, 정보, 현황 카드를{'\n'}자동으로 정리해드립니다.
      </Text>
      <View style={styles.exampleRow}>
        {['휴가 신청해줘', '회의실 예약', '차량 예약'].map((ex) => (
          <View key={ex} style={styles.exampleChip}>
            <Text style={styles.exampleText}>{ex}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Card renderer ────────────────────────────────────────────────────────────

function CardItem({ card }: { card: AssistantCard }) {
  if (card.type === 'action') return <ActionCard card={card} />;
  if (card.type === 'info') return <InfoCard card={card} />;
  if (card.type === 'status') return <StatusCard card={card} />;
  return null;
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface AssistantPanelProps {
  lastUserMessage: string | null;
  userName: string;
}

export function AssistantPanel({ lastUserMessage }: AssistantPanelProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const response = lastUserMessage ? getAssistantResponse(lastUserMessage) : null;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [lastUserMessage, fadeAnim]);

  if (!lastUserMessage || !response) {
    return <EmptyState />;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Section label */}
      <Text style={styles.sectionLabel}>관련 업무 바로가기</Text>
      <View style={styles.cardList}>
        {response.cards
          .filter((c) => c.type === 'action')
          .map((card, i) => (
            <CardItem key={`action-${i}`} card={card} />
          ))}
      </View>

      {response.cards.some((c) => c.type === 'info') && (
        <>
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>관련 문서</Text>
          <View style={styles.cardList}>
            {response.cards
              .filter((c) => c.type === 'info')
              .map((card, i) => (
                <CardItem key={`info-${i}`} card={card} />
              ))}
          </View>
        </>
      )}

      {response.cards.some((c) => c.type === 'status') && (
        <>
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>현황</Text>
          <View style={styles.cardList}>
            {response.cards
              .filter((c) => c.type === 'status')
              .map((card, i) => (
                <CardItem key={`status-${i}`} card={card} />
              ))}
          </View>
        </>
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.soft,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: WEB_FONT,
  },
  sectionLabelGap: {
    marginTop: 20,
  },
  cardList: {
    gap: 8,
  },
  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.brand.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.body,
    textAlign: 'center',
    fontFamily: WEB_FONT,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.text.soft,
    textAlign: 'center',
    lineHeight: 12 * 1.6,
    fontFamily: WEB_FONT,
  },
  exampleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  exampleChip: {
    backgroundColor: colors.brand.primaryTintSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  exampleText: {
    fontSize: 11,
    color: colors.brand.primary,
    fontFamily: WEB_FONT,
  },
});
