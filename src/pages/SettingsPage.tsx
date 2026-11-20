/**
 * ============================================================================
 * SRC/PAGES/SETTINGSPAGE.TSX — Clean, Friendly Room & System Settings
 * Large readable cards, 1-click quick preset buttons, zero technical jargon.
 * ============================================================================
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Clock, RotateCcw, Save, TimerOff } from 'lucide-react';
import { ErrorState } from '../components/common/StateBoxes';
import { TableRowsSkeleton } from '../components/skeleton/Skeletons';
import { useToast } from '../hooks/useToast';
import { apiService, getCachedRpc } from '../services/apiClient';
import { SettingRecord } from '../types/database';
import { formatDateTimeThai } from '../utils/formatters';

interface SettingPresentation {
  title: string;
  helper: string;
  unit: string;
  presets: Array<{ label: string; value: string }>;
  icon: 'clock' | 'timer';
}

function getSettingMeta(key: string, fallbackDesc: string): SettingPresentation {
  if (key === 'MAX_USAGE_MINUTES') {
    return {
      title: 'เวลาใช้งานห้องมาตรฐาน',
      helper: 'ระยะเวลาที่นักศึกษาใช้ห้องได้ต่อ 1 รอบก่อนแจ้งเตือนเมื่อมีคิวรอ',
      unit: 'นาที',
      presets: [
        { label: '1 ชม. (60 น.)', value: '60' },
        { label: '2 ชม. (120 น.)', value: '120' },
        { label: '3 ชม. (180 น.)', value: '180' }
      ],
      icon: 'clock'
    };
  }
  if (key === 'EMPTY_TIMEOUT_MINUTES') {
    return {
      title: 'เวลาปิดรอบอัตโนมัติเมื่อไม่มีคน',
      helper: 'หากเซนเซอร์ไม่พบคนในห้องต่อเนื่องครบเวลานี้ ระบบจะปิดรอบและคืนห้องว่างอัตโนมัติ',
      unit: 'นาที',
      presets: [
        { label: '5 นาที', value: '5' },
        { label: '10 นาที', value: '10' },
        { label: '15 นาที', value: '15' }
      ],
      icon: 'timer'
    };
  }
  return {
    title: fallbackDesc || key,
    helper: 'กำหนดค่าการทำงานของระบบ',
    unit: '',
    presets: [],
    icon: 'clock'
  };
}

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();

  const cachedSettings = getCachedRpc<{ settings: SettingRecord[] }>('getSystemSettings');
  const [settings, setSettings] = useState<SettingRecord[]>(cachedSettings?.settings || []);
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of cachedSettings?.settings || []) {
      map[s.setting_key] = String(s.setting_value);
    }
    return map;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!cachedSettings);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!getCachedRpc('getSystemSettings')) {
      setIsLoading(true);
    }
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
      showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success');
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-stretch gap-3.5">
          <span className="w-1.5 rounded-full bg-primary shrink-0" />
          <div>
            <h1 className="text-[28px] font-bold text-ink leading-tight">
              ตั้งค่าห้องประชุม
            </h1>
            <p className="text-[15px] text-ink-secondary mt-1">
              ปรับแต่งเวลาใช้งานมาตรฐาน และเวลาปิดรอบอัตโนมัติเมื่อไม่มีคนอยู่ในห้อง
            </p>
          </div>
        </div>
      </div>

      {isLoading && <TableRowsSkeleton cols={2} rows={2} />}

      {!isLoading && errorMsg && (
        <ErrorState message={errorMsg} onRetry={() => void loadSettings()} />
      )}

      {!isLoading && !errorMsg && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {settings.map((s) => {
              const meta = getSettingMeta(s.setting_key, s.description);
              const currentVal = formValues[s.setting_key] ?? s.setting_value;
              const Icon = meta.icon === 'timer' ? TimerOff : Clock;

              return (
                <div
                  key={s.setting_key}
                  className="bg-surface border border-line rounded-[24px] p-6 shadow-sm flex flex-col justify-between gap-5"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <label
                        htmlFor={`setting_${s.setting_key}`}
                        className="block text-[19px] font-bold text-ink leading-snug"
                      >
                        {meta.title}
                      </label>
                      <p className="text-[14.5px] text-ink-secondary mt-1">
                        {meta.helper}
                      </p>
                    </div>
                  </div>

                  {/* Quick Preset Pills */}
                  {meta.presets.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {meta.presets.map((p) => {
                        const active = String(currentVal) === p.value;
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() =>
                              setFormValues((prev) => ({
                                ...prev,
                                [s.setting_key]: p.value
                              }))
                            }
                            className={`h-10 px-4 rounded-xl text-[14.5px] font-bold transition-colors ${
                              active
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-subtle border border-line text-ink hover:border-primary/50'
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Large Clear Input */}
                  <div className="flex items-center gap-3">
                    <input
                      id={`setting_${s.setting_key}`}
                      type="text"
                      value={currentVal}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          [s.setting_key]: e.target.value
                        }))
                      }
                      required
                      className="flex-1 h-12 px-4 rounded-xl border border-line-strong bg-surface text-[18px] font-bold text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    {meta.unit && (
                      <span className="text-[16px] font-bold text-ink-secondary shrink-0">
                        {meta.unit}
                      </span>
                    )}
                  </div>

                  <div className="text-[13px] text-ink-muted">
                    อัปเดตล่าสุด: {formatDateTimeThai(s.updated_at)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => void loadSettings()}
              className="h-12 px-5 rounded-xl border border-line-strong bg-surface text-[15px] font-bold text-ink hover:bg-subtle inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>คืนค่าล่าสุด</span>
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="h-12 px-7 rounded-xl bg-primary hover:bg-primary-hover text-white text-[16px] font-bold inline-flex items-center gap-2 shadow-sm disabled:opacity-60"
            >
              <Save className="w-5 h-5" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
