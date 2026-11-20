/**
 * ============================================================================
 * SRC/TYPES/API.TS — Strict RPC Action Names, Envelopes & Response Types
 * System: Library Room Monitoring & Smart Alert (SRRU Smart Library)
 * ============================================================================
 */

import {
  CardStatus,
  CheckoutReason,
  EndReason,
  FloorId,
  IoTDeviceRecord,
  IoTEventRecord,
  NotificationRecord,
  RoomSessionRecord,
  RoomSnapshot,
  RoomStatus,
  SessionMemberRecord,
  SessionStatus,
  StaffProfile,
  StudentCardRecord,
  StudentMasterRecord,
  StudentStatus,
  WaitingGroupRecord,
  WaitingRoomType,
  WaitingStatus
} from './database';

export type RpcAction =
  | 'loginStaff'
  | 'logoutStaff'
  | 'verifySessionToken'
  | 'getDashboardSnapshot'
  | 'getRoomDetail'
  | 'setRoomStatus'
  | 'getStudentsMaster'
  | 'registerStudentAndCard'
  | 'verifyStudentCardForSession'
  | 'getStudentDetailAndHistory'
  | 'startRoomSession'
  | 'checkoutSessionMember'
  | 'endRoomSession'
  | 'getUsageHistory'
  | 'getWaitingGroups'
  | 'addWaitingGroup'
  | 'updateWaitingGroupStatus'
  | 'getNotificationsList'
  | 'acknowledgeNotification'
  | 'acknowledgeAllNotifications'
  | 'getIoTOverview'
  | 'getAnalyticsReport'
  | 'evaluatePeriodicAlertsAndIoT'
  | 'getSystemSettings'
  | 'updateSystemSettings';

export interface RpcRequestEnvelope<TPayload = Record<string, unknown>> {
  action: RpcAction;
  authToken: string;
  payload: TPayload;
  clientTimestamp: string;
}

export interface RpcResponseEnvelope<TData = unknown> {
  success: boolean;
  data?: TData;
  error?: string;
  errorCode?: string;
  unauthorized?: boolean;
  serverTime: string;
}

// 1. Auth Responses
export interface LoginStaffResponse {
  token: string;
  staff: StaffProfile;
}

export interface VerifySessionResponse {
  staff: StaffProfile;
}

// 2. Dashboard Snapshot
export interface DashboardSummaryCounts {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  warningRooms: number;
  activeUsersCount: number;
  waitingGroupsCount: number;
}

export interface RecentActivityItem {
  session_id: string;
  room_id: string;
  room_name: string;
  student_ids: string[];
  timestamp: string;
  session_status: SessionStatus;
  end_reason: EndReason;
  activity_type: 'SESSION_START' | 'SESSION_END';
}

export interface HourlyBucket {
  label: string;
  count: number;
}

export interface DailyUsageSummary {
  totalSessionsToday: number;
  totalHoursToday: number;
  hourlyBuckets: HourlyBucket[];
}

export interface DashboardSnapshot {
  serverTime: string;
  summary: DashboardSummaryCounts;
  rooms: RoomSnapshot[];
  recentActivities: RecentActivityItem[];
  unreadNotifications: NotificationRecord[];
  dailySummary: DailyUsageSummary;
}

// 3. Room Detail
export interface RoomDetailResponse {
  room: {
    room_id: string;
    room_number: string;
    room_name: string;
    floor_id: FloorId;
    room_type: string;
    room_status: RoomStatus;
    effective_status: RoomStatus;
    current_session_id: string;
    presence_state: string;
    empty_since: string;
    elapsed_seconds: number;
  };
  activeSession: RoomSessionRecord | null;
  members: SessionMemberRecord[];
  device: IoTDeviceRecord | null;
}

// 4. Students & Card Scanning
export interface VerifiedStudentCard {
  student_id: string;
  student_name: string;
  student_year: number;
  faculty_name: string;
  major_name: string;
  student_status: StudentStatus;
  card_id: string;
  card_uid: string;
  card_status: CardStatus;
}

export interface RegisterStudentPayload {
  student_id: string;
  student_name: string;
  admission_year: number;
  student_year: number;
  faculty_id: string;
  faculty_name: string;
  major_id: string;
  major_name: string;
  student_status: StudentStatus;
  card_uid: string;
}

export interface RegisterStudentResponse {
  student_id: string;
  student_name: string;
  card_id: string;
  card_uid: string;
}

export interface StudentUsageHistoryItem {
  member_id: string;
  session_id: string;
  room_id: string;
  room_name: string;
  check_in_at: string;
  check_out_at: string;
  usage_seconds: number;
  check_out_reason: CheckoutReason;
}

export interface StudentDetailResponse {
  student: StudentMasterRecord;
  cards: StudentCardRecord[];
  usageHistory: StudentUsageHistoryItem[];
  totalUsageSeconds: number;
}

// 5. Session Start / End
export interface StartSessionMemberInput {
  student_id: string;
  card_id: string;
  card_uid: string;
}

export interface StartSessionPayload {
  room_id: string;
  waiting_id: string;
  idempotency_key: string;
  members: StartSessionMemberInput[];
}

export interface StartSessionResponse {
  session_id: string;
  room_id: string;
  room_name: string;
  start_time?: string;
  expected_end_time?: string;
  member_count?: number;
  idempotentReplay?: boolean;
}

export interface EndSessionResponse {
  session_id: string;
  room_id: string;
  duration_seconds?: number;
  end_reason?: EndReason;
  nextWaitingGroup?: WaitingGroupRecord | null;
  alreadyCompleted?: boolean;
}

// 6. Usage History
export interface UsageHistoryResponse {
  members: SessionMemberRecord[];
  sessions: RoomSessionRecord[];
}

// 7. Waiting Queue
export interface AddWaitingGroupPayload {
  representative_student_id: string;
  room_type: WaitingRoomType;
  note: string;
}

export interface UpdateWaitingStatusPayload {
  waiting_id: string;
  status: WaitingStatus;
}

// 8. Reports & Analytics
export interface RoomBreakdownStat {
  room_id: string;
  room_name: string;
  floor_id: FloorId;
  total_sessions: number;
  total_duration_seconds: number;
  avg_duration_seconds: number;
  auto_empty_count: number;
  overdue_alert_count: number;
}

export interface AnalyticsReportFilter {
  startDate: string;
  endDate: string;
  floorId: string;
  roomId: string;
}

export interface AnalyticsReportResponse {
  dailyUsageCount: number;
  monthlyUsageCount: number;
  filteredSessionsCount: number;
  mostUsedRoomName: string;
  averageDurationSeconds: number;
  autoEmptyCount: number;
  overdueAlertCount: number;
  roomBreakdown: RoomBreakdownStat[];
}

// 9. IoT Overview
export interface IoTOverviewResponse {
  devices: IoTDeviceRecord[];
  events: IoTEventRecord[];
}
