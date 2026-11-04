-- =============================================================================
-- MIGRATION: 20261104000021_b2b_contracts_extra_users_and_role_views.sql
-- DESCRIÇÃO: 
-- 1. Suporte completo a Contratos B2B Dinâmicos com Permanência e Assinatura Digital
-- 2. Suporte a cobrança e precificação de Usuários Adicionais (Acessos Extras)
-- 3. Procedure para Assinatura Digital do Contrato no 1º Acesso
-- =============================================================================

-- 1. Campos de Contrato e Permanência na tabela tenants
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS has_retention_clause BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS retention_months INT DEFAULT 6,
ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS contract_signed_by_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS contract_signed_by_cpf VARCHAR(14) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS contract_signature_ip TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS contract_terms_text TEXT DEFAULT NULL;

-- 2. Campo de Preço por Usuário Adicional em saas_pricing_schedules
ALTER TABLE public.saas_pricing_schedules
ADD COLUMN IF NOT EXISTS extra_user_price NUMERIC(10,2) DEFAULT 39.90;

-- Atualizar registros existentes para ter valor default
UPDATE public.saas_pricing_schedules
SET extra_user_price = 39.90
WHERE extra_user_price IS NULL;

-- 3. Atualizar get_saas_plans_config para incluir extra_user_price
CREATE OR REPLACE FUNCTION public.get_saas_plans_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plans jsonb;
  v_extra_user_price NUMERIC(10,2) := 39.90;
BEGIN
  SELECT extra_user_price INTO v_extra_user_price
  FROM public.saas_pricing_schedules
  WHERE is_active = true
  ORDER BY effective_from DESC
  LIMIT 1;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'planTier', plan_tier,
      'monthlyPrice', monthly_subscription_price,
      'leadPrice', lead_unit_price,
      'maxUsers', max_users,
      'extraUserPrice', COALESCE(extra_user_price, v_extra_user_price, 39.90),
      'modules', modules,
      'version', version,
      'effectiveFrom', effective_from
    )
    ORDER BY CASE WHEN plan_tier = 'basic' THEN 1 ELSE 2 END
  )
  INTO v_plans
  FROM (
    SELECT DISTINCT ON (plan_tier)
      id,
      plan_tier,
      monthly_subscription_price,
      lead_unit_price,
      max_users,
      extra_user_price,
      modules,
      version,
      effective_from
    FROM public.saas_pricing_schedules
    WHERE is_active = true
    ORDER BY plan_tier, effective_from DESC
  ) sub;

  RETURN jsonb_build_object(
    'success', true,
    'plans', COALESCE(v_plans, '[]'::jsonb),
    'extraUserPrice', COALESCE(v_extra_user_price, 39.90)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_saas_plans_config() TO authenticated, service_role;

-- 4. Atualizar admin_update_saas_plans para suportar p_extra_user_price
CREATE OR REPLACE FUNCTION public.admin_update_saas_plans(
  p_basic_price NUMERIC,
  p_pro_price NUMERIC,
  p_lead_price NUMERIC,
  p_basic_modules JSONB,
  p_pro_modules JSONB,
  p_extra_user_price NUMERIC DEFAULT 39.90
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next_version INT;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Apenas o Super Admin pode alterar a precificação dos planos SaaS.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version FROM public.saas_pricing_schedules;

  UPDATE public.saas_pricing_schedules
  SET is_active = false
  WHERE is_active = true;

  -- Versão do Plano Básico (1 Acesso)
  INSERT INTO public.saas_pricing_schedules (
    plan_tier,
    monthly_subscription_price,
    lead_unit_price,
    max_users,
    extra_user_price,
    modules,
    version,
    effective_from,
    is_active
  ) VALUES (
    'basic',
    p_basic_price,
    p_lead_price,
    1,
    p_extra_user_price,
    p_basic_modules,
    v_next_version,
    now(),
    true
  );

  -- Versão do Plano Pro (3 Acessos)
  INSERT INTO public.saas_pricing_schedules (
    plan_tier,
    monthly_subscription_price,
    lead_unit_price,
    max_users,
    extra_user_price,
    modules,
    version,
    effective_from,
    is_active
  ) VALUES (
    'pro',
    p_pro_price,
    p_lead_price,
    3,
    p_extra_user_price,
    p_pro_modules,
    v_next_version,
    now(),
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'version', v_next_version,
    'message', 'Novas tabelas de planos e taxa de usuário extra gravadas com versionamento ativo.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_saas_plans(NUMERIC, NUMERIC, NUMERIC, JSONB, JSONB, NUMERIC) TO authenticated, service_role;

-- 5. Atualizar get_store_users_and_limit para retornar contagem de extras e preço por usuário
CREATE OR REPLACE FUNCTION public.get_store_users_and_limit(p_tenant_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan_tier TEXT;
  v_max_users INT := 1;
  v_active_count INT := 0;
  v_extra_user_price NUMERIC(10,2) := 39.90;
  v_users jsonb;
BEGIN
  SELECT LOWER(COALESCE(plan_tier, 'basic')) INTO v_plan_tier
  FROM public.tenants
  WHERE id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loja não encontrada.');
  END IF;

  SELECT max_users, extra_user_price 
  INTO v_max_users, v_extra_user_price
  FROM public.saas_pricing_schedules
  WHERE plan_tier = v_plan_tier AND is_active = true
  ORDER BY effective_from DESC
  LIMIT 1;

  IF v_max_users IS NULL THEN
    v_max_users := CASE WHEN v_plan_tier = 'pro' THEN 3 ELSE 1 END;
  END IF;

  SELECT COUNT(*)::INT INTO v_active_count
  FROM public.users
  WHERE tenant_id = p_tenant_id AND is_active = true;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', u.id,
      'fullName', COALESCE(u.full_name, u.email),
      'email', u.email,
      'role', u.role,
      'isActive', u.is_active,
      'mustChangePassword', COALESCE(u.must_change_password, false),
      'createdAt', u.created_at
    )
    ORDER BY 
      CASE 
        WHEN u.role = 'store_owner' THEN 1 
        WHEN u.role = 'store_operator' THEN 2 
        ELSE 3 
      END,
      u.created_at ASC
  ), '[]'::jsonb)
  INTO v_users
  FROM public.users u
  WHERE u.tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'planTier', v_plan_tier,
    'maxUsers', v_max_users,
    'extraUsersCount', GREATEST(v_active_count - v_max_users, 0),
    'extraUserPrice', COALESCE(v_extra_user_price, 39.90),
    'activeUsersCount', v_active_count,
    'users', v_users
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_users_and_limit(UUID) TO authenticated, service_role;

-- 6. Atualizar admin_create_store_user para permitir criação de usuários extras (com registro)
CREATE OR REPLACE FUNCTION public.admin_create_store_user(
  p_tenant_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_temp_password TEXT DEFAULT 'PlanejaFacil2026!',
  p_must_change_password BOOLEAN DEFAULT true,
  p_allow_extra BOOLEAN DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant RECORD;
  v_active_users_count INT;
  v_max_users INT;
  v_new_user_id UUID;
  v_is_extra BOOLEAN := false;
BEGIN
  IF NOT public.is_platform_admin() THEN
    -- Também permite o próprio store_owner da loja
    IF NOT EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND tenant_id = p_tenant_id AND role = 'store_owner'
    ) THEN
      RAISE EXCEPTION 'Acesso negado: apenas o Super Admin ou o Gerente da loja podem criar acessos.' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loja não encontrada.');
  END IF;

  IF p_role NOT IN ('store_owner', 'store_operator', 'store_assembler') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Função inválida. Escolha Gerente, Vendedor ou Montador.');
  END IF;

  SELECT max_users INTO v_max_users
  FROM public.saas_pricing_schedules
  WHERE plan_tier = LOWER(COALESCE(v_tenant.plan_tier, 'basic')) AND is_active = true
  ORDER BY effective_from DESC
  LIMIT 1;

  IF v_max_users IS NULL THEN
    v_max_users := CASE WHEN LOWER(v_tenant.plan_tier) = 'pro' THEN 3 ELSE 1 END;
  END IF;

  SELECT COUNT(*)::INT INTO v_active_users_count
  FROM public.users
  WHERE tenant_id = p_tenant_id AND is_active = true;

  IF v_active_users_count >= v_max_users THEN
    IF NOT p_allow_extra THEN
      RETURN jsonb_build_object(
        'success', false,
        'quota_exceeded', true,
        'error', 'A cota do plano (' || v_max_users || ' acesso(s)) foi atingida. Habilite a cobrança de acesso extra para prosseguir.'
      );
    END IF;
    v_is_extra := true;
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = lower(trim(p_email))) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Já existe um usuário cadastrado com este e-mail.');
  END IF;

  INSERT INTO public.users (
    email,
    full_name,
    role,
    tenant_id,
    is_active,
    must_change_password,
    created_at,
    updated_at
  ) VALUES (
    lower(trim(p_email)),
    trim(p_full_name),
    p_role,
    p_tenant_id,
    true,
    COALESCE(p_must_change_password, true),
    now(),
    now()
  ) RETURNING id INTO v_new_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_new_user_id,
    'is_extra', v_is_extra,
    'email', lower(trim(p_email)),
    'role', p_role,
    'message', CASE 
      WHEN v_is_extra THEN 'Usuário adicional criado com sucesso! Será incluído como acesso extra na fatura mensal.'
      ELSE 'Usuário criado com sucesso dentro da cota do plano!'
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_store_user(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated, service_role;

-- 7. Procedure para Assinatura Digital do Contrato pelo Gerente no 1º Acesso
CREATE OR REPLACE FUNCTION public.sign_store_contract(
  p_tenant_id UUID,
  p_signer_name TEXT,
  p_signer_cpf VARCHAR(14),
  p_signature_ip TEXT DEFAULT NULL,
  p_contract_terms TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant RECORD;
BEGIN
  -- Permite Super Admin ou o próprio store_owner daquela loja
  IF NOT public.is_platform_admin() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND tenant_id = p_tenant_id AND role = 'store_owner'
    ) THEN
      RAISE EXCEPTION 'Acesso negado: apenas o Gerente da loja ou o Super Admin podem assinar o contrato.' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loja não encontrada.');
  END IF;

  UPDATE public.tenants
  SET contract_signed_at = now(),
      contract_signed_by_name = trim(p_signer_name),
      contract_signed_by_cpf = regexp_replace(COALESCE(p_signer_cpf, ''), '[^0-9]', '', 'g'),
      contract_signature_ip = COALESCE(p_signature_ip, 'Registrado via Web'),
      contract_terms_text = COALESCE(p_contract_terms, contract_terms_text),
      updated_at = now()
  WHERE id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'signed_at', now(),
    'signed_by', trim(p_signer_name),
    'message', 'Contrato assinado digitalmente com sucesso.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sign_store_contract(UUID, TEXT, VARCHAR, TEXT, TEXT) TO authenticated, service_role;

-- 8. Atualizar get_all_stores_sync para retornar campos de contrato e permanência
CREATE OR REPLACE FUNCTION public.get_all_stores_sync()
RETURNS JSONB AS $$
DECLARE
    v_stores JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
    INTO v_stores
    FROM (
        SELECT
            t.id::text AS id,
            t.name,
            COALESCE(t.cnpj, '') AS cnpj,
            COALESCE(t.responsible_name, t.name) AS "responsibleName",
            t.city_name AS city,
            t.state_uf AS state,
            CASE WHEN lower(t.plan_tier) = 'pro' THEN 'Pro' ELSE 'Basic' END AS plan,
            t.city_name || ' e Região (' || t.state_uf || ')' AS "regionServed",
            (SELECT COUNT(*)::int FROM public.lead_assignments la WHERE la.tenant_id = t.id) AS "leadsCount",
            CASE
                WHEN t.status = 'ativa' THEN 'Ativa'
                WHEN t.status = 'pendente' THEN 'Pendente'
                ELSE 'Inativa'
            END AS status,
            COALESCE(t.phone, '') AS phone,
            COALESCE(t.whatsapp, t.phone, '') AS whatsapp,
            COALESCE(t.email, '') AS email,
            COALESCE(
                (SELECT ss.contracted_monthly_price FROM public.store_subscriptions ss WHERE ss.tenant_id = t.id ORDER BY ss.created_at DESC LIMIT 1),
                CASE WHEN lower(t.plan_tier) = 'pro' THEN 219.90 ELSE 119.90 END
            ) AS "monthlyRevenue",
            COALESCE(
                (SELECT ss.billing_due_day FROM public.store_subscriptions ss WHERE ss.tenant_id = t.id ORDER BY ss.created_at DESC LIMIT 1),
                10
            ) AS "billingDueDay",
            to_char(t.created_at, 'YYYY-MM-DD') AS "contractDate",
            t.is_routing_enabled AS "routingEnabled",
            -- Campos de Contrato
            COALESCE(t.has_retention_clause, false) AS "hasRetentionClause",
            COALESCE(t.retention_months, 6) AS "retentionMonths",
            to_char(t.contract_signed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "contractSignedAt",
            t.contract_signed_by_name AS "contractSignedByName",
            t.contract_signed_by_cpf AS "contractSignedByCpf",
            t.contract_signature_ip AS "contractSignatureIp",
            t.contract_terms_text AS "contractTermsText"
        FROM public.tenants t
        ORDER BY t.created_at DESC
    ) s;

    RETURN jsonb_build_object('success', true, 'stores', v_stores);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_all_stores_sync() TO anon, authenticated, service_role;
