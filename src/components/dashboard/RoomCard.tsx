/**
 * ============================================================================
 * SRC/COMPONENTS/DASHBOARD/ROOMCARD.TSX — Modern Illustrated Room Status Card
 * Clean soft-glow study table illustration, bold room title, icon status pill,
 * and full-width bottom action button.
 * ============================================================================
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, BellRing, Check, Clock, KeyRound } from 'lucide-react';
import { RoomSnapshot } from '../../types/database';
import {
  getRemainingMinutesBeforeClose,
  LIBRARY_CLOSING_LABEL
} from '../../utils/libraryHours';

interface RoomCardProps {
  room: RoomSnapshot;
  waitingCount: number;
  onOpenDetail: (roomId: string) => void;
  onIssueKey: (roomId: string) => void;
  onAlertRoom: (room: RoomSnapshot) => void;
  onReturnKey: (room: RoomSnapshot) => void;
}

const DEFAULT_QUOTA_SECONDS = 180 * 60;

/**
 * Minimalist Study Table & 2 Chairs SVG matching the user's reference mockup.
 */
const StudyRoomIllustration: React.FC<{ accent: 'green' | 'blue' | 'amber' | 'gray' }> = ({
  accent
}) => {
  const glowClass =
    accent === 'blue'
      ? 'from-[#DCEBFE] via-[#EEF5FF]/70 to-transparent'
      : accent === 'amber'
        ? 'from-[#FDECC8] via-[#FEF7E6]/70 to-transparent'
        : accent === 'gray'
          ? 'from-[#E5E7EB] via-[#F3F4F6]/70 to-transparent'
          : 'from-[#D7EFE1] via-[#ECF8F1]/70 to-transparent';

  const screenColor =
    accent === 'blue'
      ? '#93C5FD'
      : accent === 'amber'
        ? '#FCD34D'
        : accent === 'gray'
          ? '#CBD5E1'
          : '#A7D7BE';

  return (
    <div
      aria-hidden="true"
      className={`w-[84px] h-[84px] rounded-full bg-gradient-to-br ${glowClass} flex items-center justify-center shrink-0 pointer-events-none select-none absolute top-3 right-3 z-0`}
    >
      <svg
        width="54"
        height="44"
        viewBox="0 0 66 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Tabletop monitor / partition */}
        <rect x="23" y="13" width="20" height="10" rx="2" fill={screenColor} />
        {/* Table top */}
        <rect x="17" y="23" width="32" height="3.5" rx="1.75" fill="#2E5241" />
        {/* Table legs */}
        <rect x="21" y="26.5" width="3" height="16" rx="1.5" fill="#2E5241" />
        <rect x="42" y="26.5" width="3" height="16" rx="1.5" fill="#2E5241" />
        {/* Left chair */}
        <path
          d="M7 18C7 17.17 7.67 16.5 8.5 16.5C9.33 16.5 10 17.17 10 18L11.5 29H17.5C18.33 29 19 29.67 19 30.5C19 31.33 18.33 32 17.5 32H10.2C9.45 32 8.82 31.45 8.71 30.7L7 18Z"
          fill="#2E5241"
        />
        <rect x="9.5" y="31.5" width="2.6" height="11" rx="1.3" fill="#2E5241" />
        <rect x="15.5" y="31.5" width="2.6" height="11" rx="1.3" fill="#2E5241" />
        {/* Right chair */}
        <path
          d="M59 18C59 17.17 58.33 16.5 57.5 16.5C56.67 16.5 56 17.17 56 18L54.5 29H48.5C47.67 29 47 29.67 47 30.5C47 31.33 47.67 32 48.5 32H55.8C56.55 32 57.18 31.45 57.29 30.7L59 18Z"
          fill="#2E5241"
        />
        <rect x="53.9" y="31.5" width="2.6" height="11" rx="1.3" fill="#2E5241" />
        <rect x="47.9" y="31.5" width="2.6" height="11" rx="1.3" fill="#2E5241" />
      </svg>
    </div>
  );
};

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  waitingCount,
  onOpenDetail,
  onIssueKey,
  onAlertRoom,
  onReturnKey
}) => {
  const effectiveStatus = room.effective_status || room.room_status;
  const isOccupied =
    Boolean(room.current_session_id) &&
    (room.room_status === 'OCCUPIED' || room.room_status === 'WARNING');

  // Live 1-second tick only while occupied so the countdown bar animates smoothly
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!isOccupied) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isOccupied, room.session_start_time, room.expected_end_time]);

  const startMs = room.session_start_time ? new Date(room.session_start_time).getTime() : NaN;
  const endMs = room.expected_end_time ? new Date(room.expected_end_time).getTime() : NaN;
  const liveElapsedSec =
    isOccupied && !Number.isNaN(startMs)
      ? Math.max(Number(room.elapsed_seconds) || 0, Math.floor((nowMs - startMs) / 1000))
      : isOccupied
        ? Number(room.elapsed_seconds) || 0
        : 0;

  const { remainingMinutes, isOvertime, isPastClosing } = isOccupied
    ? getRemainingMinutesBeforeClose(
        room.expected_end_time,
        liveElapsedSec,
        DEFAULT_QUOTA_SECONDS
      )
    : { remainingMinutes: 0, isOvertime: false, isPastClosing: false };

  // Compute remaining percentage & formatted countdown text for the progress bar
  const totalQuotaSec =
    !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs
      ? Math.max(60, Math.round((endMs - startMs) / 1000))
      : DEFAULT_QUOTA_SECONDS;
  const liveRemainingSec = isOccupied
    ? isPastClosing
      ? 0
      : !Number.isNaN(endMs)
        ? Math.max(0, Math.floor((endMs - nowMs) / 1000))
        : Math.max(0, totalQuotaSec - liveElapsedSec)
    : 0;
  const remainingPct = isOccupied
    ? Math.max(0, Math.min(100, (liveRemainingSec / totalQuotaSec) * 100))
    : 0;

  const formatCountdownText = (sec: number): string => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
      return `${hrs} ชม. ${String(mins).padStart(2, '0')} น.`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} น.`;
  };

  const barColorClass =
    isPastClosing || isOvertime || remainingPct <= 5
      ? 'bg-danger'
      : remainingPct <= 20
        ? 'bg-amber-500'
        : 'bg-[#2563EB]';

  const displayStatus =
    isOccupied && isPastClosing
      ? 'WARNING'
      : effectiveStatus === 'WARNING' || (isOvertime && waitingCount > 0)
        ? 'WARNING'
        : isOvertime && waitingCount === 0 && isOccupied
          ? 'CAN_CONTINUE'
          : effectiveStatus;

  const floorLabel = room.floor_id === 'FL5' ? 'ชั้น 5' : 'ชั้น 3';
  const roomTitle = room.room_name || `ห้อง ${room.room_number}`;

  const illustrationAccent: 'green' | 'blue' | 'amber' | 'gray' =
    displayStatus === 'WARNING'
      ? 'amber'
      : displayStatus === 'OCCUPIED' || displayStatus === 'CAN_CONTINUE'
        ? 'blue'
        : displayStatus === 'AVAILABLE'
          ? 'green'
          : 'gray';

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
      className={`rounded-[20px] p-5 bg-surface transition-all hover:shadow-md cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden ${
        displayStatus === 'WARNING'
          ? 'border-2 border-warning-border shadow-sm'
          : 'border border-[#E3ECE6] shadow-[0_2px_10px_rgba(16,42,30,0.04)]'
      }`}
    >
      {/* Soft Illustrated Table Positioned Cleanly Top-Right (Never Squeezes Text!) */}
      <StudyRoomIllustration accent={illustrationAccent} />

      {/* Upper Section: Room Info & Single-Line Status Pill */}
      <div className="relative z-10 space-y-2.5 pr-16">
        <div>
          <div className="text-[13px] font-semibold text-ink-secondary leading-tight">
            {roomTitle} · {floorLabel}
          </div>
          <h3 className="text-[24px] font-bold text-ink leading-tight mt-0.5 truncate">
            {roomTitle}
          </h3>
        </div>

        {/* Rounded Status Pill — Always Single Line (whitespace-nowrap) */}
        {displayStatus === 'AVAILABLE' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5F4EC] text-[#15653B] text-[13.5px] font-bold whitespace-nowrap">
            <span className="w-4 h-4 rounded-full bg-[#1E8E52] text-white inline-flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
            <span>พร้อมใช้งาน</span>
          </span>
        )}

        {displayStatus === 'OCCUPIED' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F1FD] text-[#1D5FD1] text-[13.5px] font-bold whitespace-nowrap">
            <span className="w-4 h-4 rounded-full bg-[#3B82F6] text-white inline-flex items-center justify-center shrink-0">
              <Clock className="w-2.5 h-2.5 stroke-[2.75]" />
            </span>
            <span>กำลังใช้งาน · {remainingMinutes} น.</span>
          </span>
        )}

        {displayStatus === 'CAN_CONTINUE' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F1FD] text-[#1D5FD1] text-[13.5px] font-bold whitespace-nowrap">
            <span className="w-4 h-4 rounded-full bg-[#3B82F6] text-white inline-flex items-center justify-center shrink-0">
              <Clock className="w-2.5 h-2.5 stroke-[2.75]" />
            </span>
            <span>ใช้ต่อได้ถึง {LIBRARY_CLOSING_LABEL}</span>
          </span>
        )}

        {displayStatus === 'WARNING' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-bg text-warning-text text-[13.5px] font-bold whitespace-nowrap">
            <span className="w-4 h-4 rounded-full bg-[#D97706] text-white inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="w-2.5 h-2.5 stroke-[2.75]" />
            </span>
            <span>
              {isPastClosing ? `เลยเวลาปิด ${LIBRARY_CLOSING_LABEL}` : 'หมดเวลาแล้ว'}
            </span>
          </span>
        )}

        {(displayStatus === 'MAINTENANCE' || displayStatus === 'DEVICE_OFFLINE') && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[13.5px] font-bold whitespace-nowrap">
            <span>
              {displayStatus === 'MAINTENANCE' ? 'ปิดปรับปรุง' : 'เซนเซอร์ออฟไลน์'}
            </span>
          </span>
        )}
      </div>

      {/* Live Countdown Progress Bar (Shown whenever room is occupied) */}
      {isOccupied && (
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center justify-between text-[12.5px] font-semibold">
            <span className="text-ink-secondary">
              {isPastClosing
                ? `เลยเวลาปิด ${LIBRARY_CLOSING_LABEL}`
                : isOvertime
                  ? 'ครบเวลาใช้งานแล้ว'
                  : 'เวลาคงเหลือ'}
            </span>
            <span
              className={`font-bold tabular-nums ${
                isPastClosing || isOvertime
                  ? 'text-danger'
                  : remainingPct <= 20
                    ? 'text-amber-600'
                    : 'text-[#1D5FD1]'
              }`}
            >
              {liveRemainingSec > 0 ? formatCountdownText(liveRemainingSec) : '00:00 น.'}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#E8EFF2] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColorClass}`}
              style={{
                width: `${isPastClosing || isOvertime ? 100 : Math.max(4, remainingPct)}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom Full-Width Action Button */}
      <div className="relative z-10 flex items-center gap-2">
        {displayStatus === 'AVAILABLE' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIssueKey(room.room_id);
            }}
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary-hover text-white text-[16px] font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <KeyRound className="w-4 h-4" />
            <span>ให้กุญแจ</span>
          </button>
        )}

        {(displayStatus === 'OCCUPIED' || displayStatus === 'CAN_CONTINUE') && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReturnKey(room);
            }}
            className="w-full h-11 rounded-xl bg-[#BFC7C3] hover:bg-primary text-white text-[16px] font-bold transition-colors"
            title="คลิกเพื่อรับกุญแจคืน"
          >
            ใช้งานอยู่ · รับกุญแจคืน
          </button>
        )}

        {displayStatus === 'WARNING' && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAlertRoom(room);
              }}
              className="flex-1 h-11 rounded-xl bg-danger hover:bg-danger-hover text-white text-[15px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <BellRing className="w-4 h-4" />
              <span>แจ้งเตือน</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReturnKey(room);
              }}
              className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary-hover text-white text-[15px] font-bold transition-colors"
            >
              รับกุญแจคืน
            </button>
          </>
        )}

        {(displayStatus === 'MAINTENANCE' || displayStatus === 'DEVICE_OFFLINE') && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(room.room_id);
            }}
            className="w-full h-11 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-[15px] font-bold transition-colors"
          >
            ดูรายละเอียด
          </button>
        )}
      </div>
    </div>
  );
};
