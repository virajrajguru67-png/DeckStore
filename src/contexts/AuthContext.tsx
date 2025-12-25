import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/database';
import type { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; data?: { user: User | null; session: Session | null } }>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (requiredRole: AppRole) => boolean;
  isAtLeast: (minRole: AppRole) => boolean;
  fetchUserData: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const roleHierarchy: AppRole[] = ['viewer', 'editor', 'admin', 'owner'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
      
      // Only try to fetch if Supabase is properly configured
      if (SUPABASE_URL && SUPABASE_URL !== 'https://placeholder.supabase.co') {
        // Fetch profile with error handling
        let profileResult = { data: null, error: null };
        try {
          profileResult = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        } catch (err) {
          console.error('Error fetching profile:', err);
        }

        // Fetch role with error handling
        let roleResult = { data: null, error: null };
        try {
          roleResult = await supabase.from('user_roles').select('role').eq('user_id', userId).limit(1).maybeSingle();
        } catch (err) {
          console.error('Error fetching role:', err);
        }

        if (profileResult.data) {
          setProfile(profileResult.data as Profile);
        }

        if (roleResult.data) {
          setRole(roleResult.data.role as AppRole);
        } else {
          // Default role if none assigned
          setRole('viewer');
        }
      } else {
        // Fallback for when Supabase is not configured yet
        setRole('viewer');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setRole('viewer');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = useCallback(async (email: string, password: string) => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
    if (!SUPABASE_URL || SUPABASE_URL === 'https://placeholder.supabase.co') {
      return { error: new Error('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.') };
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // Check if it's an email not confirmed error
        if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          return { 
            error: new Error('Please verify your email before signing in. Check your inbox (including spam folder) for the verification link.') 
          };
        }
        return { error: error as Error };
      }
      
      // If sign in successful, fetch user data
      if (data?.user) {
        await fetchUserData(data.user.id);
      }
      
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [fetchUserData]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
    if (!SUPABASE_URL || SUPABASE_URL === 'https://placeholder.supabase.co') {
      return { error: new Error('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.') };
    }
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: fullName }
        }
      });

      if (error) {
        return { 
          error: error as Error,
          data: undefined
        };
      }

      // Profile and role are automatically created by database trigger
      // The trigger runs with SECURITY DEFINER, so it bypasses RLS policies
      // Wait a moment for the trigger to complete
      if (data?.user) {
        // Give the trigger a moment to create profile/role
        setTimeout(async () => {
          try {
            await fetchUserData(data.user.id);
          } catch (err) {
            console.error('Error fetching user data after signup:', err);
          }
        }, 500);
      }

      return { 
        error: null,
        data: data ? { user: data.user, session: data.session } : undefined
      };
    } catch (err) {
      return { 
        error: err as Error,
        data: undefined
      };
    }
  }, [fetchUserData]);

  const resendVerificationEmail = useCallback(async (email: string) => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
    if (!SUPABASE_URL || SUPABASE_URL === 'https://placeholder.supabase.co') {
      return { error: new Error('Supabase not configured.') };
    }
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });
      
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
    if (SUPABASE_URL && SUPABASE_URL !== 'https://placeholder.supabase.co') {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  }, []);

  const isAtLeast = useCallback((minRole: AppRole): boolean => {
    if (!role) return false;
    const currentIndex = roleHierarchy.indexOf(role);
    const requiredIndex = roleHierarchy.indexOf(minRole);
    return currentIndex >= requiredIndex;
  }, [role]);

  const hasRole = useCallback((requiredRole: AppRole): boolean => {
    return role === requiredRole;
  }, [role]);

  const contextValue = useMemo(() => ({
    user,
    session,
    profile,
    role,
    isLoading,
    signIn,
    signUp,
    resendVerificationEmail,
    signOut,
    hasRole,
    isAtLeast,
    fetchUserData
  }), [user, session, profile, role, isLoading, signIn, signUp, resendVerificationEmail, signOut, hasRole, isAtLeast, fetchUserData]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

