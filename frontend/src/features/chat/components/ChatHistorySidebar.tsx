import React from 'react';
import { TouchableOpacity, ScrollView, View } from 'react-native';
import { Plus, Trash2, MessageSquare } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useChatSessions, useDeleteChatSession, ChatSessionDto } from '../api';
import { useConfirm } from '../../../shared/hooks/useConfirm';
import { Text } from '../../../shared/components/ui/text';
import { Spinner } from '../../../shared/components/ui/spinner';
import { VStack } from '../../../shared/components/ui/vstack';

interface ChatHistorySidebarProps {
  activeSessId: string;
  onSelectSession: (sessId: string) => void;
  onNewSession: () => void;
}

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
      style={isActive ? { backgroundColor: theme.brand.primaryTint } : undefined}
      className="flex-row items-start px-3 py-2.5 gap-2"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MessageSquare
        size={14}
        color={isActive ? theme.brand.primary : theme.text.muted}
        className="mt-0.5 flex-shrink-0"
      />
      <VStack className="flex-1 gap-0.5">
        <Text
          size="sm"
          style={{ color: isActive ? theme.brand.primary : theme.text.body }}
          className={`text-[12px] leading-4 ${isActive ? 'font-semibold' : ''}`}
          numberOfLines={2}
        >
          {session.title || '새 대화'}
        </Text>
        <Text size="xs" style={{ color: theme.text.subtle }} className="text-[11px]">
          {formatDate(session.lastAt)}
        </Text>
      </VStack>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation?.();
          onDelete();
        }}
        hitSlop={8}
        className="p-0.5 flex-shrink-0"
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
    <VStack
      style={{ backgroundColor: theme.bg.surfaceAlt }}
      className="w-[240px] border-r border-outline-100 flex-col h-full"
    >
      {/* 새 대화 버튼 */}
      <TouchableOpacity
        style={{ borderBottomColor: theme.border.default }}
        className="flex-row items-center gap-2 px-4 py-3.5 border-b"
        onPress={onNewSession}
        activeOpacity={0.7}
      >
        <Plus size={15} color={theme.brand.primary} />
        <Text size="sm" style={{ color: theme.brand.primary }} className="font-medium text-[13px]">
          새 대화
        </Text>
      </TouchableOpacity>

      {/* 세션 목록 */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {isLoading && (
          <View className="items-center justify-center mt-6">
            <Spinner size="small" />
          </View>
        )}
        {!isLoading && sessions.length === 0 && (
          <Text size="sm" style={{ color: theme.text.subtle }} className="text-center text-[12px] mt-8 px-4">
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
    </VStack>
  );
}
