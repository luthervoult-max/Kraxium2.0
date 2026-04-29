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
          bot_id: string
          graph: Json
          id: string
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          bot_id: string
          graph?: Json
          id?: string
          name?: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          bot_id?: string
          graph?: Json
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'flows_bot_id_fkey'
            columns: ['bot_id']
            isOneToOne: true
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
