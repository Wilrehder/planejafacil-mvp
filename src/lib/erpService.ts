import { supabase } from './supabase';
import { STORE_ID_TO_TENANT_UUID, TENANT_UUID_TO_STORE_ID } from './crmService';
import { StoreOrder, OrderStage, OrderDocumentItem, ERPMetrics } from '../types';

export interface AdvanceStageResult {
  success: boolean;
  orderId?: string;
  previousStage?: OrderStage;
  currentStage?: OrderStage;
  error?: string;
}

export interface AttachDocumentResult {
  success: boolean;
  documentId?: string;
  fileName?: string;
  filePath?: string;
  signedUrl?: string;
  error?: string;
}

/**
 * Mapeia os documentos anexados do banco para os campos clássicos do StoreOrder
 */
function mapDocumentsToOrderSlots(order: any, rawDocs: any[] = []): Partial<StoreOrder> {
  const result: Partial<StoreOrder> = {};

  const contractDoc = rawDocs.find((d) => d.stage === 'contrato' || d.docType === 'contrato');
  if (contractDoc) result.contractFile = contractDoc.fileName;

  const medicaoDoc = rawDocs.find((d) => d.stage === 'medicao');
  if (medicaoDoc) {
    result.medicaoFile = medicaoDoc.fileName;
    result.medicaoDone = true;
  }

  const projectDoc = rawDocs.find((d) => d.stage === 'projeto');
  if (projectDoc) {
    result.projectFile = projectDoc.fileName;
  }

  const producaoDoc = rawDocs.find((d) => d.stage === 'producao');
  if (producaoDoc) {
    result.producaoFile = producaoDoc.fileName;
    result.producaoDone = true;
  }

  const montagemDoc = rawDocs.find((d) => d.stage === 'montagem');
  if (montagemDoc) {
    result.montagemFoto = montagemDoc.fileName;
    result.montagemDone = true;
  }

  const aceiteDoc = rawDocs.find((d) => d.stage === 'aceite');
  if (aceiteDoc) {
    result.aceiteFile = aceiteDoc.fileName;
    result.clientConfirmedAceite = true;
  }

  return result;
}

/**
 * Consulta todas as ordens de produção/serviço no ERP da loja
 */
export async function fetchStoreOrders(storeIdOrTenantUuid: string): Promise<{
  success: boolean;
  orders: StoreOrder[];
  tenantId?: string;
  error?: string;
}> {
  const tenantUuid =
    STORE_ID_TO_TENANT_UUID[storeIdOrTenantUuid] || storeIdOrTenantUuid;

  try {
    const { data, error } = await supabase.rpc('get_store_orders', {
      p_tenant_id: tenantUuid,
    });

    if (error) {
      console.warn('[erpService] Falha ao consultar pedidos via get_store_orders:', error.message);
      return { success: false, orders: [], error: error.message };
    }

    if (!data || !data.success) {
      return {
        success: false,
        orders: [],
        error: data?.error || 'Erro ao carregar pedidos da loja.',
      };
    }

    const rawList = data.orders || [];
    const mappedOrders: StoreOrder[] = rawList.map((raw: any) => {
      const docs: OrderDocumentItem[] = raw.documents || [];
      const slots = mapDocumentsToOrderSlots(raw, docs);

      return {
        id: raw.orderNumber || raw.id,
        uuid: raw.uuid,
        orderNumber: raw.orderNumber,
        tenantId: raw.tenantId,
        assignmentId: raw.assignmentId,
        leadId: raw.leadId || '',
        clientName: raw.clientName,
        phone: raw.phone,
        address: raw.address,
        city: raw.city,
        state: raw.state,
        environment: raw.environment,
        totalValue: Number(raw.totalValue || 0),
        contractedValue: Number(raw.contractedValue || raw.totalValue || 0),
        estimatedBudget: Number(raw.estimatedBudget || raw.totalValue || 0),
        targetDeliveryDate: raw.targetDeliveryDate,
        completedAt: raw.completedAt,
        currentStage: raw.currentStage as OrderStage,
        stageNotes: raw.stageNotes,
        hasPendingIssues: Boolean(raw.hasPendingIssues),
        pendingNotes: raw.pendingNotes,
        medicaoDone: Boolean(raw.medicaoDone || slots.medicaoDone),
        projectApproved: Boolean(raw.projectApproved),
        producaoDone: Boolean(raw.producaoDone || slots.producaoDone),
        montagemDone: Boolean(raw.montagemDone || slots.montagemDone),
        clientConfirmedAceite: Boolean(raw.clientConfirmedAceite || slots.clientConfirmedAceite),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        storeId: TENANT_UUID_TO_STORE_ID[raw.tenantId] || raw.tenantId,
        contractFile: slots.contractFile,
        medicaoFile: slots.medicaoFile,
        projectFile: slots.projectFile,
        producaoFile: slots.producaoFile,
        montagemFoto: slots.montagemFoto,
        aceiteFile: slots.aceiteFile,
        documents: docs,
        timeline: (raw.timeline || []).map((t: any) => ({
          id: t.id,
          user: t.user,
          userRole: t.userRole,
          action: t.action,
          timestamp: t.timestamp,
        })),
      };
    });

    return {
      success: true,
      orders: mappedOrders,
      tenantId: data.tenant_id,
    };
  } catch (err: any) {
    console.error('[erpService] Exceção ao buscar pedidos do ERP:', err);
    return { success: false, orders: [], error: err.message };
  }
}

/**
 * Avança o pedido para o próximo estágio operacional com validação de gating no banco
 */
export async function advanceOrderStageOnServer(
  orderUuid: string,
  targetStage: OrderStage,
  actionMessage?: string,
  stageNotes?: string,
  stageConfirmation: boolean = false
): Promise<AdvanceStageResult> {
  try {
    const { data, error } = await supabase.rpc('advance_order_stage', {
      p_order_id: orderUuid,
      p_target_stage: targetStage,
      p_action_message: actionMessage || null,
      p_stage_notes: stageNotes || null,
      p_stage_confirmation: stageConfirmation,
    });

    if (error) {
      console.error('[erpService] Erro ao avançar etapa no PostgreSQL:', error);
      return { success: false, error: error.message };
    }

    if (!data.success) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      orderId: data.order_id,
      previousStage: data.previous_stage,
      currentStage: data.current_stage,
    };
  } catch (err: any) {
    console.error('[erpService] Exceção ao avançar etapa:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Faz upload real de documento para o bucket privado `order-documents` e persiste metadados
 */
export async function uploadAndAttachOrderDocument(
  orderUuid: string,
  tenantId: string,
  stage: string,
  file: File,
  docType: string = 'documento'
): Promise<AttachDocumentResult> {
  try {
    // 1. Sanitizar nome e compor caminho isolado por tenant
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${tenantId}/${orderUuid}/${stage}_${Date.now()}_${sanitizedName}`;

    // 2. Upload para o bucket privado
    const { error: uploadError } = await supabase.storage
      .from('order-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('[erpService] Falha no upload para o Supabase Storage:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // 3. Registrar metadados via stored procedure transacional
    const { data, error: rpcError } = await supabase.rpc('attach_order_document', {
      p_order_id: orderUuid,
      p_stage: stage,
      p_doc_type: docType,
      p_file_name: file.name,
      p_file_path: storagePath,
      p_file_size_bytes: file.size,
      p_mime_type: file.type || 'application/octet-stream',
    });

    if (rpcError || !data?.success) {
      console.error('[erpService] Falha ao registrar documento via RPC:', rpcError || data?.error);
      return { success: false, error: rpcError?.message || data?.error };
    }

    // 4. Obter Signed URL com expiração de 15 minutos
    const { data: signedData } = await supabase.storage
      .from('order-documents')
      .createSignedUrl(storagePath, 900);

    return {
      success: true,
      documentId: data.document_id,
      fileName: file.name,
      filePath: storagePath,
      signedUrl: signedData?.signedUrl,
    };
  } catch (err: any) {
    console.error('[erpService] Exceção no upload e anexo do documento:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Gera URL assinada temporária para download seguro do documento do pedido
 */
export async function getOrderDocumentSignedUrl(filePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('order-documents')
      .createSignedUrl(filePath, 900);

    if (error || !data) {
      console.error('[erpService] Erro ao gerar Signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('[erpService] Exceção ao gerar Signed URL:', err);
    return null;
  }
}

/**
 * Atualiza o valor contratado real do pedido no ERP
 */
export async function updateOrderContractedValueOnServer(
  orderUuid: string,
  newContractedValue: number
): Promise<{ success: boolean; error?: string; oldValue?: number; newValue?: number }> {
  try {
    const { data, error } = await supabase.rpc('update_order_contracted_value', {
      p_order_id: orderUuid,
      p_contracted_value: newContractedValue,
    });

    if (error || !data?.success) {
      return { success: false, error: error?.message || data?.error };
    }

    return {
      success: true,
      oldValue: data.old_value,
      newValue: data.new_value,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Atualiza pendências operacionais do pedido
 */
export async function updateOrderPendencyOnServer(
  orderUuid: string,
  hasPending: boolean,
  pendingNotes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('update_order_pendency', {
      p_order_id: orderUuid,
      p_has_pending: hasPending,
      p_pending_notes: pendingNotes,
    });

    if (error || !data?.success) {
      return { success: false, error: error?.message || data?.error };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Busca os indicadores e KPIs do ERP da loja
 */
export async function fetchERPMetrics(storeIdOrTenantUuid: string): Promise<{
  success: boolean;
  metrics?: ERPMetrics;
  error?: string;
}> {
  const tenantUuid =
    STORE_ID_TO_TENANT_UUID[storeIdOrTenantUuid] || storeIdOrTenantUuid;

  try {
    const { data, error } = await supabase.rpc('get_erp_metrics', {
      p_tenant_id: tenantUuid,
    });

    if (error || !data?.success) {
      return { success: false, error: error?.message || data?.error };
    }

    return {
      success: true,
      metrics: {
        activeOrders: Number(data.active_orders || 0),
        completedOrders: Number(data.completed_orders || 0),
        delayedOrders: Number(data.delayed_orders || 0),
        totalContractedValue: Number(data.total_contracted_value || 0),
        byStage: data.by_stage || {},
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
