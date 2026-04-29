import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '../../../shared/constants/colors';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

export function DisplaySection() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>화면</Text>

      {/* Dark mode row */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>다크 모드</Text>
        <View style={styles.prepTag}>
          <Text style={styles.prepTagText}>준비 중</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Language row */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>언어</Text>
        <View style={styles.selectBox}>
          <Text style={styles.selectBoxText}>한국어</Text>
        </View>
      </View>
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
  fieldLabel: {
    fontSize: 14,
    color: colors.text.body,
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
  selectBox: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: 8,
    backgroundColor: colors.background.surfaceMute,
    flexShrink: 0,
  },
  selectBoxText: {
    fontSize: 13,
    color: colors.text.muted,
    fontFamily: WEB_FONT,
  },
});
