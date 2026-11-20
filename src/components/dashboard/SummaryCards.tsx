/**
 * ============================================================================
 * SRC/COMPONENTS/DASHBOARD/SUMMARYCARDS.TSX — Top 5 Dashboard Summary Cards
 * ============================================================================
 */

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  UserCheck,
  Users
} from 'lucide-react';
import { DashboardSummaryCounts } from '../../types/api';

interface SummaryCardsProps {
  summary: DashboardSummaryCounts;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      {/* 1. Total Rooms */}
      <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="w-[52px] h-[52px] rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">
          <LayoutGrid className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-ink-secondary mb-1">
            จำนวนห้องทั้งหมด
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[26px] font-bold text-ink leading-none">
              {summary.totalRooms || 10} ห้อง
            </span>
            <span className="text-xs font-medium text-ink-secondary">
              ชั้น 3 (6) • ชั้น 5 (4)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Available Rooms */}
      <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="w-[52px] h-[52px] rounded-xl bg-success-bg text-success flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-ink-secondary mb-1">
            ห้องว่างพร้อมใช้
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[26px] font-bold text-ink leading-none">
              {summary.availableRooms || 0} ห้อง
            </span>
            <span className="text-xs font-semibold text-success">
              ● พร้อมใช้งาน
            </span>
          </div>
        </div>
      </div>

      {/* 3. Occupied Rooms */}
      <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="w-[52px] h-[52px] rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <UserCheck className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-ink-secondary mb-1">
            ห้องที่กำลังใช้งาน
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[26px] font-bold text-ink leading-none">
              {summary.occupiedRooms || 0} ห้อง
            </span>
            <span className="text-xs font-medium text-ink-secondary">
              คิวรอ {summary.waitingGroupsCount || 0} กลุ่ม
            </span>
          </div>
        </div>
      </div>

      {/* 4. Warning / Alert Rooms */}
      <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div
          className={`w-[52px] h-[52px] rounded-xl flex items-center justify-center shrink-0 ${
            summary.warningRooms > 0
              ? 'bg-danger-bg text-danger'
              : 'bg-warning-bg text-warning-text'
          }`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-ink-secondary mb-1">
            ห้องที่มีการแจ้งเตือน
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[26px] font-bold text-ink leading-none">
              {summary.warningRooms || 0} ห้อง
            </span>
            <span
              className={`text-xs font-semibold ${
                summary.warningRooms > 0 ? 'text-danger' : 'text-ink-secondary'
              }`}
            >
              {summary.warningRooms > 0 ? 'ต้องตรวจสอบ' : 'ปกติ'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Current Active Users */}
      <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="w-[52px] h-[52px] rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">
          <Users className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-ink-secondary mb-1">
            ผู้ใช้งานปัจจุบัน
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[26px] font-bold text-ink leading-none">
              {summary.activeUsersCount || 0} คน
            </span>
            <span className="text-xs font-semibold text-success">
              ในห้องค้นคว้า
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
