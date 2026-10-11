import { describe, it, expect } from 'vitest';
import { calculateSimulationBudget } from '../lib/pricingEngine';

describe('Motor de Precificação (Pricing Engine)', () => {
  it('deve retornar zeros para lista vazia de ambientes', () => {
    const result = calculateSimulationBudget([]);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
    expect(result.totalEstimatedFurnitureM2).toBe(0);
  });

  it('deve calcular corretamente para uma cozinha de 12m² com 3 paredes e pé-direito 2.7m (clamped a 2.6m)', () => {
    // Com 12m², raiz = 3.4641m
    // 3 paredes = 10.3923m linear
    // Altura efetiva = min(2.7, 2.6) = 2.6m
    // Área móveis = 10.3923 * 2.6 * 0.75 = 20.265m²
    // Custo base a R$ 1.200/m² = 20.265 * 1200 = R$ 24.318
    // Min (-12%) = 24.318 * 0.88 = R$ 21.400 arredondado
    // Max (+15%) = 24.318 * 1.15 = R$ 28.000 arredondado
    const result = calculateSimulationBudget(
      [{ areaM2: 12, ceilingHeight: 2.7, wallCount: 3 as const }],
      { baseM2Price: 1200 }
    );

    expect(result.totalEstimatedFurnitureM2).toBeCloseTo(20.3, 1);
    expect(result.min).toBeGreaterThan(20000);
    expect(result.max).toBeGreaterThan(result.min);
    expect(result.min % 100).toBe(0); // Arredondado para centenas inteiras
    expect(result.max % 100).toBe(0);
  });

  it('deve respeitar a versão da regra de preço quando o Admin altera o valor do m²', () => {
    const envs = [{ areaM2: 15, ceilingHeight: 2.5, wallCount: 2 as const }];
    const budgetRegra1 = calculateSimulationBudget(envs, { baseM2Price: 1200 });
    const budgetRegra2 = calculateSimulationBudget(envs, { baseM2Price: 1400 });

    expect(budgetRegra2.min).toBeGreaterThan(budgetRegra1.min);
    expect(budgetRegra2.max).toBeGreaterThan(budgetRegra1.max);
  });

  it('deve calcular múltiplos ambientes acumulando metragens', () => {
    const multiEnvs = [
      { areaM2: 12, ceilingHeight: 2.7, wallCount: 3 as const }, // Cozinha
      { areaM2: 16, ceilingHeight: 2.7, wallCount: 2 as const }, // Quarto
    ];

    const singleEnv = [{ areaM2: 12, ceilingHeight: 2.7, wallCount: 3 as const }];

    const multiResult = calculateSimulationBudget(multiEnvs);
    const singleResult = calculateSimulationBudget(singleEnv);

    expect(multiResult.totalEstimatedFurnitureM2).toBeGreaterThan(singleResult.totalEstimatedFurnitureM2);
    expect(multiResult.min).toBeGreaterThan(singleResult.min);
  });
});
