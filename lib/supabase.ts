import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://pfnfxlegtiwdzfjcwpib.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmbmZ4bGVndGl3ZHpmamN3cGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjQzMzUsImV4cCI6MjA5MzQwMDMzNX0.crF85CG5s9QlDnqZePdYbwoHO4Er6LCeW7sNoCNYY_Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
