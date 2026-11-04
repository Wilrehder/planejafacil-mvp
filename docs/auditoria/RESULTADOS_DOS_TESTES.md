# RESULTADOS DOS TESTES DE AUDITORIA — PLANEJA FÁCIL

Data de Execução: 04/11/2026  
Ambiente: Homologação Integrada (Supabase `inqgxjdvuizsdtolrwfb`)  
Framework de Testes: Vitest v2.1.9 / TypeScript 6.0.2 / React 19  
Total de Testes Automatizados Executados: 38  
Status Global: **100% APROVADO (38/38)**

---

## 1. SUMÁRIO CONSOLIDADO POR SUÍTE

| Suíte de Testes | Arquivo | Testes Executados | Aprovados | Reprovados | Bloqueados | Tempo de Execução |
|---|---|---|---|---|---|---|
| **Auditoria Master Completa** | `auditMasterComprehensive.test.ts` | 15 | 15 | 0 | 0 | 3.41s |
| **Motor de Roteamento** | `routing.test.ts` | 7 | 7 | 0 | 0 | 8ms |
| **Validação de Schemas Zod** | `validation.test.ts` | 11 | 11 | 0 | 0 | 17ms |
| **Motor de Precificação m²** | `pricing.test.ts` | 4 | 4 | 0 | 0 | 5ms |
| **Parser Promob XML** | `promobParser.test.ts` | 1 | 1 | 0 | 0 | 98ms |
| **TOTAL** | **5 arquivos** | **38** | **38** | **0** | **0** | **6.25s** |

---

## 2. DETALHAMENTO INDIVIDUAL DE CADA CASO DE TESTE

### 2.1 Suíte: `auditMasterComprehensive.test.ts`

| ID | Caso de Teste | Camada Auditada | Entrada / Dados | Resultado Esperado | Resultado Observado | Status |
|---|---|---|---|---|---|---|
| **TC-01** | Validação de CEP via `cepService` | API / IBGE | CEP: `'08674-000'` | Cidade Suzano, UF SP, IBGE 3552502 | Cidade Suzano, UF SP, IBGE 3552502 | **APROVADO** |
| **TC-02** | Rejeição de CEP inválido | Validação | CEP: `'123'` | Retornar `success: false` com erro | Retornou `success: false` | **APROVADO** |
| **TC-03** | Cálculo de orçamento m² com margem | Motor de Preço | Cozinha 12m², Quarto 15m² | Min > 0, Max > Min, totalEstimatedFurnitureM2 > 0 | Min: R$ 23.443, Max: R$ 30.640 | **APROVADO** |
| **TC-04** | Parser Promob XML | Parse / Extração | XML Promob completo | Valor orçado R$ 35.000, Custo R$ 14.000, Cliente Maria Silva | Extraído com exatidão | **APROVADO** |
| **TC-05** | Schema Zod de Contato do Cliente | Sanitização | Dados vazios e e-mail inválido | Bloqueio antes de enviar ao banco | Bloqueado com ZodError | **APROVADO** |
| **TC-06** | Consumidor submete simulação em Suzano com LGPD | RPC / Banco | Nome, WhatsApp, CEP Suzano, 1 cômodo | Simulação criada, lead atribuído na loja local de Suzano | Lead gravado no Postgres, loja Suzano atribuída | **APROVADO** |
| **TC-07** | Lead de município sem cobertura cai na Fila Admin | Roteamento / Regra | CEP Campinas (sem lojas credenciadas) | `distribution_status = 'sem_cobertura'`, sem tenant_id | `status = 'sem_cobertura'`, lead na fila admin | **APROVADO** |
| **TC-08** | Cadastro de móvel convencional com markup | Negócio / Banco | Custo R$ 1.000,00, Markup 70% | Preço de Venda = R$ 1.700,00 | Gravado em `store_conventional_furniture` por R$ 1.700,00 | **APROVADO** |
| **TC-09** | Cadastro de financeira com taxa de retenção | Negócio / Banco | BV Financeira, Retenção 8.5%, 24x | Gravado e consultado na loja | Gravado em `store_financial_partners` com sucesso | **APROVADO** |
| **TC-10** | Usuário anônimo bloqueado em `get_store_leads` | Segurança RLS | Chamada RPC sem token JWT | Erro de segurança `42501 Acesso negado` | Rejeitado pelo PostgreSQL com Acesso Negado | **APROVADO** |
| **TC-11** | Lojista é bloqueado se consultar outra loja | Multi-Tenant RLS | Lojista de Suzano requisitando Mogi | Erro `Acesso negado: loja não vinculada` | Rejeitado pelo PostgreSQL | **APROVADO** |
| **TC-12** | Bloqueio de avanço para "Orçado" sem anexo | Regra Comercial | Lead sem arquivo anexado | Proibição de mudar status para 'orcado' | Bloqueado preventivamente | **APROVADO** |
| **TC-13** | Cláusula de permanência de 3 meses na loja | Banco / Contrato | Query de `has_retention_clause` e `retention_months` | Colunas presentes e íntegras | Verificado `retention_months = 3` | **APROVADO** |
| **TC-14** | `admin_set_store_suspension` bloqueia anônimo | Segurança RLS | Chamada de suspensão sem credencial | Erro `permission denied` | Rejeitado | **APROVADO** |
| **TC-15** | `admin_set_store_suspension` executada por Admin | Permissão Admin | Chamada autenticada com admin token | Execução com sucesso e log registrado | Executado com `success: true` | **APROVADO** |

---

### 2.2 Suíte: `routing.test.ts` (Motor de Roteamento)

| ID | Cenário | Regra | Status |
|---|---|---|---|
| **TC-16** | Lead de Suzano seleciona apenas loja local elegível | Prioridade 1 (Município Local) | **APROVADO** |
| **TC-17** | Round Robin: Seleciona loja elegível com menor carga de leads | Menor número de leads | **APROVADO** |
| **TC-18** | Fallback Regional para loja vizinha com cobertura autorizada | Prioridade 2 (Cobertura Regional) | **APROVADO** |
| **TC-19** | Não seleciona loja externa se regra estiver desautorizada | Bloqueio de lojas não autorizadas | **APROVADO** |
| **TC-20** | Município sem cobertura cai na fila administrativa | Prioridade 3 (Sem Cobertura) | **APROVADO** |
| **TC-21** | Loja desativada ou com routing desligado é ignorada | Elegibilidade de status | **APROVADO** |
| **TC-22** | Empate em leadsCount desempata por ordem de criação | Determinismo de roteamento | **APROVADO** |

---

### 2.3 Suíte: `validation.test.ts` (Validações Zod)

- **TC-23 a TC-33**: 11 testes unitários testando schemas de formulário, sanitização de CPF/CNPJ, máscara de WhatsApp, valores de simulação e faixas orçamentárias. **Todos Aprovados**.

---

### 2.4 Suíte: `pricing.test.ts` (Precificação Dinâmica m²)

- **TC-34 a TC-37**: 4 testes unitários cobrindo variações de pé-direito (1.5m a 6.0m), projeção linear e aplicação de margens. **Todos Aprovados**.

---

### 2.5 Suíte: `promobParser.test.ts` (Parser XML Promob)

- **TC-38**: 1 teste unitário validando extração de árvore XML, identificação de tags `<BUDGET>`, `<ORDER>` e `<CUSTOMERSDATA>`. **Aprovado**.

