import { describe, it, expect } from 'vitest';
import { submitSimulationAndLead } from '../lib/simulationService';

// Polyfill mock WebSocket para Node.js se necessário
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {} as any;
}

describe('Cenários C & E: Distribuição Round Robin e Concorrência Live (Fase 2)', () => {
  it('Cenário C: Round Robin sequencial deve alternar estritamente entre lojas elegíveis do mesmo município', async () => {
    const storeIdsAssigned: string[] = [];

    for (let i = 1; i <= 4; i++) {
      const res = await submitSimulationAndLead({
        clientInfo: {
          name: `Cliente Round Robin ${i}`,
          phone: `1199999000${i}`,
          cep: '08674-000', // Suzano
          email: `cliente.rr${i}@teste.com`,
        },
        environments: [
          {
            typeId: 'cozinha',
            name: `Cozinha Round Robin ${i}`,
            areaM2: 10 + i,
            ceilingHeight: 2.7,
            wallCount: 3,
          },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.distributionStatus).toBe('atribuido');
      expect(res.assignmentReason).toBe('same_city_round_robin');
      expect(res.assignedStoreId).toBeDefined();

      storeIdsAssigned.push(res.assignedStoreId!);
      // Pequeno delay para garantir monotonicidade do timestamp de atribuição
      await new Promise((r) => setTimeout(r, 100));
    }

    // Deve conter ambas as lojas de Suzano
    const uniqueStores = new Set(storeIdsAssigned);
    expect(uniqueStores.size).toBe(2);

    // Deve alternar: o primeiro não deve ser igual ao segundo
    expect(storeIdsAssigned[0]).not.toBe(storeIdsAssigned[1]);
    // O terceiro deve ser igual ao primeiro
    expect(storeIdsAssigned[2]).toBe(storeIdsAssigned[0]);
    // O quarto deve ser igual ao segundo
    expect(storeIdsAssigned[3]).toBe(storeIdsAssigned[1]);
  });

  it('Cenário E: Múltiplas submissões concorrentes (Promise.all) não devem gerar deadlocks nem corrupções', async () => {
    const concurrentCount = 5;

    const promises = Array.from({ length: concurrentCount }).map((_, idx) =>
      submitSimulationAndLead({
        clientInfo: {
          name: `Cliente Concorrente ${idx + 1}`,
          phone: `1198888000${idx + 1}`,
          cep: '08674-000', // Suzano
          email: `concorrente${idx + 1}@teste.com`,
        },
        environments: [
          {
            typeId: 'quarto',
            name: `Quarto ${idx + 1}`,
            areaM2: 12,
            ceilingHeight: 2.6,
            wallCount: 2,
          },
        ],
      })
    );

    const results = await Promise.all(promises);

    // Todos os 5 devem concluir com sucesso graças aos locks transacionais
    expect(results.length).toBe(concurrentCount);
    for (const res of results) {
      expect(res.success).toBe(true);
      expect(res.simulationId).toBeDefined();
      expect(res.leadId).toBeDefined();
      expect(res.distributionStatus).toBe('atribuido');
      expect(res.budgetMin).toBeGreaterThan(0);
      expect(res.budgetMax).toBeGreaterThan(res.budgetMin);
    }

    // Todos os IDs de leads devem ser únicos
    const leadIds = results.map((r) => r.leadId);
    const uniqueLeadIds = new Set(leadIds);
    expect(uniqueLeadIds.size).toBe(concurrentCount);
  });
});
