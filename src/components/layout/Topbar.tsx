/**
 * ============================================================================
 * SRC/COMPONENTS/LAYOUT/TOPBAR.TSX — Mobile Forest Green Header (PDF Page 1)
 * On Desktop, page headers sit cleanly inside the main canvas (PDF Page 4).
 * ============================================================================
 */

import React from 'react';
import { Menu } from 'lucide-react';
import { useAppContext } from '../../hooks/useAppContext';

interface TopbarProps {
  onToggleMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMobileMenu }) => {
  const { isOnline } = useAppContext();

  return (
    <header className="lg:hidden bg-sidebar-bg text-white px-5 pt-5 pb-6 rounded-b-[28px] sticky top-0 z-[80] shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0"
            aria-label="เปิดเมนู"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="min-w-0">
            <div className="text-[13px] text-[#A8CDB8] truncate">
              เคาน์เตอร์ · ห้องสมุด มรภ.ศรีสะเกษ
            </div>
            <h1 className="text-[24px] font-bold text-white leading-tight truncate">
              ห้องประชุม
            </h1>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/15 text-[13px] font-semibold text-white shrink-0">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isOnline ? 'bg-[#4ADE80]' : 'bg-red-400'
            }`}
          />
          <span>{isOnline ? 'เซนเซอร์ปกติ' : 'ออฟไลน์'}</span>
        </div>
      </div>
    </header>
  );
};
