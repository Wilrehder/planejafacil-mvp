import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import { getCurrentUserContext, signOutUser, AuthenticatedUserContext } from '../lib/authService';
import { getActivePricingRule } from '../lib/simulationService';
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
  deleteStore: (id: string) => Promise<void>;
  refreshStores: () => Promise<void>;
  refreshLeads: () => Promise<void>;
  refreshApplications: () => Promise<void>;
  addStoreApplication: (appData: Omit<PartnerStoreApplication, 'id' | 'createdAt' | 'status'>) => Promise<PartnerStoreApplication>;
  updateStoreApplicationStatus: (id: string, status: PartnerStoreApplication['status']) => Promise<void>;

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
  cityM2Prices: Record<string, number>;
  setBaseSquareMeterPrice: (price: number, cityPrices?: Record<string, number>) => Promise<void>;

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
  
  // Authentication & Session
  currentUser: AuthenticatedUserContext | null;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  isMustChangePasswordOpen: boolean;
  setIsMustChangePasswordOpen: (open: boolean) => void;
  loginSuccess: (context: AuthenticatedUserContext) => void;
  logout: () => Promise<void>;
  isHomologationMode: boolean;

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

  // Supabase Auth Session & Definite Profile
  const [currentUser, setCurrentUser] = useState<AuthenticatedUserContext | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMustChangePasswordOpen, setIsMustChangePasswordOpen] = useState(false);
  const isHomologationMode = import.meta.env.VITE_APP_ENV === 'homologation';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeApplications, setStoreApplications] = useState<PartnerStoreApplication[]>([]);
  const [simulator, setSimulator] = useState<SimulatorState>(initialSimulatorState);
  const [baseSquareMeterPrice, setBaseSquareMeterPriceState] = useState<number>(1200);
  const [cityM2Prices, setCityM2Prices] = useState<Record<string, number>>({});

  const refreshStores = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_stores_sync');
      if (!error && data?.success && Array.isArray(data.stores)) {
        setStores(data.stores);
      }
    } catch (err) {
      console.warn('Erro ao sincronizar lojas com o banco:', err);
    }
  };

  const refreshLeads = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_leads_sync');
      if (!error && data?.success && Array.isArray(data.leads)) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.warn('Erro ao sincronizar leads com o banco:', err);
    }
  };

  const refreshApplications = async () => {
    try {
      const { data, error } = await supabase.rpc('get_partner_applications');
      if (!error && data?.success && Array.isArray(data.applications)) {
        setStoreApplications(data.applications);
      }
    } catch (err) {
      console.warn('Erro ao sincronizar candidaturas com o banco:', err);
    }
  };

  const setBaseSquareMeterPrice = async (price: number, cityPrices?: Record<string, number>) => {
    setBaseSquareMeterPriceState(price);
    if (cityPrices) {
      setCityM2Prices(cityPrices);
    }
    try {
      await supabase.rpc('update_active_pricing_rule', { 
        p_base_m2_price: price,
        p_city_m2_prices: cityPrices || cityM2Prices
      });
    } catch (err) {
      console.warn('Erro ao salvar precificação no banco:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Carregar dados oficiais do PostgreSQL na inicialização
    refreshStores();
    getActivePricingRule().then((rule) => {
      if (isMounted && rule?.params?.baseM2Price) {
        setBaseSquareMeterPriceState(rule.params.baseM2Price);
        if (rule.params.cityM2Prices) {
          setCityM2Prices(rule.params.cityM2Prices);
        }
      }
    });

    // Sincronizar sessão oficial
    getCurrentUserContext().then((ctx) => {
      if (!isMounted || !ctx) return;
      setCurrentUser(ctx);
      if (ctx.role === 'platform_admin') {
        setRole('admin');
        refreshLeads();
        refreshApplications();
      } else if (ctx.role === 'store_owner' || ctx.role === 'store_operator') {
        setRole('merchant');
      }
      if (ctx.mustChangePassword) {
        setIsMustChangePasswordOpen(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (isMounted) {
          setCurrentUser(null);
          setRole('consumer');
          setConsumerTab('landing');
        }
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const ctx = await getCurrentUserContext();
        if (isMounted && ctx) {
          setCurrentUser(ctx);
          refreshStores();
          if (ctx.role === 'platform_admin') {
            setRole('admin');
            refreshLeads();
            refreshApplications();
          } else if (ctx.role === 'store_owner' || ctx.role === 'store_operator') {
            setRole('merchant');
          }
          if (ctx.mustChangePassword) {
            setIsMustChangePasswordOpen(true);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loginSuccess = (context: AuthenticatedUserContext) => {
    setCurrentUser(context);
    refreshStores();
    if (context.role === 'platform_admin') {
      setRole('admin');
      setAdminTab('finance');
      refreshLeads();
      refreshApplications();
    } else if (context.role === 'store_owner' || context.role === 'store_operator') {
      setRole('merchant');
      setMerchantTab('dashboard');
    }
    if (context.mustChangePassword) {
      setIsMustChangePasswordOpen(true);
    }
  };

  const logout = async () => {
    await signOutUser();
    setCurrentUser(null);
    setRole('consumer');
    setConsumerTab('landing');
  };

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

      const clientCity = simulator.clientInfo?.city;
      const cityOverridePrice = clientCity && cityM2Prices && cityM2Prices[clientCity];
      const effectiveM2Price = cityOverridePrice || baseSquareMeterPrice;
      const envCost = estimatedFurnitureM2 * effectiveM2Price;
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
    const matchedStore = stores.find((s) => s.id === leadData.assignedStoreId) || stores.find((s) => s.state === leadData.state);

    const newLead: Lead = {
      ...leadData,
      id: leadData.id || `lead-${Date.now().toString().slice(-4)}`,
      assignedStoreId: leadData.assignedStoreId || matchedStore?.id || '',
      assignedStoreName: leadData.assignedStoreName || matchedStore?.name || 'Fila Sem Cobertura',
      status: leadData.status || 'novo',
      source: leadData.source || 'plataforma',
      isExternal: leadData.isExternal || false,
      createdAt: new Date().toISOString(),
    };

    setLeads((prev) => [newLead, ...prev]);

    if (matchedStore) {
      setStores((prev) =>
        prev.map((s) => (s.id === matchedStore.id ? { ...s, leadsCount: s.leadsCount + 1 } : s))
      );
    }

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

  const [orders, setOrders] = useState<StoreOrder[]>([]);
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
    let globalNextStage: OrderStage = updates.currentStage || 'medicao';

    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id !== id) return order;

        const nextStage: OrderStage = updates.currentStage || order.currentStage;
        const merged: StoreOrder = { ...order, ...updates, currentStage: nextStage };
        const stageChanged = nextStage !== order.currentStage;
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
          ? (stageChanged ? `${auditAction}. Etapa avançada para "${stageNamesMap[nextStage]}".` : auditAction)
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
        const nextStage: OrderStage = updates.currentStage || prev.currentStage;
        const merged: StoreOrder = { ...prev, ...updates, currentStage: nextStage };

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

  const addStoreApplication = async (appData: Omit<PartnerStoreApplication, 'id' | 'createdAt' | 'status'>): Promise<PartnerStoreApplication> => {
    try {
      const { data, error } = await supabase.rpc('submit_partner_application', {
        p_store_name: appData.storeName,
        p_contact_name: appData.contactName,
        p_phone: appData.phone,
        p_email: appData.email,
        p_city: appData.city,
        p_state_uf: appData.state,
        p_desired_plan: appData.desiredPlan,
        p_notes: appData.notes || null,
      });

      if (!error && data?.success && data.application) {
        const created: PartnerStoreApplication = data.application;
        setStoreApplications((prev) => [created, ...prev]);
        return created;
      }
    } catch (err) {
      console.warn('Erro ao enviar candidatura ao banco:', err);
    }

    const fallbackApp: PartnerStoreApplication = {
      ...appData,
      id: `app-${Date.now().toString().slice(-4)}`,
      status: 'nova',
      createdAt: new Date().toISOString(),
    };
    setStoreApplications((prev) => [fallbackApp, ...prev]);
    return fallbackApp;
  };

  const updateStoreApplicationStatus = async (id: string, status: PartnerStoreApplication['status']) => {
    setStoreApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status } : app))
    );
    try {
      await supabase.rpc('update_partner_application_status', {
        p_id: id,
        p_status: status,
      });
    } catch (err) {
      console.warn('Erro ao atualizar status da candidatura:', err);
    }
  };

  const addStore = (newStoreData: Omit<Store, 'id' | 'leadsCount'>) => {
    const newStore: Store = {
      ...newStoreData,
      id: `store-${Date.now().toString().slice(-4)}`,
      leadsCount: 0,
    };
    setStores((prev) => [newStore, ...prev]);
  };

  const deleteStore = async (id: string) => {
    // 1. Tentar procedure oficial de exclusão segura em cascata
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_delete_store', {
      p_tenant_id: id,
    });

    if (!rpcError && rpcData?.success) {
      setStores((prev) => prev.filter((s) => s.id !== id));
      await refreshStores();
      await refreshLeads();
      return;
    }

    // 2. Fallback: exclusão direta via REST na tabela tenants
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.message?.includes('violates foreign key constraint')) {
        throw new Error(
          'Esta loja possui leads, assinaturas ou pedidos vinculados. ' +
          'Execute a migração SQL "20261103000017_fix_tenant_deletion_and_cascade.sql" no painel do Supabase para habilitar a exclusão automática em cascata.'
        );
      }
      throw error;
    }

    setStores((prev) => prev.filter((s) => s.id !== id));
    await refreshStores();
    await refreshLeads();
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
        deleteStore,
        refreshStores,
        refreshLeads,
        refreshApplications,
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
        cityM2Prices,
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
        currentUser,
        isLoginModalOpen,
        setIsLoginModalOpen,
        isMustChangePasswordOpen,
        setIsMustChangePasswordOpen,
        loginSuccess,
        logout,
        isHomologationMode,
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
