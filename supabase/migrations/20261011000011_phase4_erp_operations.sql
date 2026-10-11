-- =============================================================================
-- MIGRATION: 20261011000011_phase4_erp_operations.sql
-- DESCRIÇÃO: Fase 4 - ERP Operacional de Ponta a Ponta:
--            Ciclo de vida do pedido (6 etapas), Pasta Digital com Supabase Storage,
--            Gating documental, Diferenciação de Orçamento vs Valor Contratado,
--            Auditoria imutável e Métricas em tempo real.
-- =============================================================================

-- 1. NOVAS COLUNAS NA TABELA ORDERS
ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS contracted_value NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS target_delivery_date DATE,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS stage_notes TEXT,
    ADD COLUMN IF NOT EXISTS has_pending_issues BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS pending_notes TEXT,
    ADD COLUMN IF NOT EXISTS medicao_done BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS project_approved BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS producao_done BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS montagem_done BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS client_confirmed_aceite BOOLEAN NOT NULL DEFAULT false;

-- Inicializar valores em registros existentes
UPDATE orders 
SET contracted_value = COALESCE(contracted_value, total_value),
    estimated_budget = COALESCE(estimated_budget, total_value),
    target_delivery_date = COALESCE(target_delivery_date, (created_at::date + INTERVAL '45 days')::date)
WHERE contracted_value IS NULL;

-- 2. NOVAS COLUNAS NA TABELA ORDER_DOCUMENTS
ALTER TABLE order_documents
    ADD COLUMN IF NOT EXISTS doc_type VARCHAR(50) DEFAULT 'documento',
    ADD COLUMN IF NOT EXISTS author_name TEXT;

-- 3. AJUSTE DE CONVERSÃO DE LEAD EM PEDIDO (INCORPORANDO CONTRATO E VALORES)
CREATE OR REPLACE FUNCTION public.convert_lead_to_order(
    p_assignment_id UUID,
    p_total_value NUMERIC DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_assignment RECORD;
    v_lead RECORD;
    v_existing_order RECORD;
    v_order_id UUID;
    v_order_number VARCHAR(20);
    v_final_value NUMERIC(10,2);
    v_estimated_budget NUMERIC(10,2);
    v_user_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
BEGIN
    v_user_id := auth.uid();
    
    -- Tenant isolation check
    SELECT * INTO v_assignment FROM lead_assignments WHERE id = p_assignment_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Atribuição de lead não encontrada.');
    END IF;

    IF v_assignment.tenant_id <> public.current_tenant_id() AND NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: lead pertence a outra loja parceira.' USING ERRCODE = '42501';
    END IF;

    -- Verificar Idempotência
    SELECT * INTO v_existing_order FROM orders WHERE lead_assignment_id = p_assignment_id;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'already_converted',
            'order_id', v_existing_order.id,
            'order_number', v_existing_order.order_number,
            'total_value', v_existing_order.total_value,
            'contracted_value', v_existing_order.contracted_value,
            'current_stage', v_existing_order.current_stage,
            'message', 'Pedido já existente recuperado com sucesso.'
        );
    END IF;

    -- Obter Lead Original
    SELECT * INTO v_lead FROM leads WHERE id = v_assignment.lead_id;
    v_estimated_budget := ROUND((v_lead.estimated_min + v_lead.estimated_max) / 2);

    IF p_total_value IS NOT NULL AND p_total_value > 0 THEN
        v_final_value := p_total_value;
    ELSE
        v_final_value := v_estimated_budget;
    END IF;

    v_user_name := COALESCE(
        (SELECT full_name FROM users WHERE id = v_user_id),
        'Operador Comercial'
    );
    v_user_role := COALESCE(
        (SELECT role FROM users WHERE id = v_user_id),
        'store_operator'
    );

    v_order_number := 'PED-' || nextval('order_number_seq')::TEXT;

    INSERT INTO orders (
        order_number,
        tenant_id,
        lead_assignment_id,
        client_name,
        client_phone,
        delivery_address,
        environment_description,
        total_value,
        contracted_value,
        estimated_budget,
        target_delivery_date,
        current_stage,
        created_at,
        updated_at
    ) VALUES (
        v_order_number,
        v_assignment.tenant_id,
        p_assignment_id,
        v_lead.name,
        v_lead.phone,
        v_lead.city_name || ' / ' || v_lead.state_uf,
        v_lead.environment_summary,
        v_final_value,
        v_final_value,
        v_estimated_budget,
        (CURRENT_DATE + INTERVAL '45 days')::date,
        'medicao',
        now(),
        now()
    )
    ON CONFLICT (lead_assignment_id) DO NOTHING
    RETURNING id INTO v_order_id;

    IF v_order_id IS NULL THEN
        SELECT id, order_number, total_value, contracted_value, current_stage INTO v_existing_order 
        FROM orders WHERE lead_assignment_id = p_assignment_id;
        RETURN jsonb_build_object(
            'success', true,
            'status', 'already_converted',
            'order_id', v_existing_order.id,
            'order_number', v_existing_order.order_number,
            'total_value', v_existing_order.total_value,
            'contracted_value', v_existing_order.contracted_value,
            'current_stage', v_existing_order.current_stage,
            'message', 'Pedido existente recuperado com sucesso após concorrência resolvida.'
        );
    END IF;

    -- Atualizar status do lead
    UPDATE lead_assignments
    SET status = 'convertido',
        updated_at = now()
    WHERE id = p_assignment_id;

    -- Se existia proposta comercial anexada ao lead, vincular automaticamente como Contrato da Pasta Digital
    IF v_assignment.attachment_url IS NOT NULL THEN
        INSERT INTO order_documents (
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
            v_order_id,
            v_assignment.tenant_id,
            'contrato',
            'contrato',
            v_assignment.attachment_url,
            COALESCE(v_assignment.attachment_name, 'proposta_comercial_assinada.pdf'),
            COALESCE(v_assignment.attachment_size_bytes, 1024),
            'application/pdf',
            v_user_id,
            v_user_name,
            now()
        );
    END IF;

    -- Registro na Linha do Tempo de Auditoria
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
        v_order_id,
        v_assignment.tenant_id,
        v_user_id,
        v_user_name,
        'Comercial / CRM',
        'Venda Fechada no CRM! Pedido gerado com valor contratado de R$ ' || to_char(v_final_value, 'FM999G999D00') || ' e encaminhado para Medição Técnica.',
        NULL,
        'medicao',
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'converted',
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_value', v_final_value,
        'contracted_value', v_final_value,
        'estimated_budget', v_estimated_budget
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. CONSULTA ISOLADA DE PEDIDOS DO ERP (GET_STORE_ORDERS)
CREATE OR REPLACE FUNCTION public.get_store_orders(
    p_tenant_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_effective_tenant_id UUID;
    v_is_admin BOOLEAN;
    v_orders JSONB;
BEGIN
    v_is_admin := public.is_platform_admin();
    
    IF v_is_admin AND p_tenant_id IS NOT NULL THEN
        v_effective_tenant_id := p_tenant_id;
    ELSE
        v_effective_tenant_id := public.current_tenant_id();
    END IF;

    IF v_effective_tenant_id IS NULL AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Acesso não autorizado: sessão não vinculada a uma loja.' USING ERRCODE = '42501';
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
                'address', o.delivery_address,
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
    WHERE (v_is_admin AND p_tenant_id IS NULL) OR o.tenant_id = v_effective_tenant_id;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_effective_tenant_id,
        'orders', v_orders
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 5. ANEXO DE DOCUMENTOS NA PASTA DIGITAL (ATTACH_ORDER_DOCUMENT)
CREATE OR REPLACE FUNCTION public.attach_order_document(
    p_order_id UUID,
    p_stage VARCHAR(30),
    p_doc_type VARCHAR(50),
    p_file_name TEXT,
    p_file_path TEXT,
    p_file_size_bytes BIGINT,
    p_mime_type TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_user_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
    v_doc_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
    END IF;

    -- Multi-tenant verification
    IF v_order.tenant_id <> public.current_tenant_id() AND NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: pedido pertence a outra loja parceira.' USING ERRCODE = '42501';
    END IF;

    -- Validação de tipo de arquivo
    IF p_mime_type NOT IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') THEN
        RAISE EXCEPTION 'Formato de arquivo não permitido. Apenas PDF, JPG, PNG e WEBP são aceitos.' USING ERRCODE = '22023';
    END IF;

    -- Validação de tamanho (máximo 15MB)
    IF p_file_size_bytes > 15728640 THEN
        RAISE EXCEPTION 'Arquivo excede o tamanho máximo permitido de 15MB.' USING ERRCODE = '22023';
    END IF;

    v_user_name := COALESCE(
        (SELECT full_name FROM users WHERE id = v_user_id),
        'Operador ERP'
    );
    v_user_role := COALESCE(
        (SELECT role FROM users WHERE id = v_user_id),
        'store_operator'
    );

    -- Inserir documento
    INSERT INTO order_documents (
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
        p_stage,
        COALESCE(p_doc_type, 'documento'),
        p_file_path,
        p_file_name,
        p_file_size_bytes,
        p_mime_type,
        v_user_id,
        v_user_name,
        now()
    ) RETURNING id INTO v_doc_id;

    -- Atualizar flags de etapa no pedido
    IF p_stage = 'medicao' THEN
        UPDATE orders SET medicao_done = true, updated_at = now() WHERE id = p_order_id;
    ELSIF p_stage = 'projeto' THEN
        UPDATE orders SET project_approved = true, updated_at = now() WHERE id = p_order_id;
    ELSIF p_stage = 'producao' THEN
        UPDATE orders SET producao_done = true, updated_at = now() WHERE id = p_order_id;
    ELSIF p_stage = 'montagem' THEN
        UPDATE orders SET montagem_done = true, updated_at = now() WHERE id = p_order_id;
    ELSIF p_stage = 'aceite' THEN
        UPDATE orders SET client_confirmed_aceite = true, updated_at = now() WHERE id = p_order_id;
    END IF;

    -- Registrar log de auditoria
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
        p_order_id,
        v_order.tenant_id,
        v_user_id,
        v_user_name,
        v_user_role,
        'Documento anexado na Pasta Digital (' || p_stage || '): ' || p_file_name,
        v_order.current_stage,
        v_order.current_stage,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'document_id', v_doc_id,
        'file_name', p_file_name,
        'file_path', p_file_path,
        'stage', p_stage
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6. AVANÇO SEGURO DE ETAPA COM GATING RIGOROSO (ADVANCE_ORDER_STAGE)
CREATE OR REPLACE FUNCTION public.advance_order_stage(
    p_order_id UUID,
    p_target_stage VARCHAR(30),
    p_action_message TEXT DEFAULT NULL,
    p_stage_notes TEXT DEFAULT NULL,
    p_stage_confirmation BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_doc_count INTEGER;
    v_user_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
    v_stage_order TEXT[] := ARRAY['medicao', 'projeto_aprovacao', 'producao', 'montagem', 'entrega_aceite', 'concluido'];
    v_current_idx INTEGER;
    v_target_idx INTEGER;
BEGIN
    v_user_id := auth.uid();
    
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
    END IF;

    -- Isolamento Multi-tenant estrito
    IF v_order.tenant_id <> public.current_tenant_id() AND NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: pedido pertence a outra loja parceira.' USING ERRCODE = '42501';
    END IF;

    -- Validação de ordem das etapas
    v_current_idx := array_position(v_stage_order, v_order.current_stage);
    v_target_idx := array_position(v_stage_order, p_target_stage);

    IF v_current_idx IS NULL OR v_target_idx IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Etapa inválida no fluxo do ERP.');
    END IF;

    -- Bloqueio de salto de etapas (deve ser estritamente sequencial +1)
    IF v_target_idx <> v_current_idx + 1 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Avanço inválido: a transição de etapas deve ser estritamente sequencial (etapa atual: ' || v_order.current_stage || ' -> pretendida: ' || p_target_stage || ').'
        );
    END IF;

    -- VALIDAÇÕES DE GATING POR ETAPA
    -- 1 -> 2: Medição para Projeto & Aprovação
    IF v_order.current_stage = 'medicao' AND p_target_stage = 'projeto_aprovacao' THEN
        SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'medicao';
        IF v_doc_count = 0 AND NOT v_order.medicao_done THEN
            RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Ficha técnica de medição obrigatória não anexada.');
        END IF;

    -- 2 -> 3: Projeto & Aprovação para Produção
    ELSIF v_order.current_stage = 'projeto_aprovacao' AND p_target_stage = 'producao' THEN
        SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'projeto';
        IF (v_doc_count = 0 AND NOT v_order.project_approved) OR (NOT v_order.project_approved AND NOT p_stage_confirmation) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Projeto executivo/3D e confirmação de aprovação do cliente obrigatórios.');
        END IF;

    -- 4 -> 5: Montagem para Entrega / Aceite
    ELSIF v_order.current_stage = 'montagem' AND p_target_stage = 'entrega_aceite' THEN
        SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'montagem';
        IF v_doc_count = 0 AND NOT v_order.montagem_done THEN
            RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Fotos da montagem finalizada obrigatórias não anexadas.');
        END IF;

    -- 5 -> 6: Entrega / Aceite para Concluído
    ELSIF v_order.current_stage = 'entrega_aceite' AND p_target_stage = 'concluido' THEN
        SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'aceite';
        IF (v_doc_count = 0 AND NOT v_order.client_confirmed_aceite) AND NOT p_stage_confirmation THEN
            RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Termo de aceite assinado ou confirmação formal do cliente obrigatória.');
        END IF;
    END IF;

    v_user_name := COALESCE(
        (SELECT full_name FROM users WHERE id = v_user_id),
        'Operador ERP'
    );
    v_user_role := COALESCE(
        (SELECT role FROM users WHERE id = v_user_id),
        'store_operator'
    );

    -- Atualizar pedido
    UPDATE orders
    SET current_stage = p_target_stage,
        stage_notes = COALESCE(p_stage_notes, stage_notes),
        completed_at = CASE WHEN p_target_stage = 'concluido' THEN now() ELSE completed_at END,
        updated_at = now()
    WHERE id = p_order_id;

    -- Registrar auditoria
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
        p_order_id,
        v_order.tenant_id,
        v_user_id,
        v_user_name,
        v_user_role,
        COALESCE(p_action_message, 'Etapa avançada de ' || v_order.current_stage || ' para ' || p_target_stage || '.'),
        v_order.current_stage,
        p_target_stage,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'previous_stage', v_order.current_stage,
        'current_stage', p_target_stage
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 7. ATUALIZAÇÃO DO VALOR CONTRATADO REAL (UPDATE_ORDER_CONTRACTED_VALUE)
CREATE OR REPLACE FUNCTION public.update_order_contracted_value(
    p_order_id UUID,
    p_contracted_value NUMERIC(10,2)
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_user_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
    v_old_value NUMERIC(10,2);
BEGIN
    v_user_id := auth.uid();
    
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
    END IF;

    IF v_order.tenant_id <> public.current_tenant_id() AND NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: pedido pertence a outra loja parceira.' USING ERRCODE = '42501';
    END IF;

    IF p_contracted_value <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valor contratado deve ser maior que zero.');
    END IF;

    v_old_value := COALESCE(v_order.contracted_value, v_order.total_value);

    UPDATE orders
    SET contracted_value = p_contracted_value,
        total_value = p_contracted_value,
        updated_at = now()
    WHERE id = p_order_id;

    v_user_name := COALESCE(
        (SELECT full_name FROM users WHERE id = v_user_id),
        'Operador ERP'
    );
    v_user_role := COALESCE(
        (SELECT role FROM users WHERE id = v_user_id),
        'store_operator'
    );

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
        p_order_id,
        v_order.tenant_id,
        v_user_id,
        v_user_name,
        v_user_role,
        'Valor contratado atualizado de R$ ' || to_char(v_old_value, 'FM999G999D00') || ' para R$ ' || to_char(p_contracted_value, 'FM999G999D00') || '.',
        v_order.current_stage,
        v_order.current_stage,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'old_value', v_old_value,
        'new_value', p_contracted_value
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 8. GESTÃO DE PENDÊNCIAS OPERACIONAIS DO PEDIDO (UPDATE_ORDER_PENDENCY)
CREATE OR REPLACE FUNCTION public.update_order_pendency(
    p_order_id UUID,
    p_has_pending BOOLEAN,
    p_pending_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_user_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
BEGIN
    v_user_id := auth.uid();
    
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
    END IF;

    IF v_order.tenant_id <> public.current_tenant_id() AND NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: pedido pertence a outra loja parceira.' USING ERRCODE = '42501';
    END IF;

    UPDATE orders
    SET has_pending_issues = p_has_pending,
        pending_notes = p_pending_notes,
        updated_at = now()
    WHERE id = p_order_id;

    v_user_name := COALESCE(
        (SELECT full_name FROM users WHERE id = v_user_id),
        'Operador ERP'
    );
    v_user_role := COALESCE(
        (SELECT role FROM users WHERE id = v_user_id),
        'store_operator'
    );

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
        p_order_id,
        v_order.tenant_id,
        v_user_id,
        v_user_name,
        v_user_role,
        CASE WHEN p_has_pending 
            THEN 'Pendência operacional registrada: ' || p_pending_notes 
            ELSE 'Pendências operacionais resolvidas.' 
        END,
        v_order.current_stage,
        v_order.current_stage,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'has_pending', p_has_pending
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 9. DASHBOARDS E INDICADORES DO ERP (GET_ERP_METRICS)
CREATE OR REPLACE FUNCTION public.get_erp_metrics(
    p_tenant_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_effective_tenant_id UUID;
    v_is_admin BOOLEAN;
    v_active_count INTEGER;
    v_completed_count INTEGER;
    v_delayed_count INTEGER;
    v_total_contracted NUMERIC(12,2);
    v_by_stage JSONB;
BEGIN
    v_is_admin := public.is_platform_admin();
    
    IF v_is_admin AND p_tenant_id IS NOT NULL THEN
        v_effective_tenant_id := p_tenant_id;
    ELSE
        v_effective_tenant_id := public.current_tenant_id();
    END IF;

    IF v_effective_tenant_id IS NULL AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Acesso não autorizado: sessão não vinculada a uma loja.' USING ERRCODE = '42501';
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
    WHERE (v_is_admin AND p_tenant_id IS NULL) OR tenant_id = v_effective_tenant_id;

    -- Contagem por etapa
    SELECT jsonb_object_agg(stage, count)
    INTO v_by_stage
    FROM (
        SELECT current_stage AS stage, COUNT(*) AS count
        FROM orders
        WHERE (v_is_admin AND p_tenant_id IS NULL) OR tenant_id = v_effective_tenant_id
        GROUP BY current_stage
    ) s;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_effective_tenant_id,
        'active_orders', v_active_count,
        'completed_orders', v_completed_count,
        'delayed_orders', v_delayed_count,
        'total_contracted_value', v_total_contracted,
        'by_stage', COALESCE(v_by_stage, '{}'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 10. SEGURANÇA E PERMISSÕES (REVOGAR ANON E CONCEDER AUTHENTICATED)
REVOKE EXECUTE ON FUNCTION public.get_store_orders(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_store_orders(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.attach_order_document(UUID, VARCHAR, VARCHAR, TEXT, TEXT, BIGINT, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.attach_order_document(UUID, VARCHAR, VARCHAR, TEXT, TEXT, BIGINT, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.advance_order_stage(UUID, VARCHAR, TEXT, TEXT, BOOLEAN) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.advance_order_stage(UUID, VARCHAR, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_order_contracted_value(UUID, NUMERIC) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_order_contracted_value(UUID, NUMERIC) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_order_pendency(UUID, BOOLEAN, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_order_pendency(UUID, BOOLEAN, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_erp_metrics(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_erp_metrics(UUID) TO authenticated, service_role;
