/**
 * ============================================================================
 * SRC/UTILS/ROOMSTATUS.TS — Clean Room Status Badge & Card Styling (PDF Theme)
 * ============================================================================
 */

import { RoomStatus } from '../types/database';

export interface RoomStatusMeta {
  label: string;
  fullLabel: string;
  badgeClass: string;
  cardBorderClass: string;
}

const STATUS_MAP: Record<RoomStatus, RoomStatusMeta> = {
  AVAILABLE: {
    label: 'ว่าง',
    fullLabel: 'ว่าง (พร้อมให้บริการ)',
    badgeClass: 'bg-[#E9ECEF] text-[#374151]',
    cardBorderClass: 'border border-line bg-surface'
  },
  OCCUPIED: {
    label: 'ใช้งานอยู่',
    fullLabel: 'ใช้งานอยู่',
    badgeClass: 'bg-success-bg text-[#14532D]',
    cardBorderClass: 'border border-line bg-surface'
  },
  WARNING: {
    label: 'หมดเวลา',
    fullLabel: 'หมดเวลา (มีคิวรอ)',
    badgeClass: 'bg-warning-bg text-warning-text',
    cardBorderClass: 'border-2 border-warning-border bg-surface'
  },
  DEVICE_OFFLINE: {
    label: 'เซนเซอร์ขาดการติดต่อ',
    fullLabel: 'อุปกรณ์ออฟไลน์',
    badgeClass: 'bg-danger-bg text-danger',
    cardBorderClass: 'border-2 border-danger/50 bg-danger-soft'
  },
  MAINTENANCE: {
    label: 'ปิดปรับปรุง',
    fullLabel: 'ปิดปรับปรุง',
    badgeClass: 'bg-slate-200 text-slate-700',
    cardBorderClass: 'border border-line bg-subtle opacity-85'
  }
};

export function getRoomStatusMeta(status?: RoomStatus | string): RoomStatusMeta {
  if (status === 'CAN_CONTINUE') {
    return {
      label: 'ใช้ต่อได้',
      fullLabel: 'ใช้ต่อได้ (ไม่มีคิวรอ)',
      badgeClass: 'bg-info-bg text-info',
      cardBorderClass: 'border border-line bg-surface'
    };
  }
  if (status && status in STATUS_MAP) {
    return STATUS_MAP[status as RoomStatus];
  }
  return STATUS_MAP.AVAILABLE;
}
