-- =============================================================================
-- MIGRATION: 20261011000013_phase5_1_manual_financial_management.sql
-- DESCRIÇÃO: Fase 5.1 — Adequação do Módulo Financeiro para Gestão Manual
--            de Cobranças, Assinaturas, Vencimentos e Pagamentos Recebidos.
--            (O SaaS PlanejaFácil não atua como intermediador bancário).
-- =============================================================================

-- 1. Adequar tabela invoices para suportar pagamentos parciais e controle manual
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- Sincronizar faturas já marcadas como pagas anteriormente
UPDATE public.invoices
SET amount_paid = total_due
WHERE status = 'paid' AND amount_paid = 0.00;

-- Atualizar constraint de status da fatura para aceitar 'partially_paid' e 'past_due'
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
CHECK (status IN ('draft', 'pending', 'partially_paid', 'paid', 'past_due', 'overdue', 'canceled', 'refunded'));

-- 2. Adequar store_subscriptions para dia fixo de vencimento e auditoria de suspensão
ALTER TABLE public.store_subscriptions
ADD COLUMN IF NOT EXISTS billing_due_day INTEGER NOT NULL DEFAULT 10 CHECK (billing_due_day BETWEEN 1 AND 31),
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'store_subscriptions_tenant_id_unique'
    ) THEN
        ALTER TABLE public.store_subscriptions ADD CONSTRAINT store_subscriptions_tenant_id_unique UNIQUE (tenant_id);
    END IF;
END $$;

-- 3. Criar tabela de Comprovantes de Recebimento Manual (invoice_payments)
CREATE TABLE IF NOT EXISTS public.invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    amount_paid NUMERIC(10,2) NOT NULL CHECK (amount_paid > 0),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('pix', 'transferencia', 'dinheiro', 'boleto_externo', 'outro')),
    external_reference TEXT,
    notes TEXT,
    registered_by UUID REFERENCES auth.users(id),
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_tenant_id ON public.invoice_payments(tenant_id);

-- RLS para invoice_payments
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_payments_tenant_read" ON public.invoice_payments;
CREATE POLICY "invoice_payments_tenant_read" ON public.invoice_payments
FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

DROP POLICY IF EXISTS "invoice_payments_admin_write" ON public.invoice_payments;
CREATE POLICY "invoice_payments_admin_write" ON public.invoice_payments
FOR ALL TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

REVOKE ALL ON public.invoice_payments FROM anon, public;
GRANT SELECT ON public.invoice_payments TO authenticated;
GRANT ALL ON public.invoice_payments TO service_role;

-- 4. Procedure para Registro Manual de Pagamento (admin_register_manual_payment)
CREATE OR REPLACE FUNCTION public.admin_register_manual_payment(
    p_invoice_id UUID,
    p_amount_paid NUMERIC,
    p_payment_date TIMESTAMPTZ DEFAULT now(),
    p_payment_method VARCHAR DEFAULT 'pix',
    p_notes TEXT DEFAULT NULL,
    p_external_reference TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
    v_new_amount_paid NUMERIC(10,2);
    v_balance_due NUMERIC(10,2);
    v_new_status VARCHAR(30);
    v_payment_id UUID;
    v_existing_receipt RECORD;
BEGIN
    -- 1. Autorização estrita: apenas o administrador do SaaS pode registrar pagamentos
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas o administrador do SaaS pode registrar pagamentos recebidos.' USING ERRCODE = '42501';
    END IF;

    -- 2. Validações de entrada
    IF p_amount_paid IS NULL OR p_amount_paid <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valor do pagamento deve ser maior que zero.');
    END IF;

    -- 3. Idempotência por chave externa
    IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
        SELECT * INTO v_existing_receipt
        FROM public.invoice_payments
        WHERE idempotency_key = p_idempotency_key;

        IF FOUND THEN
            SELECT * INTO v_invoice FROM public.invoices WHERE id = v_existing_receipt.invoice_id;
            RETURN jsonb_build_object(
                'success', true,
                'status', 'already_processed',
                'payment_id', v_existing_receipt.id,
                'invoice_id', v_invoice.id,
                'invoice_number', v_invoice.invoice_number,
                'amount_paid', v_existing_receipt.amount_paid,
                'total_amount_paid', v_invoice.amount_paid,
                'balance_due', (v_invoice.total_due - v_invoice.amount_paid),
                'invoice_status', v_invoice.status
            );
        END IF;
    END IF;

    -- 4. Lock consultivo na fatura
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fatura não encontrada.');
    END IF;

    -- 5. Atualizar valores e status da fatura
    v_new_amount_paid := v_invoice.amount_paid + p_amount_paid;
    v_balance_due := v_invoice.total_due - v_new_amount_paid;

    IF v_new_amount_paid >= v_invoice.total_due THEN
        v_new_status := 'paid';
        -- Atualizar entregas de lead correspondentes para 'paid'
        UPDATE public.lead_deliveries
        SET delivery_status = 'paid'
        WHERE invoice_id = p_invoice_id;

        -- Se a assinatura estava past_due, regularizar para 'active'
        UPDATE public.store_subscriptions
        SET status = 'active',
            updated_at = now()
        WHERE tenant_id = v_invoice.tenant_id
          AND status IN ('past_due');
    ELSE
        v_new_status := 'partially_paid';
    END IF;

    UPDATE public.invoices
    SET amount_paid = v_new_amount_paid,
        status = v_new_status,
        paid_at = CASE WHEN v_new_status = 'paid' THEN COALESCE(p_payment_date, now()) ELSE paid_at END,
        payment_method = p_payment_method,
        notes = CASE WHEN p_notes IS NOT NULL THEN COALESCE(notes || E'\n', '') || p_notes ELSE notes END,
        updated_at = now()
    WHERE id = p_invoice_id;

    -- 6. Inserir comprovante do recebimento manual
    INSERT INTO public.invoice_payments (
        invoice_id,
        tenant_id,
        amount_paid,
        payment_date,
        payment_method,
        external_reference,
        notes,
        registered_by,
        idempotency_key,
        created_at
    ) VALUES (
        p_invoice_id,
        v_invoice.tenant_id,
        p_amount_paid,
        COALESCE(p_payment_date, now()),
        p_payment_method,
        p_external_reference,
        p_notes,
        auth.uid(),
        p_idempotency_key,
        now()
    ) RETURNING id INTO v_payment_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', v_new_status,
        'payment_id', v_payment_id,
        'invoice_id', p_invoice_id,
        'invoice_number', v_invoice.invoice_number,
        'amount_paid_now', p_amount_paid,
        'total_amount_paid', v_new_amount_paid,
        'total_due', v_invoice.total_due,
        'balance_due', GREATEST(v_balance_due, 0.00),
        'paid_at', CASE WHEN v_new_status = 'paid' THEN p_payment_date ELSE NULL END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_register_manual_payment(UUID, NUMERIC, TIMESTAMPTZ, VARCHAR, TEXT, TEXT, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_register_manual_payment(UUID, NUMERIC, TIMESTAMPTZ, VARCHAR, TEXT, TEXT, TEXT) TO authenticated, service_role;


-- 5. Procedure para Ajustes / Estornos Administrativos em Faturas (admin_register_invoice_adjustment)
CREATE OR REPLACE FUNCTION public.admin_register_invoice_adjustment(
    p_invoice_id UUID,
    p_adjustment_amount NUMERIC,
    p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
    v_new_total NUMERIC(10,2);
    v_new_adjustments NUMERIC(10,2);
    v_new_status VARCHAR(30);
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas o administrador do SaaS pode lançar ajustes.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fatura não encontrada.');
    END IF;

    v_new_adjustments := v_invoice.adjustments_amount + p_adjustment_amount;
    v_new_total := v_invoice.subscription_amount + v_invoice.leads_amount + v_new_adjustments;

    IF v_new_total < 0 THEN
        v_new_total := 0.00;
    END IF;

    IF v_invoice.amount_paid >= v_new_total AND v_new_total > 0 THEN
        v_new_status := 'paid';
    ELSIF v_invoice.amount_paid > 0 THEN
        v_new_status := 'partially_paid';
    ELSE
        v_new_status := 'pending';
    END IF;

    UPDATE public.invoices
    SET adjustments_amount = v_new_adjustments,
        total_due = v_new_total,
        status = v_new_status,
        updated_at = now()
    WHERE id = p_invoice_id;

    INSERT INTO public.invoice_items (
        invoice_id,
        item_type,
        description,
        quantity,
        unit_price,
        total_price
    ) VALUES (
        p_invoice_id,
        'adjustment',
        COALESCE(p_description, 'Ajuste administrativo'),
        1,
        p_adjustment_amount,
        p_adjustment_amount
    );

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'new_total_due', v_new_total,
        'new_adjustments', v_new_adjustments,
        'balance_due', (v_new_total - v_invoice.amount_paid),
        'status', v_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_register_invoice_adjustment(UUID, NUMERIC, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_register_invoice_adjustment(UUID, NUMERIC, TEXT) TO authenticated, service_role;


-- 6. Procedure para Suspensão / Reativação Administrativa de Lojas (admin_set_store_suspension)
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
        v_new_status := 'suspended';
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
        v_new_status := 'active';
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
        'subscription_status', v_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_set_store_suspension(UUID, BOOLEAN, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_set_store_suspension(UUID, BOOLEAN, TEXT) TO authenticated, service_role;


-- 7. Procedure para Cadastro e Edição de Lojas com Assinatura (admin_save_store_and_subscription)
CREATE OR REPLACE FUNCTION public.admin_save_store_and_subscription(
    p_store_id UUID DEFAULT NULL,
    p_name TEXT DEFAULT '',
    p_cnpj VARCHAR DEFAULT NULL,
    p_responsible_name TEXT DEFAULT NULL,
    p_city_ibge_code VARCHAR DEFAULT NULL,
    p_city_name TEXT DEFAULT NULL,
    p_state_uf VARCHAR DEFAULT 'SP',
    p_phone VARCHAR DEFAULT NULL,
    p_whatsapp VARCHAR DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_plan_tier VARCHAR DEFAULT 'pro',
    p_contracted_price NUMERIC DEFAULT NULL,
    p_billing_due_day INT DEFAULT 10,
    p_is_routing_enabled BOOLEAN DEFAULT true,
    p_covered_cities VARCHAR[] DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_price NUMERIC(10,2);
    v_pricing RECORD;
    v_city_code VARCHAR(7);
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas o administrador do SaaS pode gerenciar lojas.' USING ERRCODE = '42501';
    END IF;

    -- Obter preço sugerido da tabela de preços se não foi informado
    IF p_contracted_price IS NULL OR p_contracted_price <= 0 THEN
        SELECT monthly_price INTO v_price
        FROM public.saas_pricing_schedules
        WHERE plan_tier = p_plan_tier AND is_active = true
        ORDER BY version DESC LIMIT 1;
        
        IF v_price IS NULL THEN
            v_price := CASE WHEN p_plan_tier = 'pro' THEN 219.90 ELSE 119.90 END;
        END IF;
    ELSE
        v_price := p_contracted_price;
    END IF;

    IF p_store_id IS NULL THEN
        -- Nova loja
        INSERT INTO public.tenants (
            name,
            cnpj,
            responsible_name,
            city_ibge_code,
            city_name,
            state_uf,
            phone,
            whatsapp,
            email,
            plan_tier,
            status,
            is_routing_enabled,
            leads_count_cache,
            created_at,
            updated_at
        ) VALUES (
            p_name,
            p_cnpj,
            p_responsible_name,
            COALESCE(p_city_ibge_code, '3552502'),
            COALESCE(p_city_name, 'Suzano'),
            COALESCE(p_state_uf, 'SP'),
            p_phone,
            p_whatsapp,
            p_email,
            p_plan_tier,
            'ativa',
            p_is_routing_enabled,
            0,
            now(),
            now()
        ) RETURNING id INTO v_tenant_id;

        -- Criar assinatura inicial
        INSERT INTO public.store_subscriptions (
            tenant_id,
            plan_tier,
            contracted_monthly_price,
            contracted_lead_price,
            status,
            started_at,
            current_period_start,
            current_period_end,
            next_billing_date,
            billing_due_day,
            created_at,
            updated_at
        ) VALUES (
            v_tenant_id,
            p_plan_tier,
            v_price,
            50.00,
            'active',
            now(),
            now(),
            (now() + INTERVAL '30 days'),
            (CURRENT_DATE + INTERVAL '30 days')::date,
            COALESCE(p_billing_due_day, 10),
            now(),
            now()
        );

        INSERT INTO public.subscription_history (
            tenant_id,
            action,
            new_plan,
            new_price,
            reason,
            actor_id
        ) VALUES (
            v_tenant_id,
            'created',
            p_plan_tier,
            v_price,
            'Cadastro inicial da loja com plano ' || p_plan_tier,
            auth.uid()
        );
    ELSE
        -- Atualizar loja existente
        v_tenant_id := p_store_id;

        UPDATE public.tenants
        SET name = COALESCE(p_name, name),
            cnpj = COALESCE(p_cnpj, cnpj),
            responsible_name = COALESCE(p_responsible_name, responsible_name),
            city_ibge_code = COALESCE(p_city_ibge_code, city_ibge_code),
            city_name = COALESCE(p_city_name, city_name),
            state_uf = COALESCE(p_state_uf, state_uf),
            phone = COALESCE(p_phone, phone),
            whatsapp = COALESCE(p_whatsapp, whatsapp),
            email = COALESCE(p_email, email),
            plan_tier = p_plan_tier,
            is_routing_enabled = p_is_routing_enabled,
            updated_at = now()
        WHERE id = v_tenant_id;

        -- Atualizar assinatura
        INSERT INTO public.store_subscriptions (
            tenant_id,
            plan_tier,
            contracted_monthly_price,
            contracted_lead_price,
            status,
            billing_due_day,
            created_at,
            updated_at
        ) VALUES (
            v_tenant_id,
            p_plan_tier,
            v_price,
            50.00,
            'active',
            COALESCE(p_billing_due_day, 10),
            now(),
            now()
        )
        ON CONFLICT (tenant_id) DO UPDATE
        SET plan_tier = p_plan_tier,
            contracted_monthly_price = v_price,
            billing_due_day = COALESCE(p_billing_due_day, store_subscriptions.billing_due_day),
            updated_at = now();

        INSERT INTO public.subscription_history (
            tenant_id,
            action,
            new_plan,
            new_price,
            reason,
            actor_id
        ) VALUES (
            v_tenant_id,
            'plan_change',
            p_plan_tier,
            v_price,
            'Atualização cadastral e contratual da loja',
            auth.uid()
        );
    END IF;

    -- Cobertura regional
    IF p_covered_cities IS NOT NULL AND array_length(p_covered_cities, 1) > 0 THEN
        DELETE FROM public.store_coverage WHERE tenant_id = v_tenant_id;
        FOREACH v_city_code IN ARRAY p_covered_cities
        LOOP
            INSERT INTO public.store_coverage (
                tenant_id,
                city_ibge_code,
                priority_level,
                is_authorized,
                created_at
            ) VALUES (
                v_tenant_id,
                v_city_code,
                2,
                true,
                now()
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'store_id', v_tenant_id,
        'name', p_name,
        'plan_tier', p_plan_tier,
        'contracted_price', v_price
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_save_store_and_subscription FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_save_store_and_subscription TO authenticated, service_role;


-- 8. Restringir process_simulated_payment para garantir que lojistas regulares não consigam usá-la
CREATE OR REPLACE FUNCTION public.process_simulated_payment(
    p_invoice_id UUID,
    p_payment_method VARCHAR(30) DEFAULT 'pix'
)
RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: operação de simulação desativada para usuários regulares. Pagamentos devem ser registrados manualmente pela administração.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fatura não encontrada.');
    END IF;

    IF v_invoice.status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'already_paid',
            'invoice_id', p_invoice_id,
            'invoice_number', v_invoice.invoice_number,
            'paid_at', v_invoice.paid_at
        );
    END IF;

    -- Atualizar fatura para 'paid' e sincronizar amount_paid
    UPDATE public.invoices
    SET amount_paid = total_due,
        status = 'paid',
        paid_at = now(),
        payment_method = p_payment_method,
        updated_at = now()
    WHERE id = p_invoice_id;

    -- Atualizar entregas de lead correspondentes para 'paid'
    UPDATE public.lead_deliveries
    SET delivery_status = 'paid'
    WHERE invoice_id = p_invoice_id;

    -- Se a loja estava com assinatura atrasada, reativar
    UPDATE public.store_subscriptions
    SET status = 'active',
        updated_at = now()
    WHERE tenant_id = v_invoice.tenant_id
      AND status = 'past_due';

    RETURN jsonb_build_object(
        'success', true,
        'status', 'paid',
        'invoice_id', p_invoice_id,
        'invoice_number', v_invoice.invoice_number,
        'total_due', v_invoice.total_due,
        'amount_paid', v_invoice.total_due,
        'balance_due', 0.00
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 9. Atualizar get_admin_financial_metrics para cobrir toda a gestão manual
CREATE OR REPLACE FUNCTION public.get_admin_financial_metrics()
RETURNS JSONB AS $$
DECLARE
    v_total_mrr NUMERIC(12,2) := 0.00;
    v_projected_arr NUMERIC(12,2) := 0.00;
    v_total_variable_revenue NUMERIC(12,2) := 0.00;
    v_total_invoiced NUMERIC(12,2) := 0.00;
    v_total_collected NUMERIC(12,2) := 0.00;
    v_total_receivables NUMERIC(12,2) := 0.00;
    v_overdue_amount NUMERIC(12,2) := 0.00;
    v_overdue_count INTEGER := 0;
    v_active_stores INTEGER := 0;
    v_suspended_stores INTEGER := 0;
    v_basic_count INTEGER := 0;
    v_pro_count INTEGER := 0;
    v_near_due_count INTEGER := 0;
    v_stores_revenue JSONB;
    v_competence_history JSONB;
    v_recent_payments JSONB;
    v_invoices_list JSONB;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: indicadores financeiros são restritos a administradores da plataforma.' USING ERRCODE = '42501';
    END IF;

    -- 1. MRR e Assinaturas
    SELECT 
        COALESCE(SUM(contracted_monthly_price) FILTER (WHERE status = 'active'), 0.00),
        COUNT(*) FILTER (WHERE status = 'active'),
        COUNT(*) FILTER (WHERE status = 'suspended'),
        COUNT(*) FILTER (WHERE status = 'active' AND plan_tier = 'basic'),
        COUNT(*) FILTER (WHERE status = 'active' AND plan_tier = 'pro'),
        COUNT(*) FILTER (WHERE status = 'active' AND next_billing_date <= (CURRENT_DATE + INTERVAL '7 days')::date)
    INTO v_total_mrr, v_active_stores, v_suspended_stores, v_basic_count, v_pro_count, v_near_due_count
    FROM public.store_subscriptions;

    v_projected_arr := v_total_mrr * 12;

    -- 2. Receita Variável por Leads (total entregue faturável)
    SELECT COALESCE(SUM(unit_cost), 0.00)
    INTO v_total_variable_revenue
    FROM public.lead_deliveries
    WHERE is_billable = true;

    -- 3. Faturamento Emitido, Total Registrado como Recebido e Saldo em Aberto
    SELECT
        COALESCE(SUM(total_due), 0.00),
        COALESCE(SUM(amount_paid), 0.00),
        COALESCE(SUM(GREATEST(total_due - amount_paid, 0.00)), 0.00),
        COALESCE(SUM(GREATEST(total_due - amount_paid, 0.00)) FILTER (WHERE status = 'past_due' OR (status IN ('pending', 'partially_paid') AND due_date < CURRENT_DATE)), 0.00),
        COUNT(*) FILTER (WHERE status = 'past_due' OR (status IN ('pending', 'partially_paid') AND due_date < CURRENT_DATE))
    INTO
        v_total_invoiced,
        v_total_collected,
        v_total_receivables,
        v_overdue_amount,
        v_overdue_count
    FROM public.invoices;

    -- 4. Faturamento e Situação por Loja
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'storeId', t.id,
                'storeName', t.name,
                'cityName', t.city_name,
                'planTier', t.plan_tier,
                'contractedPrice', COALESCE(s.contracted_monthly_price, 119.90),
                'mrr', CASE WHEN s.status = 'active' THEN COALESCE(s.contracted_monthly_price, 119.90) ELSE 0.00 END,
                'dueDay', COALESCE(s.billing_due_day, 10),
                'nextBillingDate', s.next_billing_date,
                'subscriptionStatus', COALESCE(s.status, 'active'),
                'isRoutingEnabled', t.is_routing_enabled,
                'leadsCount', t.leads_count_cache,
                'leadsBilled', COALESCE(t.leads_count_cache * 50.00, 0.00),
                'totalBilled', COALESCE((SELECT SUM(total_due) FROM public.invoices inv WHERE inv.tenant_id = t.id), 0.00),
                'totalPaid', COALESCE((SELECT SUM(amount_paid) FROM public.invoices inv WHERE inv.tenant_id = t.id), 0.00),
                'balanceDue', COALESCE((SELECT SUM(GREATEST(total_due - amount_paid, 0.00)) FROM public.invoices inv WHERE inv.tenant_id = t.id), 0.00),
                'status', t.status
            )
            ORDER BY t.name ASC
        ),
        '[]'::jsonb
    ) INTO v_stores_revenue
    FROM public.tenants t
    LEFT JOIN public.store_subscriptions s ON s.tenant_id = t.id;

    -- 5. Histórico por Competência
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'competence', competence_month,
                'invoiced', total_month,
                'collected', paid_month,
                'invoicesCount', count_month
            )
            ORDER BY competence_month DESC
        ),
        '[]'::jsonb
    ) INTO v_competence_history
    FROM (
        SELECT 
            competence_month,
            SUM(total_due) AS total_month,
            SUM(amount_paid) AS paid_month,
            COUNT(*) AS count_month
        FROM public.invoices
        GROUP BY competence_month
    ) hist;

    -- 6. Recentes Comprovantes de Pagamentos Manuais Registrados
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', p.id,
                'invoiceId', p.invoice_id,
                'invoiceNumber', inv.invoice_number,
                'storeId', p.tenant_id,
                'storeName', t.name,
                'amountPaid', p.amount_paid,
                'paymentDate', p.payment_date,
                'paymentMethod', p.payment_method,
                'externalReference', p.external_reference,
                'notes', p.notes,
                'createdAt', p.created_at
            )
            ORDER BY p.payment_date DESC
        ),
        '[]'::jsonb
    ) INTO v_recent_payments
    FROM (
        SELECT * FROM public.invoice_payments ORDER BY payment_date DESC LIMIT 20
    ) p
    JOIN public.invoices inv ON inv.id = p.invoice_id
    JOIN public.tenants t ON t.id = p.tenant_id;

    -- 7. Lista detalhada de Faturas para o Administrador
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', inv.id,
                'invoiceNumber', inv.invoice_number,
                'storeId', inv.tenant_id,
                'storeName', t.name,
                'competenceMonth', inv.competence_month,
                'subscriptionAmount', inv.subscription_amount,
                'leadsAmount', inv.leads_amount,
                'leadsCount', inv.leads_count,
                'adjustmentsAmount', inv.adjustments_amount,
                'totalDue', inv.total_due,
                'amountPaid', inv.amount_paid,
                'balanceDue', GREATEST(inv.total_due - inv.amount_paid, 0.00),
                'dueDate', inv.due_date,
                'status', inv.status,
                'paidAt', inv.paid_at,
                'paymentMethod', inv.payment_method,
                'createdAt', inv.created_at,
                'paymentsCount', (SELECT COUNT(*) FROM public.invoice_payments ip WHERE ip.invoice_id = inv.id)
            )
            ORDER BY inv.created_at DESC
        ),
        '[]'::jsonb
    ) INTO v_invoices_list
    FROM public.invoices inv
    JOIN public.tenants t ON t.id = inv.tenant_id;

    RETURN jsonb_build_object(
        'success', true,
        'mrr', v_total_mrr,
        'arr', v_projected_arr,
        'variable_revenue', v_total_variable_revenue,
        'total_invoiced', v_total_invoiced,
        'total_collected', v_total_collected,
        'total_receivables', v_total_receivables,
        'overdue_amount', v_overdue_amount,
        'overdue_count', v_overdue_count,
        'active_stores_count', v_active_stores,
        'suspended_stores_count', v_suspended_stores,
        'near_due_count', v_near_due_count,
        'plans_breakdown', jsonb_build_object(
            'basic', v_basic_count,
            'pro', v_pro_count
        ),
        'stores_breakdown', v_stores_revenue,
        'competence_history', v_competence_history,
        'recent_payments', v_recent_payments,
        'invoices_list', v_invoices_list
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 10. Atualizar get_store_financial_overview para o Portal do Lojista
CREATE OR REPLACE FUNCTION public.get_store_financial_overview(
    p_tenant_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_effective_tenant_id UUID;
    v_is_admin BOOLEAN;
    v_sub RECORD;
    v_invoices JSONB;
    v_billable_leads_count INTEGER := 0;
    v_billable_leads_amount NUMERIC(10,2) := 0.00;
    v_total_paid NUMERIC(10,2) := 0.00;
    v_total_pending NUMERIC(10,2) := 0.00;
BEGIN
    v_is_admin := public.is_platform_admin();

    IF v_is_admin AND p_tenant_id IS NOT NULL THEN
        v_effective_tenant_id := p_tenant_id;
    ELSE
        v_effective_tenant_id := public.current_tenant_id();
    END IF;

    IF v_effective_tenant_id IS NULL AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Acesso negado: sessão não vinculada a uma loja.' USING ERRCODE = '42501';
    END IF;

    -- Obter assinatura
    SELECT * INTO v_sub
    FROM public.store_subscriptions
    WHERE tenant_id = v_effective_tenant_id
    ORDER BY created_at DESC LIMIT 1;

    -- Contagem de leads faturáveis da loja
    SELECT 
        COUNT(*),
        COALESCE(SUM(unit_cost), 0.00)
    INTO v_billable_leads_count, v_billable_leads_amount
    FROM public.lead_deliveries
    WHERE tenant_id = v_effective_tenant_id
      AND is_billable = true;

    -- Faturas da loja com recibos manuais vinculados
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', inv.id,
                'invoiceNumber', inv.invoice_number,
                'competenceMonth', inv.competence_month,
                'subscriptionAmount', inv.subscription_amount,
                'leadsAmount', inv.leads_amount,
                'leadsCount', inv.leads_count,
                'adjustmentsAmount', inv.adjustments_amount,
                'totalDue', inv.total_due,
                'amountPaid', inv.amount_paid,
                'balanceDue', GREATEST(inv.total_due - inv.amount_paid, 0.00),
                'dueDate', inv.due_date,
                'status', inv.status,
                'paidAt', inv.paid_at,
                'paymentMethod', inv.payment_method,
                'items', (
                    SELECT COALESCE(
                        jsonb_agg(
                            jsonb_build_object(
                                'id', itm.id,
                                'type', itm.item_type,
                                'description', itm.description,
                                'quantity', itm.quantity,
                                'unitPrice', itm.unit_price,
                                'totalPrice', itm.total_price
                            )
                        ), '[]'::jsonb
                    )
                    FROM public.invoice_items itm
                    WHERE itm.invoice_id = inv.id
                ),
                'payments', (
                    SELECT COALESCE(
                        jsonb_agg(
                            jsonb_build_object(
                                'id', ip.id,
                                'amountPaid', ip.amount_paid,
                                'paymentDate', ip.payment_date,
                                'paymentMethod', ip.payment_method,
                                'externalReference', ip.external_reference,
                                'notes', ip.notes
                            )
                            ORDER BY ip.payment_date DESC
                        ), '[]'::jsonb
                    )
                    FROM public.invoice_payments ip
                    WHERE ip.invoice_id = inv.id
                )
            )
            ORDER BY inv.created_at DESC
        ),
        '[]'::jsonb
    ) INTO v_invoices
    FROM public.invoices inv
    WHERE inv.tenant_id = v_effective_tenant_id;

    -- Totais de faturas
    SELECT 
        COALESCE(SUM(amount_paid), 0.00),
        COALESCE(SUM(GREATEST(total_due - amount_paid, 0.00)), 0.00)
    INTO v_total_paid, v_total_pending
    FROM public.invoices
    WHERE tenant_id = v_effective_tenant_id;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_effective_tenant_id,
        'subscription', jsonb_build_object(
            'id', v_sub.id,
            'plan_tier', COALESCE(v_sub.plan_tier, 'basic'),
            'monthly_price', COALESCE(v_sub.contracted_monthly_price, 119.90),
            'status', COALESCE(v_sub.status, 'active'),
            'due_day', COALESCE(v_sub.billing_due_day, 10),
            'next_billing_date', COALESCE(v_sub.next_billing_date, CURRENT_DATE + 30)
        ),
        'billable_leads', jsonb_build_object(
            'count', v_billable_leads_count,
            'amount', v_billable_leads_amount
        ),
        'totals', jsonb_build_object(
            'total_paid', v_total_paid,
            'total_pending', v_total_pending
        ),
        'invoices', v_invoices
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
