-- =============================================================================
-- MIGRATION: 20261011000005_seed_initial_data.sql
-- DESCRIÇÃO: Carga inicial de Cidades IBGE, Regras de Preço, Lojas e Coberturas
-- =============================================================================

-- 1. CIDADES CANÔNICAS DO IBGE
INSERT INTO ibge_cities (ibge_code, name, state_uf, latitude, longitude) VALUES
('3530607', 'Mogi das Cruzes', 'SP', -23.5208, -46.1854),
('3552502', 'Suzano', 'SP', -23.5376, -46.3108),
('3518800', 'Guarulhos', 'SP', -23.4542, -46.5333),
('3549904', 'São José dos Campos', 'SP', -23.1896, -45.8841),
('3503901', 'Arujá', 'SP', -23.3967, -46.3203),
('3552205', 'Sorocaba', 'SP', -23.5015, -47.4526),
('3550308', 'São Paulo', 'SP', -23.5505, -46.6333),
('3509502', 'Campinas', 'SP', -22.9056, -47.0608),
('3539806', 'Poá', 'SP', -23.5284, -46.3444),
('3522208', 'Itaquaquecetuba', 'SP', -23.4861, -46.3483)
ON CONFLICT (ibge_code) DO NOTHING;

-- 2. REGRA DE PRECIFICAÇÃO INICIAL ATIVA (VERSÃO 1)
INSERT INTO pricing_rules (
    version,
    base_m2_price,
    margin_min_factor,
    margin_max_factor,
    furniture_coverage_ratio,
    max_effective_height,
    is_active
) VALUES (
    1,
    1200.00,
    0.880,
    1.150,
    0.750,
    2.60,
    true
)
ON CONFLICT (version) DO NOTHING;

-- 3. LOJAS PARCEIRAS INICIAIS CREDENCIADAS
INSERT INTO tenants (
    id,
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
    leads_count_cache
) VALUES
('b1010000-0000-0000-0000-000000000001', 'Smarth House — Mogi das Cruzes', '45.123.890/0001-12', 'Atendimento Mogi', '3530607', 'Mogi das Cruzes', 'SP', '(11) 4799-1000', '5511947991000', 'mogi@smarthhouse.com.br', 'pro', 'ativa', true, 42),
('b1020000-0000-0000-0000-000000000002', 'Smarth House — Suzano', '45.123.890/0002-25', 'Atendimento Suzano', '3552502', 'Suzano', 'SP', '(11) 4748-2000', '5511947482000', 'suzano@smarthhouse.com.br', 'basic', 'ativa', true, 38),
('b1030000-0000-0000-0000-000000000003', 'Smarth House — Guarulhos', '45.123.890/0003-38', 'Atendimento Guarulhos', '3518800', 'Guarulhos', 'SP', '(11) 2468-3000', '5511924683000', 'guarulhos@smarthhouse.com.br', 'pro', 'ativa', true, 65),
('b1040000-0000-0000-0000-000000000004', 'Smarth House — São José dos Campos', '45.123.890/0004-41', 'Atendimento SJC', '3549904', 'São José dos Campos', 'SP', '(12) 3922-4000', '5512939224000', 'sjc@smarthhouse.com.br', 'pro', 'ativa', true, 54),
('b1050000-0000-0000-0000-000000000005', 'Smarth House — Arujá', '45.123.890/0005-54', 'Atendimento Arujá', '3503901', 'Arujá', 'SP', '(11) 4655-5000', '5511946555000', 'aruja@smarthhouse.com.br', 'basic', 'ativa', true, 29),
('b1060000-0000-0000-0000-000000000006', 'Smarth House — Sorocaba', '45.123.890/0006-67', 'Atendimento Sorocaba', '3552205', 'Sorocaba', 'SP', '(15) 3233-6000', '5515932336000', 'sorocaba@smarthhouse.com.br', 'pro', 'ativa', true, 47)
ON CONFLICT (id) DO NOTHING;

-- 4. COBERTURA GEOGRÁFICA REGIONAL (PRIORIDADE 2)
-- Mogi cobre Suzano e Poá como fallback autorizado
INSERT INTO store_coverage (tenant_id, city_ibge_code, priority_level, is_authorized) VALUES
('b1010000-0000-0000-0000-000000000001', '3552502', 2, true), -- Mogi cobre Suzano
('b1010000-0000-0000-0000-000000000001', '3539806', 2, true), -- Mogi cobre Poá
('b1020000-0000-0000-0000-000000000002', '3539806', 2, true), -- Suzano cobre Poá
('b1030000-0000-0000-0000-000000000003', '3503901', 2, true)  -- Guarulhos cobre Arujá
ON CONFLICT (tenant_id, city_ibge_code) DO NOTHING;
