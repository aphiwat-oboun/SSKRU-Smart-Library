/**
 * ============================================================================
 * SRC/COMPONENTS/MODALS/STUDENTDETAILMODAL.TSX — Clean Professional Student Profile
 * ============================================================================
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Award, Clock, GraduationCap, X } from 'lucide-react';
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

function translateCheckoutReason(reason?: string): string {
  switch (reason) {
    case 'SESSION_END':
    case 'NORMAL_CHECKOUT':
      return 'คืนกุญแจปกติ';
    case 'EARLY_LEAVE':
      return 'ออกก่อนเวลา';
    case 'AUTO_EMPTY':
      return 'ปิดรอบอัตโนมัติ';
    case 'STAFF_FORCED':
      return 'เจ้าหน้าที่ปิดรอบ';
    case 'ACTIVE':
      return 'กำลังใช้งาน';
    default:
      return 'คืนกุญแจปกติ';
  }
}

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
  const history = data?.usageHistory || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="studentDetailModalTitle"
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[200]"
    >
      <div className="bg-appbg rounded-[28px] w-full max-w-[820px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Forest Green Header */}
        <div className="bg-sidebar-bg text-white px-6 py-5 rounded-b-[22px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-[#6EE7B7] shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] text-[#A8CDB8]">ข้อมูลนักศึกษาและประวัติการใช้ห้อง</div>
              <h3 id="studentDetailModalTitle" className="text-[22px] font-bold leading-tight truncate">
                {stu ? `${stu.student_name} (${stu.student_id})` : 'กำลังโหลดข้อมูล...'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={closeStudentDetailModal}
            className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 shrink-0"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
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
              {/* Profile & Usage Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[18px] font-bold text-ink">ข้อมูลการศึกษา</span>
                    <StatusBadge
                      status={stu.student_status === 'ACTIVE' ? 'OCCUPIED' : 'DEVICE_OFFLINE'}
                      customLabel={stu.student_status === 'ACTIVE' ? 'กำลังศึกษา' : stu.student_status}
                    />
                  </div>
                  <div className="text-[15px] text-ink-secondary space-y-1.5 pt-1">
                    <div>
                      <strong className="text-ink">รหัสนักศึกษา:</strong> {stu.student_id}
                    </div>
                    <div>
                      <strong className="text-ink">ชั้นปี:</strong> ชั้นปีที่ {stu.student_year}
                    </div>
                    <div>
                      <strong className="text-ink">คณะ:</strong> {stu.faculty_name}
                    </div>
                    <div>
                      <strong className="text-ink">สาขาวิชา:</strong> {stu.major_name}
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-3">
                  <div className="text-[18px] font-bold text-ink">สรุปการใช้ห้องสะสม</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-primary-light rounded-xl p-4">
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#144D32]">
                        <Award className="w-4 h-4" />
                        <span>จำนวนครั้ง</span>
                      </div>
                      <div className="text-[26px] font-bold text-primary mt-1">
                        {history.length} ครั้ง
                      </div>
                    </div>
                    <div className="bg-subtle border border-line rounded-xl p-4">
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-secondary">
                        <Clock className="w-4 h-4" />
                        <span>เวลารวม</span>
                      </div>
                      <div className="text-[22px] font-bold text-ink mt-1">
                        {formatDurationHoursMinutes(data?.totalUsageSeconds || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clean Usage History Table */}
              <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm">
                <h4 className="text-[17px] font-bold text-ink mb-3">
                  ประวัติการเข้าใช้ห้อง ({history.length} ครั้ง)
                </h4>
                <div className="w-full overflow-x-auto border border-line rounded-xl">
                  <table className="w-full border-collapse text-left text-[15px]">
                    <thead>
                      <tr className="bg-subtle text-ink-secondary text-[14px] font-bold border-b border-line">
                        <th className="px-4 py-3">ห้องที่ใช้</th>
                        <th className="px-4 py-3">เวลาเข้า</th>
                        <th className="px-4 py-3">เวลาออก</th>
                        <th className="px-4 py-3">ระยะเวลา</th>
                        <th className="px-4 py-3">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-[15px] text-ink-secondary"
                          >
                            ยังไม่มีประวัติการเข้าใช้ห้องประชุม
                          </td>
                        </tr>
                      ) : (
                        history.map((h) => (
                          <tr
                            key={h.member_id}
                            className="border-b border-line last:border-b-0 hover:bg-subtle/60"
                          >
                            <td className="px-4 py-3.5 font-bold text-ink">
                              {h.room_name || h.room_id}
                            </td>
                            <td className="px-4 py-3.5 text-ink">
                              {formatDateTimeThai(h.check_in_at)}
                            </td>
                            <td className="px-4 py-3.5 text-ink">
                              {h.check_out_at ? (
                                formatDateTimeThai(h.check_out_at)
                              ) : (
                                <StatusBadge status="OCCUPIED" customLabel="กำลังใช้งาน" />
                              )}
                            </td>
                            <td className="px-4 py-3.5 font-bold text-primary">
                              {formatDurationHoursMinutes(h.usage_seconds)}
                            </td>
                            <td className="px-4 py-3.5 text-ink-secondary font-medium">
                              {translateCheckoutReason(h.check_out_reason)}
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
        <div className="px-6 py-4 border-t border-line bg-surface flex items-center justify-end">
          <button
            type="button"
            onClick={closeStudentDetailModal}
            className="h-11 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white text-[15px] font-bold"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
