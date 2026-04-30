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
      bots: {
        Row: {
          created_at: string | null
          id: string
          name: string
          notifications_enabled: boolean | null
          owner_id: string
          telegram_token: string | null
          updated_at: string | null
          webhook_enabled: boolean | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          notifications_enabled?: boolean | null
          owner_id: string
          telegram_token?: string | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          notifications_enabled?: boolean | null
          owner_id?: string
          telegram_token?: string | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      telegram_leads: {
        Row: {
          bot_id: string
          created_at: string
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
          sales_code: string | null
          start_count: number
          status: string
          telegram_chat_id: string | null
          telegram_user_id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          bot_id: string
          created_at?: string
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
          sales_code?: string | null
          start_count?: number
          status?: string
          telegram_chat_id?: string | null
          telegram_user_id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          bot_id?: string
          created_at?: string
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
          sales_code?: string | null
          start_count?: number
          status?: string
          telegram_chat_id?: string | null
          telegram_user_id?: string
          updated_at?: string
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
