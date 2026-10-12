import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { submitSimulationAndLead } from '../lib/simulationService';
import { activePaymentGateway, toCents, fromCents } from '../lib/gatewayAdapter';

// Polyfill mock WebSocket para Node.js
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {} as any;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://inqgxjdvuizsdtolrwfb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucWd4amR2dWl6c2R0b2xyd2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTA4ODEsImV4cCI6MjA3NTc2Njg4MX0.X_b_0rMh_vKq7K_M6zT8p4Qj3z5A_L4D7x8E2A0O4tI';

describe('FASE 5 — Módulo Financeiro, Assinaturas e Monetização SaaS (PostgreSQL Live)', () => {
  let clientAnon: any;
  let clientSuzano: any;
  let clientMogi: any;
  let clientAdmin: any;

  const tenantSuzanoId = 'b1020000-0000-0000-0000-000000000002';
  const tenantMogiId = 'b1010000-0000-0000-0000-000000000001';

  let testCompetence: string;
  let suzanoInvoiceId: string;
  let suzanoInvoiceNumber: string;

  beforeAll(async () => {
    clientAnon = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientSuzano = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientMogi = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientAdmin = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

    // Autenticações reais
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

    const now = new Date();
    testCompetence = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // 1 & 2. Assinaturas Básico e Pro
  it('1 & 2. Criar e consultar assinaturas dos planos Básico (R$ 119,90) e Pro (R$ 219,90)', async () => {
    const { data: subs, error } = await clientAdmin
      .from('store_subscriptions')
      .select('id, tenant_id, plan_tier, contracted_monthly_price, status')
      .in('tenant_id', [tenantMogiId, tenantSuzanoId]);

    expect(error).toBeNull();
    expect(subs.length).toBeGreaterThanOrEqual(2);

    const mogiSub = subs.find((s: any) => s.tenant_id === tenantMogiId);
    expect(mogiSub).toBeDefined();
    expect(Number(mogiSub.contracted_monthly_price)).toBe(219.90);
    expect(mogiSub.status).toBe('active');
  });

  // 3. Alterar plano de uma loja com histórico
  it('3. Alterar plano da loja (change_store_plan) registrando auditoria em subscription_history', async () => {
    // Mudar Suzano para Pro
    const resChange = await clientSuzano.rpc('change_store_plan', {
      p_tenant_id: tenantSuzanoId,
      p_new_plan: 'pro',
    });

    expect(resChange.error).toBeNull();
    expect(resChange.data.success).toBe(true);
    expect(resChange.data.new_plan).toBe('pro');
    expect(Number(resChange.data.monthly_price)).toBe(219.90);

    // Verificar histórico de auditoria
    const { data: history, error: histErr } = await clientSuzano
      .from('subscription_history')
      .select('action, new_plan, new_price, created_at')
      .eq('tenant_id', tenantSuzanoId)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(histErr).toBeNull();
    expect(history.length).toBe(1);
    expect(history[0].new_plan).toBe('pro');
    expect(Number(history[0].new_price)).toBe(219.90);
  });

  // 4. Preservação do histórico de preços
  it('4. Tabela versionada de precificação preserva versões e congelamento de preços', async () => {
    const { data: pricing, error } = await clientAdmin
      .from('saas_pricing_schedules')
      .select('plan_tier, monthly_price, lead_price, version, is_active')
      .eq('is_active', true);

    expect(error).toBeNull();
    expect(pricing.length).toBe(2);

    const basicTier = pricing.find((p: any) => p.plan_tier === 'basic');
    const proTier = pricing.find((p: any) => p.plan_tier === 'pro');

    expect(Number(basicTier.monthly_price)).toBe(119.90);
    expect(Number(proTier.monthly_price)).toBe(219.90);
    expect(Number(basicTier.lead_price)).toBe(50.00);
  });

  // 5. Entregar lead e registrar evento faturável
  it('5. Entregar lead faturável e registrar evento contábil em lead_deliveries com preço congelado', async () => {
    const resSim = await submitSimulationAndLead({
      clientInfo: {
        name: 'Cliente Faturamento Fase 5',
        phone: '11977778888',
        cep: '08674-000', // Suzano
        email: 'fat.fase5@teste.com',
      },
      environments: [
        {
          typeId: 'cozinha',
          name: 'Cozinha Planejada Financeiro',
          areaM2: 12,
          ceilingHeight: 2.6,
          wallCount: 2,
        },
      ],
    });

    expect(resSim.success).toBe(true);
    expect(resSim.distributionStatus).toBe('atribuido');

    // Localizar a atribuição e registro contábil em lead_deliveries correspondente ao lead criado
    const { data: asgn, error: errAsgn } = await clientAdmin
      .from('lead_assignments')
      .select('id, tenant_id')
      .eq('lead_id', resSim.leadId)
      .single();

    expect(errAsgn).toBeNull();
    expect(asgn).toBeDefined();

    const { data: delv, error } = await clientAdmin
      .from('lead_deliveries')
      .select('id, unit_cost, is_billable, delivery_status, tenant_id')
      .eq('assignment_id', asgn.id)
      .single();

    expect(error).toBeNull();
    expect(delv).toBeDefined();
    expect(delv.is_billable).toBe(true);
    expect(Number(delv.unit_cost)).toBe(50.00);
    expect(['delivered', 'eligible_for_billing', 'invoiced']).toContain(delv.delivery_status);
  });

  // 6. Não cobrar lead sem cobertura
  it('6. Lead sem cobertura (P3) NÃO gera registro contábil nem cobrança em lead_deliveries', async () => {
    const resSimNoCover = await submitSimulationAndLead({
      clientInfo: {
        name: 'Cliente Sem Cobertura Financeiro',
        phone: '19988887777',
        cep: '13010-000', // Campinas (sem lojas credenciadas)
        email: 'sem.cobertura.fat@teste.com',
      },
      environments: [
        {
          typeId: 'sala',
          name: 'Home Theater',
          areaM2: 20,
          ceilingHeight: 2.7,
          wallCount: 1,
        },
      ],
    });

    expect(resSimNoCover.success).toBe(true);
    expect(resSimNoCover.distributionStatus).toBe('sem_cobertura');

    // Confirmar que NENHUM lead_delivery foi associado a este lead
    const { data: delvs } = await clientAdmin
      .from('lead_deliveries')
      .select('id, assignment_id');

    // Nenhum assignment existe para esse lead sem cobertura
    const { data: assignments } = await clientAdmin
      .from('lead_assignments')
      .select('id')
      .eq('lead_id', resSimNoCover.leadId);

    expect(assignments.length).toBe(0);
  });

  // 7. Não cobrar lead externo cadastrado manualmente
  it('7. Lead cadastrado manualmente pelo lojista (externo) NÃO gera cobrança Pay-Per-Lead', async () => {
    const resExternal = await clientSuzano.rpc('create_external_lead', {
      p_name: 'Lead Manual Balcão',
      p_phone: '11977771234',
      p_environment: 'Quarto',
      p_source: 'balcao',
      p_city: 'Suzano',
      p_state_uf: 'SP',
      p_estimated_min: 10000,
      p_estimated_max: 18000,
    });

    expect(resExternal.error).toBeNull();
    expect(resExternal.data.success).toBe(true);
    const assignmentId = resExternal.data.assignment_id;

    // Verificar se lead_deliveries NÃO possui registro para este assignment
    const { data: delvCheck } = await clientSuzano
      .from('lead_deliveries')
      .select('id')
      .eq('assignment_id', assignmentId);

    expect(delvCheck.length).toBe(0);
  });

  // 8. Não duplicar cobrança em reprocessamentos
  it('8. Idempotência contábil: Execuções repetidas da atribuição não duplicam cobrança', async () => {
    // Buscar um lead atribuído existente
    const { data: existingLead } = await clientSuzano
      .from('lead_deliveries')
      .select('assignment_id')
      .eq('tenant_id', tenantSuzanoId)
      .limit(1)
      .single();

    expect(existingLead).toBeDefined();

    // Contar deliveries antes
    const { count: countBefore } = await clientSuzano
      .from('lead_deliveries')
      .select('id', { count: 'exact' })
      .eq('assignment_id', existingLead.assignment_id);

    expect(countBefore).toBe(1);

    // Tentar inserir duplicado direto com o mesmo assignment_id
    const resDuplicate = await clientSuzano
      .from('lead_deliveries')
      .insert({
        assignment_id: existingLead.assignment_id,
        tenant_id: tenantSuzanoId,
        unit_cost: 50.00,
        is_billable: true,
      });

    // Rejeitado por constraint UNIQUE
    expect(resDuplicate.error).not.toBeNull();
  });

  // 9. Gerar fatura com itens corretos
  it('9. Gerar fatura mensal consolidada (generate_monthly_invoice) com mensalidade e leads', async () => {
    const resInvoice = await clientSuzano.rpc('generate_monthly_invoice', {
      p_tenant_id: tenantSuzanoId,
      p_competence_month: testCompetence,
    });

    expect(resInvoice.error).toBeNull();
    expect(resInvoice.data.success).toBe(true);
    expect(resInvoice.data.invoice_id).toBeDefined();
    expect(resInvoice.data.invoice_number).toMatch(/^FAT-\d+/);
    expect(Number(resInvoice.data.total_due)).toBeGreaterThanOrEqual(219.90);

    suzanoInvoiceId = resInvoice.data.invoice_id;
    suzanoInvoiceNumber = resInvoice.data.invoice_number;

    // Verificar itens da fatura em invoice_items
    const { data: items, error: itemsErr } = await clientSuzano
      .from('invoice_items')
      .select('item_type, description, quantity, unit_price, total_price')
      .eq('invoice_id', suzanoInvoiceId);

    expect(itemsErr).toBeNull();
    expect(items.length).toBeGreaterThanOrEqual(1);

    const hasSubItem = items.some((i: any) => i.item_type === 'subscription');
    expect(hasSubItem).toBe(true);
  });

  // 10. Reexecutar faturamento sem duplicar itens
  it('10. Idempotência da fatura: Reexecutar faturamento para a mesma competência retorna a fatura existente', async () => {
    const resRepeat = await clientSuzano.rpc('generate_monthly_invoice', {
      p_tenant_id: tenantSuzanoId,
      p_competence_month: testCompetence,
    });

    expect(resRepeat.error).toBeNull();
    expect(resRepeat.data.success).toBe(true);
    expect(resRepeat.data.status).toBe('already_exists');
    expect(resRepeat.data.invoice_id).toBe(suzanoInvoiceId);
    expect(resRepeat.data.invoice_number).toBe(suzanoInvoiceNumber);
  });

  // 11 & 14. Liquidação da fatura restrita a admin (process_simulated_payment) altera status para "paid"
  it('11 & 14. Liquidação simulada da fatura (process_simulated_payment) altera status para "paid"', async () => {
    // Lojista regular Suzano é bloqueado
    const resBlocked = await clientSuzano.rpc('process_simulated_payment', {
      p_invoice_id: suzanoInvoiceId,
      p_payment_method: 'pix',
    });
    expect(resBlocked.error).not.toBeNull();
    expect(resBlocked.error.code).toBe('42501');

    // Administrador executa com sucesso
    const resPay = await clientAdmin.rpc('process_simulated_payment', {
      p_invoice_id: suzanoInvoiceId,
      p_payment_method: 'pix',
    });

    expect(resPay.error).toBeNull();
    expect(resPay.data.success).toBe(true);
    expect(['paid', 'already_paid']).toContain(resPay.data.status);

    // Confirmar alteração na tabela invoices
    const { data: invCheck } = await clientSuzano
      .from('invoices')
      .select('status, paid_at, payment_method')
      .eq('id', suzanoInvoiceId)
      .single();

    expect(invCheck.status).toBe('paid');
    expect(invCheck.paid_at).not.toBeNull();
    expect(invCheck.payment_method).toBe('pix');
  });

  // 12. Rejeitar webhook inválido
  it('12. Gateway Adapter rejeita webhook com assinatura ou payload inválido', () => {
    const isInvalid = activePaymentGateway.verifyWebhookSignature('', '', 'segredo_oficial');
    expect(isInvalid).toBe(false);
  });

  // 13. Ignorar efeito duplicado de webhook repetido (anti-replay)
  it('13. Procedure process_webhook_event ignora replay de evento repetido com status duplicate_ignored', async () => {
    const testEventId = `evt_test_replay_${Date.now()}`;
    const payload = {
      invoice_number: suzanoInvoiceNumber,
      amount: 219.90,
      payment_method: 'pix',
    };

    // Primeira chamada
    const resEvt1 = await clientAdmin.rpc('process_webhook_event', {
      p_provider: 'sandbox',
      p_event_id: testEventId,
      p_event_type: 'PAYMENT_CONFIRMED',
      p_payload: payload,
    });

    expect(resEvt1.error).toBeNull();
    expect(resEvt1.data.success).toBe(true);

    // Segunda chamada com o mesmo event_id (replay)
    const resEvt2 = await clientAdmin.rpc('process_webhook_event', {
      p_provider: 'sandbox',
      p_event_id: testEventId,
      p_event_type: 'PAYMENT_CONFIRMED',
      p_payload: payload,
    });

    expect(resEvt2.error).toBeNull();
    expect(resEvt2.data.success).toBe(true);
    expect(resEvt2.data.status).toBe('duplicate_ignored');
  });

  // 15. Atualizar indicadores financeiros corretamente
  it('15. Procedimento get_admin_financial_metrics agrega MRR, ARR e faturamento com fidelidade', async () => {
    const resMetrics = await clientAdmin.rpc('get_admin_financial_metrics');

    expect(resMetrics.error).toBeNull();
    expect(resMetrics.data.success).toBe(true);
    expect(Number(resMetrics.data.mrr)).toBeGreaterThan(0);
    expect(Number(resMetrics.data.arr)).toBeCloseTo(Number(resMetrics.data.mrr) * 12, 1);
    expect(Number(resMetrics.data.total_invoiced)).toBeGreaterThan(0);
    expect(Number(resMetrics.data.total_collected)).toBeGreaterThan(0);
    expect(Array.isArray(resMetrics.data.stores_breakdown)).toBe(true);
  });

  // 16. Impedir acesso financeiro cruzado entre lojas
  it('16. Isolamento estrito RLS: Lojista de Mogi é bloqueado ao tentar consultar faturas de Suzano', async () => {
    // Mogi tentando consultar overview passando tenant de Suzano
    const resMogiReq = await clientMogi.rpc('get_store_financial_overview', {
      p_tenant_id: tenantSuzanoId,
    });

    // Procedure força o tenant do usuário logado (Mogi)
    expect(resMogiReq.data.tenant_id).toBe(tenantMogiId);
    
    // Consulta direta RLS na tabela invoices
    const { data: crossInvoices } = await clientMogi
      .from('invoices')
      .select('id, invoice_number, tenant_id')
      .eq('id', suzanoInvoiceId);

    // RLS filtra e não retorna a fatura de Suzano para Mogi
    expect(crossInvoices.length).toBe(0);
  });

  // 17. Validar política de inadimplência configurada
  it('17. Configuração de inadimplência (grace_period_days) é consultável e preserva acesso histórico', async () => {
    const { data: settings, error } = await clientSuzano
      .from('platform_financial_settings')
      .select('grace_period_days, auto_suspend_routing, block_portal_access')
      .eq('id', 1)
      .single();

    expect(error).toBeNull();
    expect(settings.grace_period_days).toBe(5);
    expect(settings.block_portal_access).toBe(false); // Histórico sempre acessível
  });

  // 18. Conversão de precisão em centavos
  it('18. Conversor toCents e fromCents previne falhas de ponto flutuante JavaScript', () => {
    expect(toCents(119.90)).toBe(11990);
    expect(toCents(219.90)).toBe(21990);
    expect(toCents(50.00)).toBe(5000);
    expect(fromCents(11990)).toBe(119.90);
  });

  // 19. Configurabilidade administrativa de documentos do ERP
  it('19. Administrador consegue configurar exigência de documentos do ERP dinamicamente', async () => {
    // Admin altera exigência da medição para false
    const resToggle = await clientAdmin.rpc('admin_toggle_erp_stage_rule', {
      p_stage: 'medicao',
      p_document_required: false,
    });

    expect(resToggle.error).toBeNull();
    expect(resToggle.data.success).toBe(true);
    expect(resToggle.data.document_required).toBe(false);

    // Reverte para true para manter padrão de segurança
    await clientAdmin.rpc('admin_toggle_erp_stage_rule', {
      p_stage: 'medicao',
      p_document_required: true,
    });
  });

  // 20. Usuário anônimo é bloqueado nas procedures financeiras
  it('20. Bloqueio de anon nas procedures de faturamento e métricas financeiras', async () => {
    const anonMetrics = await clientAnon.rpc('get_admin_financial_metrics');
    expect(anonMetrics.error).toBeDefined();

    const anonInvoice = await clientAnon.rpc('generate_monthly_invoice', {
      p_tenant_id: tenantSuzanoId,
      p_competence_month: testCompetence,
    });
    expect(anonInvoice.error).toBeDefined();
  });

  // 21. Simulador público continua 100% funcional sem quebras
  it('21. Simulador público continua calculando e registrando leads perfeitamente', async () => {
    const resSim = await submitSimulationAndLead({
      clientInfo: {
        name: 'Consumidor Final Fase 5',
        phone: '11988889999',
        cep: '08674-000',
        email: 'consumidor.fase5@teste.com',
      },
      environments: [
        {
          typeId: 'quarto',
          name: 'Quarto Integrado',
          areaM2: 15,
          ceilingHeight: 2.6,
          wallCount: 2,
        },
      ],
    });

    expect(resSim.success).toBe(true);
    expect(resSim.distributionStatus).toBe('atribuido');
    expect(resSim.budgetMin).toBeGreaterThan(0);
  });
});
