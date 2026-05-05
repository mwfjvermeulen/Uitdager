import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pfnfxlegtiwdzfjcwpib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmbmZ4bGVndGl3ZHpmamN3cGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjQzMzUsImV4cCI6MjA5MzQwMDMzNX0.crF85CG5s9QlDnqZePdYbwoHO4Er6LCeW7sNoCNYY_Y'
);

export async function POST(req: NextRequest) {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL ?? 'mailto:admin@example.com';

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: 'VAPID not configured' }, { status: 501 });
  }

  const { userId, title, body } = await req.json();
  const { data: user } = await supabase
    .from('users')
    .select('push_subscription')
    .eq('id', userId)
    .single();

  if (!user?.push_subscription) {
    return NextResponse.json({ error: 'No subscription' }, { status: 404 });
  }

  try {
    const webpush = await import('web-push');
    webpush.default.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await webpush.default.sendNotification(user.push_subscription as any, JSON.stringify({ title, body }));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
