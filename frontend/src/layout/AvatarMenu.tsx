import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { Settings, LogOut } from 'lucide-react-native';

interface AvatarMenuProps {
  name: string;
  department?: string;
  position?: string;
  onLogout: () => void;
}

export function AvatarMenu({ name, department, position, onLogout }: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const initial = name?.[0] ?? '?';

  return (
    <View>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.7} style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <View style={styles.userBlock}>
              <Text style={styles.userName}>{name}</Text>
              <Text style={styles.userMeta}>
                {department}
                {department && position ? ' · ' : ''}
                {position}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.7}
              onPress={() => setOpen(false)}
            >
              <Settings size={16} color="#000000" />
              <Text style={styles.itemText}>설정</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.7}
              onPress={() => {
                setOpen(false);
                onLogout();
              }}
            >
              <LogOut size={16} color="#EF4444" />
              <Text style={[styles.itemText, styles.dangerText]}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0A2463',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 12,
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
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
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  userMeta: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
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
    color: '#000000',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  dangerText: {
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
});
