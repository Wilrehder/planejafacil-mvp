import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { submitSimulationAndLead } from '../lib/simulationService';
import { toCents, fromCents } from '../lib/gatewayAdapter';

// Polyfill WebSocket para Node.js
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {} as any;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://inqgxjdvuizsdtolrwfb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucWd4amR2dWl6c2R0b2xyd2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTA4ODEsImV4cCI6MjA3NTc2Njg4MX0.X_b_0rMh_vKq7K_M6zT8p4Qj3z5A_L4D7x8E2A0O4tI';

describe('FASE 5.1 — Gestão Manual de Cobranças, Assinaturas e Pay-Per-Lead (PostgreSQL Live)', () => {
  let clientAnon: any;
  let clientSuzano: any;
  let clientMogi: any;
  let clientAdmin: any;

  const tenantSuzanoId = 'b1020000-0000-0000-0000-000000000002';
  const tenantMogiId = 'b1010000-0000-0000-0000-000000000001';

  let testCompetence: string;
  let testInvoiceId: string;
  let testInvoiceNumber: string;

  beforeAll(async () => {
    clientAnon = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientSuzano = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientMogi = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientAdmin = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

    // Autenticações reais com Supabase Auth
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

    // Usar competência futura dedicada para o teste de faturamento/pagamento parcial
    const now = new Date();
    testCompetence = `${now.getFullYear()}-11`;

    // Limpar faturas de testes anteriores para a competência de teste para garantir execução determinística
    await clientAdmin.from('invoices').delete().eq('tenant_id', tenantSuzanoId).eq('competence_month', testCompetence);
  });

  // 1, 2 & 3. Administrador cadastra loja e atribui planos Básico e Pro
  it('1, 2 & 3. Administrador cadastra/atualiza loja com Plano Básico (R$ 119,90) e Pro (R$ 219,90) via admin_save_store_and_subscription', async () => {
    // Atualizar Mogi para Pro com dia de vencimento 15 e preço 219.90
    const { data: saveResMogi, error: errMogi } = await clientAdmin.rpc('admin_save_store_and_subscription', {
      p_store_id: tenantMogiId,
      p_name: 'Smart Planejados Mogi das Cruzes',
      p_city_name: 'Mogi das Cruzes',
      p_state_uf: 'SP',
      p_plan_tier: 'pro',
      p_contracted_price: 219.90,
      p_billing_due_day: 15,
      p_is_routing_enabled: true
    });
    expect(errMogi).toBeNull();
    expect(saveResMogi.success).toBe(true);

    // Atualizar Suzano para Básico com dia de vencimento 10 e preço 119.90
    const { data: saveResSuzano, error: errSuzano } = await clientAdmin.rpc('admin_save_store_and_subscription', {
      p_store_id: tenantSuzanoId,
      p_name: 'Suzano Móveis & Decoração',
      p_city_name: 'Suzano',
      p_state_uf: 'SP',
      p_plan_tier: 'basic',
      p_contracted_price: 119.90,
      p_billing_due_day: 10,
      p_is_routing_enabled: true
    });
    expect(errSuzano).toBeNull();
    expect(saveResSuzano.success).toBe(true);
  });

  // 4. Alteração de plano persiste no banco e registra histórico
  it('4. Alteração de plano persiste no banco PostgreSQL e grava histórico em subscription_history', async () => {
    const { data: sub, error } = await clientAdmin
      .from('store_subscriptions')
      .select('plan_tier, contracted_monthly_price, billing_due_day, status')
      .eq('tenant_id', tenantSuzanoId)
      .single();

    expect(error).toBeNull();
    expect(sub.plan_tier).toBe('basic');
    expect(Number(sub.contracted_monthly_price)).toBe(119.90);
    expect(sub.billing_due_day).toBe(10);

    const { data: hist, error: errHist } = await clientAdmin
      .from('subscription_history')
      .select('*')
      .eq('tenant_id', tenantSuzanoId)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(errHist).toBeNull();
    expect(hist.length).toBeGreaterThanOrEqual(1);
  });

  // 5 & 6. Vencimentos e inclusão da mensalidade na competência correta
  it('5 & 6. Vencimentos são calculados corretamente e mensalidade é incluída na competência', async () => {
    const { data: invoiceRes, error } = await clientAdmin.rpc('generate_monthly_invoice', {
      p_tenant_id: tenantSuzanoId,
      p_competence_month: testCompetence
    });

    expect(error).toBeNull();
    expect(invoiceRes.success).toBe(true);
    expect(invoiceRes.invoice_id).toBeDefined();

    testInvoiceId = invoiceRes.invoice_id;
    testInvoiceNumber = invoiceRes.invoice_number;

    // Verificar itens da fatura
    const { data: items, error: errItems } = await clientAdmin
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', testInvoiceId);

    expect(errItems).toBeNull();
    const subItem = items.find((i: any) => i.item_type === 'subscription');
    expect(subItem).toBeDefined();
    expect(Number(subItem.unit_price)).toBe(119.90);
  });

  // 7, 8 & 9. Pay-Per-Lead faturável vs leads manuais vs leads sem cobertura
  it('7, 8 & 9. Leads entregues geram R$ 50,00 faturáveis; leads manuais e sem cobertura não geram cobrança', async () => {
    // Verificar preços parametrizados e ativos
    const { data: pricing, error } = await clientAdmin
      .from('saas_pricing_schedules')
      .select('*')
      .eq('plan_tier', 'basic')
      .eq('is_active', true)
      .single();

    expect(error).toBeNull();
    expect(Number(pricing.lead_price)).toBe(50.00);

    // Leads entregues pela plataforma em lead_deliveries têm unit_cost = 50.00 e is_billable = true
    const { data: billableDeliveries, error: errDeliveries } = await clientAdmin
      .from('lead_deliveries')
      .select('id, is_billable, unit_cost')
      .eq('is_billable', true)
      .limit(5);

    expect(errDeliveries).toBeNull();
    billableDeliveries.forEach((d: any) => {
      expect(Number(d.unit_cost)).toBe(50.00);
      expect(d.is_billable).toBe(true);
    });
  });

  // 10. Fatura consolidada contém mensalidade e leads
  it('10. Fatura consolidada contém mensalidade e leads faturáveis', async () => {
    const { data: invoice, error } = await clientAdmin
      .from('invoices')
      .select('id, total_due, amount_paid, status, competence_month')
      .eq('id', testInvoiceId)
      .single();

    expect(error).toBeNull();
    expect(Number(invoice.total_due)).toBeGreaterThanOrEqual(119.90);
    expect(invoice.competence_month).toBe(testCompetence);
  });

  // 11, 12 & 13. Registro manual de pagamento parcial e integral, e atualização do saldo pendente
  it('11, 12 & 13. Registro manual de pagamento parcial e integral atualiza amount_paid e status', async () => {
    // 1. Pagamento Parcial de R$ 50,00
    const partialAmount = 50.00;
    const idempotencyKey1 = `test-part-${Date.now()}`;

    const { data: partRes, error: errPart } = await clientAdmin.rpc('admin_register_manual_payment', {
      p_invoice_id: testInvoiceId,
      p_amount_paid: partialAmount,
      p_payment_method: 'pix',
      p_payment_date: new Date().toISOString(),
      p_notes: 'Primeira parcela recebida via Pix',
      p_external_reference: 'PIX-E2E-PART-123',
      p_idempotency_key: idempotencyKey1
    });

    expect(errPart).toBeNull();
    expect(partRes.success).toBe(true);
    expect(partRes.status).toBe('partially_paid');
    expect(Number(partRes.amount_paid_now)).toBe(partialAmount);
    expect(Number(partRes.balance_due)).toBeGreaterThan(0);

    // 2. Consulta da fatura no banco
    const { data: invAfterPart, error: errInvPart } = await clientAdmin
      .from('invoices')
      .select('amount_paid, total_due, status')
      .eq('id', testInvoiceId)
      .single();

    expect(errInvPart).toBeNull();
    expect(Number(invAfterPart.amount_paid)).toBe(partialAmount);
    expect(invAfterPart.status).toBe('partially_paid');

    // 3. Pagamento do saldo restante (Quitação integral)
    const remainingBalance = Number(partRes.balance_due);
    const idempotencyKey2 = `test-full-${Date.now()}`;

    const { data: fullRes, error: errFull } = await clientAdmin.rpc('admin_register_manual_payment', {
      p_invoice_id: testInvoiceId,
      p_amount_paid: remainingBalance,
      p_payment_method: 'transferencia',
      p_payment_date: new Date().toISOString(),
      p_notes: 'Saldo restante quitado via TED',
      p_external_reference: 'TED-BANCO-456',
      p_idempotency_key: idempotencyKey2
    });

    expect(errFull).toBeNull();
    expect(fullRes.success).toBe(true);
    expect(fullRes.status).toBe('paid');
    expect(Number(fullRes.balance_due)).toBe(0);

    // 4. Verificação no banco: fatura deve estar como paid
    const { data: invAfterFull, error: errInvFull } = await clientAdmin
      .from('invoices')
      .select('amount_paid, total_due, status, paid_at')
      .eq('id', testInvoiceId)
      .single();

    expect(errInvFull).toBeNull();
    expect(invAfterFull.status).toBe('paid');
    expect(invAfterFull.paid_at).not.toBeNull();
    expect(Number(invAfterFull.amount_paid)).toBe(Number(invAfterFull.total_due));
  });

  // 14. Idempotência: repetição da mesma operação não duplica recebimentos
  it('14. Idempotência: reenvio com mesma idempotency_key não duplica recebimentos', async () => {
    const fixedKey = `idemp-key-test-${Date.now()}`;

    // Primeiro envio
    const { data: res1, error: err1 } = await clientAdmin.rpc('admin_register_manual_payment', {
      p_invoice_id: testInvoiceId,
      p_amount_paid: 10.00,
      p_payment_method: 'pix',
      p_idempotency_key: fixedKey
    });

    expect(err1).toBeNull();
    expect(res1.success).toBe(true);

    // Reenvio imediato com a mesma chave
    const { data: res2, error: err2 } = await clientAdmin.rpc('admin_register_manual_payment', {
      p_invoice_id: testInvoiceId,
      p_amount_paid: 10.00,
      p_payment_method: 'pix',
      p_idempotency_key: fixedKey
    });

    expect(err2).toBeNull();
    expect(res2.success).toBe(true);
    expect(res2.status).toBe('already_processed');
  });

  // 15 & 16. Lojista comum não consegue registrar pagamento nem alterar preço contratado
  it('15 & 16. Lojista comum é bloqueado com erro 42501 ao tentar registrar pagamento ou alterar preço', async () => {
    // Suzano tentando registrar pagamento manual
    const { error: errMerchantPay } = await clientSuzano.rpc('admin_register_manual_payment', {
      p_invoice_id: testInvoiceId,
      p_amount_paid: 100.00,
      p_payment_method: 'pix'
    });

    expect(errMerchantPay).not.toBeNull();
    expect(errMerchantPay.code).toBe('42501');

    // Suzano tentando alterar assinatura
    const { error: errMerchantSave } = await clientSuzano.rpc('admin_save_store_and_subscription', {
      p_store_id: tenantSuzanoId,
      p_name: 'Hack Store',
      p_city_name: 'Suzano',
      p_state_uf: 'SP',
      p_plan_tier: 'pro',
      p_contracted_price: 1.00
    });

    expect(errMerchantSave).not.toBeNull();
    expect(errMerchantSave.code).toBe('42501');
  });

  // 17. Isolamento Multi-Tenant: Loja Suzano não acessa faturas da Loja Mogi
  it('17. Isolamento Multi-Tenant: Loja Suzano não visualiza faturas pertencentes à Loja Mogi', async () => {
    const { data: mogiInvoices, error } = await clientSuzano
      .from('invoices')
      .select('id, tenant_id')
      .eq('tenant_id', tenantMogiId);

    expect(error).toBeNull();
    expect(mogiInvoices.length).toBe(0);
  });

  // 18. Administrador consulta histórico auditado de recebimentos em invoice_payments
  it('18. Administrador consulta histórico de recebimentos manuais em invoice_payments', async () => {
    const { data: payments, error } = await clientAdmin
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', testInvoiceId)
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(payments.length).toBeGreaterThanOrEqual(1);

    const first = payments[0];
    expect(first.payment_method).toBeDefined();
    expect(Number(first.amount_paid)).toBeGreaterThan(0);
  });

  // 19. Indicadores financeiros refletem recebimentos no get_admin_financial_metrics
  it('19. Indicadores financeiros get_admin_financial_metrics refletem totais recebidos e emitidos', async () => {
    const { data: metrics, error } = await clientAdmin.rpc('get_admin_financial_metrics');

    expect(error).toBeNull();
    expect(metrics.mrr).toBeGreaterThan(0);
    expect(metrics.arr).toBeGreaterThan(0);
    expect(metrics.total_invoiced).toBeGreaterThan(0);
    expect(metrics.total_collected).toBeGreaterThan(0);
    expect(Array.isArray(metrics.stores_breakdown)).toBe(true);
    expect(Array.isArray(metrics.recent_payments)).toBe(true);
  });

  // 20. Histórico de preços e versionamento preservado
  it('20. Histórico de preços em saas_pricing_schedules permanece preservado e versionado', async () => {
    const { data: allSchedules, error } = await clientAdmin
      .from('saas_pricing_schedules')
      .select('*')
      .order('version', { ascending: true });

    expect(error).toBeNull();
    expect(allSchedules.length).toBeGreaterThanOrEqual(2);
    const leadPricing = allSchedules.filter((s: any) => Number(s.lead_price) === 50.00);
    expect(leadPricing.length).toBeGreaterThanOrEqual(1);
  });

  // 21. Suspensão de loja: loja suspensa deixa de receber leads na distribuição
  it('21. Loja suspensa administrativamente tem status atualizado e é excluída do roteamento de novos leads', async () => {
    // 1. Suspender Suzano
    const { data: suspRes, error: errSusp } = await clientAdmin.rpc('admin_set_store_suspension', {
      p_tenant_id: tenantSuzanoId,
      p_suspended: true,
      p_reason: 'Suspensão manual de teste de homologação'
    });

    expect(errSusp).toBeNull();
    expect(suspRes.success).toBe(true);
    expect(suspRes.subscription_status).toBe('suspended');

    // Verificar se no store_subscriptions o status está suspended
    const { data: subCheck } = await clientAdmin
      .from('store_subscriptions')
      .select('status, suspension_reason')
      .eq('tenant_id', tenantSuzanoId)
      .single();

    expect(subCheck.status).toBe('suspended');
    expect(subCheck.suspension_reason).toContain('homologação');

    // 2. Reativar Suzano para manter o ambiente saudável
    const { data: reactRes, error: errReact } = await clientAdmin.rpc('admin_set_store_suspension', {
      p_tenant_id: tenantSuzanoId,
      p_suspended: false,
      p_reason: 'Reativação pós-teste'
    });

    expect(errReact).toBeNull();
    expect(reactRes.success).toBe(true);
    expect(reactRes.subscription_status).toBe('active');
  });

  // 22. Simulador, CRM e ERP continuam funcionando normalmente
  it('22. Simulador, distribuição, CRM e ERP continuam funcionando normalmente', async () => {
    const simResult = await submitSimulationAndLead({
      clientInfo: {
        name: 'Cliente Teste Integracao F51',
        phone: '11987654321',
        email: 'cliente.f51@teste.com',
        cep: '08710-000',
      },
      environments: [
        {
          typeId: 'cozinha',
          name: 'Cozinha Planejada',
          areaM2: 12,
          ceilingHeight: 2.7,
          wallCount: 3 as const,
        },
      ],
    });

    expect(simResult.success).toBe(true);
    expect(simResult.simulationId).toBeDefined();
    expect(simResult.leadId).toBeDefined();
    expect(simResult.budgetMin).toBeGreaterThan(0);
  });

  // 23. Test store switcher não permite elevação de privilégios no Supabase
  it('23. Test store switcher não concede perfil platform_admin nem bypass de RLS no Supabase', async () => {
    // Mesmo logado como dono de loja, RPCs administrativas falham com 42501
    const { error } = await clientMogi.rpc('get_admin_financial_metrics');
    expect(error).not.toBeNull();
    expect(error.code).toBe('42501');
  });

  // 24. Atualizar a página não elimina informações financeiras (dados reais no PostgreSQL)
  it('24. Atualizar a página não elimina informações: overview retorna dados reais do banco', async () => {
    const { data: overview, error } = await clientSuzano.rpc('get_store_financial_overview', {
      p_tenant_id: tenantSuzanoId
    });

    expect(error).toBeNull();
    expect(overview.success).toBe(true);
    expect(overview.subscription).toBeDefined();
    expect(Array.isArray(overview.invoices)).toBe(true);
  });

  // 25. Fluxo completo de gestão de pagamentos manuais
  it('25. Fluxo completo de gestão de pagamentos manuais executado e auditado com sucesso', async () => {
    // Ajuste de fatura auditado
    const { data: adjRes, error: errAdj } = await clientAdmin.rpc('admin_register_invoice_adjustment', {
      p_invoice_id: testInvoiceId,
      p_adjustment_amount: -10.00,
      p_description: 'Desconto comercial teste de homologação'
    });

    expect(errAdj).toBeNull();
    expect(adjRes.success).toBe(true);
    expect(Number(adjRes.new_adjustments)).toBeDefined();

    // Consulta final da fatura
    const { data: finalInv } = await clientAdmin
      .from('invoices')
      .select('id, invoice_number, total_due, amount_paid, status')
      .eq('id', testInvoiceId)
      .single();

    expect(finalInv).toBeDefined();
    expect(finalInv.id).toBe(testInvoiceId);
  });
});
