import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://inqgxjdvuizsdtolrwfb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucWd4amR2dWl6c2R0b2xyd2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3Mjc0NDAsImV4cCI6MjEwNzMwMzQ0MH0.2XA7O5wLQQ9Wos855oIC4HPLBqp-0jkvbqpaHWFPVEQ';

// Mock para suprir checagem estática do RealtimeClient no Node.js < 22
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {} as any;
}

describe('Supabase Live API & RLS Integration Test', () => {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  it('deve consultar a tabela ibge_cities via API REST pública e retornar as 10 cidades do seed', async () => {
    const { data, error } = await client
      .from('ibge_cities')
      .select('ibge_code, name, state_uf')
      .order('name');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBeGreaterThanOrEqual(10);
    const cityNames = data?.map((c) => c.name);
    expect(cityNames).toContain('Suzano');
    expect(cityNames).toContain('Mogi das Cruzes');
    expect(cityNames).toContain('São Paulo');
  });

  it('deve consultar a regra de precificação ativa (v1) publicamente', async () => {
    const { data, error } = await client
      .from('pricing_rules')
      .select('version, base_m2_price, is_active')
      .eq('is_active', true)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.version).toBe(1);
    expect(Number(data?.base_m2_price)).toBe(1200);
  });

  it('RLS: usuário não autenticado NÃO deve conseguir ler pedidos (orders) de lojas', async () => {
    const { data, error } = await client
      .from('orders')
      .select('*');

    expect(error).toBeNull();
    // Graças ao RLS na tabela orders, o cliente anônimo recebe lista vazia
    expect(data).toEqual([]);
  });

  it('RLS: usuário não autenticado NÃO deve conseguir ler leads entregues a lojas', async () => {
    const { data, error } = await client
      .from('leads')
      .select('*');

    expect(error).toBeNull();
    // Leads atribuídos a tenants são restritos ao tenant e ao admin
    expect(data).toEqual([]);
  });
});
