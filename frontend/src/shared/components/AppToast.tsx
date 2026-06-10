import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, View, Platform } from 'react-native';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import { Toast, ToastTitle } from './ui/toast';
import { useToastStore, type ToastItem, type ToastVariant } from '../../store/toastStore';
import { zIndex } from '../constants/zIndex';

const VARIANT_ICONS: Record<ToastVariant, { color: string; Icon: React.ComponentType<any> }> = {
  success: { color: '#10B981', Icon: CheckCircle2 },
  error:   { color: '#EF4444', Icon: XCircle },
  warning: { color: '#F59E0B', Icon: AlertTriangle },
  info:    { color: '#0A2463', Icon: Info },
};

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 3200,
  error:   4500,
  warning: 3800,
  info:    3200,
};

function ToastCard({ item }: { item: ToastItem }) {
  const hide = useToastStore((s) => s.hide);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  const duration = item.duration ?? DEFAULT_DURATION[item.variant];
  const { color: iconColor, Icon } = VARIANT_ICONS[item.variant];

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 0, duration: 180, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: -10, duration: 180, useNativeDriver: false }),
    ]).start(() => hide(item.id));
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 220, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: false }),
    ]).start();

    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }], width: '100%', alignItems: 'center' }}>
      <Toast
        action={item.variant}
        variant="outline"
        className="flex-row items-center gap-3 bg-background-0 rounded-lg p-3 w-[360px] max-w-[90%] border-l-4 border-l-primary-500 shadow-lg"
        style={{
          borderLeftColor: iconColor,
        }}
      >
        <Icon size={16} color={iconColor} />
        <ToastTitle size="sm" className="flex-1 text-typography-800 font-normal leading-relaxed text-xs">
          {item.message}
        </ToastTitle>
        <TouchableOpacity
          onPress={dismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.6}
        >
          <X size={14} color="rgba(0,0,0,0.35)" />
        </TouchableOpacity>
      </Toast>
    </Animated.View>
  );
}

export function AppToast() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 items-center gap-2"
      style={{
        top: Platform.select({ web: 16, default: 52 }),
        zIndex: zIndex.toast,
      }}
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </View>
  );
}
