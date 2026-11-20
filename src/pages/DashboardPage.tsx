/**
 * ============================================================================
 * SRC/PAGES/DASHBOARDPAGE.TSX — Clean Room Management Dashboard (PDF Page 4 & 1)
 * ============================================================================
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  DoorOpen,
  History,
  KeyRound,
  Plus,
  RefreshCw,
  RotateCcw,
  Users,
  Wrench
} from 'lucide-react';
import { EmptyState, ErrorState } from '../components/common/StateBoxes';
import { RoomCard } from '../components/dashboard/RoomCard';
import { SensorHistoryChart } from '../components/dashboard/SensorHistoryChart';
import { RoomCardsSkeleton } from '../components/skeleton/Skeletons';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from '../hooks/useToast';
import { apiService } from '../services/apiClient';
import { FloorId, RoomSnapshot } from '../types/database';
import { formatTimeThai } from '../utils/formatters';
import {
  isPastLibraryClosingTime,
  LIBRARY_CLOSING_LABEL
} from '../utils/libraryHours';

type FloorTab = FloorId | 'ALL';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    dashboardData,
    isDashboardLoading,
    isRefreshingDashboard,
    dashboardError,
    audio,
    refreshDashboard,
    acknowledgeAlert,
    optimisticUpdateRoom,
    openStartSessionModal,
    openRoomDetailModal,
    openWaitingModal,
    openConfirmModal
  } = useAppContext();

  // Default to ALL so rooms are immediately visible on first glance
  const [selectedFloor, setSelectedFloor] = useState<FloorTab>('ALL');

  const rooms = dashboardData?.rooms || [];
  const unreadNotifications = dashboardData?.unreadNotifications || [];
  const recentActivities = dashboardData?.recentActivities || [];
  const waitingCount = dashboardData?.summary?.waitingGroupsCount || 0;

  const filteredRooms = useMemo(
    () =>
      rooms.filter((r) =>
        selectedFloor === 'ALL' ? true : r.floor_id === selectedFloor
      ),
    [rooms, selectedFloor]
  );

  const isPastClosing = isPastLibraryClosingTime();

  // KPI summary counts for the 4 top cards
  const availableCount = rooms.filter((r) => (r.effective_status || r.room_status) === 'AVAILABLE').length;
  const occupiedCount = rooms.filter((r) => {
    const st = r.effective_status || r.room_status;
    return st === 'OCCUPIED' || st === 'WARNING';
  }).length;
  const maintenanceCount = rooms.filter((r) => {
    const st = r.effective_status || r.room_status;
    return st === 'MAINTENANCE' || st === 'DEVICE_OFFLINE';
  }).length;
  const todayUsageCount =
    dashboardData?.dailySummary?.totalSessionsToday ??
    recentActivities.filter((a) => a.activity_type === 'SESSION_START').length;

  // Rooms still occupied after 16:00 closing time or marked WARNING
  const overdueRooms = useMemo(
    () =>
      rooms.filter((r) => {
        const eff = r.effective_status || r.room_status;
        const occupied =
          Boolean(r.current_session_id) &&
          (r.room_status === 'OCCUPIED' || r.room_status === 'WARNING');
        return eff === 'WARNING' || r.room_status === 'WARNING' || (isPastClosing && occupied);
      }),
    [rooms, isPastClosing]
  );

  // Pick the top urgent room or unread notification for the "ต้องดำเนินการ" panel
  const urgentRoom = overdueRooms[0] || null;
  const topNotification = unreadNotifications[0] || null;

  const currentTimeShort = dashboardData?.serverTime
    ? formatTimeThai(dashboardData.serverTime).replace(' น.', '')
    : formatTimeThai(new Date().toISOString()).replace(' น.', '');

  const handleSendRoomAlert = (roomName: string, notificationId?: string) => {
    audio.unlockAudio();
    audio.playAlertChime();
    showToast(`ส่งสัญญาณแจ้งเตือนไปยัง ${roomName} เรียบร้อยแล้ว`, 'warning');
    if (notificationId) {
      void acknowledgeAlert(notificationId);
    }
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
        // Optimistic 0ms UI update: flip room to AVAILABLE immediately!
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

        // Sync with Google Sheets in the background
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
    <div className="space-y-6">
      {/* Desktop Top Header (Matches PDF Page 4 + Vertical Green Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-stretch gap-3.5">
          <span className="w-1.5 rounded-full bg-primary shrink-0" />
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-bold text-ink leading-tight">
              กระดานห้องประชุม
            </h1>
            <div className="flex flex-wrap items-center gap-2.5 text-[15px] text-ink-secondary mt-1">
              <span>
                วันนี้ {currentTimeShort} · ห้องสมุดปิด {LIBRARY_CLOSING_LABEL}
              </span>
              {isPastClosing && (
                <span className="px-2.5 py-0.5 rounded-full bg-warning-bg text-warning-text text-xs font-bold">
                  นอกเวลาทำการ (ปิด {LIBRARY_CLOSING_LABEL})
                </span>
              )}
              <button
                type="button"
                onClick={() => void refreshDashboard(false)}
                disabled={isRefreshingDashboard}
                className="inline-flex items-center gap-1 text-primary font-semibold hover:underline disabled:opacity-60"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshingDashboard ? 'animate-spin' : ''}`}
                />
                <span>{isRefreshingDashboard ? 'กำลังซิงค์...' : 'รีเฟรช'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Action Buttons (PDF Page 4 top-right) */}
        <div className="hidden lg:flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/waiting')}
            className="h-12 px-5 rounded-xl border-2 border-primary bg-surface text-primary text-[16px] font-bold hover:bg-primary-light transition-colors"
          >
            คิวรอ · {waitingCount}
          </button>
          <button
            type="button"
            onClick={() => openStartSessionModal()}
            className="h-12 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white text-[16px] font-bold transition-colors"
          >
            รับห้องให้กลุ่มใหม่
          </button>
        </div>
      </div>

      {/* Mobile Quick Action Row (Thumb-friendly 2-column buttons) */}
      <div className="grid grid-cols-2 gap-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => navigate('/waiting')}
          className="h-11 px-3 rounded-xl border-2 border-primary bg-surface text-primary text-[14.5px] font-bold active:bg-primary-light transition-colors"
        >
          คิวรอ · {waitingCount} กลุ่ม
        </button>
        <button
          type="button"
          onClick={() => openStartSessionModal()}
          className="h-11 px-3 rounded-xl bg-primary active:bg-primary-hover text-white text-[14.5px] font-bold transition-colors shadow-sm"
        >
          รับห้องให้กลุ่มใหม่
        </button>
      </div>

      {/* 4 Colorful Top KPI Summary Cards (2x2 Grid on Mobile, 4-col on Desktop) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. ห้องที่ว่าง */}
        <div
          onClick={() => navigate('/rooms')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/rooms')}
          className="relative overflow-hidden bg-surface border border-[#D8ECE1] rounded-[18px] sm:rounded-[20px] p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3 sm:gap-4"
        >
          <div
            aria-hidden="true"
            className="absolute -right-6 -bottom-8 w-28 sm:w-36 h-24 sm:h-28 rounded-full bg-gradient-to-tl from-[#D5F0E1]/80 via-[#EBF8F0]/50 to-transparent pointer-events-none"
          />
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#15803D] text-white flex items-center justify-center shrink-0 shadow-[0_6px_14px_rgba(21,128,61,0.28)] relative z-10">
            <DoorOpen className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div className="relative z-10 min-w-0">
            <div className="text-[12.5px] sm:text-[14px] font-bold text-ink-secondary truncate">ห้องที่ว่าง</div>
            <div className="text-[22px] sm:text-[28px] font-extrabold text-ink leading-tight mt-0.5 tabular-nums">
              {availableCount} ห้อง
            </div>
            <div className="text-[11.5px] sm:text-[12.5px] font-semibold text-[#15803D] mt-0.5 truncate">
              พร้อมให้บริการ
            </div>
          </div>
        </div>

        {/* 2. ห้องที่ใช้งานอยู่ */}
        <div
          onClick={() => navigate('/rooms')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/rooms')}
          className="relative overflow-hidden bg-surface border border-[#D7E6FD] rounded-[18px] sm:rounded-[20px] p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3 sm:gap-4"
        >
          <div
            aria-hidden="true"
            className="absolute -right-6 -bottom-8 w-28 sm:w-36 h-24 sm:h-28 rounded-full bg-gradient-to-tl from-[#D6E7FE]/85 via-[#EDF4FF]/50 to-transparent pointer-events-none"
          />
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-[0_6px_14px_rgba(37,99,235,0.28)] relative z-10">
            <Clock className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div className="relative z-10 min-w-0">
            <div className="text-[12.5px] sm:text-[14px] font-bold text-ink-secondary truncate">ใช้งานอยู่</div>
            <div className="text-[22px] sm:text-[28px] font-extrabold text-ink leading-tight mt-0.5 tabular-nums">
              {occupiedCount} ห้อง
            </div>
            <div className="text-[11.5px] sm:text-[12.5px] font-semibold text-[#2563EB] mt-0.5 truncate">
              กำลังใช้งาน
            </div>
          </div>
        </div>

        {/* 3. ห้องปิดปรับปรุง */}
        <div
          onClick={() => navigate('/rooms')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/rooms')}
          className="relative overflow-hidden bg-surface border border-[#FAD8DE] rounded-[18px] sm:rounded-[20px] p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3 sm:gap-4"
        >
          <div
            aria-hidden="true"
            className="absolute -right-6 -bottom-8 w-28 sm:w-36 h-24 sm:h-28 rounded-full bg-gradient-to-tl from-[#FCD6DC]/80 via-[#FFF0F2]/50 to-transparent pointer-events-none"
          />
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#E11D48] text-white flex items-center justify-center shrink-0 shadow-[0_6px_14px_rgba(225,29,72,0.28)] relative z-10">
            <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="relative z-10 min-w-0">
            <div className="text-[12.5px] sm:text-[14px] font-bold text-ink-secondary truncate">ปิดปรับปรุง</div>
            <div className="text-[22px] sm:text-[28px] font-extrabold text-ink leading-tight mt-0.5 tabular-nums">
              {maintenanceCount} ห้อง
            </div>
            <div className="text-[11.5px] sm:text-[12.5px] font-semibold text-[#E11D48] mt-0.5 truncate">
              ไม่พร้อมใช้งาน
            </div>
          </div>
        </div>

        {/* 4. การใช้งานวันนี้ */}
        <div
          onClick={() => navigate('/history')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/history')}
          className="relative overflow-hidden bg-surface border border-[#D8ECE1] rounded-[18px] sm:rounded-[20px] p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-2 sm:gap-3"
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 relative z-10">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#E6F4EC] text-[#14532D] border border-[#CBE7D6] flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] sm:text-[14px] font-bold text-ink-secondary truncate">ใช้งานวันนี้</div>
              <div className="text-[22px] sm:text-[28px] font-extrabold text-ink leading-tight mt-0.5 tabular-nums">
                {todayUsageCount} ครั้ง
              </div>
              <div className="text-[11.5px] sm:text-[12.5px] font-semibold text-primary mt-0.5 truncate">
                รอบใช้งานวันนี้
              </div>
            </div>
          </div>
          {/* Mini rising bar sparkline matching mockup (hidden on very narrow phones) */}
          <div aria-hidden="true" className="hidden sm:flex items-end gap-1 h-10 shrink-0 pr-1 relative z-10">
            <span className="w-1.5 h-3 rounded-t bg-[#C4E4D1]" />
            <span className="w-1.5 h-5 rounded-t bg-[#9CD4B3]" />
            <span className="w-1.5 h-7 rounded-t bg-[#65BC8B]" />
            <span className="w-1.5 h-9 rounded-t bg-[#2A8F58]" />
          </div>
        </div>
      </div>

      {/* Floor Filter Tabs (Horizontal scroll-safe on narrow phones) */}
      {rooms.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(
            [
              { id: 'ALL', label: `ทุกชั้น (${rooms.length} ห้อง)` },
              {
                id: 'FL3',
                label: `ชั้น 3 (${rooms.filter((r) => r.floor_id === 'FL3').length} ห้อง)`
              },
              {
                id: 'FL5',
                label: `ชั้น 5 (${rooms.filter((r) => r.floor_id === 'FL5').length} ห้อง)`
              }
            ] as Array<{ id: FloorTab; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFloor(tab.id)}
              className={`h-9 sm:h-10 px-4 rounded-full text-[14px] sm:text-[15px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                selectedFloor === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface border border-line text-ink-secondary hover:text-ink hover:border-primary/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Main 2-Column Layout: Room Cards (Grouped by Floor) + Right Action Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left/Main Column (8 cols): Outer White Panel with Illustrated Room Cards */}
        <div className="xl:col-span-8 bg-surface border border-line rounded-[24px] p-5 sm:p-6 shadow-sm space-y-6 h-full flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-6 rounded-full bg-primary inline-block" />
              <h2 className="text-[20px] font-bold text-ink">
                สถานะห้องประชุมทั้งหมด
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/rooms')}
              className="h-8 px-3.5 rounded-full bg-primary-light hover:bg-primary text-primary hover:text-white text-[13.5px] font-bold inline-flex items-center gap-1 transition-colors"
            >
              <span>ดูทั้งหมด</span>
              <span>→</span>
            </button>
          </div>

          {isDashboardLoading && !dashboardData && <RoomCardsSkeleton count={4} />}

          {!isDashboardLoading && dashboardError && !dashboardData && (
            <ErrorState
              message={dashboardError}
              onRetry={() => void refreshDashboard(true)}
            />
          )}

          {dashboardData && filteredRooms.length === 0 && (
            <EmptyState
              title="ยังไม่มีข้อมูลห้องในชั้นที่เลือก"
              description="ตรวจสอบการตั้งค่าฐานข้อมูลหรือเพิ่มห้องในเมนูจัดการห้อง"
            />
          )}

          {dashboardData && filteredRooms.length > 0 && selectedFloor === 'ALL' && (
            <div className="space-y-6">
              {(
                [
                  {
                    floorId: 'FL3' as FloorId,
                    title: 'ชั้น 3 · ห้องประชุมเล็ก',
                    list: filteredRooms.filter((r) => r.floor_id === 'FL3')
                  },
                  {
                    floorId: 'FL5' as FloorId,
                    title: 'ชั้น 5 · ห้องประชุมใหญ่',
                    list: filteredRooms.filter((r) => r.floor_id === 'FL5')
                  }
                ]
              )
                .filter((group) => group.list.length > 0)
                .map((group) => (
                  <section key={group.floorId} className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-[17px] font-bold text-ink">
                        {group.title}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-primary-light text-primary text-[13px] font-bold">
                        {group.list.length} ห้อง
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.list.map((room) => (
                        <RoomCard
                          key={room.room_id}
                          room={room}
                          waitingCount={waitingCount}
                          onOpenDetail={openRoomDetailModal}
                          onIssueKey={(roomId) => openStartSessionModal(roomId)}
                          onAlertRoom={(r) => handleSendRoomAlert(r.room_name)}
                          onReturnKey={handleReturnKey}
                        />
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          )}

          {dashboardData && filteredRooms.length > 0 && selectedFloor !== 'ALL' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.room_id}
                  room={room}
                  waitingCount={waitingCount}
                  onOpenDetail={openRoomDetailModal}
                  onIssueKey={(roomId) => openStartSessionModal(roomId)}
                  onAlertRoom={(r) => handleSendRoomAlert(r.room_name)}
                  onReturnKey={handleReturnKey}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Action/Notification Panel, Waiting Queue, Recent Activity */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          {/* 1. Urgent Action / Notification Card (ต้องดำเนินการ) */}
          {urgentRoom || topNotification ? (
            <div className="bg-surface border-2 border-warning-border rounded-[20px] p-6 shadow-sm space-y-4">
              <div>
                <span className="inline-block px-3.5 py-1 rounded-full bg-warning-bg text-warning-text text-[13px] font-bold mb-2.5">
                  ต้องดำเนินการ
                </span>
                <h2 className="text-[20px] font-bold text-ink leading-snug">
                  {urgentRoom
                    ? isPastClosing
                      ? `${urgentRoom.room_name} เลยเวลาปิด (${LIBRARY_CLOSING_LABEL})`
                      : `${urgentRoom.room_name} หมดเวลา`
                    : topNotification?.title}
                </h2>
                <p className="text-[15px] text-ink-secondary mt-1">
                  {urgentRoom
                    ? isPastClosing
                      ? `มี ${overdueRooms.length} ห้องที่ยังไม่คืนกุญแจหลังเวลาปิดห้องสมุด กรุณาแจ้งให้นักศึกษาออกและรับคืนกุญแจ`
                      : `มีคิวรอ ${waitingCount} กลุ่ม · แจ้งผู้ใช้งานหรือรับคืนกุญแจ`
                    : topNotification?.message}
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    handleSendRoomAlert(
                      urgentRoom?.room_name || topNotification?.room_id || 'ห้องประชุม',
                      topNotification?.notification_id
                    )
                  }
                  className="w-full h-12 rounded-xl bg-danger hover:bg-danger-hover text-white text-[16px] font-bold transition-colors"
                >
                  แจ้งในห้อง (ไฟกะพริบ + เสียงเบา)
                </button>

                {urgentRoom ? (
                  <button
                    type="button"
                    onClick={() => handleReturnKey(urgentRoom)}
                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary-hover text-white text-[16px] font-bold transition-colors"
                  >
                    รับกุญแจคืนแล้ว
                  </button>
                ) : (
                  topNotification && (
                    <button
                      type="button"
                      onClick={() =>
                        void acknowledgeAlert(topNotification.notification_id)
                      }
                      className="w-full h-12 rounded-xl bg-primary hover:bg-primary-hover text-white text-[16px] font-bold transition-colors"
                    >
                      รับทราบการแจ้งเตือน
                    </button>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-[#EEF9F3] via-surface to-surface border border-success-border rounded-[20px] p-5 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#15803D] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-ink font-bold text-[16.5px] leading-snug">
                    ไม่มีรายการต้องดำเนินการด่วน
                  </div>
                  <p className="text-[13.5px] text-ink-secondary mt-0.5">
                    ห้องประชุมและการแจ้งเตือนทั้งหมดอยู่ในสถานะปกติ
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Waiting Queue Summary Card (คิวรอ — Styled & Vibrant) */}
          <div className="bg-surface border border-line rounded-[20px] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-5 rounded-full bg-primary inline-block" />
                <h2 className="text-[18px] font-bold text-ink">คิวรอ</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[13px] font-bold ${
                    waitingCount > 0
                      ? 'bg-warning-bg text-warning-text'
                      : 'bg-primary-light text-primary'
                  }`}
                >
                  {waitingCount} กลุ่ม
                </span>
              </div>
              <button
                type="button"
                onClick={openWaitingModal}
                className="h-8 px-3 rounded-full bg-primary-light hover:bg-primary text-primary hover:text-white text-[13.5px] font-bold inline-flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>เพิ่มคิว</span>
              </button>
            </div>

            {waitingCount > 0 ? (
              <button
                type="button"
                onClick={() => navigate('/waiting')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#FFF8E6] to-[#FEF3C7]/60 border border-amber-200 hover:border-amber-300 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-ink text-[15.5px] block">
                      มี {waitingCount} กลุ่มกำลังรอห้อง
                    </span>
                    <span className="text-[13px] text-ink-secondary">
                      คลิกเพื่อดูรายการและเรียกคิว
                    </span>
                  </div>
                </div>
                <span className="text-[14px] font-bold text-amber-700 shrink-0">
                  จัดการ →
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-subtle/80 border border-dashed border-line-strong">
                <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-primary shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-[14px] text-ink-secondary leading-snug">
                  <span className="font-semibold text-ink block">ไม่มีกลุ่มรอคิวในขณะนี้</span>
                  กด &ldquo;+ เพิ่มคิว&rdquo; หากห้องเต็มและมีนักศึกษารอใช้
                </div>
              </div>
            )}
          </div>

          {/* 3. Recent Activity Card (ล่าสุด — Styled with Icon Badges & Action Pills) */}
          <div className="bg-surface border border-line rounded-[20px] p-5 shadow-sm space-y-3.5 flex-1 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-5 rounded-full bg-primary inline-block" />
                <h2 className="text-[18px] font-bold text-ink">กิจกรรมล่าสุด</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="h-8 px-3.5 rounded-full bg-primary-light hover:bg-primary text-primary hover:text-white text-[13.5px] font-bold inline-flex items-center gap-1 transition-colors"
              >
                <span>ดูทั้งหมด</span>
                <span>→</span>
              </button>
            </div>

            {recentActivities.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-subtle/80 border border-dashed border-line-strong text-ink-secondary text-[14px]">
                <History className="w-5 h-5 text-ink-muted shrink-0" />
                <span>ยังไม่มีกิจกรรมการใช้ห้องในวันนี้</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {recentActivities.slice(0, 4).map((act) => {
                  const timeShort = formatTimeThai(act.timestamp).replace(' น.', '');
                  const isStart = act.activity_type === 'SESSION_START';
                  return (
                    <li
                      key={`${act.session_id}-${act.activity_type}-${act.timestamp}`}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-subtle/60 hover:bg-primary-light/50 border border-transparent hover:border-success-border/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isStart
                              ? 'bg-[#E5F4EC] text-[#15803D]'
                              : 'bg-[#E8F1FD] text-[#1D5FD1]'
                          }`}
                        >
                          {isStart ? (
                            <KeyRound className="w-4 h-4" />
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14.5px] font-bold text-ink truncate">
                            {isStart ? `ให้กุญแจ ${act.room_name}` : `รับกุญแจคืน ${act.room_name}`}
                          </div>
                          <span
                            className={`inline-block text-[11.5px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                              isStart
                                ? 'bg-[#E5F4EC] text-[#15653B]'
                                : 'bg-[#E8F1FD] text-[#1D5FD1]'
                            }`}
                          >
                            {isStart ? 'เปิดใช้งาน' : 'คืนกุญแจแล้ว'}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-surface border border-line text-[12.5px] font-bold text-ink-secondary tabular-nums shrink-0">
                        {timeShort} น.
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Full-Width Historical Chart.js Graph (12 Columns — Balanced Layout) */}
      {dashboardData && (
        <SensorHistoryChart
          dailySummary={dashboardData.dailySummary}
          refreshTick={dashboardData.serverTime}
        />
      )}

      {/* Mobile Sticky Bottom Action Bar (Matches PDF Page 1) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur border-t border-line px-4 py-3 flex items-center gap-3 z-[75]">
        <button
          type="button"
          onClick={() => navigate('/waiting')}
          className="h-13 py-3 px-5 rounded-2xl border-2 border-primary bg-surface text-primary text-[16px] font-bold shrink-0"
        >
          คิวรอ · {waitingCount}
        </button>
        <button
          type="button"
          onClick={() => openStartSessionModal()}
          className="flex-1 h-13 py-3 px-5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-[17px] font-bold"
        >
          รับห้องให้กลุ่มใหม่
        </button>
      </div>
    </div>
  );
};
