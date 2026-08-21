export type Role = 'consumer' | 'merchant' | 'admin';

export interface AdditionalItemOption {
  id: string;
  title: string;
  description: string;
  extraCost: number;
}

export interface SimulatorState {
  step: number;
  environmentId: string;
  selectedFurnitureModuleIds: string[];
  moduleCustomDimensions?: Record<string, number>; // ex: { 'cozinha_balcao': 1.4, 'cozinha_torre': 0.6 }
  placedModules: PlacedModule[];
  wallDimensions?: WallDimensions;
  wallAssignments?: WallAssignments;
  layoutTypeId: 'reta' | 'em_l' | 'em_u' | 'com_ilha';
  doorTypeId: string;
  dimensions: {
    length: number; // meters
    height: number; // meters
    width: number;  // meters
  };
  finishId: string;
  hardwareId: string;
  additionalItemIds: string[];
  location: {
    cep: string;
    city: string;
    state: string;
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
  environment: string;
  furnitureModules?: string[];
  layoutType?: string;
  doorType?: string;
  dimensions: {
    length: number;
    height: number;
    width: number;
    areaM2: number;
  };
  finishPattern: string;
  hardwareLevel: string;
  additionalItems: string[];
  estimatedMin: number;
  estimatedMax: number;
  assignedStoreId: string;
  assignedStoreName: string;
  status: LeadStatus;
  createdAt: string;
}

export interface StorePlanTier {
  id: 'Gold' | 'Platinum' | 'Diamond';
  title: string;
  priceMonthly: number;
  leadsCap: string;
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
  plan: 'Gold' | 'Platinum' | 'Diamond';
  regionServed: string;
  status: 'Ativa' | 'Pendente' | 'Inativa';
  leadsCount: number;
  phone: string;
  whatsapp?: string;
  email: string;
  monthlyRevenue?: number;
  contractDate?: string;
}

export interface RegionStat {
  state: string;
  stateCode: string;
  name: string;
  leadsCount: number;
  storesCount: number;
  totalVolume: number;
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

export interface WallDimensions {
  wallA: number; // Parede A / Esquerda (em metros, ex: 2.2)
  wallB: number; // Parede B / Fundo (em metros, ex: 3.5)
  wallC: number; // Parede C / Direita (em metros, ex: 2.0)
  height: number; // Pé-direito piso ao teto (em metros, ex: 2.7)
}

export interface WallAssignments {
  wallAModules: string[]; // Módulos na Parede A (ex: torre_quente, paneleiro)
  wallBModules: string[]; // Módulos na Parede B (ex: balcao_pia, aereos)
  wallCModules: string[]; // Módulos na Parede C (ex: cooktop, gaveteiro)
}

export interface PlacedModule {
  id: string;
  moduleId: string;
  title: string;
  category: 'base' | 'aereo' | 'torre' | 'ilha' | 'painel' | 'closet';
  wall?: 'wallA' | 'wallB' | 'wallC';
  widthMm: number;  // em milímetros (ex: 800mm)
  heightMm: number; // em milímetros (ex: 720mm)
  depthMm: number;  // em milímetros (ex: 600mm)
  drawersCount?: number;
  doorsCount?: number;
  hasGlass?: boolean;
}


