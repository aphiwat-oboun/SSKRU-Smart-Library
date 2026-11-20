/**
 * ============================================================================
 * SRC/COMPONENTS/MODALS/STUDENTDETAILMODAL.TSX — Student Profile, Cards & History
 * Mandatory Skeleton Loading: StudentDetailSkeleton
 * ============================================================================
 */

import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../../hooks/useAppContext';
import { apiService } from '../../services/apiClient';
import { StudentDetailResponse } from '../../types/api';
import {
  formatDateTimeThai,
  formatDurationHoursMinutes
} from '../../utils/formatters';
import { ErrorState } from '../common/StateBoxes';
import { StatusBadge } from '../common/StatusBadge';
import { StudentDetailSkeleton } from '../skeleton/Skeletons';

export const StudentDetailModal: React.FC = () => {
  const { activeStudentDetailId, closeStudentDetailModal } = useAppContext();

  const [data, setData] = useState<StudentDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadStudentDetail = useCallback(async (studentId: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setData(null);
    try {
      const res = await apiService.getStudentDetailAndHistory(studentId);
      setData(res);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลนักศึกษาได้'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeStudentDetailId) {
      void loadStudentDetail(activeStudentDetailId);
    } else {
      setData(null);
      setErrorMsg(null);
    }
  }, [activeStudentDetailId, loadStudentDetail]);

  if (!activeStudentDetailId) return null;

  const stu = data?.student;
  const cards = data?.cards || [];
  const history = data?.usageHistory || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="studentDetailModalTitle"
      className="fixed inset-0 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4 z-[200]"
    >
      <div className="bg-surface rounded-2xl w-full max-w-[820px] max-h-[90vh] flex flex-col shadow-2xl border border-line overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between gap-4">
          <h3 id="studentDetailModalTitle" className="text-[17px] font-bold text-ink">
            ข้อมูลนักศึกษาและประวัติการใช้ห้องรายบุคคล
          </h3>
          <button
            type="button"
            onClick={closeStudentDetailModal}
            className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink-secondary hover:bg-subtle"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {isLoading && <StudentDetailSkeleton />}

          {!isLoading && errorMsg && (
            <ErrorState
              message={errorMsg}
              onRetry={() => void loadStudentDetail(activeStudentDetailId)}
            />
          )}

          {!isLoading && !errorMsg && stu && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-subtle border border-line rounded-xl p-4">
                  <div className="text-base font-bold text-ink mb-2">
                    {stu.student_name} ({stu.student_id})
                  </div>
                  <div className="text-[13.5px] text-slate-600 space-y-1">
                    <div>
                      <strong>คณะ:</strong> {stu.faculty_name} ({stu.faculty_id})
                    </div>
                    <div>
                      <strong>สาขาวิชา:</strong> {stu.major_name} ({stu.major_id})
                    </div>
                    <div>
                      <strong>ชั้นปี:</strong> ปีที่ {stu.student_year} (ปีที่เข้าศึกษา{' '}
                      {stu.admission_year})
                    </div>
                    <div className="pt-1">
                      <strong>สถานะ:</strong>{' '}
                      <StatusBadge
                        status={
                          stu.student_status === 'ACTIVE'
                            ? 'OCCUPIED'
                            : 'DEVICE_OFFLINE'
                        }
                        customLabel={stu.student_status}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-subtle border border-line rounded-xl p-4">
                  <div className="text-[15px] font-bold text-ink mb-2">
                    บัตรนักศึกษาที่ลงทะเบียน ({cards.length} ใบ)
                  </div>
                  {cards.length === 0 ? (
                    <div className="text-[13px] text-ink-secondary">
                      ยังไม่มีบัตรที่ผูกกับนักศึกษาคนนี้
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {cards.map((c) => (
                        <div
                          key={c.card_id}
                          className="flex items-center justify-between px-3 py-2 bg-surface border border-line rounded-lg text-xs"
                        >
                          <div>
                            <strong>UID: {c.card_uid}</strong>{' '}
                            <span className="text-ink-secondary">
                              (ลงทะเบียน {formatDateTimeThai(c.registered_at)})
                            </span>
                          </div>
                          <StatusBadge
                            status={
                              c.card_status === 'ACTIVE'
                                ? 'OCCUPIED'
                                : 'DEVICE_OFFLINE'
                            }
                            customLabel={c.card_status}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 text-[13px] text-primary font-medium">
                    <strong>รวมเวลาใช้ห้องสะสมทั้งหมด:</strong>{' '}
                    {formatDurationHoursMinutes(data?.totalUsageSeconds || 0)} (
                    {history.length} ครั้ง)
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[15px] font-bold text-ink mb-2.5">
                  ประวัติการใช้ห้องรายบุคคล (คำนวณจากข้อมูลจริงใน Session_Members)
                </h4>
                <div className="w-full overflow-x-auto border border-line rounded-xl bg-surface">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-subtle text-ink-secondary text-xs font-semibold border-b border-line">
                        <th className="px-4 py-3">ห้องที่ใช้</th>
                        <th className="px-4 py-3">รหัส Session</th>
                        <th className="px-4 py-3">เวลาเข้า (Check-in)</th>
                        <th className="px-4 py-3">เวลาออก (Check-out)</th>
                        <th className="px-4 py-3">ระยะเวลาที่ใช้</th>
                        <th className="px-4 py-3">สาเหตุการออก</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-6 text-center text-ink-secondary"
                          >
                            ยังไม่มีประวัติการเข้าใช้ห้องค้นคว้า
                          </td>
                        </tr>
                      ) : (
                        history.map((h) => (
                          <tr
                            key={h.member_id}
                            className="border-b border-line last:border-b-0 hover:bg-slate-50"
                          >
                            <td className="px-4 py-3 font-semibold">
                              {h.room_name || h.room_id}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono">
                              {h.session_id.substring(0, 8)}...
                            </td>
                            <td className="px-4 py-3">
                              {formatDateTimeThai(h.check_in_at)}
                            </td>
                            <td className="px-4 py-3">
                              {h.check_out_at ? (
                                formatDateTimeThai(h.check_out_at)
                              ) : (
                                <StatusBadge
                                  status="OCCUPIED"
                                  customLabel="กำลังใช้งาน"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 font-semibold">
                              {formatDurationHoursMinutes(h.usage_seconds)}
                            </td>
                            <td className="px-4 py-3">
                              {h.check_out_reason || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line bg-subtle flex items-center justify-end">
          <button
            type="button"
            onClick={closeStudentDetailModal}
            className="h-10 px-4 rounded-lg border border-line-strong bg-surface text-sm font-semibold text-ink hover:bg-slate-100"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
