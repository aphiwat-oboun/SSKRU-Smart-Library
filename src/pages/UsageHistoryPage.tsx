/**
 * ============================================================================
 * SRC/PAGES/USAGEHISTORYPAGE.TSX — View 5: Individual & Room Session History
 * ============================================================================
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { EmptyState, ErrorState } from '../components/common/StateBoxes';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableRowsSkeleton } from '../components/skeleton/Skeletons';
import { apiService } from '../services/apiClient';
import { RoomSessionRecord, SessionMemberRecord } from '../types/database';
import {
  formatDateTimeThai,
  formatDurationHoursMinutes
} from '../utils/formatters';

type HistoryTabMode = 'MEMBERS' | 'SESSIONS';

export const UsageHistoryPage: React.FC = () => {
  const [tabMode, setTabMode] = useState<HistoryTabMode>('MEMBERS');
  const [members, setMembers] = useState<SessionMemberRecord[]>([]);
  const [sessions, setSessions] = useState<RoomSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [roomFilter, setRoomFilter] = useState<string>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiService.getUsageHistory();
      setMembers(res.members || []);
      setSessions(res.sessions || []);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'ไม่สามารถโหลดประวัติการใช้งานได้'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      if (floorFilter !== 'ALL' && m.floor_id !== floorFilter) return false;
      if (roomFilter !== 'ALL' && m.room_id !== roomFilter) return false;
      if (reasonFilter !== 'ALL' && m.check_out_reason !== reasonFilter)
        return false;
      if (q) {
        const hay = `${m.student_id} ${m.student_name || ''} ${m.session_id} ${
          m.room_id || ''
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [members, searchQuery, floorFilter, roomFilter, reasonFilter]);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter((s) => {
      if (floorFilter !== 'ALL' && s.floor_id !== floorFilter) return false;
      if (roomFilter !== 'ALL' && s.room_id !== roomFilter) return false;
      if (reasonFilter !== 'ALL' && s.end_reason !== reasonFilter) return false;
      if (q) {
        const hay = `${s.session_id} ${s.room_id} ${(s.student_ids || []).join(
          ' '
        )}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sessions, searchQuery, floorFilter, roomFilter, reasonFilter]);

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[17px] font-bold text-ink">
            ประวัติการเข้าใช้งานห้องค้นคว้า (รายรอบ Session และรายบุคคล)
          </h2>
          <p className="text-[13.5px] text-ink-secondary">
            ตรวจสอบย้อนหลังว่านักศึกษาคนใดเข้าใช้ห้องใด เข้าเวลาใด ออกเวลาใด และใช้เวลาไปกี่ชั่วโมง
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex bg-subtle border border-line rounded-full p-1 gap-1">
            <button
              type="button"
              onClick={() => setTabMode('MEMBERS')}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                tabMode === 'MEMBERS'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              ประวัติรายบุคคล (Session_Members)
            </button>
            <button
              type="button"
              onClick={() => setTabMode('SESSIONS')}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                tabMode === 'SESSIONS'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              ประวัติรายรอบห้อง (Room_Sessions)
            </button>
          </div>

          <button
            type="button"
            onClick={() => void loadHistory()}
            className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm font-semibold text-ink hover:bg-subtle inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหารหัสนักศึกษา ชื่อ หรือรหัส Session..."
            className="w-full h-10 pl-10 pr-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={floorFilter}
          onChange={(e) => setFloorFilter(e.target.value)}
          className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
        >
          <option value="ALL">ทุกชั้น</option>
          <option value="FL3">ชั้น 3 (ห้อง 301-306)</option>
          <option value="FL5">ชั้น 5 (ห้อง 501-504)</option>
        </select>

        <select
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
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

        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
        >
          <option value="ALL">ทุกสถานะการจบ</option>
          <option value="NORMAL_CHECKOUT">
            คืนกุญแจปกติ (NORMAL_CHECKOUT)
          </option>
          <option value="SESSION_END">จบพร้อมกลุ่ม (SESSION_END)</option>
          <option value="AUTO_EMPTY">
            ตัดจบอัตโนมัติ ห้องว่าง 5 นาที (AUTO_EMPTY)
          </option>
          <option value="EARLY_LEAVE">ออกก่อนรายบุคคล (EARLY_LEAVE)</option>
          <option value="STAFF_FORCED">เจ้าหน้าที่สั่งปิด (STAFF_FORCED)</option>
        </select>
      </div>

      {isLoading && <TableRowsSkeleton cols={8} rows={6} />}

      {!isLoading && errorMsg && (
        <ErrorState message={errorMsg} onRetry={() => void loadHistory()} />
      )}

      {!isLoading && !errorMsg && tabMode === 'MEMBERS' && (
        <>
          {filteredMembers.length === 0 ? (
            <EmptyState
              title="ไม่พบประวัติการใช้งานรายบุคคล"
              description="ลองปรับตัวกรองห้องหรือคำค้นหาใหม่"
            />
          ) : (
            <div className="w-full overflow-x-auto border border-line rounded-xl">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-subtle text-ink-secondary text-[13px] font-semibold border-b border-line">
                    <th className="px-4 py-3 whitespace-nowrap">รหัสนักศึกษา</th>
                    <th className="px-4 py-3 whitespace-nowrap">ชื่อ-นามสกุล</th>
                    <th className="px-4 py-3 whitespace-nowrap">ห้องที่ใช้</th>
                    <th className="px-4 py-3 whitespace-nowrap">Session ID</th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      เวลาเข้า (Check-in)
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      เวลาออก (Check-out)
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">เวลาที่ใช้ไป</th>
                    <th className="px-4 py-3 whitespace-nowrap">สาเหตุการออก</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.slice(0, 100).map((m) => (
                    <tr
                      key={m.member_id}
                      className="border-b border-line last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3.5 font-bold text-ink">
                        {m.student_id}
                      </td>
                      <td className="px-4 py-3.5 text-ink">
                        {m.student_name || '-'}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-ink">
                        {m.room_name || m.room_id}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono">
                        {m.session_id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3.5">
                        {formatDateTimeThai(m.check_in_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        {m.check_out_at ? (
                          formatDateTimeThai(m.check_out_at)
                        ) : (
                          <StatusBadge
                            status="OCCUPIED"
                            customLabel="กำลังใช้งาน"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-ink">
                        {formatDurationHoursMinutes(m.usage_seconds)}
                      </td>
                      <td className="px-4 py-3.5">
                        {m.check_out_reason || 'กำลังใช้งาน'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!isLoading && !errorMsg && tabMode === 'SESSIONS' && (
        <>
          {filteredSessions.length === 0 ? (
            <EmptyState
              title="ไม่พบประวัติรอบการใช้ห้อง"
              description="ลองปรับตัวกรองใหม่"
            />
          ) : (
            <div className="w-full overflow-x-auto border border-line rounded-xl">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-subtle text-ink-secondary text-[13px] font-semibold border-b border-line">
                    <th className="px-4 py-3 whitespace-nowrap">Session ID</th>
                    <th className="px-4 py-3 whitespace-nowrap">ห้อง</th>
                    <th className="px-4 py-3">รหัสนักศึกษาในกลุ่ม (3 คน)</th>
                    <th className="px-4 py-3 whitespace-nowrap">เวลาเริ่ม</th>
                    <th className="px-4 py-3 whitespace-nowrap">เวลาสิ้นสุด</th>
                    <th className="px-4 py-3 whitespace-nowrap">ระยะเวลารวม</th>
                    <th className="px-4 py-3 whitespace-nowrap">สาเหตุการจบ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.slice(0, 100).map((s) => (
                    <tr
                      key={s.session_id}
                      className="border-b border-line last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3.5 text-xs font-mono font-semibold">
                        {s.session_id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3.5 font-bold text-ink">
                        {s.room_name || s.room_id}
                      </td>
                      <td className="px-4 py-3.5 text-ink">
                        {(s.student_ids || []).join(', ')}
                      </td>
                      <td className="px-4 py-3.5">
                        {formatDateTimeThai(s.start_time)}
                      </td>
                      <td className="px-4 py-3.5">
                        {s.actual_end_time ? (
                          formatDateTimeThai(s.actual_end_time)
                        ) : (
                          <StatusBadge status="OCCUPIED" customLabel="ACTIVE" />
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-ink">
                        {formatDurationHoursMinutes(s.duration_seconds)}
                      </td>
                      <td className="px-4 py-3.5">
                        {s.end_reason || 'กำลังใช้งาน'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
