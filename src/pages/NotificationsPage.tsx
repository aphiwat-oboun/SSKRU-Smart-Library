/**
 * ============================================================================
 * SRC/PAGES/NOTIFICATIONSPAGE.TSX — Full-Width Balanced Notification Center
 * Left 7 cols: Active alerts + history | Right 5 cols: Notification Toggles
 * ============================================================================
 */

import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, CheckCircle2, RefreshCw, Volume2 } from 'lucide-react';
import { EmptyState, ErrorState } from '../components/common/StateBoxes';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableRowsSkeleton } from '../components/skeleton/Skeletons';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from '../hooks/useToast';
import { apiService, getCachedRpc } from '../services/apiClient';
import { NotificationRecord } from '../types/database';
import { formatDateTimeThai, formatTimeThai } from '../utils/formatters';

export const NotificationsPage: React.FC = () => {
  const { audio, dashboardData, refreshDashboard, openConfirmModal } = useAppContext();
  const { showToast } = useToast();

  const cachedNotifs = getCachedRpc<{ notifications: NotificationRecord[] }>('getNotificationsList');
  const [notifications, setNotifications] = useState<NotificationRecord[]>(
    cachedNotifs?.notifications || []
  );
  const [isLoading, setIsLoading] = useState<boolean>(!cachedNotifs);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [warnBefore10Min, setWarnBefore10Min] = useState<boolean>(() => {
    const saved = localStorage.getItem('SRRU_WARN_BEFORE_10M');
    return saved === null ? true : saved === 'true';
  });
  const [warnOnlyWithQueue, setWarnOnlyWithQueue] = useState<boolean>(() => {
    const saved = localStorage.getItem('SRRU_WARN_ONLY_QUEUE');
    return saved === null ? true : saved === 'true';
  });

  const handleToggleWarn10Min = () => {
    setWarnBefore10Min((prev) => {
      const next = !prev;
      localStorage.setItem('SRRU_WARN_BEFORE_10M', String(next));
      return next;
    });
  };

  const handleToggleWarnQueue = () => {
    setWarnOnlyWithQueue((prev) => {
      const next = !prev;
      localStorage.setItem('SRRU_WARN_ONLY_QUEUE', String(next));
      return next;
    });
  };

  const loadNotifications = useCallback(async () => {
    if (!getCachedRpc('getNotificationsList')) {
      setIsLoading(true);
    }
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
    showToast(
      next ? 'เปิดเสียงแจ้งเตือนที่เคาน์เตอร์แล้ว' : 'ปิดเสียงแจ้งเตือนที่เคาน์เตอร์แล้ว',
      'info'
    );
  };

  const handleTestSound = () => {
    audio.unlockAudio();
    audio.playAlertChime();
    showToast('ทดสอบเสียงแจ้งเตือนเรียบร้อย', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Full-Width Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-stretch gap-3.5">
          <span className="w-1.5 rounded-full bg-primary shrink-0" />
          <div>
            <h1 className="text-[28px] font-bold text-ink leading-tight">การแจ้งเตือน</h1>
            <p className="text-[15px] text-ink-secondary mt-1">
              ตรวจสอบการหมดเวลาห้องประชุม คิวรอ และตั้งค่าการแจ้งเตือนที่เคาน์เตอร์
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadNotifications()}
          className="h-11 px-4 rounded-xl border border-line-strong bg-surface text-[15px] font-bold text-ink hover:bg-subtle inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>รีเฟรช</span>
        </button>
      </div>

      {isLoading && <TableRowsSkeleton cols={3} rows={3} />}

      {!isLoading && errorMsg && (
        <ErrorState message={errorMsg} onRetry={() => void loadNotifications()} />
      )}

      {/* Balanced Full-Width 2-Column Layout */}
      {!isLoading && !errorMsg && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Active Alerts + History */}
          <div className="xl:col-span-7 space-y-5">
            {unreadList.length === 0 ? (
              <div className="bg-surface border border-line rounded-[24px] p-6 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[19px] font-bold text-ink">
                    ขณะนี้ไม่มีการแจ้งเตือนค้างในระบบ
                  </div>
                  <div className="text-[14.5px] text-ink-secondary">
                    ห้องประชุมทุกห้องและอุปกรณ์เซนเซอร์อยู่ในสถานะปกติ
                  </div>
                </div>
              </div>
            ) : (
              unreadList.map((n) => (
                <div
                  key={n.notification_id}
                  className="bg-surface border-2 border-warning-border rounded-[24px] p-6 shadow-sm space-y-5"
                >
                  <div>
                    <span className="inline-block px-3.5 py-1 rounded-full bg-warning-bg text-warning-text text-[13.5px] font-bold mb-2.5">
                      {n.room_id ? `ห้อง ${n.room_id}` : 'แจ้งเตือนด่วน'} · {formatTimeThai(n.created_at)}
                    </span>
                    <h2 className="text-[22px] font-bold text-ink leading-snug">
                      {n.title}
                    </h2>
                    <p className="text-[15.5px] text-ink-secondary mt-1">
                      {n.message}
                      {waitingCount > 0 ? ` · มีคิวรอ ${waitingCount} กลุ่ม` : ''}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handleAlertInRoom(n)}
                      className="h-12 px-4 rounded-xl bg-danger hover:bg-danger-hover text-white text-[15px] font-bold transition-colors"
                    >
                      แจ้งในห้อง (ไฟ + เสียง)
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

            {/* Past Notifications History */}
            <div className="bg-surface border border-line rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-1.5 h-5 rounded-full bg-primary inline-block" />
                <h2 className="text-[19px] font-bold text-ink">
                  ประวัติการแจ้งเตือน ({notifications.length})
                </h2>
              </div>

              {notifications.length === 0 ? (
                <EmptyState
                  title="ยังไม่มีประวัติการแจ้งเตือน"
                  description="เมื่อมีห้องครบเวลาหรือเลยเวลาปิด 16:00 น. ระบบจะบันทึกประวัติไว้ที่นี่"
                />
              ) : (
                <div className="divide-y divide-line">
                  {notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.notification_id}
                      className="py-4 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-[16px] font-bold text-ink">
                          {n.room_id ? `[${n.room_id}] ` : ''}
                          {n.title}
                        </div>
                        <div className="text-[14.5px] text-ink-secondary mt-0.5">
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
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Notification Settings Card */}
          <div className="xl:col-span-5 bg-surface border border-line rounded-[24px] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-primary inline-block" />
              <h2 className="text-[20px] font-bold text-ink">ตั้งค่าการแจ้งเตือน</h2>
            </div>

            <div className="divide-y divide-line">
              <div className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[16px] font-bold text-ink">เตือนก่อนหมด 10 นาที</div>
                  <div className="text-[13.5px] text-ink-secondary">
                    แจ้งเตือนล่วงหน้าก่อนครบกำหนดเวลาใช้งาน
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={warnBefore10Min}
                  onClick={handleToggleWarn10Min}
                  className={`w-14 h-8 rounded-full p-1 transition-colors shrink-0 ${
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

              <div className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[16px] font-bold text-ink">เตือนเฉพาะเมื่อมีคิวรอ</div>
                  <div className="text-[13.5px] text-ink-secondary">
                    หากไม่มีกลุ่มรอคิว ให้ใช้ต่อได้จนถึง 16:00 น.
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={warnOnlyWithQueue}
                  onClick={handleToggleWarnQueue}
                  className={`w-14 h-8 rounded-full p-1 transition-colors shrink-0 ${
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

              <div className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[16px] font-bold text-ink">เสียงเตือนที่เคาน์เตอร์</div>
                  <div className="text-[13.5px] text-ink-secondary">
                    ส่งเสียงกระดิ่งเมื่อมีการแจ้งเตือนใหม่เข้ามา
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={audio.soundEnabled}
                  onClick={handleToggleCounterSound}
                  className={`w-14 h-8 rounded-full p-1 transition-colors shrink-0 ${
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

            <button
              type="button"
              onClick={handleTestSound}
              className="w-full h-12 rounded-xl border-2 border-primary text-primary hover:bg-primary-light text-[15px] font-bold inline-flex items-center justify-center gap-2 transition-colors"
            >
              {audio.soundEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <BellRing className="w-5 h-5" />
              )}
              <span>ทดสอบเสียงแจ้งเตือน</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
