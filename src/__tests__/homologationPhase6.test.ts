import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { submitSimulationAndLead } from '../lib/simulationService';
import { reprocessMonthlyInvoice, adminReassignLead } from '../lib/financialService';

// Polyfill WebSocket para Node.js
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {} as any;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://inqgxjdvuizsdtolrwfb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucWd4amR2dWl6c2R0b2xyd2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTA4ODEsImV4cCI6MjA3NTc2Njg4MX0.X_b_0rMh_vKq7K_M6zT8p4Qj3z5A_L4D7x8E2A0O4tI';

describe('FASE 6 — Homologação Integral, Auditoria e Regras Avançadas (PostgreSQL Live)', () => {
  let clientAnon: any;
  let clientSuzano: any;
  let clientMogi: any;
  let clientAdmin: any;

  const tenantSuzanoId = 'b1020000-0000-0000-0000-000000000002';
  const tenantMogiId = 'b1010000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    clientAnon = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientSuzano = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientMogi = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientAdmin = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

    await clientSuzano.auth.signInWithPassword({
      email: 'dono.suzano@loja.com',
      password: 'PlanejaFacil2026!',
    });

    await clientMogi.auth.signInWithPassword({
      email: 'dono.mogi@loja.com',
      password: 'PlanejaFacil2026!',
    });

    await clientAdmin.auth.signInWithPassword({
      email: 'admin@planejafacil.com.br',
      password: 'PlanejaFacil2026!',
    });
  });

  // 1. Auditoria Matemática de Vencimentos em 28, 29, 30 e 31 dias
  it('1. Procedimento calculate_billing_due_date realiza clamp correto para meses de 28, 29, 30 e 31 dias', async () => {
    // Competência 2027-01 (Janeiro 2027), vencimento contratual dia 31 -> Fevereiro 2027 tem 28 dias
    const { data: d28, error: e28 } = await clientAdmin.rpc('calculate_billing_due_date', {
      p_competence_month: '2027-01',
      p_due_day: 31,
    });
    expect(e28).toBeNull();
    expect(d28).toBe('2027-02-28');

    // Competência 2028-01 (Janeiro 2028 bissexto), dia 31 -> Fevereiro 2028 tem 29 dias
    const { data: d29, error: e29 } = await clientAdmin.rpc('calculate_billing_due_date', {
      p_competence_month: '2028-01',
      p_due_day: 31,
    });
    expect(e29).toBeNull();
    expect(d29).toBe('2028-02-29');

    // Competência 2026-03 (Março 2026), dia 31 -> Abril tem 30 dias
    const { data: d30, error: e30 } = await clientAdmin.rpc('calculate_billing_due_date', {
      p_competence_month: '2026-03',
      p_due_day: 31,
    });
    expect(e30).toBeNull();
    expect(d30).toBe('2026-04-30');

    // Competência 2026-10 (Outubro 2026), dia 15 -> Novembro dia 15
    const { data: d15, error: e15 } = await clientAdmin.rpc('calculate_billing_due_date', {
      p_competence_month: '2026-10',
      p_due_day: 15,
    });
    expect(e15).toBeNull();
    expect(d15).toBe('2026-11-15');
  });

  // 2. Fatura Mensal com Vencimento Dinâmico por Loja
  it('2. generate_monthly_invoice calcula vencimento respeitando o billing_due_day contratual da loja', async () => {
    // Configurar Mogi para vencimento dia 15
    await clientAdmin.from('store_subscriptions').update({ billing_due_day: 15 }).eq('tenant_id', tenantMogiId);

    // Gerar fatura para competência de teste 2027-03
    await clientAdmin.from('invoices').delete().eq('tenant_id', tenantMogiId).eq('competence_month', '2027-03');

    const { data: invRes, error } = await clientAdmin.rpc('generate_monthly_invoice', {
      p_tenant_id: tenantMogiId,
      p_competence_month: '2027-03',
    });

    expect(error).toBeNull();
    expect(invRes.success).toBe(true);
    expect(invRes.due_date).toBe('2027-04-15');

    // Limpeza
    await clientAdmin.from('invoices').delete().eq('id', invRes.invoice_id);
  });

  // 3. Reprocessamento de Faturas Abertas (reprocess_monthly_invoice)
  it('3. reprocess_monthly_invoice adiciona novos leads faturáveis à fatura pendente sem duplicar faturamento', async () => {
    const competence = '2027-05';
    await clientAdmin.from('invoices').delete().eq('tenant_id', tenantSuzanoId).eq('competence_month', competence);

    // 1. Gerar fatura inicial vazia de leads
    const { data: initInv } = await clientAdmin.rpc('generate_monthly_invoice', {
      p_tenant_id: tenantSuzanoId,
      p_competence_month: competence,
    });
    expect(initInv.success).toBe(true);
    const invoiceId = initInv.invoice_id;

    // 2. Criar lead real através de submitSimulationAndLead e posicionar na competência
    const resSim = await submitSimulationAndLead({
      clientInfo: {
        name: 'Lead Teste Reprocessamento',
        phone: '11999990001',
        cep: '08674-000',
        email: 'reproc@teste.com',
      },
      environments: [
        { typeId: 'cozinha', name: 'Cozinha Reproc', areaM2: 10, ceilingHeight: 2.6, wallCount: 2 }
      ]
    });
    expect(resSim.success).toBe(true);

    const { data: asgn } = await clientAdmin
      .from('lead_assignments')
      .select('id')
      .eq('lead_id', resSim.leadId)
      .single();

    expect(asgn).toBeDefined();

    const { data: delivery, error: errDelv } = await clientAdmin
      .from('lead_deliveries')
      .update({
        tenant_id: tenantSuzanoId,
        created_at: `${competence}-10T12:00:00Z`,
        invoice_id: null,
        delivery_status: 'delivered',
        is_billable: true,
      })
      .eq('assignment_id', asgn.id)
      .select('id')
      .single();

    expect(errDelv).toBeNull();
    expect(delivery).toBeDefined();

    // 3. Reprocessar fatura aberta
    const { data: reprocRes, error: errReproc } = await clientAdmin.rpc('reprocess_monthly_invoice', {
      p_invoice_id: invoiceId,
    });

    expect(errReproc).toBeNull();
    expect(reprocRes.success).toBe(true);
    expect(reprocRes.status).toBe('reprocessed');
    expect(reprocRes.additional_leads).toBeGreaterThanOrEqual(1);

    // 4. Verificar se a entrega agora está associada à fatura
    const { data: checkDelv } = await clientAdmin
      .from('lead_deliveries')
      .select('invoice_id, delivery_status')
      .eq('id', delivery.id)
      .single();

    expect(checkDelv.invoice_id).toBe(invoiceId);
    expect(checkDelv.delivery_status).toBe('invoiced');

    // 5. Limpeza de dados temporários do teste
    await clientAdmin.from('lead_deliveries').delete().eq('id', delivery.id);
    await clientAdmin.from('lead_assignments').delete().eq('id', asgn.id);
    await clientAdmin.from('invoices').delete().eq('id', invoiceId);
  });

  // 4. Rejeição de Reprocessamento em Fatura Quitada
  it('4. reprocess_monthly_invoice bloqueia reprocessamento caso a fatura já esteja com status "paid"', async () => {
    const competence = '2027-06';
    await clientAdmin.from('invoices').delete().eq('tenant_id', tenantSuzanoId).eq('competence_month', competence);

    const { data: invRes } = await clientAdmin.rpc('generate_monthly_invoice', {
      p_tenant_id: tenantSuzanoId,
      p_competence_month: competence,
    });

    // Marcar fatura como quitada
    await clientAdmin.from('invoices').update({ status: 'paid', amount_paid: invRes.total_due }).eq('id', invRes.invoice_id);

    // Tentar reprocessar fatura paga
    const { data: blockRes } = await clientAdmin.rpc('reprocess_monthly_invoice', {
      p_invoice_id: invRes.invoice_id,
    });

    expect(blockRes.success).toBe(false);
    expect(blockRes.error).toContain('Fatura já quitada');

    // Limpeza
    await clientAdmin.from('invoices').delete().eq('id', invRes.invoice_id);
  });

  // 5. Reatribuição Administrativa de Lead com Cancelamento de Cobrança Anterior
  it('5. admin_reassign_lead reatribui lead entre lojas, cancela cobrança da loja anterior e abre nova entrega para a loja de destino', async () => {
    // 1. Criar lead real pelo simulador atribuído a Suzano
    const resSim = await submitSimulationAndLead({
      clientInfo: {
        name: 'Lead Teste Reatribuição',
        phone: '11988880001',
        cep: '08674-000',
        email: 'reatribuicao@teste.com',
      },
      environments: [
        {
          typeId: 'cozinha',
          name: 'Cozinha Reatribuir',
          areaM2: 10,
          ceilingHeight: 2.6,
          wallCount: 2,
        },
      ],
    });

    expect(resSim.success).toBe(true);
    const leadId = resSim.leadId;

    // 2. Localizar atribuição anterior
    const { data: oldAsgn } = await clientAdmin
      .from('lead_assignments')
      .select('id, tenant_id')
      .eq('lead_id', leadId)
      .single();

    expect(oldAsgn).toBeDefined();
    const sourceTenantId = oldAsgn.tenant_id;
    const destTenantId = sourceTenantId === tenantSuzanoId ? tenantMogiId : tenantSuzanoId;

    // 3. Executar reatribuição administrativa
    const { data: reassignRes, error: errReassign } = await clientAdmin.rpc('admin_reassign_lead', {
      p_lead_id: leadId,
      p_new_tenant_id: destTenantId,
      p_reason: 'Solicitação do cliente por maior proximidade da filial.',
    });

    expect(errReassign).toBeNull();
    expect(reassignRes.success).toBe(true);
    expect(reassignRes.new_tenant_id).toBe(destTenantId);

    // 4. Comprovar que a entrega antiga teve status cancelado e is_billable = false
    const { data: oldDelivery } = await clientAdmin
      .from('lead_deliveries')
      .select('is_billable, delivery_status')
      .eq('assignment_id', oldAsgn.id)
      .single();

    expect(oldDelivery.is_billable).toBe(false);
    expect(['canceled', 'cancelled']).toContain(oldDelivery.delivery_status);

    // 5. Comprovar que a nova entrega para a loja de destino foi gerada com sucesso
    const { data: newDelivery } = await clientAdmin
      .from('lead_deliveries')
      .select('is_billable, unit_cost, delivery_status, tenant_id')
      .eq('assignment_id', reassignRes.new_assignment_id)
      .single();

    expect(newDelivery.is_billable).toBe(true);
    expect(Number(newDelivery.unit_cost)).toBe(50.00);
    expect(newDelivery.tenant_id).toBe(destTenantId);
    expect(newDelivery.delivery_status).toBe('delivered');
  });

  // 6. Segurança: Lojista Comum é Bloqueado de Chamar admin_reassign_lead
  it('6. Lojista comum é bloqueado com erro 42501 ao tentar chamar admin_reassign_lead', async () => {
    const { error: errBlock } = await clientSuzano.rpc('admin_reassign_lead', {
      p_lead_id: 'a7028217-207c-4850-bb34-c1294b9560e6',
      p_new_tenant_id: tenantMogiId,
      p_reason: 'Tentativa não autorizada',
    });

    expect(errBlock).not.toBeNull();
    expect(errBlock.code).toBe('42501');
  });

  // 7. Segurança: Lojista Comum Não Pode Quitar Faturas Próprias
  it('7. Lojista comum não pode registrar pagamento manual ou autoliquidar faturas', async () => {
    // 1. Tentar RPC administrativa de pagamento
    const { error: errPay } = await clientSuzano.rpc('admin_register_manual_payment', {
      p_invoice_id: 'b1020000-0000-0000-0000-000000000002',
      p_amount_paid: 100.00,
      p_payment_date: new Date().toISOString(),
      p_payment_method: 'pix',
      p_notes: 'Tentativa de autoliquidação',
      p_external_reference: 'PIX-FAKE',
      p_idempotency_key: 'IDEM-AUTOLIQ-TEST',
    });

    expect(errPay).not.toBeNull();
    expect(errPay.code).toBe('42501');

    // 2. Tentar alterar status diretamente na tabela invoices via RLS
    const { data: updatedRows } = await clientSuzano
      .from('invoices')
      .update({ status: 'paid', amount_paid: 1000 })
      .eq('tenant_id', tenantSuzanoId)
      .select('id, status');

    // Com RLS ativo, nenhuma linha é afetada pelo cliente lojista
    expect(!updatedRows || updatedRows.length === 0).toBe(true);
  });

  // 8. Integridade de Status: Entregas em Faturas Parcialmente Pagas vs Quitadas
  it('8. Status de lead_deliveries permanece "invoiced" em faturas parcialmente pagas e muda para "paid" apenas com quitação total', async () => {
    const competence = '2027-07';
    await clientAdmin.from('invoices').delete().eq('tenant_id', tenantSuzanoId).eq('competence_month', competence);

    // Gerar fatura
    const { data: invRes } = await clientAdmin.rpc('generate_monthly_invoice', {
      p_tenant_id: tenantSuzanoId,
      p_competence_month: competence,
    });

    const invoiceId = invRes.invoice_id;

    // Criar lead real através de submitSimulationAndLead
    const resSim8 = await submitSimulationAndLead({
      clientInfo: {
        name: 'Lead Teste Quitação',
        phone: '11999990002',
        cep: '08674-000',
        email: 'quitacao@teste.com',
      },
      environments: [
        { typeId: 'cozinha', name: 'Cozinha Quitação', areaM2: 10, ceilingHeight: 2.6, wallCount: 2 }
      ]
    });
    expect(resSim8.success).toBe(true);

    const { data: asgn8 } = await clientAdmin
      .from('lead_assignments')
      .select('id')
      .eq('lead_id', resSim8.leadId)
      .single();

    expect(asgn8).toBeDefined();

    // Vincular entrega à fatura no status "invoiced"
    const { data: delivery, error: errDelv8 } = await clientAdmin
      .from('lead_deliveries')
      .update({
        tenant_id: tenantSuzanoId,
        invoice_id: invoiceId,
        delivery_status: 'invoiced',
        is_billable: true,
      })
      .eq('assignment_id', asgn8.id)
      .select('id')
      .single();

    expect(errDelv8).toBeNull();
    expect(delivery).toBeDefined();

    // 1. Pagamento parcial (ex: R$ 50 de um total de R$ 119,90)
    await clientAdmin.rpc('admin_register_manual_payment', {
      p_invoice_id: invoiceId,
      p_amount_paid: 50.00,
      p_payment_date: new Date().toISOString(),
      p_payment_method: 'pix',
      p_notes: 'Pagamento parcial de teste',
      p_external_reference: 'PIX-PARTIAL',
      p_idempotency_key: `IDEM-PART-${Date.now()}`,
    });

    // Verificar se a entrega de lead ainda permanece como "invoiced" (não quitada)
    const { data: partDelv } = await clientAdmin
      .from('lead_deliveries')
      .select('delivery_status')
      .eq('id', delivery.id)
      .single();

    expect(partDelv.delivery_status).toBe('invoiced');

    // 2. Pagamento do saldo restante para quitação integral
    const remainingBalance = Number(invRes.total_due) - 50.00;
    await clientAdmin.rpc('admin_register_manual_payment', {
      p_invoice_id: invoiceId,
      p_amount_paid: remainingBalance,
      p_payment_date: new Date().toISOString(),
      p_payment_method: 'pix',
      p_notes: 'Quitação do saldo restante',
      p_external_reference: 'PIX-FINAL',
      p_idempotency_key: `IDEM-FULL-${Date.now()}`,
    });

    // Verificar se a entrega de lead agora transitou para "paid"
    const { data: paidDelv } = await clientAdmin
      .from('lead_deliveries')
      .select('delivery_status')
      .eq('id', delivery.id)
      .single();

    expect(paidDelv.delivery_status).toBe('paid');

    // Limpeza
    await clientAdmin.from('lead_deliveries').delete().eq('id', delivery.id);
    await clientAdmin.from('lead_assignments').delete().eq('id', asgn8.id);
    await clientAdmin.from('invoices').delete().eq('id', invoiceId);
  });
});
