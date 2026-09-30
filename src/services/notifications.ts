import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Database } from '../types/database';
import { NotificationItem, AuditLogEntry } from '../types';

export const notificationsService = {
  /**
   * Fetch current user's notifications
   */
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[notificationsService] Notice fetching notifications:', error.message);
      return [];
    }

    return (data || []).map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type as any,
      createdAt: n.created_at,
      read: n.read,
      link: n.link || undefined
    }));
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string) {
    if (!isSupabaseConfigured) return;
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  },

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(userId: string) {
    if (!isSupabaseConfigured) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
  }
};

export const auditLogsService = {
  /**
   * Fetch audit logs for authorized project
   */
  async getAuditLogs(projectId?: string): Promise<AuditLogEntry[]> {
    if (!isSupabaseConfigured) return [];

    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[auditLogsService] Notice fetching audit logs:', error.message);
      return [];
    }

    return (data || []).map(log => ({
      id: log.id,
      projectId: log.project_id || undefined,
      action: log.action,
      actor: log.actor_user_id || 'System',
      details: typeof log.details === 'string' ? log.details : JSON.stringify(log.details),
      timestamp: log.created_at
    }));
  },

  /**
   * Record an audit trail entry
   */
  async log(action: string, details: Record<string, any>, projectId?: string, actorId?: string) {
    if (!isSupabaseConfigured) return;

    await supabase.from('audit_logs').insert({
      action,
      details,
      project_id: projectId || null,
      actor_user_id: actorId || null
    });
  }
};
