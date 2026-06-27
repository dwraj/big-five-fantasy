import { createClient } from '@supabase/supabase-js';

export const initSupabase = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is required');
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
