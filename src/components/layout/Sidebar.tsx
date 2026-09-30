import React from 'react';
import { useApp } from '../../context/AppContext';
import { AppRoute } from '../../types';
import { 
  LayoutDashboard, 
  FolderKanban, 
  ShoppingCart, 
  ReceiptText, 
  UserCheck, 
  Layers, 
  KeyRound, 
  Webhook, 
  Bell, 
  BookOpen, 
  Settings, 
  LogOut,
  ChevronDown,
  Building2,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { 
    currentRoute, 
    navigate, 
    user, 
    logout, 
    projects, 
    activeProject, 
    setActiveProjectId,
    manualReviews,
    notifications
  } = useApp();

  const [projectDropdownOpen, setProjectDropdownOpen] = React.useState(false);

  const pendingReviewsCount = manualReviews.filter(r => r.status === 'pending').length;
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const navItems: { label: string; route: AppRoute; icon: React.ReactNode; badge?: number }[] = [
    { label: 'Dashboard', route: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Projects', route: '/projects', icon: <FolderKanban className="w-4 h-4" /> },
    { label: 'Orders', route: '/orders', icon: <ShoppingCart className="w-4 h-4" /> },
    { label: 'Transactions', route: '/transactions', icon: <ReceiptText className="w-4 h-4" /> },
    { 
      label: 'Manual Review', 
      route: '/manual-review', 
      icon: <UserCheck className="w-4 h-4" />,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined
    },
    { label: 'Integrations', route: '/integrations', icon: <Layers className="w-4 h-4" /> },
    { label: 'Merchant Admin', route: '/merchant-admin', icon: <Building2 className="w-4 h-4" /> },
    { label: 'API Keys', route: '/api-keys', icon: <KeyRound className="w-4 h-4" /> },
    { label: 'Webhooks', route: '/webhooks', icon: <Webhook className="w-4 h-4" /> },
    { 
      label: 'Notifications', 
      route: '/notifications', 
      icon: <Bell className="w-4 h-4" />,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined
    },
    { label: 'Documentation', route: '/docs', icon: <BookOpen className="w-4 h-4" /> },
    { label: 'Settings', route: '/settings', icon: <Settings className="w-4 h-4" /> }
  ];

  const handleNavClick = (route: AppRoute) => {
    navigate(route);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Panel */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0B0D11] text-[#CED4DA] flex flex-col border-r border-[#1E232B] transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#1E232B]">
          <button 
            onClick={() => handleNavClick('/dashboard')} 
            className="flex items-center gap-2.5 text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded bg-white text-[#0B0D11] flex items-center justify-center font-bold text-xs">
              VP
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white block">
                VERIPAY NG
              </span>
              <span className="text-[10px] text-[#6C757D] font-mono tracking-wider block">
                VERIFICATION CONSOLE
              </span>
            </div>
          </button>

          <button 
            onClick={onClose}
            className="md:hidden p-1 rounded text-[#6C757D] hover:text-white hover:bg-[#1E232B]"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Selector dropdown */}
        <div className="px-3 pt-3 pb-2 border-b border-[#1E232B]/80 relative">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6C757D] px-2 mb-1">
            Active Store / Project
          </div>
          <button
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#161A22] hover:bg-[#1E232B] border border-[#2B303B] text-xs text-white text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="w-3.5 h-3.5 text-[#ADB5BD] shrink-0" />
              <span className="truncate font-medium">{activeProject?.name || 'Select Project'}</span>
            </div>
            <ChevronDown className="w-3 h-3 text-[#6C757D] shrink-0 ml-1" />
          </button>

          {projectDropdownOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-[#161A22] border border-[#2B303B] rounded-md shadow-xl py-1 z-30">
              <div className="text-[10px] font-semibold text-[#6C757D] px-2.5 py-1 border-b border-[#2B303B]">
                SWITCH PROJECT
              </div>
              {projects.map(proj => (
                <button
                  key={proj.id}
                  onClick={() => {
                    setActiveProjectId(proj.id);
                    setProjectDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between hover:bg-[#1E232B] transition-colors ${
                    activeProject?.id === proj.id ? 'text-white font-semibold bg-[#1E232B]/50' : 'text-[#ADB5BD]'
                  }`}
                >
                  <span className="truncate">{proj.name}</span>
                  {activeProject?.id === proj.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ml-2" />
                  )}
                </button>
              ))}
              <div className="pt-1 mt-1 border-t border-[#2B303B] px-1">
                <button
                  onClick={() => {
                    setProjectDropdownOpen(false);
                    handleNavClick('/projects');
                  }}
                  className="w-full text-center py-1 text-[11px] text-[#CED4DA] hover:text-white transition-colors"
                >
                  + Manage Projects
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
          {navItems.map(item => {
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                onClick={() => handleNavClick(item.route)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1E232B] text-white font-semibold border-l-2 border-white'
                    : 'text-[#ADB5BD] hover:text-white hover:bg-[#161A22]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-white' : 'text-[#6C757D]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[#343A40] text-amber-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Profile & Session Footer */}
        <div className="p-3 border-t border-[#1E232B] bg-[#0E1116]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded-full bg-[#1E232B] border border-[#2B303B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {user?.fullName.charAt(0) || 'D'}
              </div>
              <div className="truncate">
                <div className="text-xs font-medium text-white truncate">
                  {user?.fullName || 'Developer'}
                </div>
                <div className="text-[10px] text-[#6C757D] truncate">
                  {user?.email || 'dev@veripay.ng'}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-[#6C757D] hover:text-white hover:bg-[#1E232B] rounded transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
