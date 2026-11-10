-- ==============================================================================
-- MIGRAÇÃO: ATUALIZAR get_store_leads E update_lead_registration_data COM RG E DADOS COMPLETOS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.update_lead_registration_data(
    p_assignment_id UUID,
    p_cpf TEXT DEFAULT NULL,
    p_birth_date TEXT DEFAULT NULL,
    p_billing_address TEXT DEFAULT NULL,
    p_installation_address TEXT DEFAULT NULL,
    p_desired_deadline TEXT DEFAULT NULL,
    p_rg TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_assignment RECORD;
BEGIN
    SELECT * INTO v_assignment FROM lead_assignments WHERE id = p_assignment_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Atribuição de lead não encontrada.');
    END IF;

    IF v_assignment.tenant_id <> public.current_tenant_id() AND NOT public.is_platform_admin() AND auth.uid() IS NOT NULL THEN
        RAISE EXCEPTION 'Acesso negado: lead pertence a outra loja parceira.' USING ERRCODE = '42501';
    END IF;

    UPDATE leads
    SET 
        name = COALESCE(NULLIF(p_name, ''), name),
        phone = COALESCE(NULLIF(p_phone, ''), phone),
        whatsapp = COALESCE(NULLIF(p_phone, ''), whatsapp),
        email = COALESCE(NULLIF(p_email, ''), email),
        cpf = COALESCE(NULLIF(p_cpf, ''), cpf),
        rg = COALESCE(NULLIF(p_rg, ''), rg),
        birth_date = COALESCE(NULLIF(p_birth_date, ''), birth_date),
        billing_address = COALESCE(NULLIF(p_billing_address, ''), billing_address),
        installation_address = COALESCE(NULLIF(p_installation_address, ''), installation_address),
        desired_deadline = COALESCE(NULLIF(p_desired_deadline, ''), desired_deadline),
        updated_at = now()
    WHERE id = v_assignment.lead_id;

    -- Se já houver um pedido vinculado a esta atribuição, atualiza os dados cadastrais no pedido também!
    UPDATE orders
    SET 
        client_name = COALESCE(NULLIF(p_name, ''), client_name),
        client_phone = COALESCE(NULLIF(p_phone, ''), client_phone),
        client_cpf = COALESCE(NULLIF(p_cpf, ''), client_cpf),
        client_rg = COALESCE(NULLIF(p_rg, ''), client_rg),
        billing_address = COALESCE(NULLIF(p_billing_address, ''), billing_address),
        installation_address = COALESCE(NULLIF(p_installation_address, ''), installation_address),
        delivery_address = COALESCE(NULLIF(p_installation_address, ''), delivery_address),
        desired_deadline = COALESCE(NULLIF(p_desired_deadline, ''), desired_deadline),
        updated_at = now()
    WHERE lead_assignment_id = p_assignment_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Dados cadastrais do cliente atualizados com sucesso.'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_store_leads(p_tenant_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_tenant_id UUID;
    v_is_admin BOOLEAN;
    v_is_member_or_owner BOOLEAN;
    v_effective_tenant_ids UUID[];
    v_leads JSONB;
    v_target_uuid UUID;
BEGIN
    v_user_tenant_id := public.current_tenant_id();
    v_is_admin := public.is_platform_admin();

    IF p_tenant_id IS NOT NULL AND p_tenant_id <> 'all' AND p_tenant_id ~ '^[0-9a-fA-F-]{36}$' THEN
        v_target_uuid := p_tenant_id::UUID;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.tenants 
        WHERE (v_target_uuid IS NULL OR id = v_target_uuid)
          AND (
            owner_id = auth.uid() 
            OR id IN (SELECT tenant_id FROM public.store_members WHERE user_id = auth.uid() AND status = 'ativo')
          )
    ) INTO v_is_member_or_owner;

    IF v_is_admin THEN
        IF v_target_uuid IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[v_target_uuid];
        ELSE
            SELECT COALESCE(array_agg(id), '{}') INTO v_effective_tenant_ids FROM public.tenants;
        END IF;
    ELSE
        IF v_target_uuid IS NOT NULL THEN
            IF v_is_member_or_owner OR v_target_uuid = v_user_tenant_id THEN
                v_effective_tenant_ids := ARRAY[v_target_uuid];
            ELSE
                SELECT COALESCE(array_agg(t.id), '{}') INTO v_effective_tenant_ids
                FROM public.tenants t
                WHERE t.owner_id = auth.uid()
                   OR t.id IN (SELECT sm.tenant_id FROM public.store_members sm WHERE sm.user_id = auth.uid() AND sm.status = 'ativo');
                
                IF NOT (v_target_uuid = ANY(v_effective_tenant_ids)) THEN
                    RETURN jsonb_build_object('success', true, 'leads', '[]'::jsonb);
                END IF;
                v_effective_tenant_ids := ARRAY[v_target_uuid];
            END IF;
        ELSE
            SELECT COALESCE(array_agg(t.id), '{}') INTO v_effective_tenant_ids
            FROM public.tenants t
            WHERE t.owner_id = auth.uid()
               OR t.id IN (SELECT sm.tenant_id FROM public.store_members sm WHERE sm.user_id = auth.uid() AND sm.status = 'ativo');

            IF (v_effective_tenant_ids IS NULL OR array_length(v_effective_tenant_ids, 1) = 0) AND v_user_tenant_id IS NOT NULL THEN
                v_effective_tenant_ids := ARRAY[v_user_tenant_id];
            END IF;
        END IF;
    END IF;

    IF auth.uid() IS NULL THEN
        IF v_target_uuid IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[v_target_uuid];
        ELSE
            RETURN jsonb_build_object('success', true, 'leads', '[]'::jsonb);
        END IF;
    END IF;

    IF v_effective_tenant_ids IS NULL OR array_length(v_effective_tenant_ids, 1) = 0 THEN
        RETURN jsonb_build_object('success', true, 'leads', '[]'::jsonb);
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
            l.cpf,
            l.rg,
            l.birth_date AS "birthDate",
            l.billing_address AS "billingAddress",
            l.installation_address AS "installationAddress",
            l.desired_deadline AS "desiredDeadline",
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
            COALESCE(la.conventional_items, '[]'::jsonb) AS "conventionalItems",
            la.commercial_proposal AS "commercialProposal",
            t.id AS "assignedStoreId",
            t.name AS "assignedStoreName",
            l.is_external AS "isExternal",
            l.source,
            ord.id AS "orderId",
            ord.order_number AS "orderNumber",
            ord.contract_status AS "contractStatus",
            ord.contract_token AS "contractToken",
            ord.contract_signed_at AS "contractSignedAt",
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
            ) AS "notesList",
            COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', d.id,
                    'stage', d.stage,
                    'docType', d.doc_type,
                    'fileName', d.file_name,
                    'filePath', d.file_path,
                    'fileSizeBytes', d.file_size_bytes,
                    'mimeType', d.mime_type,
                    'authorName', d.author_name,
                    'createdAt', d.created_at
                ) ORDER BY d.created_at DESC)
                FROM order_documents d
                WHERE d.order_id = ord.id
            ), '[]'::jsonb) AS "orderDocuments"
        FROM lead_assignments la
        JOIN leads l ON l.id = la.lead_id
        JOIN tenants t ON t.id = la.tenant_id
        LEFT JOIN orders ord ON ord.lead_assignment_id = la.id
        WHERE la.tenant_id = ANY(v_effective_tenant_ids)
        ORDER BY la.assigned_at DESC
    ) sub;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_ids', v_effective_tenant_ids,
        'leads', v_leads
    );
END;
$function$;
