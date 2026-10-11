import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { submitSimulationAndLead } from '../lib/simulationService';

// Polyfill mock WebSocket para Node.js se necessário
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {} as any;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://inqgxjdvuizsdtolrwfb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucWd4amR2dWl6c2R0b2xyd2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTA4ODEsImV4cCI6MjA3NTc2Njg4MX0.X_b_0rMh_vKq7K_M6zT8p4Qj3z5A_L4D7x8E2A0O4tI';

describe('Cenário B: Autenticação Real e Isolamento RLS Multi-Tenant (Fase 2)', () => {
  let suzanoLeadId: string;

  beforeAll(async () => {
    let simResult = await submitSimulationAndLead({
      clientInfo: {
        name: 'Isolamento Teste Suzano',
        phone: '11966665555',
        cep: '08674-000', // Suzano
        email: 'isolamento@suzano.com.br',
      },
      environments: [
        {
          typeId: 'cozinha',
          name: 'Cozinha Isolamento',
          areaM2: 12,
          ceilingHeight: 2.7,
          wallCount: 3,
        },
      ],
    });

    if (simResult.assignedStoreId !== 'b1020000-0000-0000-0000-000000000002') {
      simResult = await submitSimulationAndLead({
        clientInfo: {
          name: 'Isolamento Teste Suzano Direcionado',
          phone: '11966665557',
          cep: '08674-000',
          email: 'isolamento.direcionado@suzano.com.br',
        },
        environments: [
          {
            typeId: 'cozinha',
            name: 'Cozinha Isolamento Direcionado',
            areaM2: 12,
            ceilingHeight: 2.7,
            wallCount: 3,
          },
        ],
      });
    }

    expect(simResult.success).toBe(true);
    expect(simResult.assignedStoreId).toBe('b1020000-0000-0000-0000-000000000002'); // Suzano Store 1
    suzanoLeadId = simResult.leadId;
  });

  it('Lojista de Suzano autenticado DEVE conseguir visualizar o lead atribuído à sua loja', async () => {
    const clientSuzano = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await clientSuzano.auth.signInWithPassword({
      email: 'dono.suzano@loja.com',
      password: 'PlanejaFacil2026!',
    });

    expect(authError).toBeNull();
    expect(authData.session).toBeDefined();

    // Consulta os leads atribuídos à loja de Suzano
    const { data: leads, error: leadsError } = await clientSuzano
      .from('leads')
      .select('id, name, city_name, distribution_status')
      .eq('id', suzanoLeadId);

    expect(leadsError).toBeNull();
    expect(leads).toBeDefined();
    expect(leads?.length).toBe(1);
    expect(leads?.[0].name).toContain('Isolamento Teste Suzano');
    expect(leads?.[0].city_name).toBe('Suzano');
  });

  it('Lojista de Mogi das Cruzes autenticado NÃO DEVE conseguir consultar o lead privado de Suzano (Isolamento RLS)', async () => {
    const clientMogi = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await clientMogi.auth.signInWithPassword({
      email: 'dono.mogi@loja.com',
      password: 'PlanejaFacil2026!',
    });

    expect(authError).toBeNull();
    expect(authData.session).toBeDefined();

    // Tentativa direta de consultar o lead privado de Suzano pelo ID
    const { data: leads, error: leadsError } = await clientMogi
      .from('leads')
      .select('id, name, city_name')
      .eq('id', suzanoLeadId);

    // O RLS deve filtrar e retornar 0 linhas (ou erro), nunca revelando os dados da loja de Suzano
    expect(leadsError).toBeNull();
    expect(leads).toBeDefined();
    expect(leads?.length).toBe(0);
  });

  it('Tentativa de acesso anônimo/não autenticado ao lead privado DEVE retornar 0 registros', async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: leads, error } = await anonClient
      .from('leads')
      .select('id, name, phone')
      .eq('id', suzanoLeadId);

    // Não autenticado não tem acesso a leads privados
    expect(leads?.length || 0).toBe(0);
  });
});
