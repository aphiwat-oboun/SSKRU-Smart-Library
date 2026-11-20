/**
 * ============================================================================
 * SRC/COMPONENTS/LAYOUT/SIDEBAR.TSX — Refined Forest Green Professional Sidebar
 * ============================================================================
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Clock,
  Cpu,
  DoorOpen,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Settings,
  Users,
  X
} from 'lucide-react';
import { useAppContext } from '../../hooks/useAppContext';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemConfig {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
  badgeTone?: 'danger' | 'warning';
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const { isOnline, dashboardData, currentStaff, logout } = useAppContext();

  const waitingCount = dashboardData?.summary?.waitingGroupsCount || 0;
  const alertCount = dashboardData?.unreadNotifications?.length || 0;

  const primaryNav: NavItemConfig[] = [
    { to: '/', label: 'กระดานห้อง', icon: LayoutDashboard },
    {
      to: '/notifications',
      label: 'การแจ้งเตือน',
      icon: Bell,
      badgeCount: alertCount,
      badgeTone: 'danger'
    },
    { to: '/history', label: 'ประวัติการใช้', icon: Clock },
    { to: '/settings', label: 'ตั้งค่าห้อง', icon: Settings }
  ];

  const secondaryNav: NavItemConfig[] = [
    { to: '/students', label: 'ข้อมูลนักศึกษา', icon: Users },
    {
      to: '/waiting',
      label: 'คิวรอใช้ห้อง',
      icon: ListOrdered,
      badgeCount: waitingCount,
      badgeTone: 'warning'
    },
    { to: '/rooms', label: 'จัดการห้องทั้งหมด', icon: DoorOpen },
    { to: '/iot', label: 'อุปกรณ์เซนเซอร์ IoT', icon: Cpu },
    { to: '/reports', label: 'รายงานสถิติ', icon: BarChart3 }
  ];

  const renderLink = (item: NavItemConfig, compact = false) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/'}
        onClick={onCloseMobile}
        className={({ isActive }) =>
          `group flex items-center gap-3 w-full rounded-xl transition-all ${
            compact ? 'px-3.5 py-2.5 text-[14.5px]' : 'px-3.5 py-3 text-[15.5px]'
          } ${
            isActive
              ? 'bg-white/15 text-white font-bold shadow-sm ring-1 ring-white/15'
              : 'text-[#C6E2D1] hover:bg-white/10 hover:text-white font-medium'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              className={`w-[19px] h-[19px] shrink-0 transition-colors ${
                isActive ? 'text-[#6EE7B7]' : 'text-[#8CC4A5] group-hover:text-white'
              }`}
            />
            <span className="truncate flex-1">{item.label}</span>
            {item.badgeCount !== undefined && item.badgeCount > 0 && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center ${
                  item.badgeTone === 'warning'
                    ? 'bg-[#FDECC8] text-[#854D0E]'
                    : 'bg-[#DC2626] text-white'
                }`}
              >
                {item.badgeCount}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  const staffInitial = (currentStaff?.staff_name || currentStaff?.username || 'A')
    .charAt(0)
    .toUpperCase();

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[1px] z-[90] lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="เมนูหลัก"
        className={`w-64 bg-gradient-to-b from-[#144D32] via-[#11422B] to-[#0C3321] text-sidebar-text flex flex-col fixed top-0 left-0 bottom-0 z-[100] border-r border-white/10 shadow-xl transition-transform duration-150 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header with Official SSKRU Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="./sskru-logo.png"
              alt="ตราประจำมหาวิทยาลัยราชภัฏศรีสะเกษ"
              className="w-12 h-12 rounded-2xl bg-white p-1 object-contain shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[11.5px] text-[#9BC9AE] font-medium truncate">
                ห้องสมุด มรภ.ศรีสะเกษ
              </div>
              <div className="text-[20px] font-bold text-white leading-tight tracking-tight truncate">
                SSKRU Library
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0"
            aria-label="ปิดเมนู"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 flex flex-col gap-1">
          <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#84B89B]">
            เมนูหลัก
          </div>
          {primaryNav.map((item) => renderLink(item, false))}

          <div className="my-3.5 border-t border-white/10" />

          <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#84B89B]">
            จัดการระบบ
          </div>
          {secondaryNav.map((item) => renderLink(item, true))}
        </nav>

        {/* Bottom Status & Staff Card */}
        <div className="p-3.5 border-t border-white/10 bg-black/15 flex flex-col gap-2.5">
          {/* Sensor Status Pill */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/10 ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-[13.5px] font-semibold text-white">
              <span
                className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${
                  isOnline
                    ? 'bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]'
                    : 'bg-red-400'
                }`}
              />
              <span>{isOnline ? 'เซนเซอร์ปกติ' : 'ออฟไลน์'}</span>
            </div>
            <span className="text-[11px] font-semibold text-[#A8CDB8]">LIVE</span>
          </div>

          {/* Staff Profile + Logout Row */}
          <div className="flex items-center justify-between gap-2 px-1.5 pt-0.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#2E694C] ring-1 ring-white/25 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {staffInitial}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="text-[13px] font-semibold text-white truncate">
                  {currentStaff?.staff_name || 'ผู้ดูแลระบบ'}
                </div>
                <div className="text-[11px] text-[#9BC9AE] truncate">
                  {currentStaff?.role || 'ADMIN'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
              className="w-9 h-9 rounded-xl text-[#B8D8C6] hover:bg-red-500/20 hover:text-red-200 flex items-center justify-center transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
