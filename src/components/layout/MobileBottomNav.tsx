/**
 * ============================================================================
 * SRC/COMPONENTS/LAYOUT/MOBILEBOTTOMNAV.TSX — Native-Style Mobile Bottom Bar
 * Shown only on mobile/tablet (< lg). Matches the current Forest Green UI.
 * ============================================================================
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { Bell, DoorOpen, KeyRound, LayoutDashboard, Menu } from 'lucide-react';
import { useAppContext } from '../../hooks/useAppContext';

interface MobileBottomNavProps {
  onOpenDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenDrawer }) => {
  const { dashboardData, openStartSessionModal } = useAppContext();
  const unreadCount = dashboardData?.unreadNotifications?.length || 0;

  return (
    <nav
      aria-label="แถบนำทางมือถือ"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[85] bg-surface/95 backdrop-blur-md border-t border-line shadow-[0_-4px_20px_rgba(16,42,30,0.08)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5"
    >
      <div className="max-w-lg mx-auto grid grid-cols-5 items-end">
        {/* 1. กระดานห้อง */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-ink-secondary font-medium'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[11px] leading-tight">กระดาน</span>
        </NavLink>

        {/* 2. ห้องทั้งหมด */}
        <NavLink
          to="/rooms"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-ink-secondary font-medium'
            }`
          }
        >
          <DoorOpen className="w-5 h-5" />
          <span className="text-[11px] leading-tight">ห้องประชุม</span>
        </NavLink>

        {/* 3. ปุ่มกลาง: ให้กุญแจด่วน */}
        <div className="flex flex-col items-center -mt-5">
          <button
            type="button"
            onClick={() => openStartSessionModal()}
            aria-label="ให้กุญแจกลุ่มใหม่"
            className="w-[52px] h-[52px] rounded-2xl bg-primary hover:bg-primary-hover active:scale-95 text-white flex items-center justify-center shadow-[0_6px_16px_rgba(30,117,72,0.38)] ring-4 ring-surface transition-all"
          >
            <KeyRound className="w-6 h-6" />
          </button>
          <span className="text-[11px] font-bold text-primary mt-1 leading-tight">
            ให้กุญแจ
          </span>
        </div>

        {/* 4. แจ้งเตือน */}
        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-ink-secondary font-medium'
            }`
          }
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[11px] leading-tight">แจ้งเตือน</span>
        </NavLink>

        {/* 5. เมนูทั้งหมด */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-ink-secondary font-medium hover:text-primary transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[11px] leading-tight">เมนูอื่น</span>
        </button>
      </div>
    </nav>
  );
};
