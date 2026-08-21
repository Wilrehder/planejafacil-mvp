import { AdditionalItemOption, DoorTypeOption, EnvironmentOption, FinishOption, FurnitureModuleOption, HardwareOption, LayoutOption, Lead, RegionStat, Store, StorePlanTier } from '../types';

export const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: 'reta',
    title: 'Linear (Parede Reta)',
    subtitle: 'Móvel instalado em 1 única parede contínua.',
    multiplier: 1.0,
  },
  {
    id: 'em_l',
    title: 'Formato em "L"',
    subtitle: 'Aproveitamento inteligente de canto com 2 paredes.',
    multiplier: 1.18,
  },
  {
    id: 'em_u',
    title: 'Formato em "U"',
    subtitle: 'Fechamento completo e envolvente em 3 paredes.',
    multiplier: 1.35,
  },
  {
    id: 'com_ilha',
    title: 'Com Ilha / Balcão Central',
    subtitle: 'Módulos de parede integrados a uma ilha de apoio.',
    multiplier: 1.45,
  },
];

// Novas Estruturas para o Simulador Multi-Ambientes
export interface EnvironmentTypeItem {
  id: string; // ex: 'cozinha'
  title: string;
  subtitle: string;
  iconName: string;
}

export const ENVIRONMENT_CATALOG: EnvironmentTypeItem[] = [
  { id: 'cozinha', title: 'Cozinha', subtitle: 'Armários, torre quente e ilha', iconName: 'ChefHat' },
  { id: 'sala', title: 'Sala de Estar', subtitle: 'Painéis, racks e estantes', iconName: 'Sofa' },
  { id: 'quarto', title: 'Dormitório / Quarto', subtitle: 'Guarda-roupas e cabeceiras', iconName: 'Bed' },
  { id: 'closet', title: 'Closet', subtitle: 'Módulos abertos e gaveteiros', iconName: 'Shirt' },
  { id: 'office', title: 'Home Office', subtitle: 'Bancadas e estantes para trabalho', iconName: 'Laptop' },
  { id: 'banheiro', title: 'Banheiro', subtitle: 'Gabinetes e espelheiras', iconName: 'Bath' },
  { id: 'lavanderia', title: 'Lavanderia', subtitle: 'Armários e espaço lavadora', iconName: 'WashingMachine' },
  { id: 'gourmet', title: 'Área Gourmet', subtitle: 'Bancada, churrasqueira e adega', iconName: 'Flame' },
  { id: 'painel', title: 'Painel de TV', subtitle: 'Painel ripado e rack suspenso', iconName: 'Tv' },
  { id: 'outro', title: 'Outro Ambiente', subtitle: 'Móveis sob medida personalizados', iconName: 'Box' },
];

export const GENERAL_WALL_FURNITURE = [
  { id: 'armario_inferior', title: 'Armário Inferior', desc: 'Balcão de base no piso' },
  { id: 'armario_aereo', title: 'Armário Aéreo', desc: 'Módulos suspensos na parede' },
  { id: 'armario_teto', title: 'Armário até o Teto', desc: 'Fechamento vertical completo' },
  { id: 'nichos', title: 'Nichos Decorativos', desc: 'Aberturas abertas organizadoras' },
  { id: 'prateleiras', title: 'Prateleiras Flutuantes', desc: 'Prateleiras encorpadas fixas' },
  { id: 'painel', title: 'Painel de Madeira', desc: 'Revestimento de parede/ripado' },
];

export const ENVIRONMENT_SPECIFIC_ITEMS_MAP: Record<string, { id: string; title: string }[]> = {
  cozinha: [
    { id: 'torre_quente', title: 'Torre quente' },
    { id: 'ilha', title: 'Ilha' },
    { id: 'peninsula', title: 'Península' },
    { id: 'cristaleira', title: 'Cristaleira' },
    { id: 'adega', title: 'Adega' },
    { id: 'despensa', title: 'Despensa' },
    { id: 'espaco_geladeira', title: 'Espaço para geladeira' },
    { id: 'espaco_lavaloucas', title: 'Espaço para lava-louças' },
    { id: 'espaco_microondas', title: 'Espaço para micro-ondas' },
    { id: 'coifa', title: 'Coifa' },
  ],
  quarto: [
    { id: 'guarda_roupa', title: 'Guarda-roupa' },
    { id: 'cabeceira', title: 'Cabeceira' },
    { id: 'painel_tv', title: 'Painel de TV' },
    { id: 'criado_mudo', title: 'Criado-mudo' },
    { id: 'penteadeira', title: 'Penteadeira' },
    { id: 'maleiro', title: 'Maleiro' },
    { id: 'sapateira', title: 'Sapateira' },
    { id: 'nichos_quarto', title: 'Nichos' },
  ],
  closet: [
    { id: 'cabideiros', title: 'Cabideiros' },
    { id: 'gaveteiros', title: 'Gaveteiros' },
    { id: 'sapateira_closet', title: 'Sapateira' },
    { id: 'nichos_closet', title: 'Nichos' },
    { id: 'prateleiras_closet', title: 'Prateleiras' },
    { id: 'ilha_central', title: 'Ilha central' },
    { id: 'espelho', title: 'Espelho' },
    { id: 'banco', title: 'Banco' },
  ],
  sala: [
    { id: 'painel_tv_sala', title: 'Painel de TV' },
    { id: 'rack', title: 'Rack' },
    { id: 'estante', title: 'Estante' },
    { id: 'aparador', title: 'Aparador' },
    { id: 'cristaleira_sala', title: 'Cristaleira' },
    { id: 'bar', title: 'Bar' },
  ],
  office: [
    { id: 'mesa', title: 'Mesa' },
    { id: 'gaveteiro_office', title: 'Gaveteiro' },
    { id: 'estante_office', title: 'Estante' },
    { id: 'armario_superior', title: 'Armário superior' },
    { id: 'armario_inferior_office', title: 'Armário inferior' },
    { id: 'nichos_office', title: 'Nichos' },
    { id: 'torre_documentos', title: 'Torre para documentos' },
  ],
  banheiro: [
    { id: 'gabinete', title: 'Gabinete' },
    { id: 'espelheira', title: 'Espelheira' },
    { id: 'armario_superior_banheiro', title: 'Armário superior' },
    { id: 'nichos_banheiro', title: 'Nichos' },
    { id: 'torre_lateral', title: 'Torre lateral' },
  ],
  lavanderia: [
    { id: 'armario_inferior_lav', title: 'Armário inferior' },
    { id: 'armario_superior_lav', title: 'Armário superior' },
    { id: 'torre_lav', title: 'Torre' },
    { id: 'bancada_lav', title: 'Bancada' },
    { id: 'vassoureiro', title: 'Vassoureiro' },
    { id: 'espaco_maquina', title: 'Espaço para máquina' },
    { id: 'espaco_secadora', title: 'Espaço para secadora' },
    { id: 'tanque', title: 'Tanque' },
  ],
  gourmet: [
    { id: 'bancada_gourmet', title: 'Bancada' },
    { id: 'armarios_inferiores_g', title: 'Armários inferiores' },
    { id: 'armarios_superiores_g', title: 'Armários superiores' },
    { id: 'churrasqueira', title: 'Churrasqueira' },
    { id: 'chopeira', title: 'Chopeira' },
    { id: 'adega_gourmet', title: 'Adega' },
    { id: 'cervejeira', title: 'Cervejeira' },
    { id: 'cooktop_gourmet', title: 'Cooktop' },
    { id: 'forno_gourmet', title: 'Forno' },
    { id: 'painel_gourmet', title: 'Painel' },
  ],
  painel: [
    { id: 'painel_tv_unico', title: 'Painel de TV' },
    { id: 'rack_suspenso', title: 'Rack Suspenso' },
    { id: 'fita_led', title: 'Iluminação Fita LED' },
    { id: 'nicho_equipamento', title: 'Nicho para Equipamentos' },
  ],
  outro: [
    { id: 'armario_generico', title: 'Armário sob medida' },
    { id: 'bancada_generica', title: 'Bancada de apoio' },
    { id: 'prateleira_generica', title: 'Prateleiras' },
  ],
};

export const QUALITY_TIERS = [
  { id: 'economico', title: 'Econômico', desc: 'MDF Padrão Branco, ferragens essenciais.', multiplier: 1.0 },
  { id: 'intermediario', title: 'Intermediário', desc: 'MDF Madeirado, corrediças com amortecedor.', multiplier: 1.25 },
  { id: 'premium', title: 'Premium', desc: 'MDF Laca/Madeirado nobre, amortecimento soft-close.', multiplier: 1.6 },
  { id: 'alto_padrao', title: 'Alto Padrão', desc: 'Laca italiana, perfis alumínio, vidros reflecta e LED.', multiplier: 2.1 },
];

export const FINISH_OPTIONS_CATALOG = [
  { id: 'branco', title: 'Branco Texturizado' },
  { id: 'madeirado', title: 'Madeirado Natural' },
  { id: 'colorido', title: 'Colorido (Cinza, Grafite, Fendi)' },
  { id: 'laca', title: 'Laca de Alto Brilho / Fosca' },
  { id: 'nao_sei', title: 'Ainda não sei' },
];

export const PURCHASE_TIMELINES_CATALOG = [
  { id: 'imediatamente', title: 'Imediatamente' },
  { id: 'ate_3_meses', title: 'Até 3 meses' },
  { id: 'entre_3_6_meses', title: 'Entre 3 e 6 meses' },
  { id: 'pesquisando', title: 'Apenas pesquisando' },
];

export const DOOR_TYPE_OPTIONS: DoorTypeOption[] = [
  {
    id: 'giro_soft',
    title: 'Portas de Giro (Soft-Close)',
    description: 'Abertura tradicional com dobradiças amortecidas anti-impacto.',
    multiplier: 1.0,
  },
  {
    id: 'basculante_pistao',
    title: 'Portas Basculantes (Pistão a Gás)',
    description: 'Abertura para cima para móveis aéreos com sustentação.',
    multiplier: 1.12,
  },
  {
    id: 'correr_oculto',
    title: 'Portas de Correr Deslizantes',
    description: 'Sistemas de roldanas superiores ocultas de alto padrão.',
    multiplier: 1.25,
  },
  {
    id: 'cava_embutida',
    title: 'Puxadores Cava Usinados no MDF',
    description: 'Design minimalista sem puxadores aparentes externos.',
    multiplier: 1.15,
  },
];

export const FURNITURE_MODULES: FurnitureModuleOption[] = [
  // COZINHA
  { id: 'cozinha_balcao', environmentId: 'cozinha', title: 'Balcão Inferior da Pia (Gabinete com Gaveteiros)', description: 'Base estrutural com corrediças reforçadas e portas de giro.', extraMultiplier: 1.0 },
  { id: 'cozinha_aereos', environmentId: 'cozinha', title: 'Armários Aéreos Superiores', description: 'Módulos fixados na parede com portas basculantes e nichos.', extraMultiplier: 0.8 },
  { id: 'cozinha_torre', environmentId: 'cozinha', title: 'Torre Quente (Forno & Micro-ondas)', description: 'Módulo vertical com aberturas técnicas de ventilação.', extraMultiplier: 0.6 },
  { id: 'cozinha_paneleiro', environmentId: 'cozinha', title: 'Paneleiro / Despensa Vertical', description: 'Armário de piso ao teto com prateleiras ajustáveis.', extraMultiplier: 0.7 },
  { id: 'cozinha_ilha', environmentId: 'cozinha', title: 'Ilha Central com Cooktop/Balcão', description: 'Estrutura 360° para cooktop, tomada retrátil e banquetas.', extraMultiplier: 0.9 },

  // DORMITÓRIO
  { id: 'dormitorio_roupeiro', environmentId: 'dormitorio', title: 'Guarda-Roupa Planejado de Parede', description: 'Roupeiro completo com maleiro, cabideiros e gavetas internas.', extraMultiplier: 1.2 },
  { id: 'dormitorio_cabeceira', environmentId: 'dormitorio', title: 'Painel de Cabeceira Integrado', description: 'Painel ripado ou estofado estendido atrás da cama.', extraMultiplier: 0.5 },
  { id: 'dormitorio_criados', environmentId: 'dormitorio', title: 'Mesas de Cabeceira Suspensas (Par)', description: 'Gaveteiros acoplados ao painel lateral da cama.', extraMultiplier: 0.4 },
  { id: 'dormitorio_penteadeira', environmentId: 'dormitorio', title: 'Penteadeira / Camarim com Espelho', description: 'Bancada com gaveta divisória de maquiagem.', extraMultiplier: 0.5 },

  // CLOSET
  { id: 'closet_cabideiros', environmentId: 'closet', title: 'Módulos de Cabideiros Abertos', description: 'Níveis de cabides em alumínio para vestidos, ternos e camisas.', extraMultiplier: 0.9 },
  { id: 'closet_gaveteiros', environmentId: 'closet', title: 'Torre de Gavetas com Corrediças Ocultas', description: 'Gavetas com frente em vidro ou acrílico para visualização.', extraMultiplier: 0.8 },
  { id: 'closet_sapateira', environmentId: 'closet', title: 'Sapateira Deslizante Vertical', description: 'Prateleiras inclinadas telescópicas para pares de sapatos.', extraMultiplier: 0.6 },
  { id: 'closet_maleiro', environmentId: 'closet', title: 'Maleiro Superior Perimetral', description: 'Compartimentos superiores abertos para malas e edredons.', extraMultiplier: 0.5 },

  // HOME OFFICE
  { id: 'office_bancada', environmentId: 'home_office', title: 'Bancada Principal Dupla/Simples', description: 'Tampo encorpado de 30mm/45mm com passa-cabos.', extraMultiplier: 0.8 },
  { id: 'office_aereos', environmentId: 'home_office', title: 'Armários Aéreos Fechados para Arquivos', description: 'Armários suspensos organizadores com chave ou toque.', extraMultiplier: 0.6 },
  { id: 'office_estante', environmentId: 'home_office', title: 'Estante Aberta para Livros e Decoração', description: 'Nichos vazados com opções de iluminação.', extraMultiplier: 0.5 },
  { id: 'office_gaveteiro', environmentId: 'home_office', title: 'Gaveteiro Volante com Rodízios', description: 'Módulo móvel com trava de segurança.', extraMultiplier: 0.3 },

  // PAINEL TV / HOME THEATER
  { id: 'painel_ripado', environmentId: 'painel_tv', title: 'Painel Ripado Principal até o Teto', description: 'Revestimento ripado de alta definição em MDF nobre.', extraMultiplier: 0.8 },
  { id: 'painel_rack', environmentId: 'painel_tv', title: 'Rack Suspenso com Gavetões e Furação', description: 'Módulo inferior flutuante para receptores e consoles.', extraMultiplier: 0.6 },
  { id: 'painel_cristaleira', environmentId: 'painel_tv', title: 'Cristaleira Lateral com Iluminação', description: 'Armário vertical com porta em alumínio e vidro.', extraMultiplier: 0.7 },

  // BANHEIRO
  { id: 'banheiro_gabinete', environmentId: 'banheiro', title: 'Gabinete Suspenso sob a Pia', description: 'Armário inferior resistente à umidade com gavetões.', extraMultiplier: 0.7 },
  { id: 'banheiro_espelheira', environmentId: 'banheiro', title: 'Armário Espelheiro Superior', description: 'Portas espelhadas com nicho interno organizador.', extraMultiplier: 0.5 },
  { id: 'banheiro_coluna', environmentId: 'banheiro', title: 'Coluna Suspensa para Toalhas', description: 'Armário vertical estreito para cosméticos e toalhas.', extraMultiplier: 0.4 },

  // LAVANDERIA
  { id: 'lavanderia_aereos', environmentId: 'lavanderia', title: 'Armários Aéreos para Produtos de Limpeza', description: 'Módulos suspensos com suporte para vassouras.', extraMultiplier: 0.6 },
  { id: 'lavanderia_balcao', environmentId: 'lavanderia', title: 'Balcão Inferior de Tanque e Máquina', description: 'Fechamento sob o tanque inox e espaço lavadora.', extraMultiplier: 0.6 },
  { id: 'lavanderia_tulha', environmentId: 'lavanderia', title: 'Tulha Basculante para Roupas', description: 'Cesto aramado embutido para organização.', extraMultiplier: 0.3 },

  // ÁREA GOURMET
  { id: 'gourmet_churrasqueira', environmentId: 'gourmet', title: 'Balcão de Apoio para Churrasqueira', description: 'Módulo inferior com portas para carvão e utensílios.', extraMultiplier: 0.9 },
  { id: 'gourmet_aereos', environmentId: 'gourmet', title: 'Armários Aéreos com Portas de Vidro', description: 'Módulos suspensos com nicho para copos e garrafas.', extraMultiplier: 0.7 },
  { id: 'gourmet_chopeira', environmentId: 'gourmet', title: 'Balcão para Chopeira / Cervejeira Embutida', description: 'Nicho com isolamento e circulação de ar.', extraMultiplier: 0.6 },
];

export const ENVIRONMENTS: EnvironmentOption[] = [
  {
    id: 'cozinha',
    title: 'Cozinha Planejada',
    subtitle: 'Armários, ilha central, armários suspensos e despensa sob medida.',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    baseMultiplier: 1.25,
  },
  {
    id: 'dormitorio',
    title: 'Dormitório',
    subtitle: 'Guarda-roupas sob medida, cabeceiras estofadas e criado-mudo.',
    image: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80',
    baseMultiplier: 1.0,
  },
  {
    id: 'closet',
    title: 'Closet',
    subtitle: 'Módulos abertos, sapateiras deslizantes e nichos de iluminação.',
    image: 'https://images.unsplash.com/photo-1558882224-dda166733046?auto=format&fit=crop&w=800&q=80',
    baseMultiplier: 1.15,
  },
  {
    id: 'home_office',
    title: 'Home Office',
    subtitle: 'Bancadas ergonômicas, gaveteiros acoplados e estantes decorativas.',
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
    baseMultiplier: 0.9,
  },
  {
    id: 'painel_tv',
    title: 'Painel de TV / Home Theater',
    subtitle: 'Painéis ripados, nichos para aparelhos e racks suspensos modernos.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    baseMultiplier: 0.85,
  },
  {
    id: 'banheiro',
    title: 'Banheiro / Lavabo',
    subtitle: 'Gabinetes suspensos, nichos de box e espelheiras inteligentes.',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    baseMultiplier: 0.8,
  },
  {
    id: 'lavanderia',
    title: 'Lavanderia',
    subtitle: 'Armários para produtos, tulha para roupas e espaço para máquinas.',
    image: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=800&q=80',
    baseMultiplier: 0.75,
  },
  {
    id: 'area_gourmet',
    title: 'Área Gourmet',
    subtitle: 'Bancadas de churrasqueira, balcão refrigerado e armários externos.',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    baseMultiplier: 1.3,
  },
];

export interface ModuleTemplate {
  templateId: string;
  environmentId: string;
  title: string;
  category: 'base' | 'aereo' | 'torre' | 'ilha' | 'painel' | 'closet';
  defaultWidthMm: number;
  defaultHeightMm: number;
  defaultDepthMm: number;
  minWidthMm: number;
  maxWidthMm: number;
  iconName: string;
  description: string;
}

export const CORTECLOUD_MODULE_TEMPLATES: ModuleTemplate[] = [
  // COZINHA
  { templateId: 'balcao_pia', environmentId: 'cozinha', title: 'Balcão Inferior da Pia (2 Portas)', category: 'base', defaultWidthMm: 1200, defaultHeightMm: 720, defaultDepthMm: 600, minWidthMm: 600, maxWidthMm: 2000, iconName: 'Box', description: 'Gabinete inferior para acomodação da pia e cuba.' },
  { templateId: 'gaveteiro_base', environmentId: 'cozinha', title: 'Gaveteiro Inferior 3 Gavetas', category: 'base', defaultWidthMm: 600, defaultHeightMm: 720, defaultDepthMm: 600, minWidthMm: 400, maxWidthMm: 1000, iconName: 'Sliders', description: 'Módulo com corrediças telescópicas/soft-close para talheres e potes.' },
  { templateId: 'torre_quente', environmentId: 'cozinha', title: 'Torre Quente (Forno & Micro)', category: 'torre', defaultWidthMm: 600, defaultHeightMm: 2200, defaultDepthMm: 600, minWidthMm: 600, maxWidthMm: 800, iconName: 'Layers', description: 'Armário vertical técnico com recuos para forno e micro-ondas.' },
  { templateId: 'paneleiro', environmentId: 'cozinha', title: 'Paneleiro / Despensa Vertical', category: 'torre', defaultWidthMm: 500, defaultHeightMm: 2200, defaultDepthMm: 600, minWidthMm: 400, maxWidthMm: 800, iconName: 'Layers', description: 'Módulo alto de armazenamento com prateleiras móveis.' },
  { templateId: 'aereo_2portas', environmentId: 'cozinha', title: 'Armário Aéreo Superior (2 Portas)', category: 'aereo', defaultWidthMm: 800, defaultHeightMm: 720, defaultDepthMm: 350, minWidthMm: 600, maxWidthMm: 1400, iconName: 'Box', description: 'Módulo suspenso fixado na parede.' },
  { templateId: 'aereo_vidro', environmentId: 'cozinha', title: 'Aéreo Basculante com Vidro Reflecta', category: 'aereo', defaultWidthMm: 900, defaultHeightMm: 400, defaultDepthMm: 350, minWidthMm: 600, maxWidthMm: 1200, iconName: 'Sparkles', description: 'Porta basculante com vidros refletivos e amortecedor.' },
  { templateId: 'ilha_cozinha', environmentId: 'cozinha', title: 'Ilha Central com Cooktop', category: 'ilha', defaultWidthMm: 1500, defaultHeightMm: 900, defaultDepthMm: 800, minWidthMm: 1000, maxWidthMm: 2400, iconName: 'Grid', description: 'Bancada central multifuncional 360°.' },

  // DORMITÓRIO / CLOSET
  { templateId: 'roupeiro_2portas', environmentId: 'dormitorio', title: 'Módulo Roupeiro Guarda-Roupa', category: 'closet', defaultWidthMm: 900, defaultHeightMm: 2400, defaultDepthMm: 600, minWidthMm: 600, maxWidthMm: 1400, iconName: 'Box', description: 'Módulo com cabideiro e maleiro superior.' },
  { templateId: 'cabeceira_painel', environmentId: 'dormitorio', title: 'Painel de Cabeceira Ripado', category: 'painel', defaultWidthMm: 1800, defaultHeightMm: 1200, defaultDepthMm: 50, minWidthMm: 1400, maxWidthMm: 3000, iconName: 'Grid', description: 'Painel decorativo para apoio da cama.' },
  { templateId: 'criado_mudo', environmentId: 'dormitorio', title: 'Mesa de Cabeceira Suspensa', category: 'base', defaultWidthMm: 450, defaultHeightMm: 350, defaultDepthMm: 400, minWidthMm: 350, maxWidthMm: 600, iconName: 'Box', description: 'Gaveteiro flutuante acoplado ao painel.' },

  // SALA / PAINEL TV
  { templateId: 'painel_tv_sala', environmentId: 'painel_tv', title: 'Painel de TV Ripado Inteiriço', category: 'painel', defaultWidthMm: 2000, defaultHeightMm: 2400, defaultDepthMm: 60, minWidthMm: 1400, maxWidthMm: 3500, iconName: 'Grid', description: 'Painel estrutural para suporte de televisão até 75".' },
  { templateId: 'rack_suspenso', environmentId: 'painel_tv', title: 'Rack Suspenso com Gavetões', category: 'base', defaultWidthMm: 2000, defaultHeightMm: 350, defaultDepthMm: 450, minWidthMm: 1400, maxWidthMm: 3500, iconName: 'Box', description: 'Rack flutuante para receptores e consoles.' },

  // BANHEIRO
  { templateId: 'gabinete_banheiro', environmentId: 'banheiro', title: 'Gabinete Suspenso de Banheiro', category: 'base', defaultWidthMm: 800, defaultHeightMm: 550, defaultDepthMm: 450, minWidthMm: 500, maxWidthMm: 1400, iconName: 'Box', description: 'Armário sob a cuba de lavatório.' },
  { templateId: 'espelheira_banheiro', environmentId: 'banheiro', title: 'Armário Espelheiro Superior', category: 'aereo', defaultWidthMm: 800, defaultHeightMm: 700, defaultDepthMm: 150, minWidthMm: 500, maxWidthMm: 1400, iconName: 'Sparkles', description: 'Porta espelhada com compartimentos para cosméticos.' },
];

export const FINISHES: FinishOption[] = [
  {
    id: 'mdf_branco',
    title: 'MDF Branco Standard',
    description: 'Elegante, neutro e de alta durabilidade com excelente custo-benefício.',
    multiplier: 1.0,
    tag: 'Mais Vendido',
  },
  {
    id: 'madeirado',
    title: 'Padrão Madeirado',
    description: 'Textura suave de madeira natural (Carvalho, Nogueira ou Freijó).',
    multiplier: 1.22,
    tag: 'Aconchegante',
  },
  {
    id: 'premium',
    title: 'MDF Premium Super Matt',
    description: 'Acabamento aveludado com tecnologia anti-digital e ultra-resistente.',
    multiplier: 1.45,
    tag: 'Sofisticado',
  },
  {
    id: 'laca',
    title: 'Laca de Alta Precisão',
    description: 'Pintura automotiva com brilho intenso ou fosco aveludado em qualquer cor.',
    multiplier: 1.75,
    tag: 'Luxo Exclusivo',
  },
];

export const HARDWARE_OPTIONS: HardwareOption[] = [
  {
    id: 'basica',
    title: 'Ferragens Básicas',
    description: 'Dobradiças convencionais e corrediças telescópicas padrão.',
    multiplier: 1.0,
    brand: 'Nacional Standard',
  },
  {
    id: 'intermediaria',
    title: 'Ferragens Intermediárias',
    description: 'Dobradiças com amortecimento pneumático (Soft-Close) e corrediças reforçadas.',
    multiplier: 1.18,
    brand: 'FGV / Hafele Soft',
  },
  {
    id: 'premium',
    title: 'Ferragens Premium',
    description: 'Sistema Blum austríaco, corrediças oculta com amortecimento total e gaveta metálica.',
    multiplier: 1.40,
    brand: 'Blum Austria / Hettich',
  },
];

export const ADDITIONAL_ITEMS: AdditionalItemOption[] = [
  {
    id: 'led',
    title: 'Iluminação por Fitas de LED embutidas',
    description: 'Perfis de alumínio com iluminação quente/fria embutidos nos armários.',
    extraCost: 1800,
  },
  {
    id: 'vidro',
    title: 'Portas em Vidro Reflecta ou Fumê',
    description: 'Molduras de alumínio anodizado com vidros refletivos de alto padrão.',
    extraCost: 3500,
  },
  {
    id: 'ilha',
    title: 'Ilha Central / Balcão Multifuncional',
    description: 'Módulo central para cooktop, tomadas embutidas e banquetas.',
    extraCost: 4800,
  },
  {
    id: 'torre_quente',
    title: 'Torre Quente para Forno & Micro-ondas',
    description: 'Nichos com ventilação adequada e portas basculantes.',
    extraCost: 2200,
  },
  {
    id: 'nichos',
    title: 'Nichos Decorativos com Revestimento',
    description: 'Espaços abertos contrastantes para decoração e adega.',
    extraCost: 1200,
  },
  {
    id: 'portas_vidro_deslizantes',
    title: 'Portas de Vidro Deslizantes Grandes',
    description: 'Sistemas de roldanas amortecidas para guarda-roupas ou closets.',
    extraCost: 3900,
  },
  {
    id: 'gavetas_ocultas',
    title: 'Gavetas Internas com Divisórios de Joias/Talheres',
    description: 'Organizadores de veludo e madeira nobre embutidos.',
    extraCost: 1500,
  },
];

export const STORE_PLANS: StorePlanTier[] = [
  {
    id: 'Gold',
    title: 'Plano Gold (Starter)',
    priceMonthly: 490,
    leadsCap: 'Até 30 Leads/mês',
    regionCoverage: '1 Cidade Principal + 2 Vizinhos',
    features: [
      'Até 30 Leads qualificados por mês',
      'Recebimento de leads em 1 cidade principal',
      'Notificações instantâneas por WhatsApp e E-mail',
      'Recebimento da Proposta Técnica em PDF',
      'Painel B2B Básico para Gestão de Leads',
      'Suporte via Ticket/E-mail em 24h',
    ],
  },
  {
    id: 'Platinum',
    title: 'Plano Platinum (Pro)',
    priceMonthly: 990,
    leadsCap: 'Até 80 Leads/mês',
    regionCoverage: 'Região Metropolitana (até 10 Cidades)',
    badge: 'Mais Popular / Recomendado',
    features: [
      'Até 80 Leads qualificados por mês (Fila Prioritária)',
      'Cobertura em até 10 Cidades da Região Metropolitana',
      'Painel B2B Avançado com CRM e Funil de Vendas',
      'Acesso ao Projeto 3D Renderizado + Medidas Detalhadas',
      'Notificações instantâneas em grupo comercial no WhatsApp',
      'Selo "Loja Parceira Verificada PlanejaFácil"',
      'Suporte Prioritário por WhatsApp em horário comercial',
    ],
  },
  {
    id: 'Diamond',
    title: 'Plano Diamond (Enterprise)',
    priceMonthly: 1990,
    leadsCap: 'Leads Ilimitados / Prioridade Máxima',
    regionCoverage: 'Múltiplas Regiões / Estado Inteiro',
    badge: 'Enterprise Exclusivo',
    features: [
      'Leads ILIMITADOS com Prioridade Absoluta na Fila',
      'Cobertura Estadual ou Múltiplas Filiais da Loja',
      'Integração via API / Webhooks (Zapier, RD Station, HubSpot, ERP)',
      'Vitrine Comercial Exclusiva no Portal com Galeria de Projetos',
      'Recebimento do Plano de Corte Técnico (Cortecloud/Promob)',
      'Gerente de Contas Dedicado + Treinamento de Vendas B2B',
      'Suporte VIP 24/7 com SLA de atendimento em 15min',
    ],
  },
];

export const INITIAL_STORES: Store[] = [
  {
    id: 'store-1',
    name: 'Dell Anno Jardins',
    cnpj: '12.345.678/0001-90',
    responsibleName: 'Carlos Eduardo Silveira',
    city: 'São Paulo',
    state: 'SP',
    plan: 'Platinum',
    regionServed: 'São Paulo - Zona Sul & Oeste',
    status: 'Ativa',
    leadsCount: 148,
    phone: '(11) 98765-4321',
    whatsapp: '5511987654321',
    email: 'contato@dellannojardins.com.br',
    monthlyRevenue: 990,
    contractDate: '2026-01-15',
  },
  {
    id: 'store-2',
    name: 'Bontempo Moema',
    city: 'São Paulo',
    state: 'SP',
    plan: 'Diamond',
    regionServed: 'São Paulo - Capital',
    status: 'Ativa',
    leadsCount: 132,
    phone: '(11) 97654-3210',
    email: 'vendas@bontempomoema.com.br',
  },
  {
    id: 'store-3',
    name: 'Todeschini Batel',
    city: 'Curitiba',
    state: 'PR',
    plan: 'Platinum',
    regionServed: 'Curitiba e Região Metropolitana',
    status: 'Ativa',
    leadsCount: 94,
    phone: '(41) 99876-1234',
    email: 'atendimento@todeschinibatel.com.br',
  },
  {
    id: 'store-4',
    name: 'Florense Barra da Tijuca',
    city: 'Rio de Janeiro',
    state: 'RJ',
    plan: 'Diamond',
    regionServed: 'Rio de Janeiro - Zona Sul & Barra',
    status: 'Ativa',
    leadsCount: 110,
    phone: '(21) 98877-6655',
    email: 'contato@florensebarra.com.br',
  },
  {
    id: 'store-5',
    name: 'Favorita Campinas',
    city: 'Campinas',
    state: 'SP',
    plan: 'Gold',
    regionServed: 'Campinas, Valinhos e Vinhedo',
    status: 'Ativa',
    leadsCount: 67,
    phone: '(19) 99123-4567',
    email: 'vendas@favoritacampinas.com.br',
  },
  {
    id: 'store-6',
    name: 'Finger Belo Horizonte',
    city: 'Belo Horizonte',
    state: 'MG',
    plan: 'Platinum',
    regionServed: 'Belo Horizonte & Nova Lima',
    status: 'Ativa',
    leadsCount: 85,
    phone: '(31) 98456-7890',
    email: 'projetos@fingerbh.com.br',
  },
  {
    id: 'store-7',
    name: 'Criare Florianópolis',
    city: 'Florianópolis',
    state: 'SC',
    plan: 'Gold',
    regionServed: 'Grande Florianópolis',
    status: 'Ativa',
    leadsCount: 52,
    phone: '(48) 99654-3210',
    email: 'contato@criarefloripa.com.br',
  },
  {
    id: 'store-8',
    name: 'Ponto Alto Moinhos',
    city: 'Porto Alegre',
    state: 'RS',
    plan: 'Platinum',
    regionServed: 'Porto Alegre & Serra Gaúcha',
    status: 'Ativa',
    leadsCount: 61,
    phone: '(51) 99112-2334',
    email: 'projetos@pontoaltomoinhos.com.br',
  },
  {
    id: 'store-9',
    name: 'Marel Salvador',
    city: 'Salvador',
    state: 'BA',
    plan: 'Gold',
    regionServed: 'Salvador & Lauro de Freitas',
    status: 'Ativa',
    leadsCount: 43,
    phone: '(71) 98787-9900',
    email: 'atendimento@marelsalvador.com.br',
  },
  {
    id: 'store-10',
    name: 'New Móveis Brasília',
    city: 'Brasília',
    state: 'DF',
    plan: 'Platinum',
    regionServed: 'Distrito Federal (Lago Sul / Asa Sul)',
    status: 'Ativa',
    leadsCount: 78,
    phone: '(61) 99888-7766',
    email: 'vendas@newbsb.com.br',
  },
];

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-101',
    name: 'Mariana Rodrigues Silva',
    phone: '(11) 99234-5678',
    whatsapp: '5511992345678',
    email: 'mariana.silva@gmail.com',
    city: 'São Paulo',
    state: 'SP',
    cep: '04538-133',
    environment: 'Cozinha Planejada',
    dimensions: { length: 4.5, height: 2.7, width: 3.2, areaM2: 14.4 },
    finishPattern: 'Laca de Alta Precisão',
    hardwareLevel: 'Ferragens Premium',
    additionalItems: ['Iluminação por Fitas de LED embutidas', 'Portas em Vidro Reflecta ou Fumê', 'Ilha Central / Balcão Multifuncional'],
    estimatedMin: 28500,
    estimatedMax: 36200,
    assignedStoreId: 'store-1',
    assignedStoreName: 'Dell Anno Jardins',
    status: 'novo',
    createdAt: '2026-08-20T14:30:00Z',
  },
  {
    id: 'lead-102',
    name: 'Dr. Roberto Camargo',
    phone: '(11) 98111-2233',
    whatsapp: '5511981112233',
    email: 'roberto.camargo@medico.com.br',
    city: 'São Paulo',
    state: 'SP',
    cep: '04510-001',
    environment: 'Closet',
    dimensions: { length: 5.0, height: 2.8, width: 3.5, areaM2: 17.5 },
    finishPattern: 'MDF Premium Super Matt',
    hardwareLevel: 'Ferragens Premium',
    additionalItems: ['Iluminação por Fitas de LED embutidas', 'Gavetas Internas com Divisórios de Joias/Talheres'],
    estimatedMin: 32000,
    estimatedMax: 41000,
    assignedStoreId: 'store-2',
    assignedStoreName: 'Bontempo Moema',
    status: 'em_atendimento',
    createdAt: '2026-08-20T11:15:00Z',
  },
  {
    id: 'lead-103',
    name: 'Fernanda & Lucas Oliveira',
    phone: '(41) 99777-8899',
    whatsapp: '5541997778899',
    email: 'fer.oliveira@outlook.com',
    city: 'Curitiba',
    state: 'PR',
    cep: '80420-090',
    environment: 'Área Gourmet',
    dimensions: { length: 6.0, height: 2.6, width: 4.0, areaM2: 24.0 },
    finishPattern: 'Padrão Madeirado',
    hardwareLevel: 'Ferragens Intermediárias',
    additionalItems: ['Ilha Central / Balcão Multifuncional', 'Nichos Decorativos com Revestimento'],
    estimatedMin: 24800,
    estimatedMax: 31900,
    assignedStoreId: 'store-3',
    assignedStoreName: 'Todeschini Batel',
    status: 'orcado',
    createdAt: '2026-08-19T16:45:00Z',
  },
  {
    id: 'lead-104',
    name: 'Guilherme Siqueira',
    phone: '(21) 99555-4433',
    whatsapp: '5521995554433',
    email: 'gui.siqueira@tech.com',
    city: 'Rio de Janeiro',
    state: 'RJ',
    cep: '22631-000',
    environment: 'Home Office',
    dimensions: { length: 3.8, height: 2.7, width: 2.8, areaM2: 10.6 },
    finishPattern: 'MDF Branco Standard',
    hardwareLevel: 'Ferragens Intermediárias',
    additionalItems: ['Iluminação por Fitas de LED embutidas'],
    estimatedMin: 14500,
    estimatedMax: 18900,
    assignedStoreId: 'store-4',
    assignedStoreName: 'Florense Barra da Tijuca',
    status: 'convertido',
    createdAt: '2026-08-18T09:20:00Z',
  },
  {
    id: 'lead-105',
    name: 'Carolina Meireles',
    phone: '(19) 99888-1122',
    whatsapp: '5519998881122',
    email: 'carol.meireles@arquitetura.com',
    city: 'Campinas',
    state: 'SP',
    cep: '13025-001',
    environment: 'Dormitório',
    dimensions: { length: 4.2, height: 2.7, width: 3.6, areaM2: 15.1 },
    finishPattern: 'MDF Premium Super Matt',
    hardwareLevel: 'Ferragens Premium',
    additionalItems: ['Portas de Vidro Deslizantes Grandes', 'Iluminação por Fitas de LED embutidas'],
    estimatedMin: 22400,
    estimatedMax: 29100,
    assignedStoreId: 'store-5',
    assignedStoreName: 'Favorita Campinas',
    status: 'novo',
    createdAt: '2026-08-20T08:50:00Z',
  },
  {
    id: 'lead-106',
    name: 'Marcelo Castro',
    phone: '(31) 98765-1111',
    whatsapp: '5531987651111',
    email: 'marcelo.castro@engenharia.com',
    city: 'Belo Horizonte',
    state: 'MG',
    cep: '30130-100',
    environment: 'Painel de TV / Home Theater',
    dimensions: { length: 5.2, height: 2.8, width: 0.6, areaM2: 3.1 },
    finishPattern: 'Padrão Madeirado',
    hardwareLevel: 'Ferragens Intermediárias',
    additionalItems: ['Iluminação por Fitas de LED embutidas', 'Nichos Decorativos com Revestimento'],
    estimatedMin: 12900,
    estimatedMax: 16800,
    assignedStoreId: 'store-6',
    assignedStoreName: 'Finger Belo Horizonte',
    status: 'em_atendimento',
    createdAt: '2026-08-19T13:10:00Z',
  },
  {
    id: 'lead-107',
    name: 'Patricia & André Costa',
    phone: '(48) 99999-3344',
    whatsapp: '5548999993344',
    email: 'patricia.costa@gmail.com',
    city: 'Florianópolis',
    state: 'SC',
    cep: '88015-200',
    environment: 'Cozinha Planejada',
    dimensions: { length: 4.8, height: 2.7, width: 3.5, areaM2: 16.8 },
    finishPattern: 'Laca de Alta Precisão',
    hardwareLevel: 'Ferragens Premium',
    additionalItems: ['Torre Quente para Forno & Micro-ondas', 'Ilha Central / Balcão Multifuncional', 'Portas em Vidro Reflecta ou Fumê'],
    estimatedMin: 34500,
    estimatedMax: 43200,
    assignedStoreId: 'store-7',
    assignedStoreName: 'Criare Florianópolis',
    status: 'orcado',
    createdAt: '2026-08-18T17:40:00Z',
  },
  {
    id: 'lead-108',
    name: 'Eduardo Fontes',
    phone: '(51) 98444-5566',
    whatsapp: '5551984445566',
    email: 'eduardo.fontes@advocacia.com',
    city: 'Porto Alegre',
    state: 'RS',
    cep: '90570-020',
    environment: 'Banheiro / Lavabo',
    dimensions: { length: 2.5, height: 2.6, width: 1.8, areaM2: 4.5 },
    finishPattern: 'MDF Premium Super Matt',
    hardwareLevel: 'Ferragens Premium',
    additionalItems: ['Iluminação por Fitas de LED embutidas'],
    estimatedMin: 8900,
    estimatedMax: 11800,
    assignedStoreId: 'store-8',
    assignedStoreName: 'Ponto Alto Moinhos',
    status: 'convertido',
    createdAt: '2026-08-17T11:05:00Z',
  },
];

export const REGIONS_DATA: RegionStat[] = [
  { state: 'SP', stateCode: 'SP', name: 'São Paulo', leadsCount: 542, storesCount: 48, totalVolume: 14850000 },
  { state: 'RJ', stateCode: 'RJ', name: 'Rio de Janeiro', leadsCount: 285, storesCount: 26, totalVolume: 8200000 },
  { state: 'PR', stateCode: 'PR', name: 'Paraná', leadsCount: 198, storesCount: 18, totalVolume: 5600000 },
  { state: 'SC', stateCode: 'SC', name: 'Santa Catarina', leadsCount: 142, storesCount: 14, totalVolume: 4100000 },
  { state: 'RS', stateCode: 'RS', name: 'Rio Grande do Sul', leadsCount: 165, storesCount: 15, totalVolume: 4700000 },
  { state: 'MG', stateCode: 'MG', name: 'Minas Gerais', leadsCount: 210, storesCount: 20, totalVolume: 6100000 },
  { state: 'BA', stateCode: 'BA', name: 'Bahia', leadsCount: 95, storesCount: 9, totalVolume: 2700000 },
  { state: 'DF', stateCode: 'DF', name: 'Distrito Federal', leadsCount: 118, storesCount: 10, totalVolume: 3500000 },
  { state: 'GO', stateCode: 'GO', name: 'Goiás', leadsCount: 84, storesCount: 8, totalVolume: 2300000 },
  { state: 'PE', stateCode: 'PE', name: 'Pernambuco', leadsCount: 72, storesCount: 7, totalVolume: 1900000 },
];
