# PlanejaFácil — Plataforma SaaS B2B/B2C para Móveis Planejados

> **Versão de Produção (Fase 7 Final)**  
> Plataforma comercial multi-tenant que conecta consumidores finais a marcenarias e lojas parceiras credenciadas, com simulador 3D/paramétrico, distribuição inteligente de leads (Round Robin geográfico com fallback estadual), CRM de vendas, ERP pós-venda para acompanhamento fabril/montagem e gestão financeira administrativa de assinaturas.

---

## 1. Visão Geral da Arquitetura

O **PlanejaFácil** opera sob arquitetura desacoplada e segura:

- **Frontend:** SPA moderna construída em **React 19**, **TypeScript** e **Vite**, estilizada com Tailwind CSS e componentes acessíveis com micro-animações.
- **Backend / Database:** **PostgreSQL 15+** hospedado no **Supabase (região sa-east-1 / São Paulo)** com **Row Level Security (RLS)** estrito em todas as tabelas.
- **Autenticação:** **Supabase Auth (GoTrue)** integrado com senhas temporárias provisionadas pelo administrador e troca obrigatória no primeiro login (`must_change_password`).
- **Segurança Multi-Tenant:** Isolamento criptográfico e por tenant (`app.current_tenant_id` derivado com segurança de `auth.uid()` e `public.users.is_active = true`), impedindo qualquer acesso cruzado entre lojas parceiras.
- **Storage Privado:** Buckets com RLS para propostas comerciais (`lead-proposals`) e documentos de fabricação/montagem (`order-documents`), acessados via URLs pré-assinadas temporárias.

---

## 2. Perfis de Acesso e Permissões (RBAC)

1. **`consumer` (Consumidor Final):**
   - Acesso público ao simulador paramétrico de ambientes e geração de estimativas orçamentárias.
   - Não requer autenticação nem possui acesso a dados internos de lojas.
2. **`store_owner` (Lojista / Responsável da Loja):**
   - Acesso exclusivo ao CRM e ERP da sua própria loja.
   - Gerenciamento de operadores, atualização de estágios de pedidos, propostas e financeiro da loja.
3. **`store_operator` (Operador / Vendedor da Loja):**
   - Operação diária de leads e pedidos da sua loja, sem permissões de exclusão ou alteração de planos.
4. **`platform_admin` (Administrador do SaaS):**
   - Painel Master de gestão: credenciamento de lojas, provisionamento de acessos, configuração de municípios atendidos, controle de faturamento, conciliação manual de pagamentos externos (Pix/TED) e auditoria de leads.

---

## 3. Instalação e Desenvolvimento Local

### Pré-requisitos
- Node.js 20.x ou superior
- npm 10.x ou superior

### Passo a Passo

```bash
# 1. Clonar o repositório
git clone https://github.com/seu-usuario/planejafacil.git
cd planejafacil

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

---

## 4. Variáveis de Ambiente

Crie um arquivo `.env` com base no `.env.example`:

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | URL da instância do Supabase | `https://xyzcompany.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave pública anônima do Supabase | `eyJhbGciOi...` |
| `VITE_APP_ENV` | Modo de execução (`development` / `production`) | `production` |

> ⚠️ **Segurança:** Nunca exponha a chave `service_role` no frontend. Todas as operações administrativas são realizadas por stored procedures `SECURITY DEFINER` protegidas por checagem interna de perfil `platform_admin`.

---

## 5. Bateria de Testes Automatizados

### 5.1. Testes Unitários e de Integração (Vitest)
Executa 14 suítes com 116 testes cobrindo autenticação, provisionamento, RLS, motor financeiro, distribuição Round Robin e regras de negócio:

```bash
npm test
```

### 5.2. Testes de Ponta a Ponta no Navegador (Playwright)
Executa as 6 jornadas completas em navegador real (Google Chrome):
- **Jornada 1:** Admin cria loja e provisiona lojista com senha temporária.
- **Jornada 2:** Lojista efetua login real, altera senha no primeiro acesso e navega no CRM.
- **Jornada 3:** Consumidor simula orçamento sem autenticação e lead é roteado à loja.
- **Jornada 4:** CRM e ERP (avanço de estágios, documentos e conversão em pedido).
- **Jornada 5:** Gestão financeira administrativa (faturas, leads e baixa manual de pagamentos).
- **Jornada 6:** Isolamento estrito multi-tenant (bloqueio de acesso cruzado entre lojas).

```bash
npx playwright test
```

### 5.3. Testes de Carga e Desempenho (Benchmark Concorrente)
Avalia latências P50, P95 e P99 com taxa de erro de 0.00%:

```bash
npx vite-node scripts/loadTestPhase7.ts
```

---

## 6. Estratégia de Deploy na Vercel

O projeto está otimizado para deploy contínuo via GitHub integrado à Vercel:

1. **Repositório GitHub:** Envie o código para o branch `main`.
2. **Importação na Vercel:** Conecte o repositório na Vercel.
3. **Build Settings:**
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Variáveis de Ambiente na Vercel:**
   - Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas configurações do projeto.
   - Configure `VITE_APP_ENV=production`.
5. **Configuração SPA & Headers:** O arquivo `vercel.json` na raiz gerencia automaticamente os rewrites de rotas para `index.html` e os headers de segurança (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).

---

## 7. Migrations e Banco de Dados Supabase

As migrations estão versionadas na pasta `supabase/migrations/`:

| Arquivo | Descrição |
| :--- | :--- |
| `20261011000001_...` | Estrutura base de tenants e cidades IBGE |
| `20261011000002_...` | Leads, simulações e motor de distribuição Round Robin |
| `20261011000003_...` | CRM de vendas e propostas |
| `20261011000004_...` | ERP pós-venda e esteira de produção |
| `20261011000005_...` | Buckets de Storage privados e políticas RLS |
| `...` | Faturamento, assinaturas e cobrança Pay-Per-Lead |
| `20261011000015_phase7_auth_provisioning_and_hardening.sql` | GoTrue Auth, provisionamento de usuários, troca obrigatória de senha e hardening de RLS |

---

## 8. Procedimentos Operacionais: Backup, Rollback e Disaster Recovery

### Backup do PostgreSQL
- O Supabase realiza backups diários automáticos com Point-in-Time Recovery (PITR).
- Para exportação manual antes de grandes alterações:
  ```bash
  supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql
  ```

### Rollback de Deploy Frontend
- No dashboard da Vercel, acesse a aba **Deployments**, selecione o deployment anterior aprovado e clique em **Promote to Production** (tempo de restauração: imediato / zero downtime).

### Recuperação de Acessos
- Caso um lojista perca sua senha, o administrador pode gerar uma nova senha temporária ou solicitar recuperação via e-mail diretamente no menu de gerenciamento de usuários da loja.
