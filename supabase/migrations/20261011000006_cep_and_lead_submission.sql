-- =============================================================================
-- MIGRATION: 20261011000006_cep_and_lead_submission.sql
-- DESCRIÇÃO: Procedure para garantia dinâmica de municípios IBGE e permissões de submissão de leads
-- =============================================================================

-- 1. FUNÇÃO PARA ASSEGURAR EXISTÊNCIA DO MUNICÍPIO IBGE DINAMICAMENTE
CREATE OR REPLACE FUNCTION ensure_ibge_city(
    p_ibge_code VARCHAR(7),
    p_name TEXT,
    p_state_uf VARCHAR(2),
    p_latitude NUMERIC DEFAULT NULL,
    p_longitude NUMERIC DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO ibge_cities (ibge_code, name, state_uf, latitude, longitude)
    VALUES (p_ibge_code, p_name, p_state_uf, p_latitude, p_longitude)
    ON CONFLICT (ibge_code) DO UPDATE
    SET name = EXCLUDED.name,
        state_uf = EXCLUDED.state_uf,
        latitude = COALESCE(EXCLUDED.latitude, ibge_cities.latitude),
        longitude = COALESCE(EXCLUDED.longitude, ibge_cities.longitude);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. CONCESSÃO DE PERMISSÕES PARA AS PROCEDURES PÚBLICAS DO SIMULADOR
GRANT EXECUTE ON FUNCTION ensure_ibge_city(VARCHAR, TEXT, VARCHAR, NUMERIC, NUMERIC) TO anon, authenticated, public;
GRANT EXECUTE ON FUNCTION route_and_assign_lead(UUID) TO anon, authenticated, public;

-- 3. PERMITIR LEITURA PÚBLICA DE REGRAS DE PRECIFICAÇÃO ATIVAS PARA O SIMULADOR
GRANT SELECT ON pricing_rules TO anon, authenticated, public;
GRANT SELECT ON ibge_cities TO anon, authenticated, public;
GRANT INSERT ON simulations TO anon, authenticated, public;
GRANT INSERT ON simulation_environments TO anon, authenticated, public;
GRANT INSERT ON leads TO anon, authenticated, public;
