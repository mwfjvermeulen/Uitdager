import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { userId, subscription } = await req.json();
  if (!userId || !subscription) return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await supabase.from('users').update({ push_subscription: subscription }).eq('id', userId);
  return NextResponse.json({ ok: true });
}
