// Placeholder Supabase env so modules that build a client at import time
// (e.g. draftEngine.js -> getSupabaseAdmin()) can be imported in unit tests.
// No network call happens until a query runs, which these pure-function
// tests never do.
process.env.VITE_SUPABASE_URL ||= 'https://placeholder.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ||= 'placeholder-anon-key';
