import { createClient } from '@supabase/supabase-js';

function normalizeEnvValue(value) {
  return String(value || '').trim();
}

const supabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
// Supabase anon keys are JWT-like tokens and should never contain whitespace.
const supabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY).replace(/\s+/g, '');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
