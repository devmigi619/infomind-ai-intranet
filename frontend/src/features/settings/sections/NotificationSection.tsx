import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors } from '../../../shared/constants/colors';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

interface ToggleRowProps {
  label: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function ToggleRow({ label, value, onToggle, disabled = false }: ToggleRowProps) {
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, disabled && styles.fieldLabelDisabled]}>{label}</Text>
      <TouchableOpacity
        onPress={disabled ? undefined : onToggle}
        activeOpacity={disabled ? 1 : 0.7}
        style={[styles.switch, value && !disabled && styles.switchActive]}
      >
        <View
          style={[
            styles.switchKnob,
            value && !disabled && styles.switchKnobActive,
            disabled && styles.switchKnobDisabled,
          ]}
        />
      </TouchableOpacity>
    </View>
  );
}

export function NotificationSection() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [approvalAlert, setApprovalAlert] = useState(true);
  const [boardAlert, setBoardAlert] = useState(true);
  const [reportAlert, setReportAlert] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>알림</Text>

      <ToggleRow
        label="푸시 알림"
        value={pushEnabled}
        onToggle={() => setPushEnabled((v) => !v)}
      />

      <View style={styles.divider} />

      <View style={styles.subGroup}>
        <ToggleRow
          label="결재 알림"
          value={approvalAlert}
          onToggle={() => setApprovalAlert((v) => !v)}
          disabled={!pushEnabled}
        />
        <ToggleRow
          label="게시판 알림"
          value={boardAlert}
          onToggle={() => setBoardAlert((v) => !v)}
          disabled={!pushEnabled}
        />
        <ToggleRow
          label="주간보고 알림"
          value={reportAlert}
          onToggle={() => setReportAlert((v) => !v)}
          disabled={!pushEnabled}
        />
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
    marginVertical: 8,
  },
  subGroup: {
    gap: 0,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.text.body,
    fontFamily: WEB_FONT,
  },
  fieldLabelDisabled: {
    color: colors.text.subtle,
  },
  switch: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.border.strong,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: colors.brand.primary,
  },
  switchKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchKnobActive: {
    transform: [{ translateX: 18 }],
  },
  switchKnobDisabled: {
    backgroundColor: colors.background.surfaceMuteAlt,
  },
});
