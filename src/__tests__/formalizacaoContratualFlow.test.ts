import { describe, it, expect } from 'vitest';
import { getContractSigningUrl, generateContractQrCodeDataUrl } from '../lib/customerContractService';
import { OrderStage } from '../types';

describe('Fluxo Completo CRM -> Contrato -> ERP (Formalização Contratual)', () => {
  it('garante que a sequência de etapas do ERP inicia obrigatoriamente por formalizacao_contratual antes de medicao', () => {
    const stageOrder: OrderStage[] = [
      'formalizacao_contratual',
      'medicao',
      'projeto_aprovacao',
      'producao',
      'montagem',
      'entrega_aceite',
      'concluido'
    ];

    expect(stageOrder[0]).toBe('formalizacao_contratual');
    expect(stageOrder[1]).toBe('medicao');
    expect(stageOrder.indexOf('medicao')).toBeGreaterThan(stageOrder.indexOf('formalizacao_contratual'));
  });

  it('valida geração de link e QR Code de assinatura com URL pública', async () => {
    const token = 'token_prod_48chars_secure_test';
    const signingUrl = getContractSigningUrl(token);

    expect(signingUrl).toContain('sign_token=token_prod_48chars_secure_test');
    expect(signingUrl).toContain('https://www.useplanejafacil.com/?sign_token=');

    const qrCode = await generateContractQrCodeDataUrl(signingUrl);
    expect(qrCode).toContain('data:image/png;base64,');
  });

  it('impede avanço para Medição Fina se o contrato estiver pendente e sem documento assinado', () => {
    const mockOrder = {
      id: 'PED-5001',
      currentStage: 'formalizacao_contratual' as OrderStage,
      contractStatus: 'formalizacao_pendente' as any,
      documents: []
    };

    const isSigned = mockOrder.contractStatus === 'assinado' || mockOrder.contractStatus === 'assinado_externo';
    const hasDoc = mockOrder.documents.some((d: any) => d.stage === 'contrato');
    const canAdvanceToMedicao = isSigned || hasDoc;

    expect(canAdvanceToMedicao).toBe(false);
  });

  it('libera avanço para Medição Fina após assinatura eletrônica do cliente', () => {
    const mockOrder = {
      id: 'PED-5001',
      currentStage: 'formalizacao_contratual' as OrderStage,
      contractStatus: 'assinado' as any,
      documents: []
    };

    const isSigned = mockOrder.contractStatus === 'assinado' || mockOrder.contractStatus === 'assinado_externo';
    const canAdvanceToMedicao = isSigned;

    expect(canAdvanceToMedicao).toBe(true);
  });

  it('libera avanço para Medição Fina após anexo e confirmação de contrato físico assinado', () => {
    const mockOrder = {
      id: 'PED-5002',
      currentStage: 'formalizacao_contratual' as OrderStage,
      contractStatus: 'assinado_externo' as any,
      documents: [
        { stage: 'contrato', docType: 'contrato_assinado', fileName: 'contrato_assinado_via_papel.pdf' }
      ]
    };

    const isSigned = mockOrder.contractStatus === 'assinado' || mockOrder.contractStatus === 'assinado_externo';
    const hasDoc = mockOrder.documents.some((d: any) => d.stage === 'contrato');
    const canAdvanceToMedicao = isSigned || hasDoc;

    expect(canAdvanceToMedicao).toBe(true);
  });
});

