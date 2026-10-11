-- =============================================================================
-- MIGRATION: 20261011000012_phase5_finance_and_subscriptions.sql
-- DESCRIÇÃO: Fase 5 - Módulo Financeiro, Assinaturas e Monetização SaaS:
--            1. Flexibilização da regra de transição do CRM (avanço para 'orcado' sem PDF).
--            2. Tabela de configuração administrativa de exigências documentais do ERP.
--            3. Precificação versionada (Planos Básico/Pro e Pay-Per-Lead R$ 50).
--            4. Assinaturas das Lojas com histórico de alterações e ciclo de vida.
--            5. Rastreabilidade de leads faturáveis com idempotência e congelamento de preço.
--            6. Faturas consolidadas por competência mensal (#FAT-YYYYMM-XXXX).
--            7. Registro e idempotência de webhooks de pagamento.
--            8. Métricas financeiras em tempo real (MRR, ARR, inadimplência).
--            9. Isolamento estrito Multi-Tenant e segurança financeira.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CONFIGURAÇÃO DE EXIGÊNCIAS DOCUMENTAIS DO ERP (CONFIGURÁVEL PELO ADMIN)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.erp_stage_rules (
    stage VARCHAR(30) PRIMARY KEY,
    stage_label TEXT NOT NULL,
    document_required BOOLEAN NOT NULL DEFAULT true,
    required_doc_type VARCHAR(50),
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir regras padrão do ERP
INSERT INTO public.erp_stage_rules (stage, stage_label, document_required, required_doc_type, description)
VALUES 
    ('medicao', 'Medição Técnica', true, 'ficha_medicao', 'Exige ficha técnica de medição antes de avançar para projeto'),
    ('projeto_aprovacao', 'Projeto & Aprovação', true, 'projeto_aprovado', 'Exige projeto executivo 3D aprovado pelo cliente'),
    ('producao', 'Produção na Marcenaria', false, 'plano_corte', 'Documentação de produção opcional'),
    ('montagem', 'Montagem na Obra', true, 'foto_montagem', 'Exige fotos da montagem finalizada no local'),
    ('entrega_aceite', 'Entrega e Aceite', true, 'termo_aceite', 'Exige termo de aceite formal assinado')
ON CONFLICT (stage) DO UPDATE 
SET stage_label = EXCLUDED.stage_label,
    description = EXCLUDED.description;

-- Procedimento para o Administrador alterar a exigência de documento em qualquer etapa
CREATE OR REPLACE FUNCTION public.admin_toggle_erp_stage_rule(
    p_stage VARCHAR(30),
    p_document_required BOOLEAN
)
RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores da plataforma podem alterar exigências do ERP.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.erp_stage_rules
    SET document_required = p_document_required,
        updated_at = now()
    WHERE stage = p_stage;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Etapa não encontrada no ERP.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'stage', p_stage,
        'document_required', p_document_required
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_toggle_erp_stage_rule(VARCHAR, BOOLEAN) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_toggle_erp_stage_rule(VARCHAR, BOOLEAN) TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 2. AJUSTE DA REGRA COMERCIAL DO CRM (FLEXIBILIZAÇÃO PARA 'ORÇADO')
-- -----------------------------------------------------------------------------
-- Substitui a procedure da Fase 3: permite avançar para 'orcado' mesmo sem PDF,
-- registrando no histórico se houve proposta anexada ou se foi negociação assistida.
CREATE OR REPLACE FUNCTION public.update_lead_stage(
    p_assignment_id UUID,
    p_new_status VARCHAR(20),
    p_loss_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_tenant_id UUID;
    v_is_admin BOOLEAN;
    v_assignment RECORD;
    v_lead RECORD;
    v_user_name TEXT;
    v_author_id UUID;
    v_note_text TEXT;
BEGIN
    v_user_tenant_id := public.current_tenant_id();
    v_is_admin := public.is_platform_admin();
    v_author_id := auth.uid();

    SELECT * INTO v_assignment 
    FROM lead_assignments 
    WHERE id = p_assignment_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Atribuição de lead não encontrada.');
    END IF;

    -- Validar isolamento tenant
    IF NOT v_is_admin AND (v_user_tenant_id IS NULL OR v_assignment.tenant_id <> v_user_tenant_id) THEN
        RAISE EXCEPTION 'Acesso negado: Este lead pertence a outro lojista.' USING ERRCODE = '42501';
    END IF;

    -- Validar status permitidos
    IF p_new_status NOT IN ('novo', 'em_atendimento', 'orcado', 'convertido', 'perdido') THEN
        RAISE EXCEPTION 'Status comercial inválido.' USING ERRCODE = '22023';
    END IF;

    -- Obter nome do operador
    SELECT full_name INTO v_user_name FROM users WHERE id = v_author_id;
    IF v_user_name IS NULL THEN
        v_user_name := 'Consultor Lojista';
    END IF;

    -- Atualizar estágio
    UPDATE lead_assignments
    SET status = p_new_status,
        loss_reason = CASE WHEN p_new_status = 'perdido' THEN p_loss_reason ELSE loss_reason END,
        updated_at = now()
    WHERE id = p_assignment_id;

    -- Montar descrição do histórico comercial
    IF p_new_status = 'orcado' THEN
        IF v_assignment.attachment_name IS NOT NULL THEN
            v_note_text := 'Estágio comercial alterado para "Orçado" com proposta técnica anexada (' || v_assignment.attachment_name || ').';
        ELSE
            v_note_text := 'Estágio comercial alterado para "Orçado" (negociação assistida sem anexo digital inicial).';
        END IF;
    ELSIF p_new_status = 'convertido' THEN
        v_note_text := 'Venda Fechada! Lead marcado como convertido e pronto para encaminhamento ao ERP.';
    ELSIF p_new_status = 'perdido' THEN
        v_note_text := 'Negociação encerrada como Perdida.' || CASE WHEN p_loss_reason IS NOT NULL THEN ' Motivo: ' || p_loss_reason ELSE '' END;
    ELSE
        v_note_text := 'Estágio comercial alterado de "' || v_assignment.status || '" para "' || p_new_status || '".';
    END IF;

    -- Registrar evento no histórico de atendimento (lead_notes)
    INSERT INTO lead_notes (
        assignment_id,
        tenant_id,
        author_id,
        author_name,
        note_text,
        created_at
    ) VALUES (
        p_assignment_id,
        v_assignment.tenant_id,
        v_author_id,
        v_user_name,
        v_note_text,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'assignment_id', p_assignment_id,
        'previous_status', v_assignment.status,
        'new_status', p_new_status,
        'has_attachment', (v_assignment.attachment_name IS NOT NULL)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.update_lead_stage(UUID, VARCHAR, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_lead_stage(UUID, VARCHAR, TEXT) TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 3. ATUALIZAÇÃO DO AVANÇO DE ETAPA DO ERP PARA CONSULTAR REGRAS DINÂMICAS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.advance_order_stage(
    p_order_id UUID,
    p_target_stage VARCHAR(30),
    p_action_message TEXT DEFAULT NULL,
    p_stage_notes TEXT DEFAULT NULL,
    p_stage_confirmation BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_doc_count INTEGER;
    v_user_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
    v_stage_order TEXT[] := ARRAY['medicao', 'projeto_aprovacao', 'producao', 'montagem', 'entrega_aceite', 'concluido'];
    v_current_idx INTEGER;
    v_target_idx INTEGER;
    v_is_doc_required BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
    END IF;

    -- Isolamento Multi-tenant estrito
    IF v_order.tenant_id <> public.current_tenant_id() AND NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: pedido pertence a outra loja parceira.' USING ERRCODE = '42501';
    END IF;

    -- Validação de ordem das etapas
    v_current_idx := array_position(v_stage_order, v_order.current_stage);
    v_target_idx := array_position(v_stage_order, p_target_stage);

    IF v_current_idx IS NULL OR v_target_idx IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Etapa inválida no fluxo do ERP.');
    END IF;

    -- Bloqueio de salto de etapas (deve ser estritamente sequencial +1)
    IF v_target_idx <> v_current_idx + 1 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Avanço inválido: a transição de etapas deve ser estritamente sequencial (etapa atual: ' || v_order.current_stage || ' -> pretendida: ' || p_target_stage || ').'
        );
    END IF;

    -- Consultar se a etapa atual possui exigência de documento configurada no banco
    SELECT COALESCE(document_required, true) INTO v_is_doc_required
    FROM public.erp_stage_rules
    WHERE stage = v_order.current_stage;

    IF v_is_doc_required IS NULL THEN
        v_is_doc_required := true;
    END IF;

    -- Gating condicionado à configuração do banco
    IF v_is_doc_required THEN
        -- 1 -> 2: Medição para Projeto & Aprovação
        IF v_order.current_stage = 'medicao' AND p_target_stage = 'projeto_aprovacao' THEN
            SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'medicao';
            IF v_doc_count = 0 AND NOT v_order.medicao_done THEN
                RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Ficha técnica de medição obrigatória não anexada.');
            END IF;

        -- 2 -> 3: Projeto & Aprovação para Produção
        ELSIF v_order.current_stage = 'projeto_aprovacao' AND p_target_stage = 'producao' THEN
            SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'projeto';
            IF (v_doc_count = 0 AND NOT v_order.project_approved) OR (NOT v_order.project_approved AND NOT p_stage_confirmation) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Projeto executivo/3D e confirmação de aprovação do cliente obrigatórios.');
            END IF;

        -- 4 -> 5: Montagem para Entrega / Aceite
        ELSIF v_order.current_stage = 'montagem' AND p_target_stage = 'entrega_aceite' THEN
            SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'montagem';
            IF v_doc_count = 0 AND NOT v_order.montagem_done THEN
                RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Fotos da montagem finalizada obrigatórias não anexadas.');
            END IF;

        -- 5 -> 6: Entrega / Aceite para Concluído
        ELSIF v_order.current_stage = 'entrega_aceite' AND p_target_stage = 'concluido' THEN
            SELECT COUNT(*) INTO v_doc_count FROM order_documents WHERE order_id = p_order_id AND stage = 'aceite';
            IF (v_doc_count = 0 AND NOT v_order.client_confirmed_aceite) AND NOT p_stage_confirmation THEN
                RETURN jsonb_build_object('success', false, 'error', 'Bloqueio de avanço: Termo de aceite assinado ou confirmação formal do cliente obrigatória.');
            END IF;
        END IF;
    END IF;

    v_user_name := COALESCE(
        (SELECT full_name FROM users WHERE id = v_user_id),
        'Operador ERP'
    );
    v_user_role := COALESCE(
        (SELECT role FROM users WHERE id = v_user_id),
        'store_operator'
    );

    -- Atualizar pedido
    UPDATE orders
    SET current_stage = p_target_stage,
        stage_notes = COALESCE(p_stage_notes, stage_notes),
        completed_at = CASE WHEN p_target_stage = 'concluido' THEN now() ELSE completed_at END,
        updated_at = now()
    WHERE id = p_order_id;

    -- Registrar auditoria
    INSERT INTO order_audit_logs (
        order_id,
        tenant_id,
        user_id,
        user_name,
        user_role,
        action_message,
        stage_from,
        stage_to,
        created_at
    ) VALUES (
        p_order_id,
        v_order.tenant_id,
        v_user_id,
        v_user_name,
        v_user_role,
        COALESCE(p_action_message, 'Etapa avançada de ' || v_order.current_stage || ' para ' || p_target_stage || '.'),
        v_order.current_stage,
        p_target_stage,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'previous_stage', v_order.current_stage,
        'current_stage', p_target_stage
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.advance_order_stage(UUID, VARCHAR, TEXT, TEXT, BOOLEAN) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.advance_order_stage(UUID, VARCHAR, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 4. TABELA DE PRECIFICAÇÃO VERSIONADA DO SAAS (PLANOS E PAY-PER-LEAD)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saas_pricing_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('basic', 'pro')),
    monthly_price NUMERIC(10,2) NOT NULL,
    lead_price NUMERIC(10,2) NOT NULL DEFAULT 50.00,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir precificação oficial v1
INSERT INTO public.saas_pricing_schedules (plan_tier, monthly_price, lead_price, version, is_active, features)
VALUES 
    ('basic', 119.90, 50.00, 1, true, '["CRM Completo", "Distribuição Inteligente P1/P2/P3", "Gestão de Leads", "Notificações de Orçamento"]'::jsonb),
    ('pro', 219.90, 50.00, 1, true, '["Tudo do Básico", "ERP Operacional Completo", "Pasta Digital de Documentos", "Cadastro Ilimitado de Leads Externos", "Analytics Avançado"]'::jsonb)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_saas_pricing_active ON public.saas_pricing_schedules (plan_tier, is_active);


-- -----------------------------------------------------------------------------
-- 5. ASSINATURAS DAS LOJAS COM CICLO DE VIDA E RASTREAMENTO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('basic', 'pro')),
    contracted_monthly_price NUMERIC(10,2) NOT NULL,
    contracted_lead_price NUMERIC(10,2) NOT NULL DEFAULT 50.00,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'expired', 'suspended')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
    next_billing_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    canceled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    gateway_provider VARCHAR(50) DEFAULT 'sandbox',
    gateway_subscription_id TEXT,
    gateway_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.store_subscriptions (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_bill ON public.store_subscriptions (next_billing_date, status);

-- Histórico de auditoria de assinaturas
CREATE TABLE IF NOT EXISTS public.subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.store_subscriptions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    old_plan VARCHAR(20),
    new_plan VARCHAR(20),
    old_price NUMERIC(10,2),
    new_price NUMERIC(10,2),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    performed_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_history_tenant ON public.subscription_history (tenant_id, created_at DESC);

-- Inicializar assinaturas ativas para todas as lojas existentes
INSERT INTO public.store_subscriptions (
    tenant_id, 
    plan_tier, 
    contracted_monthly_price, 
    contracted_lead_price, 
    status,
    next_billing_date
)
SELECT 
    t.id, 
    t.plan_tier,
    CASE WHEN t.plan_tier = 'pro' THEN 219.90 ELSE 119.90 END,
    50.00,
    'active',
    (CURRENT_DATE + INTERVAL '30 days')
FROM public.tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM public.store_subscriptions s WHERE s.tenant_id = t.id
);


-- -----------------------------------------------------------------------------
-- 6. POLÍTICA DE INADIMPLÊNCIA E CONFIGURAÇÃO FINANCEIRA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_financial_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    grace_period_days INTEGER NOT NULL DEFAULT 5,
    auto_suspend_routing BOOLEAN NOT NULL DEFAULT true,
    block_portal_access BOOLEAN NOT NULL DEFAULT false,
    lead_dispute_window_days INTEGER NOT NULL DEFAULT 7,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.platform_financial_settings (id, grace_period_days, auto_suspend_routing, block_portal_access, lead_dispute_window_days)
VALUES (1, 5, true, false, 7)
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 7. AMPLIAÇÃO DE LEAD_DELIVERIES (RASTREAMENTO DE COBRANÇA E CONGELAMENTO)
-- -----------------------------------------------------------------------------
ALTER TABLE public.lead_deliveries
    ADD COLUMN IF NOT EXISTS pricing_schedule_id UUID REFERENCES public.saas_pricing_schedules(id),
    ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(30) NOT NULL DEFAULT 'delivered' CHECK (delivery_status IN ('delivered', 'eligible_for_billing', 'invoiced', 'paid', 'disputed', 'canceled', 'refunded')),
    ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
    ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_deliveries_idempotency ON public.lead_deliveries (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_deliveries_status ON public.lead_deliveries (tenant_id, delivery_status);


-- -----------------------------------------------------------------------------
-- 8. FATURAS CONSOLIDADAS (#FAT-YYYYMM-XXXX) E ITENS FINANCEIROS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(35) UNIQUE NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.store_subscriptions(id),
    competence_month VARCHAR(7) NOT NULL, -- Ex: '2026-10'
    subscription_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    leads_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    leads_count INTEGER NOT NULL DEFAULT 0,
    adjustments_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_due NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'canceled', 'refunded')),
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(30), -- 'pix', 'boleto', 'credit_card', 'test_sandbox'
    gateway_provider VARCHAR(50) DEFAULT 'sandbox',
    gateway_invoice_id TEXT,
    gateway_payment_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tenant_competence UNIQUE (tenant_id, competence_month)
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_competence ON public.invoices (competence_month, status);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    item_type VARCHAR(30) NOT NULL CHECK (item_type IN ('subscription', 'pay_per_lead', 'adjustment', 'credit')),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    source_lead_delivery_id UUID REFERENCES public.lead_deliveries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items (invoice_id);


-- -----------------------------------------------------------------------------
-- 9. LOG E IDEMPOTÊNCIA DE WEBHOOKS DE PAGAMENTO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_provider VARCHAR(50) NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_webhook_provider_event UNIQUE (gateway_provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events (status, created_at DESC);


-- -----------------------------------------------------------------------------
-- 10. ATUALIZAÇÃO DO MOTOR DE DISTRIBUIÇÃO COM CONGELAMENTO DE PREÇO
-- -----------------------------------------------------------------------------
-- Atualiza a procedure assign_lead_round_robin para congelar o preço do lead
-- a partir da tabela saas_pricing_schedules ativa no instante do evento.
CREATE OR REPLACE FUNCTION public.assign_lead_round_robin(p_lead_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_lead RECORD;
    v_chosen_tenant_id UUID;
    v_reason VARCHAR(30);
    v_assignment_id UUID;
    v_current_lead_price NUMERIC(10,2);
    v_pricing_schedule_id UUID;
BEGIN
    SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lead não encontrado.');
    END IF;

    -- Obter preço vigente do lead na tabela versionada
    SELECT id, lead_price INTO v_pricing_schedule_id, v_current_lead_price
    FROM saas_pricing_schedules
    WHERE is_active = true
    ORDER BY version DESC
    LIMIT 1;

    IF v_current_lead_price IS NULL THEN
        v_current_lead_price := 50.00;
    END IF;

    -- PRIORIDADE 1: Lojas ativas no mesmo município
    SELECT id INTO v_chosen_tenant_id
    FROM tenants
    WHERE city_ibge_code = v_lead.city_ibge_code
      AND status = 'ativa'
      AND is_routing_enabled = true
    ORDER BY leads_count_cache ASC, last_assigned_at ASC NULLS FIRST
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
        v_reason := 'p1_local';
    ELSE
        -- PRIORIDADE 2: Lojas autorizadas na store_coverage
        SELECT t.id INTO v_chosen_tenant_id
        FROM tenants t
        JOIN store_coverage sc ON sc.tenant_id = t.id
        WHERE sc.covered_city_ibge = v_lead.city_ibge_code
          AND sc.is_authorized = true
          AND t.status = 'ativa'
          AND t.is_routing_enabled = true
        ORDER BY t.leads_count_cache ASC, t.last_assigned_at ASC NULLS FIRST
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

        IF FOUND THEN
            v_reason := 'p2_regional';
        END IF;
    END IF;

    -- PRIORIDADE 3: Sem Cobertura
    IF v_chosen_tenant_id IS NULL THEN
        UPDATE leads
        SET distribution_status = 'sem_cobertura',
            updated_at = now()
        WHERE id = p_lead_id;

        RETURN jsonb_build_object(
            'success', true,
            'lead_id', p_lead_id,
            'status', 'sem_cobertura',
            'assigned_tenant_id', NULL,
            'priority', 'p3_sem_cobertura'
        );
    END IF;

    -- Gravar Atribuição com lock idempotente
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

    -- Registrar evento contábil Pay-Per-Lead APENAS para leads faturáveis da plataforma
    -- Leads externos nunca geram cobrança!
    IF NOT v_lead.is_external THEN
        INSERT INTO lead_deliveries (
            assignment_id,
            tenant_id,
            unit_cost,
            is_billable,
            pricing_schedule_id,
            delivery_status,
            idempotency_key
        ) VALUES (
            v_assignment_id,
            v_chosen_tenant_id,
            v_current_lead_price,
            true,
            v_pricing_schedule_id,
            'eligible_for_billing',
            'delv_' || v_assignment_id::TEXT
        )
        ON CONFLICT (assignment_id) DO NOTHING;
    END IF;

    -- Atualizar contador atômico da loja
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
        'lead_id', p_lead_id,
        'status', 'atribuido',
        'assigned_tenant_id', v_chosen_tenant_id,
        'assignment_id', v_assignment_id,
        'priority', v_reason,
        'unit_cost', v_current_lead_price
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Também atualizar route_and_assign_lead (invocada pelo submit_consumer_simulation)
CREATE OR REPLACE FUNCTION public.route_and_assign_lead(p_lead_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_lead RECORD;
    v_chosen_tenant_id UUID;
    v_chosen_tenant_name TEXT;
    v_reason VARCHAR(30);
    v_assignment_id UUID;
    v_current_lead_price NUMERIC(10,2);
    v_pricing_schedule_id UUID;
BEGIN
    -- 1. Obter informações do Lead
    SELECT * INTO v_lead FROM leads WHERE id = p_lead_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lead não encontrado.');
    END IF;

    -- Se já estiver atribuído, retornar a atribuição existente (idempotência)
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

    -- Obter preço vigente do lead na tabela versionada
    SELECT id, lead_price INTO v_pricing_schedule_id, v_current_lead_price
    FROM saas_pricing_schedules
    WHERE is_active = true
    ORDER BY version DESC
    LIMIT 1;

    IF v_current_lead_price IS NULL THEN
        v_current_lead_price := 50.00;
    END IF;

    -- 1.1 Lock consultivo transacional por município
    PERFORM pg_advisory_xact_lock(hashtext('lead_route_city_' || v_lead.city_ibge_code));

    -- =========================================================================
    -- PRIORIDADE 1: Lojas sediadas no MESMO MUNICÍPIO (Código IBGE)
    -- Round Robin Estrito: Ordena por quem foi atendido há mais tempo (last_assigned_at)
    -- =========================================================================
    SELECT t.id, t.name INTO v_chosen_tenant_id, v_chosen_tenant_name
    FROM tenants t
    WHERE t.city_ibge_code = v_lead.city_ibge_code
      AND t.status = 'ativa'
      AND t.is_routing_enabled = true
      AND NOT EXISTS (
        SELECT 1 FROM store_subscriptions sub
        WHERE sub.tenant_id = t.id AND sub.status = 'suspended'
      )
    ORDER BY t.last_assigned_at ASC NULLS FIRST, t.created_at ASC
    LIMIT 1
    FOR UPDATE OF t;

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
          AND NOT EXISTS (
            SELECT 1 FROM store_subscriptions sub
            WHERE sub.tenant_id = t.id AND sub.status = 'suspended'
          )
        ORDER BY sc.priority_level ASC, t.last_assigned_at ASC NULLS FIRST, t.created_at ASC
        LIMIT 1
        FOR UPDATE OF t;

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
            'lead_id', p_lead_id,
            'tenant_id', NULL,
            'tenant_name', NULL,
            'assignment_reason', 'p3_sem_cobertura',
            'message', 'Nenhuma loja elegível no município ou com cobertura autorizada.'
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

    -- Registrar evento contábil Pay-Per-Lead APENAS para leads faturáveis da plataforma
    IF NOT COALESCE(v_lead.is_external, false) THEN
        INSERT INTO lead_deliveries (
            assignment_id,
            tenant_id,
            unit_cost,
            is_billable,
            pricing_schedule_id,
            delivery_status,
            idempotency_key
        ) VALUES (
            v_assignment_id,
            v_chosen_tenant_id,
            v_current_lead_price,
            true,
            v_pricing_schedule_id,
            'eligible_for_billing',
            'delv_' || v_assignment_id::TEXT
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
        'lead_id', p_lead_id,
        'assignment_id', v_assignment_id,
        'tenant_id', v_chosen_tenant_id,
        'tenant_name', v_chosen_tenant_name,
        'assignment_reason', v_reason,
        'unit_cost', v_current_lead_price,
        'is_billable', NOT COALESCE(v_lead.is_external, false)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- -----------------------------------------------------------------------------
-- 11. GERAÇÃO IDEMPOTENTE DE FATURAS MENSAIS (GENERATE_MONTHLY_INVOICE)
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
    v_delivery RECORD;
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
    ELSE
        v_sub_amount := v_subscription.contracted_monthly_price;
    END IF;

    -- Calcular data de vencimento padrão: dia 10 do mês seguinte à competência
    v_due_date := (to_date(p_competence_month || '-01', 'YYYY-MM-DD') + INTERVAL '1 month' + INTERVAL '9 days')::date;

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
            'invoice_status', v_existing_invoice.status
        );
    END IF;

    -- Somar leads faturáveis ainda não vinculados a faturas na competência
    SELECT 
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(unit_cost), 0.00)
    INTO v_leads_count, v_leads_amount
    FROM public.lead_deliveries
    WHERE tenant_id = p_tenant_id
      AND is_billable = true
      AND invoice_id IS NULL
      AND to_char(created_at, 'YYYY-MM') = p_competence_month;

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
          AND to_char(created_at, 'YYYY-MM') = p_competence_month;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'created',
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'total_due', v_total_due,
        'competence_month', p_competence_month,
        'subscription_amount', v_sub_amount,
        'leads_amount', v_leads_amount,
        'leads_count', v_leads_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.generate_monthly_invoice(UUID, VARCHAR) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.generate_monthly_invoice(UUID, VARCHAR) TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 12. ALTERAÇÃO DE PLANO DE ASSINATURA DA LOJA (CHANGE_STORE_PLAN)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.change_store_plan(
    p_tenant_id UUID,
    p_new_plan VARCHAR(20),
    p_custom_price NUMERIC(10,2) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_subscription RECORD;
    v_old_plan VARCHAR(20);
    v_old_price NUMERIC(10,2);
    v_new_price NUMERIC(10,2);
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF NOT public.is_platform_admin() AND public.current_tenant_id() <> p_tenant_id THEN
        RAISE EXCEPTION 'Acesso negado: não é permitido alterar plano de outra loja.' USING ERRCODE = '42501';
    END IF;

    IF p_new_plan NOT IN ('basic', 'pro') THEN
        RAISE EXCEPTION 'Plano inválido. Apenas "basic" e "pro" são permitidos.' USING ERRCODE = '22023';
    END IF;

    -- Obter preço de tabela ativo para o novo plano
    IF p_custom_price IS NOT NULL AND p_custom_price > 0 THEN
        v_new_price := p_custom_price;
    ELSE
        SELECT monthly_price INTO v_new_price
        FROM public.saas_pricing_schedules
        WHERE plan_tier = p_new_plan AND is_active = true
        ORDER BY version DESC LIMIT 1;
        
        IF v_new_price IS NULL THEN
            v_new_price := CASE WHEN p_new_plan = 'pro' THEN 219.90 ELSE 119.90 END;
        END IF;
    END IF;

    SELECT * INTO v_subscription
    FROM public.store_subscriptions
    WHERE tenant_id = p_tenant_id
    ORDER BY created_at DESC LIMIT 1;

    IF FOUND THEN
        v_old_plan := v_subscription.plan_tier;
        v_old_price := v_subscription.contracted_monthly_price;

        UPDATE public.store_subscriptions
        SET plan_tier = p_new_plan,
            contracted_monthly_price = v_new_price,
            updated_at = now()
        WHERE id = v_subscription.id;

        -- Registrar histórico imutável
        INSERT INTO public.subscription_history (
            subscription_id,
            tenant_id,
            action,
            old_plan,
            new_plan,
            old_price,
            new_price,
            performed_by,
            notes
        ) VALUES (
            v_subscription.id,
            p_tenant_id,
            'plan_changed',
            v_old_plan,
            p_new_plan,
            v_old_price,
            v_new_price,
            v_user_id,
            'Plano atualizado para ' || p_new_plan || ' com mensalidade de R$ ' || to_char(v_new_price, 'FM999G999D00')
        );
    ELSE
        INSERT INTO public.store_subscriptions (
            tenant_id,
            plan_tier,
            contracted_monthly_price,
            status
        ) VALUES (
            p_tenant_id,
            p_new_plan,
            v_new_price,
            'active'
        );
    END IF;

    -- Sincronizar na tabela tenants
    UPDATE public.tenants
    SET plan_tier = p_new_plan,
        updated_at = now()
    WHERE id = p_tenant_id;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', p_tenant_id,
        'old_plan', v_old_plan,
        'new_plan', p_new_plan,
        'monthly_price', v_new_price
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.change_store_plan(UUID, VARCHAR, NUMERIC) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.change_store_plan(UUID, VARCHAR, NUMERIC) TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 13. PROCESSAMENTO SIMULADO DE PAGAMENTO DE FATURA (TEST/SANDBOX)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_simulated_payment(
    p_invoice_id UUID,
    p_payment_method VARCHAR(30) DEFAULT 'pix'
)
RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
    v_user_tenant_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    v_user_tenant_id := public.current_tenant_id();
    v_is_admin := public.is_platform_admin();

    SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fatura não encontrada.');
    END IF;

    -- Lojista comum NÃO pode marcar fatura arbitrária como paga (somente simulação autorizada ou admin)
    IF NOT v_is_admin AND (v_user_tenant_id IS NULL OR v_invoice.tenant_id <> v_user_tenant_id) THEN
        RAISE EXCEPTION 'Acesso negado: operação não autorizada.' USING ERRCODE = '42501';
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

    -- Atualizar fatura para 'paid'
    UPDATE public.invoices
    SET status = 'paid',
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

    -- Reabilitar distribuição de leads da loja caso estivesse suspensa
    UPDATE public.tenants
    SET is_routing_enabled = true,
        updated_at = now()
    WHERE id = v_invoice.tenant_id
      AND is_routing_enabled = false;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'paid',
        'invoice_id', p_invoice_id,
        'invoice_number', v_invoice.invoice_number,
        'total_paid', v_invoice.total_due,
        'payment_method', p_payment_method,
        'paid_at', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.process_simulated_payment(UUID, VARCHAR) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.process_simulated_payment(UUID, VARCHAR) TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 14. PROCESSAMENTO SEGURO E IDEMPOTENTE DE WEBHOOKS DE PAGAMENTO
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_webhook_event(
    p_provider VARCHAR(50),
    p_event_id TEXT,
    p_event_type TEXT,
    p_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_existing_event RECORD;
    v_invoice_number TEXT;
    v_invoice_id UUID;
BEGIN
    -- Verificar evento já recebido (Idempotência Estrita anti-replay)
    SELECT * INTO v_existing_event
    FROM public.webhook_events
    WHERE gateway_provider = p_provider
      AND event_id = p_event_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'duplicate_ignored',
            'event_id', p_event_id,
            'message', 'Evento de webhook repetido já processado anteriormente.'
        );
    END IF;

    -- Registrar recebimento do webhook
    INSERT INTO public.webhook_events (
        gateway_provider,
        event_id,
        event_type,
        payload,
        status,
        created_at
    ) VALUES (
        p_provider,
        p_event_id,
        p_event_type,
        p_payload,
        'received',
        now()
    );

    -- Tratar confirmação de pagamento
    IF p_event_type IN ('PAYMENT_CONFIRMED', 'payment_intent.succeeded', 'invoice.paid') THEN
        v_invoice_number := p_payload->>'invoice_number';

        IF v_invoice_number IS NOT NULL THEN
            SELECT id INTO v_invoice_id FROM public.invoices WHERE invoice_number = v_invoice_number;

            IF v_invoice_id IS NOT NULL THEN
                PERFORM public.process_simulated_payment(v_invoice_id, COALESCE(p_payload->>'payment_method', 'webhook'));
                
                UPDATE public.webhook_events
                SET status = 'processed',
                    processed_at = now()
                WHERE gateway_provider = p_provider AND event_id = p_event_id;

                RETURN jsonb_build_object(
                    'success', true,
                    'status', 'processed',
                    'event_id', p_event_id,
                    'invoice_number', v_invoice_number
                );
            END IF;
        END IF;
    END IF;

    UPDATE public.webhook_events
    SET status = 'processed',
        processed_at = now()
    WHERE gateway_provider = p_provider AND event_id = p_event_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'recorded',
        'event_id', p_event_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.process_webhook_event(VARCHAR, TEXT, TEXT, JSONB) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.process_webhook_event(VARCHAR, TEXT, TEXT, JSONB) TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 15. INDICADORES FINANCEIROS DO ADMINISTRADOR (GET_ADMIN_FINANCIAL_METRICS)
-- -----------------------------------------------------------------------------
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
    v_basic_count INTEGER := 0;
    v_pro_count INTEGER := 0;
    v_stores_revenue JSONB;
    v_competence_history JSONB;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: indicadores financeiros são restritos a administradores da plataforma.' USING ERRCODE = '42501';
    END IF;

    -- 1. MRR e Assinaturas Ativas
    SELECT 
        COALESCE(SUM(contracted_monthly_price), 0.00),
        COUNT(*),
        COUNT(*) FILTER (WHERE plan_tier = 'basic'),
        COUNT(*) FILTER (WHERE plan_tier = 'pro')
    INTO v_total_mrr, v_active_stores, v_basic_count, v_pro_count
    FROM public.store_subscriptions
    WHERE status = 'active';

    v_projected_arr := v_total_mrr * 12;

    -- 2. Receita Variável por Leads (total de leads faturáveis entregues)
    SELECT COALESCE(SUM(unit_cost), 0.00)
    INTO v_total_variable_revenue
    FROM public.lead_deliveries
    WHERE is_billable = true;

    -- 3. Faturamento, Recebimento e Inadimplência
    SELECT
        COALESCE(SUM(total_due), 0.00),
        COALESCE(SUM(total_due) FILTER (WHERE status = 'paid'), 0.00),
        COALESCE(SUM(total_due) FILTER (WHERE status IN ('pending', 'overdue')), 0.00),
        COALESCE(SUM(total_due) FILTER (WHERE status = 'overdue' OR (status = 'pending' AND due_date < CURRENT_DATE)), 0.00),
        COUNT(*) FILTER (WHERE status = 'overdue' OR (status = 'pending' AND due_date < CURRENT_DATE))
    INTO
        v_total_invoiced,
        v_total_collected,
        v_total_receivables,
        v_overdue_amount,
        v_overdue_count
    FROM public.invoices;

    -- 4. Faturamento por Loja
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'storeId', t.id,
                'storeName', t.name,
                'cityName', t.city_name,
                'planTier', t.plan_tier,
                'mrr', COALESCE(s.contracted_monthly_price, 119.90),
                'leadsCount', t.leads_count_cache,
                'leadsBilled', COALESCE(t.leads_count_cache * 50.00, 0.00),
                'totalBilled', COALESCE((SELECT SUM(total_due) FROM public.invoices inv WHERE inv.tenant_id = t.id), 0.00),
                'totalPaid', COALESCE((SELECT SUM(total_due) FROM public.invoices inv WHERE inv.tenant_id = t.id AND inv.status = 'paid'), 0.00),
                'status', t.status
            )
            ORDER BY t.name ASC
        ),
        '[]'::jsonb
    ) INTO v_stores_revenue
    FROM public.tenants t
    LEFT JOIN public.store_subscriptions s ON s.tenant_id = t.id AND s.status = 'active';

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
            SUM(total_due) FILTER (WHERE status = 'paid') AS paid_month,
            COUNT(*) AS count_month
        FROM public.invoices
        GROUP BY competence_month
    ) hist;

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
        'plans_breakdown', jsonb_build_object(
            'basic', v_basic_count,
            'pro', v_pro_count
        ),
        'stores_breakdown', v_stores_revenue,
        'competence_history', v_competence_history
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_admin_financial_metrics() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_admin_financial_metrics() TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 16. PORTAL FINANCEIRO DO LOJISTA (GET_STORE_FINANCIAL_OVERVIEW)
-- -----------------------------------------------------------------------------
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

    -- Obter assinatura ativa
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

    -- Faturas da loja
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', inv.id,
                'invoiceNumber', inv.invoice_number,
                'competenceMonth', inv.competence_month,
                'subscriptionAmount', inv.subscription_amount,
                'leadsAmount', inv.leads_amount,
                'leadsCount', inv.leads_count,
                'totalDue', inv.total_due,
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
        COALESCE(SUM(total_due) FILTER (WHERE status = 'paid'), 0.00),
        COALESCE(SUM(total_due) FILTER (WHERE status IN ('pending', 'overdue')), 0.00)
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

REVOKE EXECUTE ON FUNCTION public.get_store_financial_overview(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_store_financial_overview(UUID) TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 17. POLÍTICAS DE ROW LEVEL SECURITY (RLS) PARA AS NOVAS TABELAS
-- -----------------------------------------------------------------------------
ALTER TABLE public.saas_pricing_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_stage_rules ENABLE ROW LEVEL SECURITY;

-- saas_pricing_schedules: Leitura pública autenticada, modificação apenas admin
CREATE POLICY "pricing_schedules_select_auth" ON public.saas_pricing_schedules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "pricing_schedules_admin_all" ON public.saas_pricing_schedules
    FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- erp_stage_rules: Leitura autenticada, alteração apenas admin
CREATE POLICY "erp_stage_rules_select_auth" ON public.erp_stage_rules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "erp_stage_rules_admin_all" ON public.erp_stage_rules
    FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- store_subscriptions: Loja só vê sua própria assinatura; admin vê todas
CREATE POLICY "subscriptions_select_tenant" ON public.store_subscriptions
    FOR SELECT TO authenticated
    USING (public.is_platform_admin() OR tenant_id = public.current_tenant_id());

CREATE POLICY "subscriptions_admin_manage" ON public.store_subscriptions
    FOR ALL TO authenticated
    USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- subscription_history: Loja vê seu próprio histórico; admin vê tudo
CREATE POLICY "sub_history_select_tenant" ON public.subscription_history
    FOR SELECT TO authenticated
    USING (public.is_platform_admin() OR tenant_id = public.current_tenant_id());

CREATE POLICY "sub_history_admin_manage" ON public.subscription_history
    FOR ALL TO authenticated
    USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- invoices: Lojista de Suzano JAMAIS vê faturas de Mogi!
CREATE POLICY "invoices_select_tenant" ON public.invoices
    FOR SELECT TO authenticated
    USING (public.is_platform_admin() OR tenant_id = public.current_tenant_id());

CREATE POLICY "invoices_admin_manage" ON public.invoices
    FOR ALL TO authenticated
    USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- invoice_items: Vinculado à fatura da loja
CREATE POLICY "invoice_items_select_tenant" ON public.invoice_items
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin() OR 
        EXISTS (
            SELECT 1 FROM public.invoices inv 
            WHERE inv.id = invoice_items.invoice_id 
              AND inv.tenant_id = public.current_tenant_id()
        )
    );

CREATE POLICY "invoice_items_admin_manage" ON public.invoice_items
    FOR ALL TO authenticated
    USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- webhook_events: Apenas admin e service_role
CREATE POLICY "webhooks_admin_manage" ON public.webhook_events
    FOR ALL TO authenticated
    USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- platform_financial_settings: Leitura para authenticated, edição admin
CREATE POLICY "settings_select_auth" ON public.platform_financial_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "settings_admin_manage" ON public.platform_financial_settings
    FOR ALL TO authenticated
    USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
