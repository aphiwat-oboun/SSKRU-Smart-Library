/**
 * ============================================================================
 * SRC/COMPONENTS/MODALS/ROOMDETAILMODAL.TSX — Instant Room Detail & Key Return
 * Hydrates immediately from Dashboard Snapshot (0ms render, zero full-modal lag)
 * and fetches member rows in background only when an active session exists.
 * ============================================================================
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Play, Square, Wrench, X } from 'lucide-react';
import { useAppContext } from '../../hooks/useAppContext';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/apiClient';
import { RoomDetailResponse } from '../../types/api';
import { RoomStatus } from '../../types/database';
import {
  formatDurationHoursMinutes,
  formatTimeThai
} from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

const roomDetailCache = new Map<string, RoomDetailResponse>();

export const RoomDetailModal: React.FC = () => {
  const {
    activeRoomDetailId,
    closeRoomDetailModal,
    dashboardData,
    openStartSessionModal,
    openConfirmModal,
    refreshDashboard
  } = useAppContext();
  const { showToast } = useToast();

  const [detail, setDetail] = useState<RoomDetailResponse | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(false);

  const snapshotRoom = useMemo(
    () =>
      (dashboardData?.rooms || []).find((r) => r.room_id === activeRoomDetailId) ||
      null,
    [dashboardData, activeRoomDetailId]
  );

  const loadRoomDetail = useCallback(async (roomId: string) => {
    setIsLoadingMembers(true);
    try {
      const res = await apiService.getRoomDetail(roomId);
      roomDetailCache.set(roomId, res);
      setDetail(res);
    } catch {
      // Snapshot data is already visible; fail silently for background member sync
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (!activeRoomDetailId) {
      setDetail(null);
      setIsLoadingMembers(false);
      return;
    }

    const cached = roomDetailCache.get(activeRoomDetailId) || null;
    setDetail(cached);

    // Only call backend getRoomDetail if the room has an active session (needs student list)
    // or if we don't have snapshot data yet. Available/Maintenance rooms render in 0ms!
    if (!snapshotRoom || snapshotRoom.current_session_id) {
      void loadRoomDetail(activeRoomDetailId);
    } else {
      setIsLoadingMembers(false);
    }
  }, [activeRoomDetailId, snapshotRoom, loadRoomDetail]);

  if (!activeRoomDetailId) return null;

  // Merge instant snapshot data with detailed backend response
  const room = detail?.room || snapshotRoom;
  const sessionId =
    detail?.activeSession?.session_id || snapshotRoom?.current_session_id || '';
  const hasActiveSession = Boolean(sessionId);
  const members = detail?.members || [];
  const deviceStatus = detail?.device?.device_status || snapshotRoom?.device_status || 'ONLINE';
  const deviceId = detail?.device?.device_id || snapshotRoom?.device_id || '-';
  const presencePresent =
    detail?.device?.last_presence_value ?? snapshotRoom?.presence_state === 'PRESENT';

  const handleIndividualCheckout = (
    targetSessionId: string,
    memberId: string,
    studentLabel: string,
    roomId: string
  ) => {
    openConfirmModal({
      title: 'ยืนยันการเช็คเอาต์รายบุคคล',
      message: `ต้องการบันทึกเวลาออกจากห้องของ "${studentLabel}" ก่อนสมาชิกคนอื่นใช่หรือไม่?`,
      confirmLabel: 'ยืนยันเช็คเอาต์',
      variant: 'primary',
      onConfirm: () => {
        apiService
          .checkoutSessionMember(targetSessionId, memberId, 'EARLY_LEAVE')
          .then(async () => {
            showToast(`บันทึกเวลาออกของ ${studentLabel} เรียบร้อยแล้ว`, 'success');
            await loadRoomDetail(roomId);
            await refreshDashboard(false);
          })
          .catch((err) => {
            showToast(
              err instanceof Error ? err.message : 'เช็คเอาต์ไม่สำเร็จ',
              'error'
            );
          });
      }
    });
  };

  const handleEndSession = (targetSessionId: string, roomName: string) => {
    openConfirmModal({
      title: `ยืนยันรับกุญแจคืน (${roomName})`,
      message: `ได้รับกุญแจ ${roomName} คืนและต้องการจบการใช้งานรอบนี้ใช่หรือไม่?`,
      confirmLabel: 'รับกุญแจคืนแล้ว',
      variant: 'success',
      onConfirm: () => {
        apiService
          .endRoomSession(targetSessionId, 'NORMAL_CHECKOUT')
          .then(async (res) => {
            roomDetailCache.delete(activeRoomDetailId);
            closeRoomDetailModal();
            showToast(`รับคืนกุญแจ ${roomName} เรียบร้อยแล้ว`, 'success');
            if (res.nextWaitingGroup) {
              showToast(
                `มีคิวรอถัดไป (${res.nextWaitingGroup.queue_number}) พร้อมเรียกเข้าใช้งาน!`,
                'warning'
              );
            }
            await refreshDashboard(false);
          })
          .catch((err) => {
            showToast(
              err instanceof Error ? err.message : 'ไม่สามารถจบการใช้งานได้',
              'error'
            );
          });
      }
    });
  };

  const handleToggleMaintenance = (roomId: string, targetStatus: RoomStatus) => {
    const isMaint = targetStatus === 'MAINTENANCE';
    openConfirmModal({
      title: isMaint ? 'ปิดปรับปรุงห้องชั่วคราว' : 'เปิดให้บริการห้องตามปกติ',
      message: isMaint
        ? 'ต้องการเปลี่ยนสถานะห้องเป็น ปิดปรับปรุง ใช่หรือไม่?'
        : 'ต้องการเปิดให้บริการห้องนี้กลับเป็น ว่าง ใช่หรือไม่?',
      confirmLabel: 'ยืนยัน',
      variant: isMaint ? 'warning' : 'success',
      onConfirm: () => {
        apiService
          .setRoomStatus(roomId, targetStatus)
          .then(async () => {
            roomDetailCache.delete(roomId);
            closeRoomDetailModal();
            showToast('อัปเดตสถานะห้องเรียบร้อยแล้ว', 'success');
            await refreshDashboard(false);
          })
          .catch((err) => {
            showToast(
              err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนสถานะห้องได้',
              'error'
            );
          });
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="roomDetailModalTitle"
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[200]"
    >
      <div className="bg-appbg rounded-[28px] w-full max-w-[760px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Forest Green Header */}
        <div className="bg-sidebar-bg text-white px-6 py-5 rounded-b-[22px] flex items-center justify-between gap-4">
          <div>
            <div className="text-[13px] text-[#A8CDB8]">
              {room
                ? room.floor_id === 'FL5'
                  ? 'ชั้น 5 · ห้องประชุม'
                  : 'ชั้น 3 · ห้องประชุมเล็ก'
                : 'รายละเอียดห้อง'}
            </div>
            <h3 id="roomDetailModalTitle" className="text-[24px] font-bold leading-tight">
              {room ? room.room_name : 'รายละเอียดห้องประชุม'}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeRoomDetailModal}
            className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Renders Instantly in 0ms) */}
        <div className="p-6 overflow-y-auto space-y-5">
          {room && hasActiveSession ? (
            <div className="bg-surface border border-line rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[18px] font-bold text-ink">
                  ข้อมูลการยืมกุญแจปัจจุบัน
                </span>
                <StatusBadge
                  status={room.effective_status || room.room_status}
                  showFullLabel
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[15px] text-ink-secondary bg-subtle p-4 rounded-xl">
                <div>
                  <div className="text-xs">รับกุญแจเมื่อ</div>
                  <div className="font-bold text-ink mt-0.5">
                    {formatTimeThai(
                      detail?.activeSession?.start_time ||
                        snapshotRoom?.session_start_time ||
                        ''
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs">ครบกำหนดเวลา</div>
                  <div className="font-bold text-ink mt-0.5">
                    {formatTimeThai(
                      detail?.activeSession?.expected_end_time ||
                        snapshotRoom?.expected_end_time ||
                        ''
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs">ระยะเวลาที่ใช้ไป</div>
                  <div className="font-bold text-ink mt-0.5">
                    {formatDurationHoursMinutes(room.elapsed_seconds)}
                  </div>
                </div>
              </div>

              {/* Student Borrowers List */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-[16px] font-bold text-ink">
                    รายชื่อนักศึกษาที่ยืมกุญแจ ({members.length || snapshotRoom?.active_member_count || 0} คน)
                  </h4>
                  {isLoadingMembers && (
                    <span className="text-xs font-semibold text-primary">
                      กำลังอัปเดตรายชื่อ...
                    </span>
                  )}
                </div>

                {members.length === 0 && isLoadingMembers ? (
                  <div className="p-4 rounded-xl bg-subtle text-[15px] text-ink-secondary text-center">
                    กำลังดึงรายชื่อนักศึกษาจากฐานข้อมูล...
                  </div>
                ) : members.length === 0 ? (
                  <div className="p-4 rounded-xl bg-subtle text-[15px] text-ink-secondary text-center">
                    ไม่พบรายชื่อสมาชิกในรอบนี้
                  </div>
                ) : (
                  <div className="divide-y divide-line border border-line rounded-xl overflow-hidden">
                    {members.map((m) => {
                      const isCheckedOut = Boolean(m.check_out_at);
                      return (
                        <div
                          key={m.member_id}
                          className="p-3.5 bg-surface flex flex-wrap items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-[16px] font-bold text-ink">
                              {m.student_name || m.student_id}
                            </div>
                            <div className="text-[14px] text-ink-secondary">
                              รหัส {m.student_id} · เข้า {formatTimeThai(m.check_in_at)}
                            </div>
                          </div>

                          {!isCheckedOut ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleIndividualCheckout(
                                  sessionId,
                                  m.member_id,
                                  m.student_name || m.student_id,
                                  room.room_id
                                )
                              }
                              className="h-9 px-3.5 rounded-lg border border-line-strong bg-surface text-[13px] font-semibold text-ink hover:bg-subtle"
                            >
                              เช็คเอาต์ออกก่อน
                            </button>
                          ) : (
                            <span className="text-[13px] font-semibold text-ink-secondary">
                              ออกแล้ว ({formatTimeThai(m.check_out_at)})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : room ? (
            <div className="bg-surface border border-line rounded-2xl p-6 text-center space-y-2 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary inline-flex items-center justify-center mb-1">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="text-[20px] font-bold text-ink">
                {room.room_status === 'MAINTENANCE'
                  ? 'ห้องนี้อยู่ระหว่างปิดปรับปรุง'
                  : 'กุญแจอยู่ในตู้ · ห้องว่างพร้อมให้บริการ'}
              </div>
              <p className="text-[15px] text-ink-secondary">
                {room.room_status === 'MAINTENANCE'
                  ? 'กดปุ่มด้านล่างเพื่อเปิดให้บริการห้องตามปกติ'
                  : 'กดปุ่ม "ให้กุญแจ" ด้านล่างเพื่อสแกนบัตรนักศึกษาและเริ่มจับเวลาได้ทันที'}
              </p>
            </div>
          ) : null}

          {/* Compact Sensor Status Bar */}
          {room && (
            <div className="bg-surface border border-line rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-[15px]">
              <div className="font-bold text-ink">
                เซนเซอร์ประจำห้อง ({deviceId})
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-primary">
                  ● {deviceStatus}
                </span>
                <span className="text-ink-secondary">
                  {presencePresent ? 'พบคนในห้อง' : 'ไม่พบการเคลื่อนไหว'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-line bg-surface flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeRoomDetailModal}
            className="h-12 px-5 rounded-xl border border-line-strong bg-surface text-[15px] font-bold text-ink hover:bg-subtle"
          >
            ปิดหน้าต่าง
          </button>

          {room && hasActiveSession && (
            <button
              type="button"
              onClick={() => handleEndSession(sessionId, room.room_name)}
              className="h-12 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white text-[16px] font-bold inline-flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>รับกุญแจคืนแล้ว</span>
            </button>
          )}

          {room && !hasActiveSession && room.room_status === 'AVAILABLE' && (
            <>
              <button
                type="button"
                onClick={() => handleToggleMaintenance(room.room_id, 'MAINTENANCE')}
                className="h-12 px-5 rounded-xl border border-line-strong bg-surface text-[15px] font-bold text-ink hover:bg-subtle inline-flex items-center gap-2"
              >
                <Wrench className="w-4 h-4" />
                <span>ปิดปรับปรุง</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = room.room_id;
                  closeRoomDetailModal();
                  openStartSessionModal(targetId);
                }}
                className="h-12 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white text-[16px] font-bold inline-flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>ให้กุญแจห้องนี้</span>
              </button>
            </>
          )}

          {room && !hasActiveSession && room.room_status === 'MAINTENANCE' && (
            <button
              type="button"
              onClick={() => handleToggleMaintenance(room.room_id, 'AVAILABLE')}
              className="h-12 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white text-[16px] font-bold"
            >
              ✓ เปิดให้บริการห้องตามปกติ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
