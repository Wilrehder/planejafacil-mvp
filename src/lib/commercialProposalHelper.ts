import { CommercialProposal } from '../types';

export interface ConventionalFurnitureItemInput {
  id: string;
  name: string;
  quantity: number;
  salePrice: number;
  total: number;
  category?: string;
}

/**
 * Recalcula a Proposta Comercial Consolidada mantendo as regras de desconto e taxas
 * ao adicionar ou remover móveis convencionais da negociação.
 */
export function recalculateCommercialProposal(
  currentProposal: CommercialProposal,
  updatedConventionalItems: ConventionalFurnitureItemInput[]
): CommercialProposal {
  const conventionalTotal = updatedConventionalItems.reduce(
    (acc, curr) => acc + (curr.total || (curr.salePrice * curr.quantity) || 0),
    0
  );

  const promobValue = currentProposal.promobValue || 0;
  const subtotalGross = Math.round((promobValue + conventionalTotal) * 100) / 100;

  const discountPercentage = Math.min(
    Math.max(
      currentProposal.discountPct !== undefined ? currentProposal.discountPct : (currentProposal.discountPercentage || 0),
      0
    ),
    100
  );

  const discountValue = Math.round(((subtotalGross * discountPercentage) / 100) * 100) / 100;
  const priceAfterDiscount = Math.max(0, Math.round((subtotalGross - discountValue) * 100) / 100);

  const feePct = currentProposal.paymentFeePct !== undefined 
    ? currentProposal.paymentFeePct 
    : (currentProposal.transactionFeePercentage || 0);

  const transactionFeeAmount = Math.round(((priceAfterDiscount * feePct) / 100) * 100) / 100;

  let finalOrderTotal = priceAfterDiscount;
  if (currentProposal.passFeeToClient) {
    finalOrderTotal = Math.round(priceAfterDiscount + transactionFeeAmount);
  } else {
    finalOrderTotal = Math.round(priceAfterDiscount);
  }

  const installments = Math.max(1, currentProposal.installments || 1);
  const installmentValue = Math.round((finalOrderTotal / installments) * 100) / 100;

  // Lucro líquido estimado para a loja
  const promobCost = currentProposal.promobCost || 0;
  const netStoreReceives = currentProposal.passFeeToClient 
    ? priceAfterDiscount 
    : priceAfterDiscount - transactionFeeAmount;
  const estimatedProfit = Math.round((netStoreReceives - promobCost) * 100) / 100;

  return {
    ...currentProposal,
    conventionalTotal,
    subtotal: subtotalGross,
    subtotalGross,
    discountPct: discountPercentage,
    discountPercentage,
    discountAmount: discountValue,
    discountValue,
    subtotalAfterDiscount: priceAfterDiscount,
    priceAfterDiscount,
    paymentFeePct: feePct,
    transactionFeePercentage: feePct,
    paymentFeeAmount: transactionFeeAmount,
    transactionFeeAmount,
    finalOrderTotal,
    installmentValue,
    netStoreReceives,
    estimatedCost: promobCost,
    estimatedProfit: currentProposal.promobCost ? estimatedProfit : (currentProposal.estimatedProfit || 0),
    conventionalItems: [...updatedConventionalItems],
    calculatedAt: new Date().toISOString(),
  };
}
