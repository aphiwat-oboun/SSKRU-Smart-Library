/**
 * ============================================================================
 * SRC/COMPONENTS/LAYOUT/APPSHELL.TSX — Clean Responsive Layout Shell
 * ============================================================================
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ToastContainer } from '../common/ToastContainer';
import { ConfirmModal } from '../modals/ConfirmModal';
import { LoginOverlay } from '../modals/LoginOverlay';
import { RegisterStudentModal } from '../modals/RegisterStudentModal';
import { RoomDetailModal } from '../modals/RoomDetailModal';
import { StartSessionModal } from '../modals/StartSessionModal';
import { StudentDetailModal } from '../modals/StudentDetailModal';
import { WaitingGroupModal } from '../modals/WaitingGroupModal';
import { MobileBottomNav } from './MobileBottomNav';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AppShell: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  return (
    <div className="flex min-h-screen w-full bg-appbg text-ink overflow-x-hidden">
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <Topbar />

        <main className="p-3.5 sm:p-6 lg:p-8 pb-28 lg:pb-10 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Native-Style Mobile Bottom Navigation */}
      <MobileBottomNav onOpenDrawer={() => setIsMobileSidebarOpen(true)} />

      {/* Global Overlays, Modals & Toasts */}
      <LoginOverlay />
      <StartSessionModal />
      <RoomDetailModal />
      <StudentDetailModal />
      <RegisterStudentModal />
      <WaitingGroupModal />
      <ConfirmModal />
      <ToastContainer />
    </div>
  );
};
