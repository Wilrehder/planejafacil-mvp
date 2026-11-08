import { describe, it, expect } from 'vitest';
import { parsePromobXML } from '../lib/promobParser';
import { CommercialProposal } from '../types';

describe('Unificação Comercial Promob XML + Móveis Convencionais', () => {
  const samplePromobXml = `<?xml version="1.0" encoding="utf-8"?>
  <CUSTOMERSDATA>
    <DATA ID="nomecliente" VALUE="Juliana Mendonça de Castro" />
    <DATA ID="celular" VALUE="551199882233" />
    <DATA ID="email" VALUE="juliana.castro@gmail.com" />
    <DATA ID="Environment" VALUE="Cozinha Gourmet Integrada" />
  </CUSTOMERSDATA>
  <AMBIENTS>
    <AMBIENT DESCRIPTION="Cozinha Gourmet Luxo" />
  </AMBIENTS>
  <ITEMS>
    <ITEM ID="armario_sup" DESCRIPTION="Armário Superior 3 Portas" />
    <ITEM ID="torre_quente" DESCRIPTION="Torre Quente Forno e Micro" />
    <ITEM ID="ilha_gourmet" DESCRIPTION="Ilha Central em Dekton" />
  </ITEMS>
  <TOTALPRICES TABLE="42000,00" />
  <ORDER VALUE="16800,00" />
  <BUDGET VALUE="38500,00" />`;

  it('1. Deve realizar parse correto do XML do Promob extraindo dados do cliente, projeto e custos', () => {
    const data = parsePromobXML(samplePromobXml);

    expect(data.clientName).toBe('Juliana Mendonça de Castro');
    expect(data.clientPhone).toBe('1199882233');
    expect(data.clientEmail).toBe('juliana.castro@gmail.com');
    expect(data.projectName).toBe('Cozinha Gourmet Luxo');
    expect(data.budgetValue).toBe(38500.00);
    expect(data.factoryOrderCost).toBe(16800.00);
    expect(data.tablePrice).toBe(42000.00);
    expect(data.itemsCount).toBe(3);
  });

  it('2. Deve agregar móveis convencionais ao Promob e calcular desconto comercial sobre o subtotal consolidado', () => {
    const promobData = parsePromobXML(samplePromobXml);
    const promobBudgetValue = promobData.budgetValue; // 38500

    const conventionalItems = [
      { id: 'sofa-1', name: 'Sofá Retrátil 3 Lugares', quantity: 1, salePrice: 4200, total: 4200, category: 'Estofados' },
      { id: 'mesa-1', name: 'Mesa de Jantar com 6 Cadeiras', quantity: 1, salePrice: 3800, total: 3800, category: 'Salas' },
    ];

    const conventionalTotal = conventionalItems.reduce((acc, curr) => acc + curr.total, 0); // 8000
    const grossTotal = promobBudgetValue + conventionalTotal; // 38500 + 8000 = 46500

    const discountPct = 10; // 10%
    const discountAmount = (grossTotal * discountPct) / 100; // 4650
    const priceAfterDiscount = grossTotal - discountAmount; // 41850

    // Meio de pagamento: Cartão Parcelado em 10x com taxa de maquininha de 10.17% (3.5% base + 8% * 10/12)
    const cardTaxPct = 3.5 + (8.0 * (10 / 12));
    const passFeeToClient = true;
    const feeAdded = (priceAfterDiscount * cardTaxPct) / 100;
    const finalOrderTotal = Math.round(priceAfterDiscount + feeAdded);

    const proposal: CommercialProposal = {
      promobValue: promobBudgetValue,
      promobCost: promobData.factoryOrderCost,
      promobFileName: 'orcamento_juliana_cozinha.xml',
      promobProjectName: promobData.projectName,
      conventionalTotal,
      conventionalItems,
      subtotal: grossTotal,
      discountPct,
      discountAmount,
      subtotalAfterDiscount: priceAfterDiscount,
      paymentMethod: 'cartao_parcelado',
      paymentMethodLabel: 'Cartão 10x',
      installments: 10,
      installmentValue: finalOrderTotal / 10,
      paymentFeePct: cardTaxPct,
      paymentFeeAmount: (finalOrderTotal * cardTaxPct) / 100,
      passFeeToClient,
      finalOrderTotal,
      netStoreReceives: finalOrderTotal - ((finalOrderTotal * cardTaxPct) / 100),
      estimatedCost: promobData.factoryOrderCost,
      estimatedProfit: (finalOrderTotal - ((finalOrderTotal * cardTaxPct) / 100)) - promobData.factoryOrderCost,
      approvedAt: new Date().toISOString(),
    };

    expect(proposal.promobValue).toBe(38500);
    expect(proposal.conventionalTotal).toBe(8000);
    expect(proposal.subtotal).toBe(46500);
    expect(proposal.discountAmount).toBe(4650);
    expect(proposal.subtotalAfterDiscount).toBe(41850);
    expect(proposal.finalOrderTotal).toBeGreaterThan(41850); // taxa repassada
    expect(proposal.conventionalItems).toHaveLength(2);
    expect(proposal.estimatedProfit).toBeGreaterThan(0);
  });
});
