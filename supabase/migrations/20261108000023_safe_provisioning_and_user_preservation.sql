-- MIGRATION: 20261108000023_safe_provisioning_and_user_preservation.sql
-- Objetivo:
-- 1. Criação de store_members para suportar múltiplos vínculos por usuário (montador em várias lojas, gestor multi-loja, etc.)
-- 2. Preservação estrita de senhas existentes (nunca sobrepor senha de usuário existente)
-- 3. Preservação de privilégios de platform_admin (Dono do SaaS nunca perde o papel ao ser vinculado a uma loja)
-- 4. Função RPC segura para listar usuários elegíveis para vinculação
-- 5. Atualização atômica de provision_store_and_user_v2 e admin_create_store_user

-- 1. TABELA DE MEMBROS DA LOJA (Multi-Store Association)
CREATE TABLE IF NOT EXISTS public.store_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('store_owner', 'store_operator', 'store_assembler', 'platform_admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_store_member UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_members_tenant ON public.store_members (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_store_members_user ON public.store_members (user_id);

ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "store_members_read" ON public.store_members;
    DROP POLICY IF EXISTS "store_members_write" ON public.store_members;
END $$;

CREATE POLICY "store_members_read" ON public.store_members
FOR SELECT TO authenticated
USING (public.is_platform_admin() OR tenant_id = public.current_tenant_id() OR user_id = auth.uid());

CREATE POLICY "store_members_write" ON public.store_members
FOR ALL TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated, service_role;

-- 2. Backfill de usuários existentes para store_members
INSERT INTO public.store_members (tenant_id, user_id, role, is_active)
SELECT tenant_id, id, role, is_active
FROM public.users
WHERE tenant_id IS NOT NULL
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- 3. RPC para listar todos os usuários existentes disponíveis para associação
CREATE OR REPLACE FUNCTION public.admin_list_all_available_users()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  tenant_id UUID,
  is_active BOOLEAN
) AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Super Admin da plataforma pode listar todos os usuários.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.full_name::TEXT,
    u.email::TEXT,
    u.role::TEXT,
    u.tenant_id,
    u.is_active
  FROM public.users u
  WHERE u.is_active = true
  ORDER BY 
    CASE WHEN u.role = 'platform_admin' THEN 1 ELSE 2 END,
    u.full_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.admin_list_all_available_users() TO authenticated, anon, service_role;

-- 4. Atualização de get_store_users_and_limit com suporte a store_members
CREATE OR REPLACE FUNCTION public.get_store_users_and_limit(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tenant RECORD;
  v_plan_tier TEXT;
  v_max_users INT := 1;
  v_extra_user_price NUMERIC(10,2) := 39.90;
  v_active_count INT := 0;
  v_users jsonb;
BEGIN
  IF NOT (public.is_platform_admin() OR (public.current_tenant_id() = p_tenant_id AND public.current_role() = 'store_owner')) THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Super Admin ou o Gerente da loja podem consultar usuários.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loja não encontrada.');
  END IF;

  v_plan_tier := LOWER(COALESCE(v_tenant.plan_tier, 'basic'));

  SELECT max_users, extra_user_price 
  INTO v_max_users, v_extra_user_price
  FROM public.saas_pricing_schedules
  WHERE plan_tier = v_plan_tier AND is_active = true
  ORDER BY effective_from DESC
  LIMIT 1;

  IF v_max_users IS NULL THEN
    v_max_users := CASE WHEN v_plan_tier = 'pro' THEN 3 ELSE 1 END;
  END IF;

  -- Contagem combinada de usuários ativos
  SELECT COUNT(DISTINCT u_id)::INT INTO v_active_count
  FROM (
    SELECT id as u_id FROM public.users WHERE tenant_id = p_tenant_id AND is_active = true
    UNION
    SELECT user_id as u_id FROM public.store_members WHERE tenant_id = p_tenant_id AND is_active = true
  ) active_members;

  -- Listagem completa com informações unificadas
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'fullName', m.full_name,
        'email', m.email,
        'role', m.role,
        'isActive', m.is_active,
        'createdAt', m.created_at
      ) ORDER BY m.created_at ASC
    ),
    '[]'::jsonb
  )
  INTO v_users
  FROM (
    SELECT DISTINCT ON (u.id)
      u.id,
      u.full_name,
      u.email,
      COALESCE(sm.role, u.role) as role,
      COALESCE(sm.is_active, u.is_active) as is_active,
      u.created_at
    FROM public.users u
    LEFT JOIN public.store_members sm ON sm.user_id = u.id AND sm.tenant_id = p_tenant_id
    WHERE u.tenant_id = p_tenant_id OR sm.tenant_id = p_tenant_id
  ) m;

  RETURN jsonb_build_object(
    'success', true,
    'planTier', v_plan_tier,
    'maxUsers', v_max_users,
    'extraUserPrice', v_extra_user_price,
    'activeUsersCount', v_active_count,
    'extraUsersCount', GREATEST(v_active_count - v_max_users, 0),
    'users', v_users
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_store_users_and_limit(UUID) TO authenticated, service_role;

-- 5. Atualização de admin_create_store_user para vinculação segura sem sobrepor senha
CREATE OR REPLACE FUNCTION public.admin_create_store_user(
  p_tenant_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'store_operator',
  p_temp_password TEXT DEFAULT 'PlanejaFacil2026!',
  p_must_change_password BOOLEAN DEFAULT true,
  p_allow_extra BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  v_tenant RECORD;
  v_active_users_count INT;
  v_max_users INT;
  v_user_id UUID;
  v_is_extra BOOLEAN := false;
  v_existing_user RECORD;
BEGIN
  IF NOT public.is_platform_admin() THEN
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
    RETURN jsonb_build_object('success', false, 'error', 'Função inválida. Escolha Administrador da Loja, Vendedor ou Montador.');
  END IF;

  SELECT max_users INTO v_max_users
  FROM public.saas_pricing_schedules
  WHERE plan_tier = LOWER(COALESCE(v_tenant.plan_tier, 'basic')) AND is_active = true
  ORDER BY effective_from DESC
  LIMIT 1;

  IF v_max_users IS NULL THEN
    v_max_users := CASE WHEN LOWER(v_tenant.plan_tier) = 'pro' THEN 3 ELSE 1 END;
  END IF;

  -- Contagem de ativos
  SELECT COUNT(DISTINCT u_id)::INT INTO v_active_users_count
  FROM (
    SELECT id as u_id FROM public.users WHERE tenant_id = p_tenant_id AND is_active = true
    UNION
    SELECT user_id as u_id FROM public.store_members WHERE tenant_id = p_tenant_id AND is_active = true
  ) active_members;

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

  -- Verifica se o usuário já existe no sistema
  SELECT id, full_name, email, role INTO v_existing_user
  FROM public.users
  WHERE lower(email) = lower(trim(p_email));

  IF FOUND THEN
    v_user_id := v_existing_user.id;

    -- Verifica se já está vinculado a esta loja específica
    IF EXISTS (
      SELECT 1 FROM public.store_members
      WHERE tenant_id = p_tenant_id AND user_id = v_user_id
    ) OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = v_user_id AND tenant_id = p_tenant_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Este usuário já está vinculado a esta loja.');
    END IF;

    -- Vincula à nova loja SEM ALTERAR A SENHA E SEM REBAIXAR platform_admin
    INSERT INTO public.store_members (
      tenant_id,
      user_id,
      role,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      p_tenant_id,
      v_user_id,
      p_role,
      true,
      now(),
      now()
    ) ON CONFLICT (tenant_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      is_active = true,
      updated_at = now();

    RETURN jsonb_build_object(
      'success', true,
      'user_id', v_user_id,
      'is_existing', true,
      'is_extra', v_is_extra,
      'email', lower(trim(p_email)),
      'role', p_role,
      'message', 'Usuário existente no sistema vinculado à loja com sucesso! A senha atual foi mantida intacta.'
    );
  END IF;

  -- Se for novo usuário, cria conta em auth.users, auth.identities e public.users
  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    lower(trim(p_email)),
    extensions.crypt(COALESCE(NULLIF(p_temp_password, ''), 'PlanejaFacil2026!'), extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    jsonb_build_object(
      'provider', 'email',
      'providers', array['email'],
      'role', p_role,
      'store_id', p_tenant_id,
      'must_change_password', COALESCE(p_must_change_password, true)
    ),
    jsonb_build_object(
      'full_name', trim(p_full_name)
    ),
    false,
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
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    tenant_id,
    is_active,
    must_change_password,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    lower(trim(p_email)),
    trim(p_full_name),
    p_role,
    p_tenant_id,
    true,
    COALESCE(p_must_change_password, true),
    now(),
    now()
  );

  INSERT INTO public.store_members (
    tenant_id,
    user_id,
    role,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_tenant_id,
    v_user_id,
    p_role,
    true,
    now(),
    now()
  ) ON CONFLICT (tenant_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'is_existing', false,
    'is_extra', v_is_extra,
    'email', lower(trim(p_email)),
    'role', p_role,
    'message', CASE 
      WHEN v_is_extra THEN 'Novo colaborador criado com sucesso! Será incluído como acesso extra na fatura mensal.'
      ELSE 'Novo colaborador criado com sucesso dentro da cota do plano!'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions, pg_temp;

GRANT EXECUTE ON FUNCTION public.admin_create_store_user(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated, service_role;

-- 6. Atualização de provision_store_and_user_v2 para preservação estrita de senha e papéis
CREATE OR REPLACE FUNCTION public.provision_store_and_user_v2(
    p_name TEXT,
    p_cnpj TEXT DEFAULT NULL,
    p_responsible_name TEXT DEFAULT NULL,
    p_city_ibge_code VARCHAR DEFAULT NULL,
    p_city_name TEXT DEFAULT NULL,
    p_state_uf VARCHAR DEFAULT 'SP',
    p_phone TEXT DEFAULT NULL,
    p_whatsapp TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_plan_tier TEXT DEFAULT 'pro',
    p_contracted_price NUMERIC DEFAULT NULL,
    p_billing_due_day INT DEFAULT 10,
    p_is_routing_enabled BOOLEAN DEFAULT true,
    p_covered_cities TEXT[] DEFAULT NULL,
    p_owner_email TEXT DEFAULT NULL,
    p_owner_name TEXT DEFAULT NULL,
    p_temp_password TEXT DEFAULT 'PlanejaFacil2026!',
    p_must_change_password BOOLEAN DEFAULT true,
    p_has_retention_clause BOOLEAN DEFAULT false,
    p_retention_months INT DEFAULT 6
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
    v_subscription_id UUID;
    v_price NUMERIC(10,2);
    v_hashed_password TEXT;
    v_existing_user_id UUID;
    v_existing_user RECORD;
    v_due_day INT;
    v_resolved_ibge VARCHAR(7);
    v_clean_city TEXT := trim(COALESCE(NULLIF(trim(p_city_name), ''), 'São Paulo'));
    v_clean_uf VARCHAR(2) := upper(trim(COALESCE(NULLIF(trim(p_state_uf), ''), 'SP')));
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas o administrador do SaaS pode provisionar lojas e usuários.' USING ERRCODE = '42501';
    END IF;

    v_resolved_ibge := public.resolve_or_create_ibge_city(v_clean_city, v_clean_uf, p_city_ibge_code);
    v_due_day := LEAST(GREATEST(COALESCE(p_billing_due_day, 10), 1), 31);
    
    IF p_contracted_price IS NULL OR p_contracted_price <= 0 THEN
        SELECT monthly_subscription_price INTO v_price
        FROM public.saas_pricing_schedules
        WHERE plan_tier = lower(p_plan_tier) AND is_active = true
        ORDER BY version DESC LIMIT 1;
        
        IF v_price IS NULL THEN
            v_price := CASE WHEN lower(p_plan_tier) = 'pro' THEN 219.90 ELSE 119.90 END;
        END IF;
    ELSE
        v_price := p_contracted_price;
    END IF;

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
        has_retention_clause,
        retention_months,
        created_at,
        updated_at
    ) VALUES (
        p_name,
        p_cnpj,
        COALESCE(NULLIF(trim(p_responsible_name), ''), NULLIF(trim(p_owner_name), ''), p_name),
        v_resolved_ibge,
        v_clean_city,
        v_clean_uf,
        COALESCE(NULLIF(trim(p_phone), ''), '11999990000'),
        COALESCE(NULLIF(trim(p_whatsapp), ''), NULLIF(trim(p_phone), ''), '11999990000'),
        COALESCE(NULLIF(trim(p_email), ''), NULLIF(trim(p_owner_email), ''), 'loja@planejafacil.com.br'),
        lower(p_plan_tier),
        'ativa',
        p_is_routing_enabled,
        0,
        COALESCE(p_has_retention_clause, false),
        COALESCE(p_retention_months, 6),
        now(),
        now()
    ) RETURNING id INTO v_tenant_id;

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
        lower(p_plan_tier),
        v_price,
        v_due_day,
        'active',
        now(),
        now(),
        now()
    ) RETURNING id INTO v_subscription_id;

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
        lower(p_plan_tier),
        v_price,
        'active',
        auth.uid(),
        format('Provisionamento de loja com plano %s, valor R$ %s, vencimento dia %s.', lower(p_plan_tier), v_price, v_due_day)
    );

    INSERT INTO public.store_coverage (
        tenant_id,
        city_ibge_code,
        priority_level,
        is_authorized,
        created_at
    ) VALUES (
        v_tenant_id,
        v_resolved_ibge,
        1,
        true,
        now()
    ) ON CONFLICT DO NOTHING;

    IF p_owner_email IS NOT NULL AND trim(p_owner_email) <> '' THEN
        SELECT id, email, role INTO v_existing_user
        FROM public.users
        WHERE lower(email) = lower(trim(p_owner_email));

        IF v_existing_user.id IS NOT NULL THEN
            v_user_id := v_existing_user.id;
            
            -- Atualiza public.users preservando o role platform_admin
            UPDATE public.users SET
                tenant_id = COALESCE(public.users.tenant_id, v_tenant_id),
                role = CASE WHEN public.users.role = 'platform_admin' THEN 'platform_admin' ELSE 'store_owner' END,
                is_active = true,
                updated_at = now()
            WHERE id = v_user_id;

            -- Registra associação na tabela store_members
            INSERT INTO public.store_members (
                tenant_id,
                user_id,
                role,
                is_active,
                created_at,
                updated_at
            ) VALUES (
                v_tenant_id,
                v_user_id,
                'store_owner',
                true,
                now(),
                now()
            ) ON CONFLICT (tenant_id, user_id) DO UPDATE SET
                is_active = true,
                updated_at = now();

        ELSE
            v_user_id := gen_random_uuid();
            v_hashed_password := extensions.crypt(COALESCE(NULLIF(p_temp_password, ''), 'PlanejaFacil2026!'), extensions.gen_salt('bf'));

            INSERT INTO auth.users (
                id,
                instance_id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                confirmation_token,
                recovery_token,
                email_change_token_new,
                email_change,
                raw_app_meta_data,
                raw_user_meta_data,
                is_sso_user,
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
                '',
                '',
                '',
                '',
                jsonb_build_object(
                    'provider', 'email',
                    'providers', array['email'],
                    'role', 'store_owner',
                    'store_id', v_tenant_id,
                    'must_change_password', p_must_change_password
                ),
                jsonb_build_object(
                    'name', COALESCE(NULLIF(trim(p_owner_name), ''), NULLIF(trim(p_responsible_name), ''), p_name)
                ),
                false,
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
                lower(trim(p_owner_email)),
                jsonb_build_object('sub', v_user_id, 'email', lower(trim(p_owner_email))),
                'email',
                now(),
                now(),
                now()
            ) ON CONFLICT (provider, provider_id) DO NOTHING;

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
                COALESCE(NULLIF(trim(p_owner_name), ''), NULLIF(trim(p_responsible_name), ''), p_name),
                lower(trim(p_owner_email)),
                'store_owner',
                p_must_change_password,
                true,
                now(),
                now()
            );

            INSERT INTO public.store_members (
                tenant_id,
                user_id,
                role,
                is_active,
                created_at,
                updated_at
            ) VALUES (
                v_tenant_id,
                v_user_id,
                'store_owner',
                true,
                now(),
                now()
            ) ON CONFLICT (tenant_id, user_id) DO NOTHING;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'user_id', v_user_id,
        'email', lower(trim(p_owner_email)),
        'must_change_password', p_must_change_password,
        'message', 'Loja parceira, assinatura e acesso do lojista provisionados com sucesso com preservação de credenciais.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions, pg_temp;

GRANT EXECUTE ON FUNCTION public.provision_store_and_user_v2(TEXT, TEXT, TEXT, VARCHAR, TEXT, VARCHAR, TEXT, TEXT, TEXT, TEXT, NUMERIC, INT, BOOLEAN, TEXT[], TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INT) TO authenticated, service_role;
