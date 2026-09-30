import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sidebar } from './Sidebar';
import { DashboardHeader } from './DashboardHeader';
import { AppRoute } from '../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: string[];
  onOpenCreateOrder?: () => void;
  onOpenCreateProject?: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  breadcrumbs = []
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Sidebar Navigation */}
      <Sidebar 
        isOpen={mobileSidebarOpen} 
        onClose={() => setMobileSidebarOpen(false)} 
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Top Header */}
        <DashboardHeader
          title={title}
          breadcrumbs={breadcrumbs}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
        />

        {/* Workspace Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
