/**
 * ============================================================================
 * SRC/COMPONENTS/DASHBOARD/RECENTACTIVITYTABLE.TSX — Dashboard Activity Table
 * ============================================================================
 */

import React from 'react';
import { RecentActivityItem } from '../../types/api';
import { formatTimeThai } from '../../utils/formatters';
import { EmptyState } from '../common/StateBoxes';
import { StatusBadge } from '../common/StatusBadge';

interface RecentActivityTableProps {
  activities: RecentActivityItem[];
}

export const RecentActivityTable: React.FC<RecentActivityTableProps> = ({
  activities
}) => {
  if (!activities || activities.length === 0) {
    return (
      <EmptyState
        title="ยังไม่มีกิจกรรมในวันนี้"
        description="เมื่อเจ้าหน้าที่เริ่มหรือจบ Session ข้อมูลจะแสดงที่นี่ทันที"
      />
    );
  }

  return (
    <div className="w-full overflow-x-auto border border-line rounded-xl">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-subtle text-ink-secondary text-[13px] font-semibold border-b border-line">
            <th className="px-4 py-3 whitespace-nowrap">เวลา</th>
            <th className="px-4 py-3 whitespace-nowrap">ห้อง</th>
            <th className="px-4 py-3">รหัสนักศึกษา (3 คน)</th>
            <th className="px-4 py-3 whitespace-nowrap">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {activities.slice(0, 6).map((act) => {
            const isStart =
              act.activity_type === 'SESSION_START' ||
              act.session_status === 'ACTIVE';

            return (
              <tr
                key={`${act.session_id}_${act.activity_type}`}
                className="border-b border-line last:border-b-0 hover:bg-slate-50"
              >
                <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-ink">
                  {formatTimeThai(act.timestamp)}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-ink">
                  {act.room_name || act.room_id}
                </td>
                <td className="px-4 py-3.5 text-ink">
                  {(act.student_ids || []).join(', ')}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {isStart ? (
                    <StatusBadge status="OCCUPIED" customLabel="เริ่มใช้งาน" />
                  ) : (
                    <StatusBadge
                      status="AVAILABLE"
                      customLabel={`สิ้นสุดการใช้งาน (${act.end_reason || 'ปกติ'})`}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
