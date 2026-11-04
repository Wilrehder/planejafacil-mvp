-- =============================================================================
-- PLANEJAFÁCIL SAAS — MIGRAÇÃO DE CORREÇÃO: EXCLUSÃO DE LOJAS PARCEIRAS & INTEGRIDADE REFERENCIAL
-- Data: 2026-11-03
-- =============================================================================

-- 1. Atualizar Foreign Keys para suporte a ON DELETE CASCADE / ON DELETE SET NULL
-- -----------------------------------------------------------------------------

-- A. Leads vinculados a tenants (leads criados pela loja via CRM externo)
ALTER TABLE public.leads
    DROP CONSTRAINT IF EXISTS leads_owner_tenant_id_fkey;

ALTER TABLE public.leads
    ADD CONSTRAINT leads_owner_tenant_id_fkey
    FOREIGN KEY (owner_tenant_id)
    REFERENCES public.tenants(id)
    ON DELETE CASCADE;

-- B. Entregas de leads faturáveis (lead_deliveries)
ALTER TABLE public.lead_deliveries
    DROP CONSTRAINT IF EXISTS lead_deliveries_tenant_id_fkey;

ALTER TABLE public.lead_deliveries
    ADD CONSTRAINT lead_deliveries_tenant_id_fkey
    FOREIGN KEY (tenant_id)
    REFERENCES public.tenants(id)
    ON DELETE CASCADE;

-- C. Faturas vinculadas a assinaturas (invoices -> store_subscriptions)
ALTER TABLE public.invoices
    DROP CONSTRAINT IF EXISTS invoices_subscription_id_fkey;

ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_subscription_id_fkey
    FOREIGN KEY (subscription_id)
    REFERENCES public.store_subscriptions(id)
    ON DELETE SET NULL;

-- D. Itens de faturas vinculados a entregas (invoice_items -> lead_deliveries)
ALTER TABLE public.invoice_items
    DROP CONSTRAINT IF EXISTS invoice_items_source_lead_delivery_id_fkey;

ALTER TABLE public.invoice_items
    ADD CONSTRAINT invoice_items_source_lead_delivery_id_fkey
    FOREIGN KEY (source_lead_delivery_id)
    REFERENCES public.lead_deliveries(id)
    ON DELETE SET NULL;

-- E. Pedidos do ERP vinculados a atribuições de leads (orders -> lead_assignments)
ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS orders_lead_assignment_id_fkey;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_lead_assignment_id_fkey
    FOREIGN KEY (lead_assignment_id)
    REFERENCES public.lead_assignments(id)
    ON DELETE CASCADE;


-- 2. Stored Procedure Oficial para Exclusão Completa e Segura de Loja Parceira
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_store(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_store_name TEXT;
    v_leads_removed INT;
    v_orders_removed INT;
BEGIN
    -- Validação estrita de perfil: apenas Administradores Gerais do SaaS
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores da plataforma podem excluir lojas parceiras.' USING ERRCODE = '42501';
    END IF;

    -- Verificar se a loja existe
    SELECT name INTO v_store_name FROM public.tenants WHERE id = p_tenant_id;
    IF v_store_name IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Loja parceira não encontrada no banco de dados.'
        );
    END IF;

    -- Contabilizar para retorno
    SELECT count(*) INTO v_leads_removed FROM public.lead_assignments WHERE tenant_id = p_tenant_id;
    SELECT count(*) INTO v_orders_removed FROM public.orders WHERE tenant_id = p_tenant_id;

    -- Limpeza explícita e sequencial de todos os dados relacionados
    DELETE FROM public.invoice_payments WHERE tenant_id = p_tenant_id;
    DELETE FROM public.invoice_items WHERE invoice_id IN (SELECT id FROM public.invoices WHERE tenant_id = p_tenant_id);
    DELETE FROM public.invoices WHERE tenant_id = p_tenant_id;
    DELETE FROM public.lead_deliveries WHERE tenant_id = p_tenant_id;
    DELETE FROM public.order_audit_logs WHERE tenant_id = p_tenant_id;
    DELETE FROM public.order_documents WHERE tenant_id = p_tenant_id;
    DELETE FROM public.orders WHERE tenant_id = p_tenant_id;
    DELETE FROM public.lead_notes WHERE tenant_id = p_tenant_id;
    DELETE FROM public.lead_assignments WHERE tenant_id = p_tenant_id;
    
    -- Excluir leads manuais que pertenciam unicamente a este tenant
    DELETE FROM public.leads WHERE owner_tenant_id = p_tenant_id;

    DELETE FROM public.store_meta_integrations WHERE tenant_id = p_tenant_id;
    DELETE FROM public.store_expenses WHERE tenant_id = p_tenant_id;
    DELETE FROM public.store_commercial_settings WHERE tenant_id = p_tenant_id;
    DELETE FROM public.store_coverage WHERE tenant_id = p_tenant_id;
    DELETE FROM public.subscription_history WHERE tenant_id = p_tenant_id;
    DELETE FROM public.store_subscriptions WHERE tenant_id = p_tenant_id;

    -- Desvincular e inativar operadores/lojistas vinculados a este tenant na tabela users
    UPDATE public.users 
    SET tenant_id = NULL,
        is_active = false,
        updated_at = now()
    WHERE tenant_id = p_tenant_id;

    -- Excluir o registro principal da loja
    DELETE FROM public.tenants WHERE id = p_tenant_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Loja "%s" e todos os seus vínculos foram excluídos com sucesso.', v_store_name),
        'tenant_id', p_tenant_id,
        'store_name', v_store_name,
        'assignments_removed', v_leads_removed,
        'orders_removed', v_orders_removed
    );
END;
$$;

-- Permissões de execução
GRANT EXECUTE ON FUNCTION public.admin_delete_store(UUID) TO authenticated, service_role;

