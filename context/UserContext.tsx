'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getStoredUser } from '@/lib/auth';
import type { User } from '@/types';

interface UserContextType {
  user: User | null;
  otherUser: User | null;
  reload: () => void;
}

const UserContext = createContext<UserContextType>({ user: null, otherUser: null, reload: () => {} });

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);

  const load = async () => {
    const stored = getStoredUser();
    if (!stored) return;
    const { data: all } = await supabase.from('users').select('*');
    if (!all) return;
    setUser(all.find(u => u.id === stored.id) ?? null);
    setOtherUser(all.find(u => u.id !== stored.id) ?? null);
  };

  useEffect(() => { load(); }, []);
  return <UserContext.Provider value={{ user, otherUser, reload: load }}>{children}</UserContext.Provider>;
}

export const useUsers = () => useContext(UserContext);
