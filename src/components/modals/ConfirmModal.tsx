/**
 * ============================================================================
 * SRC/COMPONENTS/MODALS/CONFIRMMODAL.TSX — Action Confirmation Modal
 * ============================================================================
 */

import React from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../../hooks/useAppContext';

export const ConfirmModal: React.FC = () => {
  const { confirmDialog, closeConfirmModal } = useAppContext();

  if (!confirmDialog.isOpen) return null;

  const btnColors: Record<typeof confirmDialog.variant, string> = {
    danger: 'bg-danger text-white hover:bg-red-700',
    primary: 'bg-primary text-white hover:bg-primary-hover',
    warning: 'bg-warning text-ink hover:bg-amber-500',
    success: 'bg-success text-white hover:bg-green-700'
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmModalTitle"
      className="fixed inset-0 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4 z-[250]"
    >
      <div className="bg-surface rounded-2xl w-full max-w-[440px] flex flex-col shadow-2xl border border-line overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h3 id="confirmModalTitle" className="text-[17px] font-bold text-ink">
            {confirmDialog.title}
          </h3>
          <button
            type="button"
            onClick={closeConfirmModal}
            className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink-secondary hover:bg-subtle"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-[14.5px] text-ink leading-relaxed">
            {confirmDialog.message}
          </p>
        </div>

        <div className="px-6 py-4 border-t border-line bg-subtle flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={closeConfirmModal}
            className="h-10 px-4 rounded-lg border border-line-strong bg-surface text-sm font-semibold text-ink hover:bg-slate-100"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => {
              closeConfirmModal();
              confirmDialog.onConfirm();
            }}
            className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors ${
              btnColors[confirmDialog.variant]
            }`}
          >
            {confirmDialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
