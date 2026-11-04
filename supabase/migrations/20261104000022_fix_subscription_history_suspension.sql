-- =============================================================================
-- MIGRATION: 20261104000022_fix_subscription_history_suspension.sql
-- DESCRIÇÃO: 
-- Garante colunas reason e actor_id em subscription_history e atualiza a procedure
-- admin_set_store_suspension com mapeamento completo de status e auditoria.
-- =============================================================================

ALTER TABLE public.subscription_history 
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS actor_id UUID;

CREATE OR REPLACE FUNCTION public.admin_set_store_suspension(
    p_tenant_id UUID,
    p_suspended BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tenant RECORD;
    v_new_status VARCHAR(20);
    v_sub_id UUID;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas o administrador do SaaS pode suspender ou reativar lojas.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Loja não encontrada.');
    END IF;

    SELECT id INTO v_sub_id FROM public.store_subscriptions WHERE tenant_id = p_tenant_id LIMIT 1;

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
            subscription_id,
            tenant_id,
            action,
            old_status,
            new_status,
            new_plan,
            notes,
            reason,
            performed_by,
            actor_id
        ) VALUES (
            v_sub_id,
            p_tenant_id,
            'suspension',
            'active',
            'suspended',
            v_tenant.plan_tier,
            'Loja suspensa administrativamente: ' || COALESCE(p_reason, 'Sem motivo informado'),
            'Loja suspensa administrativamente: ' || COALESCE(p_reason, 'Sem motivo informado'),
            auth.uid(),
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
            subscription_id,
            tenant_id,
            action,
            old_status,
            new_status,
            new_plan,
            notes,
            reason,
            performed_by,
            actor_id
        ) VALUES (
            v_sub_id,
            p_tenant_id,
            'reactivation',
            'suspended',
            'active',
            v_tenant.plan_tier,
            'Loja reativada administrativamente no rodízio de leads.',
            'Loja reativada administrativamente no rodízio de leads.',
            auth.uid(),
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
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_store_suspension(UUID, BOOLEAN, TEXT) TO authenticated, service_role;
