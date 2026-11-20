/**
 * ============================================================================
 * SRC/PAGES/STUDENTSPAGE.TSX — View 3: Student Master Data & RFID Cards
 * Mandatory Skeleton Loading: TableRowsSkeleton
 * ============================================================================
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, UserPlus } from 'lucide-react';
import { EmptyState, ErrorState } from '../components/common/StateBoxes';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableRowsSkeleton } from '../components/skeleton/Skeletons';
import { useAppContext } from '../hooks/useAppContext';
import { apiService } from '../services/apiClient';
import { StudentMasterRecord } from '../types/database';

export const StudentsPage: React.FC = () => {
  const {
    openStudentDetailModal,
    openRegisterStudentModal,
    studentDataVersion
  } = useAppContext();

  const [students, setStudents] = useState<StudentMasterRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [facultyFilter, setFacultyFilter] = useState<string>('ALL');
  const [majorFilter, setMajorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiService.getStudentsMaster();
      setStudents(res.students || []);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลนักศึกษาได้'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents, studentDataVersion]);

  const faculties = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.faculty_name).filter(Boolean))
      ).sort(),
    [students]
  );

  const majors = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.major_name).filter(Boolean))
      ).sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      if (yearFilter !== 'ALL' && String(s.student_year) !== yearFilter)
        return false;
      if (facultyFilter !== 'ALL' && s.faculty_name !== facultyFilter)
        return false;
      if (majorFilter !== 'ALL' && s.major_name !== majorFilter) return false;
      if (statusFilter !== 'ALL' && s.student_status !== statusFilter)
        return false;
      if (q) {
        const hay = `${s.student_id} ${s.student_name} ${
          s.card_uid || ''
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    students,
    searchQuery,
    yearFilter,
    facultyFilter,
    majorFilter,
    statusFilter
  ]);

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[17px] font-bold text-ink">
            ระบบจัดการข้อมูลนักศึกษาและบัตร RFID (Master Data)
          </h2>
          <p className="text-[13.5px] text-ink-secondary">
            ค้นหาด้วยรหัสนักศึกษา/ชื่อ กรองตามชั้นปี คณะ สาขา ตรวจสอบสถานะบัตร และดูประวัติการใช้ห้องรายบุคคล
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadStudents()}
            className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm font-semibold text-ink hover:bg-subtle inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>รีเฟรช</span>
          </button>
          <button
            type="button"
            onClick={openRegisterStudentModal}
            className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover inline-flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>ลงทะเบียนนักศึกษา / ผูกบัตรใหม่</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาด้วยรหัสนักศึกษา ชื่อ-นามสกุล หรือรหัสบัตร UID..."
            className="w-full h-10 pl-10 pr-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
        >
          <option value="ALL">ทุกชั้นปี</option>
          <option value="1">ชั้นปีที่ 1</option>
          <option value="2">ชั้นปีที่ 2</option>
          <option value="3">ชั้นปีที่ 3</option>
          <option value="4">ชั้นปีที่ 4</option>
          <option value="5">ชั้นปีที่ 5+</option>
        </select>

        <select
          value={facultyFilter}
          onChange={(e) => setFacultyFilter(e.target.value)}
          className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
        >
          <option value="ALL">ทุกคณะ ({faculties.length})</option>
          {faculties.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <select
          value={majorFilter}
          onChange={(e) => setMajorFilter(e.target.value)}
          className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
        >
          <option value="ALL">ทุกสาขาวิชา ({majors.length})</option>
          {majors.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
        >
          <option value="ALL">ทุกสถานะสิทธิ์</option>
          <option value="ACTIVE">ACTIVE (ใช้งานได้)</option>
          <option value="SUSPENDED">SUSPENDED (ระงับสิทธิ์)</option>
          <option value="GRADUATED">GRADUATED (จบการศึกษา)</option>
          <option value="INACTIVE">INACTIVE (พ้นสภาพ/ลาพัก)</option>
        </select>
      </div>

      {/* Table with Mandatory Skeleton Loading */}
      {isLoading && <TableRowsSkeleton cols={7} rows={6} />}

      {!isLoading && errorMsg && (
        <ErrorState message={errorMsg} onRetry={() => void loadStudents()} />
      )}

      {!isLoading && !errorMsg && filteredStudents.length === 0 && (
        <EmptyState
          title="ไม่พบข้อมูลนักศึกษาในระบบ"
          description="หากนักศึกษายังไม่เคยลงทะเบียน เจ้าหน้าที่สามารถกดปุ่ม '+ ลงทะเบียนนักศึกษา / ผูกบัตรใหม่' ได้ทันที"
          action={
            <button
              type="button"
              onClick={openRegisterStudentModal}
              className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover"
            >
              + ลงทะเบียนนักศึกษาใหม่
            </button>
          }
        />
      )}

      {!isLoading && !errorMsg && filteredStudents.length > 0 && (
        <div className="w-full overflow-x-auto border border-line rounded-xl">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-subtle text-ink-secondary text-[13px] font-semibold border-b border-line">
                <th className="px-4 py-3 whitespace-nowrap">รหัสนักศึกษา</th>
                <th className="px-4 py-3 whitespace-nowrap">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3 whitespace-nowrap">ชั้นปี / ปีที่เข้า</th>
                <th className="px-4 py-3">คณะ / สาขาวิชา</th>
                <th className="px-4 py-3 whitespace-nowrap">สถานะนักศึกษา</th>
                <th className="px-4 py-3 whitespace-nowrap">บัตรนักศึกษา (UID)</th>
                <th className="px-4 py-3 whitespace-nowrap">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.slice(0, 100).map((s) => (
                <tr
                  key={s.student_id}
                  className="border-b border-line last:border-b-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3.5 font-bold text-ink">
                    {s.student_id}
                  </td>
                  <td className="px-4 py-3.5 text-ink">{s.student_name}</td>
                  <td className="px-4 py-3.5 text-ink">
                    ชั้นปีที่ {s.student_year} (รหัสปี {s.admission_year})
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-ink font-medium">{s.faculty_name}</div>
                    <div className="text-xs text-ink-secondary">
                      {s.major_name}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge
                      status={
                        s.student_status === 'ACTIVE'
                          ? 'OCCUPIED'
                          : 'DEVICE_OFFLINE'
                      }
                      customLabel={s.student_status}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    {s.card_uid ? (
                      <StatusBadge
                        status={
                          s.card_status === 'ACTIVE' ? 'OCCUPIED' : 'WARNING'
                        }
                        customLabel={`${s.card_uid} (${s.card_status})`}
                      />
                    ) : (
                      <StatusBadge
                        status="AVAILABLE"
                        customLabel="ยังไม่ผูกบัตร"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => openStudentDetailModal(s.student_id)}
                      className="h-8 px-3 rounded-lg border border-line-strong bg-surface text-xs font-semibold text-ink hover:bg-subtle"
                    >
                      ดูรายละเอียด / ประวัติ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
