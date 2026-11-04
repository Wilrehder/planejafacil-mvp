-- =============================================================================
-- MIGRATION: 20261103000019_fix_pre_contract_billing_cycles.sql
-- DESCRIÇÃO: Ajusta get_admin_billing_hub para que lojas criadas em meses posteriores
--            não apareçam como "em atraso" ou cobrando mensalidade em competências
--            anteriores à sua data de credenciamento/assinatura (status 'not_enrolled').
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_billing_hub(
    p_competence_month VARCHAR(7) DEFAULT to_char(CURRENT_DATE, 'YYYY-MM')
)
RETURNS JSONB AS $$
DECLARE
    v_competence VARCHAR(7);
    v_stores JSONB;
    v_total_projected NUMERIC(12,2) := 0.00;
    v_total_collected NUMERIC(12,2) := 0.00;
    v_total_pending NUMERIC(12,2) := 0.00;
    v_total_overdue NUMERIC(12,2) := 0.00;
    v_active_stores_count INT := 0;
    v_open_count INT := 0;
    v_closed_count INT := 0;
    v_paid_count INT := 0;
    v_overdue_count INT := 0;
    v_not_enrolled_count INT := 0;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores da plataforma podem acessar o painel financeiro.' USING ERRCODE = '42501';
    END IF;

    v_competence := COALESCE(p_competence_month, to_char(CURRENT_DATE, 'YYYY-MM'));

    -- Montar estrutura detalhada de cada loja parceira para o mês requisitado
    SELECT COALESCE(jsonb_agg(store_row), '[]'::jsonb)
    INTO v_stores
    FROM (
        SELECT 
            t.id AS store_id,
            t.name AS store_name,
            t.city_name,
            t.state_uf,
            COALESCE(t.plan_tier, 'pro') AS plan_tier,
            COALESCE(t.responsible_name, 'Responsável') AS responsible_name,
            COALESCE(t.phone, '') AS phone,
            COALESCE(t.whatsapp, t.phone, '') AS whatsapp,
            t.email AS store_email,
            t.status AS store_status,
            COALESCE(sub.billing_due_day, 10) AS billing_due_day,
            
            -- Informações de ingresso / contratação
            to_char(COALESCE(sub.started_at, t.created_at), 'YYYY-MM') AS enrolled_month,
            to_char(COALESCE(sub.started_at, t.created_at), 'DD/MM/YYYY') AS enrolled_date,
            
            -- Mensalidade Contratada (Zera se a loja ainda não existia nesta competência)
            CASE 
                WHEN inv.id IS NULL AND v_competence < to_char(COALESCE(sub.started_at, t.created_at), 'YYYY-MM') THEN 0.00
                ELSE COALESCE(sub.contracted_monthly_price, CASE WHEN t.plan_tier = 'basic' THEN 119.90 ELSE 219.90 END)
            END AS monthly_fee,
            
            -- Data de Vencimento e Fechamento no mês
            CASE
                WHEN inv.id IS NULL AND v_competence < to_char(COALESCE(sub.started_at, t.created_at), 'YYYY-MM') THEN NULL
                ELSE (v_competence || '-' || lpad(LEAST(COALESCE(sub.billing_due_day, 10), 28)::text, 2, '0'))::date
            END AS due_date,
            
            CASE
                WHEN inv.id IS NULL AND v_competence < to_char(COALESCE(sub.started_at, t.created_at), 'YYYY-MM') THEN NULL
                ELSE ((v_competence || '-' || lpad(LEAST(COALESCE(sub.billing_due_day, 10), 28)::text, 2, '0'))::date - INTERVAL '7 days')::date
            END AS cutoff_date,
            
            -- Dados da Fatura existente (se houver)
            inv.id AS invoice_id,
            inv.invoice_number,
            COALESCE(inv.amount_paid, 0.00) AS amount_paid,
            inv.paid_at,
            inv.payment_method,
            
            -- Leads do ciclo
            COALESCE(leads_data.leads_count, 0) AS leads_count,
            COALESCE(leads_data.leads_amount, 0.00) AS leads_amount,
            COALESCE(leads_data.leads_list, '[]'::jsonb) AS leads_list,
            
            -- Total devido (Zera se a loja ainda não existia e não tem fatura)
            CASE 
                WHEN inv.id IS NULL AND v_competence < to_char(COALESCE(sub.started_at, t.created_at), 'YYYY-MM') THEN 0.00
                ELSE COALESCE(inv.total_due, (COALESCE(sub.contracted_monthly_price, CASE WHEN t.plan_tier = 'basic' THEN 119.90 ELSE 219.90 END) + COALESCE(leads_data.leads_amount, 0.00)))
            END AS total_due,
            
            -- Saldo em aberto
            CASE 
                WHEN inv.id IS NULL AND v_competence < to_char(COALESCE(sub.started_at, t.created_at), 'YYYY-MM') THEN 0.00
                ELSE GREATEST(COALESCE(inv.total_due, (COALESCE(sub.contracted_monthly_price, CASE WHEN t.plan_tier = 'basic' THEN 119.90 ELSE 219.90 END) + COALESCE(leads_data.leads_amount, 0.00))) - COALESCE(inv.amount_paid, 0.00), 0.00)
            END AS balance_due,
            
            -- Status do ciclo
            CASE 
                WHEN inv.id IS NULL AND v_competence < to_char(COALESCE(sub.started_at, t.created_at), 'YYYY-MM') THEN 'not_enrolled'
                WHEN inv.status = 'paid' OR (inv.amount_paid IS NOT NULL AND inv.amount_paid >= inv.total_due AND inv.total_due > 0) THEN 'paid'
                WHEN CURRENT_DATE > (v_competence || '-' || lpad(LEAST(COALESCE(sub.billing_due_day, 10), 28)::text, 2, '0'))::date THEN 'overdue'
                WHEN CURRENT_DATE >= ((v_competence || '-' || lpad(LEAST(COALESCE(sub.billing_due_day, 10), 28)::text, 2, '0'))::date - INTERVAL '7 days')::date THEN 'closed'
                ELSE 'open'
            END AS cycle_status,
            
            -- Último pagamento Pix
            (
                SELECT jsonb_build_object(
                    'amount', ip.amount_paid,
                    'date', ip.payment_date,
                    'reference', ip.external_reference,
                    'method', ip.payment_method
                )
                FROM public.invoice_payments ip
                WHERE ip.tenant_id = t.id
                ORDER BY ip.payment_date DESC
                LIMIT 1
            ) AS last_payment
            
        FROM public.tenants t
        LEFT JOIN public.store_subscriptions sub ON sub.tenant_id = t.id
        LEFT JOIN public.invoices inv ON inv.tenant_id = t.id AND inv.competence_month = v_competence
        LEFT JOIN LATERAL (
            SELECT 
                COUNT(*)::int AS leads_count,
                COALESCE(SUM(ld.unit_cost), 0.00) AS leads_amount,
                jsonb_agg(
                    jsonb_build_object(
                        'id', l.id,
                        'name', l.name,
                        'phone', l.phone,
                        'city', l.city_name,
                        'environment', l.environment_summary,
                        'deliveredAt', ld.created_at,
                        'cost', ld.unit_cost
                    ) ORDER BY ld.created_at DESC
                ) AS leads_list
            FROM public.lead_deliveries ld
            JOIN public.lead_assignments la ON la.id = ld.assignment_id
            JOIN public.leads l ON l.id = la.lead_id
            WHERE ld.tenant_id = t.id
              AND ld.is_billable = true
              AND (
                  (inv.id IS NOT NULL AND ld.invoice_id = inv.id)
                  OR (inv.id IS NULL AND to_char(ld.created_at, 'YYYY-MM') = v_competence)
              )
        ) leads_data ON true
        ORDER BY t.name ASC
    ) store_row;

    -- Calcular agregados de resumo considerando apenas lojas credenciadas na competência
    IF v_stores IS NOT NULL AND jsonb_array_length(v_stores) > 0 THEN
        SELECT 
            COALESCE(SUM(CASE WHEN s->>'cycle_status' != 'not_enrolled' THEN (s->>'total_due')::numeric ELSE 0.00 END), 0.00),
            COALESCE(SUM((s->>'amount_paid')::numeric), 0.00),
            COALESCE(SUM(CASE WHEN s->>'cycle_status' != 'not_enrolled' THEN (s->>'balance_due')::numeric ELSE 0.00 END), 0.00),
            COALESCE(SUM(CASE WHEN s->>'cycle_status' = 'overdue' THEN (s->>'balance_due')::numeric ELSE 0.00 END), 0.00),
            COUNT(*) FILTER (WHERE s->>'cycle_status' != 'not_enrolled'),
            COUNT(*) FILTER (WHERE s->>'cycle_status' = 'open'),
            COUNT(*) FILTER (WHERE s->>'cycle_status' = 'closed'),
            COUNT(*) FILTER (WHERE s->>'cycle_status' = 'paid'),
            COUNT(*) FILTER (WHERE s->>'cycle_status' = 'overdue'),
            COUNT(*) FILTER (WHERE s->>'cycle_status' = 'not_enrolled')
        INTO 
            v_total_projected,
            v_total_collected,
            v_total_pending,
            v_total_overdue,
            v_active_stores_count,
            v_open_count,
            v_closed_count,
            v_paid_count,
            v_overdue_count,
            v_not_enrolled_count
        FROM jsonb_array_elements(v_stores) s;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'competence_month', v_competence,
        'summary', jsonb_build_object(
            'total_projected', v_total_projected,
            'total_collected', v_total_collected,
            'total_pending', v_total_pending,
            'total_overdue', v_total_overdue,
            'active_stores', v_active_stores_count,
            'open_count', v_open_count,
            'closed_count', v_closed_count,
            'paid_count', v_paid_count,
            'overdue_count', v_overdue_count,
            'not_enrolled_count', v_not_enrolled_count
        ),
        'stores', v_stores
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_admin_billing_hub(VARCHAR) TO authenticated, service_role;
