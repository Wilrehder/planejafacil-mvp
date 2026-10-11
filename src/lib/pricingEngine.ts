export interface EnvironmentCalculationInput {
  areaM2: number;
  ceilingHeight: number;
  wallCount: 1 | 2 | 3 | 4;
}

export interface PricingRuleConfig {
  baseM2Price: number;
  marginMinFactor?: number; // default 0.88 (-12%)
  marginMaxFactor?: number; // default 1.15 (+15%)
  furnitureCoverageRatio?: number; // default 0.75 (75%)
  maxEffectiveHeight?: number; // default 2.60m
}

export type PricingRuleParameters = PricingRuleConfig;

export interface CalculationResult {
  totalEstimatedFurnitureM2: number;
  totalRawCost: number;
  min: number;
  max: number;
}

/**
 * Motor oficial de cálculo de orçamento do PlanejaFácil.
 * Implementa a fórmula especificada em docs/BUSINESS_RULES.md
 */
export function calculateSimulationBudget(
  environments: EnvironmentCalculationInput[],
  config: PricingRuleConfig = { baseM2Price: 1200 }
): CalculationResult {
  if (!environments || environments.length === 0) {
    return {
      totalEstimatedFurnitureM2: 0,
      totalRawCost: 0,
      min: 0,
      max: 0,
    };
  }

  const basePrice = config.baseM2Price || 1200;
  const minFactor = config.marginMinFactor ?? 0.88;
  const maxFactor = config.marginMaxFactor ?? 1.15;
  const coverageRatio = config.furnitureCoverageRatio ?? 0.75;
  const maxHeight = config.maxEffectiveHeight ?? 2.6;

  let totalRawCost = 0;
  let totalFurnitureM2 = 0;

  for (const env of environments) {
    const area = Math.max(1, env.areaM2 || 12);
    const walls = env.wallCount || 3;
    const ceiling = env.ceilingHeight || 2.7;

    // 1. Projeção linear das paredes
    const sideLength = Math.sqrt(area);
    const totalWallLinearLength = sideLength * walls;

    // 2. Altura útil de marcenaria (clamped a 2.6m padrão)
    const effectiveHeight = Math.min(ceiling, maxHeight);

    // 3. Área estimada de móveis (75% da parede coberta com móveis)
    const furnitureM2 = totalWallLinearLength * effectiveHeight * coverageRatio;

    totalFurnitureM2 += furnitureM2;
    totalRawCost += furnitureM2 * basePrice;
  }

  // 4. Arredondamento para centenas inteiras com margens comerciais
  const min = Math.round((totalRawCost * minFactor) / 100) * 100;
  const max = Math.round((totalRawCost * maxFactor) / 100) * 100;

  return {
    totalEstimatedFurnitureM2: Math.round(totalFurnitureM2 * 10) / 10,
    totalRawCost: Math.round(totalRawCost),
    min,
    max,
  };
}
