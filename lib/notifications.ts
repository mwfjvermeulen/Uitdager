'use client';
import { supabase } from './supabase';
import { getStoredUser } from './auth';

// Public VAPID key — safe to expose in client code
const VAPID_PUBLIC_KEY = 'BILHIDCnH8O_nNEpbJ9XcqoE2yM2KjP3FL_rnVwj6a2W_7pY7bf6jKu2rZZQYRnBx5DcH-IUn_VHTTd0WzdhGEQ';

export async function subscribeToPush() {
  const user = getStoredUser();
  if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await supabase.from('users').update({ push_subscription: sub.toJSON() }).eq('id', user.id);
  } catch (e) {
    console.warn('Push subscription skipped:', e);
  }
}

export async function notifyOtherUser(myId: string, title: string, body: string) {
  try {
    const { data: others } = await supabase.from('users').select('id').neq('id', myId);
    if (!others?.[0]) return;
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: others[0].id, title, body }),
    });
  } catch (e) {
    console.warn('Notify failed:', e);
  }
}

function urlBase64ToUint8Array(base64: string) {
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
