import { supabase } from './supabase';

export interface StoreMetaIntegration {
  id?: string;
  tenantId: string;
  isConnected: boolean;
  metaAppId: string;
  fbPageId?: string;
  fbPageName?: string;
  instagramAccountId?: string;
  instagramUsername?: string;
  whatsappPhoneNumber?: string;
  captureInstagramComments: boolean;
  captureInstagramDirects: boolean;
  captureFacebookComments: boolean;
  captureFacebookMessages: boolean;
  captureWhatsappMessages: boolean;
  lastSyncAt?: string;
  leadsGeneratedCount: number;
}

export const META_CONFIG = {
  APP_ID: '1113302228332124',
  APP_SECRET: 'ecd3187e313dbea943762feb1f133b74',
  REDIRECT_URI: 'https://www.useplanejafacil.com',
  REQUIRED_PERMISSIONS: [
    'pages_show_list',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_messages',
    'whatsapp_business_messaging'
  ]
};

export async function getStoreMetaIntegration(tenantId: string): Promise<StoreMetaIntegration> {
  const defaultIntegration: StoreMetaIntegration = {
    tenantId,
    isConnected: false,
    metaAppId: META_CONFIG.APP_ID,
    captureInstagramComments: true,
    captureInstagramDirects: true,
    captureFacebookComments: true,
    captureFacebookMessages: true,
    captureWhatsappMessages: true,
    leadsGeneratedCount: 0,
  };

  try {
    const { data, error } = await supabase
      .from('store_meta_integrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !data) {
      return defaultIntegration;
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      isConnected: data.is_connected,
      metaAppId: data.meta_app_id || META_CONFIG.APP_ID,
      fbPageId: data.fb_page_id,
      fbPageName: data.fb_page_name,
      instagramAccountId: data.instagram_account_id,
      instagramUsername: data.instagram_username,
      whatsappPhoneNumber: data.whatsapp_phone_number,
      captureInstagramComments: data.capture_instagram_comments ?? true,
      captureInstagramDirects: data.capture_instagram_directs ?? true,
      captureFacebookComments: data.capture_facebook_comments ?? true,
      captureFacebookMessages: data.capture_facebook_messages ?? true,
      captureWhatsappMessages: data.capture_whatsapp_messages ?? true,
      lastSyncAt: data.last_sync_at,
      leadsGeneratedCount: data.leads_generated_count || 0,
    };
  } catch {
    return defaultIntegration;
  }
}

export async function saveStoreMetaIntegration(integration: StoreMetaIntegration): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('store_meta_integrations')
      .upsert({
        tenant_id: integration.tenantId,
        is_connected: integration.isConnected,
        meta_app_id: META_CONFIG.APP_ID,
        fb_page_id: integration.fbPageId,
        fb_page_name: integration.fbPageName,
        instagram_account_id: integration.instagramAccountId,
        instagram_username: integration.instagramUsername,
        whatsapp_phone_number: integration.whatsappPhoneNumber,
        capture_instagram_comments: integration.captureInstagramComments,
        capture_instagram_directs: integration.captureInstagramDirects,
        capture_facebook_comments: integration.captureFacebookComments,
        capture_facebook_messages: integration.captureFacebookMessages,
        capture_whatsapp_messages: integration.captureWhatsappMessages,
        last_sync_at: integration.isConnected ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar integração.' };
  }
}

export async function simulateMetaLeadCapture(params: {
  tenantId: string;
  channel: 'instagram_comment' | 'instagram_direct' | 'facebook_comment' | 'facebook_message' | 'whatsapp';
  authorName: string;
  authorContact?: string;
  messageContent: string;
  postReference?: string;
}): Promise<{ success: boolean; leadId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('process_meta_webhook_lead', {
      p_tenant_id: params.tenantId,
      p_channel: params.channel,
      p_author_name: params.authorName,
      p_author_contact: params.authorContact || '',
      p_message_content: params.messageContent,
      p_post_reference: params.postReference || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: data?.success || false, leadId: data?.lead_id, error: data?.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao processar simulação.' };
  }
}

