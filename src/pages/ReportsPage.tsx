/**
 * ============================================================================
 * SRC/PAGES/REPORTSPAGE.TSX — View 6: Analytics & Usage Reports (Section 17)
 * Mandatory Skeleton Loading: ReportSummarySkeleton
 * ============================================================================
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Bot,
  Calendar,
  Clock,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  Trophy
} from 'lucide-react';
import { ErrorState } from '../components/common/StateBoxes';
import { ReportSummarySkeleton } from '../components/skeleton/Skeletons';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from '../hooks/useToast';
import { apiService } from '../services/apiClient';
import {
  AnalyticsReportResponse,
  RoomBreakdownStat,
  UsageHistoryResponse
} from '../types/api';

type UsageHistoryRow = UsageHistoryResponse['sessions'][number];
import { formatDurationHoursMinutes } from '../utils/formatters';

function escapeCsvCell(val: string | number | undefined | null): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const ReportsPage: React.FC = () => {
  const { dashboardData } = useAppContext();
  const { showToast } = useToast();
  const allRooms = dashboardData?.rooms || [];

  const now = new Date();
  const defaultFirstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const defaultToday = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(defaultFirstDay);
  const [endDate, setEndDate] = useState<string>(defaultToday);
  const [floorId, setFloorId] = useState<string>('ALL');
  const [roomId, setRoomId] = useState<string>('ALL');

  const [report, setReport] = useState<AnalyticsReportResponse | null>(null);
  const [historyRows, setHistoryRows] = useState<UsageHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [res, histRes] = await Promise.all([
        apiService.getAnalyticsReport({
          startDate,
          endDate,
          floorId,
          roomId
        }),
        apiService.getUsageHistory().catch(() => ({
          sessions: [] as UsageHistoryRow[]
        }))
      ]);
      setReport(res);
      setHistoryRows(histRes.sessions || []);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'ไม่สามารถโหลดรายงานได้'
      );
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, floorId, roomId]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  // Build room breakdown automatically from usage history if backend returns empty breakdown
  const effectiveBreakdown = useMemo<RoomBreakdownStat[]>(() => {
    if (report?.roomBreakdown && report.roomBreakdown.length > 0) {
      return report.roomBreakdown;
    }
    const map = new Map<string, RoomBreakdownStat>();
    for (const r of allRooms) {
      if (floorId !== 'ALL' && r.floor_id !== floorId) continue;
      if (roomId !== 'ALL' && r.room_id !== roomId) continue;
      map.set(r.room_id, {
        room_id: r.room_id,
        room_name: r.room_name,
        floor_id: r.floor_id,
        total_sessions: 0,
        total_duration_seconds: 0,
        avg_duration_seconds: 0,
        auto_empty_count: 0,
        overdue_alert_count: 0
      });
    }
    for (const h of historyRows) {
      const cur = map.get(h.room_id) || {
        room_id: h.room_id,
        room_name: h.room_name || h.room_id,
        floor_id: 'FL3',
        total_sessions: 0,
        total_duration_seconds: 0,
        avg_duration_seconds: 0,
        auto_empty_count: 0,
        overdue_alert_count: 0
      };
      cur.total_sessions += 1;
      cur.total_duration_seconds += Number(h.duration_seconds) || 0;
      if (h.end_reason === 'AUTO_EMPTY') cur.auto_empty_count += 1;
      map.set(h.room_id, cur);
    }
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        avg_duration_seconds:
          item.total_sessions > 0
            ? Math.round(item.total_duration_seconds / item.total_sessions)
            : 0
      }))
      .sort((a, b) => b.total_sessions - a.total_sessions);
  }, [report, allRooms, historyRows, floorId, roomId]);

  const handleExportCsv = () => {
    if (!report) return;
    const lines: string[] = [
      ['รายงานสรุปสถิติการใช้ห้องประชุม SSKRU Smart Library'].map(escapeCsvCell).join(','),
      ['ช่วงวันที่', `${startDate} ถึง ${endDate}`].map(escapeCsvCell).join(','),
      '',
      ['หัวข้อสรุป', 'ค่าสถิติ'].map(escapeCsvCell).join(','),
      ['จำนวนการใช้ห้องรายวัน (วันนี้)', `${Number(report.dailyUsageCount) || 0} ครั้ง`].map(escapeCsvCell).join(','),
      ['จำนวนการใช้ห้องรายเดือน (เดือนนี้)', `${Number(report.monthlyUsageCount) || 0} ครั้ง`].map(escapeCsvCell).join(','),
      ['ห้องที่มีการใช้งานมากที่สุด', report.mostUsedRoomName || '-'].map(escapeCsvCell).join(','),
      ['ระยะเวลาการใช้ห้องเฉลี่ย', formatDurationHoursMinutes(report.averageDurationSeconds || 0)].map(escapeCsvCell).join(','),
      ['จบอัตโนมัติ (AUTO_EMPTY)', `${Number(report.autoEmptyCount) || 0} ครั้ง`].map(escapeCsvCell).join(','),
      ['แจ้งเตือนเกิน 3 ชั่วโมง', `${Number(report.overdueAlertCount) || 0} ครั้ง`].map(escapeCsvCell).join(','),
      '',
      ['อันดับ', 'ห้อง', 'ชั้น', 'จำนวนรอบเข้าใช้ (ครั้ง)', 'เวลารวม', 'เวลาเฉลี่ยต่อรอบ', 'จบอัตโนมัติ', 'แจ้งเตือนเกิน 3 ชม.'].map(escapeCsvCell).join(',')
    ];

    effectiveBreakdown.forEach((r, idx) => {
      lines.push(
        [
          idx + 1,
          r.room_name,
          r.floor_id === 'FL5' ? 'ชั้น 5' : 'ชั้น 3',
          Number(r.total_sessions) || 0,
          formatDurationHoursMinutes(r.total_duration_seconds),
          formatDurationHoursMinutes(r.avg_duration_seconds),
          Number(r.auto_empty_count) || 0,
          Number(r.overdue_alert_count) || 0
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    });

    // UTF-8 BOM so Thai characters open cleanly in Excel & Google Sheets
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;'
    });
    triggerDownload(blob, `SSKRU_Library_Report_${startDate}_to_${endDate}.csv`);
    showToast('ส่งออกไฟล์ CSV สำหรับ Google Sheets / Excel เรียบร้อยแล้ว', 'success');
  };

  const handleExportExcel = () => {
    if (!report) return;
    const rowsHtml = effectiveBreakdown
      .map(
        (r, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${r.room_name}</td>
        <td>${r.floor_id === 'FL5' ? 'ชั้น 5' : 'ชั้น 3'}</td>
        <td style="text-align:right;">${Number(r.total_sessions) || 0}</td>
        <td>${formatDurationHoursMinutes(r.total_duration_seconds)}</td>
        <td>${formatDurationHoursMinutes(r.avg_duration_seconds)}</td>
        <td style="text-align:right;">${Number(r.auto_empty_count) || 0}</td>
        <td style="text-align:right;">${Number(r.overdue_alert_count) || 0}</td>
      </tr>`
      )
      .join('');

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8" /></head>
      <body style="font-family: 'Sarabun', sans-serif;">
        <h2>รายงานสถิติการใช้ห้องประชุม — ห้องสมุด มรภ.ศรีสะเกษ</h2>
        <p>ช่วงวันที่: ${startDate} ถึง ${endDate}</p>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; margin-bottom:16px;">
          <tr style="background:#144D32; color:#ffffff; font-weight:bold;">
            <th>รายการสรุป</th><th>ค่าสถิติ</th>
          </tr>
          <tr><td>จำนวนการใช้ห้องรายวัน (วันนี้)</td><td>${Number(report.dailyUsageCount) || 0} ครั้ง</td></tr>
          <tr><td>จำนวนการใช้ห้องรายเดือน (เดือนนี้)</td><td>${Number(report.monthlyUsageCount) || 0} ครั้ง</td></tr>
          <tr><td>ห้องที่มีการใช้งานมากที่สุด</td><td>${report.mostUsedRoomName || '-'}</td></tr>
          <tr><td>ระยะเวลาการใช้ห้องเฉลี่ย</td><td>${formatDurationHoursMinutes(report.averageDurationSeconds || 0)}</td></tr>
          <tr><td>จบอัตโนมัติ (AUTO_EMPTY)</td><td>${Number(report.autoEmptyCount) || 0} ครั้ง</td></tr>
          <tr><td>แจ้งเตือนเกิน 3 ชั่วโมง</td><td>${Number(report.overdueAlertCount) || 0} ครั้ง</td></tr>
        </table>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
          <tr style="background:#1E7548; color:#ffffff; font-weight:bold;">
            <th>อันดับ</th><th>ห้อง</th><th>ชั้น</th><th>จำนวนรอบเข้าใช้</th><th>เวลารวมทั้งหมด</th><th>เวลาเฉลี่ยต่อรอบ</th><th>จบอัตโนมัติ</th><th>แจ้งเตือนเกิน 3 ชม.</th>
          </tr>
          ${rowsHtml}
        </table>
      </body></html>`;

    const blob = new Blob(['\uFEFF' + html], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    });
    triggerDownload(blob, `SSKRU_Library_Report_${startDate}_to_${endDate}.xls`);
    showToast('ส่งออกไฟล์ Excel (.xls) เรียบร้อยแล้ว', 'success');
  };

  return (
    <div className="bg-surface border border-line rounded-[24px] p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-stretch gap-3.5">
          <span className="w-1.5 rounded-full bg-primary shrink-0" />
          <div>
            <h1 className="text-[24px] sm:text-[26px] font-bold text-ink leading-tight">
              รายงานและสถิติการใช้ห้องประชุม
            </h1>
            <p className="text-[14.5px] text-ink-secondary mt-1">
              สรุปจำนวนการใช้ห้องรายวัน/รายเดือน ห้องยอดนิยม และส่งออกเป็นไฟล์สรุปได้ทันที
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!report || isLoading}
            className="h-10 px-3.5 rounded-xl border border-success-border bg-primary-light hover:bg-primary text-primary hover:text-white text-[13.5px] font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก Google Sheets (.csv)</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!report || isLoading}
            className="h-10 px-3.5 rounded-xl border border-line-strong bg-surface hover:bg-subtle text-ink text-[13.5px] font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-primary" />
            <span>ส่งออก Excel (.xls)</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!report || isLoading}
            className="h-10 px-3.5 rounded-xl border border-line-strong bg-surface hover:bg-subtle text-ink text-[13.5px] font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-ink-secondary" />
            <span>พิมพ์ / PDF</span>
          </button>
          <button
            type="button"
            onClick={() => void loadReports()}
            className="h-10 px-4 rounded-xl bg-primary text-white text-[13.5px] font-bold hover:bg-primary-hover inline-flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>อัปเดต</span>
          </button>
        </div>
      </div>

      {/* Filters by Date, Floor & Room */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label
            htmlFor="repStartDate"
            className="text-[13px] font-semibold text-ink"
          >
            ตั้งแต่วันที่:
          </label>
          <input
            id="repStartDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 px-3 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="repEndDate"
            className="text-[13px] font-semibold text-ink"
          >
            ถึงวันที่:
          </label>
          <input
            id="repEndDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 px-3 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={floorId}
          onChange={(e) => setFloorId(e.target.value)}
          className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
        >
          <option value="ALL">ทุกชั้น</option>
          <option value="FL3">ชั้น 3</option>
          <option value="FL5">ชั้น 5</option>
        </select>

        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
        >
          <option value="ALL">ทุกห้อง</option>
          {allRooms.map((rm) => (
            <option key={rm.room_id} value={rm.room_id}>
              {rm.room_name}
            </option>
          ))}
        </select>
      </div>

      {/* Report Summary with Mandatory Skeleton Loading */}
      {isLoading && <ReportSummarySkeleton />}

      {!isLoading && errorMsg && (
        <ErrorState message={errorMsg} onRetry={() => void loadReports()} />
      )}

      {!isLoading && !errorMsg && report && (
        <div className="space-y-6">
          {/* 6 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-ink-secondary">
                  จำนวนการใช้ห้องรายวัน (วันนี้)
                </div>
                <div className="text-2xl font-bold text-ink">
                  {Number(report.dailyUsageCount) || 0} ครั้ง
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-ink-secondary">
                  จำนวนการใช้ห้องรายเดือน (เดือนนี้)
                </div>
                <div className="text-2xl font-bold text-ink">
                  {Number(report.monthlyUsageCount) || 0} ครั้ง
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success-bg text-success flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-ink-secondary">
                  ห้องที่มีการใช้งานมากที่สุด
                </div>
                <div className="text-xl font-bold text-ink">
                  {report.mostUsedRoomName || '-'}
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-ink-secondary">
                  ระยะเวลาการใช้ห้องเฉลี่ย
                </div>
                <div className="text-2xl font-bold text-ink">
                  {formatDurationHoursMinutes(report.averageDurationSeconds || 0)}
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning-bg text-warning-text flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-ink-secondary">
                  จบอัตโนมัติ (AUTO_EMPTY)
                </div>
                <div className="text-2xl font-bold text-ink">
                  {Number(report.autoEmptyCount) || 0} ครั้ง
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-danger-bg text-danger flex items-center justify-center shrink-0">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-ink-secondary">
                  แจ้งเตือนเกิน 3 ชั่วโมง (มีผู้รอ)
                </div>
                <div className="text-2xl font-bold text-ink">
                  {Number(report.overdueAlertCount) || 0} ครั้ง
                </div>
              </div>
            </div>
          </div>

          {/* Room Breakdown Table */}
          <div>
            <h3 className="text-base font-bold text-ink mb-3">
              ตารางจัดอันดับและสรุปสถิติรายห้อง
            </h3>
            <div className="w-full overflow-x-auto border border-line rounded-xl">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-subtle text-ink-secondary text-[13px] font-semibold border-b border-line">
                    <th className="px-4 py-3 whitespace-nowrap">อันดับ</th>
                    <th className="px-4 py-3 whitespace-nowrap">ห้อง</th>
                    <th className="px-4 py-3 whitespace-nowrap">ชั้น</th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      จำนวนรอบเข้าใช้
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      เวลารวมทั้งหมด
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      เวลาเฉลี่ยต่อรอบ
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      จบด้วย AUTO_EMPTY
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      แจ้งเตือนเกิน 3 ชม.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveBreakdown.map((r, i) => (
                    <tr
                      key={r.room_id}
                      className="border-b border-line last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3.5 font-bold text-ink">
                        #{i + 1}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-ink">
                        {r.room_name}
                      </td>
                      <td className="px-4 py-3.5">
                        {r.floor_id === 'FL3' ? 'ชั้น 3' : 'ชั้น 5'}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-ink">
                        {Number(r.total_sessions) || 0} ครั้ง
                      </td>
                      <td className="px-4 py-3.5">
                        {formatDurationHoursMinutes(r.total_duration_seconds)}
                      </td>
                      <td className="px-4 py-3.5">
                        {formatDurationHoursMinutes(r.avg_duration_seconds)}
                      </td>
                      <td className="px-4 py-3.5">
                        {Number(r.auto_empty_count) || 0} ครั้ง
                      </td>
                      <td className="px-4 py-3.5">
                        {Number(r.overdue_alert_count) || 0} ครั้ง
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
