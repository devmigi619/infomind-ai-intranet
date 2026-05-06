import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NavRailCustomizationModal } from '../../../layout/NavRailCustomizationModal';
import { useTheme } from '../../../shared/hooks/useTheme';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

export function CustomizeSection() {
  const [navRailModalOpen, setNavRailModalOpen] = useState(false);
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>맞춤설정</Text>

      {/* NavRail menu row */}
      <View style={styles.fieldRow}>
        <View style={styles.labelGroup}>
          <Text style={[styles.fieldLabel, { color: theme.text.body }]}>NavRail 메뉴</Text>
          <Text style={[styles.fieldDesc, { color: theme.text.subtle }]}>좌측 메뉴 항목 편집</Text>
        </View>
        <TouchableOpacity
          onPress={() => setNavRailModalOpen(true)}
          activeOpacity={0.7}
          style={[styles.secondaryButton, { borderColor: theme.border.strong }]}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.text.body }]}>편집</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

      {/* RP widget row */}
      <View style={styles.fieldRow}>
        <View style={styles.labelGroup}>
          <Text style={[styles.fieldLabel, { color: theme.text.body }]}>RP 위젯</Text>
        </View>
        <View style={[styles.prepTag, { backgroundColor: theme.bg.surfaceMute }]}>
          <Text style={[styles.prepTagText, { color: theme.text.subtle }]}>준비 중</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

      {/* Approval line row */}
      <View style={styles.fieldRow}>
        <View style={styles.labelGroup}>
          <Text style={[styles.fieldLabel, { color: theme.text.body }]}>자주 쓰는 결재선</Text>
        </View>
        <View style={[styles.prepTag, { backgroundColor: theme.bg.surfaceMute }]}>
          <Text style={[styles.prepTagText, { color: theme.text.subtle }]}>준비 중</Text>
        </View>
      </View>

      <NavRailCustomizationModal
        isOpen={navRailModalOpen}
        onClose={() => setNavRailModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 24,
    fontFamily: WEB_FONT,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  labelGroup: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: WEB_FONT,
  },
  fieldDesc: {
    fontSize: 12,
    fontFamily: WEB_FONT,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: WEB_FONT,
  },
  prepTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  prepTagText: {
    fontSize: 11,
    fontFamily: WEB_FONT,
  },
});
