import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
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
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.7} style={styles.trigger}>
        <View style={[styles.avatar, { backgroundColor: theme.bg.surfaceMute }]}>
          <User size={16} color={theme.text.muted} />
        </View>
        <Text style={[styles.nameText, { color: theme.text.primary }]}>
          {name}{position ? ` ${position}` : ''}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: theme.bg.surface,
                borderColor: theme.border.default,
              },
            ]}
          >
            <View style={[styles.userBlock, { borderBottomColor: theme.border.subtle }]}>
              <Text style={[styles.userName, { color: theme.text.primary }]}>{name}</Text>
              <Text style={[styles.userMeta, { color: theme.text.muted }]}>
                {department}
                {department && position ? ' · ' : ''}
                {position}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.7}
              onPress={() => {
                setOpen(false);
                onSettingsClick();
              }}
            >
              <Settings size={16} color={theme.text.primary} />
              <Text style={[styles.itemText, { color: theme.text.primary }]}>설정</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.7}
              onPress={() => {
                setOpen(false);
                onLogout();
              }}
            >
              <LogOut size={16} color={theme.semantic.danger} />
              <Text style={[styles.itemText, { color: theme.semantic.danger }]}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute',
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
    overflow: 'hidden',
  },
  userBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  userMeta: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  itemText: {
    fontSize: 13,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  divider: {
    height: 1,
  },
});
