/**
 * ============================================================================
 * SRC/SERVICES/APICLIENT.TS — Triple-Mode Typed Google Apps Script API Client
 * Supports:
 * 1. Native Google Apps Script HTML Service (window.google.script.run)
 * 2. Cross-Origin HTTPS Fetch to GAS Web App doPost (CORS-safe text/plain JSON)
 * 3. Local Browser GAS V8 Runtime Emulator (for local Vite dev/preview)
 * ============================================================================
 */

import { databaseConfig, getActiveGasWebAppUrl } from '../config/database';
import {
  AddWaitingGroupPayload,
  AnalyticsReportFilter,
  AnalyticsReportResponse,
  DashboardSnapshot,
  EndSessionResponse,
  IoTOverviewResponse,
  LoginStaffResponse,
  RegisterStudentPayload,
  RegisterStudentResponse,
  RoomDetailResponse,
  RpcAction,
  RpcRequestEnvelope,
  RpcResponseEnvelope,
  StartSessionPayload,
  StartSessionResponse,
  StudentDetailResponse,
  UpdateWaitingStatusPayload,
  UsageHistoryResponse,
  VerifiedStudentCard,
  VerifySessionResponse
} from '../types/api';
import {
  EndReason,
  NotificationRecord,
  RoomSnapshot,
  RoomStatus,
  SessionMemberRecord,
  SettingRecord,
  StudentMasterRecord,
  WaitingGroupRecord
} from '../types/database';

interface GoogleScriptRun {
  withSuccessHandler: (cb: (res: RpcResponseEnvelope<unknown>) => void) => {
    withFailureHandler: (errCb: (err: Error) => void) => {
      handleClientRpc: (envelope: RpcRequestEnvelope<Record<string, unknown>>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: {
      script?: {
        run?: GoogleScriptRun;
      };
    };
    __LOCAL_GAS_RPC__?: (
      envelope: RpcRequestEnvelope<Record<string, unknown>>
    ) => Promise<RpcResponseEnvelope<unknown>>;
  }
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly unauthorized: boolean;
  public readonly skipped: boolean;

  constructor(message: string, code = 'API_ERROR', unauthorized = false, skipped = false) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.unauthorized = unauthorized;
    this.skipped = skipped;
  }
}

const AUTH_TOKEN_KEY = 'SRRU_LIB_AUTH_TOKEN';
const inFlightPromises = new Map<string, Promise<unknown>>();
const rpcMemoryCache = new Map<string, unknown>();

const CACHEABLE_READ_ACTIONS = new Set<RpcAction>([
  'getDashboardSnapshot',
  'getStudentsMaster',
  'getUsageHistory',
  'getWaitingGroups',
  'getNotificationsList',
  'getIoTOverview',
  'getSystemSettings'
]);

export function getCachedRpc<TData>(action: RpcAction): TData | null {
  if (rpcMemoryCache.has(action)) {
    return rpcMemoryCache.get(action) as TData;
  }
  try {
    const raw = sessionStorage.getItem(`SRRU_RPC_CACHE_${action}`);
    if (raw) {
      const parsed = JSON.parse(raw) as TData;
      rpcMemoryCache.set(action, parsed);
      return parsed;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function writeCachedRpc(action: RpcAction, data: unknown): void {
  if (!CACHEABLE_READ_ACTIONS.has(action)) return;
  rpcMemoryCache.set(action, data);
  try {
    sessionStorage.setItem(`SRRU_RPC_CACHE_${action}`, JSON.stringify(data));
  } catch {
    // Ignore quota errors
  }
}

type UnauthorizedListener = () => void;
type OnlineStatusListener = (online: boolean) => void;

let onUnauthorizedCallback: UnauthorizedListener | null = null;
let onOnlineStatusCallback: OnlineStatusListener | null = null;

export function setApiListeners(
  onUnauthorized: UnauthorizedListener,
  onOnlineStatus: OnlineStatusListener
): void {
  onUnauthorizedCallback = onUnauthorized;
  onOnlineStatusCallback = onOnlineStatus;
}

export function getStoredAuthToken(): string {
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
}

export function setStoredAuthToken(token: string): void {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

function notifyOnline(isOnline: boolean): void {
  if (onOnlineStatusCallback) {
    onOnlineStatusCallback(isOnline);
  }
}

function processResponseEnvelope<TData>(res: RpcResponseEnvelope<TData>): TData {
  if (!res || typeof res !== 'object') {
    notifyOnline(false);
    throw new ApiError('ข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง', 'INVALID_RESPONSE');
  }
  notifyOnline(true);

  if (res.unauthorized) {
    setStoredAuthToken('');
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    throw new ApiError(res.error || 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง', res.errorCode || 'UNAUTHORIZED', true);
  }

  if (!res.success) {
    throw new ApiError(res.error || 'การดำเนินการไม่สำเร็จ', res.errorCode || 'OPERATION_FAILED', false);
  }

  return res.data as TData;
}

/**
 * Core RPC caller with In-flight request deduplication.
 * Concurrent calls with the same lockKey share the exact same Promise
 * instead of throwing an error (fixes React 18 StrictMode double-mount).
 */
export async function callRpc<TData, TPayload extends Record<string, unknown> = Record<string, unknown>>(
  action: RpcAction,
  payload?: TPayload,
  lockKey?: string
): Promise<TData> {
  if (lockKey && inFlightPromises.has(lockKey)) {
    return inFlightPromises.get(lockKey) as Promise<TData>;
  }

  const envelope: RpcRequestEnvelope<Record<string, unknown>> = {
    action,
    authToken: getStoredAuthToken(),
    payload: (payload || {}) as Record<string, unknown>,
    clientTimestamp: new Date().toISOString()
  };

  const execute = async (): Promise<TData> => {
    // 1. Native Google Apps Script HTML Service (window.google.script.run)
    if (typeof window !== 'undefined' && window.google?.script?.run) {
      const gasRunner = window.google.script.run;
      const rawRes = await new Promise<RpcResponseEnvelope<TData>>((resolve, reject) => {
        gasRunner
          .withSuccessHandler((res) => resolve(res as RpcResponseEnvelope<TData>))
          .withFailureHandler((err) => {
            notifyOnline(false);
            reject(new ApiError(err?.message || 'การเชื่อมต่อ Google Apps Script ล้มเหลว', 'GAS_RPC_FAILED'));
          })
          .handleClientRpc(envelope);
      });
      return processResponseEnvelope<TData>(rawRes);
    }

    // 2. Remote GAS Web App URL via CORS-safe HTTPS POST (text/plain JSON)
    const configuredGasUrl = getActiveGasWebAppUrl();

    if (
      databaseConfig.mode === 'gas' &&
      configuredGasUrl &&
      configuredGasUrl.startsWith('https://script.google.com/')
    ) {
      const response = await fetch(configuredGasUrl, {
        method: 'POST',
        headers: {
          // text/plain avoids CORS OPTIONS preflight which GAS does not support
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(envelope),
        redirect: 'follow'
      });

      if (!response.ok) {
        notifyOnline(false);
        throw new ApiError(`HTTP Error ${response.status}`, 'HTTP_ERROR');
      }

      const jsonRes = (await response.json()) as RpcResponseEnvelope<TData>;
      return processResponseEnvelope<TData>(jsonRes);
    }

    // 3. External REST API Backend (configured via VITE_DB_MODE=api & VITE_API_BASE_URL)
    if (
      databaseConfig.mode === 'api' &&
      databaseConfig.apiBaseUrl &&
      (databaseConfig.apiBaseUrl.startsWith('http://') ||
        databaseConfig.apiBaseUrl.startsWith('https://'))
    ) {
      const response = await fetch(databaseConfig.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(envelope)
      });

      if (!response.ok) {
        notifyOnline(false);
        throw new ApiError(`HTTP Error ${response.status}`, 'HTTP_ERROR');
      }

      const jsonRes = (await response.json()) as RpcResponseEnvelope<TData>;
      return processResponseEnvelope<TData>(jsonRes);
    }

    // 4. Local GAS V8 Runtime Emulator (VITE_DB_MODE=local or fallback)
    if (typeof window !== 'undefined' && typeof window.__LOCAL_GAS_RPC__ === 'function') {
      const localRes = (await window.__LOCAL_GAS_RPC__(envelope)) as RpcResponseEnvelope<TData>;
      return processResponseEnvelope<TData>(localRes);
    }

    notifyOnline(false);
    throw new ApiError('ไม่พบการเชื่อมต่อ Google Apps Script Backend', 'NO_BACKEND_TRANSPORT');
  };

  const promise = execute()
    .then((data) => {
      writeCachedRpc(action, data);
      return data;
    })
    .finally(() => {
      if (lockKey) {
        inFlightPromises.delete(lockKey);
      }
    });

  if (lockKey) {
    inFlightPromises.set(lockKey, promise);
  }

  return promise;
}

// ============================================================================
// TYPED DOMAIN API SERVICE FUNCTIONS
// ============================================================================

export const apiService = {
  loginStaff(username: string, password: string): Promise<LoginStaffResponse> {
    return callRpc<LoginStaffResponse>('loginStaff', { username, password }, 'auth_login');
  },

  logoutStaff(): Promise<{ loggedOut: boolean }> {
    return callRpc<{ loggedOut: boolean }>('logoutStaff', {}, 'auth_logout');
  },

  verifySessionToken(): Promise<VerifySessionResponse> {
    return callRpc<VerifySessionResponse>('verifySessionToken', {}, 'verify_session');
  },

  getDashboardSnapshot(): Promise<DashboardSnapshot> {
    return callRpc<DashboardSnapshot>('getDashboardSnapshot', {}, 'poll_dashboard');
  },

  getRoomDetail(roomId: string): Promise<RoomDetailResponse> {
    return callRpc<RoomDetailResponse>('getRoomDetail', { room_id: roomId }, `room_detail_${roomId}`);
  },

  setRoomStatus(roomId: string, status: RoomStatus): Promise<RoomSnapshot> {
    return callRpc<RoomSnapshot>('setRoomStatus', { room_id: roomId, status }, `set_room_${roomId}`);
  },

  createRoom(payload: {
    room_name: string;
    floor_id: 'FL3' | 'FL5';
    description?: string;
    capacity: number;
    device_id?: string;
  }): Promise<RoomSnapshot> {
    return callRpc<RoomSnapshot>('createRoom', payload, 'create_room');
  },

  getStudentsMaster(): Promise<{ students: StudentMasterRecord[] }> {
    return callRpc<{ students: StudentMasterRecord[] }>('getStudentsMaster', {}, 'load_students');
  },

  registerStudentAndCard(payload: RegisterStudentPayload): Promise<RegisterStudentResponse> {
    return callRpc<RegisterStudentResponse>(
      'registerStudentAndCard',
      payload as unknown as Record<string, unknown>,
      'reg_student'
    );
  },

  verifyStudentCardForSession(cardOrStudentQuery: string): Promise<VerifiedStudentCard> {
    return callRpc<VerifiedStudentCard>(
      'verifyStudentCardForSession',
      { cardOrStudentQuery },
      'verify_card_scan'
    );
  },

  getStudentDetailAndHistory(studentId: string): Promise<StudentDetailResponse> {
    return callRpc<StudentDetailResponse>(
      'getStudentDetailAndHistory',
      { student_id: studentId },
      `stu_detail_${studentId}`
    );
  },

  startRoomSession(payload: StartSessionPayload): Promise<StartSessionResponse> {
    return callRpc<StartSessionResponse>(
      'startRoomSession',
      payload as unknown as Record<string, unknown>,
      'start_session_submit'
    );
  },

  checkoutSessionMember(
    sessionId: string,
    memberId: string,
    reason = 'EARLY_LEAVE'
  ): Promise<SessionMemberRecord> {
    return callRpc<SessionMemberRecord>(
      'checkoutSessionMember',
      { session_id: sessionId, member_id: memberId, reason },
      `checkout_mem_${memberId}`
    );
  },

  endRoomSession(sessionId: string, endReason: EndReason = 'NORMAL_CHECKOUT'): Promise<EndSessionResponse> {
    return callRpc<EndSessionResponse>(
      'endRoomSession',
      { session_id: sessionId, end_reason: endReason },
      `end_sess_${sessionId}`
    );
  },

  getUsageHistory(): Promise<UsageHistoryResponse> {
    return callRpc<UsageHistoryResponse>('getUsageHistory', {}, 'load_history');
  },

  getWaitingGroups(): Promise<{ waitingGroups: WaitingGroupRecord[] }> {
    return callRpc<{ waitingGroups: WaitingGroupRecord[] }>('getWaitingGroups', {}, 'load_waiting');
  },

  addWaitingGroup(payload: AddWaitingGroupPayload): Promise<WaitingGroupRecord> {
    return callRpc<WaitingGroupRecord>(
      'addWaitingGroup',
      payload as unknown as Record<string, unknown>,
      'add_waiting'
    );
  },

  updateWaitingGroupStatus(payload: UpdateWaitingStatusPayload): Promise<WaitingGroupRecord> {
    return callRpc<WaitingGroupRecord>(
      'updateWaitingGroupStatus',
      payload as unknown as Record<string, unknown>,
      `upd_waiting_${payload.waiting_id}`
    );
  },

  getNotificationsList(): Promise<{ notifications: NotificationRecord[] }> {
    return callRpc<{ notifications: NotificationRecord[] }>('getNotificationsList', {}, 'load_notifs');
  },

  acknowledgeNotification(notificationId: string): Promise<NotificationRecord> {
    return callRpc<NotificationRecord>(
      'acknowledgeNotification',
      { notification_id: notificationId },
      `ack_${notificationId}`
    );
  },

  acknowledgeAllNotifications(): Promise<{ updatedCount: number }> {
    return callRpc<{ updatedCount: number }>('acknowledgeAllNotifications', {}, 'ack_all');
  },

  getIoTOverview(): Promise<IoTOverviewResponse> {
    return callRpc<IoTOverviewResponse>('getIoTOverview', {}, 'load_iot');
  },

  getAnalyticsReport(filter: AnalyticsReportFilter): Promise<AnalyticsReportResponse> {
    return callRpc<AnalyticsReportResponse>(
      'getAnalyticsReport',
      filter as unknown as Record<string, unknown>,
      'load_reports'
    );
  },

  evaluatePeriodicAlertsAndIoT(): Promise<Record<string, unknown>> {
    return callRpc<Record<string, unknown>>('evaluatePeriodicAlertsAndIoT', {}, 'periodic_eval');
  },

  getSystemSettings(): Promise<{ settings: SettingRecord[] }> {
    return callRpc<{ settings: SettingRecord[] }>('getSystemSettings', {}, 'load_settings');
  },

  updateSystemSettings(
    settings: Array<{ setting_key: string; setting_value: string }>
  ): Promise<{ updated: number }> {
    return callRpc<{ updated: number }>('updateSystemSettings', { settings }, 'save_settings');
  }
};
