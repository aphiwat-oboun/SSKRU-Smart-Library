/**
 * ============================================================================
 * SRC/PAGES/WAITINGGROUPSPAGE.TSX — View 4: Waiting Groups Queue Management
 * ============================================================================
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Play, Plus, RefreshCw } from 'lucide-react';
import { EmptyState, ErrorState } from '../components/common/StateBoxes';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableRowsSkeleton } from '../components/skeleton/Skeletons';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from '../hooks/useToast';
import { apiService, getCachedRpc } from '../services/apiClient';
import { WaitingGroupRecord, WaitingRoomType } from '../types/database';
import { formatDateTimeThai, formatTimeThai } from '../utils/formatters';

const ROOM_TYPE_LABELS: Record<WaitingRoomType, string> = {
  ANY: 'ห้องใดก็ได้ (ชั้น 3 หรือ ชั้น 5)',
  SMALL_MEETING: 'ชั้น 3 - ห้องประชุมเล็ก',
  MEETING: 'ชั้น 5 - ห้องประชุม'
};

export const WaitingGroupsPage: React.FC = () => {
  const {
    openWaitingModal,
    openStartSessionModal,
    openConfirmModal,
    refreshDashboard,
    waitingDataVersion
  } = useAppContext();
  const { showToast } = useToast();

  const cachedWaiting = getCachedRpc<{ waitingGroups: WaitingGroupRecord[] }>('getWaitingGroups');
  const [waitingList, setWaitingList] = useState<WaitingGroupRecord[]>(
    cachedWaiting?.waitingGroups || []
  );
  const [isLoading, setIsLoading] = useState<boolean>(!cachedWaiting);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('WAITING');

  const loadWaitingGroups = useCallback(async () => {
    if (!getCachedRpc('getWaitingGroups')) {
      setIsLoading(true);
    }
    setErrorMsg(null);
    try {
      const res = await apiService.getWaitingGroups();
      setWaitingList(res.waitingGroups || []);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลคิวรอได้'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWaitingGroups();
  }, [loadWaitingGroups, waitingDataVersion]);

  const filtered = waitingList.filter((w) =>
    statusFilter === 'ALL' ? true : w.waiting_status === statusFilter
  );

  const handleCancelQueue = (waitingId: string, queueNumber: string) => {
    openConfirmModal({
      title: `ยืนยันการยกเลิกคิว ${queueNumber}`,
      message: `คุณต้องการยกเลิกคิวรอหมายเลข ${queueNumber} ใช่หรือไม่?`,
      confirmLabel: 'ยืนยันยกเลิกคิว',
      variant: 'danger',
      onConfirm: () => {
        apiService
          .updateWaitingGroupStatus({
            waiting_id: waitingId,
            status: 'CANCELLED'
          })
          .then(async () => {
            showToast(`ยกเลิกคิว ${queueNumber} เรียบร้อยแล้ว`, 'success');
            await loadWaitingGroups();
            await refreshDashboard(false);
          })
          .catch((err) => {
            showToast(
              err instanceof Error ? err.message : 'ไม่สามารถยกเลิกคิวได้',
              'error'
            );
          });
      }
    });
  };

  return (
    <div className="bg-surface border border-line rounded-[24px] p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-stretch gap-3.5">
          <span className="w-1.5 rounded-full bg-primary shrink-0" />
          <div>
            <h1 className="text-[26px] font-bold text-ink leading-tight">
              คิวกลุ่มนักศึกษารอใช้ห้อง
            </h1>
            <p className="text-[15px] text-ink-secondary mt-1">
              จัดการคิวกลุ่มนักศึกษาที่รอเข้าใช้ห้องประชุมเมื่อห้องเต็ม
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadWaitingGroups()}
            className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm font-semibold text-ink hover:bg-subtle inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>รีเฟรช</span>
          </button>
          <button
            type="button"
            onClick={openWaitingModal}
            className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มกลุ่มนักศึกษารอคิว</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
        >
          <option value="WAITING">กำลังรอคิว (WAITING)</option>
          <option value="SERVED">ได้รับห้องแล้ว (SERVED)</option>
          <option value="CANCELLED">ยกเลิกคิว (CANCELLED)</option>
          <option value="ALL">แสดงทุกสถานะ</option>
        </select>
      </div>

      {isLoading && <TableRowsSkeleton cols={7} rows={4} />}

      {!isLoading && errorMsg && (
        <ErrorState
          message={errorMsg}
          onRetry={() => void loadWaitingGroups()}
        />
      )}

      {!isLoading && !errorMsg && filtered.length === 0 && (
        <EmptyState
          title="ไม่มีรายการคิวรอในสถานะที่เลือก"
          description="เจ้าหน้าที่สามารถกดปุ่ม '+ เพิ่มกลุ่มนักศึกษารอคิว' เมื่อห้องเต็ม"
        />
      )}

      {!isLoading && !errorMsg && filtered.length > 0 && (
        <div className="w-full overflow-x-auto border border-line rounded-xl">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-subtle text-ink-secondary text-[13px] font-semibold border-b border-line">
                <th className="px-4 py-3 whitespace-nowrap">หมายเลขคิว</th>
                <th className="px-4 py-3 whitespace-nowrap">
                  รหัสกลุ่ม / นักศึกษาตัวแทน
                </th>
                <th className="px-4 py-3">ประเภทห้องที่ต้องการ</th>
                <th className="px-4 py-3 whitespace-nowrap">เวลาเข้าคิว</th>
                <th className="px-4 py-3 whitespace-nowrap">สถานะคิว</th>
                <th className="px-4 py-3 whitespace-nowrap">
                  เวลารับห้อง/ยกเลิก
                </th>
                <th className="px-4 py-3 whitespace-nowrap">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w, idx) => (
                <tr
                  key={w.waiting_id}
                  className="border-b border-line last:border-b-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3.5 font-bold text-ink">
                    {w.queue_number || '-'}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-ink">
                    {w.student_group_id}
                  </td>
                  <td className="px-4 py-3.5 text-ink">
                    {ROOM_TYPE_LABELS[w.room_type] || w.room_type}
                  </td>
                  <td className="px-4 py-3.5 text-ink">
                    {formatDateTimeThai(w.created_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    {w.waiting_status === 'WAITING' ? (
                      <StatusBadge
                        status="WARNING"
                        customLabel={`กำลังรอคิว (ลำดับที่ ${idx + 1})`}
                      />
                    ) : w.waiting_status === 'SERVED' ? (
                      <StatusBadge
                        status="OCCUPIED"
                        customLabel="ได้รับห้องแล้ว"
                      />
                    ) : (
                      <StatusBadge
                        status="AVAILABLE"
                        customLabel="ยกเลิกคิว"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-ink">
                    {w.served_at ? formatTimeThai(w.served_at) : '-'}
                  </td>
                  <td className="px-4 py-3.5">
                    {w.waiting_status === 'WAITING' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            openStartSessionModal('', {
                              waiting_id: w.waiting_id,
                              queue_number: w.queue_number,
                              student_group_id: w.student_group_id
                            })
                          }
                          className="h-8 px-3 rounded-lg bg-success text-white text-xs font-semibold hover:bg-green-700 inline-flex items-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>เรียกเข้าห้อง</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCancelQueue(w.waiting_id, w.queue_number)
                          }
                          className="h-8 px-3 rounded-lg bg-danger text-white text-xs font-semibold hover:bg-red-700"
                        >
                          ยกเลิกคิว
                        </button>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
