import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Project,
  Order,
  PaymentAlert,
  ManualReviewItem,
  ApiKey,
  ApiKeyScope,
  WebhookEndpoint,
  WebhookDelivery,
  NotificationItem,
  AuditLogEntry,
  UserProfile,
  AppRoute,
  Currency,
  ReviewStatus
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService } from '../services/auth';
import { projectsService } from '../services/projects';
import { ordersService } from '../services/orders';
import { paymentAlertsService } from '../services/paymentAlerts';
import { notificationsService, auditLogsService } from '../services/notifications';
import { apiKeysService } from '../services/apiKeys';

const SELECTED_PROJECT_STORAGE_KEY = 'veripay_selected_project_id';

interface AppContextType {
  currentRoute: AppRoute;
  navigate: (route: AppRoute) => void;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isProjectDataLoading: boolean;
  dataError: string | null;
  isSupabaseConfigured: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (name: string, email: string, password?: string, company?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  projects: Project[];
  activeProject: Project | null;
  setActiveProjectId: (id: string) => void;
  createProject: (data: {
    name: string;
    websiteUrl: string;
    currency: Currency;
    receivingBank: { bankName: string; accountName: string; accountNumber: string; currency: Currency };
  }) => Promise<void>;
  orders: Order[];
  createOrder: (data: {
    merchantOrderReference: string;
    amount: number;
    currency: Currency;
    expectedPayerName: string;
    payerBank?: string;
  }) => Promise<void>;
  paymentAlerts: PaymentAlert[];
  manualReviews: ManualReviewItem[];
  handleReviewAction: (reviewId: string, action: ReviewStatus, note?: string) => Promise<void>;
  apiKeys: ApiKey[];
  createApiKey: (
    name: string,
    env?: 'test' | 'live',
    scopes?: ApiKeyScope[]
  ) => Promise<{ key: string; apiKey: ApiKey }>;
  revokeApiKey: (keyId: string) => Promise<void>;
  webhooks: WebhookEndpoint[];
  createWebhook: (data: Omit<WebhookEndpoint, 'id' | 'status' | 'createdAt' | 'projectId'>) => void;
  deleteWebhook: (id: string) => void;
  webhookDeliveries: WebhookDelivery[];
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  auditLogs: AuditLogEntry[];
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const PROTECTED_ROUTES: AppRoute[] = [
  '/dashboard',
  '/projects',
  '/orders',
  '/transactions',
  '/manual-review',
  '/integrations',
  '/api-keys',
  '/webhooks',
  '/notifications',
  '/docs',
  '/settings',
  '/merchant-admin'
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation Route State
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    const path = window.location.pathname as AppRoute;
    const validRoutes: AppRoute[] = [
      '/',
      '/signin',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/dashboard',
      '/projects',
      '/orders',
      '/transactions',
      '/manual-review',
      '/integrations',
      '/api-keys',
      '/webhooks',
      '/notifications',
      '/docs',
      '/settings',
      '/merchant-admin'
    ];
    return validRoutes.includes(path) ? path : '/';
  });

  // Auth & Loading States
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isProjectDataLoading, setIsProjectDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Real Supabase Database Data States (Never populated with sample/demo records)
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY) || '';
    }
    return '';
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentAlerts, setPaymentAlerts] = useState<PaymentAlert[]>([]);
  const [manualReviews, setManualReviews] = useState<ManualReviewItem[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [webhookDeliveries] = useState<WebhookDelivery[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Synchronize browser history and navigation
  const navigate = useCallback((route: AppRoute) => {
    setCurrentRoute(route);
    window.history.pushState({}, '', route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname as AppRoute;
      setCurrentRoute(path || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  /**
   * Queries all real project-scoped records from Supabase for `targetProjectId`.
   * Empty results `[]` remain `[]` (never replaced with sample data).
   * Query failures log the real error and set `dataError`.
   */
  const loadProjectScopedData = useCallback(async (targetProjectId: string) => {
    if (!isSupabaseConfigured || !targetProjectId) {
      setOrders([]);
      setPaymentAlerts([]);
      setManualReviews([]);
      setApiKeys([]);
      setAuditLogs([]);
      setIsProjectDataLoading(false);
      return;
    }

    setIsProjectDataLoading(true);
    setDataError(null);

    try {
      const [projectOrders, projectAlerts, projectKeys, projectAuditLogs] = await Promise.all([
        ordersService.getOrders(targetProjectId),
        paymentAlertsService.getPaymentAlerts(targetProjectId),
        apiKeysService.listKeys(targetProjectId),
        auditLogsService.getAuditLogs(targetProjectId)
      ]);

      const projectManualReviews = await paymentAlertsService.getManualReviews(
        targetProjectId,
        projectAlerts,
        projectOrders
      );

      setOrders(projectOrders);
      setPaymentAlerts(projectAlerts);
      setManualReviews(projectManualReviews);
      setApiKeys(projectKeys);
      setAuditLogs(projectAuditLogs);
    } catch (err: any) {
      console.error(`[AppContext] Error querying Supabase records for project ${targetProjectId}:`, err);
      setDataError(err?.message || 'Failed to load project data from Supabase.');
    } finally {
      setIsProjectDataLoading(false);
    }
  }, []);

  /**
   * Fetches the authenticated user's authorized projects from `public.projects`,
   * resolves the valid selected project ID, and loads that project's real Supabase data.
   */
  const loadDatabaseData = useCallback(
    async (currentUserId: string, preferredProjectId?: string) => {
      if (!isSupabaseConfigured) {
        setProjects([]);
        setOrders([]);
        setPaymentAlerts([]);
        setManualReviews([]);
        setApiKeys([]);
        setNotifications([]);
        setAuditLogs([]);
        return;
      }

      setIsProjectDataLoading(true);
      setDataError(null);

      try {
        // 1. Fetch authorized projects from public.projects (+ public.bank_accounts)
        const [userProjects, userNotifs] = await Promise.all([
          projectsService.getProjects(),
          notificationsService.getNotifications(currentUserId)
        ]);

        setProjects(userProjects);
        setNotifications(userNotifs);

        if (userProjects.length > 0) {
          const savedProjectId =
            preferredProjectId ||
            (typeof window !== 'undefined'
              ? window.localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY) || ''
              : '');

          const resolvedProject =
            userProjects.find(p => p.id === savedProjectId) || userProjects[0];

          const resolvedProjectId = resolvedProject.id;
          setActiveProjectIdState(resolvedProjectId);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, resolvedProjectId);
          }

          // 2. Fetch project-scoped records for the resolved project ID
          await loadProjectScopedData(resolvedProjectId);
        } else {
          setActiveProjectIdState('');
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY);
          }
          setOrders([]);
          setPaymentAlerts([]);
          setManualReviews([]);
          setApiKeys([]);
          setAuditLogs([]);
          setIsProjectDataLoading(false);
        }
      } catch (err: any) {
        console.error('[AppContext] Failed loading Supabase records:', err);
        setDataError(err?.message || 'Failed to load project data from Supabase.');
        setIsProjectDataLoading(false);
      }
    },
    [loadProjectScopedData]
  );

  /**
   * Project Switcher:
   * 1. Clears the previous project's dashboard state immediately.
   * 2. Sets the new selected project ID and persists it.
   * 3. Queries Supabase using the NEW project ID.
   */
  const setActiveProjectId = useCallback(
    (newProjectId: string) => {
      if (!newProjectId || newProjectId === activeProjectId) return;

      // 1. Clear previous project's state so data never mixes between projects
      setOrders([]);
      setPaymentAlerts([]);
      setManualReviews([]);
      setApiKeys([]);
      setAuditLogs([]);
      setDataError(null);

      // 2. Set new selected project ID
      setActiveProjectIdState(newProjectId);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, newProjectId);
      }

      // 3. Query Supabase using the NEW project ID
      if (isSupabaseConfigured && user) {
        loadProjectScopedData(newProjectId);
      }
    },
    [activeProjectId, user, loadProjectScopedData]
  );

  // Initialize and listen to Supabase Authentication Session
  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      setUser(null);
      setProjects([]);
      setOrders([]);
      setPaymentAlerts([]);
      setManualReviews([]);
      setApiKeys([]);
      setIsAuthLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          const profile = await authService.getProfile(session.user.id);
          const userProfile: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            fullName: profile?.full_name || session.user.user_metadata?.full_name || 'Developer',
            role: profile?.role === 'admin' ? 'Admin' : 'Developer',
            company: profile?.company || session.user.user_metadata?.company || undefined
          };
          setUser(userProfile);
          await loadDatabaseData(session.user.id);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('[AppContext] Auth session init failed:', err);
      } finally {
        if (isMounted) setIsAuthLoading(false);
      }
    };

    initAuth();

    // Subscribe to real-time auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await authService.getProfile(session.user.id);
        const userProfile: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          fullName: profile?.full_name || session.user.user_metadata?.full_name || 'Developer',
          role: profile?.role === 'admin' ? 'Admin' : 'Developer',
          company: profile?.company || session.user.user_metadata?.company || undefined
        };
        setUser(userProfile);
        await loadDatabaseData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProjects([]);
        setOrders([]);
        setPaymentAlerts([]);
        setManualReviews([]);
        setApiKeys([]);
        setNotifications([]);
        setAuditLogs([]);
        setActiveProjectIdState('');
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadDatabaseData]);

  // Protected route enforcement
  useEffect(() => {
    if (isAuthLoading) return;
    if (!user && PROTECTED_ROUTES.includes(currentRoute)) {
      navigate('/signin');
    }
  }, [user, currentRoute, isAuthLoading, navigate]);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || null;

  // Real Authentication Methods
  const login = async (email: string, password?: string): Promise<boolean> => {
    if (!password) {
      throw new Error('Password is required for Supabase authentication.');
    }

    const data = await authService.signIn(email, password);
    if (data.user) {
      const profile = await authService.getProfile(data.user.id);
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        fullName: profile?.full_name || data.user.user_metadata?.full_name || 'Developer',
        role: profile?.role === 'admin' ? 'Admin' : 'Developer',
        company: profile?.company || undefined
      });
      await loadDatabaseData(data.user.id);
      navigate('/dashboard');
      return true;
    }
    return false;
  };

  const signup = async (
    name: string,
    email: string,
    password?: string,
    company?: string
  ): Promise<boolean> => {
    if (!password) {
      throw new Error('Password is required for registration.');
    }

    const data = await authService.signUp({
      email,
      password,
      fullName: name,
      company
    });

    if (data.user && data.session) {
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        fullName: name,
        role: 'Developer',
        company
      });
      await loadDatabaseData(data.user.id);
      navigate('/dashboard');
      return true;
    }
    return true;
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await authService.signOut();
    }
    setUser(null);
    setProjects([]);
    setOrders([]);
    setPaymentAlerts([]);
    setManualReviews([]);
    setApiKeys([]);
    setNotifications([]);
    setAuditLogs([]);
    setActiveProjectIdState('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY);
    }
    navigate('/');
  };

  const resetPassword = async (email: string) => {
    await authService.resetPasswordForEmail(email);
  };

  const updatePassword = async (password: string) => {
    await authService.updateUserPassword(password);
  };

  // Real Project Persistence in Supabase
  const createProject = async (data: {
    name: string;
    websiteUrl: string;
    currency: Currency;
    receivingBank: { bankName: string; accountName: string; accountNumber: string; currency: Currency };
  }) => {
    if (!user) throw new Error('Must be signed in to create project.');

    const newProj = await projectsService.createProject(user.id, {
      name: data.name,
      websiteUrl: data.websiteUrl,
      currency: data.currency,
      receivingBank: data.receivingBank
    });

    // Clear previous project's records and switch to the newly created project
    setOrders([]);
    setPaymentAlerts([]);
    setManualReviews([]);
    setApiKeys([]);
    setAuditLogs([]);
    setDataError(null);

    setProjects(prev => [newProj, ...prev]);
    setActiveProjectIdState(newProj.id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, newProj.id);
    }

    await auditLogsService.log(
      'project.created',
      { name: newProj.name, bank: data.receivingBank.bankName },
      newProj.id,
      user.id
    );

    await loadProjectScopedData(newProj.id);
  };

  // Real Order Persistence in Supabase
  const createOrder = async (data: {
    merchantOrderReference: string;
    amount: number;
    currency: Currency;
    expectedPayerName: string;
    payerBank?: string;
  }) => {
    if (!activeProject) return;

    const newOrder = await ordersService.createOrder({
      projectId: activeProject.id,
      merchantOrderReference: data.merchantOrderReference,
      amount: data.amount,
      currency: data.currency,
      expectedPayerName: data.expectedPayerName,
      payerBank: data.payerBank
    });

    setOrders(prev => [newOrder, ...prev]);

    if (user) {
      await auditLogsService.log(
        'order.created',
        { reference: newOrder.merchantOrderReference, amount: newOrder.amount },
        activeProject.id,
        user.id
      );
    }
  };

  const handleReviewAction = async (reviewId: string, action: ReviewStatus, note?: string) => {
    if (!activeProject) return;
    await paymentAlertsService.updateManualReviewStatus(
      reviewId,
      activeProject.id,
      action,
      user?.id,
      note
    );
    setManualReviews(prev =>
      prev.map(r => {
        if (r.id === reviewId) {
          return {
            ...r,
            status: action,
            reviewedAt: new Date().toISOString(),
            reviewedBy: user?.email || user?.id || 'developer',
            resolutionNote: note || `Review marked as ${action}`
          };
        }
        return r;
      })
    );
  };

  const createApiKey = async (
    name: string,
    env: 'test' | 'live' = 'live',
    scopes: ApiKeyScope[] = ['bank_accounts:read', 'bank_accounts:write']
  ) => {
    const targetProjectId = activeProject?.id || activeProjectId;
    const res = await apiKeysService.createKey(targetProjectId, name, env, scopes, user?.id);
    setApiKeys(prev => [res.apiKey, ...prev]);
    return { key: res.secret, apiKey: res.apiKey };
  };

  const revokeApiKey = async (keyId: string) => {
    const targetProjectId = activeProject?.id || activeProjectId;
    await apiKeysService.revokeKey(keyId, targetProjectId);
    setApiKeys(prev => prev.map(k => (k.id === keyId ? { ...k, status: 'revoked' } : k)));
  };

  const createWebhook = (data: Omit<WebhookEndpoint, 'id' | 'status' | 'createdAt' | 'projectId'>) => {
    const targetProjectId = activeProject?.id || activeProjectId;
    const newWh: WebhookEndpoint = {
      id: `wh_${Math.random().toString(36).substring(2, 8)}`,
      projectId: targetProjectId,
      url: data.url,
      events: data.events,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    setWebhooks(prev => [newWh, ...prev]);
  };

  const deleteWebhook = (id: string) => {
    setWebhooks(prev => prev.filter(w => w.id !== id));
  };

  const markNotificationRead = async (id: string) => {
    if (isSupabaseConfigured) {
      await notificationsService.markAsRead(id);
    }
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = async () => {
    if (isSupabaseConfigured && user) {
      await notificationsService.markAllAsRead(user.id);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const refreshData = async () => {
    if (user) {
      await loadDatabaseData(user.id, activeProject?.id || activeProjectId);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentRoute,
        navigate,
        user,
        isAuthenticated: !!user,
        isAuthLoading,
        isProjectDataLoading,
        dataError,
        isSupabaseConfigured,
        login,
        signup,
        logout,
        resetPassword,
        updatePassword,
        projects,
        activeProject,
        setActiveProjectId,
        createProject,
        orders,
        createOrder,
        paymentAlerts,
        manualReviews,
        handleReviewAction,
        apiKeys,
        createApiKey,
        revokeApiKey,
        webhooks,
        createWebhook,
        deleteWebhook,
        webhookDeliveries,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        auditLogs,
        refreshData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
