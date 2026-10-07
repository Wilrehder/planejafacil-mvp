export type Role = 'consumer' | 'merchant' | 'admin';

export type EnvironmentTypeId = 
  | 'cozinha'
  | 'sala'
  | 'quarto'
  | 'closet'
  | 'office'
  | 'banheiro'
  | 'lavanderia'
  | 'gourmet'
  | 'painel'
  | 'outro';

export type WallId = 'wallA' | 'wallB' | 'wallC' | 'wallD';

export interface WallConfig {
  id: WallId;
  label: string; // 'Parede A', 'Parede B', etc.
  length: number; // em metros (ex: 3.5m)
  selectedFurnitureTypes: string[]; // ex: ['armario_inferior', 'armario_aereo']
  selectedSpecificItems: string[]; // ex: ['torre_quente', 'ilha']
}

export interface ConfiguredEnvironment {
  id: string; // ex: 'env-171283921'
  typeId: EnvironmentTypeId;
  name: string; // ex: 'Cozinha Principal', 'Quarto Casal'
  areaM2: number;
  ceilingHeight?: number; // Pé-direito em metros (ex: 2.7m)
  wallCount: 1 | 2 | 3 | 4;
  walls: WallConfig[];
}

export type QualityTierId = 'economico' | 'intermediario' | 'premium' | 'alto_padrao';
export type FinishTypeId = 'branco' | 'madeirado' | 'colorido' | 'laca' | 'nao_sei';
export type PurchaseTimelineId = 'imediatamente' | 'ate_3_meses' | 'entre_3_6_meses' | 'pesquisando';

export interface SimulatorState {
  step: number; // 1: Lista/Seleção de Ambientes, 2: Info do Ambiente Atual, 3: Configuração das Paredes, 4: Padrão/Acabamento/Cliente, 5: Orçamento Final
  currentEditingEnvId: string | null;
  environments: ConfiguredEnvironment[];
  qualityTierId: QualityTierId;
  finishTypeId: FinishTypeId;
  purchaseTimelineId: PurchaseTimelineId;
  clientInfo: {
    name: string;
    phone: string;
    email: string;
    cep: string;
    city: string;
    state?: string;
  };
  calculatedRange: {
    min: number;
    max: number;
  };
}

export type AdminTab = 'dashboard' | 'leads' | 'stores' | 'regions' | 'reports' | 'financial' | 'settings';
export type MerchantTab = 'dashboard' | 'leads' | 'settings';
export type LeadStatus = 'novo' | 'em_atendimento' | 'orcado' | 'convertido' | 'perdido';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  state: string;
  cep: string;
  environment: string; // ex: "Cozinha (3.5m²), Quarto Casal (12m²)"
  qualityTier?: string;
  finishPattern?: string;
  hardwareLevel?: string;
  purchaseTimeline?: string;
  additionalItems?: string[];
  furnitureModules?: string[];
  layoutType?: string;
  doorType?: string;
  dimensions?: {
    length: number;
    height: number;
    width: number;
    areaM2: number;
  };
  environmentsData?: ConfiguredEnvironment[];
  source?: 'plataforma' | 'instagram' | 'google' | 'indicacao' | 'balcao';
  isExternal?: boolean;
  estimatedMin: number;
  estimatedMax: number;
  assignedStoreId: string;
  assignedStoreName: string;
  status: LeadStatus;
  createdAt: string;
}

export interface StorePlanTier {
  id: 'Basic' | 'Pro';
  title: string;
  priceMonthly: number;
  costPerLead: number;
  regionCoverage: string;
  badge?: string;
  features: string[];
}

export interface Store {
  id: string;
  name: string;
  cnpj?: string;
  responsibleName?: string;
  city: string;
  state: string;
  plan: 'Basic' | 'Pro';
  regionServed: string;
  status: 'Ativa' | 'Pendente' | 'Inativa';
  leadsCount: number;
  phone: string;
  whatsapp?: string;
  email: string;
  monthlyRevenue?: number;
  contractDate?: string;
}

export interface PartnerStoreApplication {
  id: string;
  storeName: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  desiredPlan?: 'Basic' | 'Pro';
  notes?: string;
  status: 'nova' | 'em_contato' | 'aprovada' | 'recusada';
  createdAt: string;
}

export interface RegionStat {
  state: string;
  stateCode: string;
  name: string;
  leadsCount: number;
  storesCount: number;
  totalVolume: number;
}

// Intermediary Legacy Types for Catalog Support
export interface AdditionalItemOption {
  id: string;
  title: string;
  description: string;
  extraCost: number;
}

export interface FurnitureModuleOption {
  id: string;
  environmentId: string;
  title: string;
  description: string;
  extraMultiplier: number;
}

export interface LayoutOption {
  id: 'reta' | 'em_l' | 'em_u' | 'com_ilha';
  title: string;
  subtitle: string;
  multiplier: number;
}

export interface DoorTypeOption {
  id: string;
  title: string;
  description: string;
  multiplier: number;
}

export interface EnvironmentOption {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  baseMultiplier: number;
}

export interface FinishOption {
  id: string;
  title: string;
  description: string;
  multiplier: number;
  tag?: string;
}

export interface HardwareOption {
  id: string;
  title: string;
  description: string;
  multiplier: number;
  brand: string;
}

export interface PlacedModule {
  id: string;
  moduleId: string;
  title: string;
  category: 'base' | 'aereo' | 'torre' | 'ilha' | 'painel' | 'closet';
  wall?: 'wallA' | 'wallB' | 'wallC';
  widthMm: number;
  heightMm: number;
  depthMm: number;
  drawersCount?: number;
  doorsCount?: number;
  hasGlass?: boolean;
}

export interface WallDimensions {
  wallA: number;
  wallB: number;
  wallC: number;
  height: number;
}

export interface WallAssignments {
  wallAModules: string[];
  wallBModules: string[];
  wallCModules: string[];
}
