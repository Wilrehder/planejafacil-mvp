-- =============================================================================
-- PLANEJAFÁCIL SAAS — MIGRAÇÃO: GOVERNANÇA DE PLANOS SAAS, MÓDULOS E LIMITES DE ACESSO
-- Data: 2026-11-03
-- =============================================================================

-- 1. Permitir 'store_assembler' na tabela users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('platform_admin', 'store_owner', 'store_operator', 'store_assembler', 'consumer'));

-- 2. Atualizar colunas em saas_pricing_schedules
ALTER TABLE public.saas_pricing_schedules ADD COLUMN IF NOT EXISTS max_users INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.saas_pricing_schedules ADD COLUMN IF NOT EXISTS modules JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Atualizar registros vigentes da saas_pricing_schedules
UPDATE public.saas_pricing_schedules
SET max_users = 1,
    modules = jsonb_build_object(
        'crm', true,
        'simulator', true,
        'meta', false,
        'erp', false,
        'digital_folder', false,
        'promob', false
    )
WHERE plan_tier = 'basic' AND is_active = true;

UPDATE public.saas_pricing_schedules
SET max_users = 3,
    modules = jsonb_build_object(
        'crm', true,
        'simulator', true,
        'meta', true,
        'erp', true,
        'digital_folder', true,
        'promob', true
    )
WHERE plan_tier = 'pro' AND is_active = true;

-- 3. Procedure para atualizar admin_create_store_user com trava rigorosa de limite de acessos por plano
CREATE OR REPLACE FUNCTION public.admin_create_store_user(
    p_tenant_id uuid,
    p_email text,
    p_full_name text,
    p_role text DEFAULT 'store_operator'::text,
    p_temp_password text DEFAULT 'PlanejaFacil2026!'::text,
    p_must_change_password boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $$
DECLARE
    v_user_id UUID;
    v_hashed_password TEXT;
    v_plan_tier VARCHAR;
    v_active_users_count INT;
    v_max_users INT := 1;
BEGIN
    IF NOT (public.is_platform_admin() OR (public.current_tenant_id() = p_tenant_id AND public.current_role() = 'store_owner')) THEN
        RAISE EXCEPTION 'Acesso negado: sem permissão para criar usuários nesta loja.' USING ERRCODE = '42501';
    END IF;

    IF p_role NOT IN ('store_owner', 'store_operator', 'store_assembler') THEN
        RAISE EXCEPTION 'Papel inválido para usuário de loja: %', p_role;
    END IF;

    SELECT COALESCE(plan_tier, 'basic') INTO v_plan_tier
    FROM public.tenants
    WHERE id = p_tenant_id;

    SELECT COALESCE(max_users, CASE WHEN v_plan_tier = 'pro' THEN 3 ELSE 1 END) INTO v_max_users
    FROM public.saas_pricing_schedules
    WHERE plan_tier = v_plan_tier AND is_active = true
    ORDER BY version DESC LIMIT 1;

    IF v_max_users IS NULL THEN
        v_max_users := CASE WHEN v_plan_tier = 'pro' THEN 3 ELSE 1 END;
    END IF;

    SELECT COUNT(*) INTO v_active_users_count
    FROM public.users
    WHERE tenant_id = p_tenant_id AND is_active = true;

    IF v_active_users_count >= v_max_users THEN
        IF v_plan_tier = 'basic' THEN
            RAISE EXCEPTION 'Limite de acessos atingido para o Plano Básico (máximo % usuário). Faça upgrade para o Plano Pro para liberar até 3 acessos (Gerente, Vendedor e Montador).', v_max_users USING ERRCODE = '22023';
        ELSE
            RAISE EXCEPTION 'Limite de acessos atingido para o Plano Pro (máximo % usuários: Gerente, Vendedor e Montador).', v_max_users USING ERRCODE = '22023';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(trim(p_email))) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Já existe um usuário cadastrado com este e-mail.');
    END IF;

    v_user_id := gen_random_uuid();
    v_hashed_password := extensions.crypt(COALESCE(p_temp_password, 'PlanejaFacil2026!'), extensions.gen_salt('bf'));

    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        phone_change,
        phone_change_token,
        email_change_token_current,
        reauthentication_token
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        lower(trim(p_email)),
        v_hashed_password,
        now(),
        jsonb_build_object(
            'provider', 'email',
            'providers', array['email'],
            'role', p_role,
            'store_id', p_tenant_id,
            'must_change_password', p_must_change_password
        ),
        jsonb_build_object(
            'name', p_full_name
        ),
        now(),
        now(),
        '', '', '', '', '', '', '', ''
    );

    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_user_id,
        lower(trim(p_email)),
        jsonb_build_object('sub', v_user_id, 'email', lower(trim(p_email))),
        'email',
        now(),
        now(),
        now()
    );

    INSERT INTO public.users (
        id,
        tenant_id,
        full_name,
        email,
        role,
        must_change_password,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        p_tenant_id,
        p_full_name,
        lower(trim(p_email)),
        p_role,
        p_must_change_password,
        true,
        now(),
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'role', p_role,
        'email', lower(trim(p_email)),
        'active_count', v_active_users_count + 1,
        'max_users', v_max_users
    );
END;
$$;

-- 4. Função para consultar configuração de planos e permissões
CREATE OR REPLACE FUNCTION public.get_saas_plans_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_plans JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'planTier', plan_tier,
            'monthlyPrice', monthly_price,
            'leadPrice', lead_price,
            'maxUsers', COALESCE(max_users, CASE WHEN plan_tier = 'pro' THEN 3 ELSE 1 END),
            'modules', COALESCE(modules, '{}'::jsonb),
            'version', version,
            'effectiveFrom', effective_from
        ) ORDER BY CASE WHEN plan_tier = 'basic' THEN 1 ELSE 2 END
    ) INTO v_plans
    FROM public.saas_pricing_schedules
    WHERE is_active = true;

    RETURN jsonb_build_object(
        'success', true,
        'plans', COALESCE(v_plans, '[]'::jsonb)
    );
END;
$$;

-- 5. Função para atualizar preços e módulos preservando faturas do passado
CREATE OR REPLACE FUNCTION public.admin_update_saas_plans(
    p_basic_price NUMERIC,
    p_pro_price NUMERIC,
    p_lead_price NUMERIC,
    p_basic_modules JSONB,
    p_pro_modules JSONB
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_next_version INT := 1;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores da plataforma podem alterar planos.' USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version FROM public.saas_pricing_schedules;

    UPDATE public.saas_pricing_schedules
    SET is_active = false,
        effective_until = now()
    WHERE is_active = true;

    INSERT INTO public.saas_pricing_schedules (
        plan_tier,
        monthly_price,
        lead_price,
        max_users,
        modules,
        features,
        version,
        is_active,
        effective_from
    ) VALUES (
        'basic',
        p_basic_price,
        p_lead_price,
        1,
        COALESCE(p_basic_modules, '{}'::jsonb),
        '["CRM de Leads", "Simulador 3D", "1 Usuário"]'::jsonb,
        v_next_version,
        true,
        now()
    );

    INSERT INTO public.saas_pricing_schedules (
        plan_tier,
        monthly_price,
        lead_price,
        max_users,
        modules,
        features,
        version,
        is_active,
        effective_from
    ) VALUES (
        'pro',
        p_pro_price,
        p_lead_price,
        3,
        COALESCE(p_pro_modules, '{}'::jsonb),
        '["Tudo do Básico", "ERP Operacional", "Meta Ads", "Promob", "3 Usuários"]'::jsonb,
        v_next_version,
        true,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'version', v_next_version,
        'message', 'Novos valores e permissões salvos com vigência a partir de agora! Faturas passadas foram preservadas.'
    );
END;
$$;

-- 6. Função para consultar usuários e limites de uma loja
CREATE OR REPLACE FUNCTION public.get_store_users_and_limit(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_plan_tier VARCHAR;
    v_max_users INT;
    v_users JSONB;
BEGIN
    SELECT COALESCE(plan_tier, 'basic') INTO v_plan_tier
    FROM public.tenants
    WHERE id = p_tenant_id;

    SELECT COALESCE(max_users, CASE WHEN v_plan_tier = 'pro' THEN 3 ELSE 1 END) INTO v_max_users
    FROM public.saas_pricing_schedules
    WHERE plan_tier = v_plan_tier AND is_active = true
    ORDER BY version DESC LIMIT 1;

    IF v_max_users IS NULL THEN
        v_max_users := CASE WHEN v_plan_tier = 'pro' THEN 3 ELSE 1 END;
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', u.id,
        'fullName', u.full_name,
        'email', u.email,
        'role', u.role,
        'isActive', u.is_active,
        'mustChangePassword', u.must_change_password,
        'createdAt', u.created_at
    ) ORDER BY u.created_at ASC), '[]'::jsonb)
    INTO v_users
    FROM public.users u
    WHERE u.tenant_id = p_tenant_id;

    RETURN jsonb_build_object(
        'success', true,
        'planTier', v_plan_tier,
        'maxUsers', v_max_users,
        'activeUsersCount', (SELECT COUNT(*) FROM public.users WHERE tenant_id = p_tenant_id AND is_active = true),
        'users', v_users
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_saas_plans_config() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_saas_plans(NUMERIC, NUMERIC, NUMERIC, JSONB, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_store_users_and_limit(UUID) TO authenticated, service_role;
