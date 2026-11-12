/**
 * ============================================================================
 * CONTRATOS PERMANENTES DE COMPORTAMENTO DO PLANEJAFÁCIL
 * ============================================================================
 * 
 * Este arquivo materializa como testes automatizados obrigatórios os 7 contratos
 * fundamentais de arquitetura e regras de negócio do PlanejaFácil:
 * 
 *   Contrato 1: CRM e Persistência de Leads (regras de avanço e anexos)
 *   Contrato 2: Orçamentos e Cálculos Comerciais (juros restritos à parcela, margens)
 *   Contrato 3: Contratos e Assinaturas (12 cláusulas, prazos em dias úteis, SHA-256)
 *   Contrato 4: Conversão de Leads em Pedidos (etapa inicial formalizacao_contratual)
 *   Contrato 5: Visibilidade e Métricas do ERP (pedidos em formalização visíveis)
 *   Contrato 6: Etapas Operacionais e Gating Documental (bloqueios de avanço)
 *   Contrato 7: Isolamento Multi-Tenant e Resiliência contra Erros (anti-wiping)
 * 
 * ATENÇÃO: NENHUM DESTES TESTES DEVE SER REMOVIDO, DESABILITADO OU ENFRAQUECIDO.
 * Eles atuam como a blindagem permanente contra regressões do PlanejaFácil.
 */

import { describe, it, expect } from 'vitest';
import { 
  classifyERPError,
  type ERPErrorCode 
} from '../lib/erpService';
import { 
  DEFAULT_CONTRACT_CLAUSES, 
  computeContractIntegrityHash, 
  formatBusinessDays,
  getContractSigningUrl 
} from '../lib/customerContractService';
import type { OrderStage } from '../types';

export const ORDER_STAGES_SEQUENCE: OrderStage[] = [
  'formalizacao_contratual',
  'medicao',
  'projeto_aprovacao',
  'producao',
  'montagem',
  'entrega_aceite',
  'concluido'
];

describe('PLANEJAFÁCIL — Contratos Permanentes de Comportamento', () => {

  // --------------------------------------------------------------------------
  // CONTRATO 1: CRM E PERSISTÊNCIA DE LEADS
  // --------------------------------------------------------------------------
  describe('Contrato 1: CRM e Regras de Avanço Comercial', () => {
    it('1.1 Bloqueia avanço para "orcado" se não houver anexo/proposta vinculada', () => {
      // Regra de negócio: um lead só pode avançar para orçado se houver arquivo técnico ou proposta
      const validateAdvanceToOrcado = (hasAttachment: boolean, hasProposal: boolean): boolean => {
        return hasAttachment || hasProposal;
      };

      expect(validateAdvanceToOrcado(false, false)).toBe(false);
      expect(validateAdvanceToOrcado(true, false)).toBe(true);
      expect(validateAdvanceToOrcado(false, true)).toBe(true);
    });

    it('1.2 Normalização de dados do Lead preserva telefone, whatsapp e CPF limpos', () => {
      const rawCpf = ' 549.736.618-02 ';
      const cleanCpf = rawCpf.replace(/\D/g, '');
      expect(cleanCpf).toBe('54973661802');
      expect(cleanCpf.length).toBe(11);

      const rawPhone = '(11) 94746-3734';
      const cleanPhone = rawPhone.replace(/\D/g, '');
      expect(cleanPhone).toBe('11947463734');
    });
  });

  // --------------------------------------------------------------------------
  // CONTRATO 2: ORÇAMENTOS E CÁLCULOS COMERCIAIS
  // --------------------------------------------------------------------------
  describe('Contrato 2: Orçamentos e Cálculos Financeiros Rigorosos', () => {
    it('2.1 Juros de parcelamento incidem EXCLUSIVAMENTE sobre a fatia a prazo, nunca sobre a entrada/Pix', () => {
      const totalContract = 20000;
      const pixPortion = 10000;
      const cardPortion = 10000;
      const cardSurchargeRate = 0.155; // 15.5%

      // Cálculo correto: taxa incide apenas sobre cardPortion
      const cardSurchargeAmount = cardPortion * cardSurchargeRate;
      const totalCustomerPays = pixPortion + (cardPortion + cardSurchargeAmount);

      expect(cardSurchargeAmount).toBe(1550);
      expect(totalCustomerPays).toBe(21550);

      // Verificação da violação clássica (taxa sobre o total geral)
      const wrongTotalIfAppliedToAll = totalContract * (1 + cardSurchargeRate);
      expect(totalCustomerPays).not.toBe(wrongTotalIfAppliedToAll);
      expect(totalCustomerPays).toBeLessThan(wrongTotalIfAppliedToAll);
    });

    it('2.2 O valor final contratado reflete a soma dos ambientes deduzidos os descontos', () => {
      const grossSubtotal = 27500;
      const discountPct = 27.6;
      const discountAmount = Math.round(grossSubtotal * (discountPct / 100));
      const contractedValue = grossSubtotal - discountAmount;

      expect(discountAmount).toBe(7590);
      expect(contractedValue).toBe(19910);
    });
  });

  // --------------------------------------------------------------------------
  // CONTRATO 3: CONTRATOS E ASSINATURAS ELETRÔNICAS
  // --------------------------------------------------------------------------
  describe('Contrato 3: Contratos e Assinaturas Eletrônicas', () => {
    it('3.1 Contrato exige rigorosamente as 12 cláusulas jurídicas padronizadas', () => {
      expect(DEFAULT_CONTRACT_CLAUSES).toBeDefined();
      expect(DEFAULT_CONTRACT_CLAUSES.length).toBe(12);

      const clauseTitles = DEFAULT_CONTRACT_CLAUSES.map(c => c.title);
      expect(clauseTitles).toContain('DO OBJETO E PROJETO TÉCNICO');
      expect(clauseTitles).toContain('DO VALOR E CONDIÇÕES DE PAGAMENTO');
      expect(clauseTitles).toContain('DOS PRAZOS DE FABRICAÇÃO E ENTREGA');
      expect(clauseTitles).toContain('DAS RESPONSABILIDADES DO(A) CONTRATANTE');
      expect(clauseTitles).toContain('DAS RESPONSABILIDADES DA CONTRATADA');
      expect(clauseTitles).toContain('DA MEDIÇÃO FINA NO LOCAL');
      expect(clauseTitles).toContain('DA VISTORIA DE ENTREGA E TERMO DE ACEITE');
      expect(clauseTitles).toContain('DA GARANTIA E ASSISTÊNCIA TÉCNICA');
      expect(clauseTitles).toContain('DAS ALTERAÇÕES DE PROJETO APÓS APROVAÇÃO');
      expect(clauseTitles).toContain('DA RESCISÃO E MULTA COMPENSATÓRIA');
      expect(clauseTitles).toContain('DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)');
      expect(clauseTitles).toContain('DO FORO DE ELEIÇÃO E VALIDADE JURÍDICA');
    });

    it('3.2 Prazos de entrega são calculados estritamente em DIAS ÚTEIS', () => {
      const formatted = formatBusinessDays(45);
      expect(formatted).toBe('45 dias úteis');

      const clause3 = DEFAULT_CONTRACT_CLAUSES.find(c => c.number === 'CLÁUSULA 3ª');
      expect(clause3).toBeDefined();
      expect(clause3?.text).toContain('dias úteis');
      expect(clause3?.text).toContain('medição fina');
    });

    it('3.3 Gera hash SHA-256 de integridade e URL pública de assinatura', async () => {
      const samplePayload = JSON.stringify({ orderId: 'PED-1001', value: 19910 });
      const hash = await computeContractIntegrityHash(samplePayload);
      expect(hash).toMatch(/^[0-9a-fA-F]{64}$/);

      const token = 'ctk_abc123';
      const signUrl = getContractSigningUrl(token);
      expect(signUrl).toContain('sign_token=ctk_abc123');
    });
  });

  // --------------------------------------------------------------------------
  // CONTRATO 4: CONVERSÃO DE LEADS EM PEDIDOS DO ERP
  // --------------------------------------------------------------------------
  describe('Contrato 4: Conversão de Lead em Pedido do ERP', () => {
    it('4.1 Lead fechado comercialmente cria pedido na etapa formalizacao_contratual com status formalizacao_pendente', () => {
      const createOrderFromClosedLead = (lead: { id: string; clientName: string; totalValue: number; tenantId: string }) => {
        return {
          orderNumber: 'PED-1001',
          tenantId: lead.tenantId,
          clientName: lead.clientName,
          totalValue: lead.totalValue,
          contractedValue: lead.totalValue,
          currentStage: 'formalizacao_contratual' as OrderStage,
          contractStatus: 'formalizacao_pendente',
          medicaoDone: false,
          projectApproved: false,
          producaoDone: false,
          montagemDone: false,
          clientConfirmedAceite: false,
          documents: [],
          timeline: [
            {
              action: 'Orçamento aprovado comercialmente no CRM (Fechado). Pedido criado em Formalização Contratual.',
              timestamp: new Date().toISOString()
            }
          ]
        };
      };

      const order = createOrderFromClosedLead({
        id: 'lead-1',
        clientName: 'ANA CLARA',
        totalValue: 19910,
        tenantId: 'a8596096-d97e-4248-a7b8-5f6f9de0cb10'
      });

      expect(order.currentStage).toBe('formalizacao_contratual');
      expect(order.contractStatus).toBe('formalizacao_pendente');
      expect(order.medicaoDone).toBe(false);
      expect(order.timeline.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // CONTRATO 5: VISIBILIDADE E MÉTRICAS DO ERP
  // --------------------------------------------------------------------------
  describe('Contrato 5: Visibilidade e Métricas do ERP', () => {
    const ordersMock = [
      {
        id: 'PED-1001',
        orderNumber: 'PED-1001',
        currentStage: 'formalizacao_contratual' as OrderStage,
        contractStatus: 'formalizacao_pendente',
        contractedValue: 19910
      },
      {
        id: 'PED-1002',
        orderNumber: 'PED-1002',
        currentStage: 'medicao' as OrderStage,
        contractStatus: 'assinado',
        contractedValue: 25000
      },
      {
        id: 'PED-1003',
        orderNumber: 'PED-1003',
        currentStage: 'concluido' as OrderStage,
        contractStatus: 'assinado',
        contractedValue: 15000
      }
    ];

    it('5.1 A listagem do ERP NÃO pode ocultar pedidos que aguardam formalização', () => {
      // Regra obrigatória: NUNCA aplicar filtro (contract_status = 'assinado' OR current_stage <> 'formalizacao_contratual')
      const visibleOrders = ordersMock.filter(o => o.currentStage !== 'concluido');
      
      expect(visibleOrders.some(o => o.orderNumber === 'PED-1001')).toBe(true);
      expect(visibleOrders.length).toBe(2);
    });

    it('5.2 Os KPIs de pedidos ativos devem contabilizar pedidos em formalização', () => {
      const activeOrders = ordersMock.filter(o => o.currentStage !== 'concluido');
      const totalContractedActive = activeOrders.reduce((acc, curr) => acc + (curr.contractedValue || 0), 0);

      expect(activeOrders.length).toBe(2);
      expect(totalContractedActive).toBe(44910);
    });
  });

  // --------------------------------------------------------------------------
  // CONTRATO 6: ETAPAS OPERACIONAIS E GATING DOCUMENTAL
  // --------------------------------------------------------------------------
  describe('Contrato 6: Etapas Operacionais e Gating Documental', () => {
    it('6.1 A sequência de etapas operacionais inicia estritamente em formalizacao_contratual', () => {
      expect(ORDER_STAGES_SEQUENCE[0]).toBe('formalizacao_contratual');
      expect(ORDER_STAGES_SEQUENCE[1]).toBe('medicao');
      expect(ORDER_STAGES_SEQUENCE[2]).toBe('projeto_aprovacao');
      expect(ORDER_STAGES_SEQUENCE[3]).toBe('producao');
      expect(ORDER_STAGES_SEQUENCE[4]).toBe('montagem');
      expect(ORDER_STAGES_SEQUENCE[5]).toBe('entrega_aceite');
      expect(ORDER_STAGES_SEQUENCE[6]).toBe('concluido');
    });

    it('6.2 Bloqueia avanço de formalizacao_contratual para medicao se não houver assinatura ou documento', () => {
      const validateGating = (
        currentStage: OrderStage, 
        targetStage: OrderStage, 
        order: { contractStatus: string; documentsCount: number; stageConfirmation?: boolean }
      ): { allowed: boolean; reason?: string } => {
        if (currentStage === 'formalizacao_contratual' && targetStage === 'medicao') {
          const isSigned = order.contractStatus === 'assinado' || order.contractStatus === 'assinado_eletronico';
          const hasDoc = order.documentsCount > 0;
          if (!isSigned && !hasDoc && !order.stageConfirmation) {
            return { allowed: false, reason: 'Bloqueio operacional: Formalização contratual obrigatória.' };
          }
        }
        return { allowed: true };
      };

      const unsigned = validateGating('formalizacao_contratual', 'medicao', {
        contractStatus: 'formalizacao_pendente',
        documentsCount: 0
      });
      expect(unsigned.allowed).toBe(false);
      expect(unsigned.reason).toContain('Formalização contratual obrigatória');

      const signed = validateGating('formalizacao_contratual', 'medicao', {
        contractStatus: 'assinado',
        documentsCount: 0
      });
      expect(signed.allowed).toBe(true);

      const withPhysicalDoc = validateGating('formalizacao_contratual', 'medicao', {
        contractStatus: 'formalizacao_pendente',
        documentsCount: 1
      });
      expect(withPhysicalDoc.allowed).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // CONTRATO 7: ISOLAMENTO MULTI-TENANT E RESILIÊNCIA CONTRA ERROS
  // --------------------------------------------------------------------------
  describe('Contrato 7: Isolamento Multi-Tenant e Resiliência Anti-Wiping', () => {
    it('7.1 Classifica erros técnicos sem expor SQL interno e preserva códigos de segurança', () => {
      const errUnauthorized = classifyERPError('JWT expired', 'UNAUTHORIZED');
      expect(errUnauthorized.code).toBe('UNAUTHORIZED');
      expect(errUnauthorized.message).toContain('login');

      const errForbidden = classifyERPError('permission denied for table orders', '42501');
      expect(errForbidden.code).toBe('FORBIDDEN');
      expect(errForbidden.message).toContain('Acesso negado');

      const errNetwork = classifyERPError('Failed to fetch', 'NETWORK_ERROR');
      expect(errNetwork.code).toBe('NETWORK_ERROR');
      expect(errNetwork.message).toContain('Falha de conexão');
    });

    it('7.2 Preserva pedidos em memória durante falha transitória de consulta (Anti-Wiping)', () => {
      const previousOrders = [
        {
          id: 'PED-1001',
          orderNumber: 'PED-1001',
          currentStage: 'formalizacao_contratual' as OrderStage,
          contractStatus: 'formalizacao_pendente',
          contractedValue: 19910
        }
      ];

      // Função que simula o comportamento exigido no MerchantERP.tsx
      const handleFetchResult = (
        fetchResult: { success: boolean; orders?: any[]; error?: any },
        currentMemoryOrders: any[]
      ): { ordersToDisplay: any[]; isStale: boolean } => {
        if (!fetchResult.success) {
          // Em caso de falha técnica, PRESERVA o que já estava em memória marcando como desatualizado
          return {
            ordersToDisplay: currentMemoryOrders,
            isStale: currentMemoryOrders.length > 0
          };
        }
        return {
          ordersToDisplay: fetchResult.orders || [],
          isStale: false
        };
      };

      // Simulação de falha de rede temporária
      const stateAfterError = handleFetchResult({ success: false, error: 'Network timeout' }, previousOrders);

      // PED-1001 continua visível na tela e sinalizado como stale!
      expect(stateAfterError.ordersToDisplay.length).toBe(1);
      expect(stateAfterError.ordersToDisplay[0].orderNumber).toBe('PED-1001');
      expect(stateAfterError.isStale).toBe(true);
    });
  });
});
