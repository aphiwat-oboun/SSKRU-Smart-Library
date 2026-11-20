/**
 * ============================================================================
 * SRC/COMPONENTS/MODALS/REGISTERSTUDENTMODAL.TSX — Register Student & RFID Card
 * Section 7 Rule: Never guess faculty or major from student_id or RFID UID!
 * ============================================================================
 */

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../../hooks/useAppContext';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/apiClient';
import { StudentStatus } from '../../types/database';

export const RegisterStudentModal: React.FC = () => {
  const {
    isRegisterStudentOpen,
    closeRegisterStudentModal,
    bumpStudentDataVersion
  } = useAppContext();
  const { showToast } = useToast();

  const [studentId, setStudentId] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [admissionYear, setAdmissionYear] = useState<string>('2569');
  const [studentYear, setStudentYear] = useState<string>('1');
  const [facultyId, setFacultyId] = useState<string>('');
  const [facultyName, setFacultyName] = useState<string>('');
  const [majorId, setMajorId] = useState<string>('');
  const [majorName, setMajorName] = useState<string>('');
  const [studentStatus, setStudentStatus] = useState<StudentStatus>('ACTIVE');
  const [cardUid, setCardUid] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isRegisterStudentOpen) {
      setStudentId('');
      setStudentName('');
      setAdmissionYear('2569');
      setStudentYear('1');
      setFacultyId('');
      setFacultyName('');
      setMajorId('');
      setMajorName('');
      setStudentStatus('ACTIVE');
      setCardUid('');
      setIsSaving(false);
    }
  }, [isRegisterStudentOpen]);

  if (!isRegisterStudentOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiService.registerStudentAndCard({
        student_id: studentId.trim(),
        student_name: studentName.trim(),
        admission_year: Number(admissionYear),
        student_year: Number(studentYear),
        faculty_id: facultyId.trim(),
        faculty_name: facultyName.trim(),
        major_id: majorId.trim(),
        major_name: majorName.trim(),
        student_status: studentStatus,
        card_uid: cardUid.trim()
      });

      closeRegisterStudentModal();
      bumpStudentDataVersion();
      showToast(
        `บันทึกข้อมูลนักศึกษา ${res.student_name} (${res.student_id}) สำเร็จ`,
        'success'
      );
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
      className="fixed inset-0 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4 z-[210]"
    >
      <div className="bg-surface rounded-2xl w-full max-w-[780px] max-h-[90vh] flex flex-col shadow-2xl border border-line overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between gap-4">
          <div>
            <h3 id="registerStudentTitle" className="text-[17px] font-bold text-ink">
              ลงทะเบียนข้อมูลนักศึกษาและบัตรนักศึกษา
            </h3>
            <p className="text-xs text-ink-secondary">
              กรอกข้อมูลตามจริงจากบัตรนักศึกษาหรือฐานข้อมูลทะเบียน (ระบบไม่คาดเดาคณะ/สาขาจากรหัสนักศึกษาโดยพลการ)
            </p>
          </div>
          <button
            type="button"
            onClick={closeRegisterStudentModal}
            className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink-secondary hover:bg-subtle"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="regStudentId"
                className="block text-[13.5px] font-semibold text-ink mb-1.5"
              >
                รหัสนักศึกษา (`student_id`) *
              </label>
              <input
                id="regStudentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="เช่น 6912732123"
                required
                className="w-full h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="regStudentName"
                className="block text-[13.5px] font-semibold text-ink mb-1.5"
              >
                ชื่อ-นามสกุล (`student_name`) *
              </label>
              <input
                id="regStudentName"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="ระบุคำนำหน้า ชื่อ-นามสกุล"
                required
                className="w-full h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="regAdmissionYear"
                className="block text-[13.5px] font-semibold text-ink mb-1.5"
              >
                ปี พ.ศ. ที่เข้าศึกษา (`admission_year`) *
              </label>
              <input
                id="regAdmissionYear"
                type="number"
                min={2550}
                max={2600}
                value={admissionYear}
                onChange={(e) => setAdmissionYear(e.target.value)}
                required
                className="w-full h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="regStudentYear"
                className="block text-[13.5px] font-semibold text-ink mb-1.5"
              >
                ชั้นปี (`student_year`) *
              </label>
              <select
                id="regStudentYear"
                value={studentYear}
                onChange={(e) => setStudentYear(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
              >
                <option value="1">ชั้นปีที่ 1</option>
                <option value="2">ชั้นปีที่ 2</option>
                <option value="3">ชั้นปีที่ 3</option>
                <option value="4">ชั้นปีที่ 4</option>
                <option value="5">ชั้นปีที่ 5+</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="regFacultyId"
                className="block text-[13.5px] font-semibold text-ink mb-1.5"
              >
                รหัสคณะ (`faculty_id`) *
              </label>
              <input
                id="regFacultyId"
                type="text"
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                placeholder="เช่น FAC-01"
                required
                className="w-full h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="regFacultyName"
                className="block text-[13.5px] font-semibold text-ink mb-1.5"
              >
                ชื่อคณะ (`faculty_name`) *
              </label>
              <input
                id="regFacultyName"
                type="text"
                value={facultyName}
                onChange={(e) => setFacultyName(e.target.value)}
                placeholder="เช่น คณะศิลปศาสตร์และวิทยาศาสตร์"
                required
                className="w-full h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="regMajorId"
                className="block text-[13.5px] font-semibold text-ink mb-1.5"
              >
                รหัสสาขาวิชา (`major_id`) *
              </label>
              <input
                id="regMajorId"
                type="text"
                value={majorId}
                onChange={(e) => setMajorId(e.target.value)}
                placeholder="เช่น MAJ-CS"
                required
                className="w-full h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="regMajorName"
                className="block text-[13.5px] font-semibold text-ink mb-1.5"
              >
                ชื่อสาขาวิชา (`major_name`) *
              </label>
              <input
                id="regMajorName"
                type="text"
                value={majorName}
                onChange={(e) => setMajorName(e.target.value)}
                placeholder="เช่น วิทยาการคอมพิวเตอร์"
                required
                className="w-full h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="regStudentStatus"
                className="block text-[13.5px] font-semibold text-ink mb-1.5"
              >
                สถานะนักศึกษา (`student_status`) *
              </label>
              <select
                id="regStudentStatus"
                value={studentStatus}
                onChange={(e) => setStudentStatus(e.target.value as StudentStatus)}
                className="w-full h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
              >
                <option value="ACTIVE">ACTIVE (กำลังศึกษา - ใช้งานได้)</option>
                <option value="SUSPENDED">SUSPENDED (ระงับสิทธิ์ชั่วคราว)</option>
                <option value="GRADUATED">GRADUATED (สำเร็จการศึกษา)</option>
                <option value="INACTIVE">INACTIVE (พ้นสภาพ/ลาพัก)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="regCardUid"
                className="block text-[13.5px] font-semibold text-ink mb-1.5"
              >
                รหัสบัตร RFID (`card_uid` - เว้นว่างได้)
              </label>
              <input
                id="regCardUid"
                type="text"
                value={cardUid}
                onChange={(e) => setCardUid(e.target.value)}
                placeholder="สแกนบัตร RFID เพื่อผูกกับนักศึกษาคนนี้"
                className="w-full h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-line bg-subtle flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={closeRegisterStudentModal}
              className="h-10 px-4 rounded-lg border border-line-strong bg-surface text-sm font-semibold text-ink hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
            >
              {isSaving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลนักศึกษาและบัตร'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
