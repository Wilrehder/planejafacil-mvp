-- ==============================================================================
-- ROLLBACK SCRIPT PARA MIGRATION 36
-- Restaura as versões exatas de get_store_orders e get_erp_metrics da migration 35
-- ==============================================================================

DROP FUNCTION IF EXISTS public.get_store_orders(TEXT);
DROP FUNCTION IF EXISTS public.get_erp_metrics(TEXT);

CREATE OR REPLACE FUNCTION public.get_store_orders(p_tenant_id uuid DEFAULT NULL::uuid)
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
    WHERE o.tenant_id = ANY(v_effective_tenant_ids)
      AND (o.contract_status = 'assinado' OR o.current_stage <> 'formalizacao_contratual');

    RETURN jsonb_build_object(
        'success', true,
        'orders', v_orders,
        'total', jsonb_array_length(v_orders)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'orders', '[]'::jsonb
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_store_orders(uuid) TO anon, authenticated, service_role;
