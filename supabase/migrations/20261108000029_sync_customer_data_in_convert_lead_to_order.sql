-- ==============================================================================
-- MIGRAÇÃO: SINCRONIZAÇÃO COMPLETA DE DADOS CADASTRAIS NA CONVERSÃO DE PEDIDO
-- ==============================================================================

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
BEGIN
    v_user_id := auth.uid();
    
    SELECT * INTO v_assignment FROM lead_assignments WHERE id = p_assignment_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Atribuição de lead não encontrada.');
    END IF;

    IF v_assignment.tenant_id <> public.current_tenant_id() AND NOT public.is_platform_admin() AND auth.uid() IS NOT NULL THEN
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
    v_estimated_budget := ROUND((COALESCE(v_lead.estimated_min, 0) + COALESCE(v_lead.estimated_max, 0)) / 2);

    -- Tenta extrair valor da proposta comercial consolidada
    IF v_assignment.commercial_proposal IS NOT NULL THEN
        BEGIN
            v_proposal_val := NULLIF(v_assignment.commercial_proposal->>'finalOrderTotal', '')::NUMERIC;
        EXCEPTION WHEN OTHERS THEN
            v_proposal_val := NULL;
        END;
    END IF;

    IF p_total_value IS NOT NULL AND p_total_value > 0 THEN
        v_final_value := p_total_value;
    ELSIF v_proposal_val IS NOT NULL AND v_proposal_val > 0 THEN
        v_final_value := v_proposal_val;
    ELSIF v_assignment.agreed_value IS NOT NULL AND v_assignment.agreed_value > 0 THEN
        v_final_value := v_assignment.agreed_value;
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

    INSERT INTO orders (
        order_number,
        tenant_id,
        lead_assignment_id,
        client_name,
        client_phone,
        client_cpf,
        billing_address,
        installation_address,
        desired_deadline,
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
        COALESCE(v_lead.whatsapp, v_lead.phone),
        v_lead.cpf,
        v_lead.billing_address,
        v_lead.installation_address,
        v_lead.desired_deadline,
        COALESCE(v_lead.installation_address, v_lead.city_name || ' - ' || v_lead.state_uf, 'Endereço a confirmar'),
        COALESCE(v_lead.environment_summary, 'Ambiente Planejado'),
        v_final_value,
        v_final_value,
        v_estimated_budget,
        (CURRENT_DATE + (v_deadline_days || ' days')::INTERVAL),
        'medicao',
        now(),
        now()
    ) RETURNING id INTO v_order_id;

    -- Auditoria inicial com as colunas corretas de order_audit_logs
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
        format('Pedido criado a partir de conversão comercial com valor contratado de R$ %s.', v_final_value),
        NULL,
        'medicao',
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_value', v_final_value,
        'contracted_value', v_final_value,
        'current_stage', 'medicao',
        'message', 'Pedido gerado e enviado para a esteira de medição do ERP!'
    );
END;
$function$;

