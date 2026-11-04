-- Correção do Motor de Roteamento (route_and_assign_lead)
-- Garante que municípios sem loja parceira local nem cobertura autorizada caiam estritamente na Fila Sem Cobertura (sem_cobertura)

CREATE OR REPLACE FUNCTION public.route_and_assign_lead(p_lead_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_lead RECORD;
    v_chosen_tenant_id UUID;
    v_chosen_tenant_name TEXT;
    v_reason VARCHAR(30);
    v_assignment_id UUID;
BEGIN
    SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lead não encontrado.');
    END IF;

    IF v_lead.distribution_status = 'atribuido' THEN
        SELECT a.id, a.tenant_id, t.name INTO v_assignment_id, v_chosen_tenant_id, v_chosen_tenant_name
        FROM public.lead_assignments a
        JOIN public.tenants t ON t.id = a.tenant_id
        WHERE a.lead_id = p_lead_id
        LIMIT 1;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'already_assigned',
            'assignment_id', v_assignment_id,
            'tenant_id', v_chosen_tenant_id,
            'tenant_name', v_chosen_tenant_name
        );
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('lead_route_city_' || COALESCE(v_lead.city_ibge_code, v_lead.city_name)));

    -- PRIORIDADE 1: Lojas ativas sediadas no MESMO MUNICÍPIO (por IBGE ou Nome da Cidade + UF)
    SELECT id, name INTO v_chosen_tenant_id, v_chosen_tenant_name
    FROM public.tenants
    WHERE (
        city_ibge_code = v_lead.city_ibge_code
        OR (lower(trim(city_name)) = lower(trim(v_lead.city_name)) AND upper(trim(state_uf)) = upper(trim(v_lead.state_uf)))
      )
      AND status = 'ativa'
      AND is_routing_enabled = true
    ORDER BY last_assigned_at ASC NULLS FIRST, created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_chosen_tenant_id IS NOT NULL THEN
        v_reason := 'same_city_round_robin';
    ELSE
        -- PRIORIDADE 2: Lojas com cobertura regional autorizada na tabela store_coverage
        SELECT t.id, t.name INTO v_chosen_tenant_id, v_chosen_tenant_name
        FROM public.tenants t
        JOIN public.store_coverage sc ON sc.tenant_id = t.id
        WHERE sc.city_ibge_code = v_lead.city_ibge_code
          AND sc.is_authorized = true
          AND t.status = 'ativa'
          AND t.is_routing_enabled = true
        ORDER BY sc.priority_level ASC, t.last_assigned_at ASC NULLS FIRST, t.created_at ASC
        LIMIT 1
        FOR UPDATE;

        IF v_chosen_tenant_id IS NOT NULL THEN
            v_reason := 'nearby_coverage_fallback';
        END IF;
    END IF;

    -- Se não houver loja local nem cobertura autorizada, cai na Fila de Sem Cobertura (Admin Queue)
    IF v_chosen_tenant_id IS NULL THEN
        UPDATE public.leads
        SET distribution_status = 'sem_cobertura',
            updated_at = now()
        WHERE id = p_lead_id;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'sem_cobertura',
            'message', 'Nenhuma loja elegível no município ou com cobertura autorizada. Enviado para a fila administrativa.'
        );
    END IF;

    -- Atribuição à loja selecionada
    INSERT INTO public.lead_assignments (
        lead_id,
        tenant_id,
        assignment_reason,
        status,
        assigned_at,
        updated_at
    ) VALUES (
        p_lead_id,
        v_chosen_tenant_id,
        v_reason,
        'novo',
        now(),
        now()
    )
    ON CONFLICT (lead_id, tenant_id) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_assignment_id;

    -- Registro de faturamento Pay-Per-Lead (R$ 50,00) apenas para leads da plataforma
    IF NOT v_lead.is_external THEN
        INSERT INTO public.lead_deliveries (
            assignment_id,
            tenant_id,
            unit_cost,
            is_billable
        ) VALUES (
            v_assignment_id,
            v_chosen_tenant_id,
            50.00,
            true
        )
        ON CONFLICT (assignment_id) DO NOTHING;
    END IF;

    -- Atualiza cache da loja e status do lead
    UPDATE public.tenants
    SET leads_count_cache = leads_count_cache + 1,
        last_assigned_at = now(),
        updated_at = now()
    WHERE id = v_chosen_tenant_id;

    UPDATE public.leads
    SET distribution_status = 'atribuido',
        updated_at = now()
    WHERE id = p_lead_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'atribuido',
        'assignment_id', v_assignment_id,
        'tenant_id', v_chosen_tenant_id,
        'tenant_name', v_chosen_tenant_name,
        'assignment_reason', v_reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
