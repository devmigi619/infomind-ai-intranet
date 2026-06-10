import React from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import type { AssistantCard } from '../types';
import { useUiStore } from '../../../store/uiStore';
import type { PanelId } from '../../../types';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── Component ────────────────────────────────────────────────────────────────

interface InfoCardProps {
  card: AssistantCard;
}

export function InfoCard({ card }: InfoCardProps) {
  const bulletItems = card.summaryItems ?? (card.summary ? [card.summary] : []);
  const theme = useTheme();

  const handleFullLink = () => {
    const link = card.fullLink;
    if (!link) return;

    let panelId: PanelId | null = null;
    if (link.includes('/approval/new?type=vacation') || link.includes('/hr/vacation') || link.includes('/leave')) {
      panelId = 'leave';
    } else if (link.includes('/approval')) {
      panelId = 'approval';
    } else if (link.includes('/vehicle')) {
      panelId = 'vehicle';
    } else if (link.includes('/meeting')) {
      panelId = 'meeting';
    } else if (link.includes('/report')) {
      panelId = 'report';
    } else if (link.includes('/certificate')) {
      panelId = 'certificate';
    } else if (link.includes('/expense') || link.includes('/asset')) {
      panelId = 'approval';
    } else if (link.includes('/docs') || link.includes('/documents')) {
      panelId = 'documents';
    }

    if (panelId) {
      useUiStore.getState().handleNavClick(panelId);
    } else {
      Alert.alert('', `${card.title} 경로: ${link}`);
    }
  };

  return (
    <View
      style={{
        backgroundColor: theme.bg.surface,
        borderColor: theme.border.default,
      }}
      className="border rounded-xl p-4 gap-2.5"
    >
      {/* Header: title + tag */}
      <View className="flex-row items-start gap-2 flex-wrap">
        <Text
          style={{ color: theme.text.primary, fontFamily: WEB_FONT }}
          className="text-[15px] font-medium flex-1"
          numberOfLines={2}
        >
          {card.title}
        </Text>
        {card.tag ? (
          <View
            style={{ backgroundColor: `${card.tagColor ?? theme.brand.primary}18` }}
            className="px-2 py-0.5 rounded-full flex-shrink-0 self-start"
          >
            <Text
              style={{ color: card.tagColor ?? theme.brand.primary, fontFamily: WEB_FONT }}
              className="text-[11px] font-medium"
            >
              {card.tag}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Bullet list */}
      {bulletItems.length > 0 ? (
        <View className="gap-1.5">
          {bulletItems.map((item, i) => (
            <View key={i} className="flex-row items-start gap-2">
              <View
                style={{ backgroundColor: theme.text.subtle }}
                className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
              />
              <Text
                style={{ color: theme.text.body, fontFamily: WEB_FONT }}
                className="flex-1 text-[13px] leading-[20px]"
              >
                {item}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Full-link button */}
      {card.fullLink ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleFullLink}
          className="flex-row items-center gap-1 self-end mt-0.5"
        >
          <Text
            style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}
            className="text-[12px]"
          >
            전체 보기
          </Text>
          <ArrowRight size={13} color={theme.brand.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

