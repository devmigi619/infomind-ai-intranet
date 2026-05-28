/**
 * AprvLineEditorPanel — 결재선 편집 공용 패널 (re-export)
 *
 * 실제 구현은 features/leave-req/components/AprvLineEditorPanel.tsx 에 위치.
 * 채팅 interrupt 결재선 UI 등 leave-req 도메인 외부에서 사용할 때 이 경로로 import.
 */
export {
  AprvLineEditorPanel,
  buildOrgTree,
  countUsers,
  nodeHasMatch,
} from '../../features/leave-req/components/AprvLineEditorPanel';

export type {
  AprvTab,
  MobileView,
  OrgDeptNode,
  AprvLineEditorPanelProps,
} from '../../features/leave-req/components/AprvLineEditorPanel';
