import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://pfnfxlegtiwdzfjcwpib.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmbmZ4bGVndGl3ZHpmamN3cGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjQzMzUsImV4cCI6MjA5MzQwMDMzNX0.crF85CG5s9QlDnqZePdYbwoHO4Er6LCeW7sNoCNYY_Y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
