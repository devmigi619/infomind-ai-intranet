import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface State {
  open: boolean;
  opts: ConfirmOptions;
}

const DEFAULT_OPTS: ConfirmOptions = { title: '' };

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ open: false, opts: DEFAULT_OPTS });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm: ConfirmFn = useCallback((opts) => {
    // 이전 다이얼로그가 있으면 false로 resolve
    if (resolverRef.current) {
      resolverRef.current(false);
    }

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, opts });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  return React.createElement(
    ConfirmContext.Provider,
    { value: confirm },
    children,
    React.createElement(ConfirmDialog, {
      open: state.open,
      title: state.opts.title,
      message: state.opts.message,
      confirmText: state.opts.confirmText,
      cancelText: state.opts.cancelText,
      danger: state.opts.danger,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    }),
  );
}

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) {
    throw new Error('useConfirm must be used inside ConfirmProvider');
  }
  return fn;
}
