/**
 * PLANEJAFÁCIL — GATEWAY DE PAGAMENTOS (ARQUITETURA AGNÓSTICA & ISOLADA)
 * 
 * NOTA DE ARQUITETURA DA FASE 5.1:
 * O PlanejaFácil NÃO atua como intermediador de pagamentos nem processa checkouts bancários.
 * Os pagamentos de mensalidades e leads são recebidos externamente pelo proprietário do SaaS
 * (via Pix ou transferência bancária direta) e registrados manualmente pela administração.
 * As interfaces abaixo permanecem isoladas e desativadas no fluxo operacional de produção.
 */

export interface CustomerParams {
  tenantId: string;
  name: string;
  cnpjOrCpf: string;
  email: string;
  phone: string;
  address?: string;
}

export interface GatewayCustomer {
  customerId: string;
  provider: 'sandbox' | 'asaas' | 'stripe';
  createdAt: string;
}

export interface SubscriptionCreateParams {
  customerId: string;
  planTier: 'basic' | 'pro';
  amount: number; // Em Reais
  nextBillingDate: string;
}

export interface GatewaySubscriptionResult {
  subscriptionId: string;
  provider: 'sandbox' | 'asaas' | 'stripe';
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  amountCents: number;
}

export interface ChargeCreateParams {
  customerId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number; // Em Reais
  dueDate: string;
  description: string;
  paymentMethod: 'pix' | 'boleto' | 'credit_card';
}

export interface GatewayChargeResult {
  chargeId: string;
  provider: 'sandbox' | 'asaas' | 'stripe';
  amountCents: number;
  status: 'pending' | 'paid' | 'overdue';
  pixQrCode?: string;
  pixCopyPaste?: string;
  bankSlipBarcode?: string;
  bankSlipUrl?: string;
}

export interface NormalizedWebhookEvent {
  provider: 'sandbox' | 'asaas' | 'stripe';
  eventId: string;
  eventType: 'PAYMENT_CONFIRMED' | 'PAYMENT_OVERDUE' | 'SUBSCRIPTION_CANCELED' | 'UNKNOWN';
  invoiceNumber?: string;
  chargeId?: string;
  amountPaidCents?: number;
  rawPayload: any;
}

/**
 * Interface Obrigatória para qualquer Adapter de Gateway
 */
export interface PaymentGatewayAdapter {
  readonly providerName: 'sandbox' | 'asaas' | 'stripe';

  createCustomer(params: CustomerParams): Promise<GatewayCustomer>;
  createSubscription(params: SubscriptionCreateParams): Promise<GatewaySubscriptionResult>;
  createCharge(params: ChargeCreateParams): Promise<GatewayChargeResult>;
  verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean;
  normalizeWebhook(body: any): NormalizedWebhookEvent;
}

/**
 * Utilitário de Precisão Financeira
 * Converte valor monetário em Reais para Centavos inteiros para envio ao gateway
 */
export const toCents = (amountBrl: number): number => {
  return Math.round(Number(amountBrl) * 100);
};

export const fromCents = (cents: number): number => {
  return cents / 100;
};

/**
 * Provedor Padrão de Homologação (Sandbox Seguro)
 * Não efetua cobranças reais em cartões ou contas bancárias.
 */
export class SandboxPaymentGatewayAdapter implements PaymentGatewayAdapter {
  readonly providerName = 'sandbox' as const;

  async createCustomer(params: CustomerParams): Promise<GatewayCustomer> {
    return {
      customerId: `cus_sbx_${params.tenantId.substring(0, 8)}`,
      provider: 'sandbox',
      createdAt: new Date().toISOString(),
    };
  }

  async createSubscription(params: SubscriptionCreateParams): Promise<GatewaySubscriptionResult> {
    return {
      subscriptionId: `sub_sbx_${params.planTier}_${Date.now()}`,
      provider: 'sandbox',
      status: 'active',
      amountCents: toCents(params.amount),
    };
  }

  async createCharge(params: ChargeCreateParams): Promise<GatewayChargeResult> {
    const cents = toCents(params.amount);
    return {
      chargeId: `chg_sbx_${params.invoiceNumber}_${Date.now()}`,
      provider: 'sandbox',
      amountCents: cents,
      status: 'pending',
      pixQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=planejafacil-${params.invoiceNumber}`,
      pixCopyPaste: `00020126580014br.gov.bcb.pix0136planejafacil-${params.invoiceNumber}520400005303986540${(params.amount).toFixed(2)}5802BR5925PLANEJAFACIL TECNOLOGIA6009SAO PAULO62070503***6304ABCD`,
      bankSlipBarcode: '34191.79001 01043.510047 91020.150008 4 98760000011990',
      bankSlipUrl: `https://sandbox.planejafacil.com.br/boleto/${params.invoiceNumber}`,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
    // Em sandbox, verifica se há assinatura presente ou token válido
    if (!signature && !rawBody) return false;
    return signature === secret || signature.startsWith('sbx_signature_');
  }

  normalizeWebhook(body: any): NormalizedWebhookEvent {
    const type = body?.event || body?.type || 'UNKNOWN';
    let normalizedType: NormalizedWebhookEvent['eventType'] = 'UNKNOWN';

    if (type === 'PAYMENT_CONFIRMED' || type === 'payment_intent.succeeded' || type === 'invoice.paid') {
      normalizedType = 'PAYMENT_CONFIRMED';
    } else if (type === 'PAYMENT_OVERDUE' || type === 'invoice.payment_failed') {
      normalizedType = 'PAYMENT_OVERDUE';
    } else if (type === 'SUBSCRIPTION_CANCELED' || type === 'customer.subscription.deleted') {
      normalizedType = 'SUBSCRIPTION_CANCELED';
    }

    return {
      provider: 'sandbox',
      eventId: body?.id || `evt_sbx_${Date.now()}`,
      eventType: normalizedType,
      invoiceNumber: body?.invoice_number || body?.data?.object?.metadata?.invoice_number,
      chargeId: body?.charge_id || body?.data?.object?.id,
      amountPaidCents: body?.value ? toCents(body.value) : undefined,
      rawPayload: body,
    };
  }
}

/**
 * Estrutura Preparada para Integração Definitiva com ASAAS
 * Aguarda credenciais de produção/homologação e decisão do proprietário.
 */
export class AsaasPaymentGatewayAdapter implements PaymentGatewayAdapter {
  readonly providerName = 'asaas' as const;
  private apiKey: string;
  private environment: 'sandbox' | 'production';

  constructor(apiKey: string, environment: 'sandbox' | 'production' = 'sandbox') {
    this.apiKey = apiKey;
    this.environment = environment;
  }

  async createCustomer(params: CustomerParams): Promise<GatewayCustomer> {
    // Preparado para invocar POST /api/v3/customers do Asaas
    return {
      customerId: `cus_asaas_pending_${params.tenantId.substring(0, 8)}`,
      provider: 'asaas',
      createdAt: new Date().toISOString(),
    };
  }

  async createSubscription(params: SubscriptionCreateParams): Promise<GatewaySubscriptionResult> {
    // Preparado para invocar POST /api/v3/subscriptions do Asaas
    return {
      subscriptionId: `sub_asaas_pending_${Date.now()}`,
      provider: 'asaas',
      status: 'active',
      amountCents: toCents(params.amount),
    };
  }

  async createCharge(params: ChargeCreateParams): Promise<GatewayChargeResult> {
    // Preparado para invocar POST /api/v3/payments do Asaas com billingType = PIX/BOLETO
    return {
      chargeId: `pay_asaas_pending_${Date.now()}`,
      provider: 'asaas',
      amountCents: toCents(params.amount),
      status: 'pending',
      pixCopyPaste: `asaas-pix-copia-cola-placeholder`,
      bankSlipBarcode: 'asaas-codigo-barras-placeholder',
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
    return signature === secret;
  }

  normalizeWebhook(body: any): NormalizedWebhookEvent {
    let evtType: NormalizedWebhookEvent['eventType'] = 'UNKNOWN';
    if (body.event === 'PAYMENT_RECEIVED' || body.event === 'PAYMENT_CONFIRMED') {
      evtType = 'PAYMENT_CONFIRMED';
    } else if (body.event === 'PAYMENT_OVERDUE') {
      evtType = 'PAYMENT_OVERDUE';
    }

    return {
      provider: 'asaas',
      eventId: body.id || `evt_asaas_${Date.now()}`,
      eventType: evtType,
      invoiceNumber: body.payment?.externalReference,
      chargeId: body.payment?.id,
      amountPaidCents: body.payment?.value ? toCents(body.payment.value) : undefined,
      rawPayload: body,
    };
  }
}

/**
 * Instância Ativa do Gateway
 * Por padrão, opera em Sandbox Seguro sem requisições bancárias reais até aprovação do gateway.
 */
export const activePaymentGateway: PaymentGatewayAdapter = new SandboxPaymentGatewayAdapter();
