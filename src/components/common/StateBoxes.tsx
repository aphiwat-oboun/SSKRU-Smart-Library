/**
 * ============================================================================
 * SRC/COMPONENTS/COMMON/STATEBOXES.TSX — Empty State & Error State Components
 * ============================================================================
 */

import React from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => {
  return (
    <div className="py-10 px-5 text-center rounded-xl bg-subtle border border-dashed border-line-strong">
      <div className="w-11 h-11 rounded-full bg-slate-200/70 text-ink-secondary mx-auto flex items-center justify-center mb-3">
        <Inbox className="w-5 h-5" />
      </div>
      <h4 className="text-base font-bold text-ink mb-1">{title}</h4>
      <p className="text-sm text-ink-secondary mb-4 max-w-md mx-auto">{description}</p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
};

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div
      role="alert"
      className="py-9 px-5 text-center rounded-xl bg-danger-soft border border-dashed border-danger-border"
    >
      <div className="w-11 h-11 rounded-full bg-danger-bg text-danger mx-auto flex items-center justify-center mb-3">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h4 className="text-base font-bold text-ink mb-1">ไม่สามารถโหลดข้อมูลได้</h4>
      <p className="text-sm text-ink-secondary mb-4 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-danger text-white text-xs font-semibold hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>ลองใหม่อีกครั้ง</span>
        </button>
      )}
    </div>
  );
};
