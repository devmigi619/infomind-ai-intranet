import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import type { AssistantCard } from '../types';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── Component ────────────────────────────────────────────────────────────────

interface InfoCardProps {
  card: AssistantCard;
}

export function InfoCard({ card }: InfoCardProps) {
  const bulletItems = card.summaryItems ?? (card.summary ? [card.summary] : []);
  const theme = useTheme();

  const handleFullLink = () => {
    Alert.alert('', `전체 보기로 이동합니다 (추후 구현)\n경로: ${card.fullLink ?? '-'}`);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.bg.surface,
          borderColor: theme.border.default,
        },
      ]}
    >
      {/* Header: title + tag */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={2}>{card.title}</Text>
        {card.tag ? (
          <View style={[styles.tag, { backgroundColor: `${card.tagColor ?? theme.brand.primary}18` }]}>
            <Text style={[styles.tagText, { color: card.tagColor ?? theme.brand.primary }]}>
              {card.tag}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Bullet list */}
      {bulletItems.length > 0 ? (
        <View style={styles.bulletList}>
          {bulletItems.map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.bullet, { backgroundColor: theme.text.subtle }]} />
              <Text style={[styles.bulletText, { color: theme.text.body }]}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Full-link button */}
      {card.fullLink ? (
        <TouchableOpacity activeOpacity={0.7} onPress={handleFullLink} style={styles.fullLinkRow}>
          <Text style={[styles.fullLinkText, { color: theme.brand.primary }]}>전체 보기</Text>
          <ArrowRight size={13} color={theme.brand.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    fontFamily: WEB_FONT,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: WEB_FONT,
  },
  bulletList: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 7,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    fontFamily: WEB_FONT,
  },
  fullLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  fullLinkText: {
    fontSize: 12,
    fontFamily: WEB_FONT,
  },
});
