/**
 * ============================================================================
 * SRC/COMPONENTS/MODALS/REGISTERSTUDENTMODAL.TSX — Simple 5-Field Student Form
 * Matches the clean ER Diagram (`students`: student_id, full_name, year_level,
 * faculty, major) with zero clutter and Forest Green PDF styling.
 * ============================================================================
 */

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../../hooks/useAppContext';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/apiClient';

export const RegisterStudentModal: React.FC = () => {
  const {
    isRegisterStudentOpen,
    closeRegisterStudentModal,
    bumpStudentDataVersion
  } = useAppContext();
  const { showToast } = useToast();

  const [studentId, setStudentId] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [studentYear, setStudentYear] = useState<number>(1);
  const [facultyName, setFacultyName] = useState<string>('');
  const [majorName, setMajorName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isRegisterStudentOpen) {
      setStudentId('');
      setStudentName('');
      setStudentYear(1);
      setFacultyName('');
      setMajorName('');
      setIsSaving(false);
    }
  }, [isRegisterStudentOpen]);

  if (!isRegisterStudentOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = studentId.trim();
    const cleanName = studentName.trim();
    const cleanFaculty = facultyName.trim();
    const cleanMajor = majorName.trim();
    if (!cleanId || !cleanName || !cleanFaculty || !cleanMajor) return;

    setIsSaving(true);
    try {
      const currentThaiYear = new Date().getFullYear() + 543;
      const res = await apiService.registerStudentAndCard({
        student_id: cleanId,
        student_name: cleanName,
        admission_year: currentThaiYear - studentYear + 1,
        student_year: studentYear,
        faculty_id: 'FAC',
        faculty_name: cleanFaculty,
        major_id: 'MAJ',
        major_name: cleanMajor,
        student_status: 'ACTIVE',
        card_uid: cleanId
      });

      closeRegisterStudentModal();
      bumpStudentDataVersion();
      showToast(`บันทึกข้อมูล ${res.student_name} (${res.student_id}) สำเร็จ`, 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลนักศึกษาได้',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="registerStudentTitle"
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[210]"
    >
      <div className="bg-appbg rounded-[28px] w-full max-w-[520px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Forest Green Header */}
        <div className="bg-sidebar-bg text-white px-6 py-5 rounded-b-[22px] flex items-center justify-between gap-4">
          <div>
            <div className="text-[13px] text-[#A8CDB8]">เพิ่มรายชื่อเข้าฐานข้อมูล</div>
            <h3 id="registerStudentTitle" className="text-[24px] font-bold leading-tight">
              ลงทะเบียนนักศึกษา
            </h3>
          </div>
          <button
            type="button"
            onClick={closeRegisterStudentModal}
            className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean 5-Field Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label
              htmlFor="regStudentId"
              className="block text-[15px] font-bold text-ink mb-1.5"
            >
              รหัสนักศึกษา
            </label>
            <input
              id="regStudentId"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="เช่น 6612732101"
              required
              autoFocus
              className="w-full h-12 px-4 rounded-xl border border-line-strong bg-surface text-[16px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="regStudentName"
              className="block text-[15px] font-bold text-ink mb-1.5"
            >
              ชื่อ-นามสกุล
            </label>
            <input
              id="regStudentName"
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="เช่น นายสมชาย ใจดี"
              required
              className="w-full h-12 px-4 rounded-xl border border-line-strong bg-surface text-[16px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <span className="block text-[15px] font-bold text-ink mb-1.5">
              ชั้นปี
            </span>
            <div className="grid grid-cols-4 gap-2.5">
              {[1, 2, 3, 4].map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setStudentYear(yr)}
                  className={`h-11 rounded-xl text-[15px] font-bold transition-colors ${
                    studentYear === yr
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface border border-line-strong text-ink hover:border-primary'
                  }`}
                >
                  ปี {yr}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="regFacultyName"
              className="block text-[15px] font-bold text-ink mb-1.5"
            >
              คณะ
            </label>
            <input
              id="regFacultyName"
              type="text"
              value={facultyName}
              onChange={(e) => setFacultyName(e.target.value)}
              placeholder="เช่น คณะวิทยาศาสตร์และเทคโนโลยี"
              required
              className="w-full h-12 px-4 rounded-xl border border-line-strong bg-surface text-[16px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="regMajorName"
              className="block text-[15px] font-bold text-ink mb-1.5"
            >
              สาขาวิชา
            </label>
            <input
              id="regMajorName"
              type="text"
              value={majorName}
              onChange={(e) => setMajorName(e.target.value)}
              placeholder="เช่น วิทยาการคอมพิวเตอร์"
              required
              className="w-full h-12 px-4 rounded-xl border border-line-strong bg-surface text-[16px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={closeRegisterStudentModal}
              className="h-12 px-5 rounded-xl border border-line-strong bg-surface text-[15px] font-bold text-ink hover:bg-subtle"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary-hover text-white text-[16px] font-bold transition-colors disabled:opacity-60"
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลนักศึกษา'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
