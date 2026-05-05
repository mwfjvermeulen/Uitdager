import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL ?? 'mailto:admin@example.com';

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: 'VAPID not configured' }, { status: 501 });
  }

  const { userId, title, body } = await req.json();
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: user } = await supabase.from('users').select('push_subscription').eq('id', userId).single();

  if (!user?.push_subscription) {
    return NextResponse.json({ error: 'No subscription' }, { status: 404 });
  }

  const webpush = (await import('web-push')).default;
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  await webpush.sendNotification(
    user.push_subscription as Parameters<typeof webpush.sendNotification>[0],
    JSON.stringify({ title, body })
  );

  return NextResponse.json({ ok: true });
}
