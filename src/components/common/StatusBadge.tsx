/**
 * ============================================================================
 * SRC/COMPONENTS/COMMON/STATUSBADGE.TSX — Readable Status Pill Badge
 * ============================================================================
 */

import React from 'react';
import { RoomStatus } from '../../types/database';
import { getRoomStatusMeta } from '../../utils/roomStatus';

interface StatusBadgeProps {
  status: RoomStatus | 'CAN_CONTINUE' | string;
  showFullLabel?: boolean;
  customLabel?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showFullLabel = false,
  customLabel
}) => {
  const meta = getRoomStatusMeta(status);
  const label = customLabel || (showFullLabel ? meta.fullLabel : meta.label);

  return (
    <span
      className={`inline-flex items-center px-3.5 py-1 rounded-full text-[13px] font-bold whitespace-nowrap ${meta.badgeClass}`}
    >
      {label}
    </span>
  );
};
