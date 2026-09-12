import { createClient } from '@supabase/supabase-js';

// Função para sanitizar e normalizar a URL do Supabase
// Remove caminhos extras comuns como /rest/v1, /auth/v1, barras finais ou aspas acidentais
export function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  const clean = url.trim().replace(/^['"]|['"]$/g, '');
  try {
    const parsed = new URL(clean);
    // Retorna estritamente o protocolo e o host (ex: https://abcdef.supabase.co)
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

// Cliente oficial Supabase
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
