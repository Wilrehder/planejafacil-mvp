import React, { createContext, useContext, useState } from 'react';
import confetti from 'canvas-confetti';
import { INITIAL_LEADS, INITIAL_STORES, QUALITY_TIERS } from '../data/mockData';
import { 
  AdminTab, 
  ConfiguredEnvironment, 
  EnvironmentTypeId, 
  Lead, 
  LeadStatus, 
  MerchantTab, 
  PlacedModule, 
  Role, 
  SimulatorState, 
  Store, 
  WallConfig, 
  WallId 
} from '../types';

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  merchantTab: MerchantTab;
  setMerchantTab: (tab: MerchantTab) => void;
  consumerTab: 'landing' | 'simulator';
  setConsumerTab: (tab: 'landing' | 'simulator') => void;
  
  // Leads & Stores data
  leads: Lead[];
  stores: Store[];
  addLead: (leadData: Omit<Lead, 'id' | 'createdAt' | 'assignedStoreId' | 'assignedStoreName' | 'status'>) => Lead;
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  addStore: (newStore: Omit<Store, 'id' | 'leadsCount'>) => void;

  // Multi-Environment Simulator
  simulator: SimulatorState;
  updateSimulator: (updates: Partial<SimulatorState>) => void;
  addEnvironment: (typeId: EnvironmentTypeId, name: string, areaM2: number, wallCount: 1 | 2 | 3 | 4, ceilingHeight?: number) => ConfiguredEnvironment;
  updateEnvironment: (envId: string, updates: Partial<ConfiguredEnvironment>) => void;
  removeEnvironment: (envId: string) => void;
  updateEnvironmentWall: (envId: string, wallId: WallId, wallData: Partial<WallConfig>) => void;
  resetSimulator: () => void;
  calculateEstimate: () => { min: number; max: number };
  
  // Modals & Drawers
  isLeadCaptureOpen: boolean;
  setIsLeadCaptureOpen: (open: boolean) => void;
  selectedLeadForDetail: Lead | null;
  setSelectedLeadForDetail: (lead: Lead | null) => void;
  isStoreModalOpen: boolean;
  setIsStoreModalOpen: (open: boolean) => void;
  
  // Utilities
  triggerConfetti: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialEnvironment: ConfiguredEnvironment = {
  id: 'env-cozinha-1',
  typeId: 'cozinha',
  name: 'Cozinha Principal',
  areaM2: 12,
  wallCount: 3,
  walls: [
    {
      id: 'wallA',
      label: 'Parede A',
      length: 2.5,
      selectedFurnitureTypes: ['armario_inferior', 'armario_teto'],
      selectedSpecificItems: ['torre_quente', 'espaco_geladeira'],
    },
    {
      id: 'wallB',
      label: 'Parede B',
      length: 3.5,
      selectedFurnitureTypes: ['armario_inferior', 'armario_aereo'],
      selectedSpecificItems: ['espaco_microondas'],
    },
    {
      id: 'wallC',
      label: 'Parede C',
      length: 2.0,
      selectedFurnitureTypes: ['armario_inferior', 'prateleiras'],
      selectedSpecificItems: ['ilha'],
    },
  ],
};

const initialSimulatorState: SimulatorState = {
  step: 1,
  currentEditingEnvId: 'env-cozinha-1',
  environments: [initialEnvironment],
  qualityTierId: 'intermediario',
  finishTypeId: 'madeirado',
  purchaseTimelineId: 'ate_3_meses',
  clientInfo: {
    name: '',
    phone: '',
    email: '',
    cep: '',
    city: 'São Paulo',
  },
  calculatedRange: {
    min: 18500,
    max: 23800,
  },
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>('consumer');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [merchantTab, setMerchantTab] = useState<MerchantTab>('dashboard');
  const [consumerTab, setConsumerTab] = useState<'landing' | 'simulator'>('landing');

  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [stores, setStores] = useState<Store[]>(INITIAL_STORES);
  const [simulator, setSimulator] = useState<SimulatorState>(initialSimulatorState);

  const [isLeadCaptureOpen, setIsLeadCaptureOpen] = useState(false);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);

  const updateSimulator = (updates: Partial<SimulatorState>) => {
    setSimulator((prev) => ({ ...prev, ...updates }));
  };

  const addEnvironment = (
    typeId: EnvironmentTypeId,
    name: string,
    areaM2: number,
    wallCount: 1 | 2 | 3 | 4,
    ceilingHeight: number = 2.7
  ): ConfiguredEnvironment => {
    const wallLabels: Record<WallId, string> = {
      wallA: 'Parede A',
      wallB: 'Parede B',
      wallC: 'Parede C',
      wallD: 'Parede D',
    };

    const wallKeys: WallId[] = ['wallA', 'wallB', 'wallC', 'wallD'];
    const selectedKeys = wallKeys.slice(0, wallCount);

    const defaultWallLength = Math.max(1.5, Math.round((Math.sqrt(areaM2) / (wallCount > 2 ? 1.2 : 1)) * 10) / 10);

    // INICIA 100% NADA SELECIONADO CONFORME PEDIDO PELO USUARIO
    const wallsConfig: WallConfig[] = selectedKeys.map((wKey) => ({
      id: wKey,
      label: wallLabels[wKey],
      length: defaultWallLength,
      selectedFurnitureTypes: [],
      selectedSpecificItems: [],
    }));

    const newEnv: ConfiguredEnvironment = {
      id: `env-${Date.now()}`,
      typeId,
      name: name || (typeId === 'cozinha' ? 'Cozinha Principal' : 'Ambiente'),
      areaM2: areaM2 || 10,
      ceilingHeight: ceilingHeight || 2.7,
      wallCount,
      walls: wallsConfig,
    };

    setSimulator((prev) => ({
      ...prev,
      environments: [...prev.environments, newEnv],
      currentEditingEnvId: newEnv.id,
      step: 2, // Avança para editar as informações/paredes do novo ambiente
    }));

    return newEnv;
  };

  const updateEnvironment = (envId: string, updates: Partial<ConfiguredEnvironment>) => {
    setSimulator((prev) => ({
      ...prev,
      environments: prev.environments.map((env) =>
        env.id === envId ? { ...env, ...updates } : env
      ),
    }));
  };

  const removeEnvironment = (envId: string) => {
    setSimulator((prev) => {
      const filtered = prev.environments.filter((e) => e.id !== envId);
      return {
        ...prev,
        environments: filtered,
        currentEditingEnvId: filtered.length > 0 ? filtered[0].id : null,
      };
    });
  };

  const updateEnvironmentWall = (envId: string, wallId: WallId, wallData: Partial<WallConfig>) => {
    setSimulator((prev) => ({
      ...prev,
      environments: prev.environments.map((env) => {
        if (env.id !== envId) return env;
        return {
          ...env,
          walls: env.walls.map((w) => (w.id === wallId ? { ...w, ...wallData } : w)),
        };
      }),
    }));
  };

  const calculateEstimate = () => {
    if (!simulator.environments || simulator.environments.length === 0) {
      const fallbackRange = { min: 6500, max: 9200 };
      setSimulator((prev) => ({ ...prev, calculatedRange: fallbackRange }));
      return fallbackRange;
    }

    // Preço médio do m² de móvel planejado (MDF de boa qualidade)
    const baseSquareMeterFurniturePrice = 1200; // R$ 1.200 / m² de projeção de móvel

    let totalRawCost = 0;

    simulator.environments.forEach((env) => {
      const area = env.areaM2 || 12;
      const wallCount = env.wallCount || 3;
      const ceiling = env.ceilingHeight || 2.7;

      // Estimativa do m² linear de parede aproveitada com móveis
      const approxSideLength = Math.sqrt(area);
      const totalWallLength = approxSideLength * wallCount;
      
      // Projeção estimada da área de móveis nas paredes (comprimento x altura aproveitada do pé-direito ~2.2m)
      const effectiveCeilingFurnitureHeight = Math.min(ceiling, 2.6);
      const estimatedFurnitureM2 = totalWallLength * effectiveCeilingFurnitureHeight * 0.75; // 75% da parede coberta com móveis

      const envCost = estimatedFurnitureM2 * baseSquareMeterFurniturePrice;
      totalRawCost += envCost;
    });

    const min = Math.round((totalRawCost * 0.88) / 100) * 100;
    const max = Math.round((totalRawCost * 1.15) / 100) * 100;

    const range = { min, max };
    setSimulator((prev) => ({ ...prev, calculatedRange: range }));
  };

  const resetSimulator = () => {
    setSimulator(initialSimulatorState);
  };



  const addLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'assignedStoreId' | 'assignedStoreName' | 'status'>): Lead => {
    const matchedStore = stores.find((s) => s.state === leadData.state) || stores[0];

    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now().toString().slice(-4)}`,
      assignedStoreId: matchedStore.id,
      assignedStoreName: matchedStore.name,
      status: 'novo',
      createdAt: new Date().toISOString(),
    };

    setLeads((prev) => [newLead, ...prev]);

    setStores((prev) =>
      prev.map((s) => (s.id === matchedStore.id ? { ...s, leadsCount: s.leadsCount + 1 } : s))
    );

    return newLead;
  };

  const updateLeadStatus = (id: string, status: LeadStatus) => {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, status } : lead))
    );
    if (selectedLeadForDetail && selectedLeadForDetail.id === id) {
      setSelectedLeadForDetail((prev) => (prev ? { ...prev, status } : null));
    }
  };

  const addStore = (newStoreData: Omit<Store, 'id' | 'leadsCount'>) => {
    const newStore: Store = {
      ...newStoreData,
      id: `store-${Date.now().toString().slice(-4)}`,
      leadsCount: 0,
    };
    setStores((prev) => [...prev, newStore]);
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563EB', '#10B981', '#3B82F6', '#059669'],
      });
    } catch (e) {
      // fallback
    }
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        adminTab,
        setAdminTab,
        merchantTab,
        setMerchantTab,
        consumerTab,
        setConsumerTab,
        leads,
        stores,
        addLead,
        updateLeadStatus,
        addStore,
        simulator,
        updateSimulator,
        addEnvironment,
        updateEnvironment,
        removeEnvironment,
        updateEnvironmentWall,
        resetSimulator,
        calculateEstimate,
        isLeadCaptureOpen,
        setIsLeadCaptureOpen,
        selectedLeadForDetail,
        setSelectedLeadForDetail,
        isStoreModalOpen,
        setIsStoreModalOpen,
        triggerConfetti,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
