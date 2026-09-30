import React from 'react';
import { useApp } from '../../context/AppContext';
import { Menu, Bell, BookOpen, Copy, Check } from 'lucide-react';

interface DashboardHeaderProps {
  onOpenMobileMenu: () => void;
  title: string;
  breadcrumbs?: string[];
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onOpenMobileMenu,
  title,
  breadcrumbs = []
}) => {
  const { activeProject, notifications, navigate } = useApp();

  const [copied, setCopied] = React.useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const copyProjectId = () => {
    if (activeProject) {
      navigator.clipboard.writeText(activeProject.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E9ECEF] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded-md text-[#495057] hover:text-[#0B0D11] hover:bg-[#F1F3F5] transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#6C757D]">
            <span>Console</span>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span className="text-[#CED4DA]">/</span>
                <span className={idx === breadcrumbs.length - 1 ? 'text-[#0B0D11] font-medium' : ''}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
          <h1 className="text-base font-bold text-[#0B0D11] tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Project ID copy chip */}
        {activeProject && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#F8F9FA] rounded border border-[#E9ECEF] text-xs">
            <span className="text-[11px] text-[#6C757D]">Project ID:</span>
            <span className="font-mono font-medium text-[#212529]">{activeProject.id}</span>
            <button
              onClick={copyProjectId}
              className="text-[#6C757D] hover:text-[#0B0D11] transition-colors p-0.5 ml-0.5 cursor-pointer"
              title="Copy Project ID"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}

        {/* Documentation shortcut */}
        <button
          onClick={() => navigate('/docs')}
          className="p-2 text-[#495057] hover:text-[#0B0D11] hover:bg-[#F1F3F5] rounded-md transition-colors cursor-pointer hidden sm:block"
          title="Developer Documentation"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="p-2 text-[#495057] hover:text-[#0B0D11] hover:bg-[#F1F3F5] rounded-md transition-colors relative cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
          )}
        </button>
      </div>
    </header>
  );
};
