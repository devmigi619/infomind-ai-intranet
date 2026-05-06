import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Pressable,
  Modal,
} from 'react-native';
import {
  Home,
  LayoutList,
  FileCheck,
  FileText,
  Calendar,
  Building2,
  Car,
  Users,
  BookOpen,
  X,
  Check,
} from 'lucide-react-native';
import { useUiStore } from '../store/uiStore';
import { ALL_MENUS } from '../shared/constants/menus';
import { useTheme } from '../shared/hooks/useTheme';
import type { PanelId } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Home,
  LayoutList,
  FileCheck,
  FileText,
  Calendar,
  Building2,
  Car,
  Users,
  BookOpen,
};

interface NavRailCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 드래그앤드롭 상태 (웹 전용)
interface DragState {
  draggingIndex: number | null;
  dropTarget: { index: number; position: 'above' | 'below' } | null;
}

export function NavRailCustomizationModal({ isOpen, onClose }: NavRailCustomizationModalProps) {
  const { pinnedMenus, togglePinnedMenu, reorderPinnedMenus } = useUiStore();
  const theme = useTheme();
  const [dragState, setDragState] = useState<DragState>({
    draggingIndex: null,
    dropTarget: null,
  });
  const menuListRef = useRef<View>(null);

  const checkedCount = pinnedMenus.length + 1; // +1 for 홈
  const isMax = checkedCount >= 8;

  // ESC 키로 닫기 (웹 전용)
  useEffect(() => {
    if (Platform.OS !== 'web' || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // HTML5 드래그앤드롭 (웹 전용) — RN-Web의 View에 직접 native event listener 부착
  useEffect(() => {
    if (Platform.OS !== 'web' || !isOpen) return;
    const listEl = menuListRef.current as unknown as HTMLElement | null;
    if (!listEl) return;

    // children 순서: [홈, ...pinnedMenus, ...unpinnedMenus]
    const children = Array.from(listEl.children) as HTMLElement[];
    const pinnedCount = pinnedMenus.length;

    children.forEach((row, i) => {
      // 홈은 children[0], pinned는 children[1..pinnedCount]
      if (i >= 1 && i <= pinnedCount) {
        row.draggable = true;
        row.dataset.dragIndex = String(i - 1); // pinnedMenus 내 index
      } else {
        row.draggable = false;
        delete row.dataset.dragIndex;
      }
    });

    let draggingIdx: number | null = null;

    const onDragStart = (e: DragEvent) => {
      const t = (e.target as HTMLElement).closest('[data-drag-index]') as HTMLElement | null;
      if (!t) return;
      draggingIdx = parseInt(t.dataset.dragIndex || '0', 10);
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try {
          e.dataTransfer.setData('text/plain', '');
        } catch (_) {
          // setData may throw in some browsers — safe to ignore
        }
      }
      setDragState({ draggingIndex: draggingIdx, dropTarget: null });
    };

    const onDragOver = (e: DragEvent) => {
      if (draggingIdx === null) return;
      const t = (e.target as HTMLElement).closest('[data-drag-index]') as HTMLElement | null;
      if (!t) return;
      const idx = parseInt(t.dataset.dragIndex || '0', 10);
      if (idx === draggingIdx) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      const rect = t.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const pos: 'above' | 'below' = e.clientY < mid ? 'above' : 'below';
      setDragState((s) => {
        if (s.dropTarget?.index === idx && s.dropTarget?.position === pos) return s;
        return { ...s, dropTarget: { index: idx, position: pos } };
      });
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      if (draggingIdx === null) {
        setDragState({ draggingIndex: null, dropTarget: null });
        return;
      }
      const t = (e.target as HTMLElement).closest('[data-drag-index]') as HTMLElement | null;
      if (!t) {
        draggingIdx = null;
        setDragState({ draggingIndex: null, dropTarget: null });
        return;
      }
      const idx = parseInt(t.dataset.dragIndex || '0', 10);
      if (idx !== draggingIdx) {
        const rect = t.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const pos: 'above' | 'below' = e.clientY < mid ? 'above' : 'below';
        let toIndex = pos === 'above' ? idx : idx + 1;
        if (draggingIdx < toIndex) toIndex -= 1;
        if (draggingIdx !== toIndex) {
          reorderPinnedMenus(draggingIdx, toIndex);
        }
      }
      draggingIdx = null;
      setDragState({ draggingIndex: null, dropTarget: null });
    };

    const onDragEnd = () => {
      draggingIdx = null;
      setDragState({ draggingIndex: null, dropTarget: null });
    };

    const onDragLeave = (e: DragEvent) => {
      if (!listEl.contains(e.relatedTarget as Node)) {
        setDragState((s) => ({ ...s, dropTarget: null }));
      }
    };

    listEl.addEventListener('dragstart', onDragStart);
    listEl.addEventListener('dragover', onDragOver);
    listEl.addEventListener('drop', onDrop);
    listEl.addEventListener('dragend', onDragEnd);
    listEl.addEventListener('dragleave', onDragLeave);

    return () => {
      listEl.removeEventListener('dragstart', onDragStart);
      listEl.removeEventListener('dragover', onDragOver);
      listEl.removeEventListener('drop', onDrop);
      listEl.removeEventListener('dragend', onDragEnd);
      listEl.removeEventListener('dragleave', onDragLeave);
    };
  }, [isOpen, pinnedMenus, reorderPinnedMenus]);

  if (!isOpen) return null;

  const renderMenuRow = (panelId: PanelId, index: number) => {
    const meta = ALL_MENUS.find((m) => m.panel === panelId);
    if (!meta) return null;
    const Icon = ICON_MAP[meta.iconName] ?? FileText;
    const isDragging = dragState.draggingIndex === index;
    const dropAbove =
      dragState.dropTarget?.index === index && dragState.dropTarget?.position === 'above';
    const dropBelow =
      dragState.dropTarget?.index === index && dragState.dropTarget?.position === 'below';

    return (
      <View
        key={panelId}
        style={[
          styles.menuRow,
          { backgroundColor: theme.bg.surface },
          isDragging && styles.menuRowDragging,
        ]}
      >
        {/* Drop indicator above */}
        {dropAbove && <View style={[styles.dropIndicatorAbove, { backgroundColor: theme.brand.primary }]} />}

        {/* Drag handle */}
        <View style={styles.dragHandle}>
          <View style={styles.dragHandleRow}>
            <View style={[styles.dragHandleDot, { backgroundColor: theme.text.subtle }]} />
            <View style={[styles.dragHandleDot, { backgroundColor: theme.text.subtle }]} />
          </View>
          <View style={styles.dragHandleRow}>
            <View style={[styles.dragHandleDot, { backgroundColor: theme.text.subtle }]} />
            <View style={[styles.dragHandleDot, { backgroundColor: theme.text.subtle }]} />
          </View>
          <View style={styles.dragHandleRow}>
            <View style={[styles.dragHandleDot, { backgroundColor: theme.text.subtle }]} />
            <View style={[styles.dragHandleDot, { backgroundColor: theme.text.subtle }]} />
          </View>
        </View>

        {/* Checkbox */}
        <TouchableOpacity
          style={[styles.checkbox, { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary }]}
          onPress={() => togglePinnedMenu(panelId)}
          activeOpacity={0.7}
        >
          <Check size={11} color={theme.text.onBrand} strokeWidth={3} />
        </TouchableOpacity>

        {/* Icon */}
        <View style={[styles.menuIcon, { backgroundColor: theme.brand.primaryTint }]}>
          <Icon size={18} color={theme.brand.primary} />
        </View>

        {/* Label */}
        <Text style={[styles.menuName, { color: theme.text.primary }]}>{meta.label}</Text>

        {/* Drop indicator below */}
        {dropBelow && <View style={[styles.dropIndicatorBelow, { backgroundColor: theme.brand.primary }]} />}
      </View>
    );
  };

  const renderUncheckedRow = (meta: (typeof ALL_MENUS)[number]) => {
    const Icon = ICON_MAP[meta.iconName] ?? FileText;
    const disabled = isMax;

    return (
      <TouchableOpacity
        key={meta.panel}
        style={[
          styles.menuRow,
          { backgroundColor: theme.bg.surface },
          disabled && styles.menuRowDisabled,
        ]}
        onPress={() => !disabled && togglePinnedMenu(meta.panel)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        {/* Empty drag handle placeholder */}
        <View style={styles.dragHandlePlaceholder} />

        {/* Checkbox */}
        <View
          style={[
            styles.checkbox,
            { borderColor: theme.border.strong },
            disabled && { backgroundColor: theme.bg.surfaceMute, borderColor: theme.border.default },
          ]}
        />

        {/* Icon */}
        <View
          style={[
            styles.menuIcon,
            { backgroundColor: theme.brand.primaryTintSoft },
            disabled && { backgroundColor: theme.bg.surfaceMute },
          ]}
        >
          <Icon size={18} color={disabled ? theme.text.subtle : theme.text.muted} />
        </View>

        {/* Label */}
        <Text style={[styles.menuName, { color: theme.text.primary }, disabled && { color: theme.text.muted }]}>
          {meta.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const unpinnedMenus = ALL_MENUS.filter((m) => !pinnedMenus.includes(m.panel));

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* 모달 본체 — 클릭이 backdrop으로 전파되지 않도록 onPress no-op */}
        <Pressable
          style={[
            styles.modalContainer,
            { backgroundColor: theme.bg.surface },
            Platform.OS === 'web'
              ? ({ boxShadow: theme.shadow.modal } as object)
              : {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.25,
                  shadowRadius: 30,
                  elevation: 20,
                },
          ]}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.border.subtle }]}>
            <View style={styles.modalTitleArea}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>맞춤설정</Text>
              <Text style={[styles.modalDesc, { color: theme.text.muted }]}>
                NavRail에 노출할 메뉴를 체크하세요. 핸들로 드래그하여 순서를 변경할 수 있습니다.
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <X size={16} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Max 안내 */}
          {isMax && (
            <View style={[styles.maxBanner, { backgroundColor: theme.brand.primaryTintSoft, borderBottomColor: theme.border.subtle }]}>
              <Text style={[styles.maxBannerText, { color: theme.brand.primary }]}>최대 8개까지 선택할 수 있습니다.</Text>
            </View>
          )}

          {/* Body */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.menuList} ref={menuListRef}>
              {/* 홈 (필수, 고정) */}
              <View style={[styles.menuRow, { backgroundColor: theme.bg.surfaceMute }]}>
                <View style={styles.dragHandlePlaceholder} />
                <View
                  style={[
                    styles.checkbox,
                    { backgroundColor: theme.bg.surfaceAlt, borderColor: theme.border.default },
                  ]}
                >
                  <Check size={11} color={theme.text.subtle} strokeWidth={3} />
                </View>
                <View style={[styles.menuIcon, { backgroundColor: theme.brand.primaryTintSoft }]}>
                  <Home size={18} color={theme.text.muted} />
                </View>
                <Text style={[styles.menuName, { color: theme.text.muted, fontStyle: 'italic' }]}>홈</Text>
                <View style={[styles.tag, { backgroundColor: theme.bg.surfaceAlt }]}>
                  <Text style={[styles.tagText, { color: theme.text.subtle }]}>필수</Text>
                </View>
              </View>

              {/* 핀 된 메뉴들 (드래그 가능) */}
              {pinnedMenus.map((panelId, index) => renderMenuRow(panelId, index))}

              {/* 핀 안 된 메뉴들 */}
              {unpinnedMenus.map((meta) => renderUncheckedRow(meta))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    width: 480,
    maxHeight: '85%' as unknown as number,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitleArea: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  maxBanner: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  maxBannerText: {
    fontSize: 12,
  },
  modalBody: {
    flex: 1,
  },
  menuList: {
    paddingVertical: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    position: 'relative',
  },
  menuRowDragging: {
    opacity: 0.4,
  },
  menuRowDisabled: {
    opacity: 0.5,
  },
  dragHandle: {
    width: 16,
    gap: 2,
    alignItems: 'center',
  },
  dragHandleRow: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 1,
  },
  dragHandleDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  dragHandlePlaceholder: {
    width: 16,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    flexShrink: 0,
  },
  menuName: {
    flex: 1,
    fontSize: 14,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dropIndicatorAbove: {
    position: 'absolute',
    top: -1,
    left: 24,
    right: 24,
    height: 2,
    borderRadius: 2,
    zIndex: 1,
  },
  dropIndicatorBelow: {
    position: 'absolute',
    bottom: -1,
    left: 24,
    right: 24,
    height: 2,
    borderRadius: 2,
    zIndex: 1,
  },
});
