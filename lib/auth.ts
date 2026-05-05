'use client';

export interface StoredUser {
  id: string;
  name: string;
  avatar?: string;
  slogan?: string;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('uitdager_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setStoredUser(user: StoredUser) {
  localStorage.setItem('uitdager_user', JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem('uitdager_user');
}
