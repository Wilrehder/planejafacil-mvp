# POLÍTICA DE SEGURANÇA MULTI-TENANT & DEFESA EM PROFUNDIDADE — PLANEJAFÁCIL

**Versão:** 1.0.0  
**Classificação:** Confidencial / Arquitetura de Segurança  
**Frameworks de Referência:** OWASP Top 10 (2021), OWASP API Security Top 10 (2023), LGPD (Lei nº 13.709/2018)

---

## 1. MODELO DE AUTENTICAÇÃO E CLAIMS JWT

A autenticação é gerenciada pelo **Supabase Auth (GoTrue)** com emissão de tokens JWT criptografados com algoritmo ES256/RS256. 

### 1.1. Estrutura do Token JWT (Custom Claims)
Ao autenticar o usuário, o Supabase injeta claims de aplicativo (`app_metadata`):
```json
{
  "sub": "b2f4c6e8-1111-4444-8888-abcdef123456",
  "email": "carlos@smarthhouse.com.br",
  "app_metadata": {
    "role": "store_owner",
    "store_id": "456e7890-a123-4567-8901-abcdef012345"
  },
  "user_metadata": {
    "full_name": "Carlos Eduardo"
  },
  "exp": 1728691200
}
```

### 1.2. Funções Auxiliares de Segurança no PostgreSQL
```sql
-- Obter o ID do Tenant autenticado diretamente do token
CREATE OR REPLACE FUNCTION auth.current_tenant_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'store_id', '')::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Obter o Papel do usuário
CREATE OR REPLACE FUNCTION auth.current_role()
RETURNS TEXT AS $$
  SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role', 'anonymous');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Verificar se o usuário é Super Administrador da Plataforma
CREATE OR REPLACE FUNCTION auth.is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT auth.current_role() = 'platform_admin';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

---

## 2. ROW LEVEL SECURITY (RLS) — ISOLAMENTO MULTI-TENANT OBRIGATÓRIO

Todas as tabelas que contêm dados de clientes, lojas, ordens ou faturas têm RLS habilitado sem exceção (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).

### 2.1. Políticas RLS por Entidade

#### Tabela `tenants`
```sql
-- Lojistas leem apenas o registro de sua própria loja
CREATE POLICY "tenant_read_own" ON tenants
FOR SELECT TO authenticated
USING (id = auth.current_tenant_id() OR auth.is_platform_admin());

-- Apenas o Super Admin pode criar ou alterar status de lojas
CREATE POLICY "tenant_admin_full" ON tenants
FOR ALL TO authenticated
USING (auth.is_platform_admin())
WITH CHECK (auth.is_platform_admin());
```

#### Tabela `lead_assignments` (CRM)
```sql
-- O lojista enxerga apenas os leads atribuídos à sua loja
CREATE POLICY "lead_assignments_tenant_isolation" ON lead_assignments
FOR SELECT TO authenticated
USING (tenant_id = auth.current_tenant_id() OR auth.is_platform_admin());

-- O lojista pode atualizar status de seus próprios leads
CREATE POLICY "lead_assignments_tenant_update" ON lead_assignments
FOR UPDATE TO authenticated
USING (tenant_id = auth.current_tenant_id())
WITH CHECK (tenant_id = auth.current_tenant_id());
```

#### Tabela `orders` (ERP)
```sql
-- Isolamento absoluto de ordens de serviço
CREATE POLICY "orders_tenant_select" ON orders
FOR SELECT TO authenticated
USING (tenant_id = auth.current_tenant_id() OR auth.is_platform_admin());

CREATE POLICY "orders_tenant_modify" ON orders
FOR ALL TO authenticated
USING (tenant_id = auth.current_tenant_id() OR auth.is_platform_admin())
WITH CHECK (tenant_id = auth.current_tenant_id() OR auth.is_platform_admin());
```

#### Tabela `order_documents` & Storage
```sql
-- Metadados de documentos protegidos por tenant
CREATE POLICY "order_docs_tenant_isolation" ON order_documents
FOR ALL TO authenticated
USING (tenant_id = auth.current_tenant_id() OR auth.is_platform_admin())
WITH CHECK (tenant_id = auth.current_tenant_id() OR auth.is_platform_admin());
```

#### Tabelas Financeiras (`store_subscriptions`, `invoices`, `invoice_items`, `lead_deliveries`)
```sql
-- Faturas: visualização restrita ao próprio tenant ou administrador da plataforma
CREATE POLICY "invoices_tenant_read" ON invoices
FOR SELECT TO authenticated
USING (tenant_id = auth.current_tenant_id() OR auth.is_platform_admin());

-- Itens de fatura: protegidos via JOIN com a fatura do tenant
CREATE POLICY "invoice_items_tenant_read" ON invoice_items
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM invoices i
        WHERE i.id = invoice_items.invoice_id
          AND (i.tenant_id = auth.current_tenant_id() OR auth.is_platform_admin())
    )
);

-- Assinaturas: consulta restrita à própria loja ou administrador
CREATE POLICY "store_subs_tenant_read" ON store_subscriptions
FOR SELECT TO authenticated
USING (tenant_id = auth.current_tenant_id() OR auth.is_platform_admin());

-- Bloqueio estrito de acesso anônimo a todas as tabelas financeiras
REVOKE ALL ON invoices, invoice_items, store_subscriptions, subscription_history, lead_deliveries, webhook_events FROM anon, public;
```

---

## 3. SEGURANÇA DE ARQUIVOS (SUPABASE STORAGE PRIVADO)

1. **Bucket Privado:** Todos os documentos do ERP e propostas técnicas residem no bucket privado `order-documents` (`public = false`).
2. **Download via Signed URLs:** Arquivos nunca são expostos por links públicos estáticos. Para visualizar ou baixar um anexo, a API gera uma URL pré-assinada com tempo de expiração curto (máximo de 15 minutos).
3. **Validação de Uploads:**
   - Tipos MIME permitidos: `application/pdf`, `image/jpeg`, `image/png`.
   - Limite máximo de arquivo: 15 MB por anexo.
   - Higienização de nomes de arquivos: O nome do arquivo no storage é substituído por um UUID v4 imprevisível (`orders/{order_id}/{stage}/{uuid}.pdf`), eliminando vulnerabilidades de Path Traversal.

---

## 4. INGESTÃO DE WEBHOOKS & INTEGRIDADE FINANCEIRA (FASE 5)

1. **Validação Criptográfica de Assinatura:**
   - Todo webhook recebido tem sua assinatura verificada contra o segredo mantido exclusivamente no backend.
2. **Proteção Anti-Replay & Idempotência por Identificador Único:**
   - A tabela `webhook_events` possui constraint de unicidade composta `UNIQUE (gateway_provider, event_id)`.
3. **Prevenção de Confirmação Indevida pelo Lojista:**
   - Lojistas comuns não têm permissão para marcar suas próprias faturas como quitadas. A procedure `process_simulated_payment` valida permissões administrativas ou de ambiente controlado de testes (`ERRCODE = 42501` em acessos não autorizados).

---

## 4.1. SEGURANÇA NA GESTÃO MANUAL DE RECEBIMENTOS (FASE 5.1)

1. **Autorização Rígida de Administrador (`is_platform_admin()`):**
   - Todas as operações de gestão manual (`admin_register_manual_payment`, `admin_register_invoice_adjustment`, `admin_set_store_suspension`, `admin_save_store_and_subscription`) verificam `public.is_platform_admin()`.
   - Tentativas de invocação por lojistas comuns ou usuários anônimos são interrompidas no PostgreSQL disparando exceção `42501 (Acesso negado)`.
2. **Imutabilidade e Idempotência Contábil:**
   - Cada recebimento manual gera um registro imutável em `invoice_payments` com `amount_paid`, `payment_method`, `external_reference`, `notes`, `registered_by` e `idempotency_key`.
   - A `idempotency_key` possui constraint `UNIQUE` impedindo que reprocessamentos acidentais ou duplo-clique no frontend dupliquem lançamentos contábeis.
3. **Isolamento de Visão do Lojista:**
   - Lojistas possuem permissão exclusivamente de leitura (`SELECT`) sobre suas próprias faturas e comprovantes em `invoice_payments` via RLS (`tenant_id = public.current_tenant_id()`).
   - Lojistas não têm permissão de `INSERT`, `UPDATE` ou `DELETE` sobre `invoices`, `invoice_payments` ou `store_subscriptions`.
4. **Sem Exposição de Dados de Outros Tenants:**
   - Mesmo que um operador mal-intencionado manipule IDs no frontend, as políticas de Row Level Security garantem que o banco de dados retorne zero registros para outros tenants.


---

## 5. MATRIZ DE MITIGAÇÃO OWASP

| Ameaça OWASP | Risco no PlanejaFácil | Mitigação Implementada na Arquitetura |
| :--- | :--- | :--- |
| **A01: Broken Access Control** | Lojista de Mogi acessar faturas ou leads de Suzano | Supabase RLS no PostgreSQL atrelado a `auth.current_tenant_id()`. O backend rejeita requisições para tenants diferentes. |
| **A02: Cryptographic Failures** | Exposição de credenciais e senhas | Autenticação via GoTrue com hash Argon2/bcrypt; tráfego 100% sob HTTPS/TLS 1.3; segredos em Vercel Secret Store. |
| **A03: Injection (SQLi / XSS)** | Entrada maliciosa no formulário | Consultas parametrizadas via Supabase PostgREST; sanitização de inputs com Zod no backend e escape nativo do React. |
| **A04: Insecure Design** | Forjar orçamentos de R$ 1,00 ou alterar preço de plano | Cálculo de precificação executado estritamente no servidor via `pricing_rules` e `saas_pricing_schedules`. O frontend envia apenas medidas e recebe a faixa oficial. |
| **A05: Security Misconfiguration** | Service Role Keys expostas no frontend | `SUPABASE_SERVICE_ROLE_KEY` e credenciais de pagamento são usadas exclusivamente em Vercel Serverless Functions. O frontend acessa apenas a `ANON_KEY`. |
| **API1: BOLA (Broken Object Level Auth)** | Alterar ID na URL da fatura ou pedido | RLS garante que mesmo conhecendo o UUID de outra fatura ou pedido, o retorno do PostgreSQL é vazio (`404 Not Found`). |
| **API4: Unrestricted Resource Consumption** | Robôs enviando 10.000 leads falsos | Rate Limiting no endpoint de simulação: máx. 5 simulações por IP a cada 10 minutos via Upstash Redis. |
