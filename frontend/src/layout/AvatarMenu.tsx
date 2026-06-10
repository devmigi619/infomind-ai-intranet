import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import { Settings, LogOut, User } from 'lucide-react-native';
import { useTheme } from '../shared/hooks/useTheme';

interface AvatarMenuProps {
  name: string;
  department?: string;
  position?: string;
  onLogout: () => void;
  onSettingsClick: () => void;
}

export function AvatarMenu({ name, department, position, onLogout, onSettingsClick }: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        className="flex-row items-center ml-1"
      >
        <View
          className="w-7 h-7 rounded-full items-center justify-center"
          style={{ backgroundColor: theme.bg.surfaceMute }}
        >
          <User size={16} color={theme.text.muted} />
        </View>
        <Text
          className="ml-2 font-medium"
          style={{
            fontSize: 13,
            color: theme.text.primary,
            fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
          }}
        >
          {name}{position ? ` ${position}` : ''}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-transparent"
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            className="absolute overflow-hidden"
            style={{
              top: 44,
              right: 16,
              width: 220,
              borderWidth: 1,
              borderRadius: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.1,
              shadowRadius: 24,
              elevation: 8,
              backgroundColor: theme.bg.surface,
              borderColor: theme.border.default,
            }}
          >
            <View
              className="px-4 py-3.5 border-b"
              style={{ borderBottomColor: theme.border.subtle }}
            >
              <Text
                className="font-medium"
                style={{
                  fontSize: 14,
                  color: theme.text.primary,
                  fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
                }}
              >
                {name}
              </Text>
              <Text
                className="mt-0.5"
                style={{
                  fontSize: 12,
                  color: theme.text.muted,
                  fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
                }}
              >
                {department}
                {department && position ? ' · ' : ''}
                {position}
              </Text>
            </View>

            <TouchableOpacity
              className="flex-row items-center px-4 py-2.5"
              style={{ gap: 10 }}
              activeOpacity={0.7}
              onPress={() => {
                setOpen(false);
                onSettingsClick();
              }}
            >
              <Settings size={16} color={theme.text.primary} />
              <Text
                style={{
                  fontSize: 13,
                  color: theme.text.primary,
                  fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
                }}
              >
                설정
              </Text>
            </TouchableOpacity>

            <View
              style={{
                height: 1,
                backgroundColor: theme.border.subtle,
              }}
            />

            <TouchableOpacity
              className="flex-row items-center px-4 py-2.5"
              style={{ gap: 10 }}
              activeOpacity={0.7}
              onPress={() => {
                setOpen(false);
                onLogout();
              }}
            >
              <LogOut size={16} color={theme.semantic.danger} />
              <Text
                style={{
                  fontSize: 13,
                  color: theme.semantic.danger,
                  fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
                }}
              >
                로그아웃
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
