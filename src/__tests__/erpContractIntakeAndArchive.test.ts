import { describe, it, expect } from 'vitest';
import { 
  generateContractPdfDoc, 
  computeContractIntegrityHash,
  DEFAULT_CONTRACT_CLAUSES 
} from '../lib/customerContractService';

describe('PLANEJA FÁCIL — Fluxo de Entrada no ERP e Arquivamento Automático do Contrato Assinado', () => {
  const sampleOrder = {
    id: '1689d4f8-cb4c-4a58-b33c-65a985bd2fc3',
    orderNumber: 'PED-4153',
    clientName: 'Wilson',
    phone: '11989883025',
    clientCpf: '42260807852',
    address: 'rua gato cinzento 570',
    currentStage: 'medicao' as const,
    contractStatus: 'assinado' as const,
    contractSignedByName: 'Wilson',
    contractSignedByCpf: '42260807852',
    contractSignedAt: '2026-11-10T12:49:01.513Z',
    contractSignatureIp: 'Dispositivo Web',
    contractedValue: 62312.85,
    contractSnapshot: {
      contractor: {
        tradeName: 'Smart House Planejados',
        cnpj: '46.028.127/0001-10',
        address: 'Rua General Francisco Glicério, 1445 - Centro, Suzano - SP',
        phone: '(11) 94746-3734',
        email: 'smarthousesuzano@gmail.com'
      },
      customer: {
        name: 'Wilson',
        cpf: '42260807852',
        phone: '11989883025',
        billingAddress: 'rua gato cinzento 570'
      },
      products: {
        promobValue: 55000,
        conventionalTotal: 7312.85,
        simulationEnvironments: [
          { name: 'Cozinha Planejada', area: 12.0, finishTag: 'MDF Ultra Premium' }
        ]
      },
      financials: {
        finalContractedValue: 62312.85,
        paymentAllocations: [
          { method: 'pix', amount: 15000, installments: 1 },
          { method: 'credit_card', amount: 47312.85, installments: 12 }
        ]
      },
      clauses: DEFAULT_CONTRACT_CLAUSES
    }
  };

  it('1. Deve calcular hash SHA-256 consistente de integridade imutável', async () => {
    const payload = `${sampleOrder.orderNumber}|${sampleOrder.clientCpf}|${sampleOrder.contractSignedAt}|v1`;
    const hash = await computeContractIntegrityHash(payload);

    expect(hash).toBeDefined();
    expect(hash.length).toBe(64);
    // Hash determinístico
    const hash2 = await computeContractIntegrityHash(payload);
    expect(hash).toBe(hash2);
  });

  it('2. Deve gerar o PDF definitivo assinado incorporando evidências e certificado digital', async () => {
    const fakeSignatureImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const doc = await generateContractPdfDoc({
      order: sampleOrder,
      isSigned: true,
      signatureImage: fakeSignatureImage,
      signerName: 'Wilson',
      signerCpf: '42260807852',
      signedAt: sampleOrder.contractSignedAt,
      signatureIp: '189.40.12.33',
      signatureId: 'sig-uuid-1234'
    });

    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);

    const pdfOutput = doc.output('arraybuffer');
    expect(pdfOutput.byteLength).toBeGreaterThan(1000);
  });
});

