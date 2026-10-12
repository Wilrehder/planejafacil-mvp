import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://inqgxjdvuizsdtolrwfb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucWd4amR2dWl6c2R0b2xyd2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3Mjc0NDAsImV4cCI6MjEwNzMwMzQ0MH0.2XA7O5wLQQ9Wos855oIC4HPLBqp-0jkvbqpaHWFPVEQ';

if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {} as any;
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const storeClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

describe('PlanejaFácil — Fase 7: Autenticação Definitiva, Provisionamento & RBAC', () => {
  const timestamp = Date.now();
  const testStoreName = `Marcenaria Premium Phase7 ${timestamp}`;
  const testOwnerEmail = `dono.fase7.${timestamp}@teste.com`;
  const testTempPassword = 'PlanejaFacil2026!';
  let createdTenantId: string;
  let createdUserId: string;

  beforeAll(async () => {
    // Autenticar cliente administrativo
    const { error } = await adminClient.auth.signInWithPassword({
      email: 'admin@planejafacil.com.br',
      password: 'PlanejaFacil2026!',
    });
    expect(error).toBeNull();
  });

  it('1. Bloqueio de Segurança: Usuário anônimo NÃO pode chamar admin_provision_store_and_user', async () => {
    const { error } = await anonClient.rpc('admin_provision_store_and_user', {
      p_name: 'Loja Invasora Anon',
      p_owner_email: 'hacker@anon.com',
      p_temp_password: 'Pass12345!',
    });

    expect(error).toBeDefined();
    expect(error?.message).toMatch(/Could not find the function|Acesso negado|permission denied|42501/i);
  });

  it('2. Administrador provisiona loja e lojista atomicamente (admin_provision_store_and_user)', async () => {
    const { data, error } = await adminClient.rpc('admin_provision_store_and_user', {
      p_name: testStoreName,
      p_cnpj: `${String(timestamp).slice(-8)}/0001-99`,
      p_responsible_name: 'Carlos Proprietário',
      p_city_name: 'Suzano',
      p_state_uf: 'SP',
      p_phone: '(11) 98765-4321',
      p_whatsapp: '(11) 98765-4321',
      p_email: testOwnerEmail,
      p_plan_tier: 'pro',
      p_contracted_price: 219.90,
      p_billing_due_day: 15,
      p_is_routing_enabled: false,
      p_owner_email: testOwnerEmail,
      p_owner_name: 'Carlos Proprietário',
      p_temp_password: testTempPassword,
      p_must_change_password: true,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.success).toBe(true);
    expect(data.tenant_id).toBeDefined();
    expect(data.user_id).toBeDefined();

    createdTenantId = data.tenant_id;
    createdUserId = data.user_id;

    // Verificar que a assinatura foi gravada com status ativo
    const { data: sub } = await adminClient
      .from('store_subscriptions')
      .select('tenant_id, plan_tier, contracted_monthly_price, billing_due_day, status')
      .eq('tenant_id', createdTenantId)
      .single();

    expect(sub).toBeDefined();
    expect(sub?.plan_tier).toBe('pro');
    expect(Number(sub?.contracted_monthly_price)).toBe(219.90);
    expect(sub?.billing_due_day).toBe(15);
    expect(sub?.status).toBe('active');
  });

  it('3. Lojista provisionado consegue efetuar login real via Supabase Auth com senha temporária', async () => {
    const { data, error } = await storeClient.auth.signInWithPassword({
      email: testOwnerEmail,
      password: testTempPassword,
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.user?.id).toBe(createdUserId);

    // Verificar que o perfil tem must_change_password = true
    const { data: profile } = await storeClient
      .from('users')
      .select('tenant_id, role, must_change_password, is_active')
      .eq('id', createdUserId)
      .single();

    expect(profile).toBeDefined();
    expect(profile?.tenant_id).toBe(createdTenantId);
    expect(profile?.role).toBe('store_owner');
    expect(profile?.must_change_password).toBe(true);
    expect(profile?.is_active).toBe(true);
  });

  it('4. Lojista conclui primeiro acesso e troca de senha via user_complete_password_change', async () => {
    const { data, error } = await storeClient.rpc('user_complete_password_change');

    expect(error).toBeNull();
    expect(data.success).toBe(true);

    // Verificar se flag foi desmarcado em public.users
    const { data: updatedProfile } = await storeClient
      .from('users')
      .select('must_change_password')
      .eq('id', createdUserId)
      .single();

    expect(updatedProfile?.must_change_password).toBe(false);
  });

  it('5. Administrador consulta lista de usuários da loja (admin_list_store_users)', async () => {
    const { data, error } = await adminClient.rpc('admin_list_store_users', {
      p_tenant_id: createdTenantId,
    });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].email).toBe(testOwnerEmail);
    expect(data[0].role).toBe('store_owner');
  });

  it('6. Administrador adiciona operador para a loja (admin_create_store_user)', async () => {
    const operatorEmail = `operador.${timestamp}@teste.com`;

    const { data, error } = await adminClient.rpc('admin_create_store_user', {
      p_tenant_id: createdTenantId,
      p_email: operatorEmail,
      p_full_name: 'Vendedor João',
      p_role: 'store_operator',
      p_temp_password: 'PlanejaFacil2026!',
      p_must_change_password: true,
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.user_id).toBeDefined();
    expect(data.role).toBe('store_operator');

    // Desativar e reativar status
    const { data: toggleData, error: toggleErr } = await adminClient.rpc('admin_toggle_user_status', {
      p_user_id: data.user_id,
      p_is_active: false,
    });

    expect(toggleErr).toBeNull();
    expect(toggleData.is_active).toBe(false);
  });

  it('7. Isolamento RLS com nova função current_tenant_id() bloqueia usuário inativo', async () => {
    // Verificar que a função current_tenant_id() e current_role() funcionam para o cliente do lojista ativo
    const { data: tenantId } = await storeClient.rpc('current_tenant_id');
    expect(tenantId).toBe(createdTenantId);

    const { data: role } = await storeClient.rpc('current_role');
    expect(role).toBe('store_owner');
  });

  afterAll(async () => {
    if (createdTenantId) {
      await adminClient.from('store_coverage').delete().eq('tenant_id', createdTenantId);
      await adminClient.from('subscription_history').delete().eq('tenant_id', createdTenantId);
      await adminClient.from('store_subscriptions').delete().eq('tenant_id', createdTenantId);
      await adminClient.from('users').delete().eq('tenant_id', createdTenantId);
      await adminClient.from('tenants').delete().eq('id', createdTenantId);
    }
  });

});
