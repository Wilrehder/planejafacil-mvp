import { describe, it, expect } from 'vitest';
import { recalculateCommercialProposal } from '../lib/commercialProposalHelper';
import { CommercialProposal } from '../types';

describe('Commercial Proposal Aggregation Engine', () => {
  const baseProposal: CommercialProposal = {
    promobValue: 22556.31,
    conventionalTotal: 0,
    subtotal: 22556.31,
    subtotalGross: 22556.31,
    discountPct: 10,
    discountPercentage: 10,
    discountAmount: 2255.63,
    discountValue: 2255.63,
    subtotalAfterDiscount: 20300.68,
    priceAfterDiscount: 20300.68,
    paymentMethod: 'pix',
    paymentMethodLabel: 'Pix / Transferência',
    installments: 1,
    installmentValue: 20301,
    paymentFeePct: 0,
    transactionFeePercentage: 0,
    paymentFeeAmount: 0,
    transactionFeeAmount: 0,
    passFeeToClient: false,
    finalOrderTotal: 20301,
    netStoreReceives: 20300.68,
    estimatedCost: 8500,
    promobCost: 8500,
    estimatedProfit: 11800.68,
    conventionalItems: [],
    calculatedAt: '2026-11-08T18:00:00Z',
  };

  it('deve agregar móvel convencional avulso (sofá R$ 2.640) somando ao Promob com desconto de 10%', () => {
    const updated = recalculateCommercialProposal(baseProposal, [
      {
        id: 'furn-1',
        name: 'Sofá New Conforto 3 Lugares',
        quantity: 1,
        salePrice: 2640,
        total: 2640,
        category: 'Estofados',
      },
    ]);

    expect(updated.promobValue).toBe(22556.31);
    expect(updated.conventionalTotal).toBe(2640);
    // Subtotal = 22556.31 + 2640 = 25196.31
    expect(updated.subtotalGross).toBe(25196.31);
    // Desconto 10% de 25196.31 = 2519.63
    expect(updated.discountAmount).toBe(2519.63);
    // Preço após desconto = 25196.31 - 2519.63 = 22676.68
    expect(updated.subtotalAfterDiscount).toBe(22676.68);
    // finalOrderTotal arredondado
    expect(updated.finalOrderTotal).toBe(22677);
    expect(updated.conventionalItems?.length).toBe(1);
  });

  it('deve atualizar o valor quando o móvel convencional for removido', () => {
    const withFurniture = recalculateCommercialProposal(baseProposal, [
      {
        id: 'furn-1',
        name: 'Sofá New',
        quantity: 1,
        salePrice: 2640,
        total: 2640,
      },
    ]);

    const removed = recalculateCommercialProposal(withFurniture, []);
    expect(removed.conventionalTotal).toBe(0);
    expect(removed.subtotalGross).toBe(22556.31);
    expect(removed.finalOrderTotal).toBe(20301);
  });
});
