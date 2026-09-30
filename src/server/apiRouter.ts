import { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';
import { apiKeysService, hashSecret } from '../services/apiKeys';
import { merchantService } from '../services/merchant';
import { gmailConnectionService } from '../services/gmailConnection';
import {
  ordersService,
  computeCheckoutStatus,
  generateCheckoutToken,
  mapRowToOrder
} from '../services/orders';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Database } from '../types/database';
import { ApiKeyScope, Currency, ReceivingBankAccount } from '../types';

/**
 * Trusted Server-Side Supabase Client
 * Uses SUPABASE_SERVICE_ROLE_KEY on the backend to perform server-write-only
 * operations on `public.checkout_sessions`, `public.gmail_connections`, and `public.orders`.
 */
function getServerSupabaseClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (url && serviceKey) {
    return createClient<Database>(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return supabase;
}

/**
 * Helper to parse JSON body from incoming HTTP request stream
 */
async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Helper to send JSON responses
 */
function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, Accept, X-Checkout-Token'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.end(JSON.stringify(data));
}

/**
 * Veripay NG — Phase 3A Main Merchant & Checkout API Middleware
 * Handles /api/v1/* routes with strict project credential authentication,
 * permission scoping, and hashed single-order public checkout token validation.
 */
export async function handleApiV1Request(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname.replace(/\/$/, '');

  // Only handle /api/v1 routes
  if (!pathname.startsWith('/api/v1')) {
    return false;
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, Accept, X-Checkout-Token'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.end();
    return true;
  }

  const endpoint = pathname.replace('/api/v1', '') || '/';
  const serverSupabase = getServerSupabaseClient();

  try {
    // ========================================================================
    // PUBLIC SINGLE-ORDER CHECKOUT ROUTES (Validated via SHA-256 token_hash)
    // ========================================================================

    // ------------------------------------------------------------------------
    // Route: GET /api/v1/checkout/:token
    // 1. Receive raw checkout token
    // 2. SHA-256 hash it server-side
    // 3. Find checkout_sessions using token_hash
    // 4. Verify expires_at
    // 5. Resolve exact order_id / project_id
    // 6. Return ONLY safe checkout information
    // ------------------------------------------------------------------------
    const checkoutGetMatch = endpoint.match(/^\/checkout\/(chk_[a-zA-Z0-9_]+)$/);
    if (checkoutGetMatch && req.method === 'GET') {
      if (!isSupabaseConfigured) {
        sendJson(res, 503, { error: 'Supabase database connection is not configured.' });
        return true;
      }

      const rawCheckoutToken = checkoutGetMatch[1];
      const tokenHash = await hashSecret(rawCheckoutToken);

      const { data: sessionRow, error: sessionErr } = await serverSupabase
        .from('checkout_sessions')
        .select('id, order_id, project_id, token_prefix, expires_at, created_at')
        .eq('token_hash', tokenHash)
        .maybeSingle();

      if (sessionErr || !sessionRow) {
        sendJson(res, 404, { error: 'Invalid checkout token or session not found.' });
        return true;
      }

      if (new Date(sessionRow.expires_at).getTime() < Date.now()) {
        sendJson(res, 410, {
          error: 'This checkout session has expired.',
          checkoutStatus: 'EXPIRED'
        });
        return true;
      }

      const { data: orderRow, error: orderErr } = await serverSupabase
        .from('orders')
        .select('*')
        .eq('id', sessionRow.order_id)
        .eq('project_id', sessionRow.project_id)
        .maybeSingle();

      if (orderErr || !orderRow) {
        sendJson(res, 404, { error: 'Order not found for checkout session.' });
        return true;
      }

      const { data: bankRow } = await serverSupabase
        .from('bank_accounts')
        .select('bank_name, account_name, account_number, currency')
        .eq('project_id', sessionRow.project_id)
        .maybeSingle();

      const order = mapRowToOrder(orderRow);
      const receivingBank: ReceivingBankAccount = {
        bankName: bankRow?.bank_name || '',
        accountName: bankRow?.account_name || '',
        accountNumber: bankRow?.account_number || '',
        currency: (bankRow?.currency as Currency) || order.currency
      };

      const safeOrder = ordersService.toSafeCheckoutOrder(order, receivingBank);
      // Do not echo raw token or token_hash back from storage; only safe public fields
      sendJson(res, 200, {
        order: {
          id: safeOrder.id,
          merchantReference: safeOrder.merchantReference,
          amount: safeOrder.amount,
          currency: safeOrder.currency,
          expectedPayerName: safeOrder.expectedPayerName,
          payerBank: safeOrder.payerBank,
          receivingBank: safeOrder.receivingBank,
          status: safeOrder.status,
          checkoutStatus: safeOrder.checkoutStatus,
          createdAt: safeOrder.createdAt,
          expiresAt: safeOrder.expiresAt,
          verifiedAt: safeOrder.verifiedAt,
          customerMarkedTransferredAt: safeOrder.customerMarkedTransferredAt
        }
      });
      return true;
    }

    // ------------------------------------------------------------------------
    // Route: POST /api/v1/checkout/:token/confirm-transfer
    // 1. Hash the supplied raw token with SHA-256
    // 2. Find the checkout session in public.checkout_sessions by token_hash
    // 3. Reject invalid or expired token
    // 4. Resolve exact order by order_id and project_id
    // 5. Update customer_marked_transferred_at through trusted server code
    // 6. Return CHECKING_PAYMENT (NEVER sets status = VERIFIED, verified_at, or matched_payment_alert_id)
    // ------------------------------------------------------------------------
    const checkoutConfirmMatch = endpoint.match(
      /^\/checkout\/(chk_[a-zA-Z0-9_]+)\/confirm-transfer$/
    );
    if (checkoutConfirmMatch && req.method === 'POST') {
      if (!isSupabaseConfigured) {
        sendJson(res, 503, { error: 'Supabase database connection is not configured.' });
        return true;
      }

      const rawCheckoutToken = checkoutConfirmMatch[1];
      const tokenHash = await hashSecret(rawCheckoutToken);

      const { data: sessionRow, error: sessionErr } = await serverSupabase
        .from('checkout_sessions')
        .select('id, order_id, project_id, expires_at')
        .eq('token_hash', tokenHash)
        .maybeSingle();

      if (sessionErr || !sessionRow) {
        sendJson(res, 404, { error: 'Invalid checkout token.' });
        return true;
      }

      if (new Date(sessionRow.expires_at).getTime() < Date.now()) {
        sendJson(res, 400, {
          error: 'Checkout session has expired.',
          checkoutStatus: 'EXPIRED'
        });
        return true;
      }

      const { data: orderRow, error: orderErr } = await serverSupabase
        .from('orders')
        .select('*')
        .eq('id', sessionRow.order_id)
        .eq('project_id', sessionRow.project_id)
        .maybeSingle();

      if (orderErr || !orderRow) {
        sendJson(res, 404, { error: 'Order not found for checkout session.' });
        return true;
      }

      if (
        orderRow.status === 'expired' ||
        orderRow.status === 'cancelled' ||
        new Date(orderRow.expires_at).getTime() < Date.now()
      ) {
        sendJson(res, 400, {
          error: 'This payment request has expired.',
          checkoutStatus: 'EXPIRED'
        });
        return true;
      }

      if (orderRow.status !== 'pending') {
        const mapped = mapRowToOrder(orderRow);
        sendJson(res, 200, {
          success: true,
          checkoutStatus: computeCheckoutStatus(mapped),
          customerMarkedTransferredAt: orderRow.customer_marked_transferred_at
        });
        return true;
      }

      const markedAt = new Date().toISOString();
      const existingMeta = (orderRow.metadata as Record<string, any>) || {};
      const updatedMeta = {
        ...existingMeta,
        customer_marked_transferred_at: markedAt
      };

      // Update ONLY customer_marked_transferred_at (and metadata fallback).
      // NEVER sets status = 'verified', verified_at, or matched_payment_alert_id.
      const { error: updateErr } = await serverSupabase
        .from('orders')
        .update({
          customer_marked_transferred_at: markedAt,
          metadata: updatedMeta
        })
        .eq('id', orderRow.id)
        .eq('project_id', sessionRow.project_id);

      if (updateErr) {
        await serverSupabase
          .from('orders')
          .update({
            metadata: updatedMeta
          })
          .eq('id', orderRow.id)
          .eq('project_id', sessionRow.project_id);
      }

      await serverSupabase.from('audit_logs').insert({
        project_id: sessionRow.project_id,
        action: 'order.customer_marked_transferred',
        details: {
          order_id: orderRow.id,
          merchant_order_reference: orderRow.merchant_order_reference,
          amount: orderRow.amount,
          note: 'Customer clicked I HAVE MADE THE TRANSFER via checkout token. Order remains pending until bank-alert verification.',
          timestamp: markedAt
        }
      });

      sendJson(res, 200, {
        success: true,
        checkoutStatus: 'CHECKING_PAYMENT',
        customerMarkedTransferredAt: markedAt,
        message: 'Transfer notification received. Waiting for bank-alert verification.'
      });
      return true;
    }

    // ========================================================================
    // SERVER-SIDE AUTHENTICATED ROUTES (Requires Bearer vpay_live_... / vpay_test_...)
    // ========================================================================
    const authHeader = req.headers['authorization'] || '';
    const tokenMatch = authHeader.match(/^Bearer\s+(vpay_[a-zA-Z0-9_]+)$/);
    const rawSecret = tokenMatch ? tokenMatch[1] : '';

    if (!rawSecret) {
      sendJson(res, 401, {
        error:
          'Unauthorized: Missing or malformed Bearer API key in Authorization header. Format: Authorization: Bearer vpay_live_...'
      });
      return true;
    }

    // Map endpoints to required permission scopes
    let requiredScope: ApiKeyScope | undefined;
    if (endpoint === '/project' && req.method === 'GET') {
      requiredScope = 'project:read';
    } else if (endpoint === '/bank-account' && req.method === 'GET') {
      requiredScope = 'bank_accounts:read';
    } else if (endpoint === '/bank-account' && req.method === 'PATCH') {
      requiredScope = 'bank_accounts:write';
    } else if (endpoint === '/gmail-connection' && req.method === 'GET') {
      requiredScope = 'gmail_connection:read';
    } else if (endpoint.startsWith('/gmail-connection') && req.method === 'POST') {
      requiredScope = 'gmail_connection:manage';
    } else if (endpoint === '/orders' && req.method === 'POST') {
      requiredScope = 'orders:create';
    } else if (endpoint === '/orders' && req.method === 'GET') {
      requiredScope = 'orders:read';
    } else if (
      endpoint.startsWith('/orders/') &&
      (req.method === 'GET' || req.method === 'POST')
    ) {
      requiredScope = 'orders:read';
    }

    // Authenticate Token & Scope
    const authResult = await apiKeysService.authenticateToken(rawSecret, requiredScope);
    if (!authResult.isValid || !authResult.projectId) {
      const statusCode = authResult.error?.includes('Forbidden') ? 403 : 401;
      sendJson(res, statusCode, { error: authResult.error || 'Unauthorized' });
      return true;
    }

    // SECURITY INVARIANT: Resolve project strictly from authenticated server credential.
    // Never trust a project_id supplied by frontend or request body.
    const projectId = authResult.projectId;

    // ------------------------------------------------------------------------
    // 1. Route: GET /api/v1/project
    // ------------------------------------------------------------------------
    if (endpoint === '/project' && req.method === 'GET') {
      if (!isSupabaseConfigured) {
        sendJson(res, 503, { error: 'Supabase database connection is not configured.' });
        return true;
      }

      const { data: project, error } = await serverSupabase
        .from('projects')
        .select('id, name, website_url, currency, status, created_at')
        .eq('id', projectId)
        .maybeSingle();

      if (error || !project) {
        sendJson(res, 404, { error: 'Project not found.' });
        return true;
      }

      sendJson(res, 200, {
        id: project.id,
        name: project.name,
        websiteUrl: project.website_url,
        currency: project.currency,
        status: project.status,
        createdAt: project.created_at
      });
      return true;
    }

    // ------------------------------------------------------------------------
    // 2. Route: GET /api/v1/bank-account
    // ------------------------------------------------------------------------
    if (endpoint === '/bank-account' && req.method === 'GET') {
      const status = await merchantService.getStatus(projectId);
      if (!status || !status.bankAccount.accountNumber) {
        sendJson(res, 404, { error: 'Receiving bank account not configured for this project.' });
        return true;
      }

      sendJson(res, 200, {
        bankName: status.bankAccount.bankName,
        accountName: status.bankAccount.accountName,
        accountNumber: status.bankAccount.accountNumber,
        currency: status.bankAccount.currency,
        isPrimary: status.bankAccount.isPrimary ?? true,
        updatedAt: status.lastUpdated
      });
      return true;
    }

    // ------------------------------------------------------------------------
    // 3. Route: PATCH /api/v1/bank-account
    // ------------------------------------------------------------------------
    if (endpoint === '/bank-account' && req.method === 'PATCH') {
      const body = await parseJsonBody(req);
      const { bankName, accountName, accountNumber, currency } = body;

      const updateRes = await merchantService.updateBankAccount(
        projectId,
        {
          bankName,
          accountName,
          accountNumber,
          currency
        },
        `API Key (${authResult.keyId || 'server'})`
      );

      if (!updateRes.success || !updateRes.bankAccount) {
        sendJson(res, 400, { error: updateRes.error || 'Failed to update bank details.' });
        return true;
      }

      sendJson(res, 200, {
        success: true,
        bankAccount: {
          bankName: updateRes.bankAccount.bankName,
          accountName: updateRes.bankAccount.accountName,
          accountNumber: updateRes.bankAccount.accountNumber,
          currency: updateRes.bankAccount.currency,
          isPrimary: true,
          updatedAt: new Date().toISOString()
        }
      });
      return true;
    }

    // ------------------------------------------------------------------------
    // 4. Route: GET /api/v1/gmail-connection
    // ------------------------------------------------------------------------
    if (endpoint === '/gmail-connection' && req.method === 'GET') {
      const connection = await gmailConnectionService.getConnection(projectId);
      if (!connection || connection.status !== 'connected') {
        sendJson(res, 200, {
          connected: false,
          status: connection?.status || 'not_connected'
        });
        return true;
      }

      sendJson(res, 200, {
        connected: true,
        email: connection.email,
        status: connection.status,
        connectedAt: connection.connectedAt,
        lastSuccessfulSync: connection.lastSuccessfulSync
      });
      return true;
    }

    // ------------------------------------------------------------------------
    // 5. Route: POST /api/v1/gmail-connection/connect
    // ------------------------------------------------------------------------
    if (endpoint === '/gmail-connection/connect' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const redirectUri =
        body.redirectUri ||
        `${req.headers['origin'] || 'http://localhost:3000'}/api/auth/google/callback`;

      const oauthInfo = await gmailConnectionService.initiateOAuth(projectId, redirectUri);
      sendJson(res, 200, {
        success: true,
        status: 'not_connected',
        authUrl: oauthInfo.authUrl,
        state: oauthInfo.state,
        message:
          'Google OAuth state initialized. Status remains not_connected until Google OAuth callback completes.'
      });
      return true;
    }

    // ------------------------------------------------------------------------
    // 6. Route: POST /api/v1/gmail-connection/disconnect
    // ------------------------------------------------------------------------
    if (endpoint === '/gmail-connection/disconnect' && req.method === 'POST') {
      const success = await gmailConnectionService.disconnect(projectId);
      sendJson(res, 200, {
        success,
        connected: false,
        status: 'not_connected'
      });
      return true;
    }

    // ------------------------------------------------------------------------
    // 7. Route: POST /api/v1/orders
    // Creates a pending order AND a hashed checkout session in public.checkout_sessions.
    // Returns the raw checkoutToken ONCE to the merchant backend.
    // ------------------------------------------------------------------------
    if (endpoint === '/orders' && req.method === 'POST') {
      if (!isSupabaseConfigured) {
        sendJson(res, 503, { error: 'Supabase database connection is not configured.' });
        return true;
      }

      const body = await parseJsonBody(req);
      const merchantReference = (
        body.merchantReference ||
        body.merchant_order_reference ||
        ''
      ).trim();
      const amount = Number(body.amount);
      const currency: Currency = (body.currency || 'NGN') as Currency;
      const expectedPayerName = (
        body.expectedPayerName ||
        body.expected_payer_name ||
        ''
      ).trim();
      const payerBank = body.payerBank || body.payer_bank || undefined;
      const expiresInMinutes = Number(body.expiresInMinutes || body.expires_in_minutes || 60);

      if (!merchantReference) {
        sendJson(res, 400, { error: 'merchantReference is required.' });
        return true;
      }
      if (!amount || isNaN(amount) || amount <= 0) {
        sendJson(res, 400, { error: 'amount must be a positive number.' });
        return true;
      }
      if (!expectedPayerName) {
        sendJson(res, 400, { error: 'expectedPayerName is required.' });
        return true;
      }

      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

      // 1. Insert pending order into public.orders (NEVER stores raw checkout token)
      const { data: orderRow, error: orderInsertErr } = await serverSupabase
        .from('orders')
        .insert({
          project_id: projectId, // Enforced strictly from authenticated API key
          merchant_order_reference: merchantReference,
          amount,
          currency,
          expected_payer_name: expectedPayerName.toUpperCase(),
          payer_bank: payerBank || null,
          status: 'pending',
          expires_at: expiresAt,
          metadata: {}
        })
        .select()
        .single();

      if (orderInsertErr || !orderRow) {
        sendJson(res, 500, {
          error: orderInsertErr?.message || 'Failed to create pending order.'
        });
        return true;
      }

      // 2. Generate cryptographically secure raw checkout token (`chk_live_<secure_random>`)
      const rawCheckoutToken = generateCheckoutToken();
      const tokenPrefix = `${rawCheckoutToken.slice(0, 13)}...`;
      const tokenHash = await hashSecret(rawCheckoutToken);

      // 3. Persist ONLY hashed token metadata in public.checkout_sessions (server-write-only)
      const { error: sessionInsertErr } = await serverSupabase
        .from('checkout_sessions')
        .insert({
          order_id: orderRow.id,
          project_id: projectId,
          token_prefix: tokenPrefix,
          token_hash: tokenHash,
          expires_at: expiresAt
        });

      if (sessionInsertErr) {
        console.error('[API v1] Failed to insert hashed checkout_session:', sessionInsertErr);
        sendJson(res, 500, {
          error: 'Failed to initialize secure checkout session for order.'
        });
        return true;
      }

      const createdOrder = mapRowToOrder(orderRow);
      const merchantStatus = await merchantService.getStatus(projectId);
      const receivingBank = merchantStatus?.bankAccount || {
        bankName: '',
        accountName: '',
        accountNumber: '',
        currency
      };

      const safeOrder = ordersService.toSafeCheckoutOrder(
        createdOrder,
        receivingBank,
        rawCheckoutToken
      );

      // 4. Return raw checkoutToken ONCE to merchant backend
      sendJson(res, 201, {
        success: true,
        order: safeOrder,
        checkoutToken: rawCheckoutToken
      });
      return true;
    }

    // ------------------------------------------------------------------------
    // 8. Route: GET /api/v1/orders/:id
    // ------------------------------------------------------------------------
    const orderIdMatch = endpoint.match(/^\/orders\/([^/]+)$/);
    if (orderIdMatch && req.method === 'GET') {
      const orderId = decodeURIComponent(orderIdMatch[1]);
      const order = await ordersService.getOrderById(projectId, orderId);
      if (!order) {
        sendJson(res, 404, { error: 'Order not found in this project.' });
        return true;
      }

      const merchantStatus = await merchantService.getStatus(projectId);
      const receivingBank = merchantStatus?.bankAccount || {
        bankName: '',
        accountName: '',
        accountNumber: '',
        currency: order.currency
      };

      const safeOrder = ordersService.toSafeCheckoutOrder(order, receivingBank);
      sendJson(res, 200, { order: safeOrder });
      return true;
    }

    // ------------------------------------------------------------------------
    // 9. Route: GET /api/v1/orders/:id/status
    // ------------------------------------------------------------------------
    const orderStatusMatch = endpoint.match(/^\/orders\/([^/]+)\/status$/);
    if (orderStatusMatch && req.method === 'GET') {
      const orderId = decodeURIComponent(orderStatusMatch[1]);
      const order = await ordersService.getOrderById(projectId, orderId);
      if (!order) {
        sendJson(res, 404, { error: 'Order not found in this project.' });
        return true;
      }

      const checkoutStatus = computeCheckoutStatus(order);
      sendJson(res, 200, {
        id: order.id,
        merchantReference: order.merchantOrderReference,
        amount: order.amount,
        currency: order.currency,
        expectedPayerName: order.expectedPayerName,
        status: order.status,
        checkoutStatus,
        expiresAt: order.expiresAt,
        verifiedAt: order.verifiedAt || null,
        customerMarkedTransferredAt: order.customerMarkedTransferredAt || null
      });
      return true;
    }

    // ------------------------------------------------------------------------
    // 10. Route: POST /api/v1/orders/:id/transfer-confirmed
    // ------------------------------------------------------------------------
    const orderTransferMatch = endpoint.match(/^\/orders\/([^/]+)\/transfer-confirmed$/);
    if (orderTransferMatch && req.method === 'POST') {
      const orderId = decodeURIComponent(orderTransferMatch[1]);
      const resNotify = await ordersService.recordCustomerTransferNotification({
        orderId,
        projectId
      });

      if (!resNotify.success) {
        sendJson(res, 400, {
          error: resNotify.error || 'Could not record transfer notification.'
        });
        return true;
      }

      sendJson(res, 200, {
        success: true,
        orderId,
        status: 'pending',
        checkoutStatus: resNotify.checkoutStatus,
        customerMarkedTransferredAt: resNotify.markedAt
      });
      return true;
    }

    sendJson(res, 404, { error: `Endpoint '${endpoint}' with method ${req.method} not found.` });
    return true;
  } catch (err: any) {
    console.error('[API v1] Internal Exception:', err);
    sendJson(res, 500, { error: err?.message || 'Internal server error processing request.' });
    return true;
  }
}
