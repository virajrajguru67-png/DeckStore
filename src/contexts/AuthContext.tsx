import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { AppRole } from '@/types/database';
import type { Profile } from '@/types/database';

interface User {
  id: string;
  email: string;
  role: AppRole;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; data?: any }>;
  signOut: () => Promise<void>;
  hasRole: (requiredRole: AppRole) => boolean;
  isAtLeast: (minRole: AppRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const roleHierarchy: AppRole[] = ['viewer', 'editor', 'admin', 'owner'];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setProfile(data.profile);
        setRole(data.user.role);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserData(token);
    } else {
      setIsLoading(false);
    }
  }, [fetchUserData]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('token', data.token);
      setUser(data.user);
      setRole(data.user.role);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Signup failed');

      return { error: null, data };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem('token');
    setUser(null);
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

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      await fetchUserData(token);
    }
  }, [fetchUserData]);

  const contextValue = useMemo(() => ({
    user,
    profile,
    role,
    isLoading,
    signIn,
    signUp,
    signOut,
    hasRole,
    isAtLeast,
    refreshProfile
  }), [user, profile, role, isLoading, signIn, signUp, signOut, hasRole, isAtLeast, refreshProfile]);

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

