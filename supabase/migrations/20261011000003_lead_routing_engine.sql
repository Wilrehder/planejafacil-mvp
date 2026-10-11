-- =============================================================================
-- MIGRATION: 20261011000003_lead_routing_engine.sql
-- DESCRIÇÃO: Motor de Distribuição Inteligente de Leads com Prioridade 1, 2, 3 e Round Robin Transacional
-- =============================================================================

CREATE OR REPLACE FUNCTION route_and_assign_lead(p_lead_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_lead RECORD;
    v_chosen_tenant_id UUID;
    v_chosen_tenant_name TEXT;
    v_reason VARCHAR(30);
    v_assignment_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Obter informações do Lead
    SELECT * INTO v_lead FROM leads WHERE id = p_lead_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lead não encontrado.');
    END IF;

    -- Se já estiver atribuído, retornar a atribuição existente
    IF v_lead.distribution_status = 'atribuido' THEN
        SELECT a.id, a.tenant_id, t.name INTO v_assignment_id, v_chosen_tenant_id, v_chosen_tenant_name
        FROM lead_assignments a
        JOIN tenants t ON t.id = a.tenant_id
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

    -- 1.1 Lock consultivo transacional por município (impede condição de corrida sem falsos negativos)
    PERFORM pg_advisory_xact_lock(hashtext('lead_route_city_' || v_lead.city_ibge_code));

    -- =========================================================================
    -- PRIORIDADE 1: Lojas sediadas no MESMO MUNICÍPIO (Código IBGE)
    -- Round Robin Estrito: Ordena por quem foi atendido há mais tempo (last_assigned_at)
    -- =========================================================================
    SELECT id, name INTO v_chosen_tenant_id, v_chosen_tenant_name
    FROM tenants
    WHERE city_ibge_code = v_lead.city_ibge_code
      AND status = 'ativa'
      AND is_routing_enabled = true
    ORDER BY last_assigned_at ASC NULLS FIRST, created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_chosen_tenant_id IS NOT NULL THEN
        v_reason := 'same_city_round_robin';
    ELSE
        -- =====================================================================
        -- PRIORIDADE 2: Lojas externas com COBERTURA REGIONAL AUTORIZADA
        -- =====================================================================
        SELECT t.id, t.name INTO v_chosen_tenant_id, v_chosen_tenant_name
        FROM tenants t
        JOIN store_coverage sc ON sc.tenant_id = t.id
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

    -- =========================================================================
    -- PRIORIDADE 3: Sem Cobertura (Fila Administrativa)
    -- =========================================================================
    IF v_chosen_tenant_id IS NULL THEN
        UPDATE leads
        SET distribution_status = 'sem_cobertura',
            updated_at = now()
        WHERE id = p_lead_id;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'sem_cobertura',
            'message', 'Nenhuma loja elegível no município ou com cobertura autorizada. Enviado para a fila administrativa.'
        );
    END IF;

    -- =========================================================================
    -- EFETIVAÇÃO DA ATRIBUIÇÃO TRANSACIONAL
    -- =========================================================================
    INSERT INTO lead_assignments (
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

    -- Registrar evento contábil Pay-Per-Lead (R$ 50,00) apenas para leads faturáveis da plataforma
    IF NOT v_lead.is_external THEN
        INSERT INTO lead_deliveries (
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

    -- Atualizar contador atômico de carga e ponteiro do rodízio Round Robin
    UPDATE tenants
    SET leads_count_cache = leads_count_cache + 1,
        last_assigned_at = now(),
        updated_at = now()
    WHERE id = v_chosen_tenant_id;

    -- Atualizar status do lead
    UPDATE leads
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
