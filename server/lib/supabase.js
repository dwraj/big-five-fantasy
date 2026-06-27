import { createClient } from '@supabase/supabase-js';

export const initSupabase = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Supabase credentials missing. API requests will fail.');
    console.warn('   Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
    // Return a dummy client that won't crash the server startup
    return createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');
  }

  return createClient(supabaseUrl, supabaseKey);
};

export const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials missing');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};
