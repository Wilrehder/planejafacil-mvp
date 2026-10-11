-- =============================================================================
-- MIGRATION: 20261011000007_consumer_simulation_rpc.sql
-- DESCRIÇÃO: Procedure transacional para submissão segura de simulações e leads
--            com cálculo oficial de orçamento e distribuição automática
-- =============================================================================

CREATE OR REPLACE FUNCTION submit_consumer_simulation(
    p_client_name TEXT,
    p_client_phone TEXT,
    p_client_cep VARCHAR(8),
    p_city_ibge_code VARCHAR(7),
    p_city_name VARCHAR(150),
    p_state_uf VARCHAR(2),
    p_environments JSONB,
    p_client_email TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_clean_name TEXT;
    v_clean_phone TEXT;
    v_clean_cep TEXT;
    v_clean_email TEXT;
    v_pricing RECORD;
    v_simulation_id UUID;
    v_lead_id UUID;
    v_env_record JSONB;
    v_area NUMERIC;
    v_height NUMERIC;
    v_walls INT;
    v_type_id TEXT;
    v_name TEXT;
    v_eff_height NUMERIC;
    v_linear_m NUMERIC;
    v_m2_env NUMERIC;
    v_total_furniture_m2 NUMERIC := 0.0;
    v_calc_min NUMERIC;
    v_calc_max NUMERIC;
    v_env_summary TEXT := '';
    v_routing_result JSONB;
BEGIN
    -- 1. Validações de Entrada
    v_clean_name := trim(COALESCE(p_client_name, ''));
    IF length(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Nome do cliente deve ter ao menos 2 caracteres.' USING ERRCODE = '22023';
    END IF;

    v_clean_phone := regexp_replace(COALESCE(p_client_phone, ''), '\D', '', 'g');
    IF length(v_clean_phone) < 10 OR length(v_clean_phone) > 15 THEN
        RAISE EXCEPTION 'Telefone inválido. Deve conter DDD e entre 10 e 11 dígitos.' USING ERRCODE = '22023';
    END IF;

    v_clean_cep := regexp_replace(COALESCE(p_client_cep, ''), '\D', '', 'g');
    IF length(v_clean_cep) <> 8 THEN
        RAISE EXCEPTION 'CEP inválido. Deve conter exatamente 8 dígitos.' USING ERRCODE = '22023';
    END IF;

    v_clean_email := nullif(trim(COALESCE(p_client_email, '')), '');

    IF p_environments IS NULL OR jsonb_array_length(p_environments) = 0 THEN
        RAISE EXCEPTION 'É necessário informar ao menos um ambiente.' USING ERRCODE = '22023';
    END IF;

    -- 2. Garantir consistência do município no banco (ibge_cities)
    PERFORM ensure_ibge_city(p_city_ibge_code, p_city_name, p_state_uf);

    -- 3. Obter regra de precificação ativa
    SELECT id, version, base_m2_price, margin_min_factor, margin_max_factor, furniture_coverage_ratio, max_effective_height
    INTO v_pricing
    FROM pricing_rules
    WHERE is_active = true
    ORDER BY version DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nenhuma regra de precificação ativa encontrada.' USING ERRCODE = 'P0002';
    END IF;

    -- 4. Cálculo do Orçamento Oficial Certificado
    FOR v_env_record IN SELECT * FROM jsonb_array_elements(p_environments)
    LOOP
        v_area := (v_env_record->>'areaM2')::NUMERIC;
        v_height := (v_env_record->>'ceilingHeight')::NUMERIC;
        v_walls := (v_env_record->>'wallCount')::INT;
        v_type_id := COALESCE(v_env_record->>'typeId', 'geral');
        v_name := COALESCE(v_env_record->>'name', 'Ambiente');

        IF v_area <= 0 OR v_area > 500 THEN
            RAISE EXCEPTION 'Área do ambiente inválida (deve ser entre 1 e 500 m²).' USING ERRCODE = '22023';
        END IF;

        IF v_height < 1.5 OR v_height > 6.0 THEN
            RAISE EXCEPTION 'Pé-direito inválido (deve ser entre 1.5m e 6.0m).' USING ERRCODE = '22023';
        END IF;

        IF v_walls < 1 OR v_walls > 4 THEN
            RAISE EXCEPTION 'Quantidade de paredes deve ser entre 1 e 4.' USING ERRCODE = '22023';
        END IF;

        v_eff_height := LEAST(v_height, v_pricing.max_effective_height);
        v_linear_m := (2.0 * SQRT(v_area) * v_walls) / 4.0;
        v_m2_env := v_linear_m * v_eff_height * v_pricing.furniture_coverage_ratio;
        v_total_furniture_m2 := v_total_furniture_m2 + v_m2_env;

        IF length(v_env_summary) > 0 THEN
            v_env_summary := v_env_summary || ', ';
        END IF;
        v_env_summary := v_env_summary || v_name || ' (' || ROUND(v_area, 1)::TEXT || 'm²)';
    END LOOP;

    v_calc_min := ROUND(v_total_furniture_m2 * v_pricing.base_m2_price * v_pricing.margin_min_factor, 2);
    v_calc_max := ROUND(v_total_furniture_m2 * v_pricing.base_m2_price * v_pricing.margin_max_factor, 2);

    -- 5. Inserir Simulação
    INSERT INTO simulations (
        pricing_rule_id,
        client_name,
        client_phone,
        client_email,
        client_cep,
        city_ibge_code,
        city_name,
        state_uf,
        calculated_min,
        calculated_max,
        user_agent
    ) VALUES (
        v_pricing.id,
        v_clean_name,
        v_clean_phone,
        v_clean_email,
        v_clean_cep,
        p_city_ibge_code,
        p_city_name,
        p_state_uf,
        v_calc_min,
        v_calc_max,
        p_user_agent
    ) RETURNING id INTO v_simulation_id;

    -- 6. Inserir Ambientes da Simulação
    FOR v_env_record IN SELECT * FROM jsonb_array_elements(p_environments)
    LOOP
        INSERT INTO simulation_environments (
            simulation_id,
            environment_type_id,
            name,
            area_m2,
            ceiling_height,
            wall_count
        ) VALUES (
            v_simulation_id,
            COALESCE(v_env_record->>'typeId', 'geral'),
            COALESCE(v_env_record->>'name', 'Ambiente'),
            (v_env_record->>'areaM2')::NUMERIC,
            (v_env_record->>'ceilingHeight')::NUMERIC,
            (v_env_record->>'wallCount')::INT
        );
    END LOOP;

    -- 7. Inserir Lead Comercial
    INSERT INTO leads (
        simulation_id,
        name,
        phone,
        whatsapp,
        email,
        cep,
        city_ibge_code,
        city_name,
        state_uf,
        environment_summary,
        estimated_min,
        estimated_max,
        source,
        distribution_status
    ) VALUES (
        v_simulation_id,
        v_clean_name,
        v_clean_phone,
        v_clean_phone,
        v_clean_email,
        v_clean_cep,
        p_city_ibge_code,
        p_city_name,
        p_state_uf,
        v_env_summary,
        v_calc_min,
        v_calc_max,
        'plataforma',
        'pendente'
    ) RETURNING id INTO v_lead_id;

    -- 8. Executar Roteamento Inteligente Transacional
    v_routing_result := route_and_assign_lead(v_lead_id);

    -- 9. Retornar Resposta Consolidada e Segura
    RETURN jsonb_build_object(
        'success', true,
        'simulation_id', v_simulation_id,
        'lead_id', v_lead_id,
        'pricing_rule_version', v_pricing.version,
        'budget_min', v_calc_min,
        'budget_max', v_calc_max,
        'total_furniture_m2', ROUND(v_total_furniture_m2, 2),
        'distribution_status', COALESCE(v_routing_result->>'status', 'sem_cobertura'),
        'assigned_store_id', v_routing_result->>'tenant_id',
        'assigned_store_name', v_routing_result->>'tenant_name',
        'assignment_reason', v_routing_result->>'assignment_reason',
        'city', p_city_name,
        'state', p_state_uf
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION submit_consumer_simulation TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_simulation_proposal(p_simulation_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_sim RECORD;
    v_envs JSONB;
BEGIN
    SELECT s.id, s.client_name, s.client_cep, s.city_name, s.state_uf,
           s.calculated_min, s.calculated_max, s.created_at, pr.version AS pricing_version
    INTO v_sim
    FROM simulations s
    JOIN pricing_rules pr ON pr.id = s.pricing_rule_id
    WHERE s.id = p_simulation_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Proposta não encontrada.');
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', se.id,
        'type_id', se.environment_type_id,
        'name', se.name,
        'area_m2', se.area_m2,
        'ceiling_height', se.ceiling_height,
        'wall_count', se.wall_count
    )), '[]'::jsonb)
    INTO v_envs
    FROM simulation_environments se
    WHERE se.simulation_id = p_simulation_id;

    RETURN jsonb_build_object(
        'success', true,
        'simulation_id', v_sim.id,
        'client_name', v_sim.client_name,
        'city_name', v_sim.city_name,
        'state_uf', v_sim.state_uf,
        'calculated_min', v_sim.calculated_min,
        'calculated_max', v_sim.calculated_max,
        'created_at', v_sim.created_at,
        'pricing_version', v_sim.pricing_version,
        'environments', v_envs
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_simulation_proposal TO anon, authenticated;
