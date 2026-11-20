/**
 * ============================================================================
 * SRC/PAGES/SETTINGSPAGE.TSX — View 9: System Parameters Configuration
 * ============================================================================
 */

import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { ErrorState } from '../components/common/StateBoxes';
import { TableRowsSkeleton } from '../components/skeleton/Skeletons';
import { useToast } from '../hooks/useToast';
import { apiService } from '../services/apiClient';
import { SettingRecord } from '../types/database';
import { formatDateTimeThai } from '../utils/formatters';

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();

  const [settings, setSettings] = useState<SettingRecord[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiService.getSystemSettings();
      const list = res.settings || [];
      setSettings(list);
      const map: Record<string, string> = {};
      for (const s of list) {
        map[s.setting_key] = String(s.setting_value);
      }
      setFormValues(map);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'ไม่สามารถโหลดการตั้งค่าระบบได้'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = settings.map((s) => ({
        setting_key: s.setting_key,
        setting_value: (formValues[s.setting_key] ?? s.setting_value).trim()
      }));
      await apiService.updateSystemSettings(payload);
      showToast('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว', 'success');
      await loadSettings();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'ไม่สามารถบันทึกการตั้งค่าได้',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-[17px] font-bold text-ink">
          ตั้งค่าระบบและพารามิเตอร์การทำงาน (`Settings`)
        </h2>
        <p className="text-[13.5px] text-ink-secondary">
          ปรับแต่งเวลาใช้งานมาตรฐาน เวลาตรวจจับห้องว่าง และเงื่อนไขการแจ้งเตือน (เฉพาะผู้ดูแลระบบ)
        </p>
      </div>

      {isLoading && <TableRowsSkeleton cols={2} rows={4} />}

      {!isLoading && errorMsg && (
        <ErrorState message={errorMsg} onRetry={() => void loadSettings()} />
      )}

      {!isLoading && !errorMsg && (
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settings.map((s) => (
              <div
                key={s.setting_key}
                className="bg-subtle border border-line p-4 rounded-xl flex flex-col gap-1.5"
              >
                <label
                  htmlFor={`setting_${s.setting_key}`}
                  className="text-[13.5px] font-semibold text-ink"
                >
                  {s.description || s.setting_key}
                </label>
                <input
                  id={`setting_${s.setting_key}`}
                  type="text"
                  value={formValues[s.setting_key] ?? s.setting_value}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      [s.setting_key]: e.target.value
                    }))
                  }
                  required
                  className="w-full h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm text-ink focus:outline-none focus:border-primary"
                />
                <span className="text-[11.5px] text-ink-secondary">
                  Key: <code>{s.setting_key}</code> • แก้ไขล่าสุด:{' '}
                  {formatDateTimeThai(s.updated_at)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => void loadSettings()}
              className="h-10 px-4 rounded-lg border border-line-strong bg-surface text-sm font-semibold text-ink hover:bg-subtle inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>คืนค่าล่าสุด</span>
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าระบบ'}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
