/**
 * Veripay NG — Supabase Database Types
 * Phase 2 Schema & Type Definitions
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          company: string | null;
          role: 'developer' | 'admin' | 'viewer';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          company?: string | null;
          role?: 'developer' | 'admin' | 'viewer';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          company?: string | null;
          role?: 'developer' | 'admin' | 'viewer';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          website_url: string | null;
          currency: 'NGN' | 'USD' | 'EUR' | 'GBP';
          status: 'active' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          website_url?: string | null;
          currency?: 'NGN' | 'USD' | 'EUR' | 'GBP';
          status?: 'active' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          website_url?: string | null;
          currency?: 'NGN' | 'USD' | 'EUR' | 'GBP';
          status?: 'active' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: 'owner' | 'developer' | 'viewer';
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: 'owner' | 'developer' | 'viewer';
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: 'owner' | 'developer' | 'viewer';
          created_at?: string;
        };
        Relationships: [];
      };
      bank_accounts: {
        Row: {
          id: string;
          project_id: string;
          bank_name: string;
          account_name: string;
          account_number: string;
          currency: 'NGN' | 'USD' | 'EUR' | 'GBP';
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          bank_name: string;
          account_name: string;
          account_number: string;
          currency?: 'NGN' | 'USD' | 'EUR' | 'GBP';
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          bank_name?: string;
          account_name?: string;
          account_number?: string;
          currency?: 'NGN' | 'USD' | 'EUR' | 'GBP';
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          project_id: string;
          merchant_order_reference: string;
          amount: number;
          currency: 'NGN' | 'USD' | 'EUR' | 'GBP';
          expected_payer_name: string;
          payer_bank: string | null;
          status: 'pending' | 'verified' | 'manual_review' | 'expired' | 'cancelled';
          created_at: string;
          expires_at: string;
          verified_at: string | null;
          matched_payment_alert_id: string | null;
          customer_marked_transferred_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          project_id: string;
          merchant_order_reference: string;
          amount: number;
          currency?: 'NGN' | 'USD' | 'EUR' | 'GBP';
          expected_payer_name: string;
          payer_bank?: string | null;
          status?: 'pending' | 'verified' | 'manual_review' | 'expired' | 'cancelled';
          created_at?: string;
          expires_at: string;
          verified_at?: string | null;
          matched_payment_alert_id?: string | null;
          customer_marked_transferred_at?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          project_id?: string;
          merchant_order_reference?: string;
          amount?: number;
          currency?: 'NGN' | 'USD' | 'EUR' | 'GBP';
          expected_payer_name?: string;
          payer_bank?: string | null;
          status?: 'pending' | 'verified' | 'manual_review' | 'expired' | 'cancelled';
          created_at?: string;
          expires_at?: string;
          verified_at?: string | null;
          matched_payment_alert_id?: string | null;
          customer_marked_transferred_at?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      checkout_sessions: {
        Row: {
          id: string;
          order_id: string;
          project_id: string;
          token_prefix: string;
          token_hash: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          project_id: string;
          token_prefix: string;
          token_hash: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          project_id?: string;
          token_prefix?: string;
          token_hash?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      payment_alerts: {
        Row: {
          id: string;
          project_id: string;
          source: string;
          source_message_id: string | null;
          amount: number | null;
          currency: string | null;
          sender_name: string | null;
          alert_type: 'CREDIT' | 'DEBIT' | 'WITHDRAWAL' | 'TRANSFER_OUT' | 'REVERSAL' | 'UNKNOWN';
          bank_name: string | null;
          transaction_time: string | null;
          transaction_reference: string | null;
          raw_snippet: string | null;
          extraction_confidence: number | null;
          ambiguities: Json | null;
          status: 'RECEIVED' | 'EXTRACTED' | 'VERIFIED' | 'MANUAL_REVIEW' | 'UNMATCHED' | 'IGNORED';
          matched_order_id: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          source?: string;
          source_message_id?: string | null;
          amount?: number | null;
          currency?: string | null;
          sender_name?: string | null;
          alert_type?: 'CREDIT' | 'DEBIT' | 'WITHDRAWAL' | 'TRANSFER_OUT' | 'REVERSAL' | 'UNKNOWN';
          bank_name?: string | null;
          transaction_time?: string | null;
          transaction_reference?: string | null;
          raw_snippet?: string | null;
          extraction_confidence?: number | null;
          ambiguities?: Json | null;
          status?: 'RECEIVED' | 'EXTRACTED' | 'VERIFIED' | 'MANUAL_REVIEW' | 'UNMATCHED' | 'IGNORED';
          matched_order_id?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          source?: string;
          source_message_id?: string | null;
          amount?: number | null;
          currency?: string | null;
          sender_name?: string | null;
          alert_type?: 'CREDIT' | 'DEBIT' | 'WITHDRAWAL' | 'TRANSFER_OUT' | 'REVERSAL' | 'UNKNOWN';
          bank_name?: string | null;
          transaction_time?: string | null;
          transaction_reference?: string | null;
          raw_snippet?: string | null;
          extraction_confidence?: number | null;
          ambiguities?: Json | null;
          status?: 'RECEIVED' | 'EXTRACTED' | 'VERIFIED' | 'MANUAL_REVIEW' | 'UNMATCHED' | 'IGNORED';
          matched_order_id?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Relationships: [];
      };
      manual_reviews: {
        Row: {
          id: string;
          project_id: string;
          payment_alert_id: string;
          candidate_order_id: string | null;
          reason: string;
          status: 'pending' | 'approved' | 'rejected' | 'left_unmatched';
          reviewed_by: string | null;
          reviewed_at: string | null;
          resolution_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          payment_alert_id: string;
          candidate_order_id?: string | null;
          reason: string;
          status?: 'pending' | 'approved' | 'rejected' | 'left_unmatched';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          resolution_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          payment_alert_id?: string;
          candidate_order_id?: string | null;
          reason?: string;
          status?: 'pending' | 'approved' | 'rejected' | 'left_unmatched';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          resolution_note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          title: string;
          message: string;
          type: string;
          read: boolean;
          link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          title: string;
          message: string;
          type?: string;
          read?: boolean;
          link?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          title?: string;
          message?: string;
          type?: string;
          read?: boolean;
          link?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          project_id: string | null;
          actor_user_id: string | null;
          action: string;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          actor_user_id?: string | null;
          action: string;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          actor_user_id?: string | null;
          action?: string;
          details?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      api_keys: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          scopes: string[];
          environment: 'live' | 'test';
          created_at: string;
          last_used_at: string | null;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          scopes?: string[];
          environment?: 'live' | 'test';
          created_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          key_prefix?: string;
          key_hash?: string;
          scopes?: string[];
          environment?: 'live' | 'test';
          created_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      project_api_keys: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          key_prefix: string;
          secret_hash: string;
          scopes: string[];
          environment: 'live' | 'test';
          last_used_at: string | null;
          expires_at: string | null;
          revoked_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          key_prefix: string;
          secret_hash: string;
          scopes?: string[];
          environment?: 'live' | 'test';
          last_used_at?: string | null;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          key_prefix?: string;
          secret_hash?: string;
          scopes?: string[];
          environment?: 'live' | 'test';
          last_used_at?: string | null;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      gmail_connections: {
        Row: {
          id: string;
          project_id: string;
          email: string;
          status: 'connected' | 'not_connected' | 'expired' | 'reauth_required' | 'disconnected';
          encrypted_refresh_token: string | null;
          encrypted_access_token: string | null;
          token_expires_at: string | null;
          connected_at: string;
          last_successful_sync: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          email: string;
          status?: 'connected' | 'not_connected' | 'expired' | 'reauth_required' | 'disconnected';
          encrypted_refresh_token?: string | null;
          encrypted_access_token?: string | null;
          token_expires_at?: string | null;
          connected_at?: string;
          last_successful_sync?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          email?: string;
          status?: 'connected' | 'not_connected' | 'expired' | 'reauth_required' | 'disconnected';
          encrypted_refresh_token?: string | null;
          encrypted_access_token?: string | null;
          token_expires_at?: string | null;
          connected_at?: string;
          last_successful_sync?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      oauth_states: {
        Row: {
          id: string;
          state_token: string;
          project_id: string;
          redirect_uri: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          state_token: string;
          project_id: string;
          redirect_uri: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          state_token?: string;
          project_id?: string;
          redirect_uri?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      user_has_project_access: {
        Args: {
          p_project_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
