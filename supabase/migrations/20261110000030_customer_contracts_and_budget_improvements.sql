-- ==============================================================================
-- MIGRAÇÃO: CONTRATOS DO CLIENTE, MULTI-MODALIDADES E CONFIGURAÇÃO POR LOJISTA
-- ==============================================================================

-- 1. Garantir colunas cadastrais em leads e orders
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS rg VARCHAR(30);

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS client_rg VARCHAR(30),
ADD COLUMN IF NOT EXISTS payment_allocations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS commercial_proposal JSONB,
ADD COLUMN IF NOT EXISTS order_notes TEXT,
ADD COLUMN IF NOT EXISTS contract_status VARCHAR(30) DEFAULT 'rascunho',
ADD COLUMN IF NOT EXISTS contract_token VARCHAR(64) UNIQUE,
ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS contract_signed_by_name TEXT,
ADD COLUMN IF NOT EXISTS contract_signed_by_cpf VARCHAR(20),
ADD COLUMN IF NOT EXISTS contract_signature_ip TEXT,
ADD COLUMN IF NOT EXISTS contract_signature_image TEXT,
ADD COLUMN IF NOT EXISTS contract_pdf_url TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_contract_token ON public.orders(contract_token);

-- 2. Tabela de Modelos e Cláusulas Contratuais por Loja Parceira
CREATE TABLE IF NOT EXISTS public.store_contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    company_name TEXT,
    trade_name TEXT,
    cnpj VARCHAR(30),
    address TEXT,
    phone VARCHAR(30),
    email TEXT,
    logo_url TEXT,
    default_delivery_days INT DEFAULT 45,
    clauses JSONB DEFAULT '[]'::jsonb,
    general_conditions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_contract_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'store_contract_templates' 
        AND policyname = 'store_contract_templates_tenant_policy'
    ) THEN
        CREATE POLICY store_contract_templates_tenant_policy ON public.store_contract_templates
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

GRANT ALL ON public.store_contract_templates TO authenticated, anon, service_role;

-- 3. Tabela de Auditoria e Assinaturas Digitais do Contrato
CREATE TABLE IF NOT EXISTS public.contract_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    signer_name TEXT NOT NULL,
    signer_cpf VARCHAR(20) NOT NULL,
    signer_ip TEXT,
    signer_user_agent TEXT,
    signature_image TEXT,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'contract_signatures' 
        AND policyname = 'contract_signatures_access_policy'
    ) THEN
        CREATE POLICY contract_signatures_access_policy ON public.contract_signatures
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

GRANT ALL ON public.contract_signatures TO authenticated, anon, service_role;

-- 4. Atualizar convert_lead_to_order para preservar payment_allocations, proposal e contract_token
CREATE OR REPLACE FUNCTION public.convert_lead_to_order(p_assignment_id uuid, p_total_value numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_assignment RECORD;
    v_lead RECORD;
    v_existing_order RECORD;
    v_order_id UUID;
    v_order_number VARCHAR(20);
    v_final_value NUMERIC(10,2);
    v_estimated_budget NUMERIC(10,2);
    v_user_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
    v_proposal_val NUMERIC(10,2);
    v_deadline_days INT := 45;
    v_contract_token VARCHAR(64);
    v_allocations JSONB := '[]'::jsonb;
    v_notes TEXT := '';
BEGIN
    v_user_id := auth.uid();
    
    SELECT * INTO v_assignment FROM lead_assignments WHERE id = p_assignment_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Atribuição de lead não encontrada.');
    END IF;

    IF v_assignment.tenant_id <> public.current_tenant_id() AND NOT public.is_platform_admin() AND auth.uid() IS NOT NULL THEN
        RAISE EXCEPTION 'Acesso negado: lead pertence a outra loja parceira.' USING ERRCODE = '42501';
    END IF;

    -- Verificar Idempotência
    SELECT * INTO v_existing_order FROM orders WHERE lead_assignment_id = p_assignment_id;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'already_converted',
            'order_id', v_existing_order.id,
            'order_number', v_existing_order.order_number,
            'total_value', v_existing_order.total_value,
            'contracted_value', v_existing_order.contracted_value,
            'current_stage', v_existing_order.current_stage,
            'contract_token', v_existing_order.contract_token,
            'message', 'Pedido já existente recuperado com sucesso.'
        );
    END IF;

    -- Obter Lead Original
    SELECT * INTO v_lead FROM leads WHERE id = v_assignment.lead_id;
    v_estimated_budget := ROUND((COALESCE(v_lead.estimated_min, 0) + COALESCE(v_lead.estimated_max, 0)) / 2);

    -- Tenta extrair valor da proposta comercial consolidada
    IF v_assignment.commercial_proposal IS NOT NULL THEN
        BEGIN
            v_proposal_val := NULLIF(v_assignment.commercial_proposal->>'finalOrderTotal', '')::NUMERIC;
            IF v_assignment.commercial_proposal->'paymentAllocations' IS NOT NULL THEN
                v_allocations := v_assignment.commercial_proposal->'paymentAllocations';
            END IF;
            IF v_assignment.commercial_proposal->>'notes' IS NOT NULL THEN
                v_notes := v_assignment.commercial_proposal->>'notes';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_proposal_val := NULL;
        END;
    END IF;

    IF p_total_value IS NOT NULL AND p_total_value > 0 THEN
        v_final_value := p_total_value;
    ELSIF v_proposal_val IS NOT NULL AND v_proposal_val > 0 THEN
        v_final_value := v_proposal_val;
    ELSIF v_assignment.agreed_value IS NOT NULL AND v_assignment.agreed_value > 0 THEN
        v_final_value := v_assignment.agreed_value;
    ELSIF v_lead.estimated_max IS NOT NULL AND v_lead.estimated_max > 0 THEN
        v_final_value := v_lead.estimated_max;
    ELSIF v_estimated_budget > 0 THEN
        v_final_value := v_estimated_budget;
    ELSE
        v_final_value := 0.00;
    END IF;

    -- Determinar prazo em dias
    IF v_lead.desired_deadline IS NOT NULL AND v_lead.desired_deadline ~ '[0-9]+' THEN
        BEGIN
            v_deadline_days := (regexp_replace(v_lead.desired_deadline, '[^0-9]', '', 'g'))::INT;
            IF v_deadline_days <= 0 OR v_deadline_days > 365 THEN
                v_deadline_days := 45;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_deadline_days := 45;
        END;
    END IF;

    v_user_name := COALESCE(
        (SELECT full_name FROM users WHERE id = v_user_id),
        'Operador Comercial'
    );
    v_user_role := COALESCE(
        (SELECT role FROM users WHERE id = v_user_id),
        'store_operator'
    );

    v_order_number := 'PED-' || nextval('order_number_seq')::TEXT;
    v_contract_token := encode(gen_random_bytes(24), 'hex');

    INSERT INTO orders (
        order_number,
        tenant_id,
        lead_assignment_id,
        client_name,
        client_phone,
        client_cpf,
        client_rg,
        billing_address,
        installation_address,
        desired_deadline,
        delivery_address,
        environment_description,
        total_value,
        contracted_value,
        estimated_budget,
        payment_allocations,
        commercial_proposal,
        order_notes,
        contract_status,
        contract_token,
        target_delivery_date,
        current_stage,
        created_at,
        updated_at
    ) VALUES (
        v_order_number,
        v_assignment.tenant_id,
        p_assignment_id,
        v_lead.name,
        COALESCE(v_lead.whatsapp, v_lead.phone),
        v_lead.cpf,
        v_lead.rg,
        v_lead.billing_address,
        v_lead.installation_address,
        v_lead.desired_deadline,
        COALESCE(v_lead.installation_address, v_lead.city_name || ' - ' || v_lead.state_uf, 'Endereço a confirmar'),
        COALESCE(v_lead.environment_summary, 'Ambiente Planejado'),
        v_final_value,
        v_final_value,
        v_estimated_budget,
        v_allocations,
        v_assignment.commercial_proposal,
        v_notes,
        'rascunho',
        v_contract_token,
        (CURRENT_DATE + (v_deadline_days || ' days')::INTERVAL),
        'medicao',
        now(),
        now()
    ) RETURNING id INTO v_order_id;

    -- Auditoria inicial
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
        v_order_id,
        v_assignment.tenant_id,
        v_user_id,
        v_user_name,
        v_user_role,
        format('Pedido criado a partir de conversão comercial com valor contratado de R$ %s.', v_final_value),
        NULL,
        'medicao',
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_value', v_final_value,
        'contracted_value', v_final_value,
        'current_stage', 'medicao',
        'contract_token', v_contract_token,
        'message', 'Pedido gerado e enviado para a esteira de medição do ERP!'
    );
END;
$function$;

