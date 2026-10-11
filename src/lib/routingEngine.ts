export interface RoutingStoreCandidate {
  id: string;
  name: string;
  cityIbgeCode: string;
  status: 'Ativa' | 'Pendente' | 'Inativa';
  isRoutingEnabled: boolean;
  leadsCount: number;
  lastAssignedAt?: string | null;
  createdAt?: string;
}

export interface StoreCoverageRule {
  tenantId: string;
  cityIbgeCode: string;
  isAuthorized: boolean;
  priorityLevel: number;
}

export interface RoutingResult {
  isAssigned: boolean;
  assignedStoreId?: string;
  assignedStoreName?: string;
  reason?: 'same_city_round_robin' | 'nearby_coverage_fallback';
  status: 'atribuido' | 'sem_cobertura';
}

/**
 * Função de ordenação Round Robin:
 * 1. Prioriza loja que nunca recebeu lead (lastAssignedAt = null) ou cujo atendimento foi há mais tempo.
 * 2. Em caso de empate, desempata pela menor carga total acumulada (leadsCount).
 */
function sortRoundRobin(a: RoutingStoreCandidate, b: RoutingStoreCandidate): number {
  if (a.lastAssignedAt !== undefined || b.lastAssignedAt !== undefined) {
    if (!a.lastAssignedAt && b.lastAssignedAt) return -1;
    if (a.lastAssignedAt && !b.lastAssignedAt) return 1;
    if (a.lastAssignedAt && b.lastAssignedAt) {
      const timeDiff = new Date(a.lastAssignedAt).getTime() - new Date(b.lastAssignedAt).getTime();
      if (timeDiff !== 0) return timeDiff;
    }
  }
  return a.leadsCount - b.leadsCount;
}

/**
 * Motor oficial de decisão de roteamento de leads.
 * Implementa as Prioridades 1, 2 e 3 e o rodízio Round Robin estrito.
 */
export function resolveStoreAssignment(
  leadCityIbgeCode: string,
  stores: RoutingStoreCandidate[],
  coverageRules: StoreCoverageRule[] = []
): RoutingResult {
  // Filtro de lojas ativas e habilitadas na distribuição
  const eligibleActiveStores = stores.filter(
    (s) => s.status === 'Ativa' && s.isRoutingEnabled
  );

  // =========================================================================
  // PRIORIDADE 1: Lojas sediadas no MESMO MUNICÍPIO (Código IBGE)
  // =========================================================================
  const sameCityStores = eligibleActiveStores.filter(
    (s) => s.cityIbgeCode === leadCityIbgeCode
  );

  if (sameCityStores.length > 0) {
    // Round Robin: Seleciona a loja na vez do rodízio
    const chosenStore = [...sameCityStores].sort(sortRoundRobin)[0];

    return {
      isAssigned: true,
      assignedStoreId: chosenStore.id,
      assignedStoreName: chosenStore.name,
      reason: 'same_city_round_robin',
      status: 'atribuido',
    };
  }

  // =========================================================================
  // PRIORIDADE 2: Lojas externas com COBERTURA REGIONAL AUTORIZADA
  // =========================================================================
  const authorizedStoreIds = coverageRules
    .filter((c) => c.cityIbgeCode === leadCityIbgeCode && c.isAuthorized)
    .map((c) => c.tenantId);

  const fallbackStores = eligibleActiveStores.filter((s) =>
    authorizedStoreIds.includes(s.id)
  );

  if (fallbackStores.length > 0) {
    // Round Robin entre as candidatas de cobertura
    const chosenStore = [...fallbackStores].sort(sortRoundRobin)[0];

    return {
      isAssigned: true,
      assignedStoreId: chosenStore.id,
      assignedStoreName: chosenStore.name,
      reason: 'nearby_coverage_fallback',
      status: 'atribuido',
    };
  }

  // =========================================================================
  // PRIORIDADE 3: Sem Cobertura (Fila Administrativa)
  // =========================================================================
  return {
    isAssigned: false,
    status: 'sem_cobertura',
  };
}
