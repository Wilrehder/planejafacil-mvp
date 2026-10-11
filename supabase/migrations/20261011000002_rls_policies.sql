-- =============================================================================
-- MIGRATION: 20261011000002_rls_policies.sql
-- DESCRIÇÃO: Implementação de Row Level Security (RLS) e isolamento Multi-Tenant
-- =============================================================================

-- 1. FUNÇÕES AUXILIARES DE AUTENTICAÇÃO E CLAIMS (COM REVOGAÇÃO DINÂMICA EM TEMPO REAL)
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
  -- Prioriza consulta direta e dinâmica na tabela public.users para revogação instantânea de acesso.
  -- Se não autenticado via UID ou em fallback, consulta o JWT claims.
  SELECT COALESCE(
    (SELECT tenant_id FROM public.users WHERE id = auth.uid()),
    NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'store_id', '')::UUID
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_role()
RETURNS TEXT AS $$
  -- Prioriza consulta direta na tabela public.users para evitar brechas decorrentes de JWT claims obsoletas.
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id = auth.uid()),
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
    'anonymous'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT public.current_role() = 'platform_admin';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 2. HABILITAÇÃO DO RLS EM TODAS AS TABELAS
ALTER TABLE ibge_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS: CIDADES IBGE (Leitura Pública)
CREATE POLICY "ibge_cities_public_read" ON ibge_cities
FOR SELECT TO public
USING (true);

-- 4. POLÍTICAS: REGRAS DE PRECIFICAÇÃO
CREATE POLICY "pricing_rules_active_read" ON pricing_rules
FOR SELECT TO public
USING (is_active = true OR public.is_platform_admin());

CREATE POLICY "pricing_rules_admin_write" ON pricing_rules
FOR ALL TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- 5. POLÍTICAS: SIMULAÇÕES DO CONSUMIDOR (Criação anônima permitida)
CREATE POLICY "simulations_insert_public" ON simulations
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "simulations_select_owner_or_admin" ON simulations
FOR SELECT TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "sim_environments_insert_public" ON simulation_environments
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "sim_environments_select_admin" ON simulation_environments
FOR SELECT TO authenticated
USING (public.is_platform_admin());

-- 6. POLÍTICAS: TENANTS (ISOLAMENTO MULTI-TENANT)
CREATE POLICY "tenants_select_own" ON tenants
FOR SELECT TO authenticated
USING (id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY "tenants_update_own" ON tenants
FOR UPDATE TO authenticated
USING (id = public.current_tenant_id() OR public.is_platform_admin())
WITH CHECK (id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY "tenants_admin_all" ON tenants
FOR ALL TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- 7. POLÍTICAS: COBERTURA GEOGRÁFICA
CREATE POLICY "store_coverage_select" ON store_coverage
FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY "store_coverage_admin_manage" ON store_coverage
FOR ALL TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- 8. POLÍTICAS: USUÁRIOS
CREATE POLICY "users_select_same_tenant_or_self" ON users
FOR SELECT TO authenticated
USING (id = auth.uid() OR tenant_id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY "users_admin_manage" ON users
FOR ALL TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- 9. POLÍTICAS: LEADS & ATRIBUIÇÕES
CREATE POLICY "leads_insert_public" ON leads
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "leads_select_assigned" ON leads
FOR SELECT TO authenticated
USING (
    id IN (SELECT lead_id FROM lead_assignments WHERE tenant_id = public.current_tenant_id())
    OR owner_tenant_id = public.current_tenant_id()
    OR public.is_platform_admin()
);

CREATE POLICY "lead_assignments_select_own" ON lead_assignments
FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY "lead_assignments_update_own" ON lead_assignments
FOR UPDATE TO authenticated
USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin())
WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY "lead_notes_select_own" ON lead_notes
FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY "lead_notes_insert_own" ON lead_notes
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

-- 10. POLÍTICAS: FATURAMENTO PAY-PER-LEAD
CREATE POLICY "lead_deliveries_select_own" ON lead_deliveries
FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY "lead_deliveries_admin_manage" ON lead_deliveries
FOR ALL TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- 11. POLÍTICAS: PEDIDOS ERP (ISOLAMENTO MULTI-TENANT RIGOROSO)
CREATE POLICY "orders_select_own_tenant" ON orders
FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY "orders_insert_own_tenant" ON orders
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY "orders_update_own_tenant" ON orders
FOR UPDATE TO authenticated
USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin())
WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

-- 12. POLÍTICAS: DOCUMENTOS DA PASTA DIGITAL DO ERP
CREATE POLICY "order_documents_tenant_isolation" ON order_documents
FOR ALL TO authenticated
USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin())
WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

-- 13. POLÍTICAS: AUDITORIA DO ERP
CREATE POLICY "order_audit_logs_select" ON order_audit_logs
FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY "order_audit_logs_insert" ON order_audit_logs
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

-- 14. POLÍTICAS: CANDIDATURAS DE LOJAS
CREATE POLICY "partner_applications_insert_public" ON partner_applications
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "partner_applications_admin_manage" ON partner_applications
FOR ALL TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());
