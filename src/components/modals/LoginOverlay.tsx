/**
 * ============================================================================
 * SRC/COMPONENTS/MODALS/LOGINOVERLAY.TSX — Clean Forest Green Login Screen
 * ============================================================================
 */

import React, { useState } from 'react';
import { BookOpen, Lock, User } from 'lucide-react';
import { useAppContext } from '../../hooks/useAppContext';

export const LoginOverlay: React.FC = () => {
  const { isAuthenticated, login } = useAppContext();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่านให้ครบถ้วน');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await login(cleanUser, password);
      setPassword('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="loginDialogTitle"
      className="fixed inset-0 bg-[#144D32] z-[300] flex items-center justify-center p-5"
    >
      <div className="bg-surface rounded-3xl w-full max-w-[440px] p-8 sm:p-9 shadow-xl border border-line">
        <div className="text-center mb-7">
          <div className="w-16 h-16 rounded-2xl bg-primary text-white inline-flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 id="loginDialogTitle" className="text-2xl font-bold text-ink">
            ห้องสมุด มรภ.ศรีสะเกษ
          </h2>
          <p className="text-[15px] text-ink-secondary mt-1">
            ระบบตรวจสอบสถานะห้องประชุมและแจ้งเตือน
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="loginUsernameInput"
              className="block text-[15px] font-semibold text-ink mb-2"
            >
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="loginUsernameInput"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ระบุชื่อผู้ใช้เจ้าหน้าที่"
                autoComplete="username"
                required
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-line-strong bg-surface text-[16px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="loginPasswordInput"
              className="block text-[15px] font-semibold text-ink mb-2"
            >
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="loginPasswordInput"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ระบุรหัสผ่าน"
                autoComplete="current-password"
                required
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-line-strong bg-surface text-[16px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="bg-danger-bg text-danger px-4 py-3 rounded-xl text-[14px] font-semibold">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-13 py-3.5 rounded-xl bg-primary text-white text-[17px] font-bold hover:bg-primary-hover transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบเจ้าหน้าที่'}
          </button>

          <div className="p-3 bg-subtle border border-line rounded-xl text-[13px] text-ink-secondary text-center">
            ผู้ดูแลระบบเริ่มต้น: <code className="font-bold text-ink">admin</code> /{' '}
            <code className="font-bold text-ink">Admin@SRRU2026</code>
          </div>
        </form>
      </div>
    </div>
  );
};
