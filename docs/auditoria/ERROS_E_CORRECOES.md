# REGISTRO DE ERROS, ANÁLISE DE CAUSA RAIZ E CORREÇÕES — AUDITORIA

Este documento registra todas as anomalias, bugs e inconsistências identificados durante a auditoria técnica, com a causa raiz, os arquivos modificados, as evidências de correção e o resultado do reteste.

---

## 1. ÍNDICE DE OCORRÊNCIAS

| ID | Severidade | Módulo | Descrição Resumida | Situação |
|---|---|---|---|---|
| **ERR-01** | **P1 (Alto)** | Roteamento / Leads | Fallback estadual genérico atribuía leads de cidades sem cobertura a qualquer loja do estado em vez de enviar para a Fila Sem Cobertura | **CORRIGIDO E RETESTADO** |
| **ERR-02** | **P0 (Crítico)** | SaaS Admin / Lojas | Erro `column "reason" of relation "subscription_history" does not exist` impedia a suspensão de lojas parceiras | **CORRIGIDO E RETESTADO** |
| **ERR-03** | **P2 (Médio)** | TypeScript / Tipos | Incompatibilidade de tipos em `conventionalItems` (`unitPrice` vs `salePrice` + `total`) gerando falha no build de produção | **CORRIGIDO E RETESTADO** |
| **ERR-04** | **P2 (Médio)** | Simulador / Modal | Referência à variável fora de escopo `res.leadId` no bloco `catch` de `LeadCaptureModal.tsx` | **CORRIGIDO E RETESTADO** |
| **ERR-05** | **P2 (Médio)** | SaaS Admin / RPC | Inconsistência no nome do parâmetro da procedure `admin_set_store_suspension` (`p_is_suspended` vs `p_suspended`) | **CORRIGIDO E RETESTADO** |

---

## 2. DETALHAMENTO DAS CORREÇÕES

### ERR-01 — Fallback Estadual Quebrava a Fila de Leads Sem Cobertura
- **Data da Descoberta**: 04/11/2026 (Etapa 2 — Testes de Roteamento)
- **Funcionalidade Afetada**: `route_and_assign_lead` / Fila Administrativa de Distribuição
- **Comportamento Esperado**: Leads de municípios sem loja física e sem regra de cobertura autorizada (`store_coverage`) devem ter status `sem_cobertura` e cair na fila administrativa para triagem do dono do SaaS.
- **Comportamento Observado**: A procedure continha um SELECT de fallback estadual que atribuía o lead a qualquer loja do mesmo estado (ex: cliente de Campinas era atribuído à loja de Suzano).
- **Causa Raiz**: Adição inadvertida de cláusula `WHERE upper(trim(state_uf)) = upper(trim(v_lead.state_uf))` na migration 16.
- **Arquivos Envolvidos**: `supabase/migrations/20261104000024_fix_routing_queue_fallback.sql` e procedure `public.route_and_assign_lead` no PostgreSQL.
- **Correção Implementada**: Remoção da captura estadual arbitrária. Se não houver loja local nem cobertura regional autorizada, o lead é finalizado com `distribution_status = 'sem_cobertura'`.
- **Resultado do Reteste**: `auditMasterComprehensive.test.ts` (Teste 2.2) passou com sucesso: cliente de Campinas agora é direcionado exclusivamente para `sem_cobertura`.
- **Situação**: **RESOLVIDO**.

---

### ERR-02 — Falha ao Suspender Loja Parceira no Painel do Administrador
- **Data da Descoberta**: 04/11/2026 (Reportado com screenshot pelo usuário)
- **Funcionalidade Afetada**: `StoresManager.tsx` -> Botão "Suspender"
- **Comportamento Esperado**: Ao clicar em Suspender, a loja passa para o status "suspensa", sai do rodízio de leads e o histórico é registrado em `subscription_history`.
- **Comportamento Observado**: Erro no banco de dados: `column "reason" of relation "subscription_history" does not exist`.
- **Causa Raiz**: A procedure `admin_set_store_suspension` inseria dados nas colunas `reason` e `actor_id`, mas a tabela `subscription_history` só possuía as colunas legadas `notes` e `performed_by`.
- **Arquivos Envolvidos**: `supabase/migrations/20261104000022_fix_subscription_history_suspension.sql`.
- **Correção Implementada**: Adicionadas as colunas `reason TEXT` e `actor_id UUID` na tabela `subscription_history` e atualizada a procedure para preencher ambas.
- **Resultado do Reteste**: Procedimento testado ao vivo no banco e confirmado via teste unitário 5.3 (`auditMasterComprehensive.test.ts`).
- **Situação**: **RESOLVIDO**.

---

### ERR-03 — Incompatibilidade de Tipagem em `conventionalItems`
- **Data da Descoberta**: 04/11/2026 (Etapa de compilação `tsc -b`)
- **Funcionalidade Afetada**: `src/types/index.ts` e `LeadDetailDrawer.tsx`
- **Comportamento Esperado**: A interface de `Lead` deve suportar os campos `salePrice` e `total` utilizados pelo catálogo de móveis convencionais.
- **Comportamento Observado**: A interface declarava apenas `unitPrice`, gerando 9 erros de compilação no Vite/Rollup.
- **Causa Raiz**: Divergência na assinatura do objeto salvo pelo serviço de móveis convencionais.
- **Arquivos Envolvidos**: `src/types/index.ts`.
- **Correção Implementada**: Interface atualizada para:
  `conventionalItems?: Array<{ id: string; name: string; quantity: number; salePrice: number; total: number; unitPrice?: number; category?: string }>;`
- **Resultado do Reteste**: Compilação TypeScript executada com 0 erros.
- **Situação**: **RESOLVIDO**.

---

### ERR-04 — Escopo Indevido no Bloco Catch de `LeadCaptureModal.tsx`
- **Data da Descoberta**: 04/11/2026 (Etapa de build Vite)
- **Funcionalidade Afetada**: `src/components/consumer/LeadCaptureModal.tsx`
- **Comportamento Esperado**: Em caso de falha de conexão na API, o lead é gravado em modo fallback local sem disparar erro de compilação.
- **Comportamento Observado**: Erro `Cannot find name 'res'` porque a variável `res` pertencia ao escopo do bloco `try`.
- **Causa Raiz**: Inserção duplicada de chamada `res.leadId` dentro do bloco `catch`.
- **Arquivos Envolvidos**: `src/components/consumer/LeadCaptureModal.tsx`.
- **Correção Implementada**: Remoção da referência inválida no bloco de fallback.
- **Resultado do Reteste**: Build concluído com sucesso em 10.35s.
- **Situação**: **RESOLVIDO**.

---

### ERR-05 — Divergência no Nome do Parâmetro de Suspensão
- **Data da Descoberta**: 04/11/2026 (Execução de testes RPC)
- **Funcionalidade Afetada**: `admin_set_store_suspension`
- **Comportamento Observado**: Supabase retornava PGRST202 informando que esperava `p_suspended` e não `p_is_suspended`.
- **Correção Implementada**: Chamada RPC padronizada com `p_suspended`.
- **Resultado do Reteste**: Teste 5.3 de suspensão executado com sucesso e idempotência confirmada.
- **Situação**: **RESOLVIDO**.

