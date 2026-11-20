/**
 * ============================================================================
 * SRC/COMPONENTS/MODALS/CONFIRMMODAL.TSX — Modern Action Confirmation Modal
 * ============================================================================
 */

import React from 'react';
import { AlertTriangle, CheckCircle2, KeyRound, X } from 'lucide-react';
import { useAppContext } from '../../hooks/useAppContext';

export const ConfirmModal: React.FC = () => {
  const { confirmDialog, closeConfirmModal } = useAppContext();

  if (!confirmDialog.isOpen) return null;

  const isKeyAction =
    confirmDialog.title.includes('กุญแจ') || confirmDialog.confirmLabel.includes('กุญแจ');

  const variantConfig: Record<
    typeof confirmDialog.variant,
    {
      iconBg: string;
      iconColor: string;
      btnClass: string;
      accentBar: string;
      Icon: React.FC<{ className?: string }>;
    }
  > = {
    success: {
      iconBg: 'bg-primary-light border border-success-border',
      iconColor: 'text-primary',
      btnClass: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
      accentBar: 'bg-primary',
      Icon: isKeyAction ? KeyRound : CheckCircle2
    },
    primary: {
      iconBg: 'bg-primary-light border border-success-border',
      iconColor: 'text-primary',
      btnClass: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
      accentBar: 'bg-primary',
      Icon: isKeyAction ? KeyRound : CheckCircle2
    },
    warning: {
      iconBg: 'bg-warning-bg border border-amber-200',
      iconColor: 'text-warning-text',
      btnClass: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
      accentBar: 'bg-amber-500',
      Icon: AlertTriangle
    },
    danger: {
      iconBg: 'bg-danger-bg border border-red-200',
      iconColor: 'text-danger',
      btnClass: 'bg-danger text-white hover:bg-red-700 shadow-sm',
      accentBar: 'bg-danger',
      Icon: AlertTriangle
    }
  };

  const theme = variantConfig[confirmDialog.variant];
  const IconComp = theme.Icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmModalTitle"
      onClick={closeConfirmModal}
      className="fixed inset-0 bg-slate-950/50 backdrop-blur-[3px] flex items-center justify-center p-4 z-[250]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-surface rounded-[24px] w-full max-w-[420px] shadow-2xl border border-line overflow-hidden"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={closeConfirmModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-line bg-surface flex items-center justify-center text-ink-secondary hover:bg-subtle hover:text-ink transition-colors"
          aria-label="ปิดหน้าต่าง"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Centered clean body */}
        <div className="px-6 pt-7 pb-6 text-center">
          <div
            className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 ${theme.iconBg}`}
          >
            <IconComp className={`w-7 h-7 ${theme.iconColor}`} />
          </div>

          <h3 id="confirmModalTitle" className="text-[20px] font-bold text-ink leading-snug">
            {confirmDialog.title}
          </h3>

          <p className="text-[15px] text-ink-secondary leading-relaxed mt-2">
            {confirmDialog.message}
          </p>

          {/* Balanced 2-column action buttons */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              type="button"
              onClick={closeConfirmModal}
              className="h-11 px-4 rounded-xl border border-line-strong bg-surface text-[15px] font-semibold text-ink hover:bg-subtle transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => {
                closeConfirmModal();
                confirmDialog.onConfirm();
              }}
              className={`h-11 px-4 rounded-xl text-[15px] font-bold transition-colors ${theme.btnClass}`}
            >
              {confirmDialog.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
