/**
 * ============================================================================
 * SRC/COMPONENTS/COMMON/TOASTCONTAINER.TSX — Non-Intrusive Toast Alerts
 * ============================================================================
 */

import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { ToastType, useToast } from '../../hooks/useToast';

const BORDER_MAP: Record<ToastType, string> = {
  success: 'border-l-success',
  warning: 'border-l-warning',
  error: 'border-l-danger',
  info: 'border-l-primary'
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[400] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto bg-surface border border-line border-l-4 ${BORDER_MAP[t.type]} rounded-lg p-3.5 shadow-lg flex items-start gap-3 text-sm`}
        >
          <span className="mt-0.5 shrink-0">
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-success" />}
            {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-warning" />}
            {t.type === 'error' && <XCircle className="w-4 h-4 text-danger" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-primary" />}
          </span>
          <div className="flex-1 text-ink font-medium">{t.message}</div>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            className="text-ink-muted hover:text-ink transition-colors"
            aria-label="ปิดการแจ้งเตือน"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
