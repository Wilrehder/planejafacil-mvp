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
    id: 'store-mogi',
    name: 'Smarth House — Mogi das Cruzes',
    cnpj: '45.123.890/0001-12',
    responsibleName: 'Atendimento Mogi',
    city: 'Mogi das Cruzes',
    state: 'SP',
    plan: 'Diamond',
    regionServed: 'Mogi das Cruzes & Alto Tietê',
    status: 'Ativa',
    leadsCount: 42,
    phone: '(11) 4799-1000',
    whatsapp: '5511947991000',
    email: 'mogi@smarthhouse.com.br',
    monthlyRevenue: 1990,
    contractDate: '2026-01-10',
  },
  {
    id: 'store-suzano',
    name: 'Smarth House — Suzano',
    cnpj: '45.123.890/0002-25',
    responsibleName: 'Atendimento Suzano',
    city: 'Suzano',
    state: 'SP',
    plan: 'Platinum',
    regionServed: 'Suzano & Poá',
    status: 'Ativa',
    leadsCount: 38,
    phone: '(11) 4748-2000',
    whatsapp: '5511947482000',
    email: 'suzano@smarthhouse.com.br',
    monthlyRevenue: 990,
    contractDate: '2026-02-01',
  },
  {
    id: 'store-guarulhos',
    name: 'Smarth House — Guarulhos',
    cnpj: '45.123.890/0003-38',
    responsibleName: 'Atendimento Guarulhos',
    city: 'Guarulhos',
    state: 'SP',
    plan: 'Diamond',
    regionServed: 'Guarulhos & Região',
    status: 'Ativa',
    leadsCount: 65,
    phone: '(11) 2468-3000',
    whatsapp: '5511924683000',
    email: 'guarulhos@smarthhouse.com.br',
    monthlyRevenue: 1990,
    contractDate: '2026-01-15',
  },
  {
    id: 'store-sjc',
    name: 'Smarth House — São José dos Campos',
    cnpj: '45.123.890/0004-41',
    responsibleName: 'Atendimento SJC',
    city: 'São José dos Campos',
    state: 'SP',
    plan: 'Diamond',
    regionServed: 'São José dos Campos & Vale do Paraíba',
    status: 'Ativa',
    leadsCount: 54,
    phone: '(12) 3922-4000',
    whatsapp: '5512939224000',
    email: 'sjc@smarthhouse.com.br',
    monthlyRevenue: 1990,
    contractDate: '2026-01-20',
  },
  {
    id: 'store-aruja',
    name: 'Smarth House — Arujá',
    cnpj: '45.123.890/0005-54',
    responsibleName: 'Atendimento Arujá',
    city: 'Arujá',
    state: 'SP',
    plan: 'Gold',
    regionServed: 'Arujá & Condomínios',
    status: 'Ativa',
    leadsCount: 29,
    phone: '(11) 4655-5000',
    whatsapp: '5511946555000',
    email: 'aruja@smarthhouse.com.br',
    monthlyRevenue: 490,
    contractDate: '2026-02-10',
  },
  {
    id: 'store-sorocaba',
    name: 'Smarth House — Sorocaba',
    cnpj: '45.123.890/0006-67',
    responsibleName: 'Atendimento Sorocaba',
    city: 'Sorocaba',
    state: 'SP',
    plan: 'Platinum',
    regionServed: 'Sorocaba & Votorantim',
    status: 'Ativa',
    leadsCount: 47,
    phone: '(15) 3233-6000',
    whatsapp: '5515932336000',
    email: 'sorocaba@smarthhouse.com.br',
    monthlyRevenue: 990,
    contractDate: '2026-02-15',
  },
];

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-101',
    name: 'Mariana Rodrigues Silva',
    phone: '(11) 99234-5678',
    whatsapp: '5511992345678',
    email: 'mariana.silva@gmail.com',
    city: 'Mogi das Cruzes',
    state: 'SP',
    cep: '08710-000',
    environment: 'Cozinha Principal (14.4m²), Closet (10m²)',
    finishPattern: 'Laca & Madeirado',
    qualityTier: 'Alto Padrão',
    purchaseTimeline: 'Até 3 meses',
    estimatedMin: 28500,
    estimatedMax: 36200,
    assignedStoreId: 'store-mogi',
    assignedStoreName: 'Smarth House — Mogi das Cruzes',
    status: 'novo',
    createdAt: '2026-08-21T10:30:00Z',
  },
  {
    id: 'lead-102',
    name: 'Dr. Roberto Camargo',
    phone: '(11) 98111-2233',
    whatsapp: '5511981112233',
    email: 'roberto.camargo@medico.com.br',
    city: 'Mogi das Cruzes',
    state: 'SP',
    cep: '08780-000',
    environment: 'Quarto Casal (18m²), Banheiro (6m²)',
    finishPattern: 'Madeirado Natural',
    qualityTier: 'Premium',
    purchaseTimeline: 'Imediatamente',
    estimatedMin: 32000,
    estimatedMax: 41000,
    assignedStoreId: 'store-mogi',
    assignedStoreName: 'Smarth House — Mogi das Cruzes',
    status: 'em_atendimento',
    createdAt: '2026-08-21T09:15:00Z',
  },
  {
    id: 'lead-103',
    name: 'Fernanda & Lucas Oliveira',
    phone: '(11) 99777-8899',
    whatsapp: '5511997778899',
    email: 'fer.oliveira@outlook.com',
    city: 'Suzano',
    state: 'SP',
    cep: '08674-000',
    environment: 'Área Gourmet (24m²)',
    finishPattern: 'Padrão Madeirado',
    qualityTier: 'Intermediário',
    purchaseTimeline: 'Entre 3 e 6 meses',
    estimatedMin: 24800,
    estimatedMax: 31900,
    assignedStoreId: 'store-suzano',
    assignedStoreName: 'Smarth House — Suzano',
    status: 'orcado',
    createdAt: '2026-08-20T16:45:00Z',
  },
  {
    id: 'lead-104',
    name: 'Guilherme Siqueira',
    phone: '(11) 99555-4433',
    whatsapp: '5511995554433',
    email: 'gui.siqueira@tech.com',
    city: 'Guarulhos',
    state: 'SP',
    cep: '07010-000',
    environment: 'Home Office (10.6m²), Sala de Estar (18m²)',
    finishPattern: 'Branco Texturizado',
    qualityTier: 'Intermediário',
    purchaseTimeline: 'Imediatamente',
    estimatedMin: 19500,
    estimatedMax: 24900,
    assignedStoreId: 'store-guarulhos',
    assignedStoreName: 'Smarth House — Guarulhos',
    status: 'convertido',
    createdAt: '2026-08-19T09:20:00Z',
  },
  {
    id: 'lead-105',
    name: 'Carolina Meireles',
    phone: '(12) 99888-1122',
    whatsapp: '5512998881122',
    email: 'carol.meireles@arquitetura.com',
    city: 'São José dos Campos',
    state: 'SP',
    cep: '12240-000',
    environment: 'Cozinha (15m²), Closet Suíte (12m²)',
    finishPattern: 'Laca de Alto Brilho',
    qualityTier: 'Alto Padrão',
    purchaseTimeline: 'Até 3 meses',
    estimatedMin: 42400,
    estimatedMax: 54100,
    assignedStoreId: 'store-sjc',
    assignedStoreName: 'Smarth House — São José dos Campos',
    status: 'novo',
    createdAt: '2026-08-21T08:50:00Z',
  },
  {
    id: 'lead-106',
    name: 'Marcelo Castro',
    phone: '(11) 98765-1111',
    whatsapp: '5511987651111',
    email: 'marcelo.castro@engenharia.com',
    city: 'Arujá',
    state: 'SP',
    cep: '07400-000',
    environment: 'Painel de TV / Home Theater (12m²)',
    finishPattern: 'Padrão Madeirado',
    qualityTier: 'Premium',
    purchaseTimeline: 'Até 3 meses',
    estimatedMin: 15900,
    estimatedMax: 19800,
    assignedStoreId: 'store-aruja',
    assignedStoreName: 'Smarth House — Arujá',
    status: 'em_atendimento',
    createdAt: '2026-08-20T13:10:00Z',
  },
  {
    id: 'lead-107',
    name: 'Patricia & André Costa',
    phone: '(15) 99999-3344',
    whatsapp: '5515999993344',
    email: 'patricia.costa@gmail.com',
    city: 'Sorocaba',
    state: 'SP',
    cep: '18010-000',
    environment: 'Cozinha Planejada (16.8m²), Lavanderia (8m²)',
    finishPattern: 'Laca & Madeirado',
    qualityTier: 'Alto Padrão',
    purchaseTimeline: 'Imediatamente',
    estimatedMin: 38500,
    estimatedMax: 48200,
    assignedStoreId: 'store-sorocaba',
    assignedStoreName: 'Smarth House — Sorocaba',
    status: 'orcado',
    createdAt: '2026-08-19T17:40:00Z',
  },
  {
    id: 'lead-108',
    name: 'Eduardo Fontes',
    phone: '(11) 98444-5566',
    whatsapp: '5511984445566',
    email: 'eduardo.fontes@advocacia.com',
    city: 'Suzano',
    state: 'SP',
    cep: '08670-000',
    environment: 'Banheiro / Lavabo (4.5m²)',
    finishPattern: 'Branco Texturizado',
    qualityTier: 'Econômico',
    purchaseTimeline: 'Apenas pesquisando',
    estimatedMin: 6900,
    estimatedMax: 8800,
    assignedStoreId: 'store-suzano',
    assignedStoreName: 'Smarth House — Suzano',
    status: 'convertido',
    createdAt: '2026-08-18T11:05:00Z',
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
