/**
 * ============================================================================
 * SRC/PAGES/ROOMMANAGEMENTPAGE.TSX — Unified Room Management (Matches Dashboard)
 * Uses the exact same illustrated RoomCard design + optional table view toggle,
 * clean pill filters, and 0ms optimistic key return.
 * ============================================================================
 */

import React, { useMemo, useState } from 'react';
import { Building2, KeyRound, LayoutGrid, List, Plus, RefreshCw, X } from 'lucide-react';
import { EmptyState, ErrorState } from '../components/common/StateBoxes';
import { StatusBadge } from '../components/common/StatusBadge';
import { RoomCard } from '../components/dashboard/RoomCard';
import { RoomCardsSkeleton } from '../components/skeleton/Skeletons';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from '../hooks/useToast';
import { apiService } from '../services/apiClient';
import { RoomSnapshot } from '../types/database';
import {
  formatDurationHoursMinutes,
  formatTimeThai
} from '../utils/formatters';

export const RoomManagementPage: React.FC = () => {
  const {
    dashboardData,
    isDashboardLoading,
    isRefreshingDashboard,
    dashboardError,
    audio,
    refreshDashboard,
    optimisticUpdateRoom,
    openStartSessionModal,
    openRoomDetailModal,
    openConfirmModal
  } = useAppContext();
  const { showToast } = useToast();

  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Create Room Modal state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>('');
  const [newFloorId, setNewFloorId] = useState<'FL3' | 'FL5'>('FL3');
  const [newCapacity, setNewCapacity] = useState<number>(6);
  const [newDescription, setNewDescription] = useState<string>('ห้องประชุมเล็ก');
  const [newDeviceId, setNewDeviceId] = useState<string>('');
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);

  const rooms = dashboardData?.rooms || [];
  const waitingCount = dashboardData?.summary?.waitingGroupsCount || 0;

  const openCreateModal = () => {
    const nextNum = rooms.length + 1;
    setNewRoomName(`ห้อง ${nextNum}`);
    setNewFloorId('FL3');
    setNewCapacity(6);
    setNewDescription('ห้องประชุมเล็ก');
    setNewDeviceId(`DEV_ROOM_${String(nextNum).padStart(2, '0')}`);
    setIsCreateOpen(true);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newRoomName.trim();
    if (!trimmedName) {
      showToast('กรุณากรอกชื่อห้อง', 'warning');
      return;
    }
    setIsCreatingRoom(true);
    try {
      await apiService.createRoom({
        room_name: trimmedName,
        floor_id: newFloorId,
        description: newDescription.trim() || (newFloorId === 'FL5' ? 'ห้องประชุมใหญ่' : 'ห้องประชุมเล็ก'),
        capacity: Math.max(1, Number(newCapacity) || 6),
        device_id: newDeviceId.trim() || undefined
      });
      setIsCreateOpen(false);
      showToast(`เพิ่ม ${trimmedName} เรียบร้อยแล้ว`, 'success');
      await refreshDashboard(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'ไม่สามารถเพิ่มห้องใหม่ได้ (กรุณาอัปเดต Apps Script เวอร์ชันล่าสุด)',
        'error'
      );
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const filtered = useMemo(
    () =>
      rooms.filter((r) => {
        const effStatus = r.effective_status || r.room_status;
        if (floorFilter !== 'ALL' && r.floor_id !== floorFilter) return false;
        if (statusFilter !== 'ALL' && effStatus !== statusFilter) return false;
        return true;
      }),
    [rooms, floorFilter, statusFilter]
  );

  const handleAlertRoom = (room: RoomSnapshot) => {
    audio.unlockAudio();
    audio.playAlertChime();
    showToast(`ส่งสัญญาณแจ้งเตือนไปยัง ${room.room_name} เรียบร้อยแล้ว`, 'warning');
  };

  const handleReturnKey = (room: RoomSnapshot) => {
    if (!room.current_session_id) {
      openRoomDetailModal(room.room_id);
      return;
    }
    openConfirmModal({
      title: `ยืนยันรับกุญแจคืน (${room.room_name})`,
      message: `ได้รับกุญแจ${room.room_name} คืนเรียบร้อยแล้ว และต้องการจบการใช้งานใช่หรือไม่?`,
      confirmLabel: 'รับกุญแจคืนแล้ว',
      variant: 'success',
      onConfirm: () => {
        const rollback = optimisticUpdateRoom(
          room.room_id,
          (r) => ({
            ...r,
            room_status: 'AVAILABLE',
            effective_status: 'AVAILABLE',
            current_session_id: '',
            session_start_time: '',
            expected_end_time: '',
            elapsed_seconds: 0,
            active_member_count: 0,
            has_entered: false,
            presence_state: 'EMPTY'
          }),
          { roomName: room.room_name, type: 'SESSION_END' }
        );
        showToast(`รับคืนกุญแจ ${room.room_name} เรียบร้อยแล้ว`, 'success');

        apiService
          .endRoomSession(room.current_session_id, 'NORMAL_CHECKOUT')
          .then(() => {
            void refreshDashboard(false);
          })
          .catch((err) => {
            rollback();
            showToast(
              err instanceof Error ? err.message : 'ไม่สามารถบันทึกการคืนกุญแจได้',
              'error'
            );
          });
      }
    });
  };

  return (
    <>
    <div className="space-y-6">
      {/* Header matching Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-stretch gap-3.5">
          <span className="w-1.5 rounded-full bg-primary shrink-0" />
          <div>
            <h1 className="text-[28px] font-bold text-ink leading-tight">
              จัดการห้องประชุมทั้งหมด ({rooms.length} ห้อง)
            </h1>
            <p className="text-[15px] text-ink-secondary mt-1">
              ตรวจสอบสถานะทุกห้อง ให้กุญแจ รับคืนกุญแจ หรือตั้งค่าปิดปรับปรุงได้ทันที
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void refreshDashboard(false)}
            disabled={isRefreshingDashboard}
            className="h-11 px-4 rounded-xl border border-line-strong bg-surface text-[15px] font-bold text-ink hover:bg-subtle inline-flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshingDashboard ? 'animate-spin' : ''}`}
            />
            <span>รีเฟรช</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="h-11 px-4 rounded-xl border-2 border-primary bg-primary-light/60 hover:bg-primary-light text-primary text-[15px] font-bold inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>เพิ่มห้องใหม่</span>
          </button>
          <button
            type="button"
            onClick={() => openStartSessionModal()}
            className="h-11 px-5 rounded-xl bg-primary hover:bg-primary-hover text-white text-[15px] font-bold inline-flex items-center gap-2 shadow-sm"
          >
            <KeyRound className="w-4 h-4" />
            <span>รับห้องให้กลุ่มใหม่</span>
          </button>
        </div>
      </div>

      {/* Unified Filter & View Switcher Bar */}
      <div className="bg-surface border border-line rounded-[24px] p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Floor Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: `ทุกชั้น (${rooms.length})` },
              {
                id: 'FL3',
                label: `ชั้น 3 (${rooms.filter((r) => r.floor_id === 'FL3').length})`
              },
              {
                id: 'FL5',
                label: `ชั้น 5 (${rooms.filter((r) => r.floor_id === 'FL5').length})`
              }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFloorFilter(tab.id)}
                className={`h-10 px-4 rounded-full text-[14.5px] font-bold transition-colors ${
                  floorFilter === tab.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-subtle border border-line text-ink-secondary hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3.5 rounded-xl border border-line-strong bg-surface text-[14.5px] font-semibold text-ink focus:outline-none focus:border-primary"
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value="AVAILABLE">พร้อมใช้งาน</option>
              <option value="OCCUPIED">กำลังใช้งาน</option>
              <option value="WARNING">หมดเวลา / เตือน</option>
              <option value="MAINTENANCE">ปิดปรับปรุง</option>
            </select>

            <div className="inline-flex rounded-xl border border-line bg-subtle p-1 gap-1">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-[13.5px] font-bold inline-flex items-center gap-1.5 transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-primary text-white'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>การ์ด</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-[13.5px] font-bold inline-flex items-center gap-1.5 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary text-white'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                <List className="w-4 h-4" />
                <span>ตาราง</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {isDashboardLoading && !dashboardData && <RoomCardsSkeleton count={4} />}

        {!isDashboardLoading && dashboardError && !dashboardData && (
          <ErrorState
            message={dashboardError}
            onRetry={() => void refreshDashboard(true)}
          />
        )}

        {dashboardData && filtered.length === 0 && (
          <EmptyState
            title="ไม่พบห้องที่ตรงกับเงื่อนไข"
            description="ลองเปลี่ยนตัวกรองชั้นหรือสถานะห้องด้านบน"
          />
        )}

        {/* Card View (Identical to Dashboard!) */}
        {dashboardData && filtered.length > 0 && viewMode === 'cards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((room) => (
              <RoomCard
                key={room.room_id}
                room={room}
                waitingCount={waitingCount}
                onOpenDetail={openRoomDetailModal}
                onIssueKey={(roomId) => openStartSessionModal(roomId)}
                onAlertRoom={handleAlertRoom}
                onReturnKey={handleReturnKey}
              />
            ))}
          </div>
        )}

        {/* Clean Large-Font Table View */}
        {dashboardData && filtered.length > 0 && viewMode === 'table' && (
          <div className="w-full overflow-x-auto border border-line rounded-xl">
            <table className="w-full border-collapse text-left text-[15px]">
              <thead>
                <tr className="bg-subtle text-ink-secondary text-[14px] font-bold border-b border-line">
                  <th className="px-4 py-3.5">ห้อง</th>
                  <th className="px-4 py-3.5">ชั้น / ประเภท</th>
                  <th className="px-4 py-3.5">สถานะ</th>
                  <th className="px-4 py-3.5">ผู้ใช้งาน</th>
                  <th className="px-4 py-3.5">เวลาเริ่ม / ระยะเวลา</th>
                  <th className="px-4 py-3.5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((room) => {
                  const eff = room.effective_status || room.room_status;
                  const isOcc =
                    Boolean(room.current_session_id) &&
                    (room.room_status === 'OCCUPIED' || room.room_status === 'WARNING');
                  return (
                    <tr
                      key={room.room_id}
                      className="border-b border-line last:border-b-0 hover:bg-subtle/60"
                    >
                      <td className="px-4 py-4 font-bold text-ink">
                        {room.room_name}
                      </td>
                      <td className="px-4 py-4 text-ink-secondary">
                        {room.floor_id === 'FL5'
                          ? 'ชั้น 5 · ห้องประชุมใหญ่'
                          : 'ชั้น 3 · ห้องประชุมเล็ก'}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={eff} />
                      </td>
                      <td className="px-4 py-4 font-semibold text-ink">
                        {isOcc ? `${room.active_member_count || 0} คน` : '-'}
                      </td>
                      <td className="px-4 py-4 text-ink-secondary">
                        {isOcc
                          ? `${formatTimeThai(room.session_start_time)} (${formatDurationHoursMinutes(
                              room.elapsed_seconds
                            )})`
                          : '-'}
                      </td>
                      <td className="px-4 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openRoomDetailModal(room.room_id)}
                          className="h-9 px-3.5 rounded-xl border border-line-strong bg-surface text-[14px] font-bold text-ink hover:bg-subtle"
                        >
                          รายละเอียด
                        </button>
                        {isOcc ? (
                          <button
                            type="button"
                            onClick={() => handleReturnKey(room)}
                            className="h-9 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-[14px] font-bold"
                          >
                            รับกุญแจคืน
                          </button>
                        ) : (
                          room.room_status === 'AVAILABLE' && (
                            <button
                              type="button"
                              onClick={() => openStartSessionModal(room.room_id)}
                              className="h-9 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-[14px] font-bold"
                            >
                              ให้กุญแจ
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

      {/* Create New Room Modal (Rendered outside space-y-6 so backdrop blur covers 100% of screen!) */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !isCreatingRoom && setIsCreateOpen(false)}
          className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4 z-[240]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-surface rounded-[24px] w-full max-w-[480px] shadow-2xl border border-line overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#144D32] to-[#1E7548] px-6 py-5 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[19px] font-bold text-white leading-tight">
                    เพิ่มห้องประชุมใหม่
                  </h2>
                  <p className="text-[13px] text-[#C6E5D3] mt-0.5">
                    บันทึกเข้าฐานข้อมูลจริงและแสดงบนกระดานห้องทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isCreatingRoom && setIsCreateOpen(false)}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors shrink-0"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateRoom(e)} className="p-6 space-y-4">
              <div>
                <label className="block text-[14px] font-bold text-ink mb-1.5">
                  ชื่อห้อง <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="เช่น ห้อง 5 หรือ ห้องศึกษากลุ่ม 305"
                  className="w-full h-11 px-3.5 rounded-xl border border-line-strong bg-surface text-[15px] text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-1.5">
                    ชั้นที่ตั้ง
                  </label>
                  <select
                    value={newFloorId}
                    onChange={(e) => {
                      const fl = e.target.value as 'FL3' | 'FL5';
                      setNewFloorId(fl);
                      setNewCapacity(fl === 'FL5' ? 10 : 6);
                      setNewDescription(fl === 'FL5' ? 'ห้องประชุมใหญ่' : 'ห้องประชุมเล็ก');
                    }}
                    className="w-full h-11 px-3 rounded-xl border border-line-strong bg-surface text-[15px] font-semibold text-ink focus:outline-none focus:border-primary"
                  >
                    <option value="FL3">ชั้น 3 (ห้องประชุมเล็ก)</option>
                    <option value="FL5">ชั้น 5 (ห้องประชุมใหญ่)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[14px] font-bold text-ink mb-1.5">
                    ความจุ (คน)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-xl border border-line-strong bg-surface text-[15px] text-ink focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-bold text-ink mb-1.5">
                  ประเภท / รายละเอียดห้อง
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="เช่น ห้องประชุมเล็ก, ห้องศึกษากลุ่ม"
                  className="w-full h-11 px-3.5 rounded-xl border border-line-strong bg-surface text-[15px] text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[14px] font-bold text-ink mb-1.5">
                  รหัสอุปกรณ์เซนเซอร์ IoT <span className="text-ink-muted font-normal">(ไม่บังคับ)</span>
                </label>
                <input
                  type="text"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  placeholder="เช่น DEV_ROOM_05"
                  className="w-full h-11 px-3.5 rounded-xl border border-line-strong bg-surface text-[15px] text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isCreatingRoom}
                  onClick={() => setIsCreateOpen(false)}
                  className="h-11 rounded-xl border border-line-strong bg-surface text-[15px] font-semibold text-ink hover:bg-subtle"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="h-11 rounded-xl bg-primary hover:bg-primary-hover text-white text-[15px] font-bold shadow-sm disabled:opacity-60"
                >
                  {isCreatingRoom ? 'กำลังบันทึก...' : 'เพิ่มห้องใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
