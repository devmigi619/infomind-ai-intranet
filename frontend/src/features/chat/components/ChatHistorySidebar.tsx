import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Plus, Trash2, MessageSquare } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useChatSessions, useDeleteChatSession, ChatSessionDto } from '../api';
import { useConfirm } from '../../../shared/hooks/useConfirm';

interface ChatHistorySidebarProps {
  activeSessId: string;
  onSelectSession: (sessId: string) => void;
  onNewSession: () => void;
}

const WEB_FONT = Platform.select({
  web: "'Noto Sans KR', sans-serif",
  default: undefined,
});

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return '';
  }
}

function SessionItem({
  session,
  isActive,
  onPress,
  onDelete,
}: {
  session: ChatSessionDto;
  isActive: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.item,
        isActive && { backgroundColor: theme.brand.primaryTint },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MessageSquare
        size={14}
        color={isActive ? theme.brand.primary : theme.text.muted}
        style={styles.itemIcon}
      />
      <View style={styles.itemContent}>
        <Text
          style={[
            styles.itemTitle,
            { color: isActive ? theme.brand.primary : theme.text.body },
          ]}
          numberOfLines={2}
        >
          {session.title || '새 대화'}
        </Text>
        <Text style={[styles.itemDate, { color: theme.text.subtle }]}>
          {formatDate(session.lastAt)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation?.();
          onDelete();
        }}
        hitSlop={8}
        style={styles.deleteBtn}
      >
        <Trash2 size={13} color={theme.text.subtle} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export function ChatHistorySidebar({
  activeSessId,
  onSelectSession,
  onNewSession,
}: ChatHistorySidebarProps) {
  const theme = useTheme();
  const { data: sessions = [], isLoading } = useChatSessions();
  const deleteMutation = useDeleteChatSession();
  const confirm = useConfirm();

  const handleDelete = async (sessId: string) => {
    const ok = await confirm({
      title: '대화 삭제',
      message: '이 대화 이력을 삭제하시겠습니까?',
      confirmText: '삭제',
      danger: true,
    });
    if (!ok) return;
    deleteMutation.mutate(sessId);
    if (sessId === activeSessId) onNewSession();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg.surfaceAlt,
          borderRightColor: theme.border.default,
        },
      ]}
    >
      {/* 새 대화 버튼 */}
      <TouchableOpacity
        style={[styles.newBtn, { borderBottomColor: theme.border.default }]}
        onPress={onNewSession}
        activeOpacity={0.7}
      >
        <Plus size={15} color={theme.brand.primary} />
        <Text style={[styles.newBtnText, { color: theme.brand.primary }]}>새 대화</Text>
      </TouchableOpacity>

      {/* 세션 목록 */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={theme.text.muted}
            style={{ marginTop: 24 }}
          />
        )}
        {!isLoading && sessions.length === 0 && (
          <Text style={[styles.emptyText, { color: theme.text.subtle }]}>
            대화 이력이 없습니다
          </Text>
        )}
        {sessions.map((s) => (
          <SessionItem
            key={s.sessId}
            session={s}
            isActive={s.sessId === activeSessId}
            onPress={() => onSelectSession(s.sessId)}
            onDelete={() => handleDelete(s.sessId)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    borderRightWidth: 1,
    flexDirection: 'column',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  newBtnText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: WEB_FONT,
  },
  list: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderRadius: 0,
  },
  itemIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: WEB_FONT,
  },
  itemDate: {
    fontSize: 11,
    fontFamily: WEB_FONT,
  },
  deleteBtn: {
    padding: 2,
    flexShrink: 0,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
    fontFamily: WEB_FONT,
  },
});
