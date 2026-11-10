-- =============================================================================
-- MIGRATION: 20261110000035_erp_intake_and_signed_contract_archive.sql
-- DESCRIÇÃO: Correção do Fluxo de Entrada no ERP e Arquivamento Automático do
--            Contrato Assinado na Pasta Digital do Pedido
-- =============================================================================

-- 1. Tornar uploaded_by nullable em order_documents para permitir persistência automática via sistema/assinatura digital
ALTER TABLE public.order_documents ALTER COLUMN uploaded_by DROP NOT NULL;

-- 2. Procedure RPC transacional para arquivar contrato assinado na Pasta Digital
CREATE OR REPLACE FUNCTION public.archive_order_signed_contract(
    p_order_id UUID,
    p_file_path TEXT,
    p_file_name TEXT,
    p_file_size_bytes BIGINT DEFAULT 0,
    p_mime_type TEXT DEFAULT 'application/pdf',
    p_author_name TEXT DEFAULT 'Sistema Planeja Fácil'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_order RECORD;
    v_doc_id UUID;
    v_existing_doc RECORD;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
    END IF;

    -- Verificar se já existe documento de contrato para este pedido
    SELECT * INTO v_existing_doc 
    FROM public.order_documents 
    WHERE order_id = p_order_id AND stage = 'contrato' 
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.order_documents
        SET file_path = p_file_path,
            file_name = p_file_name,
            file_size_bytes = COALESCE(NULLIF(p_file_size_bytes, 0), file_size_bytes, 1024),
            mime_type = COALESCE(p_mime_type, mime_type),
            author_name = COALESCE(p_author_name, author_name),
            created_at = now()
        WHERE id = v_existing_doc.id
        RETURNING id INTO v_doc_id;
    ELSE
        INSERT INTO public.order_documents (
            order_id,
            tenant_id,
            stage,
            doc_type,
            file_path,
            file_name,
            file_size_bytes,
            mime_type,
            uploaded_by,
            author_name,
            created_at
        ) VALUES (
            p_order_id,
            v_order.tenant_id,
            'contrato',
            'contrato_assinado',
            p_file_path,
            p_file_name,
            COALESCE(NULLIF(p_file_size_bytes, 0), 1024),
            COALESCE(p_mime_type, 'application/pdf'),
            auth.uid(),
            COALESCE(p_author_name, 'Sistema Planeja Fácil'),
            now()
        ) RETURNING id INTO v_doc_id;
    END IF;

    -- Atualizar caminho do contrato definitivo na tabela orders
    UPDATE public.orders
    SET contract_pdf_url = p_file_path,
        updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'document_id', v_doc_id,
        'order_id', p_order_id,
        'file_name', p_file_name,
        'file_path', p_file_path
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_order_signed_contract(UUID, TEXT, TEXT, BIGINT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 3. Atualizar submit_contract_signature para retornar tenant_id e signature_id
CREATE OR REPLACE FUNCTION public.submit_contract_signature(
    p_token TEXT,
    p_signer_name TEXT,
    p_signer_cpf TEXT,
    p_signer_ip TEXT DEFAULT 'Dispositivo Web',
    p_signer_user_agent TEXT DEFAULT 'Web',
    p_signature_image TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_order RECORD;
    v_now TIMESTAMPTZ := now();
    v_advanced BOOLEAN := false;
    v_lead_id_str TEXT;
    v_asgn_id UUID;
    v_snapshot JSONB;
    v_sig_id UUID;
BEGIN
    IF p_token IS NULL OR trim(p_token) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token de contrato não fornecido.');
    END IF;

    IF p_signer_name IS NULL OR trim(p_signer_name) = '' OR p_signer_cpf IS NULL OR trim(p_signer_cpf) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nome completo e CPF do signatário são obrigatórios.');
    END IF;

    SELECT * INTO v_order 
    FROM orders 
    WHERE contract_token = p_token 
    FOR UPDATE;

    IF NOT FOUND AND (p_token LIKE 'ctk_ord_%' OR p_token LIKE 'ctk_%') THEN
        v_lead_id_str := replace(p_token, 'ctk_ord_', '');
        v_lead_id_str := replace(v_lead_id_str, 'ctk_', '');
        IF v_lead_id_str ~ '^[0-9a-fA-F-]{36}$' THEN
            SELECT id INTO v_asgn_id FROM lead_assignments WHERE lead_id = v_lead_id_str::UUID LIMIT 1;
            IF v_asgn_id IS NOT NULL THEN
                SELECT * INTO v_order FROM orders WHERE lead_assignment_id = v_asgn_id LIMIT 1 FOR UPDATE;
            END IF;
        END IF;
    END IF;

    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Contrato não localizado para o token fornecido.');
    END IF;

    IF v_order.contract_status = 'assinado' THEN
        SELECT id INTO v_sig_id FROM contract_signatures WHERE order_id = v_order.id ORDER BY signed_at DESC LIMIT 1;
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Contrato já se encontra assinado.',
            'order_id', v_order.id,
            'tenant_id', v_order.tenant_id,
            'order_number', v_order.order_number,
            'current_stage', v_order.current_stage,
            'contract_version', COALESCE(v_order.contract_version, 1),
            'signature_id', v_sig_id,
            'signed_at', v_order.contract_signed_at
        );
    END IF;

    -- Garantir snapshot definitivo antes de congelar a assinatura
    v_snapshot := COALESCE(v_order.contract_snapshot, public.build_order_contract_snapshot(v_order.id));

    -- Validar que o contrato possui cláusulas carregadas antes de aceitar assinatura
    IF v_snapshot->'clauses' IS NULL OR jsonb_array_length(v_snapshot->'clauses') = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não é possível assinar um contrato sem cláusulas contratuais carregadas.');
    END IF;

    -- Registrar na tabela de auditoria forense de assinaturas com snapshot congelado
    INSERT INTO contract_signatures (
        order_id,
        token,
        signer_name,
        signer_cpf,
        signer_ip,
        signer_user_agent,
        signature_image,
        contract_version,
        contract_snapshot,
        signed_at
    ) VALUES (
        v_order.id,
        p_token,
        trim(p_signer_name),
        trim(p_signer_cpf),
        COALESCE(p_signer_ip, 'Dispositivo Web'),
        COALESCE(p_signer_user_agent, 'Web'),
        p_signature_image,
        COALESCE(v_order.contract_version, 1),
        v_snapshot,
        v_now
    ) RETURNING id INTO v_sig_id;

    -- Se o pedido estiver em formalizacao_contratual, avança automaticamente para medicao
    IF v_order.current_stage = 'formalizacao_contratual' THEN
        v_advanced := true;
        UPDATE orders
        SET contract_status = 'assinado',
            contract_signed_at = v_now,
            contract_signed_by_name = trim(p_signer_name),
            contract_signed_by_cpf = trim(p_signer_cpf),
            contract_signature_ip = COALESCE(p_signer_ip, 'Dispositivo Web'),
            contract_signature_image = p_signature_image,
            contract_snapshot = v_snapshot,
            current_stage = 'medicao',
            updated_at = v_now
        WHERE id = v_order.id;

        INSERT INTO order_audit_logs (
            order_id,
            tenant_id,
            user_id,
            user_name,
            user_role,
            action_message,
            stage_from,
            stage_to,
            created_at
        ) VALUES (
            v_order.id,
            v_order.tenant_id,
            NULL,
            trim(p_signer_name),
            'cliente_signatario',
            'Contrato v' || COALESCE(v_order.contract_version, 1) || ' assinado eletronicamente por ' || trim(p_signer_name) || ' (CPF: ' || trim(p_signer_cpf) || '). Pedido liberado e avançado automaticamente para Medição Fina.',
            'formalizacao_contratual',
            'medicao',
            v_now
        );
    ELSE
        UPDATE orders
        SET contract_status = 'assinado',
            contract_signed_at = v_now,
            contract_signed_by_name = trim(p_signer_name),
            contract_signed_by_cpf = trim(p_signer_cpf),
            contract_signature_ip = COALESCE(p_signer_ip, 'Dispositivo Web'),
            contract_signature_image = p_signature_image,
            contract_snapshot = v_snapshot,
            updated_at = v_now
        WHERE id = v_order.id;

        INSERT INTO order_audit_logs (
            order_id,
            tenant_id,
            user_id,
            user_name,
            user_role,
            action_message,
            stage_from,
            stage_to,
            created_at
        ) VALUES (
            v_order.id,
            v_order.tenant_id,
            NULL,
            trim(p_signer_name),
            'cliente_signatario',
            'Contrato v' || COALESCE(v_order.contract_version, 1) || ' assinado eletronicamente por ' || trim(p_signer_name) || ' (CPF: ' || trim(p_signer_cpf) || ').',
            v_order.current_stage,
            v_order.current_stage,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'tenant_id', v_order.tenant_id,
        'order_number', v_order.order_number,
        'current_stage', CASE WHEN v_advanced THEN 'medicao' ELSE v_order.current_stage END,
        'contract_status', 'assinado',
        'contract_version', COALESCE(v_order.contract_version, 1),
        'signature_id', v_sig_id,
        'signed_at', v_now,
        'signer_name', trim(p_signer_name),
        'signer_cpf', trim(p_signer_cpf)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_contract_signature(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 4. Atualizar get_store_orders: Somente pedidos formalizados (ou além de formalizacao) aparecem no ERP
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

-- 5. Atualizar get_erp_metrics: Coerência total com os pedidos formalizados
CREATE OR REPLACE FUNCTION public.get_erp_metrics(p_tenant_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
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
        IF p_tenant_id IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[p_tenant_id];
        ELSE
            SELECT array_agg(id) INTO v_effective_tenant_ids FROM public.tenants;
        END IF;
    END IF;

    -- Métricas consolidadas considerando pedidos formalizados
    SELECT 
        COUNT(*) FILTER (WHERE current_stage <> 'concluido' AND (contract_status = 'assinado' OR current_stage <> 'formalizacao_contratual')),
        COUNT(*) FILTER (WHERE current_stage = 'concluido'),
        COUNT(*) FILTER (WHERE target_delivery_date < CURRENT_DATE AND current_stage <> 'concluido' AND (contract_status = 'assinado' OR current_stage <> 'formalizacao_contratual')),
        COALESCE(SUM(contracted_value) FILTER (WHERE contract_status = 'assinado' OR current_stage <> 'formalizacao_contratual'), 0)
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
          AND (contract_status = 'assinado' OR current_stage <> 'formalizacao_contratual')
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
        'active_orders', 0,
        'completed_orders', 0,
        'delayed_orders', 0,
        'total_contracted_value', 0.00,
        'by_stage', '{}'::jsonb
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_erp_metrics(UUID) TO anon, authenticated, service_role;

-- 6. Política de Storage para permitir upload seguro do contrato assinado no bucket order-documents
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
          AND schemaname = 'storage' 
          AND policyname = 'allow_signed_contract_uploads'
    ) THEN
        CREATE POLICY "allow_signed_contract_uploads" ON storage.objects
        FOR ALL TO anon, authenticated
        USING (
            bucket_id = 'order-documents'
            AND (name LIKE '%contrato%' OR name LIKE '%.pdf')
        )
        WITH CHECK (
            bucket_id = 'order-documents'
            AND (name LIKE '%contrato%' OR name LIKE '%.pdf')
        );
    END IF;
END $$;
