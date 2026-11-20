/**
 * ============================================================================
 * SRC/TYPES/DATABASE.TS — Strict TypeScript Interfaces for all 12 Sheets
 * System: Library Room Monitoring & Smart Alert (SRRU Smart Library)
 * ============================================================================
 */

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'WARNING' | 'DEVICE_OFFLINE' | 'MAINTENANCE';
export type PresenceState = 'PRESENT' | 'EMPTY' | 'UNKNOWN';
export type FloorId = 'FL3' | 'FL5';
export type RoomType = 'SMALL_MEETING' | 'MEETING';
export type WaitingRoomType = 'ANY' | 'SMALL_MEETING' | 'MEETING';

export type StudentStatus = 'ACTIVE' | 'GRADUATED' | 'SUSPENDED' | 'INACTIVE';
export type CardStatus = 'ACTIVE' | 'LOST' | 'REVOKED' | 'EXPIRED';

export type SessionStatus = 'ACTIVE' | 'OVERDUE_WARNING' | 'COMPLETED';
export type EndReason = 'NORMAL_CHECKOUT' | 'AUTO_EMPTY' | 'STAFF_FORCED' | '';
export type CheckoutReason = 'SESSION_END' | 'EARLY_LEAVE' | 'AUTO_EMPTY' | 'STAFF_FORCED' | 'ACTIVE' | '';

export type WaitingStatus = 'WAITING' | 'SERVED' | 'CANCELLED';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'ERROR';
export type StaffRole = 'ADMIN' | 'STAFF';
export type StaffStatus = 'ACTIVE' | 'INACTIVE';

export type NotificationType =
  | 'OVERDUE_WITH_WAITING'
  | 'KEY_HANDOVER_TIMEOUT'
  | 'AUTO_EMPTY_CLOSED'
  | 'DEVICE_OFFLINE'
  | 'SENSOR_ERROR';

export type NotificationSeverity = 'INFO' | 'WARNING' | 'DANGER';
export type NotificationStatus = 'UNREAD' | 'ACKNOWLEDGED' | 'RESOLVED';

// 1. Settings
export interface SettingRecord {
  setting_key: string;
  setting_value: string;
  data_type: 'NUMBER' | 'BOOLEAN' | 'STRING' | 'JSON';
  description: string;
  updated_by: string;
  updated_at: string;
}

// 2. Staff (Sanitized for Client)
export interface StaffProfile {
  staff_id: string;
  username: string;
  staff_name: string;
  email: string;
  role: StaffRole;
  staff_status: StaffStatus;
  last_login_at: string;
}

// 3. Floors
export interface FloorRecord {
  floor_id: FloorId;
  floor_number: number;
  floor_name: string;
  total_rooms: number;
  floor_status: 'ACTIVE' | 'MAINTENANCE';
  created_at: string;
  updated_at: string;
}

// 4. Rooms (Enriched for Real-time Dashboard & Room Management)
export interface RoomSnapshot {
  room_id: string;
  room_number: string;
  room_name: string;
  floor_id: FloorId;
  room_type: RoomType;
  room_status: RoomStatus;
  effective_status: RoomStatus;
  current_session_id: string;
  session_start_time: string;
  expected_end_time: string;
  elapsed_seconds: number;
  active_member_count: number;
  has_entered: boolean;
  presence_state: PresenceState;
  empty_since: string;
  device_id: string;
  device_status: DeviceStatus;
}

// 5. Students (Master Data joined with active card summary)
export interface StudentMasterRecord {
  student_id: string;
  student_name: string;
  admission_year: number;
  student_year: number;
  faculty_id: string;
  faculty_name: string;
  major_id: string;
  major_name: string;
  student_status: StudentStatus;
  card_id?: string;
  card_uid?: string;
  card_status?: CardStatus | '';
  created_at: string;
  updated_at: string;
}

// 6. Student_Cards
export interface StudentCardRecord {
  card_id: string;
  student_id: string;
  card_uid: string;
  card_status: CardStatus;
  registered_at: string;
  registered_by: string;
  updated_at: string;
}

// 7. Room_Sessions
export interface RoomSessionRecord {
  session_id: string;
  room_id: string;
  room_name?: string;
  floor_id?: FloorId | '';
  waiting_id?: string;
  member_count?: number;
  student_ids?: string[];
  start_time: string;
  expected_end_time: string;
  actual_end_time: string;
  duration_seconds: number;
  session_status: SessionStatus;
  end_reason: EndReason;
  has_entered?: boolean;
  started_by_staff_id?: string;
  ended_by_staff_id?: string;
  idempotency_key?: string;
}

// 8. Session_Members
export interface SessionMemberRecord {
  member_id: string;
  session_id: string;
  student_id: string;
  student_name?: string;
  card_id: string;
  room_id?: string;
  room_name?: string;
  floor_id?: FloorId | '';
  check_in_at: string;
  check_out_at: string;
  usage_seconds: number;
  check_out_reason: CheckoutReason;
}

// 9. Waiting_Groups
export interface WaitingGroupRecord {
  waiting_id: string;
  queue_number: string;
  student_group_id: string;
  room_type: WaitingRoomType;
  created_at: string;
  waiting_status: WaitingStatus;
  served_at: string;
  managed_by_staff_id: string;
  note: string;
}

// 10. IoT_Devices
export interface IoTDeviceRecord {
  device_id: string;
  room_id: string;
  device_type: string;
  device_status: DeviceStatus;
  last_seen: string;
  firmware_version: string;
  is_active: boolean;
  last_presence_value: boolean;
  updated_at: string;
}

// 11. IoT_Events
export interface IoTEventRecord {
  event_id: string;
  device_id: string;
  room_id: string;
  event_type: string;
  presence_value: boolean;
  event_time: string;
  received_at: string;
  idempotency_key: string;
}

// 12. Notifications
export interface NotificationRecord {
  notification_id: string;
  dedup_key: string;
  notification_type: NotificationType;
  severity: NotificationSeverity;
  room_id: string;
  session_id: string;
  title: string;
  message: string;
  notification_status: NotificationStatus;
  sound_played: boolean;
  created_at: string;
  acknowledged_by: string;
  acknowledged_at: string;
}

// ============================================================================
// CORE ER DIAGRAM SCHEMA (rooms, room_status, devices, students, usage_history)
// ============================================================================

export interface StudentSchemaRecord {
  student_id: string; // PK — รหัสนักศึกษา
  full_name: string;  // ชื่อ-นามสกุล
  year_level: number; // ชั้นปี (1-4)
  faculty: string;    // คณะ
  major: string;      // สาขาวิชา
}

export interface UsageHistorySchemaRecord {
  history_id: string; // PK
  room_id: string;    // FK -> rooms.room_id
  device_id: string;  // FK -> devices.device_id
  student_id: string; // FK -> students.student_id
  start_time: string;
  end_time: string;
  duration: number;
}
