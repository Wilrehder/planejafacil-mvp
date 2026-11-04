import { supabase } from './supabase';
import { 
  AdminFinancialMetrics, 
  StoreFinancialOverview, 
  Invoice,
  AdminBillingHubData,
  StoreBillingCycle,
  PlanModulesConfig
} from '../types';

/**
 * Consulta o Hub de Cobranças por Competência e Ciclo de cada loja parceira
 */
export async function fetchAdminBillingHub(competenceMonth?: string): Promise<{
  success: boolean;
  data?: AdminBillingHubData;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_admin_billing_hub', {
      p_competence_month: competenceMonth || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Erro ao carregar faturamento do mês.' };
    }

    const rawSummary = data.summary || {};
    const rawStores = data.stores || [];

    const mappedStores: StoreBillingCycle[] = rawStores.map((s: any) => ({
      storeId: s.store_id,
      storeName: s.store_name,
      cityName: s.city_name,
      stateUf: s.state_uf,
      planTier: s.plan_tier || 'pro',
      responsibleName: s.responsible_name || 'Responsável',
      phone: s.phone || '',
      whatsapp: s.whatsapp || s.phone || '',
      storeEmail: s.store_email || '',
      storeStatus: s.store_status || 'Ativa',
      billingDueDay: Number(s.billing_due_day) || 10,
      monthlyFee: Number(s.monthly_fee) || 219.90,
      dueDate: s.due_date,
      cutoffDate: s.cutoff_date,
      invoiceId: s.invoice_id || null,
      invoiceNumber: s.invoice_number || null,
      amountPaid: Number(s.amount_paid) || 0,
      paidAt: s.paid_at || null,
      paymentMethod: s.payment_method || null,
      leadsCount: Number(s.leads_count) || 0,
      leadsAmount: Number(s.leads_amount) || 0,
      leadsList: (s.leads_list || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        city: l.city,
        environment: l.environment,
        deliveredAt: l.deliveredAt,
        cost: Number(l.cost) || 50,
      })),
      totalDue: Number(s.total_due) || 0,
      balanceDue: Number(s.balance_due) || 0,
      cycleStatus: s.cycle_status || 'open',
      lastPayment: s.last_payment ? {
        amount: Number(s.last_payment.amount) || 0,
        date: s.last_payment.date,
        reference: s.last_payment.reference,
        method: s.last_payment.method,
      } : undefined,
    }));

    return {
      success: true,
      data: {
        competenceMonth: data.competence_month,
        summary: {
          totalProjected: Number(rawSummary.total_projected) || 0,
          totalCollected: Number(rawSummary.total_collected) || 0,
          totalPending: Number(rawSummary.total_pending) || 0,
          totalOverdue: Number(rawSummary.total_overdue) || 0,
          activeStores: Number(rawSummary.active_stores) || 0,
          openCount: Number(rawSummary.open_count) || 0,
          closedCount: Number(rawSummary.closed_count) || 0,
          paidCount: Number(rawSummary.paid_count) || 0,
          overdueCount: Number(rawSummary.overdue_count) || 0,
        },
        stores: mappedStores,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao consultar faturamento do mês.' };
  }
}

/**
 * Liquidação Rápida via Pix/Transferência para a Loja Parceira no mês especificado
 */
export async function adminQuickPayStore(params: {
  storeId: string;
  competenceMonth: string;
  amount: number;
  method?: string;
  reference?: string;
  notes?: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('admin_quick_pay_store', {
      p_tenant_id: params.storeId,
      p_competence_month: params.competenceMonth,
      p_amount: params.amount,
      p_method: params.method || 'pix',
      p_reference: params.reference || null,
      p_notes: params.notes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      message: data?.message || 'Pagamento registrado com sucesso!',
      error: data?.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao registrar pagamento.' };
  }
}

/**
 * Consulta de Indicadores Financeiros do Administrador (MRR, ARR, Inadimplência, Lojas)
 */
export async function fetchAdminFinancialMetrics(): Promise<{
  success: boolean;
  metrics?: AdminFinancialMetrics;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_admin_financial_metrics');
    if (error) {
      return { success: false, error: error.message };
    }
    if (!data?.success) {
      return { success: false, error: data?.error || 'Erro ao carregar métricas financeiras.' };
    }

    return {
      success: true,
      metrics: {
        mrr: Number(data.mrr || 0),
        arr: Number(data.arr || 0),
        variableRevenue: Number(data.variable_revenue || 0),
        totalInvoiced: Number(data.total_invoiced || 0),
        totalCollected: Number(data.total_collected || 0),
        totalReceivables: Number(data.total_receivables || 0),
        overdueAmount: Number(data.overdue_amount || 0),
        overdueCount: Number(data.overdue_count || 0),
        activeStoresCount: Number(data.active_stores_count || 0),
        suspendedStoresCount: Number(data.suspended_stores_count || 0),
        nearDueCount: Number(data.near_due_count || 0),
        plansBreakdown: data.plans_breakdown || { basic: 0, pro: 0 },
        storesBreakdown: data.stores_breakdown || [],
        competenceHistory: data.competence_history || [],
        recentPayments: data.recent_payments || [],
        invoicesList: data.invoices_list || [],
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha de comunicação com o servidor financeiro.' };
  }
}

/**
 * Registra manualmente no PostgreSQL um pagamento recebido externamente pelo administrador
 */
export async function registerManualPayment(params: {
  invoiceId: string;
  amountPaid: number;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  externalReference?: string;
  idempotencyKey?: string;
}): Promise<{
  success: boolean;
  status?: string;
  paymentId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amountPaidNow?: number;
  totalAmountPaid?: number;
  totalDue?: number;
  balanceDue?: number;
  paidAt?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('admin_register_manual_payment', {
      p_invoice_id: params.invoiceId,
      p_amount_paid: params.amountPaid,
      p_payment_date: params.paymentDate || new Date().toISOString(),
      p_payment_method: params.paymentMethod || 'pix',
      p_notes: params.notes || null,
      p_external_reference: params.externalReference || null,
      p_idempotency_key: params.idempotencyKey || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      status: data?.status,
      paymentId: data?.payment_id,
      invoiceId: data?.invoice_id,
      invoiceNumber: data?.invoice_number,
      amountPaidNow: data?.amount_paid_now,
      totalAmountPaid: data?.total_amount_paid,
      totalDue: data?.total_due,
      balanceDue: data?.balance_due,
      paidAt: data?.paid_at,
      error: data?.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao registrar pagamento manual.' };
  }
}

/**
 * Lança ajuste / desconto / crédito administrativo na fatura
 */
export async function registerInvoiceAdjustment(params: {
  invoiceId: string;
  adjustmentAmount: number;
  description: string;
}): Promise<{
  success: boolean;
  newTotalDue?: number;
  newAdjustments?: number;
  balanceDue?: number;
  status?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('admin_register_invoice_adjustment', {
      p_invoice_id: params.invoiceId,
      p_adjustment_amount: params.adjustmentAmount,
      p_description: params.description,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      newTotalDue: data?.new_total_due,
      newAdjustments: data?.new_adjustments,
      balanceDue: data?.balance_due,
      status: data?.status,
      error: data?.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao lançar ajuste na fatura.' };
  }
}

/**
 * Suspende ou reativa uma loja parceira no SaaS
 */
export async function setStoreSuspension(
  tenantId: string,
  suspended: boolean,
  reason?: string
): Promise<{
  success: boolean;
  tenantId?: string;
  isSuspended?: boolean;
  subscriptionStatus?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('admin_set_store_suspension', {
      p_tenant_id: tenantId,
      p_suspended: suspended,
      p_reason: reason || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      tenantId: data?.tenant_id,
      isSuspended: data?.is_suspended,
      subscriptionStatus: data?.subscription_status,
      error: data?.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao atualizar situação da loja.' };
  }
}

/**
 * Cadastra ou edita loja parceira no PostgreSQL com plano, vencimento e assinatura
 */
export async function saveStoreAndSubscription(params: {
  storeId?: string;
  name: string;
  cnpj?: string;
  responsibleName?: string;
  cityIbgeCode?: string;
  cityName?: string;
  stateUf?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  planTier?: 'basic' | 'pro';
  contractedPrice?: number;
  billingDueDay?: number;
  isRoutingEnabled?: boolean;
  coveredCities?: string[];
}): Promise<{
  success: boolean;
  storeId?: string;
  name?: string;
  planTier?: string;
  contractedPrice?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('admin_save_store_and_subscription', {
      p_store_id: params.storeId || null,
      p_name: params.name,
      p_cnpj: params.cnpj || null,
      p_responsible_name: params.responsibleName || null,
      p_city_ibge_code: params.cityIbgeCode || null,
      p_city_name: params.cityName || null,
      p_state_uf: params.stateUf || 'SP',
      p_phone: params.phone || null,
      p_whatsapp: params.whatsapp || null,
      p_email: params.email || null,
      p_plan_tier: params.planTier || 'pro',
      p_contracted_price: params.contractedPrice || null,
      p_billing_due_day: params.billingDueDay || 10,
      p_is_routing_enabled: params.isRoutingEnabled ?? true,
      p_covered_cities: params.coveredCities || [],
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      storeId: data?.store_id,
      name: data?.name,
      planTier: data?.plan_tier,
      contractedPrice: data?.contracted_price,
      error: data?.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar loja e assinatura.' };
  }
}

/**
 * Consulta do Portal Financeiro da Loja (Assinatura, Faturas, Leads Faturáveis)
 * Protegido com isolamento estrito por tenant.
 */
export async function fetchStoreFinancialOverview(tenantId?: string): Promise<{
  success: boolean;
  overview?: StoreFinancialOverview;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_store_financial_overview', {
      p_tenant_id: tenantId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    if (!data?.success) {
      return { success: false, error: data?.error || 'Erro ao carregar dados financeiros da loja.' };
    }

    return {
      success: true,
      overview: {
        tenantId: data.tenant_id,
        subscription: data.subscription,
        billableLeads: data.billable_leads,
        totals: data.totals,
        invoices: data.invoices || [],
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao buscar faturas da loja.' };
  }
}

/**
 * Gera fatura mensal consolidada de forma idempotente para uma loja
 */
export async function generateStoreMonthlyInvoice(
  tenantId: string,
  competenceMonth: string
): Promise<{
  success: boolean;
  status?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  totalDue?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('generate_monthly_invoice', {
      p_tenant_id: tenantId,
      p_competence_month: competenceMonth,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      status: data?.status,
      invoiceId: data?.invoice_id,
      invoiceNumber: data?.invoice_number,
      totalDue: data?.total_due,
      error: data?.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao gerar fatura.' };
  }
}

/**
 * Altera o plano da assinatura de uma loja com registro de auditoria
 */
export async function changeStoreSubscriptionPlan(
  tenantId: string,
  newPlan: 'basic' | 'pro',
  customPrice?: number
): Promise<{
  success: boolean;
  newPlan?: string;
  monthlyPrice?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('change_store_plan', {
      p_tenant_id: tenantId,
      p_new_plan: newPlan,
      p_custom_price: customPrice || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      newPlan: data?.new_plan,
      monthlyPrice: data?.monthly_price,
      error: data?.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao alterar plano.' };
  }
}

/**
 * Simula a liquidação/pagamento de uma fatura em ambiente de testes
 */
export async function simulateInvoicePayment(
  invoiceId: string,
  paymentMethod: string = 'pix'
): Promise<{
  success: boolean;
  status?: string;
  invoiceNumber?: string;
  paidAt?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('process_simulated_payment', {
      p_invoice_id: invoiceId,
      p_payment_method: paymentMethod,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      status: data?.status,
      invoiceNumber: data?.invoice_number,
      paidAt: data?.paid_at,
      error: data?.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao processar pagamento.' };
  }
}

/**
 * Processa evento de webhook de pagamento com verificação de idempotência
 */
export async function processIncomingWebhook(
  provider: string,
  eventId: string,
  eventType: string,
  payload: any
): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('process_webhook_event', {
      p_provider: provider,
      p_event_id: eventId,
      p_event_type: eventType,
      p_payload: payload,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      status: data?.status,
      error: data?.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao processar webhook.' };
  }
}

/**
 * Permite ao Administrador configurar dinamicamente a exigência de documentos no ERP
 */
export async function toggleERPStageRule(
  stage: string,
  documentRequired: boolean
): Promise<{
  success: boolean;
  stage?: string;
  documentRequired?: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('admin_toggle_erp_stage_rule', {
      p_stage: stage,
      p_document_required: documentRequired,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      stage: data?.stage,
      documentRequired: data?.document_required,
      error: data?.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao configurar regra de documentos do ERP.' };
  }
}

/**
 * Reprocessa uma fatura aberta para incluir novos leads faturáveis da competência
 */
export async function reprocessMonthlyInvoice(invoiceId: string): Promise<{
  success: boolean;
  status?: string;
  additionalLeads?: number;
  additionalAmount?: number;
  totalLeadsCount?: number;
  totalDue?: number;
  message?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('reprocess_monthly_invoice', {
      p_invoice_id: invoiceId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      status: data?.status,
      additionalLeads: data?.additional_leads,
      additionalAmount: data?.additional_amount,
      totalLeadsCount: data?.total_leads_count,
      totalDue: data?.total_due,
      message: data?.message,
      error: data?.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao reprocessar fatura.' };
  }
}

/**
 * Reatribui administrativamente um lead de uma loja para outra, cancelando a cobranca anterior
 */
export async function adminReassignLead(
  leadId: string,
  newTenantId: string,
  reason: string
): Promise<{
  success: boolean;
  leadId?: string;
  oldTenantId?: string;
  newTenantId?: string;
  newAssignmentId?: string;
  newStoreName?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('admin_reassign_lead', {
      p_lead_id: leadId,
      p_new_tenant_id: newTenantId,
      p_reason: reason,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      leadId: data?.lead_id,
      oldTenantId: data?.old_tenant_id,
      newTenantId: data?.new_tenant_id,
      newAssignmentId: data?.new_assignment_id,
      newStoreName: data?.new_store_name,
      error: data?.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao reatribuir lead.' };
  }
}

/**
 * Consulta a configuração vigente dos Planos SaaS (Basic e Pro) e seus módulos
 */
export async function fetchSaaSPlansConfig() {
  try {
    const { data, error } = await supabase.rpc('get_saas_plans_config');
    if (error) {
      return { success: false, error: error.message };
    }
    return {
      success: true,
      plans: data?.plans || [],
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao consultar planos SaaS.' };
  }
}

/**
 * Atualiza os valores e módulos dos Planos SaaS com versionamento temporal
 */
export async function saveSaaSPlansConfig(params: {
  basicPrice: number;
  proPrice: number;
  leadPrice: number;
  basicModules: PlanModulesConfig | Record<string, boolean>;
  proModules: PlanModulesConfig | Record<string, boolean>;
}) {
  try {
    const { data, error } = await supabase.rpc('admin_update_saas_plans', {
      p_basic_price: params.basicPrice,
      p_pro_price: params.proPrice,
      p_lead_price: params.leadPrice,
      p_basic_modules: params.basicModules,
      p_pro_modules: params.proModules,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      version: data?.version,
      message: data?.message || 'Planos atualizados com sucesso!',
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar configuração de planos.' };
  }
}


