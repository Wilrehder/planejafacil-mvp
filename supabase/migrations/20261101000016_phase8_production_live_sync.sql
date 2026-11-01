-- =============================================================================
-- MIGRATION: 20261101000016_phase8_production_live_sync.sql
-- DESCRIÇÃO: Fase 8 Produção — Limpeza de Dados Fictícios de Teste,
--            Sincronização 100% Real de Lojas, Leads, Candidaturas B2B,
--            Precificação e Resolução Inteligente de Municípios no Roteamento.
-- =============================================================================

-- 1. Helper para Resolver ou Criar Município em public.ibge_cities por Nome + UF
CREATE OR REPLACE FUNCTION public.resolve_or_create_ibge_city(
    p_city_name TEXT,
    p_state_uf VARCHAR DEFAULT 'SP',
    p_city_ibge_code VARCHAR DEFAULT NULL
)
RETURNS VARCHAR(7) AS $$
DECLARE
    v_clean_city TEXT := trim(COALESCE(p_city_name, 'São Paulo'));
    v_clean_uf VARCHAR(2) := upper(trim(COALESCE(p_state_uf, 'SP')));
    v_code VARCHAR(7);
BEGIN
    IF v_clean_city = '' THEN
        v_clean_city := 'São Paulo';
    END IF;
    IF length(v_clean_uf) <> 2 THEN
        v_clean_uf := 'SP';
    END IF;

    -- 1. Se um código IBGE explícito e não-genérico foi passado, verificar se bate com a cidade
    IF p_city_ibge_code IS NOT NULL AND length(trim(p_city_ibge_code)) = 7 THEN
        SELECT ibge_code INTO v_code
        FROM public.ibge_cities
        WHERE ibge_code = trim(p_city_ibge_code)
          AND lower(trim(city_name)) = lower(v_clean_city)
        LIMIT 1;

        IF v_code IS NOT NULL THEN
            RETURN v_code;
        END IF;
    END IF;

    -- 2. Buscar pelo nome da cidade + UF em ibge_cities
    SELECT ibge_code INTO v_code
    FROM public.ibge_cities
    WHERE lower(trim(city_name)) = lower(v_clean_city)
      AND upper(trim(state_uf)) = v_clean_uf
    LIMIT 1;

    IF v_code IS NOT NULL THEN
        RETURN v_code;
    END IF;

    -- 3. Se informou código explícito válido de 7 dígitos (ex: vindo do ViaCEP), registrar e usar
    IF p_city_ibge_code IS NOT NULL AND trim(p_city_ibge_code) ~ '^[0-9]{7}$' AND trim(p_city_ibge_code) <> '3552502' THEN
        v_code := trim(p_city_ibge_code);
    ELSE
        -- Gerar código determinístico de 7 dígitos baseado em cidade + UF
        v_code := lpad((abs(hashtext(lower(v_clean_city) || '_' || v_clean_uf)) % 8999999 + 1000000)::text, 7, '0');
    END IF;

    INSERT INTO public.ibge_cities (ibge_code, city_name, state_uf)
    VALUES (v_code, v_clean_city, v_clean_uf)
    ON CONFLICT (ibge_code) DO NOTHING;

    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.resolve_or_create_ibge_city(TEXT, VARCHAR, VARCHAR) TO anon, authenticated, service_role;


-- 2. Atualização do Motor de Roteamento (route_and_assign_lead) para Casar por IBGE ou Cidade+UF e Fallback Estadual
CREATE OR REPLACE FUNCTION public.route_and_assign_lead(p_lead_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_lead RECORD;
    v_chosen_tenant_id UUID;
    v_chosen_tenant_name TEXT;
    v_reason VARCHAR(30);
    v_assignment_id UUID;
BEGIN
    SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lead não encontrado.');
    END IF;

    IF v_lead.distribution_status = 'atribuido' THEN
        SELECT a.id, a.tenant_id, t.name INTO v_assignment_id, v_chosen_tenant_id, v_chosen_tenant_name
        FROM public.lead_assignments a
        JOIN public.tenants t ON t.id = a.tenant_id
        WHERE a.lead_id = p_lead_id
        LIMIT 1;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'already_assigned',
            'assignment_id', v_assignment_id,
            'tenant_id', v_chosen_tenant_id,
            'tenant_name', v_chosen_tenant_name
        );
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('lead_route_city_' || COALESCE(v_lead.city_ibge_code, v_lead.city_name)));

    -- PRIORIDADE 1: Lojas ativas sediadas no MESMO MUNICÍPIO (por IBGE ou Nome da Cidade + UF)
    SELECT id, name INTO v_chosen_tenant_id, v_chosen_tenant_name
    FROM public.tenants
    WHERE (
        city_ibge_code = v_lead.city_ibge_code
        OR (lower(trim(city_name)) = lower(trim(v_lead.city_name)) AND upper(trim(state_uf)) = upper(trim(v_lead.state_uf)))
      )
      AND status = 'ativa'
      AND is_routing_enabled = true
    ORDER BY last_assigned_at ASC NULLS FIRST, created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_chosen_tenant_id IS NOT NULL THEN
        v_reason := 'same_city_round_robin';
    ELSE
        -- PRIORIDADE 2A: Lojas com cobertura regional autorizada para o município
        SELECT t.id, t.name INTO v_chosen_tenant_id, v_chosen_tenant_name
        FROM public.tenants t
        JOIN public.store_coverage sc ON sc.tenant_id = t.id
        WHERE sc.city_ibge_code = v_lead.city_ibge_code
          AND sc.is_authorized = true
          AND t.status = 'ativa'
          AND t.is_routing_enabled = true
        ORDER BY sc.priority_level ASC, t.last_assigned_at ASC NULLS FIRST, t.created_at ASC
        LIMIT 1
        FOR UPDATE;

        IF v_chosen_tenant_id IS NOT NULL THEN
            v_reason := 'nearby_coverage_fallback';
        ELSE
            -- PRIORIDADE 2B: Fallback Estadual (Round Robin entre lojas ativas do mesmo Estado)
            SELECT id, name INTO v_chosen_tenant_id, v_chosen_tenant_name
            FROM public.tenants
            WHERE upper(trim(state_uf)) = upper(trim(v_lead.state_uf))
              AND status = 'ativa'
              AND is_routing_enabled = true
            ORDER BY last_assigned_at ASC NULLS FIRST, created_at ASC
            LIMIT 1
            FOR UPDATE;

            IF v_chosen_tenant_id IS NOT NULL THEN
                v_reason := 'nearby_coverage_fallback';
            END IF;
        END IF;
    END IF;

    -- PRIORIDADE 3: Sem Cobertura (Fila Administrativa)
    IF v_chosen_tenant_id IS NULL THEN
        UPDATE public.leads
        SET distribution_status = 'sem_cobertura',
            updated_at = now()
        WHERE id = p_lead_id;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'sem_cobertura',
            'message', 'Nenhuma loja elegível no município ou estado. Enviado para a fila administrativa.'
        );
    END IF;

    INSERT INTO public.lead_assignments (
        lead_id,
        tenant_id,
        assignment_reason,
        status,
        assigned_at,
        updated_at
    ) VALUES (
        p_lead_id,
        v_chosen_tenant_id,
        v_reason,
        'novo',
        now(),
        now()
    )
    ON CONFLICT (lead_id, tenant_id) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_assignment_id;

    IF NOT v_lead.is_external THEN
        INSERT INTO public.lead_deliveries (
            assignment_id,
            tenant_id,
            unit_cost,
            is_billable
        ) VALUES (
            v_assignment_id,
            v_chosen_tenant_id,
            50.00,
            true
        )
        ON CONFLICT (assignment_id) DO NOTHING;
    END IF;

    UPDATE public.tenants
    SET leads_count_cache = leads_count_cache + 1,
        last_assigned_at = now(),
        updated_at = now()
    WHERE id = v_chosen_tenant_id;

    UPDATE public.leads
    SET distribution_status = 'atribuido',
        updated_at = now()
    WHERE id = p_lead_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'atribuido',
        'assignment_id', v_assignment_id,
        'tenant_id', v_chosen_tenant_id,
        'tenant_name', v_chosen_tenant_name,
        'assignment_reason', v_reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 3. Atualização de admin_provision_store_and_user com Resolução Automática de Cidade IBGE
CREATE OR REPLACE FUNCTION public.admin_provision_store_and_user(
    p_name TEXT,
    p_cnpj VARCHAR DEFAULT NULL,
    p_responsible_name TEXT DEFAULT NULL,
    p_city_ibge_code VARCHAR DEFAULT NULL,
    p_city_name TEXT DEFAULT 'São Paulo',
    p_state_uf VARCHAR DEFAULT 'SP',
    p_phone VARCHAR DEFAULT NULL,
    p_whatsapp VARCHAR DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_plan_tier VARCHAR DEFAULT 'pro',
    p_contracted_price NUMERIC DEFAULT NULL,
    p_billing_due_day INT DEFAULT 10,
    p_is_routing_enabled BOOLEAN DEFAULT true,
    p_covered_cities VARCHAR[] DEFAULT '{}',
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
        SELECT monthly_price INTO v_price
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
        SELECT id INTO v_existing_user_id
        FROM auth.users
        WHERE email = lower(trim(p_owner_email));

        IF v_existing_user_id IS NOT NULL THEN
            v_user_id := v_existing_user_id;
            
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
                COALESCE(NULLIF(trim(p_owner_name), ''), NULLIF(trim(p_responsible_name), ''), p_name),
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
                v_tenant_id,
                COALESCE(NULLIF(trim(p_owner_name), ''), NULLIF(trim(p_responsible_name), ''), p_name),
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


-- 4. RPC para Carregar Todas as Lojas Reais do Banco (get_all_stores_sync)
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
            t.is_routing_enabled AS "routingEnabled"
        FROM public.tenants t
        ORDER BY t.created_at DESC
    ) s;

    RETURN jsonb_build_object('success', true, 'stores', v_stores);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_all_stores_sync() TO anon, authenticated, service_role;


-- 5. RPC para Excluir Loja Parceira (admin_delete_store)
CREATE OR REPLACE FUNCTION public.admin_delete_store(p_tenant_id UUID)
RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas o administrador pode excluir lojas.' USING ERRCODE = '42501';
    END IF;

    -- Desvincular ou remover usuários exclusivos da loja (exceto admins)
    DELETE FROM public.users WHERE tenant_id = p_tenant_id AND role <> 'platform_admin';
    DELETE FROM public.tenants WHERE id = p_tenant_id;

    RETURN jsonb_build_object('success', true, 'deleted_tenant_id', p_tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.admin_delete_store(UUID) TO authenticated, service_role;


-- 6. RPC para Carregar Todos os Leads Reais para Auditoria Admin (get_all_leads_sync)
CREATE OR REPLACE FUNCTION public.get_all_leads_sync()
RETURNS JSONB AS $$
DECLARE
    v_leads JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(l)), '[]'::jsonb)
    INTO v_leads
    FROM (
        SELECT
            ld.id::text AS id,
            la.id::text AS "assignmentId",
            ld.name,
            ld.phone,
            COALESCE(ld.whatsapp, ld.phone) AS whatsapp,
            COALESCE(ld.email, '') AS email,
            ld.city_name AS city,
            ld.state_uf AS state,
            ld.cep,
            ld.environment_summary AS environment,
            'MDF Alto Padrão' AS "finishPattern",
            'Dobradiças Soft-Close' AS "hardwareTier",
            ROUND((ld.estimated_max / 1200.0)::numeric, 1) AS "linearMeters",
            ld.estimated_min::numeric AS "estimatedMin",
            ld.estimated_max::numeric AS "estimatedMax",
            COALESCE(t.id::text, '') AS "assignedStoreId",
            COALESCE(t.name, CASE WHEN ld.distribution_status = 'sem_cobertura' THEN 'Fila Sem Cobertura' ELSE 'Aguardando Atribuição' END) AS "assignedStoreName",
            COALESCE(la.status, 'novo') AS status,
            COALESCE(ld.source, 'plataforma') AS source,
            COALESCE(ld.is_external, false) AS "isExternal",
            ld.created_at AS "createdAt"
        FROM public.leads ld
        LEFT JOIN public.lead_assignments la ON la.lead_id = ld.id
        LEFT JOIN public.tenants t ON t.id = la.tenant_id
        ORDER BY ld.created_at DESC
    ) l;

    RETURN jsonb_build_object('success', true, 'leads', v_leads);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_all_leads_sync() TO authenticated, service_role;


-- 7. RPCs para Candidaturas de Lojas Parceiras ("Seja uma Loja Parceira" no Rodapé)
CREATE OR REPLACE FUNCTION public.submit_partner_application(
    p_store_name TEXT,
    p_contact_name TEXT,
    p_phone VARCHAR,
    p_email TEXT,
    p_city TEXT,
    p_state_uf VARCHAR,
    p_desired_plan VARCHAR DEFAULT 'Pro',
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_app RECORD;
BEGIN
    INSERT INTO public.partner_applications (
        store_name,
        contact_name,
        phone,
        email,
        city,
        state_uf,
        desired_plan,
        notes,
        status,
        created_at,
        updated_at
    ) VALUES (
        trim(p_store_name),
        trim(p_contact_name),
        trim(p_phone),
        lower(trim(p_email)),
        trim(p_city),
        upper(trim(p_state_uf)),
        lower(trim(COALESCE(p_desired_plan, 'pro'))),
        p_notes,
        'nova',
        now(),
        now()
    ) RETURNING * INTO v_app;

    RETURN jsonb_build_object(
        'success', true,
        'application', jsonb_build_object(
            'id', v_app.id::text,
            'storeName', v_app.store_name,
            'contactName', v_app.contact_name,
            'phone', v_app.phone,
            'email', v_app.email,
            'city', v_app.city,
            'state', v_app.state_uf,
            'desiredPlan', CASE WHEN lower(v_app.desired_plan) = 'pro' THEN 'Pro' ELSE 'Basic' END,
            'notes', COALESCE(v_app.notes, ''),
            'status', v_app.status,
            'createdAt', v_app.created_at
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.submit_partner_application(TEXT, TEXT, VARCHAR, TEXT, TEXT, VARCHAR, VARCHAR, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_partner_applications()
RETURNS JSONB AS $$
DECLARE
    v_apps JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb)
    INTO v_apps
    FROM (
        SELECT
            pa.id::text AS id,
            pa.store_name AS "storeName",
            pa.contact_name AS "contactName",
            pa.phone,
            pa.email,
            pa.city,
            pa.state_uf AS state,
            CASE WHEN lower(pa.desired_plan) = 'pro' THEN 'Pro' ELSE 'Basic' END AS "desiredPlan",
            COALESCE(pa.notes, '') AS notes,
            pa.status,
            pa.created_at AS "createdAt"
        FROM public.partner_applications pa
        ORDER BY pa.created_at DESC
    ) a;

    RETURN jsonb_build_object('success', true, 'applications', v_apps);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_partner_applications() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_partner_application_status(
    p_id UUID,
    p_status VARCHAR
)
RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.partner_applications
    SET status = p_status, updated_at = now()
    WHERE id = p_id;

    RETURN jsonb_build_object('success', true, 'id', p_id, 'status', p_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.update_partner_application_status(UUID, VARCHAR) TO authenticated, service_role;


-- 8. RPC para Atualizar Precificação do m² no Banco (SettingsView)
CREATE OR REPLACE FUNCTION public.update_active_pricing_rule(p_base_m2_price NUMERIC)
RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas o administrador pode atualizar o preço base do m².' USING ERRCODE = '42501';
    END IF;

    UPDATE public.pricing_rules
    SET base_m2_price = p_base_m2_price
    WHERE is_active = true;

    RETURN jsonb_build_object('success', true, 'base_m2_price', p_base_m2_price);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.update_active_pricing_rule(NUMERIC) TO authenticated, service_role;


-- 9. LIMPEZA COMPLETA DE TODOS OS DADOS FICTÍCIOS E DE TESTE DO BANCO DE PRODUÇÃO
DELETE FROM public.order_audit_logs;
DELETE FROM public.order_documents;
DELETE FROM public.orders;
DELETE FROM public.invoice_payments;
DELETE FROM public.invoice_items;
DELETE FROM public.invoices;
DELETE FROM public.lead_notes;
DELETE FROM public.lead_deliveries;
DELETE FROM public.lead_assignments;
DELETE FROM public.leads;
DELETE FROM public.simulation_environments;
DELETE FROM public.simulations;
DELETE FROM public.subscription_history;
DELETE FROM public.store_subscriptions;
DELETE FROM public.store_coverage;
DELETE FROM public.partner_applications;

-- Remover usuários de teste mantendo apenas os administradores oficiais
DELETE FROM public.users
WHERE email NOT IN ('wrehdervalle@gmail.com', 'admin@planejafacil.com.br');

DELETE FROM auth.identities
WHERE user_id NOT IN (
    SELECT id FROM auth.users WHERE email IN ('wrehdervalle@gmail.com', 'admin@planejafacil.com.br')
);

DELETE FROM auth.users
WHERE email NOT IN ('wrehdervalle@gmail.com', 'admin@planejafacil.com.br');

DELETE FROM public.tenants;

