-- =============================================================================
-- MIGRATION: 20261011000008_admin_routing_overview_rpc.sql
-- DESCRIÇÃO: Procedure analítica para a Visão Administrativa com dados reais
--            do PostgreSQL sobre distribuição, lojas e leads sem cobertura.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_admin_routing_overview()
RETURNS JSONB AS $$
DECLARE
    v_recent_leads JSONB;
    v_stores JSONB;
    v_uncovered_count INT;
    v_assigned_count INT;
    v_total_leads INT;
BEGIN
    -- 1. Contadores Reais
    SELECT count(*) INTO v_total_leads FROM leads;
    SELECT count(*) INTO v_assigned_count FROM leads WHERE distribution_status = 'atribuido';
    SELECT count(*) INTO v_uncovered_count FROM leads WHERE distribution_status = 'sem_cobertura';

    -- 2. Leads Recentes com detalhes de atribuição e regra geográfica
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_recent_leads
    FROM (
        SELECT 
            l.id,
            l.name,
            l.phone,
            l.city_name,
            l.state_uf,
            l.environment_summary,
            l.estimated_min,
            l.estimated_max,
            l.distribution_status,
            l.created_at,
            la.assigned_at,
            la.assignment_reason,
            t.name AS assigned_store_name,
            t.id AS assigned_store_id
        FROM leads l
        LEFT JOIN lead_assignments la ON la.lead_id = l.id
        LEFT JOIN tenants t ON t.id = la.tenant_id
        ORDER BY l.created_at DESC
        LIMIT 50
    ) sub;

    -- 3. Lojas e Status na Fila
    SELECT COALESCE(jsonb_agg(sub_store), '[]'::jsonb)
    INTO v_stores
    FROM (
        SELECT 
            t.id,
            t.name,
            t.city_name,
            t.state_uf,
            t.status,
            t.is_routing_enabled,
            t.leads_count_cache,
            t.last_assigned_at,
            t.plan_tier
        FROM tenants t
        ORDER BY t.city_name ASC, t.last_assigned_at ASC NULLS FIRST
    ) sub_store;

    RETURN jsonb_build_object(
        'success', true,
        'total_leads', v_total_leads,
        'assigned_count', v_assigned_count,
        'uncovered_count', v_uncovered_count,
        'recent_leads', v_recent_leads,
        'stores', v_stores
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_admin_routing_overview TO anon, authenticated;
