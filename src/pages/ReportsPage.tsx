/**
 * ============================================================================
 * SRC/PAGES/REPORTSPAGE.TSX — View 6: Analytics & Usage Reports (Section 17)
 * Mandatory Skeleton Loading: ReportSummarySkeleton
 * ============================================================================
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  Bot,
  Calendar,
  Clock,
  RefreshCw,
  Trophy
} from 'lucide-react';
import { ErrorState } from '../components/common/StateBoxes';
import { ReportSummarySkeleton } from '../components/skeleton/Skeletons';
import { apiService } from '../services/apiClient';
import { AnalyticsReportResponse } from '../types/api';
import { formatDurationHoursMinutes } from '../utils/formatters';

export const ReportsPage: React.FC = () => {
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiService.getAnalyticsReport({
        startDate,
        endDate,
        floorId,
        roomId
      });
      setReport(res);
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

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[17px] font-bold text-ink">
            รายงานและสถิติการใช้ห้องค้นคว้า
          </h2>
          <p className="text-[13.5px] text-ink-secondary">
            สรุปจำนวนการใช้ห้องรายวัน/รายเดือน ห้องยอดนิยม เวลาเฉลี่ย จำนวน AUTO_EMPTY และการแจ้งเตือนเกิน 3 ชั่วโมง
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadReports()}
          className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>ประมวลผลรายงาน</span>
        </button>
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
          <option value="FL3">ชั้น 3 (6 ห้อง)</option>
          <option value="FL5">ชั้น 5 (4 ห้อง)</option>
        </select>

        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
        >
          <option value="ALL">ทุกห้อง</option>
          <option value="R301">ห้อง 301</option>
          <option value="R302">ห้อง 302</option>
          <option value="R303">ห้อง 303</option>
          <option value="R304">ห้อง 304</option>
          <option value="R305">ห้อง 305</option>
          <option value="R306">ห้อง 306</option>
          <option value="R501">ห้อง 501</option>
          <option value="R502">ห้อง 502</option>
          <option value="R503">ห้อง 503</option>
          <option value="R504">ห้อง 504</option>
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
                  {(report.roomBreakdown || []).map((r, i) => (
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
