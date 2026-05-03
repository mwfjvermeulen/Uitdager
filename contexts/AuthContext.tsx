import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: async () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const stored = await AsyncStorage.getItem('user_id');
      if (stored) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', stored)
          .single();
        if (data) setUser(data);
      }
    } catch (e) {
      console.error('Failed to load user', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (pin: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('pin_code', pin)
      .single();
    if (error || !data) return false;
    setUser(data);
    await AsyncStorage.setItem('user_id', data.id);
    return true;
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('user_id');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
