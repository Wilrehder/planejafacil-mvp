import { createClient } from '@supabase/supabase-js';

// Environment variables (com fallback oficial para produção Vercel caso variáveis não estejam definidas no painel)
const DEFAULT_SUPABASE_URL = 'https://inqgxjdvuizsdtolrwfb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucWd4amR2dWl6c2R0b2xyd2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3Mjc0NDAsImV4cCI6MjEwNzMwMzQ0MH0.2XA7O5wLQQ9Wos855oIC4HPLBqp-0jkvbqpaHWFPVEQ';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey &&
  supabaseUrl !== 'https://placeholder.supabase.co'
);

// Suporte seguro para ambientes de teste e SSR no Node.js < 22
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {} as any;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
