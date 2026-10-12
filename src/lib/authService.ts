import { supabase } from './supabase';
import { STORE_ID_TO_TENANT_UUID, TENANT_UUID_TO_STORE_ID } from './crmService';

export interface AuthenticatedUserContext {
  userId: string;
  email: string;
  tenantId: string | null;
  storeId: string;
  role: 'platform_admin' | 'store_owner' | 'store_operator' | 'consumer';
  fullName: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface ProvisionStoreUserParams {
  name: string;
  cnpj?: string;
  responsibleName?: string;
  cityIbgeCode?: string;
  cityName?: string;
  stateUf?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  planTier?: 'basic' | 'pro';
  contractedPrice?: number;
  billingDueDay?: number;
  isRoutingEnabled?: boolean;
  coveredCities?: string[];
  ownerEmail?: string;
  ownerName?: string;
  tempPassword?: string;
  mustChangePassword?: boolean;
}

export interface StoreUserSummary {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

/**
 * Obtém o contexto oficial do usuário autenticado no Supabase Auth + public.users
 */
export async function getCurrentUserContext(): Promise<AuthenticatedUserContext | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }

  // Obter perfil oficial na tabela public.users
  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role, full_name, is_active, must_change_password')
    .eq('id', user.id)
    .single();

  const tenantId = profile?.tenant_id || user.app_metadata?.store_id || null;
  const storeId = tenantId ? (TENANT_UUID_TO_STORE_ID[tenantId] || tenantId) : 'store-suzano';

  return {
    userId: user.id,
    email: user.email || '',
    tenantId,
    storeId,
    role: (profile?.role || user.app_metadata?.role || 'store_operator') as any,
    fullName: profile?.full_name || user.user_metadata?.name || user.user_metadata?.full_name || 'Usuário',
    isActive: profile?.is_active ?? true,
    mustChangePassword: profile?.must_change_password ?? (user.app_metadata?.must_change_password || false),
  };
}

/**
 * Autentica usuário com e-mail e senha no Supabase Auth
 */
export async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw error;
  }

  const context = await getCurrentUserContext();
  if (context && !context.isActive) {
    await supabase.auth.signOut();
    throw new Error('Sua conta está desativada. Entre em contato com o administrador do sistema.');
  }

  return { user: data.user, session: data.session, context };
}

/**
 * Encerra a sessão ativa do usuário
 */
export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Envia e-mail de recuperação de senha oficial
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const redirectTo = typeof window !== 'undefined' 
    ? `${window.location.origin}` 
    : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });

  if (error) {
    throw error;
  }
}

/**
 * Atualiza a senha pessoal do usuário e remove o flag de primeiro acesso
 */
export async function completePasswordChange(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }

  // Notificar backend para remover must_change_password
  await supabase.rpc('user_complete_password_change');
}

/**
 * Provisiona uma nova loja parceira e a conta inicial do lojista (Admin)
 */
export async function provisionStoreAndUser(params: ProvisionStoreUserParams) {
  const { data, error } = await supabase.rpc('admin_provision_store_and_user', {
    p_name: params.name,
    p_cnpj: params.cnpj || null,
    p_responsible_name: params.responsibleName || null,
    p_city_ibge_code: params.cityIbgeCode || '3552502',
    p_city_name: params.cityName || 'Suzano',
    p_state_uf: params.stateUf || 'SP',
    p_phone: params.phone || null,
    p_whatsapp: params.whatsapp || null,
    p_email: params.email || null,
    p_plan_tier: params.planTier || 'pro',
    p_contracted_price: params.contractedPrice || null,
    p_billing_due_day: params.billingDueDay || 10,
    p_is_routing_enabled: params.isRoutingEnabled ?? true,
    p_covered_cities: params.coveredCities || [],
    p_owner_email: params.ownerEmail || null,
    p_owner_name: params.ownerName || null,
    p_temp_password: params.tempPassword || 'PlanejaFacil2026!',
    p_must_change_password: params.mustChangePassword ?? true,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Lista usuários cadastrados de uma loja
 */
export async function listStoreUsers(tenantId: string): Promise<StoreUserSummary[]> {
  const { data, error } = await supabase.rpc('admin_list_store_users', {
    p_tenant_id: tenantId,
  });

  if (error) {
    throw error;
  }

  return (data || []).map((u: any) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
    isActive: u.is_active,
    mustChangePassword: u.must_change_password,
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at,
  }));
}

/**
 * Cria um usuário adicional para uma loja (Operador / Vendedor)
 */
export async function createStoreUser(params: {
  tenantId: string;
  email: string;
  fullName: string;
  role?: 'store_owner' | 'store_operator';
  tempPassword?: string;
  mustChangePassword?: boolean;
}) {
  const { data, error } = await supabase.rpc('admin_create_store_user', {
    p_tenant_id: params.tenantId,
    p_email: params.email,
    p_full_name: params.fullName,
    p_role: params.role || 'store_operator',
    p_temp_password: params.tempPassword || 'PlanejaFacil2026!',
    p_must_change_password: params.mustChangePassword ?? true,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Ativa ou desativa o acesso de um usuário
 */
export async function toggleUserStatus(userId: string, isActive: boolean) {
  const { data, error } = await supabase.rpc('admin_toggle_user_status', {
    p_user_id: userId,
    p_is_active: isActive,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Redefine senha temporária de um usuário
 */
export async function resetUserPassword(userId: string, tempPassword: string) {
  const { data, error } = await supabase.rpc('admin_reset_user_password', {
    p_user_id: userId,
    p_new_temp_password: tempPassword,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Alternador de sessão para ambiente de desenvolvimento/homologação.
 */
export async function switchDevelopmentStoreSession(storeId: string): Promise<boolean> {
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
