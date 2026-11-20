/**
 * ============================================================================
 * SRC/PAGES/USAGEHISTORYPAGE.TSX — Professional Usage History & Student Insights
 * Displays top student, top year level, top faculty, top major, student ranking,
 * and clean searchable room usage history.
 * ============================================================================
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, Building2, GraduationCap, Layers, RefreshCw, Search } from 'lucide-react';
import { EmptyState, ErrorState } from '../components/common/StateBoxes';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableRowsSkeleton } from '../components/skeleton/Skeletons';
import { useAppContext } from '../hooks/useAppContext';
import { apiService, getCachedRpc } from '../services/apiClient';
import { UsageHistoryResponse } from '../types/api';
import { RoomSessionRecord, StudentMasterRecord } from '../types/database';
import {
  formatDateTimeThai,
  formatDurationHoursMinutes
} from '../utils/formatters';

interface StudentUsageStat {
  student_id: string;
  student_name: string;
  student_year: number;
  faculty_name: string;
  major_name: string;
  count: number;
  totalSeconds: number;
}

function getTopEntry(map: Map<string, number>): { label: string; count: number } | null {
  let topLabel = '';
  let topCount = 0;
  for (const [k, v] of map.entries()) {
    if (v > topCount) {
      topCount = v;
      topLabel = k;
    }
  }
  return topCount > 0 ? { label: topLabel, count: topCount } : null;
}

export const UsageHistoryPage: React.FC = () => {
  const { openStudentDetailModal } = useAppContext();

  const cachedHistory = getCachedRpc<UsageHistoryResponse>('getUsageHistory');
  const cachedStudents = getCachedRpc<{ students: StudentMasterRecord[] }>('getStudentsMaster');

  const [sessions, setSessions] = useState<RoomSessionRecord[]>(cachedHistory?.sessions || []);
  const [students, setStudents] = useState<StudentMasterRecord[]>(cachedStudents?.students || []);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedHistory);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roomFilter, setRoomFilter] = useState<string>('ALL');

  const loadData = useCallback(async () => {
    if (!getCachedRpc('getUsageHistory')) {
      setIsLoading(true);
    }
    setErrorMsg(null);
    try {
      const [histRes, stuRes] = await Promise.all([
        apiService.getUsageHistory(),
        apiService.getStudentsMaster().catch(() => ({ students: [] as StudentMasterRecord[] }))
      ]);
      setSessions(histRes.sessions || []);
      if (stuRes.students && stuRes.students.length > 0) {
        setStudents(stuRes.students);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'ไม่สามารถโหลดประวัติการใช้งานได้'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Map student_id -> StudentMasterRecord for rich insights
  const studentMap = useMemo(() => {
    const map = new Map<string, StudentMasterRecord>();
    for (const s of students) {
      map.set(String(s.student_id), s);
    }
    return map;
  }, [students]);

  // Compute Top Student, Top Year, Top Faculty, Top Major from real usage_history!
  const insights = useMemo(() => {
    const stuCountMap = new Map<string, StudentUsageStat>();
    const yearMap = new Map<string, number>();
    const facultyMap = new Map<string, number>();
    const majorMap = new Map<string, number>();

    for (const sess of sessions) {
      const dur = Number(sess.duration_seconds) || 0;
      const ids = sess.student_ids || [];
      for (const sid of ids) {
        const cleanId = String(sid).trim();
        if (!cleanId) continue;
        const info = studentMap.get(cleanId);
        const cur = stuCountMap.get(cleanId) || {
          student_id: cleanId,
          student_name: info?.student_name || cleanId,
          student_year: info?.student_year || 0,
          faculty_name: info?.faculty_name || '-',
          major_name: info?.major_name || '-',
          count: 0,
          totalSeconds: 0
        };
        cur.count += 1;
        cur.totalSeconds += dur;
        stuCountMap.set(cleanId, cur);

        if (info?.student_year) {
          const yKey = `ชั้นปีที่ ${info.student_year}`;
          yearMap.set(yKey, (yearMap.get(yKey) || 0) + 1);
        }
        if (info?.faculty_name && info.faculty_name !== '-') {
          facultyMap.set(info.faculty_name, (facultyMap.get(info.faculty_name) || 0) + 1);
        }
        if (info?.major_name && info.major_name !== '-') {
          majorMap.set(info.major_name, (majorMap.get(info.major_name) || 0) + 1);
        }
      }
    }

    const ranking = Array.from(stuCountMap.values()).sort(
      (a, b) => b.count - a.count || b.totalSeconds - a.totalSeconds
    );

    return {
      topStudent: ranking[0] || null,
      topYear: getTopEntry(yearMap),
      topFaculty: getTopEntry(facultyMap),
      topMajor: getTopEntry(majorMap),
      ranking
    };
  }, [sessions, studentMap]);

  const uniqueRooms = useMemo(
    () =>
      Array.from(
        new Set(sessions.map((s) => s.room_name || s.room_id).filter(Boolean))
      ).sort(),
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter((s) => {
      const rName = s.room_name || s.room_id;
      if (roomFilter !== 'ALL' && rName !== roomFilter) return false;
      if (q) {
        const studentNames = (s.student_ids || [])
          .map((id) => {
            const st = studentMap.get(id);
            return `${id} ${st?.student_name || ''} ${st?.faculty_name || ''} ${st?.major_name || ''}`;
          })
          .join(' ');
        const hay = `${rName} ${studentNames}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sessions, searchQuery, roomFilter, studentMap]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-stretch gap-3.5">
          <span className="w-1.5 rounded-full bg-primary shrink-0" />
          <div>
            <h1 className="text-[28px] font-bold text-ink leading-tight">
              ประวัติและสถิติการใช้งานห้อง
            </h1>
            <p className="text-[15px] text-ink-secondary mt-1">
              สรุปภาพรวมนักศึกษา ชั้นปี คณะ และสาขาที่เข้าใช้ห้องบ่อยที่สุด พร้อมประวัติย้อนหลังทั้งหมด
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="h-11 px-4 rounded-xl border border-line-strong bg-surface text-[15px] font-bold text-ink hover:bg-subtle inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>รีเฟรช</span>
        </button>
      </div>

      {/* 4 Executive Insight Cards (Top Student / Year / Faculty / Major) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-surface border border-line rounded-[20px] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-primary">
            <Award className="w-5 h-5" />
            <span>นักศึกษาที่ใช้บ่อยที่สุด</span>
          </div>
          {insights.topStudent ? (
            <div className="mt-2">
              <div className="text-[19px] font-bold text-ink leading-snug truncate">
                {insights.topStudent.student_name}
              </div>
              <div className="text-[14px] text-ink-secondary mt-0.5">
                รหัส {insights.topStudent.student_id} · ใช้ {insights.topStudent.count} ครั้ง
              </div>
            </div>
          ) : (
            <div className="text-[16px] text-ink-muted mt-2">ยังไม่มีข้อมูล</div>
          )}
        </div>

        <div className="bg-surface border border-line rounded-[20px] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#2563EB]">
            <Layers className="w-5 h-5" />
            <span>ชั้นปีที่ใช้เยอะที่สุด</span>
          </div>
          {insights.topYear ? (
            <div className="mt-2">
              <div className="text-[22px] font-bold text-ink leading-snug">
                {insights.topYear.label}
              </div>
              <div className="text-[14px] text-ink-secondary mt-0.5">
                เข้าใช้งานรวม {insights.topYear.count} ครั้ง
              </div>
            </div>
          ) : (
            <div className="text-[16px] text-ink-muted mt-2">ยังไม่มีข้อมูล</div>
          )}
        </div>

        <div className="bg-surface border border-line rounded-[20px] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#7C3AED]">
            <Building2 className="w-5 h-5" />
            <span>คณะที่ใช้บ่อยที่สุด</span>
          </div>
          {insights.topFaculty ? (
            <div className="mt-2">
              <div className="text-[18px] font-bold text-ink leading-snug line-clamp-1">
                {insights.topFaculty.label}
              </div>
              <div className="text-[14px] text-ink-secondary mt-0.5">
                เข้าใช้งานรวม {insights.topFaculty.count} ครั้ง
              </div>
            </div>
          ) : (
            <div className="text-[16px] text-ink-muted mt-2">ยังไม่มีข้อมูล</div>
          )}
        </div>

        <div className="bg-surface border border-line rounded-[20px] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#D97706]">
            <GraduationCap className="w-5 h-5" />
            <span>สาขาวิชาที่ใช้บ่อยที่สุด</span>
          </div>
          {insights.topMajor ? (
            <div className="mt-2">
              <div className="text-[18px] font-bold text-ink leading-snug line-clamp-1">
                {insights.topMajor.label}
              </div>
              <div className="text-[14px] text-ink-secondary mt-0.5">
                เข้าใช้งานรวม {insights.topMajor.count} ครั้ง
              </div>
            </div>
          ) : (
            <div className="text-[16px] text-ink-muted mt-2">ยังไม่มีข้อมูล</div>
          )}
        </div>
      </div>

      {/* Top Student Ranking Table (Who uses the rooms most) */}
      {insights.ranking.length > 0 && (
        <div className="bg-surface border border-line rounded-[20px] p-6 shadow-sm">
          <h2 className="text-[19px] font-bold text-ink mb-4">
            อันดับนักศึกษาที่เข้าใช้ห้องบ่อยที่สุด
          </h2>
          <div className="w-full overflow-x-auto border border-line rounded-xl">
            <table className="w-full border-collapse text-left text-[15px]">
              <thead>
                <tr className="bg-subtle text-ink-secondary text-[14px] font-bold border-b border-line">
                  <th className="px-4 py-3 w-16 text-center">อันดับ</th>
                  <th className="px-4 py-3">รหัสนักศึกษา</th>
                  <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                  <th className="px-4 py-3">ชั้นปี</th>
                  <th className="px-4 py-3">คณะ / สาขาวิชา</th>
                  <th className="px-4 py-3 text-right">จำนวนครั้ง</th>
                  <th className="px-4 py-3 text-right">เวลารวม</th>
                </tr>
              </thead>
              <tbody>
                {insights.ranking.slice(0, 5).map((st, idx) => (
                  <tr
                    key={st.student_id}
                    onClick={() => openStudentDetailModal(st.student_id)}
                    className="border-b border-line last:border-b-0 hover:bg-subtle/70 cursor-pointer"
                  >
                    <td className="px-4 py-3.5 text-center font-bold text-primary">
                      #{idx + 1}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-ink">{st.student_id}</td>
                    <td className="px-4 py-3.5 font-semibold text-ink">{st.student_name}</td>
                    <td className="px-4 py-3.5 text-ink">
                      {st.student_year ? `ปี ${st.student_year}` : '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-ink font-medium">{st.faculty_name}</div>
                      <div className="text-[13.5px] text-ink-secondary">{st.major_name}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-primary">
                      {st.count} ครั้ง
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-ink">
                      {formatDurationHoursMinutes(st.totalSeconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Room Session History Table */}
      <div className="bg-surface border border-line rounded-[20px] p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[19px] font-bold text-ink">
            ประวัติการเข้าใช้ห้องทั้งหมด ({filteredSessions.length} รอบ)
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ รหัส นศ. คณะ สาขา..."
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-line-strong bg-surface text-[15px] text-ink focus:outline-none focus:border-primary"
              />
            </div>

            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="h-11 px-4 rounded-xl border border-line-strong bg-surface text-[15px] text-ink focus:outline-none focus:border-primary"
            >
              <option value="ALL">ทุกห้อง</option>
              {uniqueRooms.map((rm) => (
                <option key={rm} value={rm}>
                  {rm}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading && <TableRowsSkeleton cols={5} rows={5} />}

        {!isLoading && errorMsg && (
          <ErrorState message={errorMsg} onRetry={() => void loadData()} />
        )}

        {!isLoading && !errorMsg && filteredSessions.length === 0 && (
          <EmptyState
            title="ยังไม่มีประวัติการใช้งานห้อง"
            description="เมื่อมีการให้กุญแจและคืนกุญแจ ระบบจะบันทึกประวัติและสรุปสถิติที่นี่อัตโนมัติ"
          />
        )}

        {!isLoading && !errorMsg && filteredSessions.length > 0 && (
          <div className="w-full overflow-x-auto border border-line rounded-xl">
            <table className="w-full border-collapse text-left text-[15px]">
              <thead>
                <tr className="bg-subtle text-ink-secondary text-[14px] font-bold border-b border-line">
                  <th className="px-4 py-3 whitespace-nowrap">ห้อง</th>
                  <th className="px-4 py-3">ผู้เข้าใช้งาน (รหัส / ชื่อ / คณะ)</th>
                  <th className="px-4 py-3 whitespace-nowrap">เวลาเริ่ม</th>
                  <th className="px-4 py-3 whitespace-nowrap">เวลาออก</th>
                  <th className="px-4 py-3 whitespace-nowrap">ระยะเวลา</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.slice(0, 100).map((s) => (
                  <tr
                    key={s.session_id}
                    className="border-b border-line last:border-b-0 hover:bg-subtle/60"
                  >
                    <td className="px-4 py-3.5 font-bold text-ink whitespace-nowrap">
                      {s.room_name || s.room_id}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {(s.student_ids || []).length === 0 ? (
                          <span className="text-ink-secondary">-</span>
                        ) : (
                          (s.student_ids || []).map((sid) => {
                            const info = studentMap.get(sid);
                            return (
                              <button
                                key={sid}
                                type="button"
                                onClick={() => openStudentDetailModal(sid)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary-light text-[#144D32] text-[13.5px] font-semibold hover:bg-primary hover:text-white transition-colors"
                              >
                                <span>{info ? `${info.student_name} (${sid})` : sid}</span>
                                {info?.student_year ? (
                                  <span className="opacity-75">· ปี {info.student_year}</span>
                                ) : null}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-ink">
                      {formatDateTimeThai(s.start_time)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-ink">
                      {s.actual_end_time ? (
                        formatDateTimeThai(s.actual_end_time)
                      ) : (
                        <StatusBadge status="OCCUPIED" customLabel="กำลังใช้งาน" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-bold text-primary">
                      {formatDurationHoursMinutes(s.duration_seconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
