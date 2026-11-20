/**
 * ============================================================================
 * SRC/COMPONENTS/DASHBOARD/CRITICALALERTPANEL.TSX — Right Column Alert Card
 * ============================================================================
 */

import React from 'react';
import { Bell, Clock } from 'lucide-react';
import { NotificationRecord } from '../../types/database';
import { formatTimeThai } from '../../utils/formatters';
import { ErrorState } from '../common/StateBoxes';
import { NotificationPanelSkeleton } from '../skeleton/Skeletons';

interface CriticalAlertPanelProps {
  notifications: NotificationRecord[];
  isLoading: boolean;
  errorMsg: string | null;
  onRetry: () => void;
  onAcknowledge: (notificationId: string) => void;
  onOpenRoomDetail: (roomId: string) => void;
}

export const CriticalAlertPanel: React.FC<CriticalAlertPanelProps> = ({
  notifications,
  isLoading,
  errorMsg,
  onRetry,
  onAcknowledge,
  onOpenRoomDetail
}) => {
  const hasUnread = notifications && notifications.length > 0;

  return (
    <div
      className={`border rounded-2xl p-5 shadow-sm ${
        hasUnread
          ? 'bg-danger-soft border-danger-border'
          : 'bg-surface border-line'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2 text-[17px] font-bold text-red-700">
          <Bell className="w-5 h-5" />
          <span>แจ้งเตือนสำคัญ</span>
        </div>
        <span className="bg-danger text-white text-xs font-bold px-2.5 py-0.5 rounded-full min-w-[24px] text-center">
          {notifications ? notifications.length : 0}
        </span>
      </div>

      {isLoading && <NotificationPanelSkeleton />}

      {!isLoading && errorMsg && (
        <ErrorState message={errorMsg} onRetry={onRetry} />
      )}

      {!isLoading && !errorMsg && !hasUnread && (
        <div className="text-center py-4 px-2 text-ink-secondary text-[13.5px]">
          ✓ ขณะนี้ไม่มีการแจ้งเตือนค้างในระบบ
        </div>
      )}

      {!isLoading && !errorMsg && hasUnread && (
        <div className="space-y-3">
          {notifications.slice(0, 3).map((n) => (
            <div
              key={n.notification_id}
              className="bg-surface border border-danger-border rounded-xl p-3.5 shadow-sm"
            >
              <div className="flex items-center gap-2 text-[14.5px] font-bold text-red-700 mb-1">
                <Clock className="w-4 h-4 shrink-0" />
                <span>{n.title}</span>
              </div>
              <div className="text-[13px] text-ink-secondary mb-2.5">
                {n.message}
              </div>
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>{formatTimeThai(n.created_at)}</span>
                <div className="flex items-center gap-1.5">
                  {n.room_id && (
                    <button
                      type="button"
                      onClick={() => onOpenRoomDetail(n.room_id)}
                      className="px-2.5 py-1 rounded-md border border-line-strong bg-surface text-ink font-semibold hover:bg-subtle"
                    >
                      ดูห้อง
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onAcknowledge(n.notification_id)}
                    className="px-2.5 py-1 rounded-md bg-danger text-white font-semibold hover:bg-red-700"
                  >
                    รับทราบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
