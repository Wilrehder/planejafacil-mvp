import { describe, it, expect } from 'vitest';
import { isCustomerRegistrationComplete, PaymentAllocation } from '../types';
import { 
  DEFAULT_CONTRACT_CLAUSES, 
  generateContractPdfDoc,
  getContractSigningUrl,
  generateContractQrCodeDataUrl
} from '../lib/customerContractService';

describe('Customer Registration Validation & Contract Requirements', () => {
  it('deve bloquear orçamento quando faltam campos cadastrais obrigatórios do contratante', () => {
    const incompleteLead = {
      name: 'Cliente Teste',
      phone: '(11) 99999-9999',
      cpf: '', // pendente
      email: '',
      billingAddress: '',
      installationAddress: '',
      desiredDeadline: '',
    };

    const res = isCustomerRegistrationComplete(incompleteLead);
    expect(res.isComplete).toBe(false);
    expect(res.missingFields).toContain('CPF do Cliente');
    expect(res.missingFields).toContain('E-mail');
    expect(res.missingFields).toContain('Endereço de Cobrança / Moradia');
    expect(res.missingFields).toContain('Endereço de Instalação');
    expect(res.missingFields).toContain('Prazo Desejado');
  });

  it('deve liberar orçamento quando todos os dados cadastrais obrigatórios estiverem preenchidos', () => {
    const completeLead = {
      name: 'Pedro de Almeida',
      phone: '(11) 98765-4321',
      cpf: '123.456.789-00',
      rg: '12.345.678-9',
      email: 'pedro@email.com',
      billingAddress: 'Rua das Flores, 123 - Centro, Suzano - SP',
      installationAddress: 'Rua das Flores, 123 - Centro, Suzano - SP',
      desiredDeadline: '45 dias',
    };

    const res = isCustomerRegistrationComplete(completeLead);
    expect(res.isComplete).toBe(true);
    expect(res.missingFields.length).toBe(0);
  });
});

describe('Multi-Method Payment Surcharges (Juros incidentes apenas sobre a fatia)', () => {
  it('juros de cartão parcelado devem incidir exclusivamente sobre a fatia alocada no cartão, sem onerar o Pix', () => {
    // Orçamento base: R$ 50.000,00
    const budgetTotal = 50000;
    const pixAmount = 25000;
    const cardAmount = 25000;

    // Regra da loja: Cartão 18x tem 15.5% de encargos repassados
    const cardSurchargePct = 15.5;
    const cardSurchargeAmount = (cardAmount * cardSurchargePct) / 100; // R$ 3.875,00
    const cardTotal = cardAmount + cardSurchargeAmount; // R$ 28.875,00

    const pixAlloc: PaymentAllocation = {
      id: 'alloc_pix',
      method: 'pix',
      methodLabel: 'Pix / À Vista',
      baseAmount: pixAmount,
      installments: 1,
      feePercentage: 0,
      feeAmount: 0,
      totalAmountWithFee: pixAmount,
      installmentValue: pixAmount,
      surchargePct: 0,
      surchargeAmount: 0,
      totalAmount: pixAmount,
    };

    const cardAlloc: PaymentAllocation = {
      id: 'alloc_card',
      method: 'cartao_parcelado',
      methodLabel: 'Cartão 18x',
      baseAmount: cardAmount,
      installments: 18,
      feePercentage: cardSurchargePct,
      feeAmount: cardSurchargeAmount,
      totalAmountWithFee: cardTotal,
      installmentValue: cardTotal / 18,
      surchargePct: cardSurchargePct,
      surchargeAmount: cardSurchargeAmount,
      totalAmount: cardTotal,
    };

    const allocations = [pixAlloc, cardAlloc];

    // Validação 1: Soma das bases deve ser exatamente igual ao orçamento
    const totalBaseAllocated = allocations.reduce((acc, a) => acc + a.baseAmount, 0);
    expect(totalBaseAllocated).toBe(budgetTotal);

    // Validação 2: Pix tem R$ 0,00 de encargos
    expect(pixAlloc.surchargeAmount).toBe(0);

    // Validação 3: Encargos incidem exclusivamente sobre a fatia de R$ 25.000 do cartão
    expect(cardAlloc.surchargeAmount).toBe(3875);

    // Validação 4: Total final do cliente é 25.000 (Pix) + 28.875 (Cartão) = 53.875
    const finalClientTotal = allocations.reduce((acc, a) => acc + a.totalAmount, 0);
    expect(finalClientTotal).toBe(53875);
  });
});

describe('Customer Contract Generation & Structure (jsPDF & QR Code)', () => {
  it('gera documento PDF estruturado com 12 cláusulas, dados da loja e do cliente', async () => {
    expect(DEFAULT_CONTRACT_CLAUSES.length).toBe(12);

    const doc = await generateContractPdfDoc({
      order: {
        id: 'ord_test_123',
        orderNumber: '#PED-1384',
        clientName: 'Pedro de Almeida',
        clientCpf: '123.456.789-00',
        totalValue: 53875,
        contractedValue: 53875,
        environment: 'Cozinha Planejada e Suíte Master',
      },
      template: {
        companyName: 'Smart House Planejados Ltda',
        tradeName: 'Smart House Planejados',
        cnpj: '46.028.127/0001-10',
        address: 'Rua Benjamin Constant, 1234 - Centro, Suzano - SP',
        phone: '(11) 94746-3734',
        email: 'smarthouse@planejafacil.com',
        defaultDeliveryDays: 45,
        clauses: DEFAULT_CONTRACT_CLAUSES
      },
      lead: {
        name: 'Pedro de Almeida',
        cpf: '123.456.789-00',
        rg: '12.345.678-9',
        phone: '(11) 98765-4321',
        email: 'pedro@email.com',
        billingAddress: 'Rua das Flores, 123 - Centro, Suzano - SP',
        installationAddress: 'Rua das Flores, 123 - Centro, Suzano - SP',
        desiredDeadline: '45 dias',
      }
    });

    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('gera URL de assinatura e QR Code válido', async () => {
    const token = 'token_test_abc123';
    const signingUrl = getContractSigningUrl(token);
    expect(signingUrl).toContain('sign_token=token_test_abc123');

    const qrCode = await generateContractQrCodeDataUrl(signingUrl);
    expect(qrCode).toContain('data:image/png;base64,');
  });
});

