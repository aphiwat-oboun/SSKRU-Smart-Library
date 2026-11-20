/**
 * ============================================================================
 * SRC/PAGES/ROOMMANAGEMENTPAGE.TSX — View 2: Manage All 10 Study Rooms
 * ============================================================================
 */

import React, { useState } from 'react';
import { Play, RefreshCw, Square } from 'lucide-react';
import { EmptyState, ErrorState } from '../components/common/StateBoxes';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableRowsSkeleton } from '../components/skeleton/Skeletons';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from '../hooks/useToast';
import { apiService } from '../services/apiClient';
import {
  formatDurationHoursMinutes,
  formatTimeThai
} from '../utils/formatters';

export const RoomManagementPage: React.FC = () => {
  const {
    dashboardData,
    isDashboardLoading,
    dashboardError,
    refreshDashboard,
    openStartSessionModal,
    openRoomDetailModal,
    openConfirmModal
  } = useAppContext();
  const { showToast } = useToast();

  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const rooms = dashboardData?.rooms || [];
  const filtered = rooms.filter((r) => {
    const effStatus = r.effective_status || r.room_status;
    if (floorFilter !== 'ALL' && r.floor_id !== floorFilter) return false;
    if (statusFilter !== 'ALL' && effStatus !== statusFilter) return false;
    return true;
  });

  const handleEndSession = (sessionId: string, roomName: string) => {
    openConfirmModal({
      title: `ยืนยันการรับคืนกุญแจและจบ Session (${roomName})`,
      message: `เจ้าหน้าที่ได้รับกุญแจ ${roomName} คืนและต้องการจบการใช้งานรอบนี้ใช่หรือไม่?`,
      confirmLabel: 'ยืนยันจบการใช้งาน',
      variant: 'danger',
      onConfirm: () => {
        apiService
          .endRoomSession(sessionId, 'NORMAL_CHECKOUT')
          .then(async (res) => {
            showToast(
              `จบการใช้งาน ${roomName} และบันทึกเวลาใช้งานรายบุคคลเรียบร้อยแล้ว`,
              'success'
            );
            if (res.nextWaitingGroup) {
              showToast(
                `มีคิวรอถัดไป (${res.nextWaitingGroup.queue_number}) พร้อมเรียกเข้าใช้งานห้อง!`,
                'warning'
              );
            }
            await refreshDashboard(false);
          })
          .catch((err) => {
            showToast(
              err instanceof Error ? err.message : 'ไม่สามารถจบ Session ได้',
              'error'
            );
          });
      }
    });
  };

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[17px] font-bold text-ink">
            จัดการห้องค้นคว้า (ทั้งหมด 10 ห้อง)
          </h2>
          <p className="text-[13.5px] text-ink-secondary">
            ตรวจสอบสถานะรายห้อง เริ่ม/จบการใช้งาน เช็คเอาต์รายบุคคล หรือตั้งค่าสถานะปิดปรับปรุง (MAINTENANCE)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void refreshDashboard(true)}
            className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm font-semibold text-ink hover:bg-subtle inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>รีเฟรช</span>
          </button>
          <button
            type="button"
            onClick={() => openStartSessionModal()}
            className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>เริ่มใช้งานห้อง (สแกน 3 คน)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select
          value={floorFilter}
          onChange={(e) => setFloorFilter(e.target.value)}
          className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
        >
          <option value="ALL">ทุกชั้น (ชั้น 3 และ ชั้น 5)</option>
          <option value="FL3">เฉพาะชั้น 3 - ห้องประชุมเล็ก (6 ห้อง)</option>
          <option value="FL5">เฉพาะชั้น 5 - ห้องประชุม (4 ห้อง)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
        >
          <option value="ALL">ทุกสถานะห้อง</option>
          <option value="AVAILABLE">AVAILABLE (ห้องว่าง)</option>
          <option value="OCCUPIED">OCCUPIED (กำลังใช้งาน)</option>
          <option value="WARNING">WARNING (เกินเวลาและมีผู้รอ)</option>
          <option value="DEVICE_OFFLINE">
            DEVICE_OFFLINE (อุปกรณ์ขาดการเชื่อมต่อ)
          </option>
          <option value="MAINTENANCE">MAINTENANCE (ปิดปรับปรุง)</option>
        </select>
      </div>

      {/* Content */}
      {isDashboardLoading && !dashboardData && (
        <TableRowsSkeleton cols={7} rows={8} />
      )}

      {!isDashboardLoading && dashboardError && !dashboardData && (
        <ErrorState
          message={dashboardError}
          onRetry={() => void refreshDashboard(true)}
        />
      )}

      {dashboardData && filtered.length === 0 && (
        <EmptyState
          title="ไม่พบห้องที่ตรงกับตัวกรอง"
          description="ลองเปลี่ยนเงื่อนไขการกรองชั้นหรือสถานะห้อง"
        />
      )}

      {dashboardData && filtered.length > 0 && (
        <div className="w-full overflow-x-auto border border-line rounded-xl">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-subtle text-ink-secondary text-[13px] font-semibold border-b border-line">
                <th className="px-4 py-3 whitespace-nowrap">ห้อง</th>
                <th className="px-4 py-3 whitespace-nowrap">ชั้น / ประเภท</th>
                <th className="px-4 py-3 whitespace-nowrap">สถานะปัจจุบัน</th>
                <th className="px-4 py-3 whitespace-nowrap">ผู้ใช้งาน</th>
                <th className="px-4 py-3 whitespace-nowrap">เวลาเริ่ม</th>
                <th className="px-4 py-3 whitespace-nowrap">เวลาที่ใช้ไป</th>
                <th className="px-4 py-3 whitespace-nowrap">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const effStatus = r.effective_status || r.room_status;
                const isOccupied = Boolean(r.current_session_id);
                return (
                  <tr
                    key={r.room_id}
                    className="border-b border-line last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3.5 font-bold text-ink">
                      {r.room_name}
                    </td>
                    <td className="px-4 py-3.5 text-ink">
                      {r.floor_id === 'FL3'
                        ? 'ชั้น 3 (ห้องประชุมเล็ก)'
                        : 'ชั้น 5 (ห้องประชุม)'}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={effStatus} showFullLabel />
                    </td>
                    <td className="px-4 py-3.5">
                      {isOccupied ? `${Number(r.active_member_count) || 0} คน` : '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      {isOccupied ? formatTimeThai(r.session_start_time) : '-'}
                    </td>
                    <td className="px-4 py-3.5 font-medium">
                      {isOccupied
                        ? formatDurationHoursMinutes(r.elapsed_seconds)
                        : '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => openRoomDetailModal(r.room_id)}
                          className="h-8 px-3 rounded-lg border border-line-strong bg-surface text-xs font-semibold text-ink hover:bg-subtle"
                        >
                          รายละเอียด
                        </button>
                        {r.room_status === 'AVAILABLE' && (
                          <button
                            type="button"
                            onClick={() => openStartSessionModal(r.room_id)}
                            className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover inline-flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>เริ่มใช้งาน</span>
                          </button>
                        )}
                        {isOccupied && (
                          <button
                            type="button"
                            onClick={() =>
                              handleEndSession(r.current_session_id, r.room_name)
                            }
                            className="h-8 px-3 rounded-lg bg-danger text-white text-xs font-semibold hover:bg-red-700 inline-flex items-center gap-1"
                          >
                            <Square className="w-3 h-3 fill-current" />
                            <span>จบ Session</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
