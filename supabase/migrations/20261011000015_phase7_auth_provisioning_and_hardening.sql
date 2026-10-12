-- =============================================================================
-- MIGRATION: 20261011000015_phase7_auth_provisioning_and_hardening.sql
-- DESCRIÇÃO: Fase 7 Final — Provisionamento Administrativo de Usuários,
--            Controle de Primeiro Acesso com Senha Temporária, RBAC e
--            Endurecimento de Sessão e Multi-Tenancy Real.
-- =============================================================================

-- 1. Ampliação da Tabela public.users com Auditoria de Acesso e Flag de Primeiro Acesso
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- 2. Endurecimento da Função current_tenant_id()
-- Garante que apenas usuários autenticados e ATIVOS tenham acesso aos dados do tenant.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id 
    FROM public.users 
    WHERE id = auth.uid() 
      AND is_active = true;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. Endurecimento da Função current_role()
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS TEXT AS $$
    SELECT COALESCE(
        (SELECT role FROM public.users WHERE id = auth.uid() AND is_active = true),
        'anonymous'
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. Procedure Atômica para Provisionamento de Loja e Conta do Lojista
-- Executada exclusivamente pelo platform_admin. Cria loja, assinatura, cobertura
-- e provisiona credenciais em auth.users, auth.identities e public.users em uma
-- ÚNICA transação ACID atômica (sem chance de falha parcial ou chaves órfãs).
CREATE OR REPLACE FUNCTION public.admin_provision_store_and_user(
    p_name TEXT,
    p_cnpj VARCHAR DEFAULT NULL,
    p_responsible_name TEXT DEFAULT NULL,
    p_city_ibge_code VARCHAR DEFAULT '3552502',
    p_city_name TEXT DEFAULT 'Suzano',
    p_state_uf VARCHAR DEFAULT 'SP',
    p_phone VARCHAR DEFAULT NULL,
    p_whatsapp VARCHAR DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_plan_tier VARCHAR DEFAULT 'pro',
    p_contracted_price NUMERIC DEFAULT NULL,
    p_billing_due_day INT DEFAULT 10,
    p_is_routing_enabled BOOLEAN DEFAULT true,
    p_covered_cities VARCHAR[] DEFAULT '{}',
    -- Parâmetros de Autenticação Inicial
    p_owner_email TEXT DEFAULT NULL,
    p_owner_name TEXT DEFAULT NULL,
    p_temp_password TEXT DEFAULT NULL,
    p_must_change_password BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
    v_subscription_id UUID;
    v_price NUMERIC(10,2);
    v_hashed_password TEXT;
    v_existing_user_id UUID;
    v_due_day INT;
BEGIN
    -- Validação Estrita de Papel
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas o administrador do SaaS pode provisionar lojas e usuários.' USING ERRCODE = '42501';
    END IF;

    -- Validação de Preço e Vencimento
    v_due_day := LEAST(GREATEST(COALESCE(p_billing_due_day, 10), 1), 31);
    
    IF p_contracted_price IS NULL OR p_contracted_price <= 0 THEN
        SELECT monthly_price INTO v_price
        FROM public.saas_pricing_schedules
        WHERE plan_tier = p_plan_tier AND is_active = true
        ORDER BY version DESC LIMIT 1;
        
        IF v_price IS NULL THEN
            v_price := CASE WHEN p_plan_tier = 'pro' THEN 219.90 ELSE 119.90 END;
        END IF;
    ELSE
        v_price := p_contracted_price;
    END IF;

    -- 1. Criar Loja Parceira em public.tenants
    INSERT INTO public.tenants (
        name,
        cnpj,
        responsible_name,
        city_ibge_code,
        city_name,
        state_uf,
        phone,
        whatsapp,
        email,
        plan_tier,
        status,
        is_routing_enabled,
        leads_count_cache,
        created_at,
        updated_at
    ) VALUES (
        p_name,
        p_cnpj,
        COALESCE(p_responsible_name, p_owner_name, p_name),
        COALESCE(p_city_ibge_code, '3552502'),
        COALESCE(p_city_name, 'Suzano'),
        COALESCE(p_state_uf, 'SP'),
        COALESCE(p_phone, '11999990000'),
        COALESCE(p_whatsapp, p_phone, '11999990000'),
        COALESCE(p_email, p_owner_email, 'loja@planejafacil.com.br'),
        p_plan_tier,
        'ativa',
        p_is_routing_enabled,
        0,
        now(),
        now()
    ) RETURNING id INTO v_tenant_id;

    -- 2. Criar Assinatura Oficial da Loja
    INSERT INTO public.store_subscriptions (
        tenant_id,
        plan_tier,
        contracted_monthly_price,
        billing_due_day,
        status,
        started_at,
        created_at,
        updated_at
    ) VALUES (
        v_tenant_id,
        p_plan_tier,
        v_price,
        v_due_day,
        'active',
        now(),
        now(),
        now()
    ) RETURNING id INTO v_subscription_id;

    -- Log de início da assinatura
    INSERT INTO public.subscription_history (
        subscription_id,
        tenant_id,
        action,
        new_plan,
        new_price,
        new_status,
        performed_by,
        notes
    ) VALUES (
        v_subscription_id,
        v_tenant_id,
        'created',
        p_plan_tier,
        v_price,
        'active',
        auth.uid(),
        format('Provisionamento de loja com plano %s, valor R$ %s, vencimento dia %s.', p_plan_tier, v_price, v_due_day)
    );

    -- 3. Inserir Cobertura Geográfica da Loja
    INSERT INTO public.store_coverage (
        tenant_id,
        city_ibge_code,
        priority_level,
        is_authorized,
        created_at
    ) VALUES (
        v_tenant_id,
        COALESCE(p_city_ibge_code, '3552502'),
        1,
        true,
        now()
    ) ON CONFLICT DO NOTHING;

    -- 4. Provisionamento do Usuário Responsável (se email foi fornecido)
    IF p_owner_email IS NOT NULL AND trim(p_owner_email) <> '' THEN
        -- Verificar se o usuário já existe em auth.users
        SELECT id INTO v_existing_user_id
        FROM auth.users
        WHERE email = lower(trim(p_owner_email));

        IF v_existing_user_id IS NOT NULL THEN
            v_user_id := v_existing_user_id;
            
            -- Atualiza vínculo e papel na tabela public.users
            INSERT INTO public.users (
                id,
                tenant_id,
                full_name,
                email,
                role,
                must_change_password,
                is_active,
                updated_at
            ) VALUES (
                v_user_id,
                v_tenant_id,
                COALESCE(p_owner_name, p_responsible_name, p_name),
                lower(trim(p_owner_email)),
                'store_owner',
                p_must_change_password,
                true,
                now()
            )
            ON CONFLICT (id) DO UPDATE SET
                tenant_id = v_tenant_id,
                role = 'store_owner',
                full_name = EXCLUDED.full_name,
                must_change_password = EXCLUDED.must_change_password,
                is_active = true,
                updated_at = now();

            -- Atualiza metadados do auth
            UPDATE auth.users
            SET raw_app_meta_data = jsonb_build_object(
                'provider', 'email',
                'providers', array['email'],
                'role', 'store_owner',
                'store_id', v_tenant_id,
                'must_change_password', p_must_change_password
            )
            WHERE id = v_user_id;

        ELSE
            -- Cria novo usuário com UUID e hash bcrypt seguro
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
                updated_at
            ) VALUES (
                v_user_id,
                '00000000-0000-0000-0000-000000000000',
                'authenticated',
                'authenticated',
                lower(trim(p_owner_email)),
                v_hashed_password,
                now(),
                jsonb_build_object(
                    'provider', 'email',
                    'providers', array['email'],
                    'role', 'store_owner',
                    'store_id', v_tenant_id,
                    'must_change_password', p_must_change_password
                ),
                jsonb_build_object(
                    'name', COALESCE(p_owner_name, p_responsible_name, p_name)
                ),
                now(),
                now()
            );

            -- Cria identidade correspondente
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
                lower(trim(p_owner_email)),
                jsonb_build_object('sub', v_user_id, 'email', lower(trim(p_owner_email))),
                'email',
                now(),
                now(),
                now()
            );

            -- Cria perfil comercial em public.users
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
                v_tenant_id,
                COALESCE(p_owner_name, p_responsible_name, p_name),
                lower(trim(p_owner_email)),
                'store_owner',
                p_must_change_password,
                true,
                now(),
                now()
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'user_id', v_user_id,
        'email', lower(trim(p_owner_email)),
        'must_change_password', p_must_change_password,
        'message', 'Loja parceira, assinatura e acesso do lojista provisionados com sucesso.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_provision_store_and_user FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_provision_store_and_user TO authenticated, service_role;


-- 5. Procedure para Consulta de Usuários Vinculados a uma Loja (admin_list_store_users)
CREATE OR REPLACE FUNCTION public.admin_list_store_users(
    p_tenant_id UUID
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    role VARCHAR,
    is_active BOOLEAN,
    must_change_password BOOLEAN,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Permitido apenas para admin ou para o dono da própria loja
    IF NOT (public.is_platform_admin() OR (public.current_tenant_id() = p_tenant_id AND public.current_role() = 'store_owner')) THEN
        RAISE EXCEPTION 'Acesso negado: sem permissão para listar usuários desta loja.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.is_active,
        u.must_change_password,
        u.created_at,
        u.last_sign_in_at
    FROM public.users u
    WHERE u.tenant_id = p_tenant_id
    ORDER BY u.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_list_store_users FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_list_store_users TO authenticated, service_role;


-- 6. Procedure para Criar Usuário Adicional em uma Loja (ex: Operador)
CREATE OR REPLACE FUNCTION public.admin_create_store_user(
    p_tenant_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT DEFAULT 'store_operator',
    p_temp_password TEXT DEFAULT 'PlanejaFacil2026!',
    p_must_change_password BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_hashed_password TEXT;
BEGIN
    IF NOT (public.is_platform_admin() OR (public.current_tenant_id() = p_tenant_id AND public.current_role() = 'store_owner')) THEN
        RAISE EXCEPTION 'Acesso negado: sem permissão para criar usuários nesta loja.' USING ERRCODE = '42501';
    END IF;

    IF p_role NOT IN ('store_owner', 'store_operator') THEN
        RAISE EXCEPTION 'Papel inválido para usuário de loja: %', p_role;
    END IF;

    -- Verificar se já existe
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
        updated_at
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
        now()
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
        'email', lower(trim(p_email)),
        'role', p_role,
        'message', 'Usuário provisionado com sucesso para a loja.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_create_store_user FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_create_store_user TO authenticated, service_role;


-- 7. Procedure para Desativar / Reativar Usuário (admin_toggle_user_status)
CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(
    p_user_id UUID,
    p_is_active BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado.');
    END IF;

    IF NOT (public.is_platform_admin() OR (public.current_tenant_id() = v_user.tenant_id AND public.current_role() = 'store_owner')) THEN
        RAISE EXCEPTION 'Acesso negado: sem permissão para alterar status deste usuário.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.users 
    SET is_active = p_is_active, updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'is_active', p_is_active);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_toggle_user_status FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_status TO authenticated, service_role;


-- 8. Procedure para Resetar Senha Temporária por Administrador (admin_reset_user_password)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_user_id UUID,
    p_new_temp_password TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
    v_hashed_password TEXT;
BEGIN
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado.');
    END IF;

    IF NOT (public.is_platform_admin() OR (public.current_tenant_id() = v_user.tenant_id AND public.current_role() = 'store_owner')) THEN
        RAISE EXCEPTION 'Acesso negado: sem permissão para redefinir senha deste usuário.' USING ERRCODE = '42501';
    END IF;

    v_hashed_password := extensions.crypt(p_new_temp_password, extensions.gen_salt('bf'));

    UPDATE auth.users
    SET encrypted_password = v_hashed_password,
        raw_app_meta_data = raw_app_meta_data || jsonb_build_object('must_change_password', true),
        updated_at = now()
    WHERE id = p_user_id;

    UPDATE public.users
    SET must_change_password = true,
        updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'message', 'Senha redefinida com sucesso.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_reset_user_password FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password TO authenticated, service_role;


-- 9. Procedure para Concluir Primeiro Acesso e Troca de Senha (user_complete_password_change)
CREATE OR REPLACE FUNCTION public.user_complete_password_change()
RETURNS JSONB AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.users
    SET must_change_password = false,
        updated_at = now()
    WHERE id = v_uid;

    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('must_change_password', false),
        updated_at = now()
    WHERE id = v_uid;

    RETURN jsonb_build_object('success', true, 'user_id', v_uid, 'message', 'Senha pessoal ativada com sucesso.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

GRANT EXECUTE ON FUNCTION public.user_complete_password_change TO authenticated;
