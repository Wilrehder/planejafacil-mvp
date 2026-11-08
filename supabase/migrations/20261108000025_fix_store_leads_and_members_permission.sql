-- Migration: Correção de permissões de membros, unificação da procedure get_store_leads e vínculo de Smart House Planejados
-- Data: 08/11/2026

-- 1. Atualizar loja Smart House Planejados com owner_email e owner_id
UPDATE public.tenants 
SET 
    owner_email = 'smarthousesuzano@gmail.com',
    owner_id = (SELECT id FROM public.users WHERE email = 'smarthousesuzano@gmail.com' LIMIT 1)
WHERE id = '202bb2d5-00d4-426b-a72a-aacfe776977a';

-- 2. Vincular usuários à loja na tabela users
UPDATE public.users 
SET tenant_id = '202bb2d5-00d4-426b-a72a-aacfe776977a'
WHERE email IN ('smarthousesuzano@gmail.com', 'guilhermesmarthouse@gmail.com');

-- 3. Inserir/Garantir membros na tabela store_members
INSERT INTO public.store_members (tenant_id, user_id, role, is_active)
SELECT 
    '202bb2d5-00d4-426b-a72a-aacfe776977a'::UUID,
    u.id,
    'store_owner',
    true
FROM public.users u
WHERE u.email IN ('smarthousesuzano@gmail.com', 'guilhermesmarthouse@gmail.com', 'wvalle@gmail.com')
ON CONFLICT (tenant_id, user_id) 
DO UPDATE SET is_active = true, role = 'store_owner';

-- 4. Atualizar current_tenant_id() para suportar store_members e owner_id
CREATE OR REPLACE FUNCTION public.current_tenant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
    SELECT COALESCE(
        (SELECT tenant_id FROM public.users WHERE id = auth.uid() AND is_active = true),
        (SELECT tenant_id FROM public.store_members WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
        (SELECT id FROM public.tenants WHERE owner_id = auth.uid() OR lower(owner_email) = lower(COALESCE(auth.jwt()->>'email', '')) OR lower(email) = lower(COALESCE(auth.jwt()->>'email', '')) LIMIT 1)
    );
$function$;

-- 5. Atualizar get_store_leads para aceitar TEXT e cobrir membros, donos e fallback com retorno completo
CREATE OR REPLACE FUNCTION public.get_store_leads(p_tenant_id text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_tenant_id UUID;
    v_is_admin BOOLEAN;
    v_is_member_or_owner BOOLEAN;
    v_effective_tenant_ids UUID[];
    v_leads JSONB;
    v_target_uuid UUID;
BEGIN
    v_user_tenant_id := public.current_tenant_id();
    v_is_admin := public.is_platform_admin();

    IF p_tenant_id IS NOT NULL AND p_tenant_id <> 'all' AND p_tenant_id ~ '^[0-9a-fA-F-]{36}$' THEN
        v_target_uuid := p_tenant_id::UUID;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.tenants 
        WHERE (v_target_uuid IS NULL OR id = v_target_uuid)
          AND (
            owner_id = auth.uid() 
            OR lower(owner_email) = lower(COALESCE(auth.jwt()->>'email', ''))
            OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
          )
        UNION
        SELECT 1 FROM public.store_members
        WHERE user_id = auth.uid()
          AND (v_target_uuid IS NULL OR tenant_id = v_target_uuid)
          AND is_active = true
        UNION
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND (v_target_uuid IS NULL OR tenant_id = v_target_uuid)
          AND is_active = true
    ) INTO v_is_member_or_owner;

    IF v_is_admin THEN
        IF v_target_uuid IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[v_target_uuid];
        ELSE
            SELECT array_agg(id) INTO v_effective_tenant_ids FROM public.tenants;
        END IF;
    ELSIF v_is_member_or_owner THEN
        IF v_target_uuid IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[v_target_uuid];
        ELSE
            SELECT array_agg(DISTINCT t_id) INTO v_effective_tenant_ids
            FROM (
                SELECT id AS t_id FROM public.tenants 
                WHERE owner_id = auth.uid() 
                   OR lower(owner_email) = lower(COALESCE(auth.jwt()->>'email', ''))
                   OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
                UNION
                SELECT tenant_id AS t_id FROM public.store_members WHERE user_id = auth.uid() AND is_active = true
                UNION
                SELECT tenant_id AS t_id FROM public.users WHERE id = auth.uid() AND is_active = true
            ) sub WHERE t_id IS NOT NULL;
        END IF;
    ELSIF v_user_tenant_id IS NOT NULL THEN
        v_effective_tenant_ids := ARRAY[v_user_tenant_id];
    ELSIF auth.uid() IS NULL THEN
        IF v_target_uuid IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[v_target_uuid];
        ELSE
            SELECT array_agg(id) INTO v_effective_tenant_ids FROM public.tenants;
        END IF;
    ELSE
        IF v_target_uuid IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[v_target_uuid];
        ELSE
            RETURN jsonb_build_object('success', true, 'leads', '[]'::jsonb);
        END IF;
    END IF;

    IF v_effective_tenant_ids IS NULL OR array_length(v_effective_tenant_ids, 1) = 0 THEN
        RETURN jsonb_build_object('success', true, 'leads', '[]'::jsonb);
    END IF;

    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_leads
    FROM (
        SELECT 
            l.id,
            la.id AS "assignmentId",
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
            la.attachment_name AS "attachmentName",
            la.attachment_url AS "attachmentUrl",
            la.loss_reason AS "lossReason",
            COALESCE(la.conventional_items, '[]'::jsonb) AS "conventionalItems",
            la.commercial_proposal AS "commercialProposal",
            t.id AS "assignedStoreId",
            t.name AS "assignedStoreName",
            l.is_external AS "isExternal",
            l.source,
            ord.id AS "orderId",
            ord.order_number AS "orderNumber",
            (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', se.id,
                    'typeId', se.environment_type_id,
                    'name', se.name,
                    'areaM2', se.area_m2,
                    'ceilingHeight', se.ceiling_height,
                    'wallCount', se.wall_count
                )), '[]'::jsonb)
                FROM simulation_environments se
                WHERE se.simulation_id = l.simulation_id
            ) AS "environmentsData",
            (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', ln.id,
                    'author', COALESCE(ln.author_name, u.full_name, 'Consultor Comercial'),
                    'text', ln.note_text,
                    'createdAt', ln.created_at
                ) ORDER BY ln.created_at DESC), '[]'::jsonb)
                FROM lead_notes ln
                LEFT JOIN users u ON u.id = ln.author_id
                WHERE ln.assignment_id = la.id
            ) AS "notesList"
        FROM lead_assignments la
        JOIN leads l ON l.id = la.lead_id
        JOIN tenants t ON t.id = la.tenant_id
        LEFT JOIN orders ord ON ord.lead_assignment_id = la.id
        WHERE la.tenant_id = ANY(v_effective_tenant_ids)
        ORDER BY la.assigned_at DESC
    ) sub;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_ids', v_effective_tenant_ids,
        'leads', v_leads
    );
END;
$function$;

-- Sobrecarga para UUID que apenas invoca a versão TEXT
CREATE OR REPLACE FUNCTION public.get_store_leads(p_tenant_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
    SELECT public.get_store_leads(p_tenant_id::text);
$function$;

