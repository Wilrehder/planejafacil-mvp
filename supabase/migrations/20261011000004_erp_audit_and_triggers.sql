-- =============================================================================
-- MIGRATION: 20261011000004_erp_audit_and_triggers.sql
-- DESCRIÇÃO: Automação de conversão de Lead em Pedido ERP, Gating de Documentos e Trilha de Auditoria
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 4100;

-- 1. FUNÇÃO: CONVERSÃO ATÔMICA E IDEMPOTENTE DE LEAD EM PEDIDO ERP
CREATE OR REPLACE FUNCTION convert_lead_to_order(
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
    v_user_id UUID;
    v_user_name TEXT;
BEGIN
    v_user_id := auth.uid();
    v_user_name := COALESCE(
        (SELECT full_name FROM users WHERE id = v_user_id),
        'Operador Comercial'
    );

    -- 1. Obter Atribuição
    SELECT * INTO v_assignment FROM lead_assignments WHERE id = p_assignment_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Atribuição de lead não encontrada.');
    END IF;

    -- 2. Verificar Idempotência: Pedido já existe para este lead?
    SELECT * INTO v_existing_order FROM orders WHERE lead_assignment_id = p_assignment_id;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'already_converted',
            'order_id', v_existing_order.id,
            'order_number', v_existing_order.order_number,
            'message', 'Pedido já existente recuperado com sucesso.'
        );
    END IF;

    -- 3. Obter Lead Original
    SELECT * INTO v_lead FROM leads WHERE id = v_assignment.lead_id;

    -- 4. Definir Valor Total do Pedido
    IF p_total_value IS NOT NULL AND p_total_value > 0 THEN
        v_final_value := p_total_value;
    ELSE
        v_final_value := ROUND((v_lead.estimated_min + v_lead.estimated_max) / 2);
    END IF;

    -- 5. Gerar Número Amigável do Pedido (#PED-XXXX)
    v_order_number := 'PED-' || nextval('order_number_seq')::TEXT;

    -- 6. Criar Ordem de Produção no ERP com idempotência atômica contra race conditions
    INSERT INTO orders (
        order_number,
        tenant_id,
        lead_assignment_id,
        client_name,
        client_phone,
        delivery_address,
        environment_description,
        total_value,
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
        'medicao',
        now(),
        now()
    )
    ON CONFLICT (lead_assignment_id) DO NOTHING
    RETURNING id INTO v_order_id;

    -- Se outra requisição concorrente inseriu no mesmo instante
    IF v_order_id IS NULL THEN
        SELECT id, order_number, total_value INTO v_existing_order FROM orders WHERE lead_assignment_id = p_assignment_id;
        RETURN jsonb_build_object(
            'success', true,
            'status', 'already_converted',
            'order_id', v_existing_order.id,
            'order_number', v_existing_order.order_number,
            'total_value', v_existing_order.total_value,
            'message', 'Pedido existente recuperado com sucesso após concorrência resolvida.'
        );
    END IF;

    -- 7. Atualizar status no CRM
    UPDATE lead_assignments
    SET status = 'convertido',
        updated_at = now()
    WHERE id = p_assignment_id;

    -- 8. Inserir Registro Inicial na Trilha de Auditoria
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
        'Venda Fechada no CRM! Pedido gerado e encaminhado para Medição Técnica no ERP.',
        NULL,
        'medicao',
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'converted',
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_value', v_final_value
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. FUNÇÃO: AVANÇO SEGURO DE ETAPA COM GATING DE DOCUMENTOS OBRIGATÓRIOS
CREATE OR REPLACE FUNCTION advance_order_stage(
    p_order_id UUID,
    p_target_stage VARCHAR(30),
    p_action_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_doc_count INTEGER;
    v_user_id UUID;
    v_user_name TEXT;
BEGIN
    v_user_id := auth.uid();
    v_user_name := COALESCE(
        (SELECT full_name FROM users WHERE id = v_user_id),
        'Operador ERP'
    );

    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
    END IF;

    -- VALIDAÇÕES DE GATING POR ETAPA
    IF v_order.current_stage = 'medicao' AND p_target_stage = 'projeto_aprovacao' THEN
        SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'medicao';
        IF v_doc_count = 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Ficha de medição técnica obrigatória não anexada.');
        END IF;

    ELSIF v_order.current_stage = 'projeto_aprovacao' AND p_target_stage = 'producao' THEN
        SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'projeto';
        IF v_doc_count = 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Projeto executivo ou aprovação obrigatória não anexada.');
        END IF;

    ELSIF v_order.current_stage = 'montagem' AND p_target_stage = 'entrega_aceite' THEN
        SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'montagem';
        IF v_doc_count = 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Fotos da montagem finalizada obrigatórias não anexadas.');
        END IF;

    ELSIF v_order.current_stage = 'entrega_aceite' AND p_target_stage = 'concluido' THEN
        SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'aceite';
        IF v_doc_count = 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Termo de aceite assinado pelo cliente obrigatório não anexado.');
        END IF;
    END IF;

    -- Avançar etapa
    UPDATE orders
    SET current_stage = p_target_stage,
        updated_at = now()
    WHERE id = p_order_id;

    -- Registrar evento no log de auditoria
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
        'Operador ERP',
        COALESCE(p_action_message, 'Etapa avançada para ' || p_target_stage),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
