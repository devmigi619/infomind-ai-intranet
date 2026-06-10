/**
 * ChatAprvModal — 채팅 excu interrupt 결재선 편집 모달
 *
 * node_excu_confirm interrupt 페이로드에 aprvl_list가 있을 때 표시.
 * AprvLineEditorPanel을 재사용해 결재자/참조자 추가·삭제·순서 변경을 지원한다.
 *
 * 사용처: MainScreen (pendingInterrupt='excu' + interruptAprvlList !== null)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { AprvLineEditorPanel } from '../../../shared/components/AprvLineEditorPanel';
import type { AprvEntry } from '../../leave-req/api';
import { useTheme } from '../../../shared/hooks/useTheme';

interface ChatAprvModalProps {
  visible: boolean;
  initialAprvList: AprvEntry[];
  initialRefList: AprvEntry[];
  currentUserId?: string;
  /** 사용자가 결재선 확인 후 승인 → editedAprvList, editedRefList 전달 */
  onApprove: (aprvList: AprvEntry[], refList: AprvEntry[]) => void;
  /** 취소 */
  onCancel: () => void;
}

export function ChatAprvModal({
  visible,
  initialAprvList,
  initialRefList,
  currentUserId,
  onApprove,
  onCancel,
}: ChatAprvModalProps) {
  const theme = useTheme();

  const [aprvList, setAprvList] = useState<AprvEntry[]>([]);
  const [refList, setRefList]   = useState<AprvEntry[]>([]);
  const [deptRefYn, setDeptRefYn] = useState(false);

  // 모달 열릴 때마다 초기값으로 리셋
  useEffect(() => {
    if (!visible) return;
    setAprvList(initialAprvList);
    setRefList(initialRefList);
    setDeptRefYn(false);
  }, [visible, initialAprvList, initialRefList]);

  const handleApprove = () => {
    onApprove(aprvList, refList);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <SafeAreaView style={{ backgroundColor: theme.bg.surface }} className="flex-1">
        {/* 헤더 */}
        <View style={{ borderBottomColor: theme.border.default }} className="flex-row items-center justify-between px-4 py-3 border-b">
          <TouchableOpacity onPress={onCancel} className="px-1 min-w-[44px]">
            <Text style={{ color: theme.text.muted }} className="text-[15px] font-medium">취소</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.text.primary }} className="text-[16px] font-semibold">결재선 확인</Text>
          <TouchableOpacity onPress={handleApprove} className="px-1 min-w-[44px]">
            <Text style={{ color: theme.brand.primary }} className="text-[15px] font-medium">승인</Text>
          </TouchableOpacity>
        </View>

        {/* 안내 */}
        <View style={{ backgroundColor: theme.bg.surfaceMute }} className="mx-4 my-2.5 p-2.5 rounded-lg">
          <Text style={{ color: theme.text.subtle }} className="text-[13px]">
            결재자와 참조자를 확인·수정한 후 승인을 눌러주세요.
          </Text>
        </View>

        {/* 결재선 편집 패널 */}
        <View className="flex-1">
          <AprvLineEditorPanel
            aprvList={aprvList}
            refList={refList}
            deptRefYn={deptRefYn}
            currentUserId={currentUserId}
            onAprvListChange={setAprvList}
            onRefListChange={setRefList}
            onDeptRefToggle={setDeptRefYn}
            theme={theme}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

