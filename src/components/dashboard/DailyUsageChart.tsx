/**
 * ============================================================================
 * SRC/COMPONENTS/DASHBOARD/DAILYUSAGECHART.TSX — Daily Usage Stats & Bar Chart
 * ============================================================================
 */

import React from 'react';
import { DailyUsageSummary } from '../../types/api';

interface DailyUsageChartProps {
  daily: DailyUsageSummary;
}

const DEFAULT_BUCKETS = [
  { label: '08:00', count: 0 },
  { label: '10:00', count: 0 },
  { label: '12:00', count: 0 },
  { label: '14:00', count: 0 },
  { label: '16:00', count: 0 }
];

export const DailyUsageChart: React.FC<DailyUsageChartProps> = ({ daily }) => {
  const buckets = daily?.hourlyBuckets?.length
    ? daily.hourlyBuckets
    : DEFAULT_BUCKETS;
  const maxCount = Math.max(1, ...buckets.map((b) => Number(b.count) || 0));

  return (
    <div>
      <div className="grid grid-cols-2 gap-3.5 mb-4">
        <div className="bg-subtle border border-line rounded-lg p-3">
          <div className="text-[22px] font-bold text-ink">
            {Number(daily?.totalSessionsToday) || 0} ครั้ง
          </div>
          <div className="text-xs text-ink-secondary">จำนวนการเข้าใช้วันนี้</div>
        </div>
        <div className="bg-subtle border border-line rounded-lg p-3">
          <div className="text-[22px] font-bold text-ink">
            {Number(daily?.totalHoursToday || 0).toFixed(1)} ชม.
          </div>
          <div className="text-xs text-ink-secondary">เวลารวมทั้งหมด</div>
        </div>
      </div>

      <div className="flex items-end justify-between h-24 pt-3 gap-2 border-b border-line">
        {buckets.map((b) => {
          const cnt = Number(b.count) || 0;
          const heightPct = Math.max(8, Math.round((cnt / maxCount) * 100));
          const isPeak = cnt > 0 && cnt === maxCount;
          return (
            <div
              key={b.label}
              title={`${b.label} น. : ${cnt} ครั้ง`}
              className="flex-1 flex flex-col items-center h-full justify-end"
            >
              <div
                className={`w-full max-w-[24px] rounded-t transition-all duration-300 ${
                  isPeak ? 'bg-primary' : 'bg-blue-300'
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-[11.5px] text-ink-secondary mt-1.5">
        {buckets.map((b) => (
          <span key={b.label}>{b.label}</span>
        ))}
      </div>
    </div>
  );
};
