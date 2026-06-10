import React from 'react';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from './ui/alert-dialog';
import { Heading } from './ui/heading';
import { Text } from './ui/text';
import { Button, ButtonText } from './ui/button';

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
  return (
    <AlertDialog isOpen={open} onClose={onCancel} size="sm">
      <AlertDialogBackdrop />
      <AlertDialogContent className="border border-outline-100 bg-background-0">
        <AlertDialogHeader className="border-b-0 pb-2">
          <Heading size="md" className="text-typography-900 font-semibold">
            {title}
          </Heading>
        </AlertDialogHeader>
        {message ? (
          <AlertDialogBody className="mt-2 mb-6">
            <Text size="sm" className="text-typography-500 leading-relaxed">
              {message}
            </Text>
          </AlertDialogBody>
        ) : null}
        <AlertDialogFooter className="border-t-0 pt-0 gap-2">
          <Button
            variant="outline"
            action="secondary"
            onPress={onCancel}
            size="sm"
            className="flex-1"
          >
            <ButtonText className="text-typography-600">{cancelText}</ButtonText>
          </Button>
          <Button
            action={danger ? 'negative' : 'primary'}
            onPress={onConfirm}
            size="sm"
            className="flex-1"
          >
            <ButtonText className="text-white">{confirmText}</ButtonText>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
