import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pfnfxlegtiwdzfjcwpib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmbmZ4bGVndGl3ZHpmamN3cGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjQzMzUsImV4cCI6MjA5MzQwMDMzNX0.crF85CG5s9QlDnqZePdYbwoHO4Er6LCeW7sNoCNYY_Y'
);

export async function POST(req: NextRequest) {
  const { userId, subscription } = await req.json();
  if (!userId || !subscription) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }
  await supabase.from('users').update({ push_subscription: subscription }).eq('id', userId);
  return NextResponse.json({ ok: true });
}
