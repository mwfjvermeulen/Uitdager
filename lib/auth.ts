'use client';

export function getStoredUser(): { id: string; name: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('uitdager_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: { id: string; name: string }) {
  localStorage.setItem('uitdager_user', JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem('uitdager_user');
}
