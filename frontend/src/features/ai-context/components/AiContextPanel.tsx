import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { ClipboardEdit, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useToast } from '../../../shared/hooks/useToast';
import { useUiStore } from '../../../store/uiStore';
import { useChatStore } from '../../../store/chatStore';
import { useAiContextStore } from '../store';
import type { AiContextArtifact, AiContextBlock } from '../types';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── Domain label map ─────────────────────────────────────────────────────────

const DOMAIN_LABEL: Record<string, string> = {
  leave: '휴가',
  mtgr: '회의실 예약',
  veh: '차량 예약',
  aprv: '전자결재',
  schd: '일정 관리',
  brd: '게시판',
  rpt: '보고서',
};

// ─── ArtifactCard ─────────────────────────────────────────────────────────────

function ArtifactCard({ artifact }: { artifact: AiContextArtifact }) {
  const theme = useTheme();
  const hasAprvl = artifact.aprvl_list && artifact.aprvl_list.length > 0;

  const handleSubmit = () => {
    useChatStore.getState().setPendingResumeValue({ value: '승인', display: '승인' });
  };

  const handleCancel = () => {
    useChatStore.getState().setPendingResumeValue({ value: '취소', display: '취소' });
  };

  // 드래프트 이양(handoff) — 내용을 들고 휴가신청 폼으로 이동.
  // 설계(jarvis-panel-design.md §3 소멸 조건 ⑤): 이양 시 채팅 쪽 드래프트는 회수한다.
  const handleHandoff = () => {
    const get = (k: string) => artifact.fields.find((f) => f.key === k)?.value;
    const toYmd = (s?: string) =>
      s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.replace(/-/g, '') : undefined;

    // 시작~종료 범위를 주말 제외 YYYYMMDD 목록으로 (폼의 dates[] 형식)
    const st = toYmd(get('시작날짜'));
    const end = toYmd(get('종료날짜')) ?? st;
    let dates: string[] | undefined;
    if (st && end) {
      dates = [];
      const cur = new Date(+st.slice(0, 4), +st.slice(4, 6) - 1, +st.slice(6, 8));
      const last = new Date(+end.slice(0, 4), +end.slice(4, 6) - 1, +end.slice(6, 8));
      while (cur <= last) {
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 6) {
          dates.push(
            `${cur.getFullYear()}${String(cur.getMonth() + 1).padStart(2, '0')}${String(cur.getDate()).padStart(2, '0')}`,
          );
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    const ui = useUiStore.getState();
    ui.setLeaveReqHandoff({ dates, leaveNm: get('휴가유형'), reason: get('사유') });

    // 대기 중인 excu interrupt 해소 — 대화 관점에선 '직접 작성'으로 정리
    const chat = useChatStore.getState();
    if (chat.pendingInterrupt === 'excu') {
      chat.setPendingResumeValue({ value: '취소', display: '폼에서 직접 작성할게요' });
    }
    ui.setActiveFullScreen('leave-req-form' as any);
  };

  return (
    <View
      style={{ backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }}
      className="border rounded-xl p-3.5 gap-3"
    >
      {/* Title row */}
      <View className="flex-row items-center gap-2">
        <ClipboardEdit size={16} color={theme.brand.primary} />
        <Text
          style={{ color: theme.text.primary, fontFamily: WEB_FONT }}
          className="text-[13px] font-semibold flex-1"
          numberOfLines={1}
        >
          {artifact.title}
        </Text>
      </View>

      {/* Fields — READ-ONLY */}
      {artifact.fields.length > 0 && (
        <View className="gap-2">
          {artifact.fields.map((field) => (
            <View key={field.key} className="flex-row items-start gap-2">
              <Text
                style={{ color: theme.text.muted, fontFamily: WEB_FONT }}
                className="text-[12px] w-20 flex-shrink-0 pt-0.5"
                numberOfLines={1}
              >
                {field.label}
              </Text>
              <Text
                style={{ color: theme.text.primary, fontFamily: WEB_FONT }}
                className="text-[13px] flex-1"
              >
                {field.value || '—'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 결재선 */}
      {hasAprvl && (
        <View className="gap-1.5">
          <Text
            style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}
            className="text-[11px] font-semibold tracking-wider uppercase"
          >
            결재선
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {artifact.aprvl_list!.map((entry, i) => (
              <View
                key={entry.aprvUserId + i}
                style={{ backgroundColor: theme.brand.primaryTintSoft, borderColor: theme.border.subtle }}
                className="border rounded-full px-2.5 py-1"
              >
                <Text
                  style={{ color: theme.text.body, fontFamily: WEB_FONT }}
                  className="text-[11px]"
                >
                  {entry.aprvUserNm ?? entry.aprvUserId}
                  {entry.deptNm ? ` (${entry.deptNm})` : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Submit / hint */}
      {artifact.submit.enabled ? (
        <View className="gap-2 pt-1">
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleSubmit}
            style={{ backgroundColor: theme.brand.primary }}
            className="rounded-lg py-2 items-center"
          >
            <Text
              style={{ color: '#ffffff', fontFamily: WEB_FONT }}
              className="text-[13px] font-semibold"
            >
              {artifact.submit.label}
            </Text>
          </TouchableOpacity>
          <View className="flex-row gap-2">
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleCancel}
              style={{ borderColor: theme.border.default }}
              className="flex-1 border rounded-lg py-2 items-center"
            >
              <Text
                style={{ color: theme.text.body, fontFamily: WEB_FONT }}
                className="text-[13px] font-medium"
              >
                취소
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleHandoff}
              style={{ borderColor: theme.border.default }}
              className="flex-1 border rounded-lg py-2 items-center"
            >
              <Text
                style={{ color: theme.text.body, fontFamily: WEB_FONT }}
                className="text-[13px] font-medium"
              >
                폼에서 이어 작성
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : artifact.fields.length > 0 ? (
        <Text
          style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}
          className="text-[12px] text-center pt-1"
        >
          대화를 계속하면 내용이 채워집니다
        </Text>
      ) : null}
    </View>
  );
}

// ─── Block renderer ───────────────────────────────────────────────────────────

function BlockRow({ block }: { block: AiContextBlock }) {
  const theme = useTheme();
  const toast = useToast();

  if (block.kind === 'fact') {
    return (
      <View
        style={{ backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }}
        className="border rounded-xl p-3.5 flex-row items-center justify-between"
      >
        <Text
          style={{ color: theme.text.muted, fontFamily: WEB_FONT }}
          className="text-[12px]"
        >
          {block.label}
        </Text>
        <Text
          style={{ color: theme.text.primary, fontFamily: WEB_FONT }}
          className="text-[16px] font-semibold"
        >
          {block.value ?? '—'}
        </Text>
      </View>
    );
  }

  if (block.kind === 'action') {
    const handlePress = () => {
      if (block.screen) {
        useUiStore.getState().setActiveFullScreen(block.screen as any);
      } else {
        // 이동 화면이 정해지지 않은 액션 (예: 인사팀 문의)
        toast.warning('준비 중인 기능입니다.');
      }
    };

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handlePress}
        style={{ backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }}
        className="border rounded-xl p-3.5 flex-row items-center justify-between"
      >
        <Text
          style={{ color: theme.text.body, fontFamily: WEB_FONT }}
          className="text-[13px] font-medium flex-1"
        >
          {block.label}
        </Text>
        <ChevronRight size={16} color={theme.text.subtle} />
      </TouchableOpacity>
    );
  }

  // unknown kind — forward compatibility
  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AiContextPanel() {
  const snapshot = useAiContextStore((s) => s.snapshot);
  const theme = useTheme();

  if (!snapshot) return null;

  const domainLabel = DOMAIN_LABEL[snapshot.domain] ?? snapshot.domain;

  return (
    <View className="gap-3">
      {/* Domain banner */}
      <View
        style={{ backgroundColor: theme.brand.primaryTintSoft }}
        className="px-3 py-2 rounded-lg"
      >
        <Text
          style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}
          className="text-[11px] font-semibold tracking-wider uppercase"
        >
          {domainLabel}
        </Text>
      </View>

      {/* Artifact */}
      {snapshot.artifact ? (
        <ArtifactCard artifact={snapshot.artifact} />
      ) : null}

      {/* Blocks */}
      {snapshot.blocks.length > 0 && (
        <View className="gap-2">
          {snapshot.blocks.map((block, i) => (
            <BlockRow key={`${block.kind}-${i}`} block={block} />
          ))}
        </View>
      )}
    </View>
  );
}
