import { describe, it, expect } from 'vitest';
import { lookupCep } from '../lib/cepService';
import { submitSimulationAndLead } from '../lib/simulationService';

// Polyfill mock WebSocket para Node.js < 22 se necessário
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {} as any;
}

describe('Simulador & Distribuição de Leads Live (Fase 2)', () => {
  describe('Resolução Geográfica de CEP (cepService)', () => {
    it('deve identificar corretamente Suzano/SP e código IBGE 3552502', async () => {
      const result = await lookupCep('08674-000');
      expect(result.success).toBe(true);
      expect(result.city).toBe('Suzano');
      expect(result.state).toBe('SP');
      expect(result.ibgeCode).toBe('3552502');
    });

    it('deve identificar corretamente São Paulo/SP com CEP da Avenida Paulista', async () => {
      const result = await lookupCep('01310-100');
      expect(result.success).toBe(true);
      expect(result.city).toBe('São Paulo');
      expect(result.state).toBe('SP');
      expect(result.ibgeCode).toBe('3550308');
    });

    it('deve rejeitar CEP com tamanho inválido (< 8 dígitos)', async () => {
      const result = await lookupCep('12345');
      expect(result.success).toBe(false);
      expect(result.error).toContain('8 dígitos');
    });
  });

  describe('Jornada Completa: Simulação, Persistência e Roteamento (Cenário A & D)', () => {
    it('Cenário A: Consumidor de Suzano gera simulação, grava no banco e recebe atribuição na loja local de Suzano', async () => {
      const payload = {
        clientInfo: {
          name: 'Mariana Teste Suzano',
          phone: '11977778888',
          cep: '08674-000', // Suzano
          email: 'mariana.suzano@teste.com',
        },
        environments: [
          {
            typeId: 'cozinha',
            name: 'Cozinha Planejada Gourmet',
            areaM2: 14,
            ceilingHeight: 2.7,
            wallCount: 3 as const,
          },
        ],
      };

      const result = await submitSimulationAndLead(payload);

      expect(result.success).toBe(true);
      expect(result.simulationId).toBeDefined();
      expect(result.leadId).toBeDefined();
      expect(result.budgetMin).toBeGreaterThan(10000);
      expect(result.budgetMax).toBeGreaterThan(result.budgetMin);
      expect(result.city).toBe('Suzano');
      expect(result.state).toBe('SP');

      // Verificação da Prioridade 1 no PostgreSQL:
      expect(result.distributionStatus).toBe('atribuido');
      expect(result.assignmentReason).toBe('same_city_round_robin');
      expect([
        'b1020000-0000-0000-0000-000000000002',
        'b1020000-0000-0000-0000-000000000099',
      ]).toContain(result.assignedStoreId);
      expect(result.assignedStoreName).toContain('Suzano');
    });

    it('Cenário D: Consumidor de cidade sem lojas parceiras (Campinas) grava o lead na fila sem cobertura (Fila Admin)', async () => {
      const payload = {
        clientInfo: {
          name: 'Roberto Sem Cobertura',
          phone: '19988887777',
          cep: '13010-000', // Campinas (cidade sem parceiros ativos no momento)
          email: 'roberto@campinas.com',
        },
        environments: [
          {
            typeId: 'quarto',
            name: 'Dormitório Casal',
            areaM2: 12,
            ceilingHeight: 2.6,
            wallCount: 2 as const,
          },
        ],
      };

      const result = await submitSimulationAndLead(payload);

      expect(result.success).toBe(true);
      expect(result.simulationId).toBeDefined();
      expect(result.leadId).toBeDefined();
      expect(result.city).toBe('Campinas');
      expect(result.distributionStatus).toBe('sem_cobertura');
      expect(result.assignedStoreId).toBeUndefined();
    });
  });
});
