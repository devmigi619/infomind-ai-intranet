import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Pressable,
  Modal,
  Animated,
  PanResponder,
  type PanResponderGestureState,
} from 'react-native';
import { Home, FileText, X, Check } from 'lucide-react-native';
import { selectPinnedForMode, useUiStore } from '../store/uiStore';
import { MENU_ICON_MAP, type MenuMeta } from '../shared/constants/menus';
import { useMenuList, useMenusForMode } from '../shared/hooks/useMenuList';
import { useTheme } from '../shared/hooks/useTheme';
import { useResponsive } from '../shared/hooks/useResponsive';
import type { PanelId } from '../types';

interface NavRailCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 드래그앤드롭 상태 (웹 전용)
interface DragState {
  draggingIndex: number | null;
  dropTarget: { index: number; position: 'above' | 'below' } | null;
}

// 모바일 드래그 상수
const LONG_PRESS_MS = 500;
const LONG_PRESS_TOLERANCE = 8; // long press 활성 전 손가락 이동 허용 px
const ROW_HEIGHT_ESTIMATE = 52; // menuRow paddingVertical(10*2)+icon(32) ≈ 52

export function NavRailCustomizationModal({ isOpen, onClose }: NavRailCustomizationModalProps) {
  const togglePinnedMenu = useUiStore((s) => s.togglePinnedMenu);
  const reorderPinnedMenus = useUiStore((s) => s.reorderPinnedMenus);
  const isAdminMode = useUiStore((s) => s.isAdminMode);
  const pinnedMenus = useUiStore(selectPinnedForMode);
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const menus = useMenuList();
  const menusForMode = useMenusForMode(isAdminMode);
  const maxPinned = isMobile ? 3 : 7;
  const [dragState, setDragState] = useState<DragState>({
    draggingIndex: null,
    dropTarget: null,
  });
  const menuListRef = useRef<View>(null);

  // 모바일 드래그 — 각 핀 행의 절대 Y 위치 (List 좌표계 기준)와 높이를 측정
  const rowLayoutsRef = useRef<{ y: number; height: number }[]>([]);
  // 활성화된 long-press 인덱스 (null = 아직 활성 X)
  const [activeMobileDragIdx, setActiveMobileDragIdx] = useState<number | null>(null);
  const activeMobileDragIdxRef = useRef<number | null>(null);
  // 드래그 시작 시 그 행의 시작 Y (list 좌표계)
  const dragStartRowYRef = useRef(0);
  // 행 transform용 Animated value (드래그 중 행 자체를 옮김)
  const dragTranslateY = useRef(new Animated.Value(0)).current;
  // long press 타이머
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setRowLayout = (index: number, y: number, height: number) => {
    rowLayoutsRef.current[index] = { y, height };
  };
  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const cancelMobileDrag = () => {
    clearLongPressTimer();
    activeMobileDragIdxRef.current = null;
    setActiveMobileDragIdx(null);
    setDragState({ draggingIndex: null, dropTarget: null });
    dragTranslateY.setValue(0);
  };

  const isMax = pinnedMenus.length >= maxPinned;

  // ESC 키로 닫기 (웹 전용)
  useEffect(() => {
    if (Platform.OS !== 'web' || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 닫힐 때 모바일 드래그 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      cancelMobileDrag();
      rowLayoutsRef.current = [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 모바일: 핀 행마다 PanResponder 생성. pinnedMenus 변경 시 재생성.
  const mobilePanResponders = useMemo(() => {
    if (!isMobile) return [];
    return pinnedMenus.map((_, index) => {
      const computeDropTarget = (
        touchListY: number,
      ): { index: number; position: 'above' | 'below' } | null => {
        const layouts = rowLayoutsRef.current;
        const draggingIdx = activeMobileDragIdxRef.current;
        if (draggingIdx === null) return null;
        for (let i = 0; i < layouts.length; i += 1) {
          const layout = layouts[i];
          if (!layout) continue;
          if (i === draggingIdx) continue;
          const mid = layout.y + layout.height / 2;
          if (touchListY < layout.y) continue;
          if (touchListY > layout.y + layout.height) continue;
          return { index: i, position: touchListY < mid ? 'above' : 'below' };
        }
        // 범위 밖: 가장 위/아래 끝으로 보정
        const firstLayout = layouts.find((l) => !!l);
        const lastLayout = [...layouts].reverse().find((l) => !!l);
        if (firstLayout && touchListY < firstLayout.y) {
          return { index: 0, position: 'above' };
        }
        if (lastLayout && touchListY > lastLayout.y + lastLayout.height) {
          const lastIdx = layouts.length - 1;
          return { index: lastIdx, position: 'below' };
        }
        return null;
      };

      return PanResponder.create({
        // 시작은 가벼이 — touch 잡기만. 활성화는 long press 타이머 후.
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_e, g) => {
          // long press 활성 중이면 PanResponder가 move를 잡아야 ScrollView가 스크롤 안 됨
          return activeMobileDragIdxRef.current === index && (Math.abs(g.dy) > 0 || Math.abs(g.dx) > 0);
        },
        onMoveShouldSetPanResponderCapture: (_e, g) => {
          return activeMobileDragIdxRef.current === index && Math.abs(g.dy) > 2;
        },
        onPanResponderGrant: () => {
          const layout = rowLayoutsRef.current[index];
          if (!layout) return;
          dragStartRowYRef.current = layout.y;
          // long press 타이머 시작
          clearLongPressTimer();
          longPressTimerRef.current = setTimeout(() => {
            activeMobileDragIdxRef.current = index;
            setActiveMobileDragIdx(index);
            setDragState({ draggingIndex: index, dropTarget: null });
            dragTranslateY.setValue(0);
          }, LONG_PRESS_MS);
        },
        onPanResponderMove: (_e, g: PanResponderGestureState) => {
          // long press 활성 전: 손가락이 일정 px 이상 움직이면 cancel (스크롤이 우선)
          if (activeMobileDragIdxRef.current === null) {
            if (Math.abs(g.dx) > LONG_PRESS_TOLERANCE || Math.abs(g.dy) > LONG_PRESS_TOLERANCE) {
              clearLongPressTimer();
            }
            return;
          }
          // long press 활성 후: 행을 dy만큼 옮기고, drop target 갱신
          dragTranslateY.setValue(g.dy);
          // touch가 있는 행의 list 좌표계 Y = 시작 row Y + 손가락 dy
          const touchListY = dragStartRowYRef.current + g.dy + (rowLayoutsRef.current[index]?.height ?? ROW_HEIGHT_ESTIMATE) / 2;
          const next = computeDropTarget(touchListY);
          setDragState((s) => {
            if (
              s.dropTarget?.index === next?.index &&
              s.dropTarget?.position === next?.position
            ) {
              return s;
            }
            return { draggingIndex: index, dropTarget: next };
          });
        },
        onPanResponderRelease: () => {
          const draggingIdx = activeMobileDragIdxRef.current;
          if (draggingIdx === null) {
            cancelMobileDrag();
            return;
          }
          // 드롭 적용
          setDragState((s) => {
            const target = s.dropTarget;
            if (target && target.index !== draggingIdx) {
              let toIndex = target.position === 'above' ? target.index : target.index + 1;
              if (draggingIdx < toIndex) toIndex -= 1;
              if (draggingIdx !== toIndex) {
                reorderPinnedMenus(draggingIdx, toIndex);
              }
            }
            return { draggingIndex: null, dropTarget: null };
          });
          clearLongPressTimer();
          activeMobileDragIdxRef.current = null;
          setActiveMobileDragIdx(null);
          dragTranslateY.setValue(0);
        },
        onPanResponderTerminate: () => {
          cancelMobileDrag();
        },
        onPanResponderTerminationRequest: () => {
          // long press 활성 중에는 다른 responder에 양보 X
          return activeMobileDragIdxRef.current === null;
        },
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, pinnedMenus, reorderPinnedMenus]);

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

  // RN Modal이 visible로 마운트 처리 — 단순 게이팅
  if (!isOpen) return null;

  const renderMenuRow = (panelId: PanelId, index: number) => {
    const meta = menus.find((m) => m.panel === panelId);
    if (!meta) return null;
    const Icon = MENU_ICON_MAP[meta.iconName] ?? FileText;
    const isDragging = dragState.draggingIndex === index;
    const dropAbove =
      dragState.dropTarget?.index === index && dragState.dropTarget?.position === 'above';
    const dropBelow =
      dragState.dropTarget?.index === index && dragState.dropTarget?.position === 'below';

    // 모바일: PanResponder props + 활성 행은 손가락 따라 이동
    const mobileResponder = isMobile ? mobilePanResponders[index] : null;
    const isActiveMobileDrag = isMobile && activeMobileDragIdx === index;

    return (
      <Animated.View
        key={panelId}
        onLayout={(e) => {
          if (!isMobile) return;
          const { y, height } = e.nativeEvent.layout;
          setRowLayout(index, y, height);
        }}
        {...(mobileResponder ? mobileResponder.panHandlers : {})}
        style={{
          // Animated.View에는 NativeWind className 스타일이 안정적으로 적용되지 않을 수 있다.
          // 이 패턴이 커지면 Animated.View는 모션만 담당하고, 내부 View가 레이아웃을 담당하도록 분리한다.
          flexDirection: 'row',
          alignItems: 'center',
          position: 'relative',
          paddingHorizontal: 24,
          paddingVertical: 10,
          gap: 12,
          backgroundColor: theme.bg.surface,
          opacity: isDragging ? 0.4 : isActiveMobileDrag ? 0.7 : 1,
          ...(isActiveMobileDrag
            ? {
                transform: [{ translateY: dragTranslateY }],
                zIndex: 10,
                ...(Platform.OS === 'web'
                  ? { boxShadow: '0 8px 16px rgba(0,0,0,0.18)' }
                  : {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.18,
                      shadowRadius: 16,
                      elevation: 8,
                    }),
              }
            : {}),
        }}
      >
        {/* Drop indicator above */}
        {dropAbove && (
          <View
            className="absolute z-[1] h-0.5 rounded-[2px] left-6 right-6 top-[-1px]"
            style={{ backgroundColor: theme.brand.primary }}
          />
        )}

        {/* Drag handle */}
        <View className="w-4 items-center" style={{ gap: 2 }}>
          <View className="flex-row my-0.5" style={{ gap: 4 }}>
            <View className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: theme.text.subtle }} />
            <View className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: theme.text.subtle }} />
          </View>
          <View className="flex-row my-0.5" style={{ gap: 4 }}>
            <View className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: theme.text.subtle }} />
            <View className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: theme.text.subtle }} />
          </View>
          <View className="flex-row my-0.5" style={{ gap: 4 }}>
            <View className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: theme.text.subtle }} />
            <View className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: theme.text.subtle }} />
          </View>
        </View>

        {/* Checkbox */}
        <TouchableOpacity
          className="w-4.5 h-4.5 border rounded items-center justify-center shrink-0"
          style={{ backgroundColor: theme.brand.primary, borderColor: theme.brand.primary }}
          onPress={() => togglePinnedMenu(panelId, maxPinned)}
          activeOpacity={0.7}
        >
          <Check size={11} color={theme.text.onBrand} strokeWidth={3} />
        </TouchableOpacity>

        {/* Icon */}
        <View
          className="w-8 h-8 items-center justify-center rounded-lg shrink-0"
          style={{ backgroundColor: theme.brand.primaryTint }}
        >
          <Icon size={18} color={theme.brand.primary} />
        </View>

        {/* Label */}
        <Text className="flex-1" style={{ fontSize: 14, color: theme.text.primary }}>
          {meta.label}
        </Text>

        {/* Drop indicator below */}
        {dropBelow && (
          <View
            className="absolute z-[1] h-0.5 rounded-[2px] left-6 right-6 bottom-[-1px]"
            style={{ backgroundColor: theme.brand.primary }}
          />
        )}
      </Animated.View>
    );
  };

  const renderUncheckedRow = (meta: MenuMeta) => {
    const Icon = MENU_ICON_MAP[meta.iconName] ?? FileText;
    const disabled = isMax;

    return (
      <TouchableOpacity
        key={meta.panel}
        className="flex-row items-center relative px-6 py-2.5"
        style={{
          gap: 12,
          backgroundColor: theme.bg.surface,
          opacity: disabled ? 0.5 : 1,
        }}
        onPress={() => !disabled && togglePinnedMenu(meta.panel, maxPinned)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        {/* Empty drag handle placeholder */}
        <View style={{ width: 16 }} />

        {/* Checkbox */}
        <View
          className="w-4.5 h-4.5 border rounded items-center justify-center shrink-0"
          style={{
            borderColor: disabled ? theme.border.default : theme.border.strong,
            backgroundColor: disabled ? theme.bg.surfaceMute : 'transparent',
          }}
        />

        {/* Icon */}
        <View
          className="w-8 h-8 items-center justify-center rounded-lg shrink-0"
          style={{
            backgroundColor: disabled ? theme.bg.surfaceMute : theme.brand.primaryTintSoft,
          }}
        >
          <Icon size={18} color={disabled ? theme.text.subtle : theme.text.muted} />
        </View>

        {/* Label */}
        <Text className="flex-1" style={{ fontSize: 14, color: disabled ? theme.text.muted : theme.text.primary }}>
          {meta.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const unpinnedMenus = menusForMode.filter((m) => !pinnedMenus.includes(m.panel));

  // PC/모바일 공유: 화면 중앙 fade 모달, 박스 폭만 디바이스 분기
  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPress={onClose}
      >
        {/* 모달 본체 — 클릭이 backdrop으로 전파되지 않도록 onPress no-op */}
        <Pressable
          className="overflow-hidden"
          style={{
            maxHeight: '85%',
            borderRadius: 16,
            backgroundColor: theme.bg.surface,
            width: isMobile ? '90%' : 480,
            ...(Platform.OS === 'web'
              ? { boxShadow: theme.shadow.modal }
              : {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.25,
                  shadowRadius: 30,
                  elevation: 20,
                }),
          }}
          onPress={() => {}}
        >
          {/* Header */}
          <View
            className="flex-row items-start justify-between px-6 pt-5 pb-3 border-b"
            style={{ borderBottomColor: theme.border.subtle }}
          >
            <View className="flex-1">
              <Text className="mb-1 font-medium" style={{ fontSize: 16, color: theme.text.primary }}>
                맞춤설정
              </Text>
              <Text className="text-[12px] leading-[18px]" style={{ color: theme.text.muted }}>
                {isAdminMode
                  ? '관리자 메뉴 중 NavRail에 노출할 항목을 선택하세요. 핸들로 드래그하여 순서를 변경할 수 있습니다.'
                  : 'NavRail에 노출할 메뉴를 체크하세요. 핸들로 드래그하여 순서를 변경할 수 있습니다.'}
              </Text>
            </View>
            <TouchableOpacity
              className="w-7 h-7 items-center justify-center rounded-[6px]"
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={16} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Max 안내 */}
          {isMax && (
            <View
              className="px-6 py-2 border-b"
              style={{
                backgroundColor: theme.brand.primaryTintSoft,
                borderBottomColor: theme.border.subtle,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.brand.primary }}>
                {`최대 ${maxPinned + 1}개까지 선택할 수 있습니다.`}
              </Text>
            </View>
          )}

          {/* Body */}
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="py-2" ref={menuListRef}>
              {/* 홈 (필수, 고정) */}
              <View
                className="flex-row items-center relative px-6 py-2.5"
                style={{ gap: 12, backgroundColor: theme.bg.surfaceMute }}
              >
                <View style={{ width: 16 }} />
                <View
                  className="w-4.5 h-4.5 border rounded items-center justify-center shrink-0"
                  style={{
                    borderColor: theme.border.default,
                    backgroundColor: theme.bg.surfaceAlt,
                  }}
                >
                  <Check size={11} color={theme.text.subtle} strokeWidth={3} />
                </View>
                <View
                  className="w-8 h-8 items-center justify-center rounded-lg shrink-0"
                  style={{ backgroundColor: theme.brand.primaryTintSoft }}
                >
                  <Home size={18} color={theme.text.muted} />
                </View>
                <Text
                  className="flex-1 italic"
                  style={{ fontSize: 14, color: theme.text.muted }}
                >
                  홈
                </Text>
                <View
                  className="px-2 py-0.5 rounded-lg"
                  style={{ backgroundColor: theme.bg.surfaceAlt }}
                >
                  <Text
                    className="uppercase"
                    style={{
                      fontSize: 10,
                      letterSpacing: 0.4,
                      color: theme.text.subtle,
                    }}
                  >
                    필수
                  </Text>
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
