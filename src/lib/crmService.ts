import { supabase } from './supabase';
import { Lead, LeadStatus, StoreOrder } from '../types';

export const STORE_ID_TO_TENANT_UUID: Record<string, string> = {
  'store-mogi': 'b1010000-0000-0000-0000-000000000001',
  'store-suzano': 'b1020000-0000-0000-0000-000000000002',
  'store-guarulhos': 'b1030000-0000-0000-0000-000000000003',
  'store-sjc': 'b1040000-0000-0000-0000-000000000004',
  'store-arujah': 'b1050000-0000-0000-0000-000000000005',
  'store-sorocaba': 'b1060000-0000-0000-0000-000000000006',
};

export const TENANT_UUID_TO_STORE_ID: Record<string, string> = Object.entries(
  STORE_ID_TO_TENANT_UUID
).reduce((acc, [storeId, uuid]) => {
  acc[uuid] = storeId;
  return acc;
}, {} as Record<string, string>);

/**
 * Autentica o operador/dono da loja parceira com Supabase Auth.
 */
export async function authenticateMerchant(email: string, password: string = 'PlanejaFacil2026!') {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('[crmService] Erro ao autenticar lojista:', error);
    return { success: false, error: error.message };
  }

  return { success: true, session: data.session, user: data.user };
}

/**
 * Busca os leads do CRM atribuídos à loja parceira via stored procedure isolada.
 */
export async function fetchStoreLeads(storeIdOrTenantUuid: string): Promise<{
  success: boolean;
  leads: Lead[];
  tenantId?: string;
  error?: string;
}> {
  const tenantUuid =
    STORE_ID_TO_TENANT_UUID[storeIdOrTenantUuid] || storeIdOrTenantUuid;

  try {
    const { data, error } = await supabase.rpc('get_store_leads', {
      p_tenant_id: tenantUuid,
    });

    if (error) {
      console.warn('[crmService] Falha ao carregar leads via get_store_leads:', error.message);
      return { success: false, leads: [], error: error.message };
    }

    if (!data || !data.success) {
      return {
        success: false,
        leads: [],
        error: data?.error || 'Erro ao carregar leads da loja.',
      };
    }

    const mappedLeads: Lead[] = (data.leads || []).map((raw: any) => ({
      id: raw.id,
      assignmentId: raw.assignmentId,
      name: raw.name,
      phone: raw.phone,
      whatsapp: raw.whatsapp || raw.phone,
      email: raw.email || 'contato@cliente.com',
      city: raw.city,
      state: raw.state,
      cep: raw.cep,
      environment: raw.environment,
      estimatedMin: Number(raw.estimatedMin) || 0,
      estimatedMax: Number(raw.estimatedMax) || 0,
      status: raw.status as LeadStatus,
      source: raw.source,
      isExternal: Boolean(raw.isExternal),
      assignedStoreId: TENANT_UUID_TO_STORE_ID[raw.assignedStoreId] || raw.assignedStoreId,
      assignedStoreName: raw.assignedStoreName,
      createdAt: raw.createdAt,
      attachmentName: raw.attachmentName || undefined,
      attachmentUrl: raw.attachmentUrl || undefined,
      lossReason: raw.lossReason || undefined,
      orderId: raw.orderId || undefined,
      orderNumber: raw.orderNumber || undefined,
      environmentsData: raw.environmentsData || [],
      notesList: raw.notesList || [],
    }));

    return {
      success: true,
      leads: mappedLeads,
      tenantId: data.tenant_id,
    };
  } catch (err: any) {
    console.error('[crmService] Exceção em fetchStoreLeads:', err);
    return { success: false, leads: [], error: err?.message };
  }
}

/**
 * Atualiza o estágio do lead no CRM com validações de negócio,
 * registro atômico no histórico e proteção contra concorrência.
 */
export async function updateLeadStageOnServer(
  assignmentId: string,
  newStatus: LeadStatus,
  lossReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('update_lead_stage', {
      p_assignment_id: assignmentId,
      p_new_status: newStatus,
      p_loss_reason: lossReason || null,
    });

    if (error) {
      console.error('[crmService] Erro ao atualizar estágio no banco:', error);
      return { success: false, error: error.message };
    }

    if (!data || !data.success) {
      return { success: false, error: data?.error || 'Não foi possível atualizar o estágio.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao salvar estágio.' };
  }
}

/**
 * Adiciona uma anotação comercial / interação com o cliente no histórico do lead.
 */
export async function addLeadNoteOnServer(
  assignmentId: string,
  noteText: string
): Promise<{ success: boolean; note?: any; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('add_lead_note_entry', {
      p_assignment_id: assignmentId,
      p_note_text: noteText.trim(),
    });

    if (error) {
      console.error('[crmService] Erro ao adicionar anotação:', error);
      return { success: false, error: error.message };
    }

    if (!data || !data.success) {
      return { success: false, error: data?.error || 'Não foi possível salvar o comentário.' };
    }

    return {
      success: true,
      note: {
        id: data.note_id,
        author: data.author,
        text: data.text,
        createdAt: data.createdAt,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro de comunicação ao salvar anotação.' };
  }
}

/**
 * Realiza upload real de proposta comercial para o bucket privado `lead-proposals`
 * e vincula o documento à atribuição do lead.
 */
export async function uploadAndAttachProposal(
  assignmentId: string,
  file: File,
  tenantUuid: string
): Promise<{ success: boolean; attachmentName?: string; attachmentUrl?: string; error?: string }> {
  try {
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${tenantUuid}/${assignmentId}_${Date.now()}_${sanitizedFileName}`;

    // Upload seguro para o bucket privado lead-proposals
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lead-proposals')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[crmService] Erro no upload para storage lead-proposals:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Obter URL assinada válida para download autorizado
    const { data: signedData, error: signedError } = await supabase.storage
      .from('lead-proposals')
      .createSignedUrl(storagePath, 60 * 60 * 24); // 24 horas

    const fileUrl = signedData?.signedUrl || uploadData?.path || storagePath;

    // Registrar vínculo no banco de dados através da RPC
    const { data: attachData, error: attachError } = await supabase.rpc('attach_lead_proposal', {
      p_assignment_id: assignmentId,
      p_file_name: file.name,
      p_file_url: fileUrl,
      p_file_size_bytes: file.size,
    });

    if (attachError || !attachData?.success) {
      return {
        success: false,
        error: attachError?.message || attachData?.error || 'Falha ao vincular proposta ao lead.',
      };
    }

    return {
      success: true,
      attachmentName: file.name,
      attachmentUrl: fileUrl,
    };
  } catch (err: any) {
    console.error('[crmService] Exceção no upload de proposta:', err);
    return { success: false, error: err?.message || 'Erro inesperado no envio do arquivo.' };
  }
}

/**
 * Cadastra um lead externo manualmente no CRM (Exclusivo Plano Pro).
 * Valida o plano no servidor e impede cobranças de Pay-Per-Lead da plataforma.
 */
export async function createExternalLeadManual(payload: {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  environment: string;
  source: 'instagram' | 'google' | 'indicacao' | 'balcao';
  estimatedMin: number;
  estimatedMax: number;
}): Promise<{ success: boolean; leadId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('create_external_lead', {
      p_name: payload.name.trim(),
      p_phone: payload.phone.trim(),
      p_environment: payload.environment.trim(),
      p_source: payload.source,
      p_city: payload.city?.trim() || null,
      p_state_uf: payload.state?.trim() || 'SP',
      p_estimated_min: payload.estimatedMin,
      p_estimated_max: payload.estimatedMax,
      p_email: payload.email?.trim() || null,
    });

    if (error) {
      console.error('[crmService] Erro ao cadastrar lead externo:', error);
      return { success: false, error: error.message };
    }

    if (!data || !data.success) {
      return { success: false, error: data?.error || 'Falha ao cadastrar lead externo.' };
    }

    return {
      success: true,
      leadId: data.lead_id,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao criar lead externo.' };
  }
}

/**
 * Converte um lead fechado no CRM diretamente em um Pedido de Produção (#PED-XXXX)
 * no ERP pós-venda, de forma transacional e idempotente.
 */
export async function convertLeadToOrderOnServer(
  assignmentId: string,
  totalValue?: number
): Promise<{ success: boolean; orderId?: string; orderNumber?: string; totalValue?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('convert_lead_to_order', {
      p_assignment_id: assignmentId,
      p_total_value: totalValue || null,
    });

    if (error) {
      console.error('[crmService] Erro ao converter lead em pedido no ERP:', error);
      return { success: false, error: error.message };
    }

    if (!data || !data.success) {
      return { success: false, error: data?.error || 'Não foi possível converter o lead em pedido.' };
    }

    return {
      success: true,
      orderId: data.order_id,
      orderNumber: data.order_number,
      totalValue: Number(data.total_value),
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao comunicar com o servidor.' };
  }
}

/**
 * Recupera o ID de atribuição comercial para um determinado lead no PostgreSQL.
 */
export async function getAssignmentIdForLead(leadId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('lead_assignments')
      .select('id')
      .eq('lead_id', leadId)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data.id;
  } catch {
    return null;
  }
}
