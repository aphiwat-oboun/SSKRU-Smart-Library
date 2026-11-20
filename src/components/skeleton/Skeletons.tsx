/**
 * ============================================================================
 * SRC/COMPONENTS/SKELETON/SKELETONS.TSX — Mandatory Skeleton Loading Components
 * Covers all 7 required areas:
 * 1. Dashboard Summary Cards
 * 2. Room Status Cards
 * 3. Student Table
 * 4. Student Detail
 * 5. Activity Table
 * 6. Notification Panel
 * 7. Report Summary
 * ============================================================================
 */

import React from 'react';

export const SummaryCardsSkeleton: React.FC = () => {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6"
      aria-busy="true"
      aria-label="กำลังโหลดข้อมูลสรุป"
    >
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex items-center gap-4"
        >
          <div className="skeleton w-13 h-13 rounded-xl shrink-0" style={{ width: 52, height: 52 }} />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="skeleton h-3.5 w-3/4 rounded" />
            <div className="skeleton h-7 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const RoomCardsSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      aria-busy="true"
      aria-label="กำลังโหลดสถานะห้อง"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-surface border border-line rounded-xl p-4 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="skeleton h-5 w-2/5 rounded" />
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
          <div className="skeleton h-3.5 w-2/3 rounded" />
          <div className="skeleton h-3.5 w-4/5 rounded" />
          <div className="flex items-center gap-2.5 pt-1">
            <div className="skeleton h-2 flex-1 rounded-full" />
            <div className="skeleton w-7 h-7 rounded-full shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableRowsSkeleton: React.FC<{ cols?: number; rows?: number }> = ({
  cols = 5,
  rows = 5
}) => {
  return (
    <div
      className="w-full overflow-x-auto border border-line rounded-xl bg-surface"
      aria-busy="true"
      aria-label="กำลังโหลดตารางข้อมูล"
    >
      <table className="w-full border-collapse text-left text-sm">
        <tbody>
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx} className="border-b border-line last:border-b-0">
              {Array.from({ length: cols }).map((__, cIdx) => (
                <td key={cIdx} className="px-4 py-3.5">
                  <div
                    className="skeleton h-3.5 rounded"
                    style={{
                      width: cIdx === 0 ? '60%' : cIdx === cols - 1 ? '70%' : '85%'
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const StudentDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="กำลังโหลดรายละเอียดนักศึกษา">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-subtle border border-line rounded-xl p-4 space-y-2.5">
          <div className="skeleton h-5 w-3/5 rounded" />
          <div className="skeleton h-3.5 w-4/5 rounded" />
          <div className="skeleton h-3.5 w-3/4 rounded" />
          <div className="skeleton h-3.5 w-1/2 rounded" />
        </div>
        <div className="bg-subtle border border-line rounded-xl p-4 space-y-2.5">
          <div className="skeleton h-5 w-1/2 rounded" />
          <div className="skeleton h-3.5 w-5/6 rounded" />
          <div className="skeleton h-3.5 w-2/3 rounded" />
        </div>
      </div>
      <div className="skeleton h-5 w-1/3 rounded" />
      <TableRowsSkeleton cols={5} rows={3} />
    </div>
  );
};

export const NotificationPanelSkeleton: React.FC = () => {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label="กำลังโหลดการแจ้งเตือน">
      <div className="bg-surface border border-danger-border rounded-xl p-4 space-y-2">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3.5 w-11/12 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
};

export const DailySummarySkeleton: React.FC = () => {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="กำลังโหลดสรุปการใช้งานวันนี้">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-subtle border border-line rounded-lg p-3 space-y-2">
          <div className="skeleton h-6 w-2/3 rounded" />
          <div className="skeleton h-3 w-4/5 rounded" />
        </div>
        <div className="bg-subtle border border-line rounded-lg p-3 space-y-2">
          <div className="skeleton h-6 w-2/3 rounded" />
          <div className="skeleton h-3 w-4/5 rounded" />
        </div>
      </div>
      <div className="skeleton h-24 w-full rounded-lg" />
    </div>
  );
};

export const ReportSummarySkeleton: React.FC = () => {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="กำลังโหลดรายงาน">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex items-center gap-4"
          >
            <div className="skeleton w-12 h-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-3/4 rounded" />
              <div className="skeleton h-6 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
      <TableRowsSkeleton cols={7} rows={5} />
    </div>
  );
};
