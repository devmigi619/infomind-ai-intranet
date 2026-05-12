import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import { useToastStore, type ToastItem, type ToastVariant } from '../../store/toastStore';
import { zIndex } from '../constants/zIndex';

// ─── 변형별 설정 ───────────────────────────────────────────────────────────

const VARIANT: Record<
  ToastVariant,
  { accent: string; iconColor: string; Icon: React.ComponentType<any> }
> = {
  success: { accent: '#10B981', iconColor: '#10B981', Icon: CheckCircle2 },
  error:   { accent: '#EF4444', iconColor: '#EF4444', Icon: XCircle       },
  warning: { accent: '#F59E0B', iconColor: '#F59E0B', Icon: AlertTriangle  },
  info:    { accent: '#0A2463', iconColor: '#0A2463', Icon: Info           },
};

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 3200,
  error:   4500,
  warning: 3800,
  info:    3200,
};

// ─── 단일 토스트 카드 ───────────────────────────────────────────────────────

function ToastCard({ item }: { item: ToastItem }) {
  const hide  = useToastStore((s) => s.hide);
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  const duration = item.duration ?? DEFAULT_DURATION[item.variant];
  const { accent, iconColor, Icon } = VARIANT[item.variant];

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 0, duration: 180, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: -10, duration: 180, useNativeDriver: false }),
    ]).start(() => hide(item.id));
  };

  useEffect(() => {
    // 진입
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 220, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: false }),
    ]).start();

    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        s.card,
        { opacity, transform: [{ translateY }], borderLeftColor: accent },
      ]}
    >
      <Icon size={16} color={iconColor} />
      <Text style={s.message} numberOfLines={3}>
        {item.message}
      </Text>
      <TouchableOpacity
        onPress={dismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.6}
      >
        <X size={14} color="rgba(0,0,0,0.35)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── 루트 컨테이너 ─────────────────────────────────────────────────────────

export function AppToast() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <View style={s.container} pointerEvents="box-none">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </View>
  );
}

// ─── 스타일 ────────────────────────────────────────────────────────────────

const FF = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.select({ web: 16, default: 52 }),
    left: 0,
    right: 0,
    zIndex: zIndex.toast,
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'box-none',
  } as any,

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 12,
    maxWidth: 420,
    width: '90%',
    // 그림자 (iOS/Android)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },

  message: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(0,0,0,0.85)',
    fontFamily: FF,
  },
});
