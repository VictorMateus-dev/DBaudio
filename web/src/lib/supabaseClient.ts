import { createClient } from '@supabase/supabase-js';

export function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  const clean = url.trim().replace(/^['"]|['"]$/g, '');
  try {
    const parsed = new URL(clean);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return clean
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/auth\/v1\/?$/, '')
      .replace(/\/+$/, '');
  }
}

export function sanitizeSupabaseKey(key: string): string {
  if (!key) return '';
  return key.trim().replace(/^['"]|['"]$/g, '');
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
const supabaseAnonKey = sanitizeSupabaseKey(rawKey);

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project') &&
  !supabaseUrl.includes('seu-projeto')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
