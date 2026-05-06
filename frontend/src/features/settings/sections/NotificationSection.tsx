import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

interface ToggleRowProps {
  label: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function ToggleRow({ label, value, onToggle, disabled = false }: ToggleRowProps) {
  const theme = useTheme();

  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: theme.text.body }, disabled && { color: theme.text.subtle }]}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={disabled ? undefined : onToggle}
        activeOpacity={disabled ? 1 : 0.7}
        style={[
          styles.switch,
          { backgroundColor: theme.border.strong },
          value && !disabled && { backgroundColor: theme.brand.primary },
        ]}
      >
        <View
          style={[
            styles.switchKnob,
            { backgroundColor: theme.bg.surface },
            value && !disabled && styles.switchKnobActive,
            disabled && { backgroundColor: theme.bg.surfaceMute },
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
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>알림</Text>

      <ToggleRow
        label="푸시 알림"
        value={pushEnabled}
        onToggle={() => setPushEnabled((v) => !v)}
      />

      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

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
    marginBottom: 24,
    fontFamily: WEB_FONT,
  },
  divider: {
    height: 1,
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
    fontFamily: WEB_FONT,
  },
  switch: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchKnobActive: {
    transform: [{ translateX: 18 }],
  },
});
