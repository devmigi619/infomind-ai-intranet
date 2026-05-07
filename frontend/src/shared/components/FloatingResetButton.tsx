import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import { useUiStore } from '../../store/uiStore';

export function FloatingResetButton() {
  const theme = useTheme();
  const resetChat = useUiStore((s) => s.resetChat);

  const webShadow = Platform.OS === 'web'
    ? ({ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' } as object)
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
      };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        webShadow,
        { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle },
      ]}
      activeOpacity={1}
      onPress={resetChat}
    >
      <RotateCcw size={18} color="rgba(0,0,0,0.4)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 16,
    bottom: 96, // ChatInput(약 80px) 위 16px 띄움
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
    zIndex: 50,
  },
});
