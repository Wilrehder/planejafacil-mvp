import { supabase } from './supabase';
import { Store, StoreContractDetails } from '../types';

export interface GenerateContractParams {
  storeName: string;
  cnpj?: string;
  responsibleName?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  plan: 'Basic' | 'Pro' | string;
  monthlyPrice: number;
  leadPrice: number;
  billingDueDay: number;
  hasRetentionClause: boolean;
  retentionMonths: number;
  extraUserPrice?: number;
}

export function generateB2BContractText(params: GenerateContractParams): string {
  const planName = params.plan === 'Pro' ? 'Plano Pro Avançado' : 'Plano Básico Essencial';
  const formattedMonthly = Number(params.monthlyPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedLeadPrice = Number(params.leadPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedExtraUser = Number(params.extraUserPrice || 39.90).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const maxPlanUsers = params.plan === 'Pro' ? 3 : 1;

  const retentionSection = params.hasRetentionClause
    ? `4. CLÁUSULA DE PERMANÊNCIA MÍNIMA (FIDELIDADE)
4.1. Este contrato possui prazo de permanência mínima de ${params.retentionMonths || 6} (seis) meses a contar da data de adesão.
4.2. Em caso de cancelamento imotivado antecipado antes do término do período de permanência, será aplicada multa rescisória compensatória equivalente a 30% (trinta por cento) do somatório das mensalidades restantes até o término do período contratado.`
    : `4. VIGÊNCIA E RESCISÃO SEM MULTA
4.1. Este contrato vige por prazo indeterminado, sem fidelidade mínima ou carência obrigatória.
4.2. A LOJA PARCEIRA poderá solicitar o cancelamento a qualquer momento, mediante aviso formal prévio de 30 (trinta) dias, sem qualquer penalidade ou multa rescisória, quitando apenas os leads recebidos e a mensalidade vigente do período.`;

  return `CONTRATO DE LICENCIAMENTO DE PLATAFORMA SAAS E DISTRIBUIÇÃO DE LEADS B2B

CONTRATADA: PLANEJAFÁCIL TECNOLOGIA LTDA, plataforma de intermediação comercial, CRM e gestão de produção para marcenarias e lojas de móveis planejados.
CONTRATANTE / LOJA PARCEIRA: ${params.storeName.toUpperCase()}
CNPJ: ${params.cnpj || 'Sob cadastro'} | Responsável: ${params.responsibleName || 'Representante Legal'}
Cidade/UF: ${params.city || 'São Paulo'} - ${params.state || 'SP'} | E-mail: ${params.email || 'Não informado'} | Tel: ${params.phone || 'Não informado'}

1. OBJETO
1.1. O presente instrumento tem por objeto o licenciamento de uso não exclusivo do software PlanejaFácil, compreendendo o ecossistema de captação de clientes finais, simulador de orçamentos em 3D/parâmetros, distribuição inteligente de leads qualificados por geolocalização e sistema ERP de acompanhamento de pedidos e montagens.

2. PLANO E VALORES CONTRATADOS
2.1. Plano Escolhido: ${planName}.
2.2. Valor da Mensalidade Fixa: ${formattedMonthly} (cobrada mensalmente para manutenção do acesso, servidores e ferramentas de gestão).
2.3. Custo por Lead Distribuído: ${formattedLeadPrice} por oportunidade entregue exclusivamente à LOJA PARCEIRA na sua respectiva região de cobertura.
2.4. Vencimento: Todo dia ${params.billingDueDay || 10} do mês subsequente via Pix Cobrança ou Boleto Bancário oficial.
2.5. Acessos Simultâneos: O plano contratado dá direito a ${maxPlanUsers} usuário(s) ativo(s). A criação de acessos adicionais (vendedores ou montadores extras) terá acréscimo de ${formattedExtraUser}/mês por usuário extra na fatura mensal.

3. OBRIGAÇÕES DAS PARTES
3.1. DA CONTRATADA: Manter a plataforma disponível 24/7 com uptime mínimo de 99%, fornecer suporte técnico ao lojista e encaminhar leads de clientes finais com dados verificados de contato e projeto.
3.2. DA CONTRATANTE: Realizar o atendimento ágil dos leads recebidos, atualizar o status das negociações no CRM/ERP e efetuar o pagamento das faturas na data aprazada.
3.3. O inadimplemento superior a 5 (cinco) dias após o vencimento autoriza a suspensão temporária do encaminhamento de novos leads até a regularização.

${retentionSection}

5. DISPOSIÇÕES GERAIS E ASSINATURA ELETRÔNICA
5.1. As partes reconhecem a plena validade jurídica da assinatura eletrônica deste instrumento nos termos da Lei Federal nº 14.063/2020 e da Medida Provisória nº 2.200-2/2001, com autenticação por login, carimbo de data/hora (timestamp) e endereço de IP do signatário.
5.2. Fica eleito o Foro da Comarca de domicílio da CONTRATADA para dirimir quaisquer dúvidas oriundas deste contrato.`;
}

export async function signStoreContractRemote(
  tenantId: string,
  signerName: string,
  signerCpf: string,
  contractText: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('sign_store_contract', {
      p_tenant_id: tenantId,
      p_signer_name: signerName.trim(),
      p_signer_cpf: signerCpf.replace(/\D/g, ''),
      p_signature_ip: 'Web Client ' + (window.location.hostname || 'App'),
      p_contract_terms: contractText
    });

    if (error) throw error;
    if (data && !data.success) throw new Error(data.error || 'Falha ao assinar contrato.');

    return { success: true, message: data?.message || 'Contrato assinado com sucesso.' };
  } catch (err: any) {
    console.error('Erro ao assinar contrato:', err);
    return { success: false, error: err.message || 'Erro ao registrar assinatura do contrato.' };
  }
}

