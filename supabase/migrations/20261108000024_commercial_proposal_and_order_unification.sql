-- MIGRATION: 20261108000024_commercial_proposal_and_order_unification.sql
-- Objetivo:
-- 1. Adicionar commercial_proposal (JSONB) à tabela lead_assignments
-- 2. Atualizar get_store_leads para retornar conventionalItems e commercialProposal
-- 3. Criar função save_lead_commercial_proposal
-- 4. Atualizar convert_lead_to_order para usar o valor real da proposta comercial consolidada

ALTER TABLE public.lead_assignments 
ADD COLUMN IF NOT EXISTS commercial_proposal JSONB DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.save_lead_commercial_proposal(
    p_assignment_id UUID,
    p_proposal JSONB,
    p_final_price NUMERIC,
    p_factory_cost NUMERIC DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.lead_assignments
    SET 
        commercial_proposal = p_proposal,
        updated_at = now()
    WHERE id = p_assignment_id;

    UPDATE public.leads l
    SET 
        estimated_max = p_final_price,
        estimated_min = COALESCE(p_factory_cost, estimated_min),
        updated_at = now()
    FROM public.lead_assignments la
    WHERE la.id = p_assignment_id AND l.id = la.lead_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.save_lead_commercial_proposal(UUID, JSONB, NUMERIC, NUMERIC) TO authenticated, anon, service_role;

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

    IF v_user_tenant_id IS NOT NULL THEN
        v_effective_tenant_id := v_user_tenant_id;
    ELSIF v_is_admin THEN
        v_effective_tenant_id := p_tenant_id;
    ELSIF auth.uid() IS NULL THEN
        v_effective_tenant_id := p_tenant_id;
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
            COALESCE(la.conventional_items, '[]'::jsonb) AS "conventionalItems",
            la.commercial_proposal AS "commercialProposal",
            t.id AS "assignedStoreId",
            t.name AS "assignedStoreName",
            l.is_external AS "isExternal",
            l.source,
            ord.id AS "orderId",
            ord.order_number AS "orderNumber",
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

GRANT EXECUTE ON FUNCTION public.get_store_leads(UUID) TO authenticated, anon, service_role;

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
    v_proposal_val NUMERIC(10,2);
BEGIN
    v_user_id := auth.uid();
    
    SELECT * INTO v_assignment FROM lead_assignments WHERE id = p_assignment_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Atribuição de lead não encontrada.');
    END IF;

    IF v_assignment.tenant_id <> public.current_tenant_id() AND NOT public.is_platform_admin() AND auth.uid() IS NOT NULL THEN
        RAISE EXCEPTION 'Acesso negado: lead pertence a outra loja parceira.' USING ERRCODE = '42501';
    END IF;

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

    SELECT * INTO v_lead FROM leads WHERE id = v_assignment.lead_id;
    v_estimated_budget := ROUND((v_lead.estimated_min + v_lead.estimated_max) / 2);

    IF v_assignment.commercial_proposal IS NOT NULL THEN
        v_proposal_val := (v_assignment.commercial_proposal->>'finalOrderTotal')::NUMERIC;
    END IF;

    IF p_total_value IS NOT NULL AND p_total_value > 0 THEN
        v_final_value := p_total_value;
    ELSIF v_proposal_val IS NOT NULL AND v_proposal_val > 0 THEN
        v_final_value := v_proposal_val;
    ELSIF v_lead.estimated_max IS NOT NULL AND v_lead.estimated_max > 0 THEN
        v_final_value := v_lead.estimated_max;
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
        COALESCE(v_lead.whatsapp, v_lead.phone),
        COALESCE(v_lead.city_name || ' - ' || v_lead.state_uf, 'Endereço a confirmar'),
        v_lead.environment_summary,
        v_final_value,
        v_final_value,
        v_estimated_budget,
        (CURRENT_DATE + INTERVAL '45 days'),
        'medicao',
        now(),
        now()
    ) RETURNING id INTO v_order_id;

    INSERT INTO order_audit_logs (
        order_id,
        action,
        stage,
        notes,
        performed_by_id,
        performed_by_name,
        performed_by_role,
        created_at
    ) VALUES (
        v_order_id,
        'order_created',
        'medicao',
        format('Pedido criado a partir de conversão comercial com valor contratado de R$ %s.', v_final_value),
        v_user_id,
        v_user_name,
        v_user_role,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.convert_lead_to_order(UUID, NUMERIC) TO authenticated, anon, service_role;

