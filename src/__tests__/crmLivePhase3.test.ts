import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { submitSimulationAndLead } from '../lib/simulationService';

// Polyfill mock WebSocket para Node.js
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {} as any;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://inqgxjdvuizsdtolrwfb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucWd4amR2dWl6c2R0b2xyd2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTA4ODEsImV4cCI6MjA3NTc2Njg4MX0.X_b_0rMh_vKq7K_M6zT8p4Qj3z5A_L4D7x8E2A0O4tI';

describe('FASE 3 — Bateria de Testes do CRM Completo, Segurança e ERP', () => {
  let clientAnon: any;
  let clientSuzano: any;
  let clientMogi: any;
  let clientAdmin: any;

  let leadSuzanoId: string;
  let assignmentSuzanoId: string;
  const tenantSuzanoId = 'b1020000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    clientAnon = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientSuzano = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientMogi = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientAdmin = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

    // Autenticar lojistas reais
    const resSuzano = await clientSuzano.auth.signInWithPassword({
      email: 'dono.suzano@loja.com',
      password: 'PlanejaFacil2026!',
    });
    expect(resSuzano.error).toBeNull();

    const resMogi = await clientMogi.auth.signInWithPassword({
      email: 'dono.mogi@loja.com',
      password: 'PlanejaFacil2026!',
    });
    expect(resMogi.error).toBeNull();

    const resAdmin = await clientAdmin.auth.signInWithPassword({
      email: 'admin@planejafacil.com.br',
      password: 'PlanejaFacil2026!',
    });
    expect(resAdmin.error).toBeNull();

    // 1. Criar um lead real do simulador para Suzano
    let simRes = await submitSimulationAndLead({
      clientInfo: {
        name: 'Cliente CRM Fase 3 Suzano',
        phone: '11977771234',
        cep: '08674-000', // Suzano
        email: 'crm.fase3@suzano.com',
      },
      environments: [
        {
          typeId: 'cozinha',
          name: 'Cozinha Planejada Master',
          areaM2: 15,
          ceilingHeight: 2.7,
          wallCount: 3,
        },
      ],
    });

    // Se caiu na loja 2 de Suzano, enviar outro lead para o Round Robin ciclar para a loja 1
    if (simRes.assignedStoreId !== 'b1020000-0000-0000-0000-000000000002') {
      simRes = await submitSimulationAndLead({
        clientInfo: {
          name: 'Cliente CRM Fase 3 Suzano',
          phone: '11977771235',
          cep: '08674-000',
          email: 'crm.fase3.target@suzano.com',
        },
        environments: [
          {
            typeId: 'cozinha',
            name: 'Cozinha Planejada Master',
            areaM2: 15,
            ceilingHeight: 2.7,
            wallCount: 3,
          },
        ],
      });
    }

    expect(simRes.success).toBe(true);
    expect(simRes.assignedStoreId).toBe('b1020000-0000-0000-0000-000000000002');
    leadSuzanoId = simRes.leadId;

    // Obter assignmentId
    const { data: asgData } = await clientSuzano
      .from('lead_assignments')
      .select('id')
      .eq('lead_id', leadSuzanoId)
      .single();

    expect(asgData).toBeDefined();
    assignmentSuzanoId = asgData!.id;
  });

  it('1. O lead criado no simulador deve aparecer no CRM do lojista via get_store_leads', async () => {
    const { data, error } = await clientSuzano.rpc('get_store_leads', {
      p_tenant_id: 'b1020000-0000-0000-0000-000000000002',
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.leads)).toBe(true);

    const found = data.leads.find((l: any) => l.id === leadSuzanoId);
    expect(found).toBeDefined();
    expect(found.name).toBe('Cliente CRM Fase 3 Suzano');
    expect(found.status).toBe('novo');
  });

  it('2. Avanço assistido para "orcado" sem proposta técnica anexada (Regra Comercial Fase 5)', async () => {
    const { data, error } = await clientSuzano.rpc('update_lead_stage', {
      p_assignment_id: assignmentSuzanoId,
      p_new_status: 'orcado',
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.new_status).toBe('orcado');
    expect(data.has_attachment).toBe(false);
  });

  it('3. Anexo real de proposta e persistência de metadados na atribuição', async () => {
    const { data, error } = await clientSuzano.rpc('attach_lead_proposal', {
      p_assignment_id: assignmentSuzanoId,
      p_file_name: 'proposta_planejafacil_v3.pdf',
      p_file_url: 'https://inqgxjdvuizsdtolrwfb.supabase.co/storage/v1/object/authenticated/lead-proposals/proposta.pdf',
      p_file_size_bytes: 19936,
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.attachment_name).toBe('proposta_planejafacil_v3.pdf');

    // Agora deve permitir avançar para "orcado"
    const { data: advanceData } = await clientSuzano.rpc('update_lead_stage', {
      p_assignment_id: assignmentSuzanoId,
      p_new_status: 'orcado',
    });

    expect(advanceData.success).toBe(true);
    expect(advanceData.new_status).toBe('orcado');
  });

  it('4. Registro de anotações comerciais com autor e persistência em lead_notes', async () => {
    const { data, error } = await clientSuzano.rpc('add_lead_note_entry', {
      p_assignment_id: assignmentSuzanoId,
      p_note_text: 'Cliente agendou visita técnica na obra para terça-feira às 14h.',
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.text).toContain('terça-feira');

    // Confirmar que a nota aparece na listagem do CRM
    const { data: leadsData } = await clientSuzano.rpc('get_store_leads', {
      p_tenant_id: 'b1020000-0000-0000-0000-000000000002',
    });

    const lead = leadsData.leads.find((l: any) => l.id === leadSuzanoId);
    expect(lead.notesList.length).toBeGreaterThan(0);
    const hasNote = lead.notesList.some((n: any) => n.text.includes('visita técnica'));
    expect(hasNote).toBe(true);
  });

  it('5. Isolamento Multi-Tenant: Lojista de Mogi NÃO consegue alterar nem consultar lead de Suzano', async () => {
    // Tentativa de Mogi alterar status do lead de Suzano
    const resForbidden = await clientMogi.rpc('update_lead_stage', {
      p_assignment_id: assignmentSuzanoId,
      p_new_status: 'em_atendimento',
    });

    // Deve ser bloqueado por violação de RLS / Tenant
    expect(resForbidden.error).toBeDefined();
    expect(resForbidden.error?.code).toBe('42501');

    // Tentativa de Mogi consultar leads de Suzano passando o tenant de Suzano
    const resGetForbidden = await clientMogi.rpc('get_store_leads', {
      p_tenant_id: 'b1020000-0000-0000-0000-000000000002',
    });

    // O sistema ignora o parâmetro fraudulento e retorna exclusivamente o tenant do lojista autenticado (Mogi)
    expect(resGetForbidden.data.tenant_id).toBe('b1010000-0000-0000-0000-000000000001');
    const hasSuzanoLead = resGetForbidden.data.leads.some((l: any) => l.id === leadSuzanoId);
    expect(hasSuzanoLead).toBe(false);
  });

  it('6. Segurança de APIs: Usuário Anônimo é bloqueado nas procedures de CRM', async () => {
    const anonGet = await clientAnon.rpc('get_store_leads', {
      p_tenant_id: 'b1020000-0000-0000-0000-000000000002',
    });
    expect(anonGet.error).toBeDefined();

    const anonUpdate = await clientAnon.rpc('update_lead_stage', {
      p_assignment_id: assignmentSuzanoId,
      p_new_status: 'em_atendimento',
    });
    expect(anonUpdate.error).toBeDefined();

    const anonRoute = await clientAnon.rpc('route_and_assign_lead', {
      p_lead_id: leadSuzanoId,
    });
    expect(anonRoute.error).toBeDefined();
  });

  it('7. Gating de Planos: Loja Plano Básico é bloqueada ao tentar cadastrar lead externo', async () => {
    // Garantir que Suzano está no Plano Básico (basic)
    await clientAdmin.from('tenants').update({ plan_tier: 'basic' }).eq('id', tenantSuzanoId);
    await clientAdmin.from('store_subscriptions').update({ plan_tier: 'basic' }).eq('tenant_id', tenantSuzanoId);

    const resBasic = await clientSuzano.rpc('create_external_lead', {
      p_name: 'Lead Manual Tentativa Basico',
      p_phone: '11988880000',
      p_environment: 'Cozinha',
      p_source: 'instagram',
      p_city: 'Suzano',
      p_state_uf: 'SP',
      p_estimated_min: 15000,
      p_estimated_max: 20000,
    });

    expect(resBasic.error).toBeDefined();
    expect(resBasic.error?.message).toContain('Plano Pro');
  });

  it('8. Plano Pro: Loja de Mogi cadastra lead manual com sucesso sem cobrança Pay-Per-Lead', async () => {
    // Mogi está no Plano Pro (pro)
    const resPro = await clientMogi.rpc('create_external_lead', {
      p_name: 'Cliente VIP Instagram Mogi',
      p_phone: '11944445555',
      p_environment: 'Closet & Dormitório',
      p_source: 'instagram',
      p_city: 'Mogi das Cruzes',
      p_state_uf: 'SP',
      p_estimated_min: 22000,
      p_estimated_max: 35000,
    });

    expect(resPro.error).toBeNull();
    expect(resPro.data.success).toBe(true);
    const externalLeadId = resPro.data.lead_id;

    // Verificar que o lead NÃO gerou cobrança em lead_deliveries
    const { data: billableCount } = await clientAdmin
      .from('lead_deliveries')
      .select('id')
      .eq('assignment_id', resPro.data.assignment_id);

    expect(billableCount).toHaveLength(0);
  });

  it('9. Conversão CRM -> ERP: Gera pedido único (#PED-XXXX) e é 100% idempotente', async () => {
    // 1ª chamada de conversão
    const resConvert1 = await clientSuzano.rpc('convert_lead_to_order', {
      p_assignment_id: assignmentSuzanoId,
      p_total_value: 28500,
    });

    expect(resConvert1.error).toBeNull();
    expect(resConvert1.data.success).toBe(true);
    expect(resConvert1.data.order_number).toMatch(/^PED-\d+/);
    const orderNumber1 = resConvert1.data.order_number;

    // 2ª chamada concorrente/repetida (clique duplo)
    const resConvert2 = await clientSuzano.rpc('convert_lead_to_order', {
      p_assignment_id: assignmentSuzanoId,
      p_total_value: 28500,
    });

    expect(resConvert2.error).toBeNull();
    expect(resConvert2.data.success).toBe(true);
    expect(resConvert2.data.status).toBe('already_converted');
    expect(resConvert2.data.order_number).toBe(orderNumber1);

    // Confirmar que existe exatamente 1 pedido na tabela orders
    const { data: orders } = await clientSuzano
      .from('orders')
      .select('id, order_number, total_value')
      .eq('lead_assignment_id', assignmentSuzanoId);

    expect(orders).toHaveLength(1);
    expect(orders![0].order_number).toBe(orderNumber1);
  });
});
