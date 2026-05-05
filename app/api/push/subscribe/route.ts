import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { userId, subscription } = await req.json();
  if (!userId || !subscription) return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  await supabase.from('users').update({ push_subscription: subscription }).eq('id', userId);
  return NextResponse.json({ ok: true });
}
