import React, { createContext, useContext, useState } from 'react';
import confetti from 'canvas-confetti';
import { ADDITIONAL_ITEMS, CORTECLOUD_MODULE_TEMPLATES, DOOR_TYPE_OPTIONS, ENVIRONMENTS, FINISHES, FURNITURE_MODULES, HARDWARE_OPTIONS, INITIAL_LEADS, INITIAL_STORES, LAYOUT_OPTIONS, ModuleTemplate } from '../data/mockData';
import { AdminTab, Lead, LeadStatus, MerchantTab, PlacedModule, Role, SimulatorState, Store, WallAssignments, WallDimensions } from '../types';

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

  // Simulator & Cortecloud 3D Studio
  simulator: SimulatorState;
  updateSimulator: (updates: Partial<SimulatorState>) => void;
  setModuleDimension: (moduleId: string, dimensionMeters: number) => void;
  addPlacedModule: (template: ModuleTemplate, wall?: 'wallA' | 'wallB' | 'wallC') => void;
  removePlacedModule: (id: string) => void;
  updatePlacedModuleWidth: (id: string, widthMm: number) => void;
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

const initialPlacedModules: PlacedModule[] = [
  { id: 'mod-1', moduleId: 'torre_quente', title: 'Torre Quente (Forno & Micro-ondas)', category: 'torre', wall: 'wallA', widthMm: 600, heightMm: 2200, depthMm: 600 },
  { id: 'mod-2', moduleId: 'balcao_pia', title: 'Balcão Inferior da Pia (2 Portas)', category: 'base', wall: 'wallB', widthMm: 1200, heightMm: 720, depthMm: 600, doorsCount: 2 },
  { id: 'mod-3', moduleId: 'aereo_vidro', title: 'Aéreo Basculante com Vidro Reflecta', category: 'aereo', wall: 'wallB', widthMm: 900, heightMm: 400, depthMm: 350, hasGlass: true },
  { id: 'mod-4', moduleId: 'gaveteiro_base', title: 'Gaveteiro Inferior 3 Gavetas', category: 'base', wall: 'wallC', widthMm: 600, heightMm: 720, depthMm: 600, drawersCount: 3 },
  { id: 'mod-5', moduleId: 'aereo_2portas', title: 'Armário Aéreo Superior (2 Portas)', category: 'aereo', wall: 'wallC', widthMm: 800, heightMm: 720, depthMm: 350, doorsCount: 2 },
];

const initialSimulatorState: SimulatorState = {
  step: 1,
  environmentId: 'cozinha',
  selectedFurnitureModuleIds: ['cozinha_balcao', 'cozinha_aereos', 'cozinha_torre'],
  placedModules: initialPlacedModules,
  wallDimensions: {
    wallA: 2.2, // Parede Esquerda
    wallB: 3.5, // Parede Fundo
    wallC: 2.0, // Parede Direita
    height: 2.7, // Pé-direito
  },
  wallAssignments: {
    wallAModules: ['torre_quente', 'paneleiro'],
    wallBModules: ['balcao_pia', 'aereo_vidro'],
    wallCModules: ['gaveteiro_base', 'aereo_2portas'],
  },
  layoutTypeId: 'em_u',
  doorTypeId: 'giro_soft',
  dimensions: {
    length: 3.5,
    height: 2.7,
    width: 3.0,
  },
  finishId: 'mdf_branco',
  hardwareId: 'intermediaria',
  additionalItemIds: ['led', 'vidro'],
  location: {
    cep: '04538-133',
    city: 'São Paulo',
    state: 'SP',
  },
  calculatedRange: {
    min: 24800,
    max: 31900,
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
    setSimulator((prev) => {
      const next = { ...prev, ...updates };
      return next;
    });
  };

  const setModuleDimension = (moduleId: string, dimensionMeters: number) => {
    setSimulator((prev) => ({
      ...prev,
      moduleCustomDimensions: {
        ...(prev.moduleCustomDimensions || {}),
        [moduleId]: dimensionMeters,
      },
    }));
  };

  const addPlacedModule = (template: ModuleTemplate, wall: 'wallA' | 'wallB' | 'wallC' = 'wallB') => {
    const newMod: PlacedModule = {
      id: `mod-${Date.now()}`,
      moduleId: template.templateId,
      title: template.title,
      category: template.category,
      wall: wall,
      widthMm: template.defaultWidthMm,
      heightMm: template.defaultHeightMm,
      depthMm: template.defaultDepthMm,
    };
    setSimulator((prev) => ({
      ...prev,
      placedModules: [...(prev.placedModules || []), newMod],
    }));
  };

  const removePlacedModule = (id: string) => {
    setSimulator((prev) => ({
      ...prev,
      placedModules: (prev.placedModules || []).filter((m) => m.id !== id),
    }));
  };

  const updatePlacedModuleWidth = (id: string, widthMm: number) => {
    setSimulator((prev) => ({
      ...prev,
      placedModules: (prev.placedModules || []).map((m) => (m.id === id ? { ...m, widthMm } : m)),
    }));
  };

  const resetSimulator = () => {
    setSimulator(initialSimulatorState);
  };

  const calculateEstimate = () => {
    const env = ENVIRONMENTS.find((e) => e.id === simulator.environmentId) || ENVIRONMENTS[0];
    const finish = FINISHES.find((f) => f.id === simulator.finishId) || FINISHES[0];
    const hardware = HARDWARE_OPTIONS.find((h) => h.id === simulator.hardwareId) || HARDWARE_OPTIONS[0];
    const layout = LAYOUT_OPTIONS.find((l) => l.id === simulator.layoutTypeId) || LAYOUT_OPTIONS[0];
    const doorType = DOOR_TYPE_OPTIONS.find((d) => d.id === simulator.doorTypeId) || DOOR_TYPE_OPTIONS[0];

    const areaM2 = simulator.dimensions.length * simulator.dimensions.height;
    const baseM2Price = 1450; // Taxa média de marcenaria sob medida por m²

    // Multiplicador do conjunto de módulos selecionados
    let modulesMultiplier = 1.0;
    if (simulator.selectedFurnitureModuleIds && simulator.selectedFurnitureModuleIds.length > 0) {
      const selectedMods = FURNITURE_MODULES.filter((m) => simulator.selectedFurnitureModuleIds.includes(m.id));
      if (selectedMods.length > 0) {
        modulesMultiplier = selectedMods.reduce((acc, m) => acc + (m.extraMultiplier * 0.18), 0.7);
      }
    }

    let rawCost = areaM2 * baseM2Price * env.baseMultiplier * layout.multiplier * doorType.multiplier * finish.multiplier * hardware.multiplier * modulesMultiplier;

    // Se o cliente definiu a medida de cada peça individualmente, calcula com precisão por peça
    if (simulator.moduleCustomDimensions && Object.keys(simulator.moduleCustomDimensions).length > 0) {
      let customPiecesTotalLinearM = 0;
      Object.entries(simulator.moduleCustomDimensions).forEach(([mId, lenM]) => {
        const len = typeof lenM === 'number' ? lenM : parseFloat(String(lenM)) || 0;
        if (simulator.selectedFurnitureModuleIds.includes(mId) && len > 0) {
          customPiecesTotalLinearM += len;
        }
      });
      if (customPiecesTotalLinearM > 0) {
        rawCost = customPiecesTotalLinearM * simulator.dimensions.height * baseM2Price * env.baseMultiplier * layout.multiplier * doorType.multiplier * finish.multiplier * hardware.multiplier;
      }
    }

    // Adiciona custo de itens adicionais selecionados (Fita LED, Vidro Reflecta, etc.)
    simulator.additionalItemIds.forEach((itemId) => {
      const item = ADDITIONAL_ITEMS.find((i) => i.id === itemId);
      if (item) {
        rawCost += item.extraCost;
      }
    });

    const min = Math.round((rawCost * 0.92) / 100) * 100;
    const max = Math.round((rawCost * 1.18) / 100) * 100;

    const range = { min, max };
    setSimulator((prev) => ({ ...prev, calculatedRange: range }));
    return range;
  };

  const addLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'assignedStoreId' | 'assignedStoreName' | 'status'>): Lead => {
    // Pick store based on city or state
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

    // Update store leads count
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
        setModuleDimension,
        addPlacedModule,
        removePlacedModule,
        updatePlacedModuleWidth,
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
