/**
 * ============================================================================
 * SRC/PAGES/NOTIFICATIONSPAGE.TSX — Clean Notification Management (PDF Page 3)
 * ============================================================================
 */

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { EmptyState, ErrorState } from '../components/common/StateBoxes';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableRowsSkeleton } from '../components/skeleton/Skeletons';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from '../hooks/useToast';
import { apiService } from '../services/apiClient';
import { NotificationRecord } from '../types/database';
import { formatDateTimeThai, formatTimeThai } from '../utils/formatters';

export const NotificationsPage: React.FC = () => {
  const { audio, dashboardData, refreshDashboard, openConfirmModal } = useAppContext();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Simple local notification toggles matching PDF Page 3
  const [warnBefore10Min, setWarnBefore10Min] = useState<boolean>(true);
  const [warnOnlyWithQueue, setWarnOnlyWithQueue] = useState<boolean>(true);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiService.getNotificationsList();
      setNotifications(res.notifications || []);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'ไม่สามารถโหลดรายการแจ้งเตือนได้'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadList = notifications.filter((n) => n.notification_status === 'UNREAD');
  const waitingCount = dashboardData?.summary?.waitingGroupsCount || 0;

  const handleAlertInRoom = (n: NotificationRecord) => {
    audio.unlockAudio();
    audio.playAlertChime();
    showToast(`ส่งสัญญาณแจ้งเตือนในห้อง ${n.room_id || ''} (ไฟกะพริบ + เสียง) แล้ว`, 'warning');
  };

  const handleAcknowledgeOne = async (notificationId: string) => {
    try {
      await apiService.acknowledgeNotification(notificationId);
      showToast('รับทราบการแจ้งเตือนเรียบร้อยแล้ว', 'success');
      await loadNotifications();
      await refreshDashboard(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'ไม่สามารถรับทราบการแจ้งเตือนได้',
        'error'
      );
    }
  };

  const handleReturnKeyForNotification = (n: NotificationRecord) => {
    const matchedRoom = (dashboardData?.rooms || []).find(
      (r) => r.room_id === n.room_id && Boolean(r.current_session_id)
    );
    if (!matchedRoom || !matchedRoom.current_session_id) {
      void handleAcknowledgeOne(n.notification_id);
      return;
    }

    openConfirmModal({
      title: `ยืนยันรับกุญแจคืน (${matchedRoom.room_name})`,
      message: `ได้รับกุญแจ ${matchedRoom.room_name} คืนแล้ว และต้องการจบการใช้งานใช่หรือไม่?`,
      confirmLabel: 'รับกุญแจคืนแล้ว',
      variant: 'success',
      onConfirm: () => {
        apiService
          .endRoomSession(matchedRoom.current_session_id, 'NORMAL_CHECKOUT')
          .then(async () => {
            await apiService.acknowledgeNotification(n.notification_id).catch(() => undefined);
            showToast(`รับกุญแจคืน ${matchedRoom.room_name} เรียบร้อยแล้ว`, 'success');
            await loadNotifications();
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

  const handleToggleCounterSound = () => {
    const next = audio.toggleSound();
    showToast(next ? 'เปิดเสียงแจ้งเตือนที่เคาน์เตอร์แล้ว' : 'ปิดเสียงแจ้งเตือนที่เคาน์เตอร์แล้ว', 'info');
  };

  return (
    <div className="max-w-[920px] space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-ink leading-tight">แจ้งเตือน</h1>
          <p className="text-[15px] text-ink-secondary mt-1">
            ตรวจสอบการหมดเวลาห้องประชุม คิวรอ และจัดการการคืนกุญแจ
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadNotifications()}
          className="h-11 px-4 rounded-xl border border-line-strong bg-surface text-[15px] font-semibold text-ink hover:bg-subtle inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>รีเฟรช</span>
        </button>
      </div>

      {isLoading && <TableRowsSkeleton cols={3} rows={3} />}

      {!isLoading && errorMsg && (
        <ErrorState message={errorMsg} onRetry={() => void loadNotifications()} />
      )}

      {/* Unread Urgent Notification Cards (PDF Page 3 Style) */}
      {!isLoading && !errorMsg && (
        <div className="space-y-5">
          {unreadList.length === 0 ? (
            <div className="bg-surface border border-line rounded-[20px] p-6 shadow-sm flex items-center gap-3 text-primary font-bold text-[17px]">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <span>ขณะนี้ไม่มีการแจ้งเตือนค้างในระบบ</span>
            </div>
          ) : (
            unreadList.map((n) => (
              <div
                key={n.notification_id}
                className="bg-surface border-2 border-warning-border rounded-[22px] p-6 shadow-sm space-y-5"
              >
                <div>
                  <span className="inline-block px-3.5 py-1 rounded-full bg-warning-bg text-warning-text text-[13px] font-bold mb-2.5">
                    {n.room_id ? `ห้อง ${n.room_id}` : 'แจ้งเตือนด่วน'} · {formatTimeThai(n.created_at)}
                  </span>
                  <h2 className="text-[22px] font-bold text-ink leading-snug">
                    {n.title}
                  </h2>
                  <p className="text-[15px] text-ink-secondary mt-1">
                    {n.message}
                    {waitingCount > 0 ? ` · มีคิวรอ ${waitingCount} กลุ่ม` : ''}
                  </p>
                </div>

                {/* 3 Clear Action Buttons (PDF Page 3) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleAlertInRoom(n)}
                    className="h-12 px-4 rounded-xl bg-danger hover:bg-danger-hover text-white text-[15px] font-bold transition-colors"
                  >
                    แจ้งในห้อง (ไฟกะพริบ + เสียง)
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleAcknowledgeOne(n.notification_id)}
                    className="h-12 px-4 rounded-xl border-2 border-primary bg-surface text-primary hover:bg-primary-light text-[15px] font-bold transition-colors"
                  >
                    รับทราบแล้ว
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReturnKeyForNotification(n)}
                    className="h-12 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-[15px] font-bold transition-colors"
                  >
                    รับกุญแจคืนแล้ว
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Notification Settings Card (Matches PDF Page 3) */}
          <div className="bg-surface border border-line rounded-[22px] p-6 shadow-sm">
            <h2 className="text-[19px] font-bold text-ink mb-4">ตั้งค่าแจ้งเตือน</h2>

            <div className="divide-y divide-line">
              <div className="py-3.5 flex items-center justify-between gap-4">
                <span className="text-[16px] font-medium text-ink">
                  เตือนก่อนหมด 10 นาที
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={warnBefore10Min}
                  onClick={() => setWarnBefore10Min((v) => !v)}
                  className={`w-14 h-8 rounded-full p-1 transition-colors ${
                    warnBefore10Min ? 'bg-primary' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      warnBefore10Min ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="py-3.5 flex items-center justify-between gap-4">
                <span className="text-[16px] font-medium text-ink">
                  เตือนเฉพาะเมื่อมีคิวรอ
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={warnOnlyWithQueue}
                  onClick={() => setWarnOnlyWithQueue((v) => !v)}
                  className={`w-14 h-8 rounded-full p-1 transition-colors ${
                    warnOnlyWithQueue ? 'bg-primary' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      warnOnlyWithQueue ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="py-3.5 flex items-center justify-between gap-4">
                <span className="text-[16px] font-medium text-ink">
                  เสียงที่เคาน์เตอร์
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={audio.soundEnabled}
                  onClick={handleToggleCounterSound}
                  className={`w-14 h-8 rounded-full p-1 transition-colors ${
                    audio.soundEnabled ? 'bg-primary' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      audio.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Past Notifications History */}
          {notifications.length > 0 && (
            <div className="bg-surface border border-line rounded-[22px] p-6 shadow-sm">
              <h2 className="text-[18px] font-bold text-ink mb-4">
                ประวัติการแจ้งเตือนทั้งหมด ({notifications.length})
              </h2>
              <div className="divide-y divide-line">
                {notifications.slice(0, 20).map((n) => (
                  <div
                    key={n.notification_id}
                    className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold text-ink">
                        {n.room_id ? `[${n.room_id}] ` : ''}
                        {n.title}
                      </div>
                      <div className="text-[14px] text-ink-secondary">
                        {n.message} · {formatDateTimeThai(n.created_at)}
                      </div>
                    </div>
                    <StatusBadge
                      status={n.notification_status === 'UNREAD' ? 'WARNING' : 'OCCUPIED'}
                      customLabel={
                        n.notification_status === 'UNREAD' ? 'ยังไม่รับทราบ' : 'รับทราบแล้ว'
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {notifications.length === 0 && (
            <EmptyState
              title="ยังไม่มีประวัติการแจ้งเตือน"
              description="เมื่อมีห้องครบเวลาหรือมีเหตุการณ์สำคัญ ระบบจะแสดงที่นี่ทันที"
            />
          )}
        </div>
      )}
    </div>
  );
};
