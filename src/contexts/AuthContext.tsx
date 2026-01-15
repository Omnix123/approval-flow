import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo - in production, this would connect to your backend
const MOCK_USERS: (User & { password: string })[] = [
  { id: '1', name: 'John Mwanga', email: 'john@ema.gov', role: 'user', department: 'Procurement', password: 'demo123' },
  { id: '2', name: 'Sarah Chipo', email: 'sarah@ema.gov', role: 'approver', department: 'Administration', password: 'demo123' },
  { id: '3', name: 'David Moyo', email: 'david@ema.gov', role: 'approver', department: 'Accounts', password: 'demo123' },
  { id: '4', name: 'Grace Sithole', email: 'grace@ema.gov', role: 'approver', department: 'Finance', password: 'demo123' },
  { id: '5', name: 'Admin User', email: 'admin@ema.gov', role: 'admin', department: 'IT', password: 'admin123' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on mount
    const stored = localStorage.getItem('ema_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('ema_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const found = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (!found) {
      throw new Error('Invalid email or password');
    }
    
    const { password: _, ...userData } = found;
    setUser(userData);
    localStorage.setItem('ema_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ema_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
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

export { MOCK_USERS };
