/**
 * ============================================================================
 * SRC/COMPONENTS/DASHBOARD/SENSORHISTORYCHART.TSX — Clear, At-a-Glance Chart.js
 * Displays 3 instant summary KPIs + colorful Chart.js bar chart with value
 * labels directly on top of every bar, clear Thai axis labels, and rich tooltip.
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

const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

function formatThaiShortDate(d: Date, isToday: boolean): string {
  if (isToday) return 'วันนี้';
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`;
}

const WOKWI_STATUS_CACHE_KEY = 'SRRU_WOKWI_STATUS_CACHE_V1';
const WOKWI_HISTORY_CACHE_KEY = 'SRRU_WOKWI_HISTORY_CACHE_V1';

function readJsonCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export const SensorHistoryChart: React.FC<SensorHistoryChartProps> = ({
  dailySummary,
  refreshTick
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartInstance | null>(null);
  const requestIdRef = useRef<number>(0);
  const lastChartSignatureRef = useRef<string>('');
  const lastStatusKeyRef = useRef<string>('');

  const [wokwiStatus, setWokwiStatus] = useState<WokwiRoomStatusRow | null>(() =>
    readJsonCache<WokwiRoomStatusRow | null>(WOKWI_STATUS_CACHE_KEY, null)
  );
  const [wokwiHistory, setWokwiHistory] = useState<WokwiHistoryRow[]>(() =>
    readJsonCache<WokwiHistoryRow[]>(WOKWI_HISTORY_CACHE_KEY, [])
  );
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const wokwiUrl = databaseConfig.wokwiApiUrl;

  const fetchWokwiHistory = useCallback(
    async (forceDays?: number) => {
      if (!wokwiUrl || !wokwiUrl.startsWith('https://script.google.com/')) {
        return;
      }
      const daysToLoad = forceDays ?? selectedDays;
      const reqId = requestIdRef.current;
      const sep = wokwiUrl.includes('?') ? '&' : '?';
      try {
        const histRes = await fetch(
          `${wokwiUrl}${sep}path=/api/history&days=${daysToLoad}&t=${Date.now()}`,
          {
            method: 'GET',
            cache: 'no-store',
            redirect: 'follow'
          }
        );
        // Only drop response if user switched selectedDays (7 <-> 14) while in-flight
        if (reqId !== requestIdRef.current) return;
        if (histRes.ok) {
          const hJson = (await histRes.json()) as { data?: WokwiHistoryRow[] };
          if (Array.isArray(hJson.data)) {
            setWokwiHistory(hJson.data);
            writeJsonCache(WOKWI_HISTORY_CACHE_KEY, hJson.data);
          }
        }
      } catch {
        // Keep previous history on transient error
      }
    },
    [wokwiUrl, selectedDays]
  );

  const fetchWokwiStatusOnly = useCallback(async () => {
    if (!wokwiUrl || !wokwiUrl.startsWith('https://script.google.com/')) {
      return;
    }
    const sep = wokwiUrl.includes('?') ? '&' : '?';
    try {
      const statusRes = await fetch(`${wokwiUrl}${sep}path=/api/status&t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        redirect: 'follow'
      });
      if (!statusRes.ok) return;
      const sJson = (await statusRes.json()) as { data?: WokwiRoomStatusRow[] };
      if (Array.isArray(sJson.data) && sJson.data.length > 0) {
        // Always pick the room with the most recent sensor update so changing ROOM_ID in Wokwi follows automatically!
        const sorted = [...sJson.data].sort((a, b) => {
          const ta = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
          const tb = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
          return tb - ta;
        });
        const latest = sorted[0];
        setWokwiStatus(latest);
        writeJsonCache(WOKWI_STATUS_CACHE_KEY, latest);
        lastStatusKeyRef.current = `${latest.room_id}|${latest.device_id || ''}|${latest.status}|${latest.lastUpdated || ''}`;
      }
    } catch {
      // Keep previous status on transient error
    }
  }, [wokwiUrl]);

  // Bump requestId only when selectedDays changes so 7/14-day toggle never has a race condition
  useEffect(() => {
    requestIdRef.current += 1;
    void fetchWokwiHistory(selectedDays);
  }, [fetchWokwiHistory, selectedDays, refreshTick]);

  // Non-overlapping live polling: wait for previous poll to FINISH, then wait 3s (never cancels slow GAS responses)
  useEffect(() => {
    if (!wokwiUrl || !wokwiUrl.startsWith('https://script.google.com/')) {
      return;
    }
    let cancelled = false;
    let timerId: number | null = null;

    const pollLoop = async () => {
      if (cancelled) return;
      if (!document.hidden) {
        await Promise.all([fetchWokwiStatusOnly(), fetchWokwiHistory()]);
      }
      if (!cancelled) {
        timerId = window.setTimeout(() => {
          void pollLoop();
        }, 3000);
      }
    };

    void pollLoop();

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [wokwiUrl, fetchWokwiStatusOnly, fetchWokwiHistory]);

  // Build chronologically sorted series + clear summary KPIs
  const chartSeries = useMemo(() => {
    if (wokwiHistory.length > 0) {
      const map = new Map<string, { label: string; sessions: number; totalMin: number }>();
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(today.getDate()).padStart(2, '0')}`;

      for (let i = selectedDays - 1; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(d.getDate()).padStart(2, '0')}`;
        map.set(sortKey, {
          label: formatThaiShortDate(d, sortKey === todayKey),
          sessions: 0,
          totalMin: 0
        });
      }

      for (const row of wokwiHistory) {
        const d = new Date(row.start_time);
        if (Number.isNaN(d.getTime())) continue;
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(d.getDate()).padStart(2, '0')}`;
        // Strictly keep only dates inside the selectedDays window (7 or 14 days)
        const cur = map.get(sortKey);
        if (!cur) continue;
        cur.sessions += 1;
        cur.totalMin += Math.round((Number(row.duration) || 0) / 60);
        map.set(sortKey, cur);
      }

      const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
      const totalSessions = sorted.reduce((acc, [, v]) => acc + v.sessions, 0);
      const totalMinutes = sorted.reduce((acc, [, v]) => acc + v.totalMin, 0);
      let peakLabel = '-';
      let peakCount = 0;
      for (const [, v] of sorted) {
        if (v.sessions > peakCount) {
          peakCount = v.sessions;
          peakLabel = v.label;
        }
      }

      return {
        labels: sorted.map(([, v]) => v.label),
        values: sorted.map(([, v]) => v.sessions),
        minutes: sorted.map(([, v]) => v.totalMin),
        totalSessions,
        totalMinutes,
        peakLabel,
        peakCount
      };
    }

    const buckets = dailySummary?.hourlyBuckets || [];
    const totalSessions = buckets.reduce((acc, b) => acc + b.count, 0);
    return {
      labels: buckets.map((b) => b.label),
      values: buckets.map((b) => b.count),
      minutes: buckets.map(() => 0),
      totalSessions,
      totalMinutes: Math.round((dailySummary?.totalHoursToday || 0) * 60),
      peakLabel: '-',
      peakCount: 0
    };
  }, [wokwiHistory, dailySummary, selectedDays]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined' || !window.Chart) {
      return;
    }

    // Skip redrawing if chart data & type are identical (eliminates polling flicker)
    const signature = JSON.stringify({
      t: chartType,
      l: chartSeries.labels,
      v: chartSeries.values,
      m: chartSeries.minutes
    });
    if (signature === lastChartSignatureRef.current && chartInstanceRef.current) {
      return;
    }
    lastChartSignatureRef.current = signature;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const ctx2d = canvas.getContext('2d');
    const areaGradient = ctx2d
      ? (() => {
          const g = ctx2d.createLinearGradient(0, 0, 0, 240);
          g.addColorStop(0, 'rgba(30, 117, 72, 0.28)');
          g.addColorStop(1, 'rgba(30, 117, 72, 0.02)');
          return g;
        })()
      : 'rgba(30, 117, 72, 0.16)';

    // Harmonious emerald / teal / blue-green palette for Bar mode (cohesive with Forest Green)
    const barPalette = [
      '#144D32',
      '#1E7548',
      '#0F766E',
      '#0D9488',
      '#0284C7',
      '#059669',
      '#15803D'
    ];
    const barColors = chartSeries.values.map((_, idx) => barPalette[idx % barPalette.length]);
    const maxVal = Math.max(1, ...chartSeries.values);

    // Inline Chart.js plugin: draw clear "X ครั้ง" label above every point/bar
    const valueLabelsPlugin = {
      id: 'chartValueLabels',
      afterDatasetsDraw(chart: {
        ctx: CanvasRenderingContext2D;
        getDatasetMeta: (index: number) => {
          data: Array<{ x: number; y: number }>;
        };
      }) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data) return;
        ctx.save();
        ctx.font = '700 13px "Noto Sans Thai", "Sarabun", sans-serif';
        ctx.fillStyle = '#144D32';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        meta.data.forEach((pt, i) => {
          const val = chartSeries.values[i];
          if (val > 0) {
            ctx.fillText(`${val} ครั้ง`, pt.x, pt.y - 10);
          }
        });
        ctx.restore();
      }
    };

    const datasetConfig =
      chartType === 'line'
        ? {
            label: 'จำนวนครั้งที่ใช้ห้อง',
            data: chartSeries.values,
            borderColor: '#1E7548',
            backgroundColor: areaGradient,
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#1E7548',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2.5
          }
        : {
            label: 'จำนวนครั้งที่ใช้ห้อง',
            data: chartSeries.values,
            backgroundColor: barColors,
            borderRadius: 12,
            maxBarThickness: 72,
            barPercentage: 0.62,
            categoryPercentage: 0.78
          };

    chartInstanceRef.current = new window.Chart(canvas, {
      type: chartType,
      data: {
        labels: chartSeries.labels,
        datasets: [datasetConfig]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: {
          padding: { top: 28, left: 8, right: 16 }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#144D32',
            padding: 12,
            cornerRadius: 10,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            callbacks: {
              label: (ctx: { dataIndex: number; parsed: { y: number } }) => {
                const count = ctx.parsed.y;
                const mins = chartSeries.minutes[ctx.dataIndex] || 0;
                if (mins > 0) {
                  const hrs = Math.floor(mins / 60);
                  const rem = mins % 60;
                  const durStr = hrs > 0 ? `${hrs} ชม. ${rem} นาที` : `${rem} นาที`;
                  return ` เข้าใช้งาน ${count} ครั้ง (รวม ${durStr})`;
                }
                return ` เข้าใช้งาน ${count} ครั้ง`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: maxVal + 1,
            border: { display: false },
            title: {
              display: true,
              text: 'จำนวนครั้ง (รอบ)',
              color: '#4B5563',
              font: { size: 13, weight: 'bold' }
            },
            ticks: {
              stepSize: 1,
              color: '#4B5563',
              font: { size: 13 }
            },
            grid: {
              color: '#E6EFE9'
            }
          },
          x: {
            border: { display: false },
            ticks: {
              color: '#111827',
              font: { size: 13.5, weight: '600' }
            },
            grid: {
              display: false
            }
          }
        }
      },
      plugins: [valueLabelsPlugin]
    });
  }, [chartSeries, chartType]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      lastChartSignatureRef.current = '';
    };
  }, []);

  // Merge /api/status with the newest row in /api/history so even if a new ROOM_ID
  // (e.g. R304 / IOT_R304) isn't registered in the `rooms` sheet yet, the live banner
  // immediately follows the latest Wokwi room, device, and OCCUPIED/EMPTY state!
  const effectiveWokwiStatus = useMemo<WokwiRoomStatusRow | null>(() => {
    let latestHist: WokwiHistoryRow | null = null;
    let latestHistMs = 0;

    for (const row of wokwiHistory) {
      const hasEnd = Boolean(row.end_time && String(row.end_time).trim() !== '');
      const tsStr = hasEnd ? row.end_time : row.start_time;
      const ms = tsStr ? new Date(tsStr).getTime() : 0;
      if (!Number.isNaN(ms) && ms >= latestHistMs) {
        latestHistMs = ms;
        latestHist = row;
      }
    }

    const statusMs = wokwiStatus?.lastUpdated
      ? new Date(wokwiStatus.lastUpdated).getTime()
      : 0;

    const resolved =
      latestHist && latestHistMs > (Number.isNaN(statusMs) ? 0 : statusMs)
        ? (() => {
            const hasEnd = Boolean(latestHist.end_time && String(latestHist.end_time).trim() !== '');
            const num = String(latestHist.room_id || '').replace(/\D/g, '');
            return {
              room_id: latestHist.room_id,
              room_name: num ? `ห้องศึกษากลุ่ม ${num}` : latestHist.room_id,
              status: hasEnd ? 'EMPTY' : 'OCCUPIED',
              lastUpdated: hasEnd ? latestHist.end_time : latestHist.start_time,
              device_id: latestHist.device_id || null,
              device_type: 'PIR_SIMULATION',
              device_lastUpdated: hasEnd ? latestHist.end_time : latestHist.start_time,
              session_start: hasEnd ? null : latestHist.start_time
            };
          })()
        : wokwiStatus;

    if (!resolved) return null;

    // Safeguard: if Wokwi was stopped/restarted before sending EMPTY, don't stay stuck on OCCUPIED forever (> 5 min old)
    if (resolved.status === 'OCCUPIED' && resolved.lastUpdated) {
      const ageMs = Date.now() - new Date(resolved.lastUpdated).getTime();
      if (!Number.isNaN(ageMs) && ageMs > 5 * 60 * 1000) {
        return { ...resolved, status: 'EMPTY' };
      }
    }

    return resolved;
  }, [wokwiStatus, wokwiHistory]);

  const isOccupied = effectiveWokwiStatus?.status === 'OCCUPIED';
  const totalHrs = Math.floor(chartSeries.totalMinutes / 60);
  const totalRemMins = chartSeries.totalMinutes % 60;
  const totalTimeText =
    totalHrs > 0 ? `${totalHrs} ชม. ${totalRemMins} น.` : `${totalRemMins} นาที`;

  return (
    <div className="bg-surface border border-line rounded-[20px] p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-stretch gap-3">
          <span className="w-1.5 rounded-full bg-primary shrink-0" />
          <div>
            <h2 className="text-[20px] font-bold text-ink leading-tight">
              สถิติจำนวนครั้งการเข้าใช้ห้องรายวัน
            </h2>
            <p className="text-[14px] text-ink-secondary mt-0.5">
              กราฟแสดงจำนวนรอบที่มีนักศึกษาเข้าใช้ห้องในแต่ละวัน (ดึงข้อมูลจริงจากฐานข้อมูลอัตโนมัติ)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Style Switcher (Smooth Area Line / Wide Bar) */}
          <div className="inline-flex rounded-xl border border-line bg-subtle p-1 gap-1">
            {(
              [
                { id: 'line', label: 'กราฟเส้น' },
                { id: 'bar', label: 'กราฟแท่ง' }
              ] as Array<{ id: 'line' | 'bar'; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setChartType(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-[13.5px] font-bold transition-colors ${
                  chartType === opt.id
                    ? 'bg-primary text-white'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {wokwiUrl && (
            <div className="inline-flex rounded-xl border border-line bg-subtle p-1 gap-1">
              {[7, 14].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDays(d)}
                  className={`px-3.5 py-1.5 rounded-lg text-[13.5px] font-bold transition-colors ${
                    selectedDays === d
                      ? 'bg-primary text-white'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  ย้อนหลัง {d} วัน
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3 Instant Summary KPIs (Readable at a glance!) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-subtle border border-line rounded-xl px-4 py-3">
          <div className="text-[13px] text-ink-secondary font-medium">
            จำนวนเข้าใช้ทั้งหมด ({selectedDays} วัน)
          </div>
          <div className="text-[22px] font-bold text-primary mt-0.5">
            {chartSeries.totalSessions} ครั้ง
          </div>
        </div>
        <div className="bg-subtle border border-line rounded-xl px-4 py-3">
          <div className="text-[13px] text-ink-secondary font-medium">
            ระยะเวลาใช้งานรวม
          </div>
          <div className="text-[22px] font-bold text-ink mt-0.5">
            {totalTimeText}
          </div>
        </div>
        <div className="bg-subtle border border-line rounded-xl px-4 py-3">
          <div className="text-[13px] text-ink-secondary font-medium">
            วันที่มีคนใช้เยอะที่สุด
          </div>
          <div className="text-[20px] font-bold text-ink mt-0.5">
            {chartSeries.peakCount > 0
              ? `${chartSeries.peakLabel} (${chartSeries.peakCount} ครั้ง)`
              : '-'}
          </div>
        </div>
      </div>

      {/* Live Wokwi Sensor Status Strip */}
      {effectiveWokwiStatus && (
        <div className="bg-primary-light/60 border border-success-border rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[15px] font-bold text-ink">
              เซนเซอร์ห้อง {effectiveWokwiStatus.room_name} ({effectiveWokwiStatus.room_id})
            </span>
            <span
              className={`px-3 py-0.5 rounded-full text-[13px] font-bold ${
                isOccupied
                  ? 'bg-success-bg text-[#14532D]'
                  : 'bg-surface text-[#374151] border border-line'
              }`}
            >
              {isOccupied ? '● มีคนอยู่ในห้อง' : '○ ไม่มีคนในห้อง'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-primary text-white">
              Wokwi Live
            </span>
          </div>

          <div className="text-[13.5px] text-ink-secondary">
            อุปกรณ์: <strong>{effectiveWokwiStatus.device_id || 'IOT_R301'}</strong>
            {effectiveWokwiStatus.lastUpdated && (
              <> · อัปเดต {formatTimeThai(effectiveWokwiStatus.lastUpdated)}</>
            )}
          </div>
        </div>
      )}

      {/* Chart.js Canvas with Value Labels on Top of Every Bar */}
      <div className="h-[260px] w-full">
        <canvas ref={canvasRef} aria-label="กราฟจำนวนครั้งการเข้าใช้ห้องรายวัน" />
      </div>
    </div>
  );
};
