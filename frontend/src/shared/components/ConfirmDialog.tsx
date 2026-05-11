import React from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../constants/spacing';
import { radius } from '../constants/radius';
import { fontSize, fontWeight } from '../constants/typography';

const fontFamily = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.dialog, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}>
              <Text style={[styles.title, { color: theme.text.primary }]}>{title}</Text>
              {message ? (
                <Text style={[styles.message, { color: theme.text.body }]}>{message}</Text>
              ) : null}
              <View style={styles.buttons}>
                <TouchableOpacity
                  onPress={onCancel}
                  activeOpacity={0.7}
                  style={[styles.button, styles.cancelButton, { borderColor: theme.border.default }]}
                >
                  <Text style={[styles.cancelText, { color: theme.text.body }]}>{cancelText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onConfirm}
                  activeOpacity={0.7}
                  style={[
                    styles.button,
                    styles.confirmButton,
                    { backgroundColor: danger ? theme.semantic.danger : theme.brand.primary },
                  ]}
                >
                  <Text style={[styles.confirmText, { color: theme.text.onBrand }]}>{confirmText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: 320,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
  message: {
    fontSize: fontSize.body,
    fontFamily,
    lineHeight: fontSize.body * 1.5,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
  cancelText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    fontFamily,
  },
  confirmText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
});
