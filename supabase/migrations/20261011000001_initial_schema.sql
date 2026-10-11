-- =============================================================================
-- MIGRATION: 20261011000001_initial_schema.sql
-- DESCRIÇÃO: Criação da estrutura de dados principal do SaaS PlanejaFácil
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA CANÔNICA DE MUNICÍPIOS (IBGE)
CREATE TABLE IF NOT EXISTS ibge_cities (
    ibge_code VARCHAR(7) PRIMARY KEY,
    name TEXT NOT NULL,
    state_uf VARCHAR(2) NOT NULL,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ibge_cities_uf_name ON ibge_cities (state_uf, name);

-- 2. TABELA DE TENANTS (LOJAS PARCEIRAS / MARCENARIAS CREDENCIADAS)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    responsible_name TEXT NOT NULL,
    city_ibge_code VARCHAR(7) NOT NULL REFERENCES ibge_cities(ibge_code),
    city_name TEXT NOT NULL,
    state_uf VARCHAR(2) NOT NULL,
    address TEXT,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    email TEXT NOT NULL,
    plan_tier VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (plan_tier IN ('basic', 'pro')),
    status VARCHAR(20) NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'pendente', 'inativa')),
    is_routing_enabled BOOLEAN NOT NULL DEFAULT true,
    leads_count_cache INTEGER NOT NULL DEFAULT 0,
    last_assigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_city ON tenants (city_ibge_code);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants (status, is_routing_enabled);
CREATE INDEX IF NOT EXISTS idx_tenants_routing_queue ON tenants (city_ibge_code, status, is_routing_enabled, last_assigned_at);

-- 3. COBERTURA GEOGRÁFICA REGIONAL ADICIONAL
CREATE TABLE IF NOT EXISTS store_coverage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    city_ibge_code VARCHAR(7) NOT NULL REFERENCES ibge_cities(ibge_code),
    priority_level INTEGER NOT NULL DEFAULT 2,
    is_authorized BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tenant_city_coverage UNIQUE (tenant_id, city_ibge_code)
);

CREATE INDEX IF NOT EXISTS idx_store_coverage_city ON store_coverage (city_ibge_code) WHERE is_authorized = true;

-- 4. TABELA DE USUÁRIOS E PERFIS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY, -- vinculado a auth.users.id
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('platform_admin', 'store_owner', 'store_operator', 'consumer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id);

-- 5. REGRAS DE PRECIFICAÇÃO VERSIONADAS DO SIMULADOR
CREATE TABLE IF NOT EXISTS pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INTEGER NOT NULL UNIQUE,
    base_m2_price NUMERIC(10,2) NOT NULL,
    margin_min_factor NUMERIC(4,3) NOT NULL DEFAULT 0.880,
    margin_max_factor NUMERIC(4,3) NOT NULL DEFAULT 1.150,
    furniture_coverage_ratio NUMERIC(4,3) NOT NULL DEFAULT 0.750,
    max_effective_height NUMERIC(3,2) NOT NULL DEFAULT 2.60,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. SIMULAÇÕES REALIZADAS PELO CONSUMIDOR
CREATE TABLE IF NOT EXISTS simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pricing_rule_id UUID NOT NULL REFERENCES pricing_rules(id),
    client_name TEXT NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    client_email TEXT,
    client_cep VARCHAR(9) NOT NULL,
    city_ibge_code VARCHAR(7) NOT NULL REFERENCES ibge_cities(ibge_code),
    city_name TEXT NOT NULL,
    state_uf VARCHAR(2) NOT NULL,
    calculated_min NUMERIC(10,2) NOT NULL,
    calculated_max NUMERIC(10,2) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulations_city ON simulations (city_ibge_code);
CREATE INDEX IF NOT EXISTS idx_simulations_created ON simulations (created_at DESC);

-- 7. CÔMODOS DA SIMULAÇÃO
CREATE TABLE IF NOT EXISTS simulation_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    environment_type_id VARCHAR(30) NOT NULL,
    name TEXT NOT NULL,
    area_m2 NUMERIC(5,2) NOT NULL,
    ceiling_height NUMERIC(3,2) NOT NULL,
    wall_count SMALLINT NOT NULL CHECK (wall_count BETWEEN 1 AND 4),
    walls_config JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sim_environments_sim ON simulation_environments (simulation_id);

-- 8. LEADS (CENTRAL COMERCIAL)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID REFERENCES simulations(id),
    name TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    email TEXT,
    cep VARCHAR(9) NOT NULL,
    city_ibge_code VARCHAR(7) NOT NULL REFERENCES ibge_cities(ibge_code),
    city_name TEXT NOT NULL,
    state_uf VARCHAR(2) NOT NULL,
    environment_summary TEXT NOT NULL,
    estimated_min NUMERIC(10,2) NOT NULL,
    estimated_max NUMERIC(10,2) NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'plataforma' CHECK (source IN ('plataforma', 'instagram', 'google', 'indicacao', 'balcao')),
    is_external BOOLEAN NOT NULL DEFAULT false,
    owner_tenant_id UUID REFERENCES tenants(id),
    distribution_status VARCHAR(30) NOT NULL DEFAULT 'pendente' CHECK (distribution_status IN ('pendente', 'atribuido', 'sem_cobertura', 'cancelado')),
    idempotency_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_city ON leads (city_ibge_code);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (distribution_status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_idempotency ON leads (idempotency_hash) WHERE idempotency_hash IS NOT NULL;

-- 9. ATRIBUIÇÕES DE LEADS PARA TENANTS (CRM)
CREATE TABLE IF NOT EXISTS lead_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assignment_reason VARCHAR(30) NOT NULL CHECK (assignment_reason IN ('same_city_round_robin', 'nearby_coverage_fallback', 'admin_manual_assignment')),
    status VARCHAR(20) NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_atendimento', 'orcado', 'convertido', 'perdido')),
    loss_reason TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_lead_tenant_assignment UNIQUE (lead_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_assignments_tenant ON lead_assignments (tenant_id, status);

-- 10. NOTAS E HISTÓRICO DE ATENDIMENTO DO CRM
CREATE TABLE IF NOT EXISTS lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES lead_assignments(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    note_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_assignment ON lead_notes (assignment_id);

-- 11. REGISTRO CONTÁBIL PAY-PER-LEAD (R$ 50,00 POR LEAD COMERCIAL ENTREGUE)
CREATE TABLE IF NOT EXISTS lead_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES lead_assignments(id) ON DELETE CASCADE UNIQUE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    unit_cost NUMERIC(10,2) NOT NULL DEFAULT 50.00,
    is_billable BOOLEAN NOT NULL DEFAULT true,
    invoice_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_deliveries_tenant ON lead_deliveries (tenant_id, is_billable);

-- 12. PEDIDOS DO ERP (ORDENS DE PRODUÇÃO)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_assignment_id UUID NOT NULL REFERENCES lead_assignments(id) UNIQUE,
    client_name TEXT NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    delivery_address TEXT NOT NULL,
    environment_description TEXT NOT NULL,
    total_value NUMERIC(10,2) NOT NULL,
    current_stage VARCHAR(30) NOT NULL DEFAULT 'medicao' CHECK (current_stage IN ('medicao', 'projeto_aprovacao', 'producao', 'montagem', 'entrega_aceite', 'concluido')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders (tenant_id, current_stage);

-- 13. DOCUMENTOS DA PASTA DIGITAL DO ERP
CREATE TABLE IF NOT EXISTS order_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stage VARCHAR(30) NOT NULL CHECK (stage IN ('contrato', 'medicao', 'projeto', 'producao', 'montagem', 'aceite')),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_documents_order ON order_documents (order_id, stage);

-- 14. LOG IMUTÁVEL DE AUDITORIA DO ERP
CREATE TABLE IF NOT EXISTS order_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action_message TEXT NOT NULL,
    stage_from VARCHAR(30),
    stage_to VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_audit_order ON order_audit_logs (order_id, created_at DESC);

-- 15. CANDIDATURAS DE LOJAS PARCEIRAS (EXPANSÃO B2B)
CREATE TABLE IF NOT EXISTS partner_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email TEXT NOT NULL,
    city TEXT NOT NULL,
    state_uf VARCHAR(2) NOT NULL,
    desired_plan VARCHAR(20) NOT NULL DEFAULT 'basic',
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'nova' CHECK (status IN ('nova', 'em_contato', 'aprovada', 'recusada')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
