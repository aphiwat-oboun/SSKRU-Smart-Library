/**
 * ============================================================================
 * SRC/COMPONENTS/DASHBOARD/SENSORHISTORYCHART.TSX — Live Wokwi DB & Chart.js
 * Connects directly to the user's separated Wokwi Google Sheet API (v2):
 *   - GET <VITE_WOKWI_API_URL>?path=/api/status         (latest room status)
 *   - GET <VITE_WOKWI_API_URL>?path=/api/history&days=7 (7-day usage_history)
 * Falls back cleanly to dailySummary when VITE_WOKWI_API_URL is not set.
 * ============================================================================
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { databaseConfig } from '../../config/database';
import { DailyUsageSummary } from '../../types/api';
import { formatTimeThai } from '../../utils/formatters';

interface WokwiRoomStatusRow {
  room_id: string;
  room_name: string;
  location?: string;
  capacity?: number;
  status: string;
  lastUpdated: string | null;
  device_id: string | null;
  device_type: string | null;
  device_lastUpdated: string | null;
  session_start: string | null;
}

interface WokwiHistoryRow {
  history_id: number | string;
  room_id: string;
  device_id: string;
  start_time: string;
  end_time: string;
  duration: number | string;
}

interface ChartInstance {
  destroy: () => void;
}

interface ChartConstructor {
  new (ctx: HTMLCanvasElement, config: Record<string, unknown>): ChartInstance;
}

declare global {
  interface Window {
    Chart?: ChartConstructor;
  }
}

interface SensorHistoryChartProps {
  dailySummary?: DailyUsageSummary;
  refreshTick: string;
}

export const SensorHistoryChart: React.FC<SensorHistoryChartProps> = ({
  dailySummary,
  refreshTick
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartInstance | null>(null);

  const [wokwiStatus, setWokwiStatus] = useState<WokwiRoomStatusRow | null>(null);
  const [wokwiHistory, setWokwiHistory] = useState<WokwiHistoryRow[]>([]);
  const [selectedDays, setSelectedDays] = useState<number>(7);

  const wokwiUrl = databaseConfig.wokwiApiUrl;

  const fetchWokwiData = useCallback(async () => {
    if (!wokwiUrl || !wokwiUrl.startsWith('https://script.google.com/')) {
      return;
    }
    const sep = wokwiUrl.includes('?') ? '&' : '?';
    try {
      const [statusRes, histRes] = await Promise.all([
        fetch(`${wokwiUrl}${sep}path=/api/status`, { method: 'GET', redirect: 'follow' }),
        fetch(`${wokwiUrl}${sep}path=/api/history&days=${selectedDays}`, {
          method: 'GET',
          redirect: 'follow'
        })
      ]);

      if (statusRes.ok) {
        const sJson = (await statusRes.json()) as { data?: WokwiRoomStatusRow[] };
        if (Array.isArray(sJson.data) && sJson.data.length > 0) {
          setWokwiStatus(sJson.data[0]);
        }
      }

      if (histRes.ok) {
        const hJson = (await histRes.json()) as { data?: WokwiHistoryRow[] };
        if (Array.isArray(hJson.data)) {
          setWokwiHistory(hJson.data);
        }
      }
    } catch {
      // Keep previous data on transient error
    }
  }, [wokwiUrl, selectedDays]);

  useEffect(() => {
    void fetchWokwiData();
  }, [fetchWokwiData, refreshTick]);

  // Group Wokwi usage_history by date (sorted chronologically) for Chart.js
  const chartSeries = useMemo(() => {
    if (wokwiHistory.length > 0) {
      const map = new Map<string, { label: string; sessions: number; totalMin: number }>();

      // Pre-populate last N days with sortable ISO date keys (YYYY-MM-DD)
      const today = new Date();
      for (let i = selectedDays - 1; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;
        map.set(sortKey, {
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          sessions: 0,
          totalMin: 0
        });
      }

      for (const row of wokwiHistory) {
        const d = new Date(row.start_time);
        if (Number.isNaN(d.getTime())) continue;
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;
        const cur = map.get(sortKey) || {
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          sessions: 0,
          totalMin: 0
        };
        cur.sessions += 1;
        cur.totalMin += Math.round((Number(row.duration) || 0) / 60);
        map.set(sortKey, cur);
      }

      const sortedEntries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
      return {
        labels: sortedEntries.map(([, v]) => v.label),
        values: sortedEntries.map(([, v]) => v.sessions),
        datasetLabel: 'จำนวนรอบการใช้งานต่อวัน (ครั้ง)'
      };
    }

    const buckets = dailySummary?.hourlyBuckets || [];
    return {
      labels: buckets.map((b) => b.label),
      values: buckets.map((b) => b.count),
      datasetLabel: 'จำนวนรอบการใช้งานตามช่วงเวลา'
    };
  }, [wokwiHistory, dailySummary, selectedDays]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined' || !window.Chart) {
      return;
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const barPalette = [
      '#1E7548', // Forest Green
      '#0D9488', // Teal
      '#2563EB', // Royal Blue
      '#7C3AED', // Violet
      '#D97706', // Amber
      '#E11D48', // Rose
      '#0891B2', // Cyan
      '#059669'  // Emerald
    ];

    const barColors = chartSeries.values.map((_, idx) => barPalette[idx % barPalette.length]);

    chartInstanceRef.current = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels: chartSeries.labels,
        datasets: [
          {
            label: chartSeries.datasetLabel,
            data: chartSeries.values,
            backgroundColor: barColors,
            borderRadius: 10,
            maxBarThickness: 42
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: '#4B5563'
            },
            grid: {
              color: '#E2EBE5'
            }
          },
          x: {
            ticks: {
              color: '#4B5563'
            },
            grid: {
              display: false
            }
          }
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [chartSeries]);

  const isOccupied = wokwiStatus?.status === 'OCCUPIED';

  return (
    <div className="bg-surface border border-line rounded-[20px] p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-bold text-ink">
            สถิติและกราฟย้อนหลังจากฐานข้อมูล (Chart.js)
          </h2>
          <p className="text-[14px] text-ink-secondary">
            {wokwiUrl
              ? `เชื่อมต่อ Wokwi Sheet (${wokwiHistory.length} รอบใน ${selectedDays} วันล่าสุด) · อัปเดตทุก 15 วินาที`
              : 'ใส่ VITE_WOKWI_API_URL ใน .env เพื่อแสดงค่าเซนเซอร์และกราฟจากชีต Wokwi'}
          </p>
        </div>

        {/* Range Switcher (7 / 14 days) */}
        {wokwiUrl && (
          <div className="inline-flex rounded-xl border border-line bg-subtle p-1 gap-1">
            {[7, 14].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDays(d)}
                className={`px-3 py-1 rounded-lg text-[13px] font-bold transition-colors ${
                  selectedDays === d
                    ? 'bg-primary text-white'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {d} วัน
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Live Wokwi Sensor Status Strip (from ?path=/api/status) */}
      {wokwiStatus && (
        <div className="bg-subtle border border-line rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[15px] font-bold text-ink">
              {wokwiStatus.room_name} ({wokwiStatus.room_id})
            </span>
            <span
              className={`px-3 py-0.5 rounded-full text-[13px] font-bold ${
                isOccupied
                  ? 'bg-success-bg text-[#14532D]'
                  : 'bg-[#E9ECEF] text-[#374151]'
              }`}
            >
              {isOccupied ? '● ใช้งานอยู่ (OCCUPIED)' : '○ ว่าง (EMPTY)'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-primary-light text-primary">
              Wokwi Demo
            </span>
          </div>

          <div className="text-[13.5px] text-ink-secondary">
            อุปกรณ์: <strong>{wokwiStatus.device_id || 'IOT_R301'}</strong>
            {wokwiStatus.lastUpdated && (
              <> · อัปเดต {formatTimeThai(wokwiStatus.lastUpdated)}</>
            )}
          </div>
        </div>
      )}

      {/* Chart.js Canvas */}
      <div className="h-[220px] w-full">
        <canvas ref={canvasRef} aria-label="กราฟประวัติการใช้งานห้องจากฐานข้อมูล" />
      </div>
    </div>
  );
};
