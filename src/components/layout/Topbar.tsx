/**
 * ============================================================================
 * SRC/COMPONENTS/LAYOUT/TOPBAR.TSX — Mobile Forest Green Header (PDF Page 1)
 * On Desktop, page headers sit cleanly inside the main canvas (PDF Page 4).
 * ============================================================================
 */

import React from 'react';
import { useAppContext } from '../../hooks/useAppContext';

export const Topbar: React.FC = () => {
  const { isOnline } = useAppContext();

  return (
    <header className="lg:hidden bg-gradient-to-r from-[#144D32] to-[#1A6340] text-white px-4 pt-4 pb-4 rounded-b-[24px] sticky top-0 z-[80] shadow-md">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="./sskru-logo.png"
            alt="โลโก้ มรภ.ศรีสะเกษ"
            className="w-10 h-10 rounded-xl bg-white p-0.5 object-contain shrink-0 shadow-sm"
          />
          <div className="min-w-0">
            <div className="text-[11.5px] text-[#A8CDB8] truncate">
              ห้องสมุด มรภ.ศรีสะเกษ
            </div>
            <h1 className="text-[19px] font-bold text-white leading-tight truncate">
              SSKRU Library
            </h1>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-[12px] font-semibold text-white shrink-0">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-[#4ADE80]' : 'bg-red-400'
            }`}
          />
          <span>{isOnline ? 'ปกติ' : 'ออฟไลน์'}</span>
        </div>
      </div>
    </header>
  );
};
