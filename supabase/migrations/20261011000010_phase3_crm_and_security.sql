-- =============================================================================
-- MIGRATION: 20261011000010_phase3_crm_and_security.sql
-- DESCRIÇÃO: Fase 3 - Segurança, Storage, CRM Completo, Leads Externos (Pro),
--            Notas, Anexos e Conversão Integrada CRM -> ERP
-- =============================================================================

-- 1. HARDENING DE SEGURANÇA E SEARCH_PATH NAS FUNÇÕES EXISTENTES
ALTER FUNCTION public.current_tenant_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.current_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_platform_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.submit_consumer_simulation(TEXT, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB, TEXT, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_simulation_proposal(UUID) SET search_path = public, pg_temp;

-- Revogar permissões perigosas de anon
REVOKE EXECUTE ON FUNCTION public.route_and_assign_lead(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.route_and_assign_lead(UUID) TO authenticated, service_role;
ALTER FUNCTION public.route_and_assign_lead(UUID) SET search_path = public, pg_temp;

-- 2. VALIDAÇÃO ROBUSTA NA CRIAÇÃO/SINCRONIZAÇÃO DE CIDADES IBGE
CREATE OR REPLACE FUNCTION public.ensure_ibge_city(
    p_ibge_code VARCHAR(7),
    p_name TEXT,
    p_state_uf VARCHAR(2),
    p_latitude NUMERIC DEFAULT NULL,
    p_longitude NUMERIC DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_clean_ibge VARCHAR(7);
    v_clean_name TEXT;
    v_clean_uf VARCHAR(2);
BEGIN
    v_clean_ibge := regexp_replace(COALESCE(p_ibge_code, ''), '\D', '', 'g');
    v_clean_name := trim(COALESCE(p_name, ''));
    v_clean_uf := upper(trim(COALESCE(p_state_uf, '')));

    IF length(v_clean_ibge) <> 7 THEN
        RAISE EXCEPTION 'Código IBGE inválido. Deve conter exatamente 7 dígitos numéricos.' USING ERRCODE = '22023';
    END IF;

    IF length(v_clean_name) < 2 OR length(v_clean_name) > 120 THEN
        RAISE EXCEPTION 'Nome do município inválido.' USING ERRCODE = '22023';
    END IF;

    IF length(v_clean_uf) <> 2 THEN
        RAISE EXCEPTION 'UF do estado inválida. Deve conter 2 letras maiúsculas.' USING ERRCODE = '22023';
    END IF;

    INSERT INTO ibge_cities (ibge_code, name, state_uf, latitude, longitude)
    VALUES (v_clean_ibge, v_clean_name, v_clean_uf, p_latitude, p_longitude)
    ON CONFLICT (ibge_code) DO UPDATE
    SET name = EXCLUDED.name,
        state_uf = EXCLUDED.state_uf,
        latitude = COALESCE(EXCLUDED.latitude, ibge_cities.latitude),
        longitude = COALESCE(EXCLUDED.longitude, ibge_cities.longitude);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. AJUSTES NA TABELA DE ATRIBUIÇÕES E NOTAS DO CRM
ALTER TABLE lead_assignments 
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS attached_at TIMESTAMPTZ;

-- Permitir author_name em lead_notes para exibição rápida e compatível
ALTER TABLE lead_notes 
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ALTER COLUMN author_id DROP NOT NULL;

-- 4. BUCKETS DE STORAGE PRIVADOS PARA PROPOSTAS E DOCUMENTOS ERP
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('lead-proposals', 'lead-proposals', false, 15728640, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('order-documents', 'order-documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE 
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de isolamento Multi-Tenant no Supabase Storage
DO $$
BEGIN
    DROP POLICY IF EXISTS "tenant_manage_own_proposals" ON storage.objects;
    DROP POLICY IF EXISTS "tenant_select_own_proposals" ON storage.objects;
    DROP POLICY IF EXISTS "tenant_manage_own_order_docs" ON storage.objects;
    DROP POLICY IF EXISTS "tenant_select_own_order_docs" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "tenant_manage_own_proposals" ON storage.objects
FOR ALL TO authenticated
USING (
    bucket_id = 'lead-proposals' AND (
        public.is_platform_admin() OR
        (storage.foldername(name))[1] = public.current_tenant_id()::text
    )
)
WITH CHECK (
    bucket_id = 'lead-proposals' AND (
        public.is_platform_admin() OR
        (storage.foldername(name))[1] = public.current_tenant_id()::text
    )
);

CREATE POLICY "tenant_manage_own_order_docs" ON storage.objects
FOR ALL TO authenticated
USING (
    bucket_id = 'order-documents' AND (
        public.is_platform_admin() OR
        (storage.foldername(name))[1] = public.current_tenant_id()::text
    )
)
WITH CHECK (
    bucket_id = 'order-documents' AND (
        public.is_platform_admin() OR
        (storage.foldername(name))[1] = public.current_tenant_id()::text
    )
);

-- 5. FUNÇÃO APRIMORADA: CONSULTA DE LEADS DO CRM COM ISOLAMENTO E DADOS RICOS
CREATE OR REPLACE FUNCTION get_store_leads(p_tenant_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_user_tenant_id UUID;
    v_effective_tenant_id UUID;
    v_is_admin BOOLEAN;
    v_leads JSONB;
BEGIN
    v_user_tenant_id := public.current_tenant_id();
    v_is_admin := public.is_platform_admin();

    -- Regra de Segurança Multi-Tenant:
    -- Se usuário autenticado pertence a um tenant, ele SÓ PODE consultar seu próprio tenant.
    IF v_user_tenant_id IS NOT NULL THEN
        v_effective_tenant_id := v_user_tenant_id;
    ELSIF v_is_admin THEN
        -- Administrador da plataforma pode inspecionar qualquer loja
        v_effective_tenant_id := p_tenant_id;
    ELSIF auth.uid() IS NULL THEN
        -- Usuário anônimo NÃO possui permissão para visualizar leads do CRM de lojistas
        RAISE EXCEPTION 'Acesso negado: Autenticação de lojista obrigatória.' USING ERRCODE = '42501';
    ELSE
        v_effective_tenant_id := p_tenant_id;
    END IF;

    IF v_effective_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Identificador de loja não fornecido.');
    END IF;

    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_leads
    FROM (
        SELECT 
            l.id,
            la.id AS "assignmentId",
            l.name,
            l.phone,
            l.whatsapp,
            l.email,
            l.city_name AS city,
            l.state_uf AS state,
            l.cep,
            l.environment_summary AS environment,
            l.estimated_min AS "estimatedMin",
            l.estimated_max AS "estimatedMax",
            l.distribution_status,
            la.status,
            la.assignment_reason,
            la.assigned_at AS "createdAt",
            la.attachment_name AS "attachmentName",
            la.attachment_url AS "attachmentUrl",
            la.loss_reason AS "lossReason",
            t.id AS "assignedStoreId",
            t.name AS "assignedStoreName",
            l.is_external AS "isExternal",
            l.source,
            ord.id AS "orderId",
            ord.order_number AS "orderNumber",
            -- Ambientes da Simulação
            (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', se.id,
                    'typeId', se.environment_type_id,
                    'name', se.name,
                    'areaM2', se.area_m2,
                    'ceilingHeight', se.ceiling_height,
                    'wallCount', se.wall_count
                )), '[]'::jsonb)
                FROM simulation_environments se
                WHERE se.simulation_id = l.simulation_id
            ) AS "environmentsData",
            -- Histórico de Notas Comerciais
            (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', ln.id,
                    'author', COALESCE(ln.author_name, u.full_name, 'Consultor Comercial'),
                    'text', ln.note_text,
                    'createdAt', ln.created_at
                ) ORDER BY ln.created_at DESC), '[]'::jsonb)
                FROM lead_notes ln
                LEFT JOIN users u ON u.id = ln.author_id
                WHERE ln.assignment_id = la.id
            ) AS "notesList"
        FROM lead_assignments la
        JOIN leads l ON l.id = la.lead_id
        JOIN tenants t ON t.id = la.tenant_id
        LEFT JOIN orders ord ON ord.lead_assignment_id = la.id
        WHERE la.tenant_id = v_effective_tenant_id
        ORDER BY la.assigned_at DESC
    ) sub;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_effective_tenant_id,
        'leads', v_leads
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_store_leads(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_store_leads(UUID) TO authenticated, service_role;

-- 6. TRANSIÇÃO DE ESTÁGIO DE LEAD NO CRM COM REGISTRO DE AUDITORIA E CONCORRÊNCIA
CREATE OR REPLACE FUNCTION update_lead_stage(
    p_assignment_id UUID,
    p_new_status VARCHAR(20),
    p_loss_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_tenant_id UUID;
    v_is_admin BOOLEAN;
    v_assignment RECORD;
    v_lead RECORD;
    v_user_name TEXT;
    v_author_id UUID;
BEGIN
    v_user_tenant_id := public.current_tenant_id();
    v_is_admin := public.is_platform_admin();
    v_author_id := auth.uid();

    SELECT * INTO v_assignment 
    FROM lead_assignments 
    WHERE id = p_assignment_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Atribuição de lead não encontrada.');
    END IF;

    -- Validar isolamento tenant
    IF NOT v_is_admin AND (v_user_tenant_id IS NULL OR v_assignment.tenant_id <> v_user_tenant_id) THEN
        RAISE EXCEPTION 'Acesso negado: Este lead pertence a outro lojista.' USING ERRCODE = '42501';
    END IF;

    -- Validar status permitidos
    IF p_new_status NOT IN ('novo', 'em_atendimento', 'orcado', 'convertido', 'perdido') THEN
        RAISE EXCEPTION 'Status comercial inválido.' USING ERRCODE = '22023';
    END IF;

    -- Regra de Negócio: Para orçar ou fechar, proposta técnica deve estar anexada
    IF (p_new_status IN ('orcado', 'convertido', 'perdido')) AND (v_assignment.attachment_name IS NULL) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Anexe a proposta técnica antes de avançar para este estágio.');
    END IF;

    -- Obter nome do operador
    SELECT full_name INTO v_user_name FROM users WHERE id = v_author_id;
    IF v_user_name IS NULL THEN
        v_user_name := 'Consultor Lojista';
    END IF;

    -- Atualizar estágio
    UPDATE lead_assignments
    SET status = p_new_status,
        loss_reason = CASE WHEN p_new_status = 'perdido' THEN p_loss_reason ELSE loss_reason END,
        updated_at = now()
    WHERE id = p_assignment_id;

    -- Registrar evento no histórico de atendimento
    INSERT INTO lead_notes (
        assignment_id,
        tenant_id,
        author_id,
        author_name,
        note_text,
        created_at
    ) VALUES (
        p_assignment_id,
        v_assignment.tenant_id,
        v_author_id,
        v_user_name,
        'Estágio comercial alterado de "' || v_assignment.status || '" para "' || p_new_status || '"' ||
        CASE WHEN p_new_status = 'perdido' AND p_loss_reason IS NOT NULL THEN '. Motivo: ' || p_loss_reason ELSE '' END,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'assignment_id', p_assignment_id,
        'previous_status', v_assignment.status,
        'new_status', p_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.update_lead_stage(UUID, VARCHAR, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_lead_stage(UUID, VARCHAR, TEXT) TO authenticated, service_role;

-- 7. ADICIONAR NOTA / COMENTÁRIO COMERCIAL
CREATE OR REPLACE FUNCTION add_lead_note_entry(
    p_assignment_id UUID,
    p_note_text TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_tenant_id UUID;
    v_is_admin BOOLEAN;
    v_assignment RECORD;
    v_author_id UUID;
    v_user_name TEXT;
    v_clean_text TEXT;
    v_note_id UUID;
BEGIN
    v_user_tenant_id := public.current_tenant_id();
    v_is_admin := public.is_platform_admin();
    v_author_id := auth.uid();
    v_clean_text := trim(COALESCE(p_note_text, ''));

    IF length(v_clean_text) < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'O texto da anotação não pode ser vazio.');
    END IF;

    SELECT * INTO v_assignment FROM lead_assignments WHERE id = p_assignment_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lead não encontrado.');
    END IF;

    IF NOT v_is_admin AND (v_user_tenant_id IS NULL OR v_assignment.tenant_id <> v_user_tenant_id) THEN
        RAISE EXCEPTION 'Acesso negado: Este lead pertence a outro lojista.' USING ERRCODE = '42501';
    END IF;

    SELECT full_name INTO v_user_name FROM users WHERE id = v_author_id;
    v_user_name := COALESCE(v_user_name, 'Consultor Comercial');

    INSERT INTO lead_notes (
        assignment_id,
        tenant_id,
        author_id,
        author_name,
        note_text,
        created_at
    ) VALUES (
        p_assignment_id,
        v_assignment.tenant_id,
        v_author_id,
        v_user_name,
        v_clean_text,
        now()
    ) RETURNING id INTO v_note_id;

    RETURN jsonb_build_object(
        'success', true,
        'note_id', v_note_id,
        'author', v_user_name,
        'text', v_clean_text,
        'createdAt', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.add_lead_note_entry(UUID, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.add_lead_note_entry(UUID, TEXT) TO authenticated, service_role;

-- 8. VINCULAR ANEXO DE PROPOSTA TÉCNICA
CREATE OR REPLACE FUNCTION attach_lead_proposal(
    p_assignment_id UUID,
    p_file_name TEXT,
    p_file_url TEXT,
    p_file_size_bytes BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_tenant_id UUID;
    v_is_admin BOOLEAN;
    v_assignment RECORD;
    v_author_id UUID;
    v_user_name TEXT;
BEGIN
    v_user_tenant_id := public.current_tenant_id();
    v_is_admin := public.is_platform_admin();
    v_author_id := auth.uid();

    SELECT * INTO v_assignment FROM lead_assignments WHERE id = p_assignment_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lead não encontrado.');
    END IF;

    IF NOT v_is_admin AND (v_user_tenant_id IS NULL OR v_assignment.tenant_id <> v_user_tenant_id) THEN
        RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
    END IF;

    SELECT full_name INTO v_user_name FROM users WHERE id = v_author_id;
    v_user_name := COALESCE(v_user_name, 'Consultor Comercial');

    UPDATE lead_assignments
    SET attachment_name = p_file_name,
        attachment_url = p_file_url,
        attachment_size_bytes = p_file_size_bytes,
        attached_at = now(),
        updated_at = now()
    WHERE id = p_assignment_id;

    -- Registrar nota no histórico
    INSERT INTO lead_notes (
        assignment_id,
        tenant_id,
        author_id,
        author_name,
        note_text,
        created_at
    ) VALUES (
        p_assignment_id,
        v_assignment.tenant_id,
        v_author_id,
        v_user_name,
        'Proposta técnica anexada com sucesso: ' || p_file_name,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'assignment_id', p_assignment_id,
        'attachment_name', p_file_name,
        'attachment_url', p_file_url
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.attach_lead_proposal(UUID, TEXT, TEXT, BIGINT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.attach_lead_proposal(UUID, TEXT, TEXT, BIGINT) TO authenticated, service_role;

-- 9. CADASTRO DE LEAD EXTERNO (EXCLUSIVO PLANO PRO)
CREATE OR REPLACE FUNCTION create_external_lead(
    p_name TEXT,
    p_phone TEXT,
    p_environment TEXT,
    p_source VARCHAR(20),
    p_city TEXT DEFAULT NULL,
    p_state_uf VARCHAR(2) DEFAULT 'SP',
    p_estimated_min NUMERIC DEFAULT 15000,
    p_estimated_max NUMERIC DEFAULT 25000,
    p_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_tenant_id UUID;
    v_tenant RECORD;
    v_lead_id UUID;
    v_assignment_id UUID;
    v_clean_phone TEXT;
    v_city_ibge VARCHAR(7);
BEGIN
    v_user_tenant_id := public.current_tenant_id();

    IF v_user_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Autenticação de lojista obrigatória.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_tenant FROM tenants WHERE id = v_user_tenant_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Loja parceira não encontrada.' USING ERRCODE = 'P0002';
    END IF;

    -- Gating de Plano: Apenas Plano Pro pode cadastrar leads externos
    IF v_tenant.plan_tier <> 'pro' THEN
        RAISE EXCEPTION 'O cadastro manual de leads externos é uma funcionalidade exclusiva do Plano Pro.' USING ERRCODE = '42501';
    END IF;

    v_clean_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
    IF length(v_clean_phone) < 10 THEN
        RAISE EXCEPTION 'Telefone deve conter DDD e ao menos 10 dígitos.' USING ERRCODE = '22023';
    END IF;

    IF p_source NOT IN ('instagram', 'google', 'indicacao', 'balcao') THEN
        RAISE EXCEPTION 'Canal de origem externa inválido.' USING ERRCODE = '22023';
    END IF;

    v_city_ibge := v_tenant.city_ibge_code;

    -- Inserir Lead Externo com owner_tenant_id explícito
    INSERT INTO leads (
        name,
        phone,
        whatsapp,
        email,
        cep,
        city_ibge_code,
        city_name,
        state_uf,
        environment_summary,
        estimated_min,
        estimated_max,
        source,
        is_external,
        owner_tenant_id,
        distribution_status
    ) VALUES (
        trim(p_name),
        v_clean_phone,
        v_clean_phone,
        nullif(trim(COALESCE(p_email, '')), ''),
        '00000-000',
        v_city_ibge,
        COALESCE(nullif(trim(p_city), ''), v_tenant.city_name),
        COALESCE(nullif(trim(p_state_uf), ''), v_tenant.state_uf),
        trim(p_environment),
        p_estimated_min,
        p_estimated_max,
        p_source,
        true,
        v_user_tenant_id,
        'atribuido'
    ) RETURNING id INTO v_lead_id;

    -- Atribuir diretamente à própria loja (sem participar do round-robin e sem custo)
    INSERT INTO lead_assignments (
        lead_id,
        tenant_id,
        assignment_reason,
        status,
        assigned_at,
        updated_at
    ) VALUES (
        v_lead_id,
        v_user_tenant_id,
        'admin_manual_assignment',
        'novo',
        now(),
        now()
    ) RETURNING id INTO v_assignment_id;

    -- Atualizar contador
    UPDATE tenants
    SET leads_count_cache = leads_count_cache + 1,
        updated_at = now()
    WHERE id = v_user_tenant_id;

    RETURN jsonb_build_object(
        'success', true,
        'lead_id', v_lead_id,
        'assignment_id', v_assignment_id,
        'message', 'Lead externo cadastrado com sucesso no Plano Pro.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.create_external_lead(TEXT, TEXT, TEXT, VARCHAR, TEXT, VARCHAR, NUMERIC, NUMERIC, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_external_lead(TEXT, TEXT, TEXT, VARCHAR, TEXT, VARCHAR, NUMERIC, NUMERIC, TEXT) TO authenticated, service_role;

-- 10. PROTEÇÃO DA VISÃO ADMINISTRATIVA E PROCEDURES DO ERP
CREATE OR REPLACE FUNCTION get_admin_routing_overview()
RETURNS JSONB AS $$
DECLARE
    v_recent_leads JSONB;
    v_stores JSONB;
    v_uncovered_count INT;
    v_assigned_count INT;
    v_total_leads INT;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso restrito ao administrador da plataforma.' USING ERRCODE = '42501';
    END IF;

    -- 1. Contadores Reais
    SELECT count(*) INTO v_total_leads FROM leads;
    SELECT count(*) INTO v_assigned_count FROM leads WHERE distribution_status = 'atribuido';
    SELECT count(*) INTO v_uncovered_count FROM leads WHERE distribution_status = 'sem_cobertura';

    -- 2. Leads Recentes com detalhes de atribuição e regra geográfica
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_recent_leads
    FROM (
        SELECT 
            l.id,
            l.name,
            l.phone,
            l.city_name,
            l.state_uf,
            l.environment_summary,
            l.estimated_min,
            l.estimated_max,
            l.distribution_status,
            l.created_at,
            la.assigned_at,
            la.assignment_reason,
            t.name AS assigned_store_name,
            t.id AS assigned_store_id
        FROM leads l
        LEFT JOIN lead_assignments la ON la.lead_id = l.id
        LEFT JOIN tenants t ON t.id = la.tenant_id
        ORDER BY l.created_at DESC
        LIMIT 50
    ) sub;

    -- 3. Lojas e Status na Fila
    SELECT COALESCE(jsonb_agg(sub_store), '[]'::jsonb)
    INTO v_stores
    FROM (
        SELECT 
            t.id,
            t.name,
            t.city_name,
            t.state_uf,
            t.status,
            t.is_routing_enabled,
            t.leads_count_cache,
            t.last_assigned_at,
            t.plan_tier
        FROM tenants t
        ORDER BY t.city_name ASC, t.last_assigned_at ASC NULLS FIRST
    ) sub_store;

    RETURN jsonb_build_object(
        'success', true,
        'total_leads', v_total_leads,
        'assigned_count', v_assigned_count,
        'uncovered_count', v_uncovered_count,
        'recent_leads', v_recent_leads,
        'stores', v_stores
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_admin_routing_overview() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_admin_routing_overview() TO authenticated, service_role;

-- Hardening nas procedures do ERP
ALTER FUNCTION public.convert_lead_to_order(UUID, NUMERIC) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.convert_lead_to_order(UUID, NUMERIC) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_order(UUID, NUMERIC) TO authenticated, service_role;

ALTER FUNCTION public.advance_order_stage(UUID, VARCHAR, TEXT) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.advance_order_stage(UUID, VARCHAR, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.advance_order_stage(UUID, VARCHAR, TEXT) TO authenticated, service_role;
