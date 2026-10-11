import { supabase } from './supabase';
import { calculateSimulationBudget, PricingRuleParameters } from './pricingEngine';
import { lookupCep } from './cepService';
import { ClientContactSchema } from './validations';

export interface SimulationSubmissionPayload {
  clientInfo: {
    name: string;
    phone: string;
    cep: string;
    email?: string;
  };
  environments: Array<{
    id?: string;
    typeId: string;
    name: string;
    areaM2: number;
    ceilingHeight: number;
    wallCount: 1 | 2 | 3 | 4;
  }>;
}

export interface SimulationSubmissionResult {
  success: boolean;
  simulationId: string;
  leadId: string;
  assignedStoreId?: string;
  assignedStoreName?: string;
  assignmentReason?: string;
  distributionStatus: 'atribuido' | 'sem_cobertura';
  budgetMin: number;
  budgetMax: number;
  totalEstimatedFurnitureM2: number;
  city: string;
  state: string;
  error?: string;
}

export interface SimulationProposalDetail {
  simulationId: string;
  clientName: string;
  cityName: string;
  stateUf: string;
  calculatedMin: number;
  calculatedMax: number;
  createdAt: string;
  pricingVersion: number;
  environments: Array<{
    id: string;
    typeId: string;
    name: string;
    areaM2: number;
    ceilingHeight: number;
    wallCount: number;
  }>;
}

/**
 * Obtém a versão ativa de precificação do banco de dados (tabela pricing_rules).
 */
export async function getActivePricingRule(): Promise<{
  id: string;
  version: number;
  params: PricingRuleParameters;
}> {
  const defaultRule = {
    id: '00000000-0000-0000-0000-000000000001',
    version: 1,
    params: {
      baseM2Price: 1200,
      marginMinFactor: 0.88,
      marginMaxFactor: 1.15,
      furnitureCoverageRatio: 0.75,
      maxEffectiveHeight: 2.6,
    },
  };

  try {
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('id, version, base_m2_price, margin_min_factor, margin_max_factor, furniture_coverage_ratio, max_effective_height')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return defaultRule;
    }

    return {
      id: data.id,
      version: data.version,
      params: {
        baseM2Price: Number(data.base_m2_price) || 1200,
        marginMinFactor: Number(data.margin_min_factor) || 0.88,
        marginMaxFactor: Number(data.margin_max_factor) || 1.15,
        furnitureCoverageRatio: Number(data.furniture_coverage_ratio) || 0.75,
        maxEffectiveHeight: Number(data.max_effective_height) || 2.6,
      },
    };
  } catch {
    return defaultRule;
  }
}

/**
 * Submete a simulação completa:
 * 1. Valida contatos e limites dos ambientes via Zod.
 * 2. Resolve o CEP e código IBGE do município (ViaCEP/BrasilAPI -> ibge_cities).
 * 3. Executa a procedure transacional no PostgreSQL (`submit_consumer_simulation`):
 *    - Calcula orçamento oficial utilizando a regra ativa de precificação do banco.
 *    - Salva a simulação e os ambientes com integridade referencial.
 *    - Cria o lead comercial.
 *    - Roteia transacionalmente via Round Robin / Cobertura Regional / Fila sem Cobertura.
 * 4. Retorna o resultado certificado para exibição imediata ao consumidor.
 */
export async function submitSimulationAndLead(
  payload: SimulationSubmissionPayload
): Promise<SimulationSubmissionResult> {
  // 1. Validação de Contato no cliente
  const contactValidation = ClientContactSchema.safeParse(payload.clientInfo);
  if (!contactValidation.success) {
    return {
      success: false,
      simulationId: '',
      leadId: '',
      distributionStatus: 'sem_cobertura',
      budgetMin: 0,
      budgetMax: 0,
      totalEstimatedFurnitureM2: 0,
      city: '',
      state: '',
      error: contactValidation.error.issues[0]?.message || 'Dados de contato inválidos.',
    };
  }

  if (!payload.environments || payload.environments.length === 0) {
    return {
      success: false,
      simulationId: '',
      leadId: '',
      distributionStatus: 'sem_cobertura',
      budgetMin: 0,
      budgetMax: 0,
      totalEstimatedFurnitureM2: 0,
      city: '',
      state: '',
      error: 'Adicione pelo menos um cômodo ao seu projeto.',
    };
  }

  // 2. Resolução de CEP e Município
  const cepResult = await lookupCep(payload.clientInfo.cep);
  if (!cepResult.success) {
    return {
      success: false,
      simulationId: '',
      leadId: '',
      distributionStatus: 'sem_cobertura',
      budgetMin: 0,
      budgetMax: 0,
      totalEstimatedFurnitureM2: 0,
      city: '',
      state: '',
      error: cepResult.error || 'CEP inválido ou não localizado.',
    };
  }

  // 3. Execução Transacional no PostgreSQL via Stored Procedure Segura
  try {
    const { data, error } = await supabase.rpc('submit_consumer_simulation', {
      p_client_name: payload.clientInfo.name.trim(),
      p_client_phone: payload.clientInfo.phone.trim(),
      p_client_cep: cepResult.cep,
      p_city_ibge_code: cepResult.ibgeCode,
      p_city_name: cepResult.city,
      p_state_uf: cepResult.state,
      p_environments: payload.environments.map((e) => ({
        typeId: e.typeId,
        name: e.name,
        areaM2: e.areaM2,
        ceilingHeight: e.ceilingHeight,
        wallCount: e.wallCount,
      })),
      p_client_email: payload.clientInfo.email?.trim() || null,
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'AutomatedTest/Node',
    });

    if (error || !data) {
      console.error('[simulationService] Erro na procedure submit_consumer_simulation:', error);
      return {
        success: false,
        simulationId: '',
        leadId: '',
        distributionStatus: 'sem_cobertura',
        budgetMin: 0,
        budgetMax: 0,
        totalEstimatedFurnitureM2: 0,
        city: cepResult.city,
        state: cepResult.state,
        error: error?.message || 'Falha ao processar simulação no servidor.',
      };
    }

    const distributionStatus: 'atribuido' | 'sem_cobertura' =
      data.distribution_status === 'atribuido' ? 'atribuido' : 'sem_cobertura';

    return {
      success: true,
      simulationId: data.simulation_id,
      leadId: data.lead_id,
      assignedStoreId: data.assigned_store_id || undefined,
      assignedStoreName: data.assigned_store_name || undefined,
      assignmentReason: data.assignment_reason || undefined,
      distributionStatus,
      budgetMin: Number(data.budget_min),
      budgetMax: Number(data.budget_max),
      totalEstimatedFurnitureM2: Number(data.total_furniture_m2),
      city: data.city,
      state: data.state,
    };
  } catch (err: any) {
    console.error('[simulationService] Exceção ao submeter simulação:', err);
    return {
      success: false,
      simulationId: '',
      leadId: '',
      distributionStatus: 'sem_cobertura',
      budgetMin: 0,
      budgetMax: 0,
      totalEstimatedFurnitureM2: 0,
      city: cepResult.city,
      state: cepResult.state,
      error: err?.message || 'Erro inesperado na comunicação com o banco.',
    };
  }
}

/**
 * Consulta os dados de uma proposta oficial previamente gerada.
 */
export async function fetchSimulationProposal(
  simulationId: string
): Promise<SimulationProposalDetail | null> {
  try {
    const { data, error } = await supabase.rpc('get_simulation_proposal', {
      p_simulation_id: simulationId,
    });

    if (error || !data || !data.success) {
      return null;
    }

    return {
      simulationId: data.simulation_id,
      clientName: data.client_name,
      cityName: data.city_name,
      stateUf: data.state_uf,
      calculatedMin: Number(data.calculated_min),
      calculatedMax: Number(data.calculated_max),
      createdAt: data.created_at,
      pricingVersion: Number(data.pricing_version),
      environments: (data.environments || []).map((env: any) => ({
        id: env.id,
        typeId: env.type_id,
        name: env.name,
        areaM2: Number(env.area_m2),
        ceilingHeight: Number(env.ceiling_height),
        wallCount: Number(env.wall_count),
      })),
    };
  } catch {
    return null;
  }
}
