/**
 * ============================================================================
 * SRC/HOOKS/USEAPPCONTEXT.TSX — Global Application State, Smart Polling & Modals
 * ============================================================================
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import {
  ApiError,
  apiService,
  getStoredAuthToken,
  setApiListeners,
  setStoredAuthToken
} from '../services/apiClient';
import { DashboardSnapshot } from '../types/api';
import {
  NotificationRecord,
  StaffProfile,
  WaitingGroupRecord
} from '../types/database';
import { AudioAlertControls, useAudioAlert } from './useAudioAlert';
import { useToast } from './useToast';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'primary' | 'warning' | 'success';
  onConfirm: () => void;
}

export interface StartSessionModalTarget {
  isOpen: boolean;
  preselectedRoomId: string;
  waitingGroup: Pick<WaitingGroupRecord, 'waiting_id' | 'queue_number' | 'student_group_id'> | null;
}

interface AppContextValue {
  currentStaff: StaffProfile | null;
  isAuthenticated: boolean;
  isOnline: boolean;
  dashboardData: DashboardSnapshot | null;
  isDashboardLoading: boolean;
  isRefreshingDashboard: boolean;
  dashboardError: string | null;
  audio: AudioAlertControls;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshDashboard: (forceSkeleton?: boolean) => Promise<void>;
  acknowledgeAlert: (notificationId: string) => Promise<void>;
  optimisticUpdateRoom: (
    roomId: string,
    updater: (room: DashboardSnapshot['rooms'][number]) => DashboardSnapshot['rooms'][number],
    activity?: { roomName: string; type: 'SESSION_START' | 'SESSION_END' }
  ) => () => void;

  // Modal States & Triggers
  startSessionTarget: StartSessionModalTarget;
  openStartSessionModal: (
    preselectedRoomId?: string,
    waitingGroup?: Pick<WaitingGroupRecord, 'waiting_id' | 'queue_number' | 'student_group_id'> | null
  ) => void;
  closeStartSessionModal: () => void;

  activeRoomDetailId: string | null;
  openRoomDetailModal: (roomId: string) => void;
  closeRoomDetailModal: () => void;

  activeStudentDetailId: string | null;
  openStudentDetailModal: (studentId: string) => void;
  closeStudentDetailModal: () => void;

  isRegisterStudentOpen: boolean;
  openRegisterStudentModal: () => void;
  closeRegisterStudentModal: () => void;

  isWaitingModalOpen: boolean;
  openWaitingModal: () => void;
  closeWaitingModal: () => void;

  confirmDialog: ConfirmDialogState;
  openConfirmModal: (params: Omit<ConfirmDialogState, 'isOpen'>) => void;
  closeConfirmModal: () => void;

  studentDataVersion: number;
  waitingDataVersion: number;
  bumpStudentDataVersion: () => void;
  bumpWaitingDataVersion: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const DASHBOARD_CACHE_KEY = 'SRRU_DASHBOARD_CACHE_V1';
const STAFF_CACHE_KEY = 'SRRU_STAFF_CACHE_V1';

function readCachedDashboard(): DashboardSnapshot | null {
  try {
    const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);
    return raw ? (JSON.parse(raw) as DashboardSnapshot) : null;
  } catch {
    return null;
  }
}

function writeCachedDashboard(snapshot: DashboardSnapshot | null): void {
  try {
    if (snapshot) {
      localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(snapshot));
    } else {
      localStorage.removeItem(DASHBOARD_CACHE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

function readCachedStaff(): StaffProfile | null {
  try {
    if (!getStoredAuthToken()) return null;
    const raw = localStorage.getItem(STAFF_CACHE_KEY) || sessionStorage.getItem(STAFF_CACHE_KEY);
    return raw ? (JSON.parse(raw) as StaffProfile) : null;
  } catch {
    return null;
  }
}

function writeCachedStaff(staff: StaffProfile | null): void {
  try {
    if (staff) {
      const json = JSON.stringify(staff);
      localStorage.setItem(STAFF_CACHE_KEY, json);
      sessionStorage.setItem(STAFF_CACHE_KEY, json);
    } else {
      localStorage.removeItem(STAFF_CACHE_KEY);
      sessionStorage.removeItem(STAFF_CACHE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const audio = useAudioAlert();

  const initialStaff = readCachedStaff();
  const initialDashboard = initialStaff ? readCachedDashboard() : null;

  const [currentStaff, setCurrentStaff] = useState<StaffProfile | null>(initialStaff);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<DashboardSnapshot | null>(initialDashboard);
  const [isDashboardLoading, setIsDashboardLoading] = useState<boolean>(!initialDashboard);
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [studentDataVersion, setStudentDataVersion] = useState<number>(0);
  const [waitingDataVersion, setWaitingDataVersion] = useState<number>(0);

  const playedNotificationIdsRef = useRef<Set<string>>(new Set());
  const hasDashboardDataRef = useRef<boolean>(Boolean(initialDashboard));

  // Modal States
  const [startSessionTarget, setStartSessionTarget] = useState<StartSessionModalTarget>({
    isOpen: false,
    preselectedRoomId: '',
    waitingGroup: null
  });
  const [activeRoomDetailId, setActiveRoomDetailId] = useState<string | null>(null);
  const [activeStudentDetailId, setActiveStudentDetailId] = useState<string | null>(null);
  const [isRegisterStudentOpen, setIsRegisterStudentOpen] = useState<boolean>(false);
  const [isWaitingModalOpen, setIsWaitingModalOpen] = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'ยืนยัน',
    variant: 'danger',
    onConfirm: () => undefined
  });

  const checkNewUnreadNotifications = useCallback(
    (unreadList: NotificationRecord[]) => {
      let shouldChime = false;
      for (const n of unreadList) {
        if (!playedNotificationIdsRef.current.has(n.notification_id)) {
          playedNotificationIdsRef.current.add(n.notification_id);
          if (n.severity === 'WARNING' || n.severity === 'DANGER') {
            shouldChime = true;
          }
        }
      }
      if (shouldChime) {
        audio.playAlertChime();
      }
    },
    [audio]
  );

  const refreshDashboard = useCallback(
    async (forceSkeleton = false): Promise<void> => {
      if (!getStoredAuthToken()) return;
      if (forceSkeleton || !hasDashboardDataRef.current) {
        setIsDashboardLoading(true);
        setDashboardError(null);
      } else {
        setIsRefreshingDashboard(true);
      }
      try {
        const snapshot = await apiService.getDashboardSnapshot();
        hasDashboardDataRef.current = true;
        setDashboardData(snapshot);
        writeCachedDashboard(snapshot);
        setDashboardError(null);
        setIsDashboardLoading(false);
        setIsRefreshingDashboard(false);
        checkNewUnreadNotifications(snapshot.unreadNotifications || []);
      } catch (err) {
        setIsRefreshingDashboard(false);
        if (err instanceof ApiError && err.skipped) {
          return;
        }
        const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูล Dashboard ได้';
        setDashboardError(msg);
        setIsDashboardLoading(false);
      }
    },
    [checkNewUnreadNotifications]
  );

  /**
   * Optimistic UI update: mutates local dashboard state + cache in 0ms
   * and returns a rollback function in case the background API call fails.
   */
  const optimisticUpdateRoom = useCallback(
    (
      roomId: string,
      updater: (room: DashboardSnapshot['rooms'][number]) => DashboardSnapshot['rooms'][number],
      activity?: { roomName: string; type: 'SESSION_START' | 'SESSION_END' }
    ): (() => void) => {
      let previousSnapshot: DashboardSnapshot | null = null;
      setDashboardData((prev) => {
        previousSnapshot = prev;
        if (!prev) return prev;
        const nextRooms = prev.rooms.map((r) => (r.room_id === roomId ? updater(r) : r));
        const nextActivities = activity
          ? [
              {
                session_id: `OPT-${Date.now()}`,
                room_id: roomId,
                room_name: activity.roomName,
                student_ids: [],
                timestamp: new Date().toISOString(),
                session_status: (activity.type === 'SESSION_START' ? 'ACTIVE' : 'COMPLETED') as
                  | 'ACTIVE'
                  | 'COMPLETED',
                end_reason: (activity.type === 'SESSION_END' ? 'NORMAL_CHECKOUT' : '') as
                  | 'NORMAL_CHECKOUT'
                  | '',
                activity_type: activity.type
              },
              ...(prev.recentActivities || [])
            ].slice(0, 10)
          : prev.recentActivities;

        const next: DashboardSnapshot = {
          ...prev,
          serverTime: new Date().toISOString(),
          rooms: nextRooms,
          recentActivities: nextActivities
        };
        writeCachedDashboard(next);
        return next;
      });

      return () => {
        if (previousSnapshot) {
          setDashboardData(previousSnapshot);
          writeCachedDashboard(previousSnapshot);
        }
      };
    },
    []
  );

  // Register global API unauthorized / online status listeners
  useEffect(() => {
    setApiListeners(
      () => {
        setCurrentStaff(null);
      },
      (online) => {
        setIsOnline(online);
      }
    );
  }, []);

  // Verify existing session token on initial mount
  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      setCurrentStaff(null);
      setIsDashboardLoading(false);
      return;
    }

    apiService
      .verifySessionToken()
      .then((res) => {
        setCurrentStaff(res.staff);
        writeCachedStaff(res.staff);
        void refreshDashboard(!hasDashboardDataRef.current);
      })
      .catch((err) => {
        // Ignore duplicate in-flight call caused by React 18 StrictMode double-mount
        if (err instanceof ApiError && err.skipped) {
          return;
        }
        // Only force logout when backend explicitly rejects the token as unauthorized
        if (err instanceof ApiError && err.unauthorized) {
          setStoredAuthToken('');
          writeCachedStaff(null);
          setCurrentStaff(null);
        }
        setIsDashboardLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optimized Polling Loop: 15s when tab is visible, 60s periodic alert check
  useEffect(() => {
    if (!currentStaff) return;

    // Warm up secondary page caches silently in the background so switching tabs is 0ms instant!
    const prefetchTimer = window.setTimeout(() => {
      void apiService.getStudentsMaster().catch(() => undefined);
      void apiService.getUsageHistory().catch(() => undefined);
      void apiService.getNotificationsList().catch(() => undefined);
      void apiService.getWaitingGroups().catch(() => undefined);
      void apiService.getIoTOverview().catch(() => undefined);
      void apiService.getSystemSettings().catch(() => undefined);
    }, 600);

    const dashTimer = window.setInterval(() => {
      if (!document.hidden) {
        void refreshDashboard(false);
      }
    }, 15000);

    const evalTimer = window.setInterval(() => {
      if (!document.hidden) {
        apiService
          .evaluatePeriodicAlertsAndIoT()
          .then(() => {
            void refreshDashboard(false);
          })
          .catch(() => undefined);
      }
    }, 60000);

    return () => {
      window.clearTimeout(prefetchTimer);
      window.clearInterval(dashTimer);
      window.clearInterval(evalTimer);
    };
  }, [currentStaff, refreshDashboard]);

  const login = useCallback(
    async (username: string, password: string): Promise<void> => {
      audio.unlockAudio();
      const res = await apiService.loginStaff(username, password);
      setStoredAuthToken(res.token);
      setCurrentStaff(res.staff);
      writeCachedStaff(res.staff);

      // Hydrate cached dashboard immediately for instant UI render
      const cached = readCachedDashboard();
      if (cached) {
        hasDashboardDataRef.current = true;
        setDashboardData(cached);
        setIsDashboardLoading(false);
      }

      showToast(`ยินดีต้อนรับ ${res.staff.staff_name}`, 'success');
      // Refresh latest data in background without blocking the UI
      void refreshDashboard(!cached);
    },
    [audio, refreshDashboard, showToast]
  );

  const logout = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการออกจากระบบ',
      message: 'คุณต้องการออกจากระบบตรวจสอบสถานะห้องค้นคว้าใช่หรือไม่?',
      confirmLabel: 'ออกจากระบบ',
      variant: 'danger',
      onConfirm: () => {
        void apiService.logoutStaff().catch(() => undefined);
        setStoredAuthToken('');
        writeCachedStaff(null);
        setCurrentStaff(null);
        hasDashboardDataRef.current = false;
        setDashboardData(null);
      }
    });
  }, []);

  const acknowledgeAlert = useCallback(
    async (notificationId: string): Promise<void> => {
      try {
        await apiService.acknowledgeNotification(notificationId);
        showToast('บันทึกการรับทราบการแจ้งเตือนแล้ว', 'success');
        await refreshDashboard(false);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถรับทราบการแจ้งเตือนได้', 'error');
      }
    },
    [refreshDashboard, showToast]
  );

  const openStartSessionModal = useCallback(
    (
      preselectedRoomId = '',
      waitingGroup: Pick<WaitingGroupRecord, 'waiting_id' | 'queue_number' | 'student_group_id'> | null = null
    ) => {
      audio.unlockAudio();
      setStartSessionTarget({
        isOpen: true,
        preselectedRoomId,
        waitingGroup
      });
    },
    [audio]
  );

  const closeStartSessionModal = useCallback(() => {
    setStartSessionTarget({
      isOpen: false,
      preselectedRoomId: '',
      waitingGroup: null
    });
  }, []);

  const openRoomDetailModal = useCallback((roomId: string) => {
    setActiveRoomDetailId(roomId);
  }, []);

  const closeRoomDetailModal = useCallback(() => {
    setActiveRoomDetailId(null);
  }, []);

  const openStudentDetailModal = useCallback((studentId: string) => {
    setActiveStudentDetailId(studentId);
  }, []);

  const closeStudentDetailModal = useCallback(() => {
    setActiveStudentDetailId(null);
  }, []);

  const openRegisterStudentModal = useCallback(() => {
    setIsRegisterStudentOpen(true);
  }, []);

  const closeRegisterStudentModal = useCallback(() => {
    setIsRegisterStudentOpen(false);
  }, []);

  const openWaitingModal = useCallback(() => {
    setIsWaitingModalOpen(true);
  }, []);

  const closeWaitingModal = useCallback(() => {
    setIsWaitingModalOpen(false);
  }, []);

  const openConfirmModal = useCallback((params: Omit<ConfirmDialogState, 'isOpen'>) => {
    setConfirmDialog({
      ...params,
      isOpen: true
    });
  }, []);

  const closeConfirmModal = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const bumpStudentDataVersion = useCallback(() => {
    setStudentDataVersion((v) => v + 1);
  }, []);

  const bumpWaitingDataVersion = useCallback(() => {
    setWaitingDataVersion((v) => v + 1);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentStaff,
        isAuthenticated: Boolean(currentStaff),
        isOnline,
        dashboardData,
        isDashboardLoading,
        isRefreshingDashboard,
        dashboardError,
        audio,
        login,
        logout,
        refreshDashboard,
        acknowledgeAlert,
        optimisticUpdateRoom,
        startSessionTarget,
        openStartSessionModal,
        closeStartSessionModal,
        activeRoomDetailId,
        openRoomDetailModal,
        closeRoomDetailModal,
        activeStudentDetailId,
        openStudentDetailModal,
        closeStudentDetailModal,
        isRegisterStudentOpen,
        openRegisterStudentModal,
        closeRegisterStudentModal,
        isWaitingModalOpen,
        openWaitingModal,
        closeWaitingModal,
        confirmDialog,
        openConfirmModal,
        closeConfirmModal,
        studentDataVersion,
        waitingDataVersion,
        bumpStudentDataVersion,
        bumpWaitingDataVersion
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return ctx;
}
