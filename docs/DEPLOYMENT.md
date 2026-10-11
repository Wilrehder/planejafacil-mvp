# GUIA DE DEPLOY, INFRAESTRUTURA & CI/CD — PLANEJAFÁCIL

**Versão:** 1.0.0  
**Hospedagem Frontend & Serverless:** Vercel  
**Banco de Dados & Storage:** Supabase Enterprise Managed (AWS us-east-1 / sa-east-1)  

---

## 1. AMBIENTES DA PLATAFORMA

| Ambiente | Propósito | URL / Host | Banco de Dados |
| :--- | :--- | :--- | :--- |
| **Development** | Desenvolvimento local de engenharia | `http://localhost:5173` | Supabase Local CLI / Docker |
| **Staging (Homologação)** | Testes de validação interna e testes E2E | `https://staging.planejafacil.com.br` | Supabase Staging Project |
| **Production** | Ambiente oficial de operação comercial | `https://planejafacil.com.br` | Supabase Production Project |

---

## 2. MATRIZ DE VARIÁVEIS DE AMBIENTE

### 2.1. Frontend (Acessíveis pelo Vite — Prefixo `VITE_`)
> **Aviso de Segurança:** Estas variáveis são injetadas no bundle público do navegador. NUNCA coloque chaves secretas ou Service Role Keys com este prefixo.

```env
# URL base do projeto Supabase
VITE_SUPABASE_URL="https://[PROJECT-REF].supabase.co"

# Chave pública anônima (com RLS ativado)
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# URL base da API Serverless (quando em domínio separado ou relativo)
VITE_API_BASE_URL="/api"

# Ambiente atual
VITE_APP_ENV="production"
```

### 2.2. Backend / Serverless (Exclusivas da Vercel / Edge Functions)
```env
# Chave mestra privilegiada (apenas para scripts de migração e workers assíncronos)
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Connection string com Transaction Pooler (PgBouncer porta 6543)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

# Gateway de Pagamento (Asaas / Stripe)
PAYMENT_GATEWAY_API_KEY="sec_live_..."
PAYMENT_GATEWAY_WEBHOOK_SECRET="whsec_..."

# WhatsApp Business API
WHATSAPP_API_TOKEN="EAA..."
WHATSAPP_PHONE_NUMBER_ID="10987654321"

# E-mails Transacionais
RESEND_API_KEY="re_..."
```

---

## 3. CONFIGURAÇÃO DA VERCEL (`vercel.json`)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

---

## 4. PIPELINE DE CI/CD (GITHUB ACTIONS)

O arquivo `.github/workflows/ci.yml` garante a qualidade e segurança antes de qualquer deploy:
1. **Linter & Type Check:** Executa `oxlint` e `tsc -b --noEmit`.
2. **Testes Unitários & Integração:** Executa `npm run test:run` com Vitest.
3. **Auditoria de Dependências:** Varredura de vulnerabilidades de pacotes npm (`npm audit --audit-level=high`).
4. **Deploy Automático de Homologação:** A cada push na branch `staging`.
5. **Deploy Automático de Produção:** A cada push ou merge na branch `main`.

---

## 5. POLÍTICA DE BACKUP & RECUPERAÇÃO DE DESASTRES (DR)

- **Backups Automáticos do PostgreSQL:** Realizados diariamente com retenção de 30 dias pelo Supabase Managed Cloud.
- **Point-in-Time Recovery (PITR):** Habilitado para restauração com granularidade de segundos em caso de corrupção de dados ou incidente operacional.
- **Armazenamento de Arquivos:** Réplicas automáticas de armazenamento com durabilidade de 99,999999999% (S3/GCS compliant).
