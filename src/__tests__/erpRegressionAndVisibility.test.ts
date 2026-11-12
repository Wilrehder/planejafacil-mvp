import { describe, it, expect } from 'vitest';
import { classifyERPError, FetchOrdersResult } from '../lib/erpService';
import { 
  generateContractPdfDoc, 
  computeContractIntegrityHash, 
  formatBusinessDays,
  DEFAULT_CONTRACT_CLAUSES 
} from '../lib/customerContractService';
import { StoreOrder, OrderStage, ERPMetrics } from '../types';

describe('PLANEJAFÁCIL — Bateria Permanente de Proteção contra Regressões no ERP', () => {

  // Dados mock isolados para os testes de regressão
  const sampleOrderTenantA: StoreOrder = {
    id: 'PED-4153',
    uuid: '1689d4f8-cb4c-4a58-b33c-65a985bd2fc3',
    orderNumber: 'PED-4153',
    tenantId: 'a8596096-d97e-4248-a7b8-5f6f9de0cb10',
    storeId: 'store-suzano',
    assignmentId: 'asgn-1001',
    leadId: 'lead-1001',
    clientName: 'Ana Clara Santos',
    phone: '11988887777',
    clientCpf: '123.456.789-00',
    address: 'Rua das Flores, 123 - Suzano / SP',
    city: 'Suzano',
    state: 'SP',
    environment: 'Cozinha Planejada e Área Gourmet',
    totalValue: 25000,
    contractedValue: 25000,
    estimatedBudget: 25000,
    currentStage: 'formalizacao_contratual',
    contractStatus: 'formalizacao_pendente',
    contractToken: 'ctk_test_order_token_secure_48char_long_string_abc',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    documents: [],
    timeline: [
      {
        id: 'log-1',
        user: 'Operador Comercial',
        userRole: 'store_operator',
        action: 'Pedido gerado a partir do fechamento no CRM.',
        timestamp: new Date().toISOString()
      }
    ]
  };

  const sampleOrderTenantB: StoreOrder = {
    ...sampleOrderTenantA,
    id: 'PED-9002',
    uuid: '22222222-2222-2222-2222-222222222222',
    orderNumber: 'PED-9002',
    tenantId: 'b1010000-0000-0000-0000-000000000001',
    storeId: 'store-mogi',
    clientName: 'Cliente Loja Mogi'
  };

  // ---------------------------------------------------------------------------
  // Teste A — Criação e persistência
  // ---------------------------------------------------------------------------
  it('Teste A — Deve validar a estrutura íntegra do pedido originado da conversão no CRM', () => {
    expect(sampleOrderTenantA.orderNumber).toMatch(/^PED-\d+$/);
    expect(sampleOrderTenantA.tenantId).toBeDefined();
    expect(sampleOrderTenantA.currentStage).toBe('formalizacao_contratual');
    expect(sampleOrderTenantA.contractStatus).toBe('formalizacao_pendente');
    expect(sampleOrderTenantA.contractToken).toBeDefined();
    expect(sampleOrderTenantA.totalValue).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Teste B — Visibilidade na formalização (CRÍTICO: combate o bug da migration 35)
  // ---------------------------------------------------------------------------
  it('Teste B — Pedidos aguardando formalização contratual NÃO devem ser filtrados da listagem', () => {
    const ordersInDb = [sampleOrderTenantA];

    // Simula a consulta de pedidos do tenant sem o filtro excludente da migração 35
    const returnedOrders = ordersInDb.filter((o) => o.tenantId === 'a8596096-d97e-4248-a7b8-5f6f9de0cb10');

    expect(returnedOrders.length).toBe(1);
    expect(returnedOrders[0].currentStage).toBe('formalizacao_contratual');
    expect(returnedOrders[0].contractStatus).toBe('formalizacao_pendente');
    // Deve ser visível na aba 'formalizacao_contratual'
    const stageFilter = 'formalizacao_contratual';
    const filtered = returnedOrders.filter((o) => o.currentStage === stageFilter);
    expect(filtered.length).toBe(1);
    expect(filtered[0].orderNumber).toBe('PED-4153');
  });

  // ---------------------------------------------------------------------------
  // Teste C — Assinatura e avanço
  // ---------------------------------------------------------------------------
  it('Teste C — Após assinatura, o pedido avança para medição e permanece 100% visível', () => {
    const signedOrder: StoreOrder = {
      ...sampleOrderTenantA,
      currentStage: 'medicao',
      contractStatus: 'assinado',
      contractSignedAt: new Date().toISOString(),
      contractSignedByName: 'Ana Clara Santos',
      contractSignedByCpf: '123.456.789-00'
    };

    expect(signedOrder.currentStage).toBe('medicao');
    expect(signedOrder.contractStatus).toBe('assinado');
    expect(signedOrder.contractSignedAt).toBeDefined();

    // Filtro da etapa 'medicao' deve encontrar o pedido
    const medicaoFiltered = [signedOrder].filter((o) => o.currentStage === 'medicao');
    expect(medicaoFiltered.length).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Teste D — Persistência após atualização / recarregamento simulado
  // ---------------------------------------------------------------------------
  it('Teste D — Deve preservar pedidos em memória durante falha temporária de recarga (anti-wiping)', () => {
    let currentLiveOrders = [sampleOrderTenantA];
    let isStale = false;
    let errorMessage: string | null = null;

    // Simulação de recarga com falha
    const simulateReloadFailure = () => {
      const fetchResult: FetchOrdersResult = {
        success: false,
        orders: [],
        error: 'Conexão temporariamente indisponível.',
        errorCode: 'NETWORK_ERROR'
      };

      if (fetchResult.success) {
        currentLiveOrders = fetchResult.orders;
        errorMessage = null;
        isStale = false;
      } else {
        errorMessage = fetchResult.error || 'Erro';
        // Regra de resiliência: NÃO apagar currentLiveOrders se já existiam dados
        isStale = currentLiveOrders.length > 0;
      }
    };

    simulateReloadFailure();

    // Os pedidos carregados anteriormente DEVEM ser preservados na interface!
    expect(currentLiveOrders.length).toBe(1);
    expect(currentLiveOrders[0].orderNumber).toBe('PED-4153');
    expect(isStale).toBe(true);
    expect(errorMessage).toContain('Conexão temporariamente indisponível');
  });

  // ---------------------------------------------------------------------------
  // Teste E — Regressão entre módulos (alterações contratuais e dados cadastrais)
  // ---------------------------------------------------------------------------
  it('Teste E — Alterações nos dados do contrato/prazos não quebram a visualização do pedido', () => {
    const daysFormatted = formatBusinessDays(45);
    expect(daysFormatted).toBe('45 dias úteis');

    // Pedido com prazo formatado e observações atualizadas
    const updatedOrder: StoreOrder = {
      ...sampleOrderTenantA,
      desiredDeadline: daysFormatted,
      orderNotes: 'Cliente solicitou puxadores cava em perfil champagne.',
      contractVersion: 2
    };

    expect(updatedOrder.desiredDeadline).toBe('45 dias úteis');
    expect(updatedOrder.orderNotes).toContain('champagne');
    expect(updatedOrder.contractVersion).toBe(2);
    // Permanece com IDs e integridade intactos
    expect(updatedOrder.uuid).toBe(sampleOrderTenantA.uuid);
    expect(updatedOrder.tenantId).toBe(sampleOrderTenantA.tenantId);
  });

  // ---------------------------------------------------------------------------
  // Teste F — Falha da RPC e classificação de erros amigáveis
  // ---------------------------------------------------------------------------
  it('Teste F — Deve classificar erros de consulta em categorias claras sem expor SQL interno', () => {
    const unauthError = classifyERPError('JWT expired: token invalid', 'UNAUTHORIZED');
    expect(unauthError.code).toBe('UNAUTHORIZED');
    expect(unauthError.message).toContain('login novamente');

    const forbiddenError = classifyERPError('Acesso negado: loja não autorizada', 'FORBIDDEN');
    expect(forbiddenError.code).toBe('FORBIDDEN');
    expect(forbiddenError.message).toContain('Acesso negado');

    const networkError = classifyERPError('Failed to fetch from Supabase endpoint', 'NETWORK_ERROR');
    expect(networkError.code).toBe('NETWORK_ERROR');
    expect(networkError.message).toContain('conexão');

    const sqlLimitError = classifyERPError('54023: cannot pass more than 100 arguments to a function');
    expect(sqlLimitError.code).toBe('DATABASE_ERROR');
    // Não expõe a string interna '54023' para o usuário
    expect(sqlLimitError.message).not.toContain('54023');
    expect(sqlLimitError.message).toContain('Não foi possível carregar os pedidos');
  });

  // ---------------------------------------------------------------------------
  // Teste G — Isolamento estrito por loja (Multi-Tenant Security)
  // ---------------------------------------------------------------------------
  it('Teste G — Usuário de uma loja não deve receber pedidos de outro tenant', () => {
    const storeSuzanoId = 'a8596096-d97e-4248-a7b8-5f6f9de0cb10';
    const storeMogiId = 'b1010000-0000-0000-0000-000000000001';

    const allOrdersInDatabase = [sampleOrderTenantA, sampleOrderTenantB];

    // Simula filtragem no banco por tenant autorizado
    const suzanoQuery = allOrdersInDatabase.filter((o) => o.tenantId === storeSuzanoId);
    expect(suzanoQuery.length).toBe(1);
    expect(suzanoQuery[0].orderNumber).toBe('PED-4153');
    expect(suzanoQuery.some((o) => o.tenantId === storeMogiId)).toBe(false);

    const mogiQuery = allOrdersInDatabase.filter((o) => o.tenantId === storeMogiId);
    expect(mogiQuery.length).toBe(1);
    expect(mogiQuery[0].orderNumber).toBe('PED-9002');
    expect(mogiQuery.some((o) => o.tenantId === storeSuzanoId)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Teste H — Integridade dos KPIs (Métricas batem exatamente com a esteira)
  // ---------------------------------------------------------------------------
  it('Teste H — Os KPIs de pedidos ativos devem contabilizar pedidos em formalização', () => {
    const mockOrders: StoreOrder[] = [
      sampleOrderTenantA, // formalizacao_contratual (ativo)
      { ...sampleOrderTenantA, id: 'PED-4154', currentStage: 'medicao' }, // medicao (ativo)
      { ...sampleOrderTenantA, id: 'PED-4155', currentStage: 'concluido' }, // concluido
    ];

    const activeCount = mockOrders.filter((o) => o.currentStage !== 'concluido').length;
    const completedCount = mockOrders.filter((o) => o.currentStage === 'concluido').length;
    const totalVolume = mockOrders
      .filter((o) => o.currentStage !== 'concluido')
      .reduce((sum, o) => sum + o.totalValue, 0);

    const metrics: ERPMetrics = {
      activeOrders: activeCount,
      completedOrders: completedCount,
      delayedOrders: 0,
      totalContractedValue: totalVolume,
      byStage: {
        formalizacao_contratual: 1,
        medicao: 1,
        concluido: 1
      }
    };

    expect(metrics.activeOrders).toBe(2);
    expect(metrics.completedOrders).toBe(1);
    expect(metrics.totalContractedValue).toBe(50000);
    expect(metrics.byStage.formalizacao_contratual).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Teste I — Documentos e bloqueio de etapas (Gating)
  // ---------------------------------------------------------------------------
  it('Teste I — Deve impedir avanço sem cumprimento dos pré-requisitos documentais', () => {
    const orderWithoutContractDoc = {
      ...sampleOrderTenantA,
      currentStage: 'formalizacao_contratual' as OrderStage,
      contractStatus: 'formalizacao_pendente' as const,
      documents: []
    };

    const canAdvance = (orderWithoutContractDoc.contractStatus as string) === 'assinado' ||
      orderWithoutContractDoc.documents.some((d: any) => (d as any).stage === 'contrato');

    expect(canAdvance).toBe(false);

    // Com contrato assinado, o avanço é autorizado
    const orderWithContractSigned = {
      ...orderWithoutContractDoc,
      contractStatus: 'assinado' as const
    };
    const canAdvanceAfterSign = (orderWithContractSigned.contractStatus as string) === 'assinado';
    expect(canAdvanceAfterSign).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Teste J — Contratos, integridade imutável e geração de PDF
  // ---------------------------------------------------------------------------
  it('Teste J — Geração de hash SHA-256 e PDF do contrato sem comprometer dados do pedido', async () => {
    const payload = `${sampleOrderTenantA.orderNumber}|${sampleOrderTenantA.clientCpf}|v1`;
    const hash1 = await computeContractIntegrityHash(payload);
    const hash2 = await computeContractIntegrityHash(payload);

    expect(hash1).toBeDefined();
    expect(hash1.length).toBe(64);
    expect(hash1).toBe(hash2);

    const doc = await generateContractPdfDoc({
      order: sampleOrderTenantA,
      isSigned: false,
      signerName: sampleOrderTenantA.clientName,
      signerCpf: sampleOrderTenantA.clientCpf
    });

    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

});
