import { describe, it, expect } from 'vitest';
import {
  resolveStoreAssignment,
  RoutingStoreCandidate,
  StoreCoverageRule,
} from '../lib/routingEngine';

describe('Motor de Roteamento de Leads (Routing Engine)', () => {
  // Códigos IBGE de teste:
  // Suzano: 3552502
  // Mogi das Cruzes: 3530607
  // São Paulo: 3550308
  // Campinas: 3509502

  const mockStores: RoutingStoreCandidate[] = [
    {
      id: 'store-suzano-1',
      name: 'Planejados Suzano Alfa',
      cityIbgeCode: '3552502',
      status: 'Ativa',
      isRoutingEnabled: true,
      leadsCount: 5,
    },
    {
      id: 'store-suzano-2',
      name: 'Design Suzano Beta',
      cityIbgeCode: '3552502',
      status: 'Ativa',
      isRoutingEnabled: true,
      leadsCount: 2,
    },
    {
      id: 'store-mogi-1',
      name: 'Mogi Decor',
      cityIbgeCode: '3530607',
      status: 'Ativa',
      isRoutingEnabled: true,
      leadsCount: 1,
    },
    {
      id: 'store-sp-1',
      name: 'Paulista Prime Móveis',
      cityIbgeCode: '3550308',
      status: 'Ativa',
      isRoutingEnabled: true,
      leadsCount: 10,
    },
    {
      id: 'store-suzano-inativa',
      name: 'Marcenaria Desativada',
      cityIbgeCode: '3552502',
      status: 'Inativa',
      isRoutingEnabled: true,
      leadsCount: 0,
    },
    {
      id: 'store-suzano-bloqueada',
      name: 'Loja Sem Roteamento',
      cityIbgeCode: '3552502',
      status: 'Ativa',
      isRoutingEnabled: false,
      leadsCount: 0,
    },
  ];

  it('Cenário 1: PRIORIDADE 1 - Lead de Suzano seleciona apenas loja local elegível', () => {
    const result = resolveStoreAssignment('3552502', mockStores);

    expect(result.isAssigned).toBe(true);
    expect(result.status).toBe('atribuido');
    expect(result.reason).toBe('same_city_round_robin');
    // Deve pertencer a Suzano (não Mogi nem SP)
    expect(['store-suzano-1', 'store-suzano-2']).toContain(result.assignedStoreId);
  });

  it('Cenário 2: Round Robin - seleciona a loja elegível com menor carga de leads', () => {
    // store-suzano-1 tem 5 leads; store-suzano-2 tem 2 leads.
    // Lojas inativas e com routing desabilitado têm 0 leads mas não podem ser selecionadas.
    const result = resolveStoreAssignment('3552502', mockStores);

    expect(result.assignedStoreId).toBe('store-suzano-2');
    expect(result.assignedStoreName).toBe('Design Suzano Beta');
  });

  it('Cenário 3: PRIORIDADE 2 - Fallback Regional para loja vizinha com cobertura autorizada', () => {
    // Consumidor de Campinas (3509502), onde NÃO há loja local
    const coverageRules: StoreCoverageRule[] = [
      {
        tenantId: 'store-sp-1',
        cityIbgeCode: '3509502', // Cobertura autorizada de SP para Campinas
        isAuthorized: true,
        priorityLevel: 1,
      },
    ];

    const result = resolveStoreAssignment('3509502', mockStores, coverageRules);

    expect(result.isAssigned).toBe(true);
    expect(result.status).toBe('atribuido');
    expect(result.reason).toBe('nearby_coverage_fallback');
    expect(result.assignedStoreId).toBe('store-sp-1');
  });

  it('Cenário 4: Não seleciona loja externa se a regra de cobertura NÃO estiver autorizada', () => {
    const coverageRules: StoreCoverageRule[] = [
      {
        tenantId: 'store-sp-1',
        cityIbgeCode: '3509502',
        isAuthorized: false, // Desautorizada pelo admin
        priorityLevel: 1,
      },
    ];

    const result = resolveStoreAssignment('3509502', mockStores, coverageRules);

    expect(result.isAssigned).toBe(false);
    expect(result.status).toBe('sem_cobertura');
  });

  it('Cenário 5: PRIORIDADE 3 - Sem cobertura cai na fila administrativa', () => {
    // Consumidor de município sem lojas nem coberturas
    const result = resolveStoreAssignment('9999999', mockStores);

    expect(result.isAssigned).toBe(false);
    expect(result.status).toBe('sem_cobertura');
    expect(result.assignedStoreId).toBeUndefined();
  });

  it('Cenário 6: Loja desativada ou com routing desligado é ignorada mesmo se local', () => {
    const onlyInactiveStores: RoutingStoreCandidate[] = [
      {
        id: 'store-inativa',
        name: 'Inativa',
        cityIbgeCode: '3552502',
        status: 'Inativa',
        isRoutingEnabled: true,
        leadsCount: 0,
      },
      {
        id: 'store-sem-routing',
        name: 'Sem Routing',
        cityIbgeCode: '3552502',
        status: 'Ativa',
        isRoutingEnabled: false,
        leadsCount: 0,
      },
    ];

    const result = resolveStoreAssignment('3552502', onlyInactiveStores);

    expect(result.isAssigned).toBe(false);
    expect(result.status).toBe('sem_cobertura');
  });

  it('Cenário 7: Round Robin Estrito Circular - alterna lojas com base no timestamp lastAssignedAt', () => {
    // Duas lojas em Suzano. A Loja Alfa foi atendida há 2 horas. A Loja Beta foi atendida há 10 minutos.
    // Mesmo que Alfa tenha mais leads históricos acumulados, a vez do rodízio é de Alfa!
    const roundRobinStores: RoutingStoreCandidate[] = [
      {
        id: 'loja-alfa',
        name: 'Loja Alfa (Atendida há 2h)',
        cityIbgeCode: '3552502',
        status: 'Ativa',
        isRoutingEnabled: true,
        leadsCount: 150, // Mais leads históricos
        lastAssignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'loja-beta',
        name: 'Loja Beta (Atendida há 10min)',
        cityIbgeCode: '3552502',
        status: 'Ativa',
        isRoutingEnabled: true,
        leadsCount: 10,
        lastAssignedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    ];

    const result1 = resolveStoreAssignment('3552502', roundRobinStores);
    expect(result1.assignedStoreId).toBe('loja-alfa');

    // Agora Loja Alfa acabou de receber o lead (atualiza timestamp para agora)
    roundRobinStores[0].lastAssignedAt = new Date().toISOString();

    // Na próxima requisição, a vez do rodízio passa imediatamente para Loja Beta!
    const result2 = resolveStoreAssignment('3552502', roundRobinStores);
    expect(result2.assignedStoreId).toBe('loja-beta');
  });
});
