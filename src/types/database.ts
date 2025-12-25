// Types for the application
export type AppRole = 'viewer' | 'editor' | 'admin' | 'owner';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// Re-export types from Supabase integration
export type { Database } from '@/integrations/supabase/types';

