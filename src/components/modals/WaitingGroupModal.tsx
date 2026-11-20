/**
 * ============================================================================
 * SRC/COMPONENTS/MODALS/WAITINGGROUPMODAL.TSX — Modern Waiting Queue Modal
 * ============================================================================
 */

import React, { useEffect, useState } from 'react';
import { Check, DoorOpen, MessageSquare, UserCheck, Users, X } from 'lucide-react';
import { useAppContext } from '../../hooks/useAppContext';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/apiClient';
import { WaitingRoomType } from '../../types/database';

const ROOM_TYPE_OPTIONS: Array<{
  value: WaitingRoomType;
  title: string;
  subtitle: string;
}> = [
  {
    value: 'ANY',
    title: 'ห้องใดก็ได้ที่ว่างก่อน',
    subtitle: 'ชั้น 3 หรือ ชั้น 5 (เรียกคิวเร็วที่สุด)'
  },
  {
    value: 'SMALL_MEETING',
    title: 'ชั้น 3 · ห้องประชุมเล็ก',
    subtitle: 'เหมาะสำหรับกลุ่ม 3–6 คน'
  },
  {
    value: 'MEETING',
    title: 'ชั้น 5 · ห้องประชุมใหญ่',
    subtitle: 'เหมาะสำหรับกลุ่มขนาดใหญ่ 6–10 คน'
  }
];

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
      onClick={() => !isSubmitting && closeWaitingModal()}
      className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4 z-[210]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-[24px] w-full max-w-[460px] flex flex-col shadow-2xl border border-line overflow-hidden max-h-[92vh]"
      >
        {/* Forest Green Header */}
        <div className="bg-gradient-to-r from-[#144D32] to-[#1E7548] px-6 py-5 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 id="waitingModalTitle" className="text-[19px] font-bold text-white leading-tight">
                เพิ่มกลุ่มนักศึกษารอใช้ห้อง
              </h3>
              <p className="text-[13px] text-[#C6E5D3] mt-0.5">
                ออกหมายเลขคิวอัตโนมัติ (เช่น Q-001) เพื่อเรียกเมื่อห้องว่าง
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeWaitingModal}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors shrink-0"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Representative Student ID */}
            <div>
              <label
                htmlFor="waitRepStudentId"
                className="flex items-center gap-1.5 text-[14px] font-bold text-ink mb-1.5"
              >
                <UserCheck className="w-4 h-4 text-primary" />
                <span>รหัสนักศึกษาตัวแทนกลุ่ม (1 คน)</span>
                <span className="text-danger">*</span>
              </label>
              <input
                id="waitRepStudentId"
                type="text"
                value={repStudentId}
                onChange={(e) => setRepStudentId(e.target.value)}
                placeholder="สแกนบัตร หรือ กรอกรหัสนักศึกษา เช่น 6612732101"
                required
                className="w-full h-11 px-4 rounded-xl border border-line-strong bg-surface text-[15px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>

            {/* Room Type Visual Radio Cards */}
            <div>
              <div className="flex items-center gap-1.5 text-[14px] font-bold text-ink mb-2">
                <DoorOpen className="w-4 h-4 text-primary" />
                <span>เลือกประเภทห้องที่ต้องการรอ</span>
                <span className="text-danger">*</span>
              </div>
              <div className="space-y-2">
                {ROOM_TYPE_OPTIONS.map((opt) => {
                  const active = roomType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRoomType(opt.value)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                        active
                          ? 'border-primary bg-primary-light/60'
                          : 'border-line bg-surface hover:border-line-strong hover:bg-subtle/60'
                      }`}
                    >
                      <div>
                        <div className={`text-[14.5px] font-bold ${active ? 'text-primary' : 'text-ink'}`}>
                          {opt.title}
                        </div>
                        <div className="text-[12.5px] text-ink-secondary mt-0.5">
                          {opt.subtitle}
                        </div>
                      </div>
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          active
                            ? 'bg-primary text-white'
                            : 'border-2 border-line-strong bg-surface'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Note */}
            <div>
              <label
                htmlFor="waitNote"
                className="flex items-center gap-1.5 text-[14px] font-bold text-ink mb-1.5"
              >
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>หมายเหตุเพิ่มเติม</span>
                <span className="text-ink-muted font-normal text-[13px]">(ไม่บังคับ)</span>
              </label>
              <input
                id="waitNote"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น เบอร์โทรติดต่อ หรือ จำนวนสมาชิกในกลุ่ม"
                className="w-full h-11 px-4 rounded-xl border border-line-strong bg-surface text-[15px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>
          </div>

          {/* Balanced 2-column footer */}
          <div className="px-6 py-4 border-t border-line bg-subtle/60 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={closeWaitingModal}
              disabled={isSubmitting}
              className="h-11 px-4 rounded-xl border border-line-strong bg-surface text-[15px] font-semibold text-ink hover:bg-subtle transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-4 rounded-xl bg-primary text-white text-[15px] font-bold hover:bg-primary-hover shadow-sm disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? 'กำลังบันทึกคิว...' : 'บันทึกเข้าคิวรอ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
