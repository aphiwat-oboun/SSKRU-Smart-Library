/**
 * ============================================================================
 * SRC/PAGES/DASHBOARDPAGE.TSX — Clean Room Management Dashboard (PDF Page 4 & 1)
 * ============================================================================
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { EmptyState, ErrorState } from '../components/common/StateBoxes';
import { RoomCard } from '../components/dashboard/RoomCard';
import { SensorHistoryChart } from '../components/dashboard/SensorHistoryChart';
import { RoomCardsSkeleton } from '../components/skeleton/Skeletons';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from '../hooks/useToast';
import { apiService } from '../services/apiClient';
import { FloorId, RoomSnapshot } from '../types/database';
import { formatTimeThai } from '../utils/formatters';

type FloorTab = FloorId | 'ALL';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    dashboardData,
    isDashboardLoading,
    dashboardError,
    audio,
    refreshDashboard,
    acknowledgeAlert,
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

  // Pick the top urgent room or unread notification for the "ต้องดำเนินการ" panel
  const urgentRoom = useMemo(
    () =>
      rooms.find(
        (r) =>
          (r.effective_status || r.room_status) === 'WARNING' ||
          r.room_status === 'WARNING'
      ) || null,
    [rooms]
  );
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
      message: `ได้รับกุญแจห้อง ${room.room_name} คืนเรียบร้อยแล้ว และต้องการจบการใช้งานใช่หรือไม่?`,
      confirmLabel: 'รับกุญแจคืนแล้ว',
      variant: 'success',
      onConfirm: () => {
        apiService
          .endRoomSession(room.current_session_id, 'NORMAL_CHECKOUT')
          .then(async () => {
            showToast(`รับคืนกุญแจ ${room.room_name} เรียบร้อยแล้ว`, 'success');
            await refreshDashboard(false);
          })
          .catch((err) => {
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
      {/* Desktop Top Header (Matches PDF Page 4) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-ink leading-tight">
            กระดานห้องประชุม
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 text-[15px] text-ink-secondary mt-1">
            <span>วันนี้ {currentTimeShort} · ห้องสมุดปิด 20:00</span>
            <button
              type="button"
              onClick={() => void refreshDashboard(true)}
              className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className="w-4 h-4" />
              <span>รีเฟรช</span>
            </button>
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

      {/* Simple Floor Filter Pills (only shown when multiple floors exist) */}
      {rooms.length > 4 && (
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'ALL', label: `ทุกชั้น (${rooms.length})` },
              {
                id: 'FL3',
                label: `ชั้น 3 (${rooms.filter((r) => r.floor_id === 'FL3').length})`
              },
              {
                id: 'FL5',
                label: `ชั้น 5 (${rooms.filter((r) => r.floor_id === 'FL5').length})`
              }
            ] as Array<{ id: FloorTab; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFloor(tab.id)}
              className={`h-10 px-4 rounded-full text-[15px] font-semibold transition-colors ${
                selectedFloor === tab.id
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-line text-ink-secondary hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Main 2-Column Layout (Matches PDF Page 4) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left/Main Column (8 cols): Clean Room Cards Grid + Chart.js History */}
        <div className="xl:col-span-8 space-y-6">
          {isDashboardLoading && !dashboardData && <RoomCardsSkeleton count={4} />}

          {!isDashboardLoading && dashboardError && !dashboardData && (
            <ErrorState
              message={dashboardError}
              onRetry={() => void refreshDashboard(true)}
            />
          )}

          {dashboardData && filteredRooms.length === 0 && (
            <EmptyState
              title="ยังไม่มีข้อมูลห้องในระบบ"
              description="ตรวจสอบการตั้งค่าฐานข้อมูลหรือเพิ่มห้องในเมนูจัดการห้อง"
            />
          )}

          {dashboardData && filteredRooms.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.room_id}
                  room={room}
                  waitingCount={waitingCount}
                  onOpenDetail={openRoomDetailModal}
                  onIssueKey={(roomId) => openStartSessionModal(roomId)}
                  onAlertRoom={(r) => handleSendRoomAlert(r.room_name)}
                />
              ))}
            </div>
          )}

          {/* Historical Chart.js Graph from Database (Worksheet 5 Task 3) */}
          {dashboardData && (
            <SensorHistoryChart
              dailySummary={dashboardData.dailySummary}
              refreshTick={dashboardData.serverTime}
            />
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
                    ? `${urgentRoom.room_name} หมดเวลา`
                    : topNotification?.title}
                </h2>
                <p className="text-[15px] text-ink-secondary mt-1">
                  {urgentRoom
                    ? `มีคิวรอ ${waitingCount} กลุ่ม · แจ้งผู้ใช้งานหรือรับคืนกุญแจ`
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
            <div className="bg-surface border border-line rounded-[20px] p-6 shadow-sm">
              <div className="flex items-center gap-3 text-primary font-bold text-[17px]">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <span>ไม่มีรายการต้องดำเนินการด่วน</span>
              </div>
              <p className="text-[14px] text-ink-secondary mt-1.5">
                ห้องประชุมและการแจ้งเตือนทั้งหมดอยู่ในสถานะปกติ
              </p>
            </div>
          )}

          {/* 2. Waiting Queue Summary Card (คิวรอ) */}
          <div className="bg-surface border border-line rounded-[20px] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-[18px] font-bold text-ink">
                คิวรอ · {waitingCount} กลุ่ม
              </h2>
              <button
                type="button"
                onClick={openWaitingModal}
                className="text-[14px] font-bold text-primary hover:underline"
              >
                + เพิ่มคิว
              </button>
            </div>

            {waitingCount > 0 ? (
              <button
                type="button"
                onClick={() => navigate('/waiting')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-subtle hover:bg-primary-light transition-colors text-left"
              >
                <div>
                  <span className="font-bold text-primary text-[16px]">
                    มี {waitingCount} กลุ่มกำลังรอ
                  </span>
                  <div className="text-[14px] text-ink-secondary">
                    แตะเพื่อดูรายการและเรียกคิว
                  </div>
                </div>
                <span className="text-[14px] font-semibold text-primary">
                  จัดการ →
                </span>
              </button>
            ) : (
              <div className="text-[15px] text-ink-secondary">
                ขณะนี้ยังไม่มีกลุ่มนักศึกษารอคิว
              </div>
            )}
          </div>

          {/* 3. Recent Activity Card (ล่าสุด — Matches PDF Page 4) */}
          <div className="bg-surface border border-line rounded-[20px] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-[18px] font-bold text-ink">ล่าสุด</h2>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="text-[14px] font-semibold text-primary hover:underline"
              >
                ดูทั้งหมด
              </button>
            </div>

            {recentActivities.length === 0 ? (
              <div className="text-[15px] text-ink-secondary">
                ยังไม่มีกิจกรรมวันนี้
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {recentActivities.slice(0, 5).map((act) => {
                  const timeShort = formatTimeThai(act.timestamp).replace(' น.', '');
                  const actionText =
                    act.activity_type === 'SESSION_START'
                      ? `ให้กุญแจ ${act.room_name}`
                      : `รับกุญแจคืน ${act.room_name}`;
                  return (
                    <li
                      key={`${act.session_id}-${act.activity_type}-${act.timestamp}`}
                      className="py-3 flex items-center gap-4 text-[15px]"
                    >
                      <span className="text-ink-secondary font-medium w-12 shrink-0">
                        {timeShort}
                      </span>
                      <span className="text-ink font-medium truncate">
                        {actionText}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

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
