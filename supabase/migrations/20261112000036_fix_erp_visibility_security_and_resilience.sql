-- ==============================================================================
-- MIGRATION: 20261112000036_fix_erp_visibility_security_and_resilience.sql
-- DESCRIÇÃO: Estabilização crítica do ERP:
--            1. Restaura visibilidade de pedidos em 'formalizacao_contratual' no ERP
--            2. Alinha get_erp_metrics com a esteira completa
--            3. Reforça isolamento multi-tenant estrito (bloqueia anon e tenant bypass)
--            4. Adiciona suporte resiliente a p_tenant_id como TEXT (UUID ou slug)
-- ==============================================================================

-- 1. DROP overload antigo se necessário para evitar conflito de tipo
DROP FUNCTION IF EXISTS public.get_store_orders(TEXT);
DROP FUNCTION IF EXISTS public.get_erp_metrics(TEXT);

-- 2. Procedure de consulta de pedidos com visibilidade completa e segurança multi-tenant
CREATE OR REPLACE FUNCTION public.get_store_orders(
    p_tenant_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_target_uuid UUID := NULL;
    v_user_tenant_id UUID;
    v_is_admin BOOLEAN := false;
    v_user_id UUID;
    v_user_email TEXT;
    v_effective_tenant_ids UUID[] := '{}';
    v_orders JSONB := '[]'::jsonb;
BEGIN
    v_user_id := auth.uid();
    v_user_email := lower(COALESCE(auth.jwt()->>'email', ''));
    v_user_tenant_id := public.current_tenant_id();
    v_is_admin := public.is_platform_admin();

    -- A. Converter p_tenant_id para UUID se fornecido
    IF p_tenant_id IS NOT NULL AND trim(p_tenant_id) <> '' AND trim(p_tenant_id) <> 'all' THEN
        IF p_tenant_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            v_target_uuid := p_tenant_id::uuid;
        ELSE
            -- Tentativa de lookup por slug/email/nome se for chave amigável
            SELECT id INTO v_target_uuid FROM public.tenants 
            WHERE lower(name) = lower(p_tenant_id) 
               OR lower(email) = lower(p_tenant_id)
            LIMIT 1;
        END IF;
    END IF;

    -- B. Proteção contra chamadas anônimas desautorizadas
    IF v_user_id IS NULL AND NOT v_is_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Acesso não autorizado: autenticação obrigatória para acessar o ERP.',
            'code', 'UNAUTHORIZED',
            'orders', '[]'::jsonb,
            'total', 0
        );
    END IF;

    -- C. Determinar lista de tenants autorizados para a sessão
    IF v_is_admin THEN
        IF v_target_uuid IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[v_target_uuid];
        ELSE
            SELECT array_agg(id) INTO v_effective_tenant_ids FROM public.tenants;
        END IF;
    ELSE
        -- Coletar todos os tenants aos quais o usuário logado tem vínculo legítimo
        SELECT array_agg(DISTINCT t_id) INTO v_effective_tenant_ids
        FROM (
            SELECT id AS t_id FROM public.tenants 
            WHERE owner_id = v_user_id 
               OR (v_user_email <> '' AND (lower(owner_email) = v_user_email OR lower(email) = v_user_email))
            UNION
            SELECT tenant_id AS t_id FROM public.store_members 
            WHERE user_id = v_user_id AND is_active = true
            UNION
            SELECT tenant_id AS t_id FROM public.users 
            WHERE id = v_user_id AND is_active = true
            UNION
            SELECT v_user_tenant_id AS t_id WHERE v_user_tenant_id IS NOT NULL
        ) sub 
        WHERE t_id IS NOT NULL;

        -- Se não possui vínculo com nenhuma loja, acesso negado (não expor dados!)
        IF v_effective_tenant_ids IS NULL OR array_length(v_effective_tenant_ids, 1) IS NULL OR array_length(v_effective_tenant_ids, 1) = 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Acesso negado: o usuário não está vinculado a uma loja autorizada.',
                'code', 'FORBIDDEN',
                'orders', '[]'::jsonb,
                'total', 0
            );
        END IF;

        -- Se o operador especificou um tenant alvo, validar se ele tem direito a esse tenant
        IF v_target_uuid IS NOT NULL THEN
            IF v_target_uuid = ANY(v_effective_tenant_ids) THEN
                v_effective_tenant_ids := ARRAY[v_target_uuid];
            ELSE
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Acesso negado: a loja solicitada não pertence à sua conta.',
                    'code', 'FORBIDDEN',
                    'orders', '[]'::jsonb,
                    'total', 0
                );
            END IF;
        END IF;
    END IF;

    -- D. Consulta dos pedidos (Mantendo split em 2 jsonb_build_object para evitar erro 54023)
    --    IMPORTANTE: Todos os pedidos pertencentes aos tenants autorizados são retornados,
    --    incluindo pedidos na etapa 'formalizacao_contratual' aguardando assinatura.
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', o.order_number,
                'uuid', o.id,
                'orderNumber', o.order_number,
                'tenantId', o.tenant_id,
                'storeId', o.tenant_id,
                'leadId', a.lead_id,
                'assignmentId', o.lead_assignment_id,
                'clientName', o.client_name,
                'phone', COALESCE(NULLIF(trim(o.client_phone), ''), l.whatsapp, l.phone),
                'clientEmail', COALESCE(NULLIF(trim(o.client_email), ''), l.email),
                'clientCpf', COALESCE(NULLIF(trim(o.client_cpf), ''), l.cpf),
                'clientRg', COALESCE(NULLIF(trim(o.client_rg), ''), l.rg),
                'clientCep', COALESCE(NULLIF(trim(o.client_cep), ''), l.cep),
                'sellerName', COALESCE(NULLIF(trim(o.seller_name), ''), 'Consultor Comercial'),
                'address', o.delivery_address,
                'billingAddress', COALESCE(NULLIF(trim(o.billing_address), ''), l.billing_address),
                'installationAddress', COALESCE(NULLIF(trim(o.installation_address), ''), l.installation_address, o.billing_address),
                'desiredDeadline', COALESCE(NULLIF(trim(o.desired_deadline), ''), l.desired_deadline),
                'city', COALESCE(NULLIF(trim(o.client_city), ''), l.city_name, split_part(o.delivery_address, ' / ', 1)),
                'state', COALESCE(NULLIF(trim(o.client_state), ''), l.state_uf, split_part(o.delivery_address, ' / ', 2)),
                'environment', o.environment_description,
                'totalValue', o.total_value,
                'contractedValue', COALESCE(o.contracted_value, o.total_value),
                'estimatedBudget', COALESCE(o.estimated_budget, o.total_value),
                'targetDeliveryDate', o.target_delivery_date,
                'completedAt', o.completed_at,
                'currentStage', o.current_stage,
                'stageNotes', o.stage_notes,
                'hasPendingIssues', o.has_pending_issues,
                'pendingNotes', o.pending_notes,
                'medicaoDone', o.medicao_done,
                'projectApproved', o.project_approved,
                'producaoDone', o.producao_done,
                'montagemDone', o.montagem_done,
                'clientConfirmedAceite', o.client_confirmed_aceite,
                'paymentAllocations', o.payment_allocations,
                'commercialProposal', o.commercial_proposal,
                'orderNotes', o.order_notes
            ) ||
            jsonb_build_object(
                'contractStatus', o.contract_status,
                'contractToken', o.contract_token,
                'contractVersion', COALESCE(o.contract_version, 1),
                'contractSnapshot', o.contract_snapshot,
                'contractSignedAt', o.contract_signed_at,
                'contractSignedByName', o.contract_signed_by_name,
                'contractSignedByCpf', o.contract_signed_by_cpf,
                'contractSignatureIp', o.contract_signature_ip,
                'contractSignatureImage', o.contract_signature_image,
                'contractPdfUrl', o.contract_pdf_url,
                'createdAt', o.created_at,
                'updatedAt', o.updated_at,
                'documents', (
                    SELECT COALESCE(
                        jsonb_agg(
                            jsonb_build_object(
                                'id', d.id,
                                'stage', d.stage,
                                'docType', d.doc_type,
                                'fileName', d.file_name,
                                'filePath', d.file_path,
                                'fileSizeBytes', d.file_size_bytes,
                                'mimeType', d.mime_type,
                                'authorName', d.author_name,
                                'createdAt', d.created_at
                            ) ORDER BY d.created_at DESC
                        ), '[]'::jsonb
                    )
                    FROM order_documents d
                    WHERE d.order_id = o.id
                ),
                'timeline', (
                    SELECT COALESCE(
                        jsonb_agg(
                            jsonb_build_object(
                                'id', t.id,
                                'user', t.user_name,
                                'userRole', t.user_role,
                                'action', t.action_message,
                                'timestamp', t.created_at
                            ) ORDER BY t.created_at ASC
                        ), '[]'::jsonb
                    )
                    FROM order_audit_logs t
                    WHERE t.order_id = o.id
                )
            )
            ORDER BY o.created_at DESC
        ),
        '[]'::jsonb
    ) INTO v_orders
    FROM orders o
    LEFT JOIN leads l ON l.id = o.lead_assignment_id OR l.id = (SELECT lead_id FROM lead_assignments WHERE id = o.lead_assignment_id)
    LEFT JOIN lead_assignments a ON a.id = o.lead_assignment_id
    WHERE o.tenant_id = ANY(v_effective_tenant_ids);

    RETURN jsonb_build_object(
        'success', true,
        'orders', v_orders,
        'total', jsonb_array_length(v_orders),
        'tenant_ids', v_effective_tenant_ids
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'DATABASE_ERROR',
        'orders', '[]'::jsonb,
        'total', 0
    );
END;
$function$;

-- Overload de compatibilidade para chamadas legadas com UUID direto
CREATE OR REPLACE FUNCTION public.get_store_orders(p_tenant_id uuid)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
    SELECT public.get_store_orders(p_tenant_id::text);
$$;

GRANT EXECUTE ON FUNCTION public.get_store_orders(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_store_orders(UUID) TO authenticated, service_role;


-- 3. Atualizar get_erp_metrics para consistência total com todos os pedidos da esteira
CREATE OR REPLACE FUNCTION public.get_erp_metrics(
    p_tenant_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_target_uuid UUID := NULL;
    v_user_tenant_id UUID;
    v_is_admin BOOLEAN := false;
    v_user_id UUID;
    v_user_email TEXT;
    v_effective_tenant_ids UUID[] := '{}';
    v_active_count INTEGER := 0;
    v_completed_count INTEGER := 0;
    v_delayed_count INTEGER := 0;
    v_total_contracted NUMERIC(12,2) := 0.00;
    v_by_stage JSONB := '{}'::jsonb;
BEGIN
    v_user_id := auth.uid();
    v_user_email := lower(COALESCE(auth.jwt()->>'email', ''));
    v_user_tenant_id := public.current_tenant_id();
    v_is_admin := public.is_platform_admin();

    IF p_tenant_id IS NOT NULL AND trim(p_tenant_id) <> '' AND trim(p_tenant_id) <> 'all' THEN
        IF p_tenant_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            v_target_uuid := p_tenant_id::uuid;
        ELSE
            SELECT id INTO v_target_uuid FROM public.tenants 
            WHERE lower(name) = lower(p_tenant_id) 
               OR lower(email) = lower(p_tenant_id)
            LIMIT 1;
        END IF;
    END IF;

    IF v_user_id IS NULL AND NOT v_is_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Acesso não autorizado.',
            'code', 'UNAUTHORIZED',
            'active_orders', 0,
            'completed_orders', 0,
            'delayed_orders', 0,
            'total_contracted_value', 0.00,
            'by_stage', '{}'::jsonb
        );
    END IF;

    IF v_is_admin THEN
        IF v_target_uuid IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[v_target_uuid];
        ELSE
            SELECT array_agg(id) INTO v_effective_tenant_ids FROM public.tenants;
        END IF;
    ELSE
        SELECT array_agg(DISTINCT t_id) INTO v_effective_tenant_ids
        FROM (
            SELECT id AS t_id FROM public.tenants 
            WHERE owner_id = v_user_id 
               OR (v_user_email <> '' AND (lower(owner_email) = v_user_email OR lower(email) = v_user_email))
            UNION
            SELECT tenant_id AS t_id FROM public.store_members 
            WHERE user_id = v_user_id AND is_active = true
            UNION
            SELECT tenant_id AS t_id FROM public.users 
            WHERE id = v_user_id AND is_active = true
            UNION
            SELECT v_user_tenant_id AS t_id WHERE v_user_tenant_id IS NOT NULL
        ) sub 
        WHERE t_id IS NOT NULL;

        IF v_effective_tenant_ids IS NULL OR array_length(v_effective_tenant_ids, 1) IS NULL OR array_length(v_effective_tenant_ids, 1) = 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Acesso negado: loja não vinculada.',
                'code', 'FORBIDDEN',
                'active_orders', 0,
                'completed_orders', 0,
                'delayed_orders', 0,
                'total_contracted_value', 0.00,
                'by_stage', '{}'::jsonb
            );
        END IF;

        IF v_target_uuid IS NOT NULL THEN
            IF v_target_uuid = ANY(v_effective_tenant_ids) THEN
                v_effective_tenant_ids := ARRAY[v_target_uuid];
            ELSE
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Acesso negado à loja solicitada.',
                    'code', 'FORBIDDEN',
                    'active_orders', 0,
                    'completed_orders', 0,
                    'delayed_orders', 0,
                    'total_contracted_value', 0.00,
                    'by_stage', '{}'::jsonb
                );
            END IF;
        END IF;
    END IF;

    -- Métricas consolidadas considerando todos os pedidos ativos do tenant
    SELECT 
        COUNT(*) FILTER (WHERE current_stage <> 'concluido'),
        COUNT(*) FILTER (WHERE current_stage = 'concluido'),
        COUNT(*) FILTER (WHERE target_delivery_date < CURRENT_DATE AND current_stage <> 'concluido'),
        COALESCE(SUM(contracted_value), 0.00)
    INTO
        v_active_count,
        v_completed_count,
        v_delayed_count,
        v_total_contracted
    FROM public.orders
    WHERE tenant_id = ANY(v_effective_tenant_ids);

    -- Distribuição por etapas operacionais
    SELECT jsonb_object_agg(stage, count)
    INTO v_by_stage
    FROM (
        SELECT current_stage as stage, count(*) as count
        FROM public.orders
        WHERE tenant_id = ANY(v_effective_tenant_ids)
        GROUP BY current_stage
    ) s;

    RETURN jsonb_build_object(
        'success', true,
        'active_orders', COALESCE(v_active_count, 0),
        'completed_orders', COALESCE(v_completed_count, 0),
        'delayed_orders', COALESCE(v_delayed_count, 0),
        'total_contracted_value', COALESCE(v_total_contracted, 0.00),
        'by_stage', COALESCE(v_by_stage, '{}'::jsonb)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'DATABASE_ERROR',
        'active_orders', 0,
        'completed_orders', 0,
        'delayed_orders', 0,
        'total_contracted_value', 0.00,
        'by_stage', '{}'::jsonb
    );
END;
$$;

-- Overload de compatibilidade para chamadas legadas com UUID direto
CREATE OR REPLACE FUNCTION public.get_erp_metrics(p_tenant_id uuid)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
    SELECT public.get_erp_metrics(p_tenant_id::text);
$$;

GRANT EXECUTE ON FUNCTION public.get_erp_metrics(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_erp_metrics(UUID) TO authenticated, service_role;

