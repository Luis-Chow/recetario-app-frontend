import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api, ApiError, setToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  register: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (
    updates: Partial<Pick<User, 'name' | 'email' | 'avatar'>> & { password?: string; currentPassword?: string }
  ) => Promise<{ error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Error desconocido.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { user } = await api.getMe();
        setUser(user);
      } catch {
        await setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const register = async (name: string, email: string, password: string) => {
    try {
      const { user, token } = await api.register(name, email, password);
      await setToken(token);
      setUser(user);
      return {};
    } catch (e) {
      return { error: errorMessage(e) };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { user, token } = await api.login(email, password);
      await setToken(token);
      setUser(user);
      return {};
    } catch (e) {
      return { error: errorMessage(e) };
    }
  };

  const logout = async () => {
    await setToken(null);
    setUser(null);
  };

  const updateProfile = async (
    updates: Partial<Pick<User, 'name' | 'email' | 'avatar'>> & { password?: string; currentPassword?: string }
  ) => {
    try {
      const { user } = await api.updateMe(updates);
      setUser(user);
      return {};
    } catch (e) {
      return { error: errorMessage(e) };
    }
  };

  const deleteAccount = async () => {
    try {
      await api.deleteMe();
      await setToken(null);
      setUser(null);
      return {};
    } catch (e) {
      return { error: errorMessage(e) };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, updateProfile, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
