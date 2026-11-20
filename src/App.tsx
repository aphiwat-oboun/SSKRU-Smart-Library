/**
 * ============================================================================
 * SRC/APP.TSX — Root React Application (Instant Route Switching, Zero Suspense Lag)
 * ============================================================================
 */

import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AppProvider } from './hooks/useAppContext';
import { ToastProvider } from './hooks/useToast';
import { DashboardPage } from './pages/DashboardPage';
import { IoTDevicesPage } from './pages/IoTDevicesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { RoomManagementPage } from './pages/RoomManagementPage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentsPage } from './pages/StudentsPage';
import { UsageHistoryPage } from './pages/UsageHistoryPage';
import { WaitingGroupsPage } from './pages/WaitingGroupsPage';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppProvider>
        <HashRouter>
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
        </HashRouter>
      </AppProvider>
    </ToastProvider>
  );
};

export default App;
