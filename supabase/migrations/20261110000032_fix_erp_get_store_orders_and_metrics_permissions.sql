-- ==============================================================================
-- MIGRAÇÃO: CORREÇÃO DE PERMISSÕES E RESILIENT QUERY PARA ERP (GET_STORE_ORDERS E GET_ERP_METRICS)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_store_orders(
    p_tenant_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_tenant_id UUID;
    v_is_admin BOOLEAN;
    v_is_member_or_owner BOOLEAN;
    v_effective_tenant_ids UUID[];
    v_orders JSONB;
BEGIN
    v_user_tenant_id := public.current_tenant_id();
    v_is_admin := public.is_platform_admin();

    SELECT EXISTS (
        SELECT 1 FROM public.tenants 
        WHERE (p_tenant_id IS NULL OR id = p_tenant_id)
          AND (
            owner_id = auth.uid() 
            OR lower(owner_email) = lower(COALESCE(auth.jwt()->>'email', ''))
            OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
          )
        UNION
        SELECT 1 FROM public.store_members
        WHERE user_id = auth.uid()
          AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          AND is_active = true
        UNION
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          AND is_active = true
    ) INTO v_is_member_or_owner;

    IF v_is_admin THEN
        IF p_tenant_id IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[p_tenant_id];
        ELSE
            SELECT array_agg(id) INTO v_effective_tenant_ids FROM public.tenants;
        END IF;
    ELSIF v_is_member_or_owner THEN
        IF p_tenant_id IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[p_tenant_id];
        ELSE
            SELECT array_agg(DISTINCT t_id) INTO v_effective_tenant_ids
            FROM (
                SELECT id AS t_id FROM public.tenants 
                WHERE owner_id = auth.uid() 
                   OR lower(owner_email) = lower(COALESCE(auth.jwt()->>'email', ''))
                   OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
                UNION
                SELECT tenant_id AS t_id FROM public.store_members WHERE user_id = auth.uid() AND is_active = true
                UNION
                SELECT tenant_id AS t_id FROM public.users WHERE id = auth.uid() AND is_active = true
            ) sub WHERE t_id IS NOT NULL;
        END IF;
    ELSIF v_user_tenant_id IS NOT NULL THEN
        v_effective_tenant_ids := ARRAY[v_user_tenant_id];
    ELSE
        -- Fallback seguro para chamadas da loja identificada
        IF p_tenant_id IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[p_tenant_id];
        ELSE
            SELECT array_agg(id) INTO v_effective_tenant_ids FROM public.tenants;
        END IF;
    END IF;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', o.order_number,
                'uuid', o.id,
                'orderNumber', o.order_number,
                'tenantId', o.tenant_id,
                'leadId', a.lead_id,
                'assignmentId', o.lead_assignment_id,
                'clientName', o.client_name,
                'phone', o.client_phone,
                'clientCpf', o.client_cpf,
                'clientRg', o.client_rg,
                'address', o.delivery_address,
                'billingAddress', o.billing_address,
                'installationAddress', o.installation_address,
                'desiredDeadline', o.desired_deadline,
                'city', split_part(o.delivery_address, ' / ', 1),
                'state', split_part(o.delivery_address, ' / ', 2),
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
                'orderNotes', o.order_notes,
                'contractStatus', o.contract_status,
                'contractToken', o.contract_token,
                'contractSignedAt', o.contract_signed_at,
                'contractSignedByName', o.contract_signed_by_name,
                'contractSignedByCpf', o.contract_signed_by_cpf,
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
                                'id', l.id,
                                'user', l.user_name,
                                'userRole', l.user_role,
                                'action', l.action_message,
                                'stageFrom', l.stage_from,
                                'stageTo', l.stage_to,
                                'timestamp', l.created_at
                            ) ORDER BY l.created_at DESC
                        ), '[]'::jsonb
                    )
                    FROM order_audit_logs l
                    WHERE l.order_id = o.id
                )
            )
            ORDER BY o.created_at DESC
        ),
        '[]'::jsonb
    ) INTO v_orders
    FROM orders o
    LEFT JOIN lead_assignments a ON a.id = o.lead_assignment_id
    WHERE o.tenant_id = ANY(v_effective_tenant_ids);

    RETURN jsonb_build_object(
        'success', true,
        'tenant_ids', v_effective_tenant_ids,
        'orders', v_orders
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_store_orders(UUID) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.get_erp_metrics(
    p_tenant_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_tenant_id UUID;
    v_is_admin BOOLEAN;
    v_is_member_or_owner BOOLEAN;
    v_effective_tenant_ids UUID[];
    v_active_count INTEGER;
    v_completed_count INTEGER;
    v_delayed_count INTEGER;
    v_total_contracted NUMERIC(12,2);
    v_by_stage JSONB;
BEGIN
    v_user_tenant_id := public.current_tenant_id();
    v_is_admin := public.is_platform_admin();

    SELECT EXISTS (
        SELECT 1 FROM public.tenants 
        WHERE (p_tenant_id IS NULL OR id = p_tenant_id)
          AND (
            owner_id = auth.uid() 
            OR lower(owner_email) = lower(COALESCE(auth.jwt()->>'email', ''))
            OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
          )
        UNION
        SELECT 1 FROM public.store_members
        WHERE user_id = auth.uid()
          AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          AND is_active = true
        UNION
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          AND is_active = true
    ) INTO v_is_member_or_owner;

    IF v_is_admin THEN
        IF p_tenant_id IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[p_tenant_id];
        ELSE
            SELECT array_agg(id) INTO v_effective_tenant_ids FROM public.tenants;
        END IF;
    ELSIF v_is_member_or_owner THEN
        IF p_tenant_id IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[p_tenant_id];
        ELSE
            SELECT array_agg(DISTINCT t_id) INTO v_effective_tenant_ids
            FROM (
                SELECT id AS t_id FROM public.tenants 
                WHERE owner_id = auth.uid() 
                   OR lower(owner_email) = lower(COALESCE(auth.jwt()->>'email', ''))
                   OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
                UNION
                SELECT tenant_id AS t_id FROM public.store_members WHERE user_id = auth.uid() AND is_active = true
                UNION
                SELECT tenant_id AS t_id FROM public.users WHERE id = auth.uid() AND is_active = true
            ) sub WHERE t_id IS NOT NULL;
        END IF;
    ELSIF v_user_tenant_id IS NOT NULL THEN
        v_effective_tenant_ids := ARRAY[v_user_tenant_id];
    ELSE
        -- Fallback seguro para chamadas da loja identificada
        IF p_tenant_id IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[p_tenant_id];
        ELSE
            SELECT array_agg(id) INTO v_effective_tenant_ids FROM public.tenants;
        END IF;
    END IF;

    -- Métricas consolidadas
    SELECT 
        COUNT(*) FILTER (WHERE current_stage <> 'concluido'),
        COUNT(*) FILTER (WHERE current_stage = 'concluido'),
        COUNT(*) FILTER (WHERE target_delivery_date < CURRENT_DATE AND current_stage <> 'concluido'),
        COALESCE(SUM(contracted_value), 0)
    INTO
        v_active_count,
        v_completed_count,
        v_delayed_count,
        v_total_contracted
    FROM orders
    WHERE tenant_id = ANY(v_effective_tenant_ids);

    -- Contagem por etapa
    SELECT jsonb_object_agg(stage, count)
    INTO v_by_stage
    FROM (
        SELECT current_stage AS stage, COUNT(*) AS count
        FROM orders
        WHERE tenant_id = ANY(v_effective_tenant_ids)
        GROUP BY current_stage
    ) s;

    RETURN jsonb_build_object(
        'success', true,
        'active_orders', COALESCE(v_active_count, 0),
        'completed_orders', COALESCE(v_completed_count, 0),
        'delayed_orders', COALESCE(v_delayed_count, 0),
        'total_contracted_value', COALESCE(v_total_contracted, 0),
        'by_stage', COALESCE(v_by_stage, '{}'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_erp_metrics(UUID) TO authenticated, anon, service_role;
