/**
 * ============================================================================
 * SRC/COMPONENTS/DASHBOARD/ROOMCARD.TSX — Clean Room Card (PDF Page 1 & 4)
 * ============================================================================
 */

import React from 'react';
import { RoomSnapshot } from '../../types/database';
import { formatTimeThai } from '../../utils/formatters';
import { getRoomStatusMeta } from '../../utils/roomStatus';
import { StatusBadge } from '../common/StatusBadge';

interface RoomCardProps {
  room: RoomSnapshot;
  waitingCount: number;
  onOpenDetail: (roomId: string) => void;
  onIssueKey: (roomId: string) => void;
  onAlertRoom: (room: RoomSnapshot) => void;
}

const DEFAULT_QUOTA_SECONDS = 180 * 60; // 3 hours standard quota

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  waitingCount,
  onOpenDetail,
  onIssueKey,
  onAlertRoom
}) => {
  const effectiveStatus = room.effective_status || room.room_status;
  const isOccupied =
    Boolean(room.current_session_id) &&
    (room.room_status === 'OCCUPIED' || room.room_status === 'WARNING');

  const elapsedSec = isOccupied ? Number(room.elapsed_seconds) || 0 : 0;
  const memberCount = isOccupied ? Number(room.active_member_count) || 0 : 0;

  // Compute remaining minutes from expected_end_time or standard quota
  let remainingMinutes = 0;
  let isOvertime = false;
  if (isOccupied) {
    if (room.expected_end_time) {
      const diffMs = new Date(room.expected_end_time).getTime() - Date.now();
      remainingMinutes = Math.max(0, Math.ceil(diffMs / 60000));
      isOvertime = diffMs <= 0;
    } else {
      const remSec = DEFAULT_QUOTA_SECONDS - elapsedSec;
      remainingMinutes = Math.max(0, Math.ceil(remSec / 60));
      isOvertime = remSec <= 0;
    }
  }

  // Determine visual badge status matching PDF (หมดเวลา / ใช้งานอยู่ / ใช้ต่อได้ / ว่าง)
  const displayStatus =
    effectiveStatus === 'WARNING' || (isOvertime && waitingCount > 0)
      ? 'WARNING'
      : isOvertime && waitingCount === 0 && isOccupied
        ? 'CAN_CONTINUE'
        : effectiveStatus;

  const meta = getRoomStatusMeta(displayStatus);
  const floorLabel = room.floor_id === 'FL5' ? 'ชั้น 5' : 'ชั้น 3';
  const startTimeShort =
    isOccupied && room.session_start_time
      ? formatTimeThai(room.session_start_time).replace(' น.', '')
      : '';

  const progressPct = isOccupied
    ? Math.min(100, Math.max(5, Math.round((elapsedSec / DEFAULT_QUOTA_SECONDS) * 100)))
    : 0;

  return (
    <div
      onClick={() => onOpenDetail(room.room_id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(room.room_id);
        }
      }}
      className={`rounded-[20px] p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between min-h-[215px] ${meta.cardBorderClass}`}
    >
      <div>
        {/* Top Row: Room Name & Floor + Status Pill */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-[18px] font-bold text-ink leading-snug">
            {room.room_name || `ห้อง ${room.room_number}`} · {floorLabel}
          </h3>
          <StatusBadge status={displayStatus} />
        </div>

        {/* Center Status Content */}
        {displayStatus === 'WARNING' && (
          <div className="space-y-1.5">
            <div className="text-[24px] font-bold text-ink leading-tight">
              ครบเวลาแล้ว
            </div>
            <div className="text-[15px] text-ink-secondary">
              รับกุญแจ {startTimeShort || '-'} · {memberCount} บัตร
            </div>
            {waitingCount > 0 && (
              <div className="text-[15px] font-bold text-warning-text pt-0.5">
                มีคิวรอ {waitingCount} กลุ่ม
              </div>
            )}
          </div>
        )}

        {displayStatus === 'OCCUPIED' && (
          <div className="space-y-2">
            <div className="text-[24px] font-bold text-ink leading-tight">
              เหลือ {remainingMinutes} นาที
            </div>
            <div className="text-[15px] text-ink-secondary">
              รับกุญแจ {startTimeShort || '-'} · {memberCount} บัตร
            </div>
            <div className="pt-2">
              <div className="w-full h-2.5 bg-[#E3EBE6] rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {displayStatus === 'CAN_CONTINUE' && (
          <div className="space-y-1.5">
            <div className="text-[24px] font-bold text-ink leading-tight">
              ไม่มีคิวรอ
            </div>
            <div className="text-[15px] text-ink-secondary">
              ครบเวลาแล้ว อยู่ได้ถึงห้องสมุดปิด 20:00
            </div>
          </div>
        )}

        {displayStatus === 'AVAILABLE' && (
          <div className="space-y-1.5">
            <div className="text-[24px] font-bold text-ink leading-tight">
              กุญแจอยู่ในตู้
            </div>
            <div className="text-[15px] text-ink-secondary">พร้อมให้บริการ</div>
          </div>
        )}

        {(displayStatus === 'MAINTENANCE' || displayStatus === 'DEVICE_OFFLINE') && (
          <div className="space-y-1.5">
            <div className="text-[22px] font-bold text-ink leading-tight">
              {displayStatus === 'MAINTENANCE' ? 'งดให้บริการชั่วคราว' : 'ตรวจสอบเซนเซอร์'}
            </div>
            <div className="text-[15px] text-ink-secondary">
              แตะเพื่อดูรายละเอียดห้อง
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Button (only when action is needed — matching PDF Page 4) */}
      <div className="mt-5 flex items-center justify-between gap-3">
        {displayStatus === 'WARNING' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAlertRoom(room);
            }}
            className="h-11 px-6 rounded-xl bg-danger hover:bg-danger-hover text-white text-[16px] font-bold transition-colors"
          >
            แจ้งเตือน
          </button>
        )}

        {displayStatus === 'AVAILABLE' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIssueKey(room.room_id);
            }}
            className="h-11 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white text-[16px] font-bold transition-colors"
          >
            ให้กุญแจ
          </button>
        )}

        {(displayStatus === 'OCCUPIED' || displayStatus === 'CAN_CONTINUE') && (
          <span className="text-[13px] font-medium text-ink-secondary">
            {room.presence_state === 'PRESENT'
              ? '● มีผู้ใช้งานอยู่ในห้อง'
              : '○ ไม่พบการเคลื่อนไหว'}
          </span>
        )}
      </div>
    </div>
  );
};
