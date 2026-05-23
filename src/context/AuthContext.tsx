import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  users: User[];
  loading: boolean;
  register: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'email' | 'password'>>) => Promise<{ error?: string }>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_KEY = 'recetas_users';
const CURRENT_USER_KEY = 'recetas_current_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedUsers = await AsyncStorage.getItem(USERS_KEY);
      const storedUser = await AsyncStorage.getItem(CURRENT_USER_KEY);
      if (storedUsers) setUsers(JSON.parse(storedUsers));
      if (storedUser) setUser(JSON.parse(storedUser));
      setLoading(false);
    })();
  }, []);

  const saveUsers = async (updated: User[]) => {
    setUsers(updated);
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updated));
  };

  const register = async (name: string, email: string, password: string) => {
    const storedUsers: User[] = JSON.parse((await AsyncStorage.getItem(USERS_KEY)) || '[]');
    if (storedUsers.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { error: 'Ya existe una cuenta con ese correo.' };
    }
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email: email.toLowerCase(),
      password,
      createdAt: new Date().toISOString(),
    };
    const updated = [...storedUsers, newUser];
    await saveUsers(updated);
    setUser(newUser);
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    return {};
  };

  const login = async (email: string, password: string) => {
    const storedUsers: User[] = JSON.parse((await AsyncStorage.getItem(USERS_KEY)) || '[]');
    const found = storedUsers.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return { error: 'Correo o contraseña incorrectos.' };
    setUser(found);
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found));
    return {};
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
  };

  const updateProfile = async (updates: Partial<Pick<User, 'name' | 'email' | 'password'>>) => {
    if (!user) return { error: 'No hay sesión activa.' };
    const storedUsers: User[] = JSON.parse((await AsyncStorage.getItem(USERS_KEY)) || '[]');
    if (updates.email && updates.email.toLowerCase() !== user.email) {
      if (storedUsers.find(u => u.id !== user.id && u.email.toLowerCase() === updates.email!.toLowerCase())) {
        return { error: 'Ese correo ya está en uso.' };
      }
    }
    const updated = storedUsers.map(u =>
      u.id === user.id ? { ...u, ...updates, email: (updates.email || u.email).toLowerCase() } : u
    );
    const updatedUser = updated.find(u => u.id === user.id)!;
    await saveUsers(updated);
    setUser(updatedUser);
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    return {};
  };

  const deleteAccount = async () => {
    if (!user) return;
    const storedUsers: User[] = JSON.parse((await AsyncStorage.getItem(USERS_KEY)) || '[]');
    await saveUsers(storedUsers.filter(u => u.id !== user.id));
    setUser(null);
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, users, loading, register, login, logout, updateProfile, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
