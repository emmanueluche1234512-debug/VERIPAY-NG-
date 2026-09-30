import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { 
  Bell, 
  CheckCheck, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight,
  Filter
} from 'lucide-react';
import { NotificationItem } from '../../types';

export const NotificationsView: React.FC = () => {
  const { 
    notifications, 
    markNotificationRead, 
    markAllNotificationsRead, 
    navigate
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B0D11] tracking-tight">
            Notifications & System Alerts
          </h2>
          <p className="text-xs text-[#6C757D]">
            Real-time feed of bank alert detections, payment verifications, and manual review notices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllNotificationsRead}>
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
            filter === 'all' ? 'bg-[#0B0D11] text-white' : 'bg-white border border-[#E9ECEF] text-[#495057] hover:text-[#0B0D11]'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
            filter === 'unread' ? 'bg-[#0B0D11] text-white' : 'bg-white border border-[#E9ECEF] text-[#495057] hover:text-[#0B0D11]'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification Items List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-5 h-5 text-[#6C757D]" />}
            title="No Notifications"
            description="You are caught up. Real-time reconciliation events will appear here as orders verify."
          />
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              onClick={() => markNotificationRead(item.id)}
              className={`p-4 rounded-lg border transition-all cursor-pointer ${
                item.read 
                  ? 'bg-white border-[#E9ECEF] text-[#495057]' 
                  : 'bg-[#F8F9FA] border-[#CED4DA] shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-white border border-[#E9ECEF] mt-0.5 shrink-0">
                    {item.type === 'payment_verified' && <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
                    {item.type === 'manual_review' && <AlertTriangle className="w-4 h-4 text-amber-700" />}
                    {item.type === 'system' && <ShieldCheck className="w-4 h-4 text-[#0B0D11]" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#0B0D11]">
                        {item.title}
                      </h4>
                      {!item.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      )}
                    </div>
                    <p className="text-xs text-[#495057] mt-1 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-mono text-[10px] text-[#6C757D]">
                    {new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  {item.link && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markNotificationRead(item.id);
                        navigate(item.link as any);
                      }}
                      className="text-[11px] font-semibold text-[#0B0D11] hover:underline flex items-center gap-1"
                    >
                      View →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
