import React, { createContext, useContext, useState } from 'react';
import confetti from 'canvas-confetti';
import { INITIAL_LEADS, INITIAL_ORDERS, INITIAL_STORES, QUALITY_TIERS } from '../data/mockData';
import { 
  AdminTab, 
  ConfiguredEnvironment, 
  EnvironmentTypeId, 
  Lead, 
  LeadStatus, 
  MerchantTab, 
  OrderAuditLog,
  OrderStage,
  PartnerStoreApplication,
  PlacedModule, 
  Role, 
  SimulatorState, 
  Store, 
  StoreOrder,
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
  storeApplications: PartnerStoreApplication[];
  addLead: (leadData: Partial<Lead> & Omit<Lead, 'id' | 'createdAt' | 'assignedStoreId' | 'assignedStoreName' | 'status'>) => Lead;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  addStore: (newStore: Omit<Store, 'id' | 'leadsCount'>) => void;
  addStoreApplication: (appData: Omit<PartnerStoreApplication, 'id' | 'createdAt' | 'status'>) => PartnerStoreApplication;
  updateStoreApplicationStatus: (id: string, status: PartnerStoreApplication['status']) => void;

  // Multi-Environment Simulator
  simulator: SimulatorState;
  updateSimulator: (updates: Partial<SimulatorState>) => void;
  addEnvironment: (typeId: EnvironmentTypeId, name: string, areaM2: number, wallCount: 1 | 2 | 3 | 4, ceilingHeight?: number) => ConfiguredEnvironment;
  updateEnvironment: (envId: string, updates: Partial<ConfiguredEnvironment>) => void;
  removeEnvironment: (envId: string) => void;
  updateEnvironmentWall: (envId: string, wallId: WallId, wallData: Partial<WallConfig>) => void;
  resetSimulator: () => void;
  calculateEstimate: () => { min: number; max: number };
  
  // Configuração Global de Precificação pelo Admin
  baseSquareMeterPrice: number;
  setBaseSquareMeterPrice: (price: number) => void;

  // Modals & Drawers
  isLeadCaptureOpen: boolean;
  setIsLeadCaptureOpen: (open: boolean) => void;
  selectedLeadForDetail: Lead | null;
  setSelectedLeadForDetail: (lead: Lead | null) => void;
  isStoreModalOpen: boolean;
  setIsStoreModalOpen: (open: boolean) => void;
  
  // ERP Orders
  orders: StoreOrder[];
  selectedOrderForFolder: StoreOrder | null;
  setSelectedOrderForFolder: (order: StoreOrder | null) => void;
  updateOrder: (id: string, updates: Partial<StoreOrder>, auditAction?: string, userRole?: string, userName?: string) => void;
  
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
  const [adminTab, setAdminTab] = useState<AdminTab>('finance');
  const [merchantTab, setMerchantTab] = useState<MerchantTab>('dashboard');
  const [consumerTab, setConsumerTab] = useState<'landing' | 'simulator'>('landing');

  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [stores, setStores] = useState<Store[]>(INITIAL_STORES);
  const [simulator, setSimulator] = useState<SimulatorState>(initialSimulatorState);

  const [baseSquareMeterPrice, setBaseSquareMeterPrice] = useState<number>(1200);

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

      const envCost = estimatedFurnitureM2 * baseSquareMeterPrice;
      totalRawCost += envCost;
    });

    const min = Math.round((totalRawCost * 0.88) / 100) * 100;
    const max = Math.round((totalRawCost * 1.15) / 100) * 100;

    const range = { min, max };
    setSimulator((prev) => ({ ...prev, calculatedRange: range }));
    return range;
  };

  const resetSimulator = () => {
    setSimulator(initialSimulatorState);
  };



  const addLead = (leadData: Partial<Lead> & Omit<Lead, 'id' | 'createdAt' | 'assignedStoreId' | 'assignedStoreName' | 'status'>): Lead => {
    const matchedStore = stores.find((s) => s.id === leadData.assignedStoreId) || stores.find((s) => s.state === leadData.state) || stores[0];

    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now().toString().slice(-4)}`,
      assignedStoreId: matchedStore.id,
      assignedStoreName: matchedStore.name,
      status: leadData.status || 'novo',
      source: leadData.source || 'plataforma',
      isExternal: leadData.isExternal || false,
      createdAt: new Date().toISOString(),
    };

    setLeads((prev) => [newLead, ...prev]);

    setStores((prev) =>
      prev.map((s) => (s.id === matchedStore.id ? { ...s, leadsCount: s.leadsCount + 1 } : s))
    );

    return newLead;
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead))
    );
    if (selectedLeadForDetail && selectedLeadForDetail.id === id) {
      setSelectedLeadForDetail((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const [orders, setOrders] = useState<StoreOrder[]>(INITIAL_ORDERS);
  const [selectedOrderForFolder, setSelectedOrderForFolder] = useState<StoreOrder | null>(null);

  const updateOrder = (
    id: string,
    updates: Partial<StoreOrder>,
    auditAction?: string,
    userRole?: string,
    userName?: string
  ) => {
    let globalActionMessage = auditAction || 'Atualização de dados no pedido.';
    let globalStageChanged = false;
    let globalNextStage: OrderStage = 'medicao';

    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id !== id) return order;

        const merged: StoreOrder = { ...order, ...updates };

        // Avaliação Automática de Avanço de Etapa (Event-driven without Kanban drag-and-drop)
        let nextStage: OrderStage = merged.currentStage;

        if (merged.currentStage === 'medicao' && merged.medicaoFile && merged.medicaoDone) {
          nextStage = 'projeto_aprovacao';
        } else if (merged.currentStage === 'projeto_aprovacao' && merged.projectFile && merged.projectApproved) {
          nextStage = 'producao';
        } else if (merged.currentStage === 'producao' && merged.producaoDone) {
          nextStage = 'montagem';
        } else if (merged.currentStage === 'montagem' && merged.montagemFoto && merged.montagemDone) {
          nextStage = 'entrega_aceite';
        } else if (merged.currentStage === 'entrega_aceite' && (merged.aceiteFile || merged.clientConfirmedAceite)) {
          nextStage = 'concluido';
        }

        const stageChanged = nextStage !== merged.currentStage;
        globalStageChanged = stageChanged;
        globalNextStage = nextStage;

        const stageNamesMap: Record<OrderStage, string> = {
          medicao: 'Medição Técnica',
          projeto_aprovacao: 'Projeto & Aprovação',
          producao: 'Produção',
          montagem: 'Montagem na Obra',
          entrega_aceite: 'Entrega / Aceite',
          concluido: 'Pedido Concluído'
        };

        const actionMsg = auditAction
          ? (stageChanged ? `${auditAction}. Etapa avançada automaticamente para "${stageNamesMap[nextStage]}".` : auditAction)
          : (stageChanged ? `Etapa do pedido avançada para "${stageNamesMap[nextStage]}".` : 'Atualização de dados no pedido.');
        
        globalActionMessage = actionMsg;

        const newLog: OrderAuditLog = {
          id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          user: userName || (userRole === 'Medição' ? 'Carlos Medições' : userRole === 'Projetista' ? 'Fernanda Designer' : 'Lojista Parceiro'),
          userRole: userRole || 'Operador ERP',
          action: actionMsg,
          timestamp: new Date().toISOString(),
        };

        return {
          ...merged,
          currentStage: nextStage,
          timeline: [newLog, ...(merged.timeline || [])],
        };
      })
    );

    if (selectedOrderForFolder && selectedOrderForFolder.id === id) {
      setSelectedOrderForFolder((prev) => {
        if (!prev) return null;
        const merged: StoreOrder = { ...prev, ...updates };

        let nextStage: OrderStage = merged.currentStage;

        if (merged.currentStage === 'medicao' && merged.medicaoFile && merged.medicaoDone) {
          nextStage = 'projeto_aprovacao';
        } else if (merged.currentStage === 'projeto_aprovacao' && merged.projectFile && merged.projectApproved) {
          nextStage = 'producao';
        } else if (merged.currentStage === 'producao' && merged.producaoDone) {
          nextStage = 'montagem';
        } else if (merged.currentStage === 'montagem' && merged.montagemFoto && merged.montagemDone) {
          nextStage = 'entrega_aceite';
        } else if (merged.currentStage === 'entrega_aceite' && (merged.aceiteFile || merged.clientConfirmedAceite)) {
          nextStage = 'concluido';
        }

        const stageNamesMap: Record<OrderStage, string> = {
          medicao: 'Medição Técnica',
          projeto_aprovacao: 'Projeto & Aprovação',
          producao: 'Produção',
          montagem: 'Montagem na Obra',
          entrega_aceite: 'Entrega / Aceite',
          concluido: 'Pedido Concluído'
        };

        const newLog: OrderAuditLog = {
          id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          user: userName || (userRole === 'Medição' ? 'Carlos Medições' : userRole === 'Projetista' ? 'Fernanda Designer' : 'Lojista Parceiro'),
          userRole: userRole || 'Operador ERP',
          action: globalActionMessage,
          timestamp: new Date().toISOString(),
        };

        return {
          ...merged,
          currentStage: nextStage,
          timeline: [newLog, ...(prev.timeline || [])],
        };
      });
    }
  };

  const updateLeadStatus = (id: string, status: LeadStatus) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id === id) {
          if (status === 'convertido') {
            const existingOrder = orders.find((o) => o.leadId === id);
            if (!existingOrder) {
              const newOrder: StoreOrder = {
                id: `PED-${Math.floor(4000 + Math.random() * 900)}`,
                leadId: lead.id,
                clientName: lead.name,
                phone: lead.phone,
                address: `Rua Principal, 100 - ${lead.city} / ${lead.state}`,
                city: lead.city,
                state: lead.state,
                environment: lead.environment || 'Projeto Sob Medida',
                totalValue: lead.estimatedMax ? Math.round((lead.estimatedMin + lead.estimatedMax) / 2) : 25000,
                currentStage: 'medicao',
                createdAt: new Date().toISOString(),
                storeId: lead.assignedStoreId,
                contractFile: lead.attachmentName || 'contrato_venda_fechada.pdf',
                timeline: [
                  {
                    id: `log-${Date.now()}`,
                    user: 'Integração CRM-ERP',
                    userRole: 'Sistema CRM',
                    action: `Venda Fechada no CRM! Pedido gerado e encaminhado para Medição Técnica no ERP.`,
                    timestamp: new Date().toISOString(),
                  },
                ],
              };
              setOrders((oPrev) => [newOrder, ...oPrev]);
            }
          }
          return { ...lead, status };
        }
        return lead;
      })
    );

    if (selectedLeadForDetail && selectedLeadForDetail.id === id) {
      setSelectedLeadForDetail((prev) => (prev ? { ...prev, status } : null));
    }
  };

  const [storeApplications, setStoreApplications] = useState<PartnerStoreApplication[]>([
    {
      id: 'app-1',
      storeName: 'Marcenaria & Design Italínea',
      contactName: 'Ricardo Oliveira',
      phone: '(11) 98888-7777',
      email: 'ricardo@marcenariaitalinea.com.br',
      city: 'São Paulo',
      state: 'SP',
      desiredPlan: 'Pro',
      notes: 'Gostaria de integrar 2 filiais na Zona Sul de SP.',
      status: 'nova',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'app-2',
      storeName: 'Studio Moveis Campinas',
      contactName: 'Vanessa Souza',
      phone: '(19) 97777-6666',
      email: 'vanessa@studiomoveis.com.br',
      city: 'Campinas',
      state: 'SP',
      desiredPlan: 'Basic',
      notes: 'Tenho interesse em receber solicitações da região de Campinas e Valinhos.',
      status: 'em_contato',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    }
  ]);

  const addStoreApplication = (appData: Omit<PartnerStoreApplication, 'id' | 'createdAt' | 'status'>): PartnerStoreApplication => {
    const newApp: PartnerStoreApplication = {
      ...appData,
      id: `app-${Date.now().toString().slice(-4)}`,
      status: 'nova',
      createdAt: new Date().toISOString(),
    };
    setStoreApplications((prev) => [newApp, ...prev]);
    return newApp;
  };

  const updateStoreApplicationStatus = (id: string, status: PartnerStoreApplication['status']) => {
    setStoreApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status } : app))
    );
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
        storeApplications,
        addLead,
        updateLead,
        updateLeadStatus,
        addStore,
        addStoreApplication,
        updateStoreApplicationStatus,
        simulator,
        updateSimulator,
        addEnvironment,
        updateEnvironment,
        removeEnvironment,
        updateEnvironmentWall,
        resetSimulator,
        calculateEstimate,
        baseSquareMeterPrice,
        setBaseSquareMeterPrice,
        isLeadCaptureOpen,
        setIsLeadCaptureOpen,
        selectedLeadForDetail,
        setSelectedLeadForDetail,
        isStoreModalOpen,
        setIsStoreModalOpen,
        orders,
        selectedOrderForFolder,
        setSelectedOrderForFolder,
        updateOrder,
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
