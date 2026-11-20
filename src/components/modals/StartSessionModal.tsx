/**
 * ============================================================================
 * SRC/COMPONENTS/MODALS/STARTSESSIONMODAL.TSX — Key Issuing Modal (PDF Page 2)
 * Clean, 1-step key issuing interface with student card chips & instant timer.
 * ============================================================================
 */

import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, UserPlus, X } from 'lucide-react';
import { useAppContext } from '../../hooks/useAppContext';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/apiClient';
import { VerifiedStudentCard } from '../../types/api';
import { formatTimeThai } from '../../utils/formatters';
import { generateIdempotencyKey } from '../../utils/idempotency';

export const StartSessionModal: React.FC = () => {
  const {
    startSessionTarget,
    closeStartSessionModal,
    dashboardData,
    refreshDashboard,
    openRegisterStudentModal,
    bumpWaitingDataVersion
  } = useAppContext();
  const { showToast } = useToast();

  const [scanQuery, setScanQuery] = useState<string>('');
  const [scannedStudents, setScannedStudents] = useState<VerifiedStudentCard[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [isVerifyingCard, setIsVerifyingCard] = useState<boolean>(false);
  const [isSubmittingSession, setIsSubmittingSession] = useState<boolean>(false);

  const scanInputRef = useRef<HTMLInputElement | null>(null);

  const availableRooms = (dashboardData?.rooms || []).filter(
    (r) => r.room_status === 'AVAILABLE'
  );

  useEffect(() => {
    if (startSessionTarget.isOpen) {
      setScanQuery('');
      setScannedStudents([]);
      const firstAvail = availableRooms[0]?.room_id || '';
      setSelectedRoomId(startSessionTarget.preselectedRoomId || firstAvail);
      setIdempotencyKey(generateIdempotencyKey('START_SESS'));
      setFeedback(null);
      setIsVerifyingCard(false);
      setIsSubmittingSession(false);
      window.setTimeout(() => {
        scanInputRef.current?.focus();
      }, 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSessionTarget]);

  if (!startSessionTarget.isOpen) return null;

  const expectedEndShort = formatTimeThai(
    new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
  ).replace(' น.', '');

  const handleScanCard = async () => {
    const q = scanQuery.trim();
    if (!q) {
      setFeedback({
        text: 'กรุณาสแกนบัตร หรือพิมพ์รหัสนักศึกษา',
        isError: true
      });
      return;
    }

    if (scannedStudents.length >= 3) {
      setFeedback({
        text: 'ครบ 3 ใบแล้ว กดปุ่ม "ให้กุญแจ · เริ่มจับเวลา" ได้เลย',
        isError: false
      });
      return;
    }

    const dup = scannedStudents.find(
      (s) => s.card_uid.toUpperCase() === q.toUpperCase() || s.student_id === q
    );
    if (dup) {
      setFeedback({
        text: `สแกนซ้ำ: ${dup.student_name} (${dup.student_id}) อยู่ในรายการแล้ว`,
        isError: true
      });
      setScanQuery('');
      return;
    }

    setIsVerifyingCard(true);
    try {
      const info = await apiService.verifyStudentCardForSession(q);
      if (scannedStudents.some((s) => s.student_id === info.student_id)) {
        setFeedback({
          text: `สแกนซ้ำ: ${info.student_name} อยู่ในรายการแล้ว`,
          isError: true
        });
        return;
      }

      setScannedStudents((prev) => [...prev, info]);
      setScanQuery('');
      setFeedback({
        text: `✓ เพิ่ม ${info.student_name} (${info.student_id}) เรียบร้อย`,
        isError: false
      });
      scanInputRef.current?.focus();
    } catch (err) {
      setFeedback({
        text: err instanceof Error ? err.message : 'ไม่พบบัตรหรือรหัสนักศึกษานี้ในระบบ',
        isError: true
      });
    } finally {
      setIsVerifyingCard(false);
    }
  };

  const handleRemoveStudent = (index: number) => {
    setScannedStudents((prev) => prev.filter((_, idx) => idx !== index));
  };

  const canConfirm =
    scannedStudents.length === 3 &&
    Boolean(selectedRoomId) &&
    !isSubmittingSession;

  const handleConfirmStartSession = async () => {
    if (!canConfirm) return;

    setIsSubmittingSession(true);
    try {
      const res = await apiService.startRoomSession({
        room_id: selectedRoomId,
        waiting_id: startSessionTarget.waitingGroup?.waiting_id || '',
        idempotency_key: idempotencyKey,
        members: scannedStudents.map((s) => ({
          student_id: s.student_id,
          card_id: s.card_id,
          card_uid: s.card_uid
        }))
      });

      closeStartSessionModal();
      showToast(`ให้กุญแจ ${res.room_name} และเริ่มจับเวลาเรียบร้อยแล้ว`, 'success');
      if (startSessionTarget.waitingGroup) {
        bumpWaitingDataVersion();
      }
      await refreshDashboard(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'ไม่สามารถเริ่มใช้งานห้องได้',
        'error'
      );
    } finally {
      setIsSubmittingSession(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="startSessionModalTitle"
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[200]"
    >
      <div className="bg-appbg rounded-[28px] w-full max-w-[560px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Forest Green Header (PDF Page 2) */}
        <div className="bg-sidebar-bg text-white px-6 pt-6 pb-6 rounded-b-[24px] flex items-start justify-between gap-4">
          <div>
            <div className="text-[14px] text-[#A8CDB8]">รับห้องให้กลุ่มใหม่</div>
            <h3 id="startSessionModalTitle" className="text-[26px] font-bold leading-tight mt-0.5">
              ให้กุญแจ
            </h3>
          </div>
          <button
            type="button"
            onClick={closeStartSessionModal}
            className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {startSessionTarget.waitingGroup && (
            <div className="bg-primary-light border border-success-border px-4 py-3 rounded-xl text-[15px] text-[#144D32]">
              กำลังเรียกคิว{' '}
              <strong>{startSessionTarget.waitingGroup.queue_number}</strong> (
              {startSessionTarget.waitingGroup.student_group_id})
            </div>
          )}

          {/* 1. Room Selection Pills (PDF Page 2) */}
          <div>
            <div className="text-[16px] font-bold text-ink mb-2.5">ห้อง</div>
            <div className="grid grid-cols-2 gap-3">
              {availableRooms.map((r) => {
                const isSelected = selectedRoomId === r.room_id;
                return (
                  <button
                    key={r.room_id}
                    type="button"
                    onClick={() => setSelectedRoomId(r.room_id)}
                    className={`h-12 px-4 rounded-xl text-[15px] font-bold transition-colors truncate ${
                      isSelected
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface border border-line-strong text-ink hover:border-primary'
                    }`}
                  >
                    {r.room_name} · {r.floor_id === 'FL5' ? 'ชั้น 5' : 'ชั้น 3'}
                  </button>
                );
              })}
              {availableRooms.length === 0 && (
                <div className="col-span-2 h-12 rounded-xl border-2 border-dashed border-line-strong flex items-center justify-center text-[15px] text-ink-muted">
                  ขณะนี้ไม่มีห้องว่าง
                </div>
              )}
            </div>
          </div>

          {/* 2. Student ID Cards (PDF Page 2) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[16px] font-bold text-ink">บัตรนักศึกษา</span>
              <span className="text-[16px] font-bold text-primary">
                {scannedStudents.length} / 3 ใบ
              </span>
            </div>

            {/* Registered Student Chips */}
            {scannedStudents.length > 0 && (
              <div className="flex flex-wrap gap-2.5 mb-3">
                {scannedStudents.map((stu, idx) => (
                  <div
                    key={stu.student_id}
                    className="inline-flex items-center gap-2.5 bg-primary-light text-[#144D32] px-4 py-2.5 rounded-xl text-[15px] font-bold"
                  >
                    <span>
                      {stu.student_id} · {stu.student_name.split(' ')[0]}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStudent(idx)}
                      className="text-[#144D32]/70 hover:text-danger"
                      aria-label={`ลบ ${stu.student_name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Scan / Type Input */}
            <div className="flex gap-2.5">
              <input
                ref={scanInputRef}
                id="rfidScanInput"
                type="text"
                value={scanQuery}
                onChange={(e) => setScanQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleScanCard();
                  }
                }}
                placeholder="สแกนบัตร หรือพิมพ์รหัส"
                className="flex-1 h-12 px-4 rounded-xl border border-line-strong bg-surface text-[16px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                disabled={isVerifyingCard || scannedStudents.length >= 3}
                onClick={() => void handleScanCard()}
                className="h-12 px-5 rounded-xl bg-primary hover:bg-primary-hover text-white text-[15px] font-bold disabled:opacity-50 shrink-0"
              >
                {isVerifyingCard ? '...' : 'เพิ่ม'}
              </button>
            </div>

            {feedback && (
              <div
                className={`mt-2 text-[14px] font-semibold ${
                  feedback.isError ? 'text-danger' : 'text-primary'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <button
              type="button"
              onClick={openRegisterStudentModal}
              className="mt-2.5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary hover:underline"
            >
              <UserPlus className="w-4 h-4" />
              <span>ยังไม่เคยลงทะเบียน? เพิ่มนักศึกษาใหม่</span>
            </button>
          </div>

          {/* 3. Usage Quota Info Box (PDF Page 2) */}
          <div className="bg-primary-light rounded-2xl p-4 text-[15px]">
            <div className="font-bold text-[#144D32]">
              ใช้ได้ 3 ชั่วโมง <span className="font-normal">(ถึง {expectedEndShort})</span>
            </div>
            <div className="text-[#2D6247] text-[14px] mt-0.5">
              ถ้าไม่มีคิวรอ ใช้ต่อได้จนห้องสมุดปิด 20:00
            </div>
          </div>

          {/* 4. One Clear Primary Action Button (PDF Page 2) */}
          <div className="pt-1">
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => void handleConfirmStartSession()}
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary-hover text-white text-[18px] font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-45"
            >
              <span>
                {isSubmittingSession
                  ? 'กำลังบันทึก...'
                  : 'ให้กุญแจ · เริ่มจับเวลา'}
              </span>
              {!isSubmittingSession && <ArrowRight className="w-5 h-5" />}
            </button>
            <p className="text-center text-[13.5px] text-ink-secondary mt-2.5">
              ต้องมีบัตรนักศึกษาครบ 3 ใบ จึงให้กุญแจได้
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
