# VALIDAÇÃO DA LIMPEZA INTEGRAL DO BANCO DE DADOS (HOMOLOGAÇÃO)

**Data da Limpeza:** 04 de Novembro de 2026 02:05 BRT  
**Ambiente:** Homologação / Testes Integrados  
**Identificador do Projeto Supabase:** `inqgxjdvuizsdtolrwfb`  
**URL:** `https://inqgxjdvuizsdtolrwfb.supabase.co`  
**Diretiva Especial:** Preservar exclusivamente as contas de Administrador da Plataforma (`platform_admin`).

---

## 1. COMPARATIVO ANTES E DEPOIS DA LIMPEZA

| Tabela | Registros Antes | Registros Depois | Status |
|---|---|---|---|
| `public.leads` | 20 | **0** | **ZERADO** |
| `public.lead_assignments` | 15 | **0** | **ZERADO** |
| `public.lead_deliveries` | 15 | **0** | **ZERADO** |
| `public.lead_notes` | 3 | **0** | **ZERADO** |
| `public.simulations` | 20 | **0** | **ZERADO** |
| `public.simulation_environments` | 23 | **0** | **ZERADO** |
| `public.orders` | 0 | **0** | **ZERADO** |
| `public.order_documents` | 0 | **0** | **ZERADO** |
| `public.order_audit_logs` | 0 | **0** | **ZERADO** |
| `public.invoices` | 0 | **0** | **ZERADO** |
| `public.invoice_items` | 0 | **0** | **ZERADO** |
| `public.invoice_payments` | 0 | **0** | **ZERADO** |
| `public.store_conventional_furniture` | 4 | **0** | **ZERADO** |
| `public.store_financial_partners` | 4 | **0** | **ZERADO** |
| `public.store_expenses` | 0 | **0** | **ZERADO** |
| `public.store_meta_integrations` | 0 | **0** | **ZERADO** |
| `public.store_subscriptions` | 3 | **0** | **ZERADO** |
| `public.subscription_history` | 17 | **0** | **ZERADO** |
| `public.store_coverage` | 3 | **0** | **ZERADO** |
| `public.store_commercial_settings` | 0 | **0** | **ZERADO** |
| `public.partner_applications` | 1 | **0** | **ZERADO** |
| `public.tenants` (Lojas Parceiras de Teste) | 3 | **0** | **ZERADO** |
| `public.users` (Colaboradores das Lojas) | 6 | **2** | **ADMINS PRESERVADOS** |
| `auth.users` (Autenticação Supabase) | 19 | **2** | **ADMINS PRESERVADOS** |

---

## 2. CONTAS DE ACESSO PRESERVADAS (ADMINISTRADOR)

Conforme a solicitação expressa do usuário, as únicas credenciais mantidas na base de dados para continuidade do acesso ao aplicativo são:

1. **`admin@planejafacil.com.br`**
   - **ID:** `a0000000-0000-0000-0000-000000000001`
   - **Nome:** Admin Plataforma
   - **Perfil (Role):** `platform_admin`
   - **Senha Padrão:** `PlanejaFacil2026!`

2. **`wrehdervalle@gmail.com`**
   - **ID:** `a0000000-0000-0000-0000-000000000010`
   - **Nome:** WILSON REHDER VALLE
   - **Perfil (Role):** `platform_admin`

---

## 3. INTEGRIDADE DA ESTRUTURA PRESERVADA

A limpeza eliminou **apenas dados operacionais e de teste**, mantendo 100% intactos:
- Todas as 29 tabelas, colunas, tipos de dados e constraints.
- Todas as tabelas de referência de domínio (ex: `ibge_cities`, `pricing_rules`).
- Todos os índices e advisory locks.
- Todas as 34 políticas Row Level Security (RLS).
- Todas as 18 Stored Procedures e Triggers no schema `public`.
- Todas as 24 migrations de schema.

---

## 4. CONFIRMAÇÃO TÉCNICA

> **CONFIRMADO:** O banco de dados do projeto `inqgxjdvuizsdtolrwfb` encontra-se sem dados de teste, sem leads antigos, sem pedidos fictícios e sem lojas de homologação. O administrador tem acesso irrestrito para cadastrar as primeiras lojas oficiais da plataforma e operar o SaaS.

