import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NavRailCustomizationModal } from '../../../layout/NavRailCustomizationModal';
import { colors } from '../../../shared/constants/colors';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

export function CustomizeSection() {
  const [navRailModalOpen, setNavRailModalOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>맞춤설정</Text>

      {/* NavRail menu row */}
      <View style={styles.fieldRow}>
        <View style={styles.labelGroup}>
          <Text style={styles.fieldLabel}>NavRail 메뉴</Text>
          <Text style={styles.fieldDesc}>좌측 메뉴 항목 편집</Text>
        </View>
        <TouchableOpacity
          onPress={() => setNavRailModalOpen(true)}
          activeOpacity={0.7}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>편집</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* RP widget row */}
      <View style={styles.fieldRow}>
        <View style={styles.labelGroup}>
          <Text style={styles.fieldLabel}>RP 위젯</Text>
        </View>
        <View style={styles.prepTag}>
          <Text style={styles.prepTagText}>준비 중</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Approval line row */}
      <View style={styles.fieldRow}>
        <View style={styles.labelGroup}>
          <Text style={styles.fieldLabel}>자주 쓰는 결재선</Text>
        </View>
        <View style={styles.prepTag}>
          <Text style={styles.prepTagText}>준비 중</Text>
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
    color: colors.text.primary,
    marginBottom: 24,
    fontFamily: WEB_FONT,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
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
    color: colors.text.body,
    fontFamily: WEB_FONT,
  },
  fieldDesc: {
    fontSize: 12,
    color: colors.text.soft,
    fontFamily: WEB_FONT,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  secondaryButtonText: {
    fontSize: 13,
    color: colors.text.body,
    fontWeight: '500',
    fontFamily: WEB_FONT,
  },
  prepTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.background.surfaceMute,
    borderRadius: 8,
    flexShrink: 0,
  },
  prepTagText: {
    fontSize: 11,
    color: colors.text.soft,
    fontFamily: WEB_FONT,
  },
});
