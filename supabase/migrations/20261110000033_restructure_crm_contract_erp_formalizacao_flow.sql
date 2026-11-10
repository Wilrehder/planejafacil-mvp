-- ==============================================================================
-- MIGRAÇÃO: REESTRUTURAÇÃO DEFINITIVA DO FLUXO CRM -> CONTRATO -> ERP
-- ==============================================================================
-- Novo fluxo: LEAD -> ORÇAMENTO -> VENDA APROVADA (Fechado) -> FORMALIZAÇÃO CONTRATUAL
-- -> CONTRATO ASSINADO (Digital ou Físico) -> MEDIÇÃO FINA -> DEMAIS ETAPAS ERP
-- ==============================================================================

-- 1. Atualizar Constraint de current_stage para incluir 'formalizacao_contratual'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_current_stage_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_current_stage_check 
    CHECK (current_stage IN ('formalizacao_contratual', 'medicao', 'projeto_aprovacao', 'producao', 'montagem', 'entrega_aceite', 'concluido'));

-- 2. Atualizar tabela de regras do ERP (erp_stage_rules)
INSERT INTO public.erp_stage_rules (stage, stage_label, document_required, required_doc_type, description, updated_at)
VALUES (
    'formalizacao_contratual',
    'Formalização Contratual',
    true,
    'contrato_assinado',
    'Exige assinatura eletrônica do cliente ou anexo do contrato assinado fisicamente antes de avançar para a Medição Fina.',
    now()
)
ON CONFLICT (stage) DO UPDATE 
SET stage_label = EXCLUDED.stage_label,
    document_required = EXCLUDED.document_required,
    required_doc_type = EXCLUDED.required_doc_type,
    description = EXCLUDED.description,
    updated_at = now();

-- 3. Atualizar convert_lead_to_order para iniciar pedidos em 'formalizacao_contratual'
CREATE OR REPLACE FUNCTION public.convert_lead_to_order(p_assignment_id uuid, p_total_value numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    v_proposal_val NUMERIC(10,2);
    v_deadline_days INT := 45;
    v_contract_token VARCHAR(64);
    v_allocations JSONB := '[]'::jsonb;
    v_notes TEXT := '';
BEGIN
    v_user_id := auth.uid();
    
    SELECT * INTO v_assignment FROM lead_assignments WHERE id = p_assignment_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Atribuição de lead não encontrada.');
    END IF;

    IF v_assignment.tenant_id <> public.current_tenant_id() AND NOT public.is_platform_admin() AND auth.uid() IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM tenants 
            WHERE id = v_assignment.tenant_id 
              AND (owner_id = auth.uid() OR lower(owner_email) = lower(COALESCE(auth.jwt()->>'email', '')) OR lower(email) = lower(COALESCE(auth.jwt()->>'email', '')))
        ) THEN
            RAISE EXCEPTION 'Acesso negado: lead pertence a outra loja parceira.' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Verificar Idempotência: Se já foi convertido, retorna o pedido existente sem duplicar
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
            'contract_status', v_existing_order.contract_status,
            'contract_token', v_existing_order.contract_token,
            'message', 'Pedido já existente recuperado com sucesso.'
        );
    END IF;

    -- Obter Lead Original
    SELECT * INTO v_lead FROM leads WHERE id = v_assignment.lead_id;
    v_estimated_budget := ROUND((COALESCE(v_lead.estimated_min, 0) + COALESCE(v_lead.estimated_max, 0)) / 2);

    -- Tenta extrair valor da proposta comercial consolidada
    IF v_assignment.commercial_proposal IS NOT NULL THEN
        BEGIN
            v_proposal_val := NULLIF(v_assignment.commercial_proposal->>'finalOrderTotal', '')::NUMERIC;
            IF v_assignment.commercial_proposal->'paymentAllocations' IS NOT NULL THEN
                v_allocations := v_assignment.commercial_proposal->'paymentAllocations';
            END IF;
            IF v_assignment.commercial_proposal->>'notes' IS NOT NULL THEN
                v_notes := v_assignment.commercial_proposal->>'notes';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_proposal_val := NULL;
        END;
    END IF;

    IF p_total_value IS NOT NULL AND p_total_value > 0 THEN
        v_final_value := p_total_value;
    ELSIF v_proposal_val IS NOT NULL AND v_proposal_val > 0 THEN
        v_final_value := v_proposal_val;
    ELSIF v_assignment.commercial_proposal->>'agreedValue' IS NOT NULL THEN
        v_final_value := NULLIF(v_assignment.commercial_proposal->>'agreedValue', '')::NUMERIC;
    ELSIF v_lead.estimated_max IS NOT NULL AND v_lead.estimated_max > 0 THEN
        v_final_value := v_lead.estimated_max;
    ELSIF v_estimated_budget > 0 THEN
        v_final_value := v_estimated_budget;
    ELSE
        v_final_value := 0.00;
    END IF;

    -- Determinar prazo em dias
    IF v_lead.desired_deadline IS NOT NULL AND v_lead.desired_deadline ~ '[0-9]+' THEN
        BEGIN
            v_deadline_days := (regexp_replace(v_lead.desired_deadline, '[^0-9]', '', 'g'))::INT;
            IF v_deadline_days <= 0 OR v_deadline_days > 365 THEN
                v_deadline_days := 45;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_deadline_days := 45;
        END;
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
    v_contract_token := encode(gen_random_bytes(24), 'hex');

    -- Cria o Pedido Oficial na etapa inicial obrigatória: 'formalizacao_contratual'
    INSERT INTO orders (
        order_number,
        tenant_id,
        lead_assignment_id,
        client_name,
        client_phone,
        client_cpf,
        client_rg,
        billing_address,
        installation_address,
        desired_deadline,
        delivery_address,
        environment_description,
        total_value,
        contracted_value,
        estimated_budget,
        payment_allocations,
        commercial_proposal,
        order_notes,
        contract_status,
        contract_token,
        target_delivery_date,
        current_stage,
        created_at,
        updated_at
    ) VALUES (
        v_order_number,
        v_assignment.tenant_id,
        p_assignment_id,
        v_lead.name,
        COALESCE(v_lead.whatsapp, v_lead.phone),
        v_lead.cpf,
        v_lead.rg,
        v_lead.billing_address,
        v_lead.installation_address,
        v_lead.desired_deadline,
        COALESCE(v_lead.installation_address, v_lead.billing_address, v_lead.city_name || ' - ' || v_lead.state_uf, 'Endereço a confirmar'),
        COALESCE(v_lead.environment_summary, 'Ambiente Planejado'),
        v_final_value,
        v_final_value,
        v_estimated_budget,
        v_allocations,
        v_assignment.commercial_proposal,
        v_notes,
        'formalizacao_pendente',
        v_contract_token,
        CURRENT_DATE + (v_deadline_days || ' days')::INTERVAL,
        'formalizacao_contratual',
        now(),
        now()
    ) RETURNING id INTO v_order_id;

    -- Atualiza status da atribuição comercial para 'convertido'
    UPDATE lead_assignments
    SET status = 'convertido',
        updated_at = now()
    WHERE id = p_assignment_id;

    -- Log de Auditoria Inicial no Pedido
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
        v_user_role,
        'Orçamento aprovado comercialmente no CRM (Fechado). Pedido criado em Formalização Contratual.',
        'crm_fechado',
        'formalizacao_contratual',
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'created',
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_value', v_final_value,
        'current_stage', 'formalizacao_contratual',
        'contract_status', 'formalizacao_pendente',
        'contract_token', v_contract_token,
        'message', 'Pedido criado com sucesso em Formalização Contratual.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.convert_lead_to_order(UUID, NUMERIC) TO authenticated, anon, service_role;

-- 4. Atualizar advance_order_stage com bloqueio rígido de formalização antes da medição
CREATE OR REPLACE FUNCTION public.advance_order_stage(
    p_order_id uuid, 
    p_target_stage character varying, 
    p_action_message text DEFAULT NULL::text, 
    p_stage_notes text DEFAULT NULL::text, 
    p_stage_confirmation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_order RECORD;
    v_doc_count INTEGER;
    v_user_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
    v_stage_order TEXT[] := ARRAY['formalizacao_contratual', 'medicao', 'projeto_aprovacao', 'producao', 'montagem', 'entrega_aceite', 'concluido'];
    v_current_idx INTEGER;
    v_target_idx INTEGER;
    v_step_idx INTEGER;
    v_step_name TEXT;
BEGIN
    v_user_id := auth.uid();
    
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
    END IF;

    -- Isolamento Multi-tenant estrito com fallback
    IF v_order.tenant_id <> public.current_tenant_id() AND NOT public.is_platform_admin() AND auth.uid() IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM tenants 
            WHERE id = v_order.tenant_id 
              AND (owner_id = auth.uid() OR lower(owner_email) = lower(COALESCE(auth.jwt()->>'email', '')) OR lower(email) = lower(COALESCE(auth.jwt()->>'email', '')))
        ) THEN
            RAISE EXCEPTION 'Acesso negado: pedido pertence a outra loja parceira.' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Validação de ordem das etapas
    v_current_idx := array_position(v_stage_order, v_order.current_stage);
    v_target_idx := array_position(v_stage_order, p_target_stage);

    IF v_current_idx IS NULL OR v_target_idx IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Etapa inválida no fluxo do ERP: ' || COALESCE(p_target_stage, 'nula'));
    END IF;

    -- Se já estiver na etapa pretendida, apenas atualiza notas
    IF v_target_idx = v_current_idx THEN
        IF p_stage_notes IS NOT NULL THEN
            UPDATE orders SET stage_notes = p_stage_notes, updated_at = now() WHERE id = p_order_id;
        END IF;
        RETURN jsonb_build_object(
            'success', true,
            'order_id', p_order_id,
            'current_stage', p_target_stage,
            'message', 'Pedido já se encontra nesta etapa.'
        );
    END IF;

    -- Não permitir retroceder etapa via avanço
    IF v_target_idx < v_current_idx THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Avanço inválido: a etapa pretendida (' || p_target_stage || ') é anterior à etapa atual (' || v_order.current_stage || ').'
        );
    END IF;

    -- VALIDAÇÕES DE GATING INCREMENTAIS
    FOR v_step_idx IN v_current_idx..(v_target_idx - 1)
    LOOP
        v_step_name := v_stage_order[v_step_idx];

        -- 0. Formalização Contratual -> Bloqueio estrito antes de avançar para Medição Fina
        IF v_step_name = 'formalizacao_contratual' THEN
            SELECT COUNT(*) INTO v_doc_count 
            FROM order_documents 
            WHERE order_id = p_order_id 
              AND (stage = 'contrato' OR doc_type IN ('contrato', 'contrato_assinado'));

            IF NOT (
                v_order.contract_status IN ('assinado', 'assinado_eletronico', 'assinado_externo')
                OR v_doc_count > 0
                OR p_stage_confirmation
            ) THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Bloqueio operacional: O pedido requer a formalização contratual confirmada (assinatura eletrônica do cliente ou anexo do contrato assinado) antes de avançar para a Medição Fina.'
                );
            END IF;

        -- 1. Medição -> requer ficha/foto anexada ou medicao_done
        ELSIF v_step_name = 'medicao' THEN
            SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'medicao';
            IF v_doc_count = 0 AND NOT COALESCE(v_order.medicao_done, false) AND NOT p_stage_confirmation THEN
                RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Ficha técnica de medição obrigatória não anexada.');
            END IF;

        -- 2. Projeto & Aprovação -> requer arquivo de projeto ou aprovação confirmada
        ELSIF v_step_name = 'projeto_aprovacao' THEN
            SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'projeto';
            IF (v_doc_count = 0 AND NOT COALESCE(v_order.project_approved, false)) AND NOT p_stage_confirmation THEN
                RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Projeto executivo/3D e confirmação de aprovação do cliente obrigatórios.');
            END IF;

        -- 4. Montagem -> requer fotos da montagem ou montagem_done
        ELSIF v_step_name = 'montagem' THEN
            SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'montagem';
            IF v_doc_count = 0 AND NOT COALESCE(v_order.montagem_done, false) AND NOT p_stage_confirmation THEN
                RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Fotos da montagem finalizada na obra são obrigatórias.');
            END IF;

        -- 5. Entrega / Aceite -> requer termo assinado ou confirmação
        ELSIF v_step_name = 'entrega_aceite' THEN
            SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'aceite';
            IF (v_doc_count = 0 AND NOT COALESCE(v_order.client_confirmed_aceite, false)) AND NOT p_stage_confirmation THEN
                RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Termo de aceite assinado ou confirmação formal do cliente obrigatória.');
            END IF;
        END IF;
    END LOOP;

    v_user_name := COALESCE(
        (SELECT full_name FROM users WHERE id = v_user_id),
        'Operador ERP'
    );
    v_user_role := COALESCE(
        (SELECT role FROM users WHERE id = v_user_id),
        'store_operator'
    );

    -- Atualizar pedido com novo estágio e atualizar flags dos estágios cumpridos
    UPDATE orders
    SET current_stage = p_target_stage,
        stage_notes = COALESCE(p_stage_notes, stage_notes),
        medicao_done = CASE WHEN v_target_idx >= 3 THEN true ELSE medicao_done END,
        project_approved = CASE WHEN v_target_idx >= 4 THEN true ELSE project_approved END,
        producao_done = CASE WHEN v_target_idx >= 5 THEN true ELSE producao_done END,
        montagem_done = CASE WHEN v_target_idx >= 6 THEN true ELSE montagem_done END,
        client_confirmed_aceite = CASE WHEN v_target_idx >= 7 THEN true ELSE client_confirmed_aceite END,
        completed_at = CASE WHEN p_target_stage = 'concluido' THEN now() ELSE completed_at END,
        updated_at = now()
    WHERE id = p_order_id;

    -- Registrar auditoria na timeline
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
$function$;

GRANT EXECUTE ON FUNCTION public.advance_order_stage(UUID, VARCHAR, TEXT, TEXT, BOOLEAN) TO authenticated, anon, service_role;

-- 5. RPC Pública para Busca de Contrato por Token Seguro
CREATE OR REPLACE FUNCTION public.get_contract_for_signing(
    p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_order RECORD;
    v_template RECORD;
    v_clauses JSONB;
BEGIN
    IF p_token IS NULL OR trim(p_token) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token de contrato não fornecido.');
    END IF;

    SELECT * INTO v_order 
    FROM orders 
    WHERE contract_token = p_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Contrato não encontrado ou link expirado.');
    END IF;

    SELECT * INTO v_template 
    FROM store_contract_templates 
    WHERE tenant_id = v_order.tenant_id;

    IF FOUND AND v_template.clauses IS NOT NULL AND jsonb_array_length(v_template.clauses) > 0 THEN
        v_clauses := v_template.clauses;
    ELSE
        v_clauses := '[]'::jsonb;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order', jsonb_build_object(
            'id', v_order.id,
            'order_number', v_order.order_number,
            'client_name', v_order.client_name,
            'client_cpf', v_order.client_cpf,
            'client_rg', v_order.client_rg,
            'client_phone', v_order.client_phone,
            'billing_address', v_order.billing_address,
            'installation_address', v_order.installation_address,
            'delivery_address', v_order.delivery_address,
            'environment_description', v_order.environment_description,
            'total_value', v_order.total_value,
            'contracted_value', v_order.contracted_value,
            'target_delivery_date', v_order.target_delivery_date,
            'desired_deadline', v_order.desired_deadline,
            'current_stage', v_order.current_stage,
            'contract_status', v_order.contract_status,
            'contract_signed_at', v_order.contract_signed_at,
            'contract_signed_by_name', v_order.contract_signed_by_name,
            'contract_signed_by_cpf', v_order.contract_signed_by_cpf,
            'payment_allocations', v_order.payment_allocations,
            'commercial_proposal', v_order.commercial_proposal,
            'order_notes', v_order.order_notes
        ),
        'template', jsonb_build_object(
            'tenantId', v_order.tenant_id,
            'companyName', COALESCE(v_template.company_name, 'Loja Parceira Planeja Fácil'),
            'tradeName', COALESCE(v_template.trade_name, 'Móveis Planejados & Interiores'),
            'cnpj', COALESCE(v_template.cnpj, ''),
            'address', COALESCE(v_template.address, ''),
            'phone', COALESCE(v_template.phone, ''),
            'email', COALESCE(v_template.email, ''),
            'logoUrl', COALESCE(v_template.logo_url, ''),
            'defaultDeliveryDays', COALESCE(v_template.default_delivery_days, 45),
            'clauses', v_clauses,
            'generalConditions', COALESCE(v_template.general_conditions, '')
        ),
        'alreadySigned', (v_order.contract_status IN ('assinado', 'assinado_eletronico', 'assinado_externo')),
        'signedInfo', CASE 
            WHEN v_order.contract_status IN ('assinado', 'assinado_eletronico', 'assinado_externo') THEN
                jsonb_build_object(
                    'signedAt', v_order.contract_signed_at,
                    'signedByName', v_order.contract_signed_by_name,
                    'signedByCpf', v_order.contract_signed_by_cpf,
                    'signatureIp', v_order.contract_signature_ip
                )
            ELSE NULL
        END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contract_for_signing(TEXT) TO anon, authenticated, service_role;

-- 6. RPC Pública para Submissão de Assinatura Eletrônica e Avanço Automático para Medição Fina
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

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Contrato não localizado para o token fornecido.');
    END IF;

    IF v_order.contract_status = 'assinado' THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Contrato já se encontra assinado.',
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'current_stage', v_order.current_stage
        );
    END IF;

    -- Registrar na tabela de auditoria forense de assinaturas
    INSERT INTO contract_signatures (
        order_id,
        token,
        signer_name,
        signer_cpf,
        signer_ip,
        signer_user_agent,
        signature_image,
        signed_at
    ) VALUES (
        v_order.id,
        p_token,
        trim(p_signer_name),
        trim(p_signer_cpf),
        COALESCE(p_signer_ip, 'Dispositivo Web'),
        COALESCE(p_signer_user_agent, 'Web'),
        p_signature_image,
        v_now
    );

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
            current_stage = 'medicao',
            updated_at = v_now
        WHERE id = v_order.id;

        -- Registrar log de transição automática no ERP
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
            'Contrato assinado eletronicamente por ' || trim(p_signer_name) || ' (CPF: ' || trim(p_signer_cpf) || '). Pedido liberado e avançado automaticamente para Medição Fina.',
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
            'Contrato assinado eletronicamente por ' || trim(p_signer_name) || ' (CPF: ' || trim(p_signer_cpf) || ').',
            v_order.current_stage,
            v_order.current_stage,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'current_stage', CASE WHEN v_advanced THEN 'medicao' ELSE v_order.current_stage END,
        'contract_status', 'assinado',
        'signed_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_contract_signature(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 7. RPC para Confirmação de Contrato Físico e Avanço para Medição Fina
CREATE OR REPLACE FUNCTION public.confirm_physical_contract_and_advance(
    p_order_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_order RECORD;
    v_doc_count INTEGER;
    v_user_id UUID := auth.uid();
    v_user_name TEXT;
    v_user_role TEXT;
    v_now TIMESTAMPTZ := now();
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
    END IF;

    -- Validar documento de contrato anexado
    SELECT COUNT(*) INTO v_doc_count 
    FROM order_documents 
    WHERE order_id = p_order_id 
      AND (stage = 'contrato' OR doc_type IN ('contrato', 'contrato_assinado', 'documento'));

    IF v_doc_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Antes de confirmar a formalização física, anexe o arquivo PDF/imagem do contrato assinado pelo cliente.'
        );
    END IF;

    v_user_name := COALESCE((SELECT full_name FROM users WHERE id = v_user_id), 'Lojista Parceiro');
    v_user_role := COALESCE((SELECT role FROM users WHERE id = v_user_id), 'store_operator');

    UPDATE orders
    SET contract_status = 'assinado_externo',
        current_stage = 'medicao',
        stage_notes = COALESCE(p_notes, stage_notes),
        updated_at = v_now
    WHERE id = p_order_id;

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
        'Contrato assinado fisicamente validado e anexado por ' || v_user_name || '. Pedido liberado para Medição Fina.',
        'formalizacao_contratual',
        'medicao',
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'current_stage', 'medicao',
        'contract_status', 'assinado_externo'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_physical_contract_and_advance(UUID, TEXT) TO authenticated, anon, service_role;
