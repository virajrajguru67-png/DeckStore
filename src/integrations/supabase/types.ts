// This file will be auto-generated once Supabase is configured
// Placeholder types for now
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'viewer' | 'editor' | 'admin' | 'owner'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: 'viewer' | 'editor' | 'admin' | 'owner'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'viewer' | 'editor' | 'admin' | 'owner'
          created_at?: string
        }
      }
    }
    Enums: {
      app_role: 'viewer' | 'editor' | 'admin' | 'owner'
    }
  }
}


