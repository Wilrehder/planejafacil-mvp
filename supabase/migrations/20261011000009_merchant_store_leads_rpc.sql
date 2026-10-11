-- =============================================================================
-- MIGRATION: 20261011000009_merchant_store_leads_rpc.sql
-- DESCRIÇÃO: Procedure segura para consulta de leads atribuídos a uma loja
--            no CRM do lojista com isolamento estrito multi-tenant
-- =============================================================================

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

    -- Se autenticado como lojista, usa exclusivamente seu próprio tenant_id
    IF v_user_tenant_id IS NOT NULL THEN
        v_effective_tenant_id := v_user_tenant_id;
    ELSIF v_is_admin THEN
        v_effective_tenant_id := p_tenant_id;
    ELSE
        -- Fallback seguro para lojista em modo desenvolvimento / protótipo
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
            t.id AS "assignedStoreId",
            t.name AS "assignedStoreName",
            false AS "isExternal",
            l.source
        FROM lead_assignments la
        JOIN leads l ON l.id = la.lead_id
        JOIN tenants t ON t.id = la.tenant_id
        WHERE la.tenant_id = v_effective_tenant_id
        ORDER BY la.assigned_at DESC
    ) sub;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_effective_tenant_id,
        'leads', v_leads
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_store_leads TO anon, authenticated;
