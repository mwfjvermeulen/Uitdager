import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { userId, title, body } = await req.json();
  const { data: user } = await supabase.from('users').select('push_subscription').eq('id', userId).single();
  if (!user?.push_subscription) return NextResponse.json({ error: 'No subscription' }, { status: 404 });
  try {
    await webpush.sendNotification(
      user.push_subscription as webpush.PushSubscription,
      JSON.stringify({ title, body })
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
