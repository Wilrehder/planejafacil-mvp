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
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.useplanejafacil.com';
  return `${origin}/?sign_token=${encodeURIComponent(token)}`;
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

  const storeName = template?.tradeName || template?.companyName || 'Móveis Planejados';
  const storeCnpj = template?.cnpj || 'Não informado';
  const storeAddress = template?.address || 'Endereço da Loja';
  const storeContact = [template?.phone, template?.email].filter(Boolean).join(' • ') || 'Contato da loja';

  const clientName = lead?.name || order.clientName || 'Cliente';
  const clientCpf = lead?.cpf || order.clientCpf || 'Não informado';
  const clientRg = lead?.rg || (order as any)?.clientRg || 'Não informado';
  const clientPhone = lead?.phone || order.phone || 'Não informado';
  const clientEmail = lead?.email || 'Não informado';
  const billingAddr = lead?.billingAddress || order.billingAddress || order.address || 'Não informado';
  const installAddr = lead?.installationAddress || order.installationAddress || billingAddr;
  const deliveryDays = lead?.desiredDeadline || (template?.defaultDeliveryDays ? `${template.defaultDeliveryDays} dias` : '45 dias úteis');

  const orderNum = order.orderNumber || '#PED-NOVO';
  const dateFormatted = new Date().toLocaleDateString('pt-BR');

  // Proposal e alocações
  const proposal = (order as any)?.commercialProposal || {};
  const allocations: PaymentAllocation[] = (order as any)?.paymentAllocations || proposal.paymentAllocations || [];
  const totalContract = order.contractedValue || order.totalValue || proposal.finalOrderTotal || 0;
  const discountAmount = proposal.discountAmount || 0;
  const discountPct = proposal.discountPct || 0;
  const promobVal = proposal.promobValue || 0;
  const conventionalTotal = proposal.conventionalTotal || 0;

  let y = 14;

  const checkPageBreak = (spaceNeeded: number) => {
    if (y + spaceNeeded > 280) {
      doc.addPage();
      y = 15;
    }
  };

  // --- CABEÇALHO DA LOJA ---
  doc.setFillColor(27, 43, 72); // #1B2B48
  doc.rect(10, y, 190, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(storeName.toUpperCase(), 15, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`CNPJ: ${storeCnpj} | ${storeAddress}`, 15, y + 13);
  doc.text(`${storeContact}`, 15, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`CONTRATO DE FORNECIMENTO`, 145, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Nº ${orderNum} • Emissão: ${dateFormatted}`, 145, y + 14);

  y += 28;

  // --- DADOS DO CONTRATANTE ---
  doc.setFillColor(245, 247, 250);
  doc.rect(10, y, 190, 28, 'F');
  doc.setDrawColor(220, 225, 230);
  doc.rect(10, y, 190, 28, 'S');

  doc.setTextColor(27, 43, 72);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. DADOS DO(A) CONTRATANTE', 14, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);

  doc.text(`Nome Completo: ${clientName}`, 14, y + 11);
  doc.text(`CPF: ${clientCpf}`, 120, y + 11);
  doc.text(`RG: ${clientRg}`, 160, y + 11);

  doc.text(`Telefone / WhatsApp: ${clientPhone}`, 14, y + 16);
  doc.text(`E-mail: ${clientEmail}`, 120, y + 16);

  doc.text(`Endereço de Cobrança: ${billingAddr}`, 14, y + 21);
  doc.text(`Endereço de Instalação: ${installAddr}`, 14, y + 26);

  y += 33;

  // --- TABELA DE PRODUTOS E AMBIENTES (Sem expor custos) ---
  doc.setFillColor(245, 247, 250);
  doc.rect(10, y, 190, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(27, 43, 72);
  doc.text('2. DISCRIMINAÇÃO DOS AMBIENTES E PRODUTOS CONTRATADOS', 14, y + 5);
  y += 9;

  // Header da tabela de itens
  doc.setFillColor(230, 235, 242);
  doc.rect(10, y, 190, 6, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(27, 43, 72);
  doc.text('Item / Descrição do Produto', 14, y + 4);
  doc.text('Categoria', 115, y + 4);
  doc.text('Qtd', 145, y + 4);
  doc.text('Valor Comercial', 170, y + 4);
  y += 7;

  // Linha 1: Móveis Planejados Promob
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  const envName = proposal.promobProjectName || order.environment || 'Projeto Planejado Sob Medida';
  doc.text(`Ambiente Planejado: ${envName}`, 14, y + 4);
  doc.text('Sob Medida (Promob)', 115, y + 4);
  doc.text('1 conj.', 145, y + 4);
  doc.text(formatBRL(promobVal > 0 ? promobVal : totalContract), 170, y + 4);
  doc.setDrawColor(230, 230, 230);
  doc.line(10, y + 6, 200, y + 6);
  y += 8;

  // Linhas Adicionais: Móveis Convencionais (se houver)
  const convItems = proposal.conventionalItems || [];
  for (const item of convItems) {
    checkPageBreak(8);
    doc.text(`${item.name}`, 14, y + 4);
    doc.text(item.category || 'Convencional', 115, y + 4);
    doc.text(`${item.quantity} un`, 145, y + 4);
    doc.text(formatBRL(item.total || (item.salePrice * item.quantity)), 170, y + 4);
    doc.line(10, y + 6, 200, y + 6);
    y += 8;
  }

  y += 3;

  // --- RESUMO FINANCEIRO E CONDIÇÕES DE PAGAMENTO ---
  checkPageBreak(40);
  doc.setFillColor(245, 247, 250);
  doc.rect(10, y, 190, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(27, 43, 72);
  doc.text('3. CONDIÇÕES COMERCIAIS E FORMAS DE PAGAMENTO', 14, y + 5);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);

  if (discountAmount > 0) {
    doc.text(`Desconto Comercial Concedido: ${formatBRL(discountAmount)} (${discountPct}%)`, 14, y + 4);
    y += 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(27, 43, 72);
  doc.text(`VALOR TOTAL CONTRATADO: ${formatBRL(totalContract)}`, 14, y + 4);
  y += 8;

  // Tabela de Alocações de Pagamento
  doc.setFillColor(235, 240, 245);
  doc.rect(14, y, 182, 6, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Modalidade de Pagamento', 18, y + 4);
  doc.text('Parcelamento', 105, y + 4);
  doc.text('Valor da Parcela', 135, y + 4);
  doc.text('Subtotal', 168, y + 4);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

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

  y += 6;

  // --- PRAZO DE ENTREGA ---
  checkPageBreak(15);
  doc.setFillColor(240, 249, 245); // suave verde
  doc.rect(10, y, 190, 10, 'F');
  doc.setDrawColor(67, 147, 70);
  doc.rect(10, y, 190, 10, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 80, 40);
  doc.text(`PRAZO ESTIMADO DE ENTREGA E MONTAGEM: ${deliveryDays.toUpperCase()} APÓS MEDIÇÃO FINA`, 14, y + 6.5);
  y += 16;

  // --- CLÁUSULAS CONTRATUAIS ---
  checkPageBreak(25);
  doc.setFillColor(245, 247, 250);
  doc.rect(10, y, 190, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(27, 43, 72);
  doc.text('4. CLÁUSULAS E CONDIÇÕES CONTRATUAIS GERAIS', 14, y + 5);
  y += 11;

  const clauses = template?.clauses && template.clauses.length > 0 
    ? template.clauses 
    : DEFAULT_CONTRACT_CLAUSES;

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
  doc.line(95, y + 14, 160, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(clientName, 95, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`CPF: ${clientCpf}`, 95, y + 22);
  doc.text('CONTRATANTE', 95, y + 26);

  // QR Code à direita (se fornecido)
  if (qrCodeDataUrl) {
    try {
      doc.addImage(qrCodeDataUrl, 'PNG', 165, y + 2, 28, 28);
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text('Validação Digital', 167, y + 32);
    } catch (e) {
      console.warn('Erro ao inserir QR Code no PDF:', e);
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

/**
 * Busca dados do contrato para exibição na página pública de assinatura do cliente
 */
export async function fetchContractForSigning(token: string): Promise<{
  success: boolean;
  order?: any;
  template?: StoreContractTemplate;
  alreadySigned?: boolean;
  signedInfo?: any;
  error?: string;
}> {
  if (!token) return { success: false, error: 'Token de assinatura não informado.' };

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('contract_token', token)
      .maybeSingle();

    if (error || !order) {
      return { success: false, error: 'Contrato não encontrado ou link expirado.' };
    }

    const template = await fetchStoreContractTemplate(order.tenant_id);

    const alreadySigned = order.contract_status === 'assinado';

    return {
      success: true,
      order,
      template,
      alreadySigned,
      signedInfo: alreadySigned ? {
        signedAt: order.contract_signed_at,
        signedByName: order.contract_signed_by_name,
        signedByCpf: order.contract_signed_by_cpf,
        signatureIp: order.contract_signature_ip
      } : undefined
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao carregar dados do contrato.' };
  }
}

/**
 * Executa a assinatura eletrônica do cliente com registro de evidências e auditoria
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
): Promise<{ success: boolean; error?: string }> {
  if (!token || !signerData.name?.trim() || !signerData.cpf?.trim()) {
    return { success: false, error: 'Nome e CPF do signatário são obrigatórios.' };
  }

  try {
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, tenant_id, order_number')
      .eq('contract_token', token)
      .single();

    if (orderErr || !order) {
      return { success: false, error: 'Pedido associado ao contrato não foi localizado.' };
    }

    const signedAt = new Date().toISOString();
    const clientIp = signerData.ip || 'Dispositivo Cliente Web';
    const userAgent = signerData.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Web');

    // 1. Gravar registro de assinatura auditável
    const { error: sigErr } = await supabase
      .from('contract_signatures')
      .insert({
        order_id: order.id,
        token,
        signer_name: signerData.name.trim(),
        signer_cpf: signerData.cpf.trim(),
        signer_ip: clientIp,
        signer_user_agent: userAgent,
        signature_image: signerData.signatureImage || null,
        signed_at: signedAt
      });

    if (sigErr) {
      console.warn('Erro ao inserir contract_signatures:', sigErr);
    }

    // 2. Atualizar pedido para status de assinado
    const { error: updErr } = await supabase
      .from('orders')
      .update({
        contract_status: 'assinado',
        contract_signed_at: signedAt,
        contract_signed_by_name: signerData.name.trim(),
        contract_signed_by_cpf: signerData.cpf.trim(),
        contract_signature_ip: clientIp,
        contract_signature_image: signerData.signatureImage || null,
        updated_at: signedAt
      })
      .eq('id', order.id);

    if (updErr) {
      return { success: false, error: updErr.message };
    }

    // 3. Registrar na timeline de auditoria do pedido
    try {
      await supabase.from('order_audit_logs').insert({
        order_id: order.id,
        action: 'contract_signed_digitally',
        details: `Contrato assinado eletronicamente por ${signerData.name.trim()} (CPF ${signerData.cpf.trim()}) via link seguro.`,
        author: signerData.name.trim()
      });
    } catch {
      // ignore timeline fallback
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao processar assinatura eletrônica.' };
  }
}
