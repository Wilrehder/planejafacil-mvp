-- =============================================================================
-- PLANEJAFÁCIL — MIGRATION 14 (FASE 6): HOMOLOGAÇÃO, HARDENING E AJUSTES DE AUDITORIA
-- =============================================================================
-- Esta migration implementa:
-- 1. Helper function para cálculo preciso de data de vencimento (28, 29, 30 e 31 dias).
-- 2. Atualização de generate_monthly_invoice respeitando billing_due_day e clamp de mês.
-- 3. Procedure reprocess_monthly_invoice para reprocessamento de faturas abertas.
-- 4. Procedure admin_reassign_lead para reatribuição de leads com estorno/re-faturamento.
-- 5. Validação e hardening de search_path e permissões em todas as procedures.
-- =============================================================================

-- 1. HELPER PARA CÁLCULO DE DATA DE VENCIMENTO COM CLAMP DE FIM DE MÊS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_billing_due_date(
    p_competence_month VARCHAR(7), -- Ex: '2026-10'
    p_due_day INTEGER              -- Ex: 10, 15, 31
)
RETURNS DATE AS $$
DECLARE
    v_next_month_first DATE;
    v_last_day_of_next_month DATE;
    v_clamped_day INTEGER;
    v_target_day INTEGER;
BEGIN
    v_target_day := COALESCE(p_due_day, 10);
    IF v_target_day < 1 THEN v_target_day := 10; END IF;
    IF v_target_day > 31 THEN v_target_day := 31; END IF;

    -- Primeiro dia do mês subsequente à competência
    v_next_month_first := (to_date(p_competence_month || '-01', 'YYYY-MM-DD') + INTERVAL '1 month')::date;
    -- Último dia do mês subsequente
    v_last_day_of_next_month := (date_trunc('month', v_next_month_first) + INTERVAL '1 month' - INTERVAL '1 day')::date;
    -- Clamp para evitar overflow em meses com 28, 29 ou 30 dias (ex: dia 31 em fevereiro ou abril)
    v_clamped_day := LEAST(v_target_day, EXTRACT(DAY FROM v_last_day_of_next_month)::integer);

    RETURN (to_char(v_next_month_first, 'YYYY-MM') || '-' || lpad(v_clamped_day::text, 2, '0'))::date;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.calculate_billing_due_date(VARCHAR, INTEGER) TO authenticated, service_role, anon;


-- 2. ATUALIZAÇÃO DE GENERATE_MONTHLY_INVOICE COM VENCIMENTO REAL E CAPTURA DE LEADS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_monthly_invoice(
    p_tenant_id UUID,
    p_competence_month VARCHAR(7) -- Ex: '2026-10'
)
RETURNS JSONB AS $$
DECLARE
    v_subscription RECORD;
    v_existing_invoice RECORD;
    v_invoice_id UUID;
    v_invoice_number VARCHAR(35);
    v_sub_amount NUMERIC(10,2);
    v_leads_amount NUMERIC(10,2) := 0.00;
    v_leads_count INTEGER := 0;
    v_total_due NUMERIC(10,2);
    v_due_date DATE;
    v_due_day INTEGER := 10;
BEGIN
    -- Validar se quem chama é admin ou a própria loja
    IF NOT public.is_platform_admin() AND public.current_tenant_id() <> p_tenant_id THEN
        RAISE EXCEPTION 'Acesso negado: operação restrita à administração ou à própria loja.' USING ERRCODE = '42501';
    END IF;

    -- Obter assinatura ativa da loja
    SELECT * INTO v_subscription
    FROM public.store_subscriptions
    WHERE tenant_id = p_tenant_id
      AND status IN ('active', 'past_due', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        v_sub_amount := 119.90; -- fallback básico
        v_due_day := 10;
    ELSE
        v_sub_amount := v_subscription.contracted_monthly_price;
        v_due_day := COALESCE(v_subscription.billing_due_day, 10);
    END IF;

    -- Calcular data de vencimento precisa com clamp de fim de mês
    v_due_date := public.calculate_billing_due_date(p_competence_month, v_due_day);

    -- Verificar se a fatura da competência já existe (Idempotência Estrita)
    SELECT * INTO v_existing_invoice
    FROM public.invoices
    WHERE tenant_id = p_tenant_id
      AND competence_month = p_competence_month;

    IF FOUND THEN
        -- Retornar a fatura já existente sem recriar ou duplicar itens
        RETURN jsonb_build_object(
            'success', true,
            'status', 'already_exists',
            'invoice_id', v_existing_invoice.id,
            'invoice_number', v_existing_invoice.invoice_number,
            'total_due', v_existing_invoice.total_due,
            'competence_month', v_existing_invoice.competence_month,
            'leads_count', v_existing_invoice.leads_count,
            'invoice_status', v_existing_invoice.status,
            'due_date', v_existing_invoice.due_date
        );
    END IF;

    -- Somar leads faturáveis ainda não vinculados a faturas entregues até a competência
    SELECT 
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(unit_cost), 0.00)
    INTO v_leads_count, v_leads_amount
    FROM public.lead_deliveries
    WHERE tenant_id = p_tenant_id
      AND is_billable = true
      AND invoice_id IS NULL
      AND to_char(created_at, 'YYYY-MM') <= p_competence_month;

    v_total_due := v_sub_amount + v_leads_amount;
    v_invoice_number := 'FAT-' || replace(p_competence_month, '-', '') || '-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0');

    -- Inserir fatura consolidada
    INSERT INTO public.invoices (
        invoice_number,
        tenant_id,
        subscription_id,
        competence_month,
        subscription_amount,
        leads_amount,
        leads_count,
        total_due,
        due_date,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_invoice_number,
        p_tenant_id,
        v_subscription.id,
        p_competence_month,
        v_sub_amount,
        v_leads_amount,
        v_leads_count,
        v_total_due,
        v_due_date,
        'pending',
        now(),
        now()
    ) RETURNING id INTO v_invoice_id;

    -- Inserir item da mensalidade da assinatura
    INSERT INTO public.invoice_items (
        invoice_id,
        item_type,
        description,
        quantity,
        unit_price,
        total_price
    ) VALUES (
        v_invoice_id,
        'subscription',
        'Assinatura Mensal SaaS - Plano ' || COALESCE(v_subscription.plan_tier, 'basic') || ' (' || p_competence_month || ')',
        1,
        v_sub_amount,
        v_sub_amount
    );

    -- Vincular e discriminar leads faturáveis
    IF v_leads_count > 0 THEN
        INSERT INTO public.invoice_items (
            invoice_id,
            item_type,
            description,
            quantity,
            unit_price,
            total_price
        ) VALUES (
            v_invoice_id,
            'pay_per_lead',
            'Cobrança Variável Pay-Per-Lead (' || v_leads_count || ' leads faturáveis entregues)',
            v_leads_count,
            50.00,
            v_leads_amount
        );

        -- Atualizar os registros de entrega marcando como faturados
        UPDATE public.lead_deliveries
        SET invoice_id = v_invoice_id,
            delivery_status = 'invoiced'
        WHERE tenant_id = p_tenant_id
          AND is_billable = true
          AND invoice_id IS NULL
          AND to_char(created_at, 'YYYY-MM') <= p_competence_month;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'created',
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'total_due', v_total_due,
        'competence_month', p_competence_month,
        'leads_count', v_leads_count,
        'leads_amount', v_leads_amount,
        'due_date', v_due_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.generate_monthly_invoice(UUID, VARCHAR) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.generate_monthly_invoice(UUID, VARCHAR) TO authenticated, service_role;


-- 3. PROCEDURE PARA REPROCESSAMENTO DE FATURAS ABERTAS (REPROCESS_MONTHLY_INVOICE)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reprocess_monthly_invoice(
    p_invoice_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
    v_add_leads_count INTEGER := 0;
    v_add_leads_amount NUMERIC(10,2) := 0.00;
    v_new_leads_count INTEGER;
    v_new_leads_amount NUMERIC(10,2);
    v_new_total_due NUMERIC(10,2);
    v_new_status VARCHAR(30);
BEGIN
    -- Apenas administrador do SaaS ou a própria loja pode reprocessar
    IF NOT public.is_platform_admin() THEN
        SELECT tenant_id INTO v_invoice FROM public.invoices WHERE id = p_invoice_id;
        IF NOT FOUND OR public.current_tenant_id() <> v_invoice.tenant_id THEN
            RAISE EXCEPTION 'Acesso negado: operação restrita.' USING ERRCODE = '42501';
        END IF;
    END IF;

    SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fatura não encontrada.');
    END IF;

    IF v_invoice.status = 'paid' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fatura já quitada não pode ser reprocessada.');
    END IF;

    -- Buscar novos leads faturáveis pendentes na mesma competência
    SELECT 
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(unit_cost), 0.00)
    INTO v_add_leads_count, v_add_leads_amount
    FROM public.lead_deliveries
    WHERE tenant_id = v_invoice.tenant_id
      AND is_billable = true
      AND invoice_id IS NULL
      AND to_char(created_at, 'YYYY-MM') <= v_invoice.competence_month;

    IF v_add_leads_count > 0 THEN
        -- Atualizar entregas recém-adicionadas
        UPDATE public.lead_deliveries
        SET invoice_id = p_invoice_id,
            delivery_status = 'invoiced'
        WHERE tenant_id = v_invoice.tenant_id
          AND is_billable = true
          AND invoice_id IS NULL
          AND to_char(created_at, 'YYYY-MM') <= v_invoice.competence_month;

        -- Inserir ou atualizar item de leads na fatura
        INSERT INTO public.invoice_items (
            invoice_id,
            item_type,
            description,
            quantity,
            unit_price,
            total_price
        ) VALUES (
            p_invoice_id,
            'pay_per_lead',
            'Cobrança Adicional Pay-Per-Lead (' || v_add_leads_count || ' novos leads apurados)',
            v_add_leads_count,
            50.00,
            v_add_leads_amount
        );

        v_new_leads_count := v_invoice.leads_count + v_add_leads_count;
        v_new_leads_amount := v_invoice.leads_amount + v_add_leads_amount;
        v_new_total_due := v_invoice.subscription_amount + v_new_leads_amount + v_invoice.adjustments_amount;

        IF v_invoice.amount_paid >= v_new_total_due AND v_new_total_due > 0 THEN
            v_new_status := 'paid';
        ELSIF v_invoice.amount_paid > 0 THEN
            v_new_status := 'partially_paid';
        ELSE
            v_new_status := 'pending';
        END IF;

        UPDATE public.invoices
        SET leads_count = v_new_leads_count,
            leads_amount = v_new_leads_amount,
            total_due = v_new_total_due,
            status = v_new_status,
            updated_at = now()
        WHERE id = p_invoice_id;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'reprocessed',
            'additional_leads', v_add_leads_count,
            'additional_amount', v_add_leads_amount,
            'total_leads_count', v_new_leads_count,
            'total_due', v_new_total_due
        );
    ELSE
        RETURN jsonb_build_object(
            'success', true,
            'status', 'up_to_date',
            'message', 'Nenhum lead pendente para adicionar à fatura.',
            'total_due', v_invoice.total_due
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.reprocess_monthly_invoice(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reprocess_monthly_invoice(UUID) TO authenticated, service_role;


-- 4. PROCEDURE PARA REATRIBUIÇÃO ADMINISTRATIVA DE LEADS (ADMIN_REASSIGN_LEAD)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reassign_lead(
    p_lead_id UUID,
    p_new_tenant_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_lead RECORD;
    v_old_assignment RECORD;
    v_new_store RECORD;
    v_new_assignment_id UUID;
    v_old_store_name TEXT;
    v_new_store_name TEXT;
    v_user_name TEXT;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores da plataforma podem reatribuir leads.' USING ERRCODE = '42501';
    END IF;

    -- Validar existência do lead
    SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lead não encontrado.');
    END IF;

    -- Validar nova loja de destino na tabela tenants
    SELECT * INTO v_new_store FROM public.tenants WHERE id = p_new_tenant_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Loja de destino não encontrada.');
    END IF;

    -- Localizar atribuição anterior
    SELECT * INTO v_old_assignment 
    FROM public.lead_assignments 
    WHERE lead_id = p_lead_id 
    ORDER BY created_at DESC 
    LIMIT 1;

    IF FOUND THEN
        SELECT name INTO v_old_store_name FROM public.tenants WHERE id = v_old_assignment.tenant_id;
        
        -- Cancelar cobrança anterior em lead_deliveries
        UPDATE public.lead_deliveries
        SET is_billable = false,
            delivery_status = 'cancelled'
        WHERE assignment_id = v_old_assignment.id;

        -- Se a loja antiga possuía fatura aberta vinculada a esse lead, abater do total
        UPDATE public.invoices inv
        SET leads_count = GREATEST(leads_count - 1, 0),
            leads_amount = GREATEST(leads_amount - 50.00, 0.00),
            total_due = GREATEST(total_due - 50.00, 0.00),
            updated_at = now()
        FROM public.lead_deliveries ld
        WHERE ld.assignment_id = v_old_assignment.id
          AND ld.invoice_id = inv.id
          AND inv.status IN ('pending', 'partially_paid');

        -- Marcar atribuição antiga como cancelada por reatribuição
        UPDATE public.lead_assignments
        SET status = 'perdido',
            loss_reason = 'Reatribuído administrativamente para ' || COALESCE(v_new_store.name, 'outra loja') || '. Motivo: ' || COALESCE(p_reason, 'Ajuste administrativo'),
            updated_at = now()
        WHERE id = v_old_assignment.id;
    END IF;

    -- Criar nova atribuição para a loja de destino
    INSERT INTO public.lead_assignments (
        lead_id,
        tenant_id,
        status,
        sla_expires_at,
        created_at,
        updated_at
    ) VALUES (
        p_lead_id,
        p_new_tenant_id,
        'novo',
        now() + INTERVAL '24 hours',
        now(),
        now()
    ) RETURNING id INTO v_new_assignment_id;

    -- Inserir nova entrega faturável para a loja de destino
    INSERT INTO public.lead_deliveries (
        assignment_id,
        tenant_id,
        is_billable,
        unit_cost,
        delivery_status,
        created_at
    ) VALUES (
        v_new_assignment_id,
        p_new_tenant_id,
        true,
        50.00,
        'delivered',
        now()
    );

    -- Atualizar contador e horário da loja destino
    UPDATE public.tenants
    SET last_assigned_at = now(),
        leads_count_cache = leads_count_cache + 1,
        updated_at = now()
    WHERE id = p_new_tenant_id;

    -- Registrar histórico de auditoria
    SELECT full_name INTO v_user_name FROM public.users WHERE id = auth.uid();
    IF v_user_name IS NULL THEN v_user_name := 'Administrador do Sistema'; END IF;

    INSERT INTO public.lead_notes (
        assignment_id,
        tenant_id,
        author_id,
        author_name,
        note_text,
        created_at
    ) VALUES (
        v_new_assignment_id,
        p_new_tenant_id,
        auth.uid(),
        v_user_name,
        'Lead reatribuído da loja "' || COALESCE(v_old_store_name, 'Anterior') || '" para "' || v_new_store.name || '". Motivo: ' || COALESCE(p_reason, 'Reatribuição operacional'),
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'lead_id', p_lead_id,
        'old_tenant_id', v_old_assignment.tenant_id,
        'new_tenant_id', p_new_tenant_id,
        'new_assignment_id', v_new_assignment_id,
        'new_store_name', v_new_store.name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_reassign_lead(UUID, UUID, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_reassign_lead(UUID, UUID, TEXT) TO authenticated, service_role;
