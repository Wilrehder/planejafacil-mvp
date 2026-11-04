-- =============================================================================
-- MIGRATION: 20261104000020_fix_store_suspension_toggle.sql
-- DESCRIÇÃO: Corrige admin_set_store_suspension para sincronizar atomicamente
--            o status em tenants ('ativa' vs 'inativa') e is_routing_enabled
--            (true vs false), permitindo alternância perfeita entre suspender e reativar.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_set_store_suspension(
    p_tenant_id UUID,
    p_suspended BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_tenant RECORD;
    v_new_status VARCHAR(20);
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas o administrador do SaaS pode suspender ou reativar lojas.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Loja não encontrada.');
    END IF;

    IF p_suspended THEN
        v_new_status := 'inativa';
        
        -- Atualizar tabela principal tenants
        UPDATE public.tenants
        SET status = 'inativa',
            is_routing_enabled = false,
            updated_at = now()
        WHERE id = p_tenant_id;

        -- Atualizar tabela de assinaturas
        UPDATE public.store_subscriptions
        SET status = 'suspended',
            suspension_reason = p_reason,
            suspended_at = now(),
            updated_at = now()
        WHERE tenant_id = p_tenant_id;

        INSERT INTO public.subscription_history (
            tenant_id,
            action,
            new_plan,
            reason,
            actor_id
        ) VALUES (
            p_tenant_id,
            'status_change',
            v_tenant.plan_tier,
            'Loja suspensa administrativamente: ' || COALESCE(p_reason, 'Sem motivo informado'),
            auth.uid()
        );
    ELSE
        v_new_status := 'ativa';

        -- Atualizar tabela principal tenants para reativação
        UPDATE public.tenants
        SET status = 'ativa',
            is_routing_enabled = true,
            updated_at = now()
        WHERE id = p_tenant_id;

        -- Atualizar tabela de assinaturas para reativação
        UPDATE public.store_subscriptions
        SET status = 'active',
            suspension_reason = NULL,
            suspended_at = NULL,
            updated_at = now()
        WHERE tenant_id = p_tenant_id;

        INSERT INTO public.subscription_history (
            tenant_id,
            action,
            new_plan,
            reason,
            actor_id
        ) VALUES (
            p_tenant_id,
            'status_change',
            v_tenant.plan_tier,
            'Loja reativada administrativamente.',
            auth.uid()
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', p_tenant_id,
        'is_suspended', p_suspended,
        'store_status', v_new_status,
        'subscription_status', CASE WHEN p_suspended THEN 'suspended' ELSE 'active' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_set_store_suspension(UUID, BOOLEAN, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_set_store_suspension(UUID, BOOLEAN, TEXT) TO authenticated, service_role;
