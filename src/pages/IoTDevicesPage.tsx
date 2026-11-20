/**
 * ============================================================================
 * SRC/PAGES/IOTDEVICESPAGE.TSX — View 8: ESP32 + LD2410 IoT Devices & Events
 * ============================================================================
 */

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { EmptyState, ErrorState } from '../components/common/StateBoxes';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableRowsSkeleton } from '../components/skeleton/Skeletons';
import { databaseConfig } from '../config/database';
import { apiService } from '../services/apiClient';
import { IoTDeviceRecord, IoTEventRecord } from '../types/database';
import { formatDateTimeThai } from '../utils/formatters';

function isDemoSource(value: string): boolean {
  const upper = value.toUpperCase();
  return (
    upper.includes('WOKWI') ||
    upper.includes('PIR') ||
    upper.includes('DEMO') ||
    upper.includes('SIMULATION') ||
    upper.includes('MOCK')
  );
}

export const IoTDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<IoTDeviceRecord[]>([]);
  const [events, setEvents] = useState<IoTEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadIoT = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiService.getIoTOverview();
      setDevices(res.devices || []);
      setEvents(res.events || []);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'ไม่สามารถโหลดสถานะอุปกรณ์ IoT ได้'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIoT();
  }, [loadIoT]);

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-[17px] font-bold text-ink">
              จัดการอุปกรณ์ตรวจจับการมีคน (ESP32 + mmWave LD2410)
            </h2>
            {databaseConfig.mode === 'gas' || databaseConfig.mode === 'api' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● เชื่อมต่อฐานข้อมูลจริง ({databaseConfig.mode === 'gas' ? 'Google Sheets' : 'API'})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                ● โหมดจำลองในเครื่อง (Local Demo)
              </span>
            )}
          </div>
          <p className="text-[13.5px] text-ink-secondary">
            ตรวจสอบสถานะ Online/Offline, เวลาติดต่อล่าสุด (Last Seen), แหล่งที่มาของข้อมูล (ข้อมูลจริง / Wokwi Demo) และประวัติสัญญาณตรวจจับคน
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadIoT()}
          className="h-10 px-3.5 rounded-lg border border-line-strong bg-surface text-sm font-semibold text-ink hover:bg-subtle inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          <span>รีเฟรชสถานะอุปกรณ์</span>
        </button>
      </div>

      {/* Devices Table */}
      <div>
        {isLoading && <TableRowsSkeleton cols={7} rows={5} />}

        {!isLoading && errorMsg && (
          <ErrorState message={errorMsg} onRetry={() => void loadIoT()} />
        )}

        {!isLoading && !errorMsg && devices.length === 0 && (
          <EmptyState
            title="ไม่พบรายการอุปกรณ์ IoT"
            description="กรุณาตรวจสอบตาราง IoT_Devices"
          />
        )}

        {!isLoading && !errorMsg && devices.length > 0 && (
          <div className="w-full overflow-x-auto border border-line rounded-xl">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-subtle text-ink-secondary text-[13px] font-semibold border-b border-line">
                  <th className="px-4 py-3 whitespace-nowrap">
                    รหัสอุปกรณ์ (Device ID)
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap">ห้องที่ติดตั้ง</th>
                  <th className="px-4 py-3 whitespace-nowrap">แหล่งข้อมูล</th>
                  <th className="px-4 py-3 whitespace-nowrap">ชนิดเซนเซอร์</th>
                  <th className="px-4 py-3 whitespace-nowrap">
                    สถานะการเชื่อมต่อ
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap">
                    ค่าตรวจจับคนล่าสุด
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap">
                    เวลาติดต่อล่าสุด (Last Seen)
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap">Firmware</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr
                    key={d.device_id}
                    className="border-b border-line last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3.5 font-bold text-ink">
                      {d.device_id}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-ink">
                      {d.room_id}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {isDemoSource(`${d.device_type} ${d.firmware_version || ''}`) ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          ข้อมูลจำลอง (Wokwi Demo)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ข้อมูลจริง (Real Data)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-ink">{d.device_type}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        status={
                          d.device_status === 'ONLINE'
                            ? 'OCCUPIED'
                            : 'DEVICE_OFFLINE'
                        }
                        customLabel={d.device_status}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      {d.last_presence_value ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-green-50 text-green-700">
                          ● พบคน (TRUE)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-warning-bg text-warning-text">
                          ○ ไม่พบคน (FALSE)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-ink">
                      {formatDateTimeThai(d.last_seen)}
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="text-xs bg-subtle border border-line px-2 py-0.5 rounded">
                        {d.firmware_version || 'v1.0.0'}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* IoT Events Table */}
      <div>
        <h3 className="text-base font-bold text-ink mb-3">
          ประวัติเหตุการณ์จากเซนเซอร์ล่าสุด (`IoT_Events`)
        </h3>

        {isLoading && <TableRowsSkeleton cols={6} rows={5} />}

        {!isLoading && !errorMsg && events.length === 0 && (
          <EmptyState
            title="ยังไม่มีประวัติเหตุการณ์จากเซนเซอร์"
            description="ระบบจะบันทึกเฉพาะเหตุการณ์เปลี่ยนสถานะที่สำคัญเพื่อประหยัดพื้นที่ Google Sheets"
          />
        )}

        {!isLoading && !errorMsg && events.length > 0 && (
          <div className="w-full overflow-x-auto border border-line rounded-xl">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-subtle text-ink-secondary text-[13px] font-semibold border-b border-line">
                  <th className="px-4 py-3 whitespace-nowrap">Event ID</th>
                  <th className="px-4 py-3 whitespace-nowrap">แหล่งข้อมูล</th>
                  <th className="px-4 py-3 whitespace-nowrap">อุปกรณ์ / ห้อง</th>
                  <th className="px-4 py-3 whitespace-nowrap">
                    ประเภทเหตุการณ์
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap">ค่า Presence</th>
                  <th className="px-4 py-3 whitespace-nowrap">
                    เวลาเกิดเหตุการณ์
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap">
                    เวลาที่ Backend รับข้อมูล
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 50).map((e) => (
                  <tr
                    key={e.event_id}
                    className="border-b border-line last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3.5 text-xs font-mono">
                      {e.event_id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {isDemoSource(`${e.event_id} ${e.idempotency_key || ''}`) ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          Wokwi Demo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ข้อมูลจริง
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-ink">
                      {e.device_id} ({e.room_id})
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        status="AVAILABLE"
                        customLabel={e.event_type}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      {e.presence_value ? 'พบคน (TRUE)' : 'ไม่พบคน (FALSE)'}
                    </td>
                    <td className="px-4 py-3.5">
                      {formatDateTimeThai(e.event_time)}
                    </td>
                    <td className="px-4 py-3.5">
                      {formatDateTimeThai(e.received_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
