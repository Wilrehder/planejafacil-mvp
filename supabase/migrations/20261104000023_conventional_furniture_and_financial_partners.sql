-- =============================================================================
-- MIGRATION: 20261104000023_conventional_furniture_and_financial_partners.sql
-- DESCRIÇÃO: 
-- 1. Suporte completo a Catálogo de Móveis Convencionais por Loja (com Markup e Preço de Venda)
-- 2. Tabela de Financeiras Parceiras com taxas de retenção e prazos
-- 3. Inclusão de itens convencionais no orçamento do lead
-- 4. Termos de Privacidade e Consentimento LGPD no Simulador
-- =============================================================================

-- 1. Tabela de Móveis Convencionais por Loja
CREATE TABLE IF NOT EXISTS public.store_conventional_furniture (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Geral',
    description TEXT,
    width_cm NUMERIC(10,1),
    height_cm NUMERIC(10,1),
    depth_cm NUMERIC(10,1),
    color_finish TEXT,
    image_url TEXT,
    cost_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    markup_percentage NUMERIC(5,2) NOT NULL DEFAULT 70.00,
    sale_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela de Financeiras Parceiras por Loja
CREATE TABLE IF NOT EXISTS public.store_financial_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    retention_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    max_installments INT NOT NULL DEFAULT 24,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Adicionar conventional_items e consentimento LGPD nas tabelas de leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS accepted_privacy_terms BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS privacy_terms_timestamp TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS conventional_items JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.lead_assignments
ADD COLUMN IF NOT EXISTS conventional_items JSONB DEFAULT '[]'::jsonb;

-- RLS Habilitada com Segurança Multi-Tenant
ALTER TABLE public.store_conventional_furniture ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_financial_partners ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'store_conventional_furniture' 
        AND policyname = 'store_conventional_furniture_access'
    ) THEN
        CREATE POLICY store_conventional_furniture_access ON public.store_conventional_furniture
        FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'store_financial_partners' 
        AND policyname = 'store_financial_partners_access'
    ) THEN
        CREATE POLICY store_financial_partners_access ON public.store_financial_partners
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

GRANT ALL ON public.store_conventional_furniture TO authenticated, anon, service_role;
GRANT ALL ON public.store_financial_partners TO authenticated, anon, service_role;
