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
  StyleSheet,
  Platform,
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.surface }]}>
        {/* 헤더 */}
        <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: theme.text.muted }]}>취소</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>결재선 확인</Text>
          <TouchableOpacity onPress={handleApprove} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: theme.brand.primary }]}>승인</Text>
          </TouchableOpacity>
        </View>

        {/* 안내 */}
        <View style={[styles.notice, { backgroundColor: theme.bg.surfaceMute }]}>
          <Text style={[styles.noticeText, { color: theme.text.subtle }]}>
            결재자와 참조자를 확인·수정한 후 승인을 눌러주세요.
          </Text>
        </View>

        {/* 결재선 편집 패널 */}
        <View style={styles.editorWrap}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerBtn: {
    paddingHorizontal: 4,
    minWidth: 44,
  },
  headerBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  notice: {
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 10,
    borderRadius: 8,
  },
  noticeText: {
    fontSize: 13,
  },
  editorWrap: {
    flex: 1,
  },
});
