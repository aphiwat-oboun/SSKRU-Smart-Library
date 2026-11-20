/**
 * ============================================================================
 * SRC/COMPONENTS/MODALS/WAITINGGROUPMODAL.TSX — Add Waiting Queue Group
 * ============================================================================
 */

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../../hooks/useAppContext';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/apiClient';
import { WaitingRoomType } from '../../types/database';

export const WaitingGroupModal: React.FC = () => {
  const {
    isWaitingModalOpen,
    closeWaitingModal,
    bumpWaitingDataVersion,
    refreshDashboard
  } = useAppContext();
  const { showToast } = useToast();

  const [repStudentId, setRepStudentId] = useState<string>('');
  const [roomType, setRoomType] = useState<WaitingRoomType>('ANY');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isWaitingModalOpen) {
      setRepStudentId('');
      setRoomType('ANY');
      setNote('');
      setIsSubmitting(false);
    }
  }, [isWaitingModalOpen]);

  if (!isWaitingModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiService.addWaitingGroup({
        representative_student_id: repStudentId.trim(),
        room_type: roomType,
        note: note.trim()
      });

      closeWaitingModal();
      bumpWaitingDataVersion();
      showToast(`เพิ่มคิวรอ ${res.queue_number} สำเร็จ`, 'success');
      await refreshDashboard(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'ไม่สามารถเพิ่มคิวรอได้',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitingModalTitle"
      className="fixed inset-0 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4 z-[210]"
    >
      <div className="bg-surface rounded-2xl w-full max-w-[440px] flex flex-col shadow-2xl border border-line overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h3 id="waitingModalTitle" className="text-[17px] font-bold text-ink">
            เพิ่มกลุ่มนักศึกษารอใช้ห้อง
          </h3>
          <button
            type="button"
            onClick={closeWaitingModal}
            className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink-secondary hover:bg-subtle"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label
                htmlFor="waitRepStudentId"
                className="block text-[13.5px] font-semibold text-ink mb-1.5"
              >
                รหัสนักศึกษาตัวแทนกลุ่ม (1 คน) *
              </label>
              <input
                id="waitRepStudentId"
                type="text"
                value={repStudentId}
                onChange={(e) => setRepStudentId(e.target.value)}
                placeholder="สแกนบัตรหรือกรอกรหัสนักศึกษาตัวแทน"
                required
                className="w-full h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
              />
              <span className="block text-xs text-ink-secondary mt-1">
                ระบบจะสร้างรหัสคิวอัตโนมัติ (เช่น Q-001) และป้องกันรหัสตัวแทนซ้ำในคิวที่กำลังรอ
              </span>
            </div>

            <div>
              <label
                htmlFor="waitRoomType"
                className="block text-[13.5px] font-semibold text-ink mb-1.5"
              >
                ประเภทห้องที่ต้องการรอ (`room_type`) *
              </label>
              <select
                id="waitRoomType"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value as WaitingRoomType)}
                className="w-full h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
              >
                <option value="ANY">ห้องใดก็ได้ที่ว่างก่อน (ชั้น 3 หรือ ชั้น 5)</option>
                <option value="SMALL_MEETING">
                  เฉพาะชั้น 3 - ห้องประชุมเล็ก (6 ห้อง)
                </option>
                <option value="MEETING">เฉพาะชั้น 5 - ห้องประชุม (4 ห้อง)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="waitNote"
                className="block text-[13.5px] font-semibold text-ink mb-1.5"
              >
                หมายเหตุเพิ่มเติม (ถ้ามี)
              </label>
              <input
                id="waitNote"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น เบอร์ติดต่อ หรือรายละเอียดเพิ่มเติม"
                className="w-full h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-line bg-subtle flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={closeWaitingModal}
              className="h-10 px-4 rounded-lg border border-line-strong bg-surface text-sm font-semibold text-ink hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
            >
              {isSubmitting ? 'กำลังบันทึกคิว...' : 'บันทึกเข้าคิวรอ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
