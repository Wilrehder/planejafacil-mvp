import { describe, it, expect } from 'vitest';
import {
  ClientContactSchema,
  SimulationEnvironmentSchema,
  SimulationSubmissionSchema,
  ExternalLeadSchema,
  StoreRegistrationSchema,
} from '../lib/validations';

describe('Validações Zod (Input Validation & Integrity)', () => {
  describe('ClientContactSchema (Formulário de Contato)', () => {
    it('deve aceitar dados válidos com telefone de 11 dígitos e CEP formatado', () => {
      const valid = {
        name: 'Carlos Alberto Silva',
        phone: '(11) 98765-4321',
        cep: '08674-000',
        email: 'carlos@example.com',
        city: 'Suzano',
        state: 'SP',
      };

      const result = ClientContactSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar nome com menos de 3 caracteres', () => {
      const invalid = {
        name: 'Al',
        phone: '11987654321',
        cep: '08674000',
      };
      const result = ClientContactSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('mínimo 3 caracteres');
      }
    });

    it('deve rejeitar telefone com menos de 10 dígitos numéricos', () => {
      const invalid = {
        name: 'Maria Oliveira',
        phone: '11987654', // apenas 8 dígitos
        cep: '08674000',
      };
      const result = ClientContactSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Telefone inválido');
      }
    });

    it('deve rejeitar CEP incompleto com menos de 8 dígitos numéricos', () => {
      const invalid = {
        name: 'Maria Oliveira',
        phone: '11987654321',
        cep: '08674-00', // apenas 7 dígitos
      };
      const result = ClientContactSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('CEP inválido');
      }
    });
  });

  describe('SimulationEnvironmentSchema (Ambiente do Simulador)', () => {
    it('deve aceitar ambiente dentro dos limites dimensionais válidos', () => {
      const valid = {
        typeId: 'cozinha',
        name: 'Cozinha Gourmet',
        areaM2: 12.5,
        ceilingHeight: 2.7,
        wallCount: 3 as const,
      };
      const result = SimulationEnvironmentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar área menor que 3m² ou maior que 150m²', () => {
      const tooSmall = {
        typeId: 'banheiro',
        name: 'Lavabo',
        areaM2: 1.5, // < 3
        ceilingHeight: 2.6,
        wallCount: 2 as const,
      };
      expect(SimulationEnvironmentSchema.safeParse(tooSmall).success).toBe(false);

      const tooLarge = {
        typeId: 'sala',
        name: 'Galpão Sala',
        areaM2: 160, // > 150
        ceilingHeight: 2.6,
        wallCount: 4 as const,
      };
      expect(SimulationEnvironmentSchema.safeParse(tooLarge).success).toBe(false);
    });

    it('deve rejeitar pé-direito fora do limite arquitetural (2.2m a 4.5m)', () => {
      const tooLow = {
        typeId: 'quarto',
        name: 'Quarto',
        areaM2: 10,
        ceilingHeight: 2.0, // < 2.2
        wallCount: 2 as const,
      };
      expect(SimulationEnvironmentSchema.safeParse(tooLow).success).toBe(false);

      const tooHigh = {
        typeId: 'quarto',
        name: 'Quarto',
        areaM2: 10,
        ceilingHeight: 5.0, // > 4.5
        wallCount: 2 as const,
      };
      expect(SimulationEnvironmentSchema.safeParse(tooHigh).success).toBe(false);
    });

    it('deve rejeitar wallCount fora do intervalo 1 a 4', () => {
      const invalidWalls = {
        typeId: 'quarto',
        name: 'Quarto',
        areaM2: 10,
        ceilingHeight: 2.6,
        wallCount: 5,
      };
      expect(SimulationEnvironmentSchema.safeParse(invalidWalls).success).toBe(false);
    });
  });

  describe('SimulationSubmissionSchema (Submissão Completa)', () => {
    it('deve rejeitar simulação sem ambientes selecionados', () => {
      const emptyEnvs = {
        clientInfo: {
          name: 'João Pedro',
          phone: '11999998888',
          cep: '08674000',
        },
        environments: [],
      };
      const result = SimulationSubmissionSchema.safeParse(emptyEnvs);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('pelo menos um cômodo');
      }
    });
  });

  describe('StoreRegistrationSchema (Credenciamento de Loja)', () => {
    it('deve validar dados cadastrais completos da loja', () => {
      const validStore = {
        name: 'Marcenaria Moderna Ltda',
        cnpj: '12.345.678/0001-90',
        responsibleName: 'Roberto Firmino',
        city: 'Suzano',
        state: 'SP',
        plan: 'Pro' as const,
        regionServed: 'Alto Tietê e Grande SP',
        phone: '1147480000',
        whatsapp: '11999998888',
        email: 'contato@moderna.com.br',
        status: 'Ativa' as const,
      };

      const result = StoreRegistrationSchema.safeParse(validStore);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar se plano não for Basic ou Pro', () => {
      const invalidPlan = {
        name: 'Loja Teste',
        responsibleName: 'Responsavel',
        city: 'Mogi',
        state: 'SP',
        plan: 'Enterprise', // inválido
        regionServed: 'Litoral',
        phone: '1147480000',
        whatsapp: '11999998888',
        email: 'test@teste.com',
        status: 'Ativa',
      };
      expect(StoreRegistrationSchema.safeParse(invalidPlan).success).toBe(false);
    });
  });
});
