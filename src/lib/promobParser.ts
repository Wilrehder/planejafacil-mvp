/**
 * Parser especializado para arquivos XML exportados pelo Promob (ex: orcamento_montado_com_operacao).
 * Suporta execução universal (tanto no navegador quanto no Node.js/Vitest).
 */

export interface PromobProjectData {
  projectName?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  environmentName?: string;
  budgetValue: number;     // Valor de venda final (tag <BUDGET VALUE="...">)
  factoryOrderCost: number; // Custo de fábrica da loja (tag <ORDER VALUE="...">)
  tablePrice: number;      // Valor de tabela (tag <TOTALPRICES TABLE="...">)
  itemsCount: number;
}

export function parsePromobXML(xmlContent: string): PromobProjectData {
  if (!xmlContent || typeof xmlContent !== 'string') {
    throw new Error('Conteúdo XML inválido.');
  }

  // 1. Extrair Preços Globais (<TOTALPRICES>, <BUDGET>, <ORDER>)
  let budgetValue = 0;
  let factoryOrderCost = 0;
  let tablePrice = 0;

  const tableMatch = xmlContent.match(/<TOTALPRICES[^>]*\bTABLE=["']([^"']+)["']/i);
  if (tableMatch) {
    tablePrice = parseFloat(tableMatch[1].replace(',', '.')) || 0;
  }

  const budgetMatch = xmlContent.match(/<BUDGET[^>]*\bVALUE=["']([^"']+)["']/i);
  if (budgetMatch) {
    budgetValue = parseFloat(budgetMatch[1].replace(',', '.')) || 0;
  }

  const orderMatch = xmlContent.match(/<ORDER[^>]*\bVALUE=["']([^"']+)["']/i);
  if (orderMatch) {
    factoryOrderCost = parseFloat(orderMatch[1].replace(',', '.')) || 0;
  }

  // Se o budgetValue for 0, mas tablePrice existir, usa tablePrice
  if (budgetValue === 0 && tablePrice > 0) {
    budgetValue = tablePrice;
  }

  // 2. Extrair Dados do Cliente (<CUSTOMERSDATA>)
  const extractCustomerData = (fieldId: string): string => {
    const regex = new RegExp(`<DATA[^>]*\\bID=["']${fieldId}["'][^>]*\\bVALUE=["']([^"']*)["']`, 'i');
    const match = xmlContent.match(regex);
    return match ? match[1].trim() : '';
  };

  const clientName = extractCustomerData('nomecliente') || extractCustomerData('corporateName');
  const rawPhone = extractCustomerData('celular') || extractCustomerData('fone') || extractCustomerData('phone_Mobile_0');
  const clientPhone = rawPhone.replace(/^55\|?/, '').replace(/\D/g, '');
  const clientEmail = extractCustomerData('email') || extractCustomerData('email_Private_0');
  const environmentName = extractCustomerData('Environment');

  // 3. Extrair Ambientes (<AMBIENT ... DESCRIPTION="...">)
  let projectName = '';
  const ambientMatch = xmlContent.match(/<AMBIENT[^>]*\bDESCRIPTION=["']([^"']+)["']/i);
  if (ambientMatch) {
    projectName = ambientMatch[1].trim();
  }

  // Contagem de itens
  const itemMatches = xmlContent.match(/<ITEM\b/gi);
  const itemsCount = itemMatches ? itemMatches.length : 0;

  return {
    projectName: projectName || environmentName || 'Projeto Promob',
    clientName,
    clientPhone,
    clientEmail,
    environmentName: environmentName || projectName,
    budgetValue: Math.round(budgetValue * 100) / 100,
    factoryOrderCost: Math.round(factoryOrderCost * 100) / 100,
    tablePrice: Math.round(tablePrice * 100) / 100,
    itemsCount,
  };
}
