import { describe, it, expect } from 'vitest';
import { submitSimulationAndLead } from '../lib/simulationService';
import { lookupCep } from '../lib/cepService';

// Polyfill mock WebSocket para Node.js se necessário
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {} as any;
}

describe('Cenário F: Tratamento de Falhas e Robustez (Fase 2)', () => {
  it('deve rejeitar submissão com CEP inexistente/inválido sem inventar cidade', async () => {
    const res = await submitSimulationAndLead({
      clientInfo: {
        name: 'Cliente Teste CEP Falso',
        phone: '11988887777',
        cep: '00000-000', // CEP inexistente
        email: 'cepfalso@teste.com',
      },
      environments: [
        {
          typeId: 'cozinha',
          name: 'Cozinha',
          areaM2: 12,
          ceilingHeight: 2.7,
          wallCount: 3,
        },
      ],
    });

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.error).toContain('CEP');
  });

  it('deve rejeitar submissão sem ambientes cadastrados', async () => {
    const res = await submitSimulationAndLead({
      clientInfo: {
        name: 'Cliente Sem Ambientes',
        phone: '11988887777',
        cep: '08674-000',
        email: 'semambiente@teste.com',
      },
      environments: [],
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('cômodo');
  });

  it('deve rejeitar dados de contato corrompidos (telefone sem DDD)', async () => {
    const res = await submitSimulationAndLead({
      clientInfo: {
        name: 'Cliente Telefone Curto',
        phone: '12345',
        cep: '08674-000',
      },
      environments: [
        {
          typeId: 'sala',
          name: 'Sala',
          areaM2: 15,
          ceilingHeight: 2.7,
          wallCount: 3,
        },
      ],
    });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/telefone/i);
  });
});
