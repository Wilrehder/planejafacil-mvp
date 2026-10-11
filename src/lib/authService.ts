import { supabase } from './supabase';
import { STORE_ID_TO_TENANT_UUID, TENANT_UUID_TO_STORE_ID } from './crmService';

export interface AuthenticatedUserContext {
  userId: string;
  email: string;
  tenantId: string | null;
  storeId: string;
  role: string;
  fullName: string;
}

/**
 * Obtém o contexto do usuário autenticado atual via Supabase Auth
 */
export async function getCurrentUserContext(): Promise<AuthenticatedUserContext | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }

  // Obter perfil na tabela users
  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role, full_name')
    .eq('id', user.id)
    .single();

  const tenantId = profile?.tenant_id || user.app_metadata?.store_id || null;
  const storeId = tenantId ? (TENANT_UUID_TO_STORE_ID[tenantId] || tenantId) : 'store-suzano';

  return {
    userId: user.id,
    email: user.email || '',
    tenantId,
    storeId,
    role: profile?.role || user.app_metadata?.role || 'store_operator',
    fullName: profile?.full_name || user.user_metadata?.full_name || 'Lojista Parceiro',
  };
}

/**
 * Alternador de sessão para ambiente de desenvolvimento/homologação.
 * Em produção, a autenticação ocorre exclusivamente via tela de login oficial.
 */
export async function switchDevelopmentStoreSession(storeId: string): Promise<boolean> {
  // Apenas disponível em ambiente de desenvolvimento / homologação
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production' && !import.meta.env.DEV) {
    console.warn('[authService] Alternância de loja por seletor desabilitada em produção.');
    return false;
  }

  const tenantUuid = STORE_ID_TO_TENANT_UUID[storeId] || storeId;
  const emailByStore: Record<string, string> = {
    'store-suzano': 'dono.suzano@loja.com',
    'store-mogi': 'dono.mogi@loja.com',
    'b1020000-0000-0000-0000-000000000002': 'dono.suzano@loja.com',
    'b1010000-0000-0000-0000-000000000001': 'dono.mogi@loja.com',
  };

  const targetEmail = emailByStore[storeId] || emailByStore[tenantUuid];
  if (!targetEmail) return false;

  const testPassword = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TEST_USER_PASSWORD) || 'PlanejaFacil2026!';

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: testPassword,
    });
    return !error;
  } catch {
    return false;
  }
}
