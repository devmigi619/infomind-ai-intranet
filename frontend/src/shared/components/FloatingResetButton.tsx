import React from 'react';
import { RotateCcw } from 'lucide-react-native';
import { Fab } from './ui/fab';
import { useUiStore } from '../../store/uiStore';

export function FloatingResetButton() {
  const resetChat = useUiStore((s) => s.resetChat);

  return (
    <Fab
      onPress={resetChat}
      placement="bottom right"
      className="bottom-[96px] right-4 w-11 h-11 bg-background-0 hover:bg-background-50 border border-outline-200 active:bg-background-100 rounded-full z-50 opacity-60 hover:opacity-100 justify-center items-center p-0"
    >
      <RotateCcw size={18} color="rgba(0,0,0,0.4)" />
    </Fab>
  );
}
