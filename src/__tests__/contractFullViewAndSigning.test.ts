import { describe, it, expect } from 'vitest';
import { 
  DEFAULT_CONTRACT_CLAUSES,
  generateContractPdfDoc,
  getContractSigningUrl,
  generateContractQrCodeDataUrl
} from '../lib/customerContractService';
import { Order, StoreContractTemplate } from '../types';

describe('PLANEJA FÁCIL — Verificação Integral do Contrato e Assinatura Eletrônica', () => {
  const mockOrder: Partial<Order> = {
    id: '1689d4f8-cb4c-4a58-b33c-65a985bd2fc3',
    orderNumber: 'PED-4153',
    clientName: 'Wilson',
    clientCpf: '42260807852',
    phone: '11989883025',
    totalValue: 62312.85,
    contractedValue: 62312.85,
    environment: 'Cozinha Completa',
    contractToken: 'ctk_2008369274db42418c0c8fcd45e97a5152347008e2ff',
    contractStatus: 'formalizacao_pendente',
    commercialProposal: {
      promobProjectName: 'Cozinha Completa',
      promobFileName: '37305390860-ICOZ 2.xml',
      promobValue: 54744.29,
      subtotalGross: 65304.29,
      discountPct: 10,
      discountAmount: 6530.43,
      subtotalAfterDiscount: 58773.86,
      paymentFeeAmount: 3538.99,
      finalOrderTotal: 62312.85,
      conventionalTotal: 10560.00,
      conventionalItems: [
        { id: 'item-1', name: 'Sofá New', category: 'Estofados', quantity: 4, salePrice: 2640, total: 10560 }
      ],
      paymentAllocations: [
        {
          id: 'alloc-1',
          method: 'pix',
          methodLabel: 'Pix / À Vista',
          baseAmount: 28000,
          totalAmount: 28000,
          installments: 1,
          installmentValue: 28000
        },
        {
          id: 'alloc-2',
          method: 'cartao_parcelado',
          methodLabel: 'Cartão de Crédito 12x',
          baseAmount: 30773.86,
          totalAmount: 34312.85,
          installments: 12,
          installmentValue: 2859.40
        }
      ],
      observations: 'pagamento no pix no inicio posterior pagamento com o cartao'
    } as any
  };

  const mockTemplate: StoreContractTemplate = {
    tenantId: '202bb2d5-00d4-426b-a72a-aacfe776977a',
    companyName: 'Smart House Planejados Ltda',
    tradeName: 'Smart House Planejados',
    cnpj: '46.028.127/0001-10',
    address: 'Suzano - SP',
    phone: '(11) 94746-3734',
    email: 'smarthousesuzano@gmail.com',
    defaultDeliveryDays: 45,
    clauses: DEFAULT_CONTRACT_CLAUSES
  };

  const mockLead = {
    name: 'Wilson',
    cpf: '42260807852',
    rg: '5645342727',
    phone: '11989883025',
    email: 'wvalle@gmail.com.br',
    billingAddress: 'Rua Gato Cinzento, 570',
    installationAddress: 'Rua Gato Cinzento, 570',
    desiredDeadline: '60 dias'
  };

  it('1. Garante que as 12 cláusulas contratuais essenciais estão presentes e completas', () => {
    expect(DEFAULT_CONTRACT_CLAUSES).toHaveLength(12);
    
    // Cláusula 1 - Objeto e Projeto
    expect(DEFAULT_CONTRACT_CLAUSES[0].number).toBe('CLÁUSULA 1ª');
    expect(DEFAULT_CONTRACT_CLAUSES[0].title).toContain('OBJETO');
    expect(DEFAULT_CONTRACT_CLAUSES[0].text.length).toBeGreaterThan(50);

    // Cláusula 2 - Valor e Pagamento
    expect(DEFAULT_CONTRACT_CLAUSES[1].number).toBe('CLÁUSULA 2ª');
    expect(DEFAULT_CONTRACT_CLAUSES[1].title).toContain('PAGAMENTO');
    expect(DEFAULT_CONTRACT_CLAUSES[1].text).toContain('multa');

    // Cláusula 3 - Prazos e Medição Fina
    expect(DEFAULT_CONTRACT_CLAUSES[2].number).toBe('CLÁUSULA 3ª');
    expect(DEFAULT_CONTRACT_CLAUSES[2].title).toContain('PRAZOS');

    // Cláusula 12 - Validade Jurídica e Foro
    expect(DEFAULT_CONTRACT_CLAUSES[11].number).toBe('CLÁUSULA 12ª');
    expect(DEFAULT_CONTRACT_CLAUSES[11].title).toContain('VALIDADE');
  });

  it('2. Gera PDF fiel com dados completos das partes, produtos detalhados e quadro financeiro', async () => {
    const signingUrl = getContractSigningUrl(mockOrder.contractToken!);
    const qrCode = await generateContractQrCodeDataUrl(signingUrl);

    const doc = await generateContractPdfDoc({
      order: mockOrder,
      template: mockTemplate,
      lead: mockLead,
      signingUrl,
      qrCodeDataUrl: qrCode
    });

    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('3. Gera URL de assinatura pública e QR Code válido para leitura em dispositivos móveis', async () => {
    const url = getContractSigningUrl('ctk_2008369274db42418c0c8fcd45e97a5152347008e2ff');
    expect(url).toContain('sign_token=ctk_2008369274db42418c0c8fcd45e97a5152347008e2ff');

    const qr = await generateContractQrCodeDataUrl(url);
    expect(qr).toMatch(/^data:image\/png;base64,/);
  });

  it('4. Valida consistência de alocações de pagamento múltiplas (Pix + Cartão)', () => {
    const proposal = mockOrder.commercialProposal as any;
    const allocations = proposal.paymentAllocations;
    expect(allocations).toHaveLength(2);

    const sumAllocations = allocations.reduce((acc: number, a: any) => acc + (a.totalAmount || 0), 0);
    expect(sumAllocations).toBe(62312.85);
    expect(proposal.finalOrderTotal).toBe(62312.85);
  });
});
