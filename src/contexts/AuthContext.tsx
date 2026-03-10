/**
 * AuthContext.tsx — Authentication Context
 * 
 * PURPOSE: Manages user authentication state across the entire application.
 * Uses Lovable Cloud (Supabase Auth) for secure, server-side authentication.
 * 
 * HOW IT WORKS:
 * 1. On app load, checks for an existing session via onAuthStateChange
 * 2. If a session exists, fetches the user's profile and roles from the database
 * 3. Provides login/signup/logout functions to all child components
 * 
 * SECURITY:
 * - Passwords are never stored in code — handled by the auth service
 * - Roles are fetched from a separate database table (not stored client-side)
 * - Session tokens are automatically refreshed
 * 
 * USED BY: ProtectedRoute in App.tsx, AppLayout header, all pages needing user info
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, department?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Fetches user profile and roles from the database.
 * Called after successful authentication to build the User object.
 */
async function fetchUserProfile(userId: string): Promise<User | null> {
  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) return null;

  // Fetch roles from separate table (security best practice)
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  // Determine highest-privilege role
  const roleList = roles?.map(r => r.role) || ['user'];
  let role: 'admin' | 'approver' | 'user' = 'user';
  if (roleList.includes('admin')) role = 'admin';
  else if (roleList.includes('approver')) role = 'approver';

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role,
    department: profile.department || undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // IMPORTANT: Set up auth listener BEFORE checking existing session
    // This ensures we catch all auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(async () => {
            const profile = await fetchUserProfile(newSession.user.id);
            setUser(profile);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!existingSession) {
        setIsLoading(false);
      }
      // If session exists, onAuthStateChange will handle it
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const signup = async (email: string, password: string, name: string, department?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, department },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw new Error(error.message);

    // After signup, update the profile with department
    // (the trigger creates the profile, but we update department here)
    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser && department) {
      await supabase.from('profiles').update({ department }).eq('id', newUser.id);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAuthenticated: !!user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
