export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      analytics_revenue_events: {
        Row: {
          amount_cents: number
          bot_id: string | null
          campaign: string | null
          created_at: string
          currency: string
          event_type: string
          flow_id: string | null
          gateway: string | null
          id: string
          lead_id: string | null
          metadata: Json
          occurred_at: string
          owner_id: string
          plan_name: string | null
          sales_code: string | null
          source: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          amount_cents?: number
          bot_id?: string | null
          campaign?: string | null
          created_at?: string
          currency?: string
          event_type: string
          flow_id?: string | null
          gateway?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          occurred_at?: string
          owner_id: string
          plan_name?: string | null
          sales_code?: string | null
          source?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          amount_cents?: number
          bot_id?: string | null
          campaign?: string | null
          created_at?: string
          currency?: string
          event_type?: string
          flow_id?: string | null
          gateway?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          occurred_at?: string
          owner_id?: string
          plan_name?: string | null
          sales_code?: string | null
          source?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'analytics_revenue_events_bot_id_fkey'
            columns: ['bot_id']
            isOneToOne: false
            referencedRelation: 'bots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'analytics_revenue_events_flow_id_fkey'
            columns: ['flow_id']
            isOneToOne: false
            referencedRelation: 'flows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'analytics_revenue_events_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'telegram_leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'analytics_revenue_events_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      bots: {
        Row: {
          connected_at: string | null
          connection_status: string
          created_at: string | null
          id: string
          name: string
          notifications_enabled: boolean | null
          owner_id: string
          last_update_at: string | null
          telegram_bot_id: string | null
          telegram_can_join_groups: boolean | null
          telegram_can_read_all_group_messages: boolean | null
          telegram_first_name: string | null
          telegram_supports_inline_queries: boolean | null
          telegram_token: string | null
          telegram_username: string | null
          updated_at: string | null
          webhook_enabled: boolean | null
          webhook_last_error: string | null
          webhook_url: string | null
        }
        Insert: {
          connected_at?: string | null
          connection_status?: string
          created_at?: string | null
          id?: string
          name: string
          notifications_enabled?: boolean | null
          owner_id: string
          last_update_at?: string | null
          telegram_bot_id?: string | null
          telegram_can_join_groups?: boolean | null
          telegram_can_read_all_group_messages?: boolean | null
          telegram_first_name?: string | null
          telegram_supports_inline_queries?: boolean | null
          telegram_token?: string | null
          telegram_username?: string | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_last_error?: string | null
          webhook_url?: string | null
        }
        Update: {
          connected_at?: string | null
          connection_status?: string
          created_at?: string | null
          id?: string
          name?: string
          notifications_enabled?: boolean | null
          owner_id?: string
          last_update_at?: string | null
          telegram_bot_id?: string | null
          telegram_can_join_groups?: boolean | null
          telegram_can_read_all_group_messages?: boolean | null
          telegram_first_name?: string | null
          telegram_supports_inline_queries?: boolean | null
          telegram_token?: string | null
          telegram_username?: string | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_last_error?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'bots_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      bot_secrets: {
        Row: {
          bot_id: string
          created_at: string
          telegram_token: string
          updated_at: string
          webhook_secret: string
        }
        Insert: {
          bot_id: string
          created_at?: string
          telegram_token: string
          updated_at?: string
          webhook_secret: string
        }
        Update: {
          bot_id?: string
          created_at?: string
          telegram_token?: string
          updated_at?: string
          webhook_secret?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bot_secrets_bot_id_fkey'
            columns: ['bot_id']
            isOneToOne: true
            referencedRelation: 'bots'
            referencedColumns: ['id']
          },
        ]
      }
      flows: {
        Row: {
          bot_id: string | null
          created_at: string
          graph: Json
          id: string
          name: string
          owner_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          bot_id?: string | null
          created_at?: string
          graph?: Json
          id?: string
          name?: string
          owner_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          bot_id?: string | null
          created_at?: string
          graph?: Json
          id?: string
          name?: string
          owner_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'flows_bot_id_fkey'
            columns: ['bot_id']
            isOneToOne: false
            referencedRelation: 'bots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'flows_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      lead_flow_events: {
        Row: {
          bot_id: string
          created_at: string
          event_type: string
          flow_id: string | null
          id: string
          lead_id: string
          message: string | null
          metadata: Json
          node_id: string | null
          node_label: string | null
          node_type: string | null
          occurred_at: string
          owner_id: string
          status: string | null
        }
        Insert: {
          bot_id: string
          created_at?: string
          event_type: string
          flow_id?: string | null
          id?: string
          lead_id: string
          message?: string | null
          metadata?: Json
          node_id?: string | null
          node_label?: string | null
          node_type?: string | null
          occurred_at?: string
          owner_id: string
          status?: string | null
        }
        Update: {
          bot_id?: string
          created_at?: string
          event_type?: string
          flow_id?: string | null
          id?: string
          lead_id?: string
          message?: string | null
          metadata?: Json
          node_id?: string | null
          node_label?: string | null
          node_type?: string | null
          occurred_at?: string
          owner_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'lead_flow_events_bot_id_fkey'
            columns: ['bot_id']
            isOneToOne: false
            referencedRelation: 'bots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lead_flow_events_flow_id_fkey'
            columns: ['flow_id']
            isOneToOne: false
            referencedRelation: 'flows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lead_flow_events_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'telegram_leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lead_flow_events_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      payment_gateway_connections: {
        Row: {
          created_at: string
          credentials_encrypted: string | null
          credentials_hint: string | null
          flow_ids: string[]
          id: string
          owner_id: string
          provider: string
          public_config: Json
          scope: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials_encrypted?: string | null
          credentials_hint?: string | null
          flow_ids?: string[]
          id?: string
          owner_id: string
          provider: string
          public_config?: Json
          scope?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials_encrypted?: string | null
          credentials_hint?: string | null
          flow_ids?: string[]
          id?: string
          owner_id?: string
          provider?: string
          public_config?: Json
          scope?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_gateway_connections_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      pix_payment_transactions: {
        Row: {
          amount_cents: number
          bot_id: string | null
          created_at: string
          currency: string
          external_reference: string
          expires_at: string | null
          flow_id: string | null
          id: string
          lead_id: string | null
          node_id: string
          node_type: string
          owner_id: string
          paid_at: string | null
          pix_code: string | null
          plan_name: string | null
          provider: string
          provider_payment_id: string | null
          provider_status: string | null
          qr_code_base64: string | null
          raw_response: Json
          status: string
          telegram_chat_id: string | null
          ticket_url: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          bot_id?: string | null
          created_at?: string
          currency?: string
          external_reference: string
          expires_at?: string | null
          flow_id?: string | null
          id?: string
          lead_id?: string | null
          node_id: string
          node_type?: string
          owner_id: string
          paid_at?: string | null
          pix_code?: string | null
          plan_name?: string | null
          provider: string
          provider_payment_id?: string | null
          provider_status?: string | null
          qr_code_base64?: string | null
          raw_response?: Json
          status?: string
          telegram_chat_id?: string | null
          ticket_url?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          bot_id?: string | null
          created_at?: string
          currency?: string
          external_reference?: string
          expires_at?: string | null
          flow_id?: string | null
          id?: string
          lead_id?: string | null
          node_id?: string
          node_type?: string
          owner_id?: string
          paid_at?: string | null
          pix_code?: string | null
          plan_name?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_status?: string | null
          qr_code_base64?: string | null
          raw_response?: Json
          status?: string
          telegram_chat_id?: string | null
          ticket_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pix_payment_transactions_bot_id_fkey'
            columns: ['bot_id']
            isOneToOne: false
            referencedRelation: 'bots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pix_payment_transactions_flow_id_fkey'
            columns: ['flow_id']
            isOneToOne: false
            referencedRelation: 'flows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pix_payment_transactions_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'telegram_leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pix_payment_transactions_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          nickname: string | null
          phone: string | null
          ranking_visible: boolean
          referral_code: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          nickname?: string | null
          phone?: string | null
          ranking_visible?: boolean
          referral_code?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          nickname?: string | null
          phone?: string | null
          ranking_visible?: boolean
          referral_code?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      remarketing_campaigns: {
        Row: {
          audience_count: number
          bot_id: string
          completed_at: string | null
          created_at: string
          failed_count: number
          filters: Json
          flow_id: string | null
          id: string
          last_prepared_at: string | null
          message: string
          name: string
          owner_id: string
          sent_count: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          audience_count?: number
          bot_id: string
          completed_at?: string | null
          created_at?: string
          failed_count?: number
          filters?: Json
          flow_id?: string | null
          id?: string
          last_prepared_at?: string | null
          message: string
          name: string
          owner_id: string
          sent_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          audience_count?: number
          bot_id?: string
          completed_at?: string | null
          created_at?: string
          failed_count?: number
          filters?: Json
          flow_id?: string | null
          id?: string
          last_prepared_at?: string | null
          message?: string
          name?: string
          owner_id?: string
          sent_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'remarketing_campaigns_bot_id_fkey'
            columns: ['bot_id']
            isOneToOne: false
            referencedRelation: 'bots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'remarketing_campaigns_flow_id_fkey'
            columns: ['flow_id']
            isOneToOne: false
            referencedRelation: 'flows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'remarketing_campaigns_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      remarketing_campaign_recipients: {
        Row: {
          bot_id: string
          campaign_id: string
          created_at: string
          error_message: string | null
          flow_id: string | null
          id: string
          lead_id: string
          owner_id: string
          rendered_message: string
          sent_at: string | null
          status: string
          telegram_chat_id: string
          updated_at: string
        }
        Insert: {
          bot_id: string
          campaign_id: string
          created_at?: string
          error_message?: string | null
          flow_id?: string | null
          id?: string
          lead_id: string
          owner_id: string
          rendered_message: string
          sent_at?: string | null
          status?: string
          telegram_chat_id: string
          updated_at?: string
        }
        Update: {
          bot_id?: string
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          flow_id?: string | null
          id?: string
          lead_id?: string
          owner_id?: string
          rendered_message?: string
          sent_at?: string | null
          status?: string
          telegram_chat_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'remarketing_campaign_recipients_bot_id_fkey'
            columns: ['bot_id']
            isOneToOne: false
            referencedRelation: 'bots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'remarketing_campaign_recipients_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'remarketing_campaigns'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'remarketing_campaign_recipients_flow_id_fkey'
            columns: ['flow_id']
            isOneToOne: false
            referencedRelation: 'flows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'remarketing_campaign_recipients_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'telegram_leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'remarketing_campaign_recipients_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      telegram_leads: {
        Row: {
          bot_id: string
          campaign: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          first_seen_at: string
          flow_id: string | null
          id: string
          last_name: string | null
          last_node_id: string | null
          last_node_label: string | null
          last_node_type: string | null
          last_seen_at: string
          metadata: Json
          owner_id: string
          phone: string | null
          plan_name: string | null
          region: string | null
          sales_code: string | null
          source: string | null
          start_count: number
          status: string
          telegram_chat_id: string | null
          telegram_user_id: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          username: string | null
        }
        Insert: {
          bot_id: string
          campaign?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          first_seen_at?: string
          flow_id?: string | null
          id?: string
          last_name?: string | null
          last_node_id?: string | null
          last_node_label?: string | null
          last_node_type?: string | null
          last_seen_at?: string
          metadata?: Json
          owner_id: string
          phone?: string | null
          plan_name?: string | null
          region?: string | null
          sales_code?: string | null
          source?: string | null
          start_count?: number
          status?: string
          telegram_chat_id?: string | null
          telegram_user_id: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          username?: string | null
        }
        Update: {
          bot_id?: string
          campaign?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          first_seen_at?: string
          flow_id?: string | null
          id?: string
          last_name?: string | null
          last_node_id?: string | null
          last_node_label?: string | null
          last_node_type?: string | null
          last_seen_at?: string
          metadata?: Json
          owner_id?: string
          phone?: string | null
          plan_name?: string | null
          region?: string | null
          sales_code?: string | null
          source?: string | null
          start_count?: number
          status?: string
          telegram_chat_id?: string | null
          telegram_user_id?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'telegram_leads_bot_id_fkey'
            columns: ['bot_id']
            isOneToOne: false
            referencedRelation: 'bots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'telegram_leads_flow_id_fkey'
            columns: ['flow_id']
            isOneToOne: false
            referencedRelation: 'flows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'telegram_leads_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
