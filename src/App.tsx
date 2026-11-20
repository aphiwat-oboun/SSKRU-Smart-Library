/**
 * ============================================================================
 * SRC/APP.TSX — Root React Application with Lazy Secondary Routes
 * ============================================================================
 */

import React, { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AppProvider } from './hooks/useAppContext';
import { ToastProvider } from './hooks/useToast';
import { DashboardPage } from './pages/DashboardPage';

const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);
const RoomManagementPage = lazy(() =>
  import('./pages/RoomManagementPage').then((m) => ({ default: m.RoomManagementPage }))
);
const StudentsPage = lazy(() =>
  import('./pages/StudentsPage').then((m) => ({ default: m.StudentsPage }))
);
const WaitingGroupsPage = lazy(() =>
  import('./pages/WaitingGroupsPage').then((m) => ({ default: m.WaitingGroupsPage }))
);
const UsageHistoryPage = lazy(() =>
  import('./pages/UsageHistoryPage').then((m) => ({ default: m.UsageHistoryPage }))
);
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const IoTDevicesPage = lazy(() =>
  import('./pages/IoTDevicesPage').then((m) => ({ default: m.IoTDevicesPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

const PageFallback: React.FC = () => (
  <div className="p-8 text-center text-[16px] text-ink-secondary">กำลังโหลด...</div>
);

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppProvider>
        <HashRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/rooms" element={<RoomManagementPage />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/waiting" element={<WaitingGroupsPage />} />
                <Route path="/history" element={<UsageHistoryPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/iot" element={<IoTDevicesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </HashRouter>
      </AppProvider>
    </ToastProvider>
  );
};

export default App;
