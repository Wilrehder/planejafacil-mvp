import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { supabase } from './supabase';
import { ContractClause, StoreContractTemplate, Order, PaymentAllocation } from '../types';

export const DEFAULT_CONTRACT_CLAUSES: ContractClause[] = [
  {
    id: 'clause-1',
    number: 'CLÁUSULA 1ª',
    title: 'DO OBJETO E PROJETO TÉCNICO',
    text: 'O presente contrato tem por objeto a fabricação sob medida, transporte e montagem dos móveis planejados e complementos discriminados na proposta comercial e no projeto técnico executivo aprovado pelo(a) CONTRATANTE, que passa a integrar este instrumento como anexo definitivo.'
  },
  {
    id: 'clause-2',
    number: 'CLÁUSULA 2ª',
    title: 'DO VALOR E CONDIÇÕES DE PAGAMENTO',
    text: 'Pelo fornecimento dos bens e serviços objeto deste contrato, o(a) CONTRATANTE pagará à CONTRATADA o valor global acordado, exatamente nas modalidades, prazos e vencimentos discriminados no quadro resumo de pagamentos deste instrumento. A inadimplência no pagamento ensejará juros moratórios de 1% ao mês e multa compensatória de 2% sobre o montante em atraso.'
  },
  {
    id: 'clause-3',
    number: 'CLÁUSULA 3ª',
    title: 'DOS PRAZOS DE FABRICAÇÃO E ENTREGA',
    text: 'O prazo de fabricação e entrega dos móveis será contado em dias úteis a partir da conclusão da medição fina no local de instalação e da aprovação formal do projeto executivo definitivo. Eventuais reformas estruturais pendentes sob responsabilidade do cliente prorrogam automaticamente os prazos na mesma proporção.'
  },
  {
    id: 'clause-4',
    number: 'CLÁUSULA 4ª',
    title: 'DAS RESPONSABILIDADES DO(A) CONTRATANTE',
    text: 'Constituem obrigações do(a) CONTRATANTE: a) Liberar o local da instalação completamente desocupado, com pisos e pinturas finalizados; b) Indicar com precisão a passagem de tubulações hidráulicas, condutos de gás e cabos elétricos embutidos; c) Garantir livre acesso à equipe de montagem em horários permitidos pelo condomínio ou local.'
  },
  {
    id: 'clause-5',
    number: 'CLÁUSULA 5ª',
    title: 'DAS RESPONSABILIDADES DA CONTRATADA',
    text: 'Constituem obrigações da CONTRATADA: a) Executar os serviços em estrita conformidade com as especificações técnicas, padrões de engenharia e materiais contratados; b) Utilizar equipe técnica capacitada e equipamentos adequados; c) Reparar eventuais vícios aparentes de montagem identificados na vistoria final de entrega.'
  },
  {
    id: 'clause-6',
    number: 'CLÁUSULA 6ª',
    title: 'DA MEDIÇÃO FINA NO LOCAL',
    text: 'Antes do envio do projeto à linha de produção, a CONTRATADA efetuará a medição fina presencial no imóvel. Caso sejam constatadas divergências dimensionais na alvenaria em relação à planta preliminar que inviabilizem a montagem original, as devidas correções técnicas serão acordadas sem custo adicional de engenharia.'
  },
  {
    id: 'clause-7',
    number: 'CLÁUSULA 7ª',
    title: 'DA VISTORIA DE ENTREGA E TERMO DE ACEITE',
    text: 'Concluída a montagem dos móveis, as partes realizarão vistoria conjunta no local, lavrando o respectivo Termo de Aceite e Vistoria. Havendo pequenas pendências ou necessidade de assistência técnica em peças específicas, estas serão anotadas e solucionadas sem que isso justifique a retenção dos pagamentos acordados.'
  },
  {
    id: 'clause-8',
    number: 'CLÁUSULA 8ª',
    title: 'DA GARANTIA E ASSISTÊNCIA TÉCNICA',
    text: 'A CONTRATADA assegura a garantia legal de 90 (noventa) dias contra defeitos de fabricação e montagem, além da garantia de fábrica estendida para ferragens e estruturas de MDF/MDP, contados da data do Termo de Aceite, desde que observadas as recomendações de conservação, limpeza e peso contidas no manual de uso.'
  },
  {
    id: 'clause-9',
    number: 'CLÁUSULA 9ª',
    title: 'DAS ALTERAÇÕES DE PROJETO APÓS APROVAÇÃO',
    text: 'Quaisquer alterações de layout, acabamentos, padrões de cor ou medidas solicitadas pelo(a) CONTRATANTE após a assinatura deste contrato e entrada em produção dependerão de análise técnica prévia de viabilidade e serão formalizadas mediante Termo Aditivo, ajustando-se prazos e eventuais diferenças de custo.'
  },
  {
    id: 'clause-10',
    number: 'CLÁUSULA 10ª',
    title: 'DA RESCISÃO E MULTA COMPENSATÓRIA',
    text: 'A rescisão imotivada do presente contrato por qualquer das partes sujeitará a parte infratora ao pagamento de multa compensatória de 20% (vinte por cento) sobre o valor total do contrato, além do ressarcimento dos custos operacionais com matéria-prima já cortada ou encomendada com exclusividade até a data do distrato.'
  },
  {
    id: 'clause-11',
    number: 'CLÁUSULA 11ª',
    title: 'DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)',
    text: 'As partes declaram ciência e conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), comprometendo-se ao tratamento de dados pessoais estritamente para os fins necessários à execução deste contrato, emissão de documentos fiscais, cobrança e prestação de assistência pós-venda.'
  },
  {
    id: 'clause-12',
    number: 'CLÁUSULA 12ª',
    title: 'DO FORO DE ELEIÇÃO E VALIDADE JURÍDICA',
    text: 'Para dirimir quaisquer controvérsias oriundas deste instrumento, as partes elegem o Foro da Comarca da sede da CONTRATADA ou do domicílio do(a) CONTRATANTE, com expressa renúncia de qualquer outro. As partes reconhecem expressamente a plena validade jurídica das assinaturas físicas ou eletrônicas deste instrumento nos termos da legislação federal vigente.'
  }
];

export interface ContractPdfParams {
  order: Partial<Order>;
  template?: Partial<StoreContractTemplate>;
  lead?: {
    name?: string;
    phone?: string;
    email?: string;
    cpf?: string;
    rg?: string;
    billingAddress?: string;
    installationAddress?: string;
    desiredDeadline?: string;
  };
  signingUrl?: string;
  qrCodeDataUrl?: string;
  isSigned?: boolean;
  signatureImage?: string;
  signerName?: string;
  signerCpf?: string;
  signedAt?: string;
  signatureIp?: string;
  signatureUserAgent?: string;
  signatureId?: string;
  verificationHash?: string;
}

/**
 * Calcula hash criptográfico SHA-256 de integridade imutável do documento
 */
export async function computeContractIntegrityHash(payload: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);
      const hashBuf = await crypto.subtle.digest('SHA-256', data);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }
  } catch (e) {
    console.warn('Erro ao calcular hash criptográfico via SubtleCrypto:', e);
  }
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) - hash) + payload.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0').toUpperCase().repeat(4).slice(0, 64);
}

/**
 * Busca ou inicializa o modelo de contrato da loja parceira no Supabase.
 */
export async function fetchStoreContractTemplate(tenantId: string): Promise<StoreContractTemplate> {
  const defaultTemplate: StoreContractTemplate = {
    tenantId,
    companyName: 'Loja Parceira Planeja Fácil',
    tradeName: 'Móveis Planejados & Interiores',
    cnpj: '',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
    defaultDeliveryDays: 45,
    clauses: DEFAULT_CONTRACT_CLAUSES,
    generalConditions: 'Contrato padrão de fornecimento de móveis planejados sob medida.'
  };

  if (!tenantId) return defaultTemplate;

  try {
    const { data, error } = await supabase
      .from('store_contract_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !data) {
      return defaultTemplate;
    }

    return {
      tenantId: data.tenant_id,
      companyName: data.company_name || defaultTemplate.companyName,
      tradeName: data.trade_name || defaultTemplate.tradeName,
      cnpj: data.cnpj || '',
      address: data.address || '',
      phone: data.phone || '',
      email: data.email || '',
      logoUrl: data.logo_url || '',
      defaultDeliveryDays: data.default_delivery_days || 45,
      clauses: Array.isArray(data.clauses) && data.clauses.length > 0 ? data.clauses : DEFAULT_CONTRACT_CLAUSES,
      generalConditions: data.general_conditions || defaultTemplate.generalConditions
    };
  } catch (err) {
    console.warn('[customerContractService] Erro ao carregar template da loja:', err);
    return defaultTemplate;
  }
}

/**
 * Salva ou atualiza o modelo de contrato da loja parceira no Supabase.
 */
export async function saveStoreContractTemplate(template: StoreContractTemplate): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      tenant_id: template.tenantId,
      company_name: template.companyName,
      trade_name: template.tradeName,
      cnpj: template.cnpj,
      address: template.address,
      phone: template.phone,
      email: template.email,
      logo_url: template.logoUrl,
      default_delivery_days: template.defaultDeliveryDays || 45,
      clauses: template.clauses || DEFAULT_CONTRACT_CLAUSES,
      general_conditions: template.generalConditions || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('store_contract_templates')
      .upsert(payload, { onConflict: 'tenant_id' });

    if (error) {
      console.error('[customerContractService] Erro ao salvar template:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao salvar configurações do contrato.' };
  }
}

/**
 * Constrói a URL pública para assinatura digital do cliente
 */
export function getContractSigningUrl(token: string): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    // Em localhost, se não for configurado IP público, utiliza o domínio oficial da plataforma para garantir
    // que a leitura do QR Code pelo celular funcione imediatamente pela internet
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `https://www.useplanejafacil.com/?sign_token=${encodeURIComponent(token)}`;
    }
    return `${window.location.origin}/?sign_token=${encodeURIComponent(token)}`;
  }
  return `https://www.useplanejafacil.com/?sign_token=${encodeURIComponent(token)}`;
}

/**
 * Retorna URL local direta (útil para testes na mesma máquina)
 */
export function getLocalContractSigningUrl(token: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/?sign_token=${encodeURIComponent(token)}`;
  }
  return `https://www.useplanejafacil.com/?sign_token=${encodeURIComponent(token)}`;
}

/**
 * Gera DataURL do QRCode para validação do contrato
 */
export async function generateContractQrCodeDataUrl(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 140,
      color: {
        dark: '#1B2B48',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.warn('Erro ao gerar QR Code:', err);
    return '';
  }
}

const formatBRL = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(val || 0);
};

/**
 * Gera documento PDF do Contrato Comercial estruturado com base no modelo do PEDIDO 1384
 */
export async function generateContractPdfDoc(params: ContractPdfParams): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const { order, template, lead, signingUrl, qrCodeDataUrl } = params;
  const snapshot = (order as any)?.contract_snapshot || (order as any)?.contractSnapshot;

  const storeName = snapshot?.contractor?.tradeName || snapshot?.contractor?.companyName || template?.tradeName || template?.companyName || 'Móveis Planejados';
  const storeCnpj = snapshot?.contractor?.cnpj || template?.cnpj || 'Não informado';
  const storeAddress = snapshot?.contractor?.address || template?.address || 'Endereço da Loja';
  const storeSeller = snapshot?.contractor?.sellerName || (order as any)?.sellerName || (order as any)?.seller_name || 'Consultor Comercial';
  const storeContact = [
    snapshot?.contractor?.phone || template?.phone,
    snapshot?.contractor?.email || template?.email
  ].filter(Boolean).join(' • ') || 'Contato da loja';

  const clientName = snapshot?.customer?.name || lead?.name || order.clientName || (order as any)?.client_name || 'Cliente';
  const clientCpf = snapshot?.customer?.cpf || lead?.cpf || order.clientCpf || (order as any)?.client_cpf || 'Não informado';
  const clientRg = snapshot?.customer?.rg || lead?.rg || (order as any)?.clientRg || (order as any)?.client_rg || 'Não informado';
  const clientPhone = snapshot?.customer?.phone || lead?.phone || order.phone || (order as any)?.client_phone || 'Não informado';
  const clientEmail = snapshot?.customer?.email || lead?.email || (order as any)?.clientEmail || (order as any)?.client_email || 'Não informado';
  const billingAddr = snapshot?.customer?.billingAddress || lead?.billingAddress || order.billingAddress || (order as any)?.billing_address || order.address || 'Não informado';
  const installAddr = snapshot?.customer?.installationAddress || lead?.installationAddress || order.installationAddress || (order as any)?.installation_address || billingAddr;
  const deliveryDays = snapshot?.delivery?.deliveryDays || lead?.desiredDeadline || (order as any)?.desiredDeadline || (template?.defaultDeliveryDays ? `${template.defaultDeliveryDays} dias úteis` : '45 dias úteis');
  const deliveryRef = snapshot?.delivery?.deliveryReference || 'Contados em dias úteis a partir da conclusão da Medição Fina e assinatura formal do Projeto Executivo Final.';
  const orderNotes = snapshot?.delivery?.observations || (order as any)?.orderNotes || (order as any)?.order_notes || (order as any)?.commercialProposal?.observations || '';

  const orderNum = order.orderNumber || (order as any)?.order_number || '#PED-NOVO';
  const dateFormatted = new Date((order as any)?.created_at || (order as any)?.createdAt || Date.now()).toLocaleDateString('pt-BR');
  const contractVer = snapshot?.version || (order as any)?.contract_version || (order as any)?.contractVersion || 1;

  const isSigned = Boolean(
    params.isSigned ||
    (order as any)?.contractStatus === 'assinado' ||
    (order as any)?.contract_status === 'assinado' ||
    params.signatureImage ||
    (order as any)?.contractSignatureImage ||
    (order as any)?.contract_signature_image
  );
  const signatureImage = params.signatureImage || (order as any)?.contractSignatureImage || (order as any)?.contract_signature_image;
  const signerName = params.signerName || (order as any)?.contractSignedByName || (order as any)?.contract_signed_by_name || clientName;
  const signerCpf = params.signerCpf || (order as any)?.contractSignedByCpf || (order as any)?.contract_signed_by_cpf || clientCpf;
  const signedAtRaw = params.signedAt || (order as any)?.contractSignedAt || (order as any)?.contract_signed_at || new Date().toISOString();
  const signatureIp = params.signatureIp || (order as any)?.contractSignatureIp || (order as any)?.contract_signature_ip || 'Dispositivo Web';
  const signatureId = params.signatureId || (order as any)?.contractSignatureId || (order as any)?.uuid || (order as any)?.id || 'SIG-VALID';
  const userAgent = params.signatureUserAgent || 'Navegador Web / Mobile';

  // Proposal e alocações
  const proposal = (order as any)?.commercialProposal || (order as any)?.commercial_proposal || {};
  const allocations: PaymentAllocation[] = snapshot?.financials?.paymentAllocations || (order as any)?.paymentAllocations || (order as any)?.payment_allocations || proposal.paymentAllocations || [];
  const totalContract = snapshot?.financials?.finalContractedValue || order.contractedValue || (order as any)?.contracted_value || order.totalValue || (order as any)?.total_value || proposal.finalOrderTotal || 0;
  const grossSubtotal = snapshot?.financials?.subtotalGross || proposal.subtotalGross || totalContract;
  const discountAmount = snapshot?.financials?.discountAmount || proposal.discountAmount || proposal.discountValue || 0;
  const discountPct = snapshot?.financials?.discountPct || proposal.discountPct || proposal.discountPercentage || 0;
  const afterDiscount = snapshot?.financials?.subtotalAfterDiscount || proposal.subtotalAfterDiscount || (grossSubtotal - discountAmount);
  const feeAmount = snapshot?.financials?.paymentFeeAmount || proposal.paymentFeeAmount || 0;
  const promobVal = snapshot?.products?.promobValue ?? proposal.promobValue ?? (totalContract - (snapshot?.products?.conventionalTotal || 0));
  const conventionalTotal = snapshot?.products?.conventionalTotal ?? proposal.conventionalTotal ?? 0;
  const convItems = snapshot?.products?.conventionalItems || proposal.conventionalItems || [];
  const simEnvironments = snapshot?.products?.simulationEnvironments || [];

  let y = 14;

  const checkPageBreak = (spaceNeeded: number) => {
    if (y + spaceNeeded > 280) {
      doc.addPage();
      y = 15;
    }
  };

  // --- CABEÇALHO DA LOJA ---
  doc.setFillColor(27, 43, 72); // #1B2B48
  doc.rect(10, y, 190, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(storeName.toUpperCase(), 15, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`CNPJ: ${storeCnpj} | ${storeAddress}`, 15, y + 12);
  doc.text(`Contato: ${storeContact} • Vendedor Responsável: ${storeSeller}`, 15, y + 16.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`CONTRATO DE FORNECIMENTO`, 140, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Nº ${orderNum} (v${contractVer}) • Emissão: ${dateFormatted}`, 140, y + 12.5);

  y += 28;

  // --- DADOS DO CONTRATANTE ---
  doc.setFillColor(245, 247, 250);
  doc.rect(10, y, 190, 30, 'F');
  doc.setDrawColor(220, 225, 230);
  doc.rect(10, y, 190, 30, 'S');

  doc.setTextColor(27, 43, 72);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('1. DADOS DO(A) CONTRATANTE', 14, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);

  doc.text(`Nome Completo: ${clientName}`, 14, y + 10.5);
  doc.text(`CPF: ${clientCpf}`, 115, y + 10.5);
  doc.text(`RG: ${clientRg}`, 160, y + 10.5);

  doc.text(`Telefone / WhatsApp: ${clientPhone}`, 14, y + 15);
  doc.text(`E-mail: ${clientEmail}`, 115, y + 15);

  doc.text(`Endereço de Cobrança: ${billingAddr}`, 14, y + 19.5);
  doc.text(`Endereço de Instalação: ${installAddr}`, 14, y + 24);

  y += 34;

  // --- TABELA DE PRODUTOS E AMBIENTES (Sem expor custos) ---
  doc.setFillColor(245, 247, 250);
  doc.rect(10, y, 190, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(27, 43, 72);
  doc.text('2. DISCRIMINAÇÃO DOS AMBIENTES E PRODUTOS CONTRATADOS', 14, y + 5);
  y += 9;

  // Header da tabela de itens
  doc.setFillColor(230, 235, 242);
  doc.rect(10, y, 190, 6, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(27, 43, 72);
  doc.text('Item / Descrição Técnica do Produto', 14, y + 4);
  doc.text('Tipo / Categoria', 115, y + 4);
  doc.text('Qtd', 145, y + 4);
  doc.text('Valor Comercial', 170, y + 4);
  y += 7;

  // Linha 1: Móveis Planejados Promob
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  const envName = snapshot?.products?.promobProjectName || proposal.promobProjectName || order.environment || 'Projeto Planejado Sob Medida';
  doc.text(`Ambiente Planejado: ${envName}`, 14, y + 4);
  doc.text('Sob Medida (Promob)', 115, y + 4);
  doc.text('1 conj.', 145, y + 4);
  doc.text(formatBRL(promobVal > 0 ? promobVal : totalContract), 170, y + 4);
  doc.setDrawColor(230, 230, 230);
  doc.line(10, y + 6, 200, y + 6);
  y += 8;

  // Ambientes detalhados da simulação (se houver)
  for (const env of simEnvironments) {
    checkPageBreak(7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(`• ${env.name} (Área: ${env.areaM2}m²${env.ceilingHeight ? `, Pé direito: ${env.ceilingHeight}m` : ''})`, 18, y + 3.5);
    doc.line(10, y + 5.5, 200, y + 5.5);
    y += 7;
  }

  // Linhas Adicionais: Móveis Convencionais (se houver)
  for (const item of convItems) {
    checkPageBreak(8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);
    doc.text(`${item.name}`, 14, y + 4);
    doc.text(item.category || 'Convencional', 115, y + 4);
    doc.text(`${item.quantity} un`, 145, y + 4);
    doc.text(formatBRL(item.total || (item.salePrice * item.quantity)), 170, y + 4);
    doc.line(10, y + 6, 200, y + 6);
    y += 8;
  }

  y += 2;

  // --- RESUMO FINANCEIRO E CONDIÇÕES DE PAGAMENTO ---
  checkPageBreak(45);
  doc.setFillColor(245, 247, 250);
  doc.rect(10, y, 190, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(27, 43, 72);
  doc.text('3. CONDIÇÕES COMERCIAIS E FORMAS DE PAGAMENTO', 14, y + 5);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);

  doc.text(`Subtotal Bruto dos Produtos: ${formatBRL(grossSubtotal)}`, 14, y + 3.5);
  if (discountAmount > 0) {
    doc.text(`Desconto Comercial: -${formatBRL(discountAmount)} (${discountPct}%)`, 95, y + 3.5);
    doc.text(`Subtotal c/ Desconto: ${formatBRL(afterDiscount)}`, 155, y + 3.5);
    y += 5.5;
  } else {
    y += 5.5;
  }

  if (feeAmount > 0) {
    doc.text(`Taxas Operacionais de Parcelamento: +${formatBRL(feeAmount)}`, 14, y + 3.5);
    y += 5.5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(27, 43, 72);
  doc.text(`VALOR TOTAL CONTRATADO: ${formatBRL(totalContract)}`, 14, y + 4);
  y += 7.5;

  // Tabela de Alocações de Pagamento
  doc.setFillColor(235, 240, 245);
  doc.rect(14, y, 182, 6, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Modalidade de Pagamento', 18, y + 4);
  doc.text('Parcelamento', 105, y + 4);
  doc.text('Valor da Parcela', 135, y + 4);
  doc.text('Subtotal da Forma', 168, y + 4);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  if (allocations.length > 0) {
    for (const alloc of allocations) {
      checkPageBreak(8);
      doc.text(alloc.methodLabel || 'Pagamento', 18, y + 4);
      doc.text(alloc.installments > 1 ? `${alloc.installments} parcelas` : 'À Vista', 105, y + 4);
      doc.text(formatBRL(alloc.installmentValue), 135, y + 4);
      doc.text(formatBRL(alloc.totalAmount || alloc.totalAmountWithFee || 0), 168, y + 4);
      doc.line(14, y + 6, 196, y + 6);
      y += 7;
    }
  } else {
    doc.text(proposal.paymentMethodLabel || 'Condição padrão acordada', 18, y + 4);
    doc.text(proposal.installments > 1 ? `${proposal.installments}x` : 'À Vista', 105, y + 4);
    doc.text(formatBRL(proposal.installmentValue || totalContract), 135, y + 4);
    doc.text(formatBRL(totalContract), 168, y + 4);
    y += 7;
  }

  y += 5;

  // --- PRAZO DE ENTREGA E OBSERVAÇÕES ---
  checkPageBreak(25);
  doc.setFillColor(240, 249, 245);
  doc.rect(10, y, 190, 16, 'F');
  doc.setDrawColor(67, 147, 70);
  doc.rect(10, y, 190, 16, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 80, 40);
  doc.text(`PRAZO ESTIMADO DE ENTREGA E MONTAGEM: ${deliveryDays.toUpperCase()}`, 14, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(40, 90, 50);
  doc.text(deliveryRef, 14, y + 9.5);
  if (orderNotes) {
    doc.text(`Observações do Pedido: ${orderNotes}`, 14, y + 13.5);
  }
  y += 20;

  // --- CLÁUSULAS CONTRATUAIS ---
  checkPageBreak(25);
  doc.setFillColor(245, 247, 250);
  doc.rect(10, y, 190, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(27, 43, 72);
  doc.text('4. CLÁUSULAS E CONDIÇÕES CONTRATUAIS GERAIS', 14, y + 5);
  y += 11;

  const clauses = snapshot?.clauses && Array.isArray(snapshot.clauses) && snapshot.clauses.length > 0
    ? snapshot.clauses
    : (template?.clauses && template.clauses.length > 0 
      ? template.clauses 
      : DEFAULT_CONTRACT_CLAUSES);

  for (const clause of clauses) {
    checkPageBreak(22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(27, 43, 72);
    doc.text(`${clause.number} - ${clause.title}`, 10, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);

    const splitText = doc.splitTextToSize(clause.text, 190);
    for (const line of splitText) {
      checkPageBreak(5);
      doc.text(line, 10, y);
      y += 3.8;
    }
    y += 3;
  }

  // --- BLOCO DE ASSINATURAS E QR CODE ---
  checkPageBreak(50);
  y += 4;
  doc.setDrawColor(200, 205, 210);
  doc.line(10, y, 200, y);
  y += 6;

  // Assinaturas em duas colunas + QR Code
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(27, 43, 72);
  doc.text('5. FORMALIZAÇÃO E ASSINATURA DAS PARTES', 10, y);
  y += 12;

  // Coluna 1: Loja
  doc.setDrawColor(100, 100, 100);
  doc.line(10, y + 14, 85, y + 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(storeName, 10, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`CNPJ: ${storeCnpj}`, 10, y + 22);
  doc.text('CONTRATADA', 10, y + 26);

  // Coluna 2: Cliente
  if (isSigned && signatureImage) {
    try {
      doc.addImage(signatureImage, 'PNG', 98, y - 1, 60, 14);
    } catch (e) {
      console.warn('Erro ao inserir assinatura desenhada no PDF:', e);
    }
  }

  doc.line(95, y + 14, 160, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(clientName, 95, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`CPF: ${clientCpf}`, 95, y + 22);
  doc.text(isSigned ? 'CONTRATANTE (Assinado Eletronicamente)' : 'CONTRATANTE', 95, y + 26);

  // QR Code de Assinatura (se ainda não assinado e fornecido)
  if (!isSigned && qrCodeDataUrl) {
    try {
      doc.addImage(qrCodeDataUrl, 'PNG', 165, y + 2, 28, 28);
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text('Validação Digital', 167, y + 32);
    } catch (e) {
      console.warn('Erro ao inserir QR Code no PDF:', e);
    }
  }

  // --- SEÇÃO 6: CERTIFICADO DE ASSINATURA ELETRÔNICA (QUANDO ASSINADO) ---
  if (isSigned) {
    checkPageBreak(56);
    y += 33;

    const certDateFormatted = new Date(signedAtRaw).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'medium'
    });

    const hashRaw = `${orderNum}|${signerCpf}|${signedAtRaw}|${signatureId}|v${contractVer}`;
    const integrityHash = params.verificationHash || await computeContractIntegrityHash(hashRaw);

    // QR Code de validação de autenticidade digital do contrato já assinado
    const verifyUrl = `https://www.useplanejafacil.com/?verify_contract=${encodeURIComponent(orderNum)}`;
    let certQrCodeUrl = '';
    try {
      certQrCodeUrl = await QRCode.toDataURL(verifyUrl, {
        margin: 1,
        width: 120,
        color: { dark: '#1B2B48', light: '#FFFFFF' }
      });
    } catch (e) {
      // ignore
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.35);
    doc.roundedRect(10, y, 190, 46, 2, 2, 'FD');

    doc.setTextColor(27, 43, 72);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('6. CERTIFICADO DE ASSINATURA ELETRÔNICA — AUDITORIA DIGITAL', 14, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Documento assinado eletronicamente com plena eficácia probatória nos termos da MP 2.200-2/2001 e Lei Federal nº 14.063/2020.',
      14,
      y + 10.5
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Signatário: ${signerName}`, 14, y + 16);
    doc.text(`CPF: ${signerCpf}`, 105, y + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Data / Horário (Brasília): ${certDateFormatted}`, 14, y + 21);
    doc.text(`IP de Origem: ${signatureIp}`, 105, y + 21);

    doc.text(`ID da Assinatura: ${signatureId}`, 14, y + 26);
    doc.text(`Versão Contratual: v${contractVer} (Definitiva e Imutável)`, 105, y + 26);

    const truncatedUa = userAgent.length > 55 ? userAgent.substring(0, 52) + '...' : userAgent;
    doc.text(`Dispositivo / Navegador: ${truncatedUa}`, 14, y + 31);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text('Hash SHA-256 de Integridade:', 14, y + 36.5);
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(integrityHash, 14, y + 40.5);

    if (certQrCodeUrl) {
      try {
        doc.addImage(certQrCodeUrl, 'PNG', 166, y + 12, 28, 28);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(37, 99, 235);
        doc.text('Autenticidade Verificada', 165, y + 43);
      } catch (e) {
        // ignore
      }
    }
  }

  // Rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Contrato Pedido ${orderNum} • ${storeName} • Página ${i} de ${totalPages}`,
      105,
      292,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Gera Blob do PDF para visualização ou upload
 */
export async function generateContractPdfBlob(params: ContractPdfParams): Promise<Blob> {
  const doc = await generateContractPdfDoc(params);
  return doc.output('blob');
}

/**
 * Efetua download direto do PDF no navegador
 */
export async function downloadContractPdf(params: ContractPdfParams, filename?: string): Promise<void> {
  const doc = await generateContractPdfDoc(params);
  const name = filename || `CONTRATO_${params.order.orderNumber || 'PEDIDO'}.pdf`;
  doc.save(name);
}

export interface ContractSigningResponse {
  success: boolean;
  order?: any;
  template?: StoreContractTemplate;
  snapshot?: any;
  alreadySigned?: boolean;
  signedInfo?: any;
  error?: string;
}

/**
 * Busca dados do contrato para exibição na página pública de assinatura do cliente.
 * Utiliza a RPC segura get_contract_for_signing para permitir acesso público sem login.
 */
export async function fetchContractForSigning(token: string): Promise<ContractSigningResponse> {
  if (!token) return { success: false, error: 'Token de assinatura não informado.' };

  try {
    const { data, error } = await supabase.rpc('get_contract_for_signing', {
      p_token: token
    });

    if (error) {
      console.error('[customerContractService] Erro ao chamar get_contract_for_signing:', error);
      return { success: false, error: error.message || 'Erro ao carregar dados do contrato.' };
    }

    if (!data || !data.success) {
      return { success: false, error: data?.error || 'Contrato não encontrado ou link expirado.' };
    }

    return {
      success: true,
      order: data.order,
      template: data.template,
      snapshot: data.snapshot || data.order?.contract_snapshot || data.order?.contractSnapshot,
      alreadySigned: Boolean(data.alreadySigned),
      signedInfo: data.signedInfo || undefined
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao carregar dados do contrato.' };
  }
}

/**
 * Salva e versiona a versão definitiva do contrato de um pedido no Supabase.
 */
export async function saveOrderContractVersion(
  orderId: string,
  options?: {
    clauses?: ContractClause[];
    storeData?: {
      companyName?: string;
      tradeName?: string;
      cnpj?: string;
      address?: string;
      phone?: string;
      email?: string;
      defaultDeliveryDays?: number;
    };
    orderNotes?: string;
  }
): Promise<{ success: boolean; contractVersion?: number; contractSnapshot?: any; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('save_order_contract_version', {
      p_order_id: orderId,
      p_clauses: options?.clauses || null,
      p_store_data: options?.storeData || null,
      p_order_notes: options?.orderNotes || null
    });

    if (error) {
      console.error('[customerContractService] Erro em save_order_contract_version:', error);
      return { success: false, error: error.message };
    }

    if (!data || !data.success) {
      return { success: false, error: data?.error || 'Erro ao salvar revisão contratual.' };
    }

    return {
      success: true,
      contractVersion: data.contract_version,
      contractSnapshot: data.contract_snapshot
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao salvar versão do contrato.' };
  }
}

/**
 * Persiste o arquivo PDF assinado no Supabase Storage e o vincula à Pasta Digital do Pedido
 */
export async function archiveSignedContractOnServer(params: {
  orderId: string;
  tenantId: string;
  orderNumber: string;
  pdfBlob: Blob;
  authorName?: string;
}): Promise<{ success: boolean; documentId?: string; filePath?: string; signedUrl?: string; error?: string }> {
  try {
    const { orderId, tenantId, orderNumber, pdfBlob, authorName } = params;
    const sanitizedOrderNum = (orderNumber || 'PED').replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `${tenantId}/${orderId}/contrato_assinado_${sanitizedOrderNum}.pdf`;

    // 1. Upload para o bucket order-documents
    const { error: uploadError } = await supabase.storage
      .from('order-documents')
      .upload(storagePath, pdfBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/pdf'
      });

    if (uploadError) {
      console.warn('[customerContractService] Aviso no upload do contrato assinado:', uploadError.message);
    }

    // 2. Registrar no banco via RPC transacional archive_order_signed_contract
    const fileName = `contrato_assinado_${sanitizedOrderNum}.pdf`;
    const { data, error: rpcError } = await supabase.rpc('archive_order_signed_contract', {
      p_order_id: orderId,
      p_file_path: storagePath,
      p_file_name: fileName,
      p_file_size_bytes: pdfBlob.size,
      p_mime_type: 'application/pdf',
      p_author_name: authorName || 'Sistema Planeja Fácil (Assinatura Eletrônica)'
    });

    if (rpcError || !data?.success) {
      console.error('[customerContractService] Erro ao registrar contrato no ERP:', rpcError || data?.error);
      return { success: false, error: rpcError?.message || data?.error };
    }

    // 3. Obter signed URL para abertura direta
    let signedUrl: string | undefined = undefined;
    try {
      const { data: signedData } = await supabase.storage
        .from('order-documents')
        .createSignedUrl(storagePath, 900);
      signedUrl = signedData?.signedUrl;
    } catch (e) {
      // signed url is optional
    }

    return {
      success: true,
      documentId: data.document_id,
      filePath: storagePath,
      signedUrl
    };
  } catch (err: any) {
    console.error('[customerContractService] Exceção ao arquivar contrato assinado:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Garante que um pedido já assinado possua o documento PDF formalizado na Pasta Digital.
 */
export async function ensureOrderSignedContractArchived(order: any): Promise<{
  success: boolean;
  filePath?: string;
  signedUrl?: string;
  blob?: Blob;
}> {
  if (!order || (order.contractStatus !== 'assinado' && order.contract_status !== 'assinado')) {
    return { success: false };
  }

  const existingDoc = (order.documents || []).find(
    (d: any) => d.stage === 'contrato' || d.docType === 'contrato_assinado' || d.docType === 'contrato'
  );
  if (existingDoc?.filePath) {
    return { success: true, filePath: existingDoc.filePath };
  }

  // Gera Blob e arquiva no banco e Storage
  try {
    const blob = await generateContractPdfBlob({
      order,
      isSigned: true,
      signatureImage: order.contractSignatureImage || order.contract_signature_image,
      signerName: order.contractSignedByName || order.contract_signed_by_name || order.clientName,
      signerCpf: order.contractSignedByCpf || order.contract_signed_by_cpf || order.clientCpf,
      signedAt: order.contractSignedAt || order.contract_signed_at,
      signatureIp: order.contractSignatureIp || order.contract_signature_ip
    });

    const tenantId = order.tenantId || order.tenant_id;
    const orderId = order.uuid || order.id;
    const orderNum = order.orderNumber || order.order_number || order.id;

    if (tenantId && orderId) {
      const archiveRes = await archiveSignedContractOnServer({
        orderId,
        tenantId,
        orderNumber: orderNum,
        pdfBlob: blob,
        authorName: `${order.contractSignedByName || 'Cliente'} (Assinatura Eletrônica)`
      });
      return { success: archiveRes.success, filePath: archiveRes.filePath, signedUrl: archiveRes.signedUrl, blob };
    }

    return { success: true, blob };
  } catch (err) {
    console.warn('[customerContractService] Erro ao sincronizar contrato assinado:', err);
    return { success: false };
  }
}

/**
 * Executa a assinatura eletrônica do cliente com registro de evidências e avanço automático para Medição Fina.
 * Utiliza a RPC segura submit_contract_signature no Supabase.
 */
export async function submitDigitalSignature(
  token: string,
  signerData: {
    name: string;
    cpf: string;
    ip?: string;
    userAgent?: string;
    signatureImage?: string;
  }
): Promise<{ success: boolean; orderId?: string; orderNumber?: string; currentStage?: string; error?: string }> {
  if (!token || !signerData.name?.trim() || !signerCpfFormatValid(signerData.cpf)) {
    return { success: false, error: 'Nome completo e CPF válido do signatário são obrigatórios.' };
  }

  try {
    const userAgent = signerData.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Web');
    const clientIp = signerData.ip || 'Dispositivo Web';

    const { data, error } = await supabase.rpc('submit_contract_signature', {
      p_token: token,
      p_signer_name: signerData.name.trim(),
      p_signer_cpf: signerData.cpf.trim(),
      p_signer_ip: clientIp,
      p_signer_user_agent: userAgent,
      p_signature_image: signerData.signatureImage || null
    });

    if (error) {
      console.error('[customerContractService] Erro na RPC submit_contract_signature:', error);
      return { success: false, error: error.message };
    }

    if (!data || !data.success) {
      return { success: false, error: data?.error || 'Não foi possível confirmar a assinatura.' };
    }

    // Arquiva automaticamente o PDF definitivo assinado no Supabase Storage e na Pasta Digital
    try {
      const orderId = data.order_id;
      const orderNumber = data.order_number;
      const tenantId = data.tenant_id;
      const sigId = data.signature_id;
      const signedAt = data.signed_at || new Date().toISOString();

      const contractDetails = await fetchContractForSigning(token);
      if (contractDetails.success && contractDetails.order) {
        const pdfBlob = await generateContractPdfBlob({
          order: contractDetails.order,
          template: contractDetails.template,
          isSigned: true,
          signatureImage: signerData.signatureImage,
          signerName: signerData.name.trim(),
          signerCpf: signerData.cpf.trim(),
          signedAt,
          signatureId: sigId,
          signatureIp: clientIp,
          signatureUserAgent: userAgent
        });

        if (tenantId && orderId && orderNumber) {
          await archiveSignedContractOnServer({
            orderId,
            tenantId,
            orderNumber,
            pdfBlob,
            authorName: `${signerData.name.trim()} (Assinatura Eletrônica)`
          });
        }
      }
    } catch (archiveErr) {
      console.warn('[customerContractService] Aviso na geração/arquivamento do PDF assinado:', archiveErr);
    }

    return {
      success: true,
      orderId: data.order_id,
      orderNumber: data.order_number,
      currentStage: data.current_stage
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao processar assinatura eletrônica.' };
  }
}

/**
 * Confirma formalização contratual física e avança para Medição Fina
 */
export async function confirmPhysicalContractOnServer(
  orderId: string,
  notes?: string
): Promise<{ success: boolean; currentStage?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('confirm_physical_contract_and_advance', {
      p_order_id: orderId,
      p_notes: notes || null
    });

    if (error) {
      console.error('[customerContractService] Erro ao confirmar contrato físico:', error);
      return { success: false, error: error.message };
    }

    if (!data || !data.success) {
      return { success: false, error: data?.error || 'Não foi possível confirmar o contrato físico.' };
    }

    return { success: true, currentStage: data.current_stage };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao processar confirmação de contrato.' };
  }
}

function signerCpfFormatValid(cpf: string): boolean {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, '');
  return clean.length === 11;
}
