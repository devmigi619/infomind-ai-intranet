import React from 'react';
import { MainScreen } from '../../features/chat/screens/MainScreen';

interface MobileMainScreenProps {
  user: { name: string; userId?: string } | null;
  onNavigate: (target: string) => void;
}

export function MobileMainScreen({ user, onNavigate }: MobileMainScreenProps) {
  return <MainScreen user={user} onNavigate={onNavigate} />;
}
