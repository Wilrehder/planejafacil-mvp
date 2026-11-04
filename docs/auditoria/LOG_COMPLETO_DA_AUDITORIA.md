# LOG COMPLETO DA AUDITORIA — PLANEJA FÁCIL

**Equipe Responsável:** Tech Lead Sênior, QA Engineer, Arquiteto de Software, Especialista em Segurança Supabase e Analista de Regras de Negócio.  
**Início da Auditoria:** 04/11/2026 01:50 BRT  
**Repositório:** `planejafacil-mvp` (Branch `main`)  
**Banco de Dados:** Supabase PostgreSQL (`inqgxjdvuizsdtolrwfb`)

---

## 1. CRONOLOGIA DOS TRABALHOS

### 01:50 - Fase de Inicialização e Diagnóstico de Ambiente
- Criação da estrutura de pastas `/docs/auditoria/`, `/docs/auditoria/logs/`, `/docs/auditoria/evidencias/`.
- Verificação das variáveis de ambiente em `.env` e confirmação do projeto Supabase.
- Mapeamento das 29 tabelas da base de dados no schema `public`.
- Identificação dos perfis de usuários cadastrados:
  - Admin: `admin@planejafacil.com.br`, `wrehdervalle@gmail.com`.
  - Lojistas: `dono.suzano@loja.com`, `dono.mogi@loja.com`, `rebeca@gmail.com`, `wvalle@gmail.com`, `beto@gmail.com`.

### 01:52 - Auditoria de Regras de Negócio e Roteamento de Leads
- Descoberta de anomalia no motor de roteamento (`route_and_assign_lead`): leads sem cobertura estavam sendo atribuídos a qualquer loja ativa do mesmo estado por causa de uma cláusula estadual remanescente.
- Correção implementada na procedure do PostgreSQL e registrada na migration `20261104000024_fix_routing_queue_fallback.sql`.

### 01:54 - Mapeamento Integral do Sistema (Etapa 1)
- Levantamento de todas as 21 telas, modais e componentes da aplicação.
- Mapeamento da matriz de rastreabilidade (Tela -> Componente -> Ação -> Regra -> Backend -> Banco -> Teste).
- Geração do artefato canônico `/docs/MAPA_COMPLETO_DO_SISTEMA.md`.

### 01:56 - Criação da Suíte Master de Auditoria (Etapa 2, 3 e 4)
- Desenvolvimento da suíte automatizada `src/__tests__/auditMasterComprehensive.test.ts` cobrindo:
  - Validação de CEP e IBGE oficial.
  - Motor dinâmico de cálculo de m² e margens.
  - Parser Promob XML com identificação de Custo Fabril e Preço de Venda.
  - Schemas Zod de contato do cliente e de lojas.
  - Submissão de simulação e criação de lead com flag de consentimento LGPD.
  - Roteamento correto para lojas credenciadas e envio para Fila Sem Cobertura.
  - Cadastro de móveis convencionais com markup automático de preço.
  - Cadastro de financeiras parceiras com taxas de retenção.
  - Políticas de RLS: rejeição de chamadas anônimas e bloqueio de acesso cruzado entre lojas distintas.
  - Cláusula de permanência mínima de 3 meses e procedimento de suspensão de loja.

### 02:01 - Execução e Homologação dos Testes Automatizados
- Execução integrada de 38 testes automatizados via Vitest.
- **Resultado: 38 APROVADOS (100% de sucesso)**.
- Geração do log bruto em `/docs/auditoria/logs/test_execution.log`.
- Geração do relatório detalhado em `/docs/auditoria/RESULTADOS_DOS_TESTES.md`.

### 02:02 - Documentação de Erros e Correções (Etapa 5)
- Registro das 5 anomalias identificadas, causas raízes e resoluções no artefato `/docs/auditoria/ERROS_E_CORRECOES.md`.

---

## 2. STATUS DAS VERIFICAÇÕES DE SEGURANÇA E SUPABASE

1. **Row Level Security (RLS)**:
   - Ativo e validado nas tabelas críticas (`tenants`, `users`, `leads`, `lead_assignments`, `orders`, `invoices`, `store_conventional_furniture`, `store_financial_partners`).
   - Usuários anônimos são impedidos de executar queries ou invocar procedures restritas como `get_store_leads` e `admin_set_store_suspension`.
2. **Isolamento Multi-Tenant**:
   - Um lojista autenticado em sua unidade (ex: Suzano) é rigorosamente bloqueado ao tentar consultar ou manipular pedidos/leads de outra unidade (ex: Mogi das Cruzes).
3. **Sigilo Comercial para Vendedores**:
   - Vendedores (`store_operator`) não possuem visualização do Custo de Fábrica do Promob nem do markup/custo dos móveis convencionais. Visualizam exclusivamente o Preço Final ao Cliente.
4. **Conformidade LGPD**:
   - Todo lead gerado pelo consumidor armazena o timestamp de consentimento e a flag afirmativa de aceite aos termos de privacidade e contato comercial.
