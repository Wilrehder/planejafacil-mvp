# PLANEJAFÁCIL — PROTOCOLO PERMANENTE DE DESENVOLVIMENTO SEGURO
> **Instruções Obrigatórias para Qualquer Agente de IA e Desenvolvedor no Workspace**
> Este arquivo é consultado automaticamente pelo Google Antigravity e deve ser rigorosamente seguido em todas as sessões.

---

## 1. REGRAS INEGOCIÁVEIS (LEIS DO REPOSITÓRIO)

1. **Análise Prévia Obrigatória:** Toda alteração começa pela investigação do código real atual, mapeamento de dependências e entendimento do fluxo de dados. Jamais presumir estrutura sem inspecionar os arquivos.
2. **Escopo Estrito:** Nenhuma funcionalidade existente pode ser removida, refatorada ou alterada fora do escopo explícito da solicitação atual.
3. **Modificações Cirúrgicas:** As alterações devem ser pequenas, localizadas, mínimas e estritamente compatíveis com a arquitetura estabelecida.
4. **Preservação de Regras de Negócio:** As regras operacionais e comerciais homologadas do PlanejaFácil são imutáveis, salvo solicitação explícita e justificada do usuário.
5. **Análise de Impacto em Código Compartilhado:** Funções e componentes compartilhados (`AppContext`, `erpService`, `crmService`, `customerContractService`, componentes de modal, schemas de validação) exigem mapeamento completo de quem os consome antes de qualquer alteração de assinatura ou comportamento.
6. **Integridade Absoluta do Banco de Dados:**
   - Nenhum pedido, lead, documento ou log de auditoria real pode ser excluído, recriado ou alterado indevidamente.
   - Migrations devem ser puramente incrementais e não destrutivas.
   - RLS (Row Level Security) e isolamento multi-tenant jamais podem ser desabilitados ou contornados.
7. **Tolerância Zero a Falhas de Testes:** Nenhuma falha de compilação, tipo ou teste automatizado pode ser ignorada ou ocultada.
8. **Inviolabilidade dos Testes:** É estritamente proibido apagar, comentar, desabilitar ou enfraquecer testes existentes apenas para aprovar uma alteração. Se um teste quebrar, a implementação deve ser corrigida para atender ao contrato estabelecido.
9. **Foco no Prompt Atual:** Ignorar instruções obsoletas ou pendências de conversas passadas que não pertençam ao pedido atual.

---

## 2. CONTRATOS PERMANENTES DE COMPORTAMENTO POR MÓDULO

Os 7 comportamentos abaixo são blindados por testes automatizados permanentes (`src/__tests__/permanentBehavioralContracts.test.ts` e `src/__tests__/erpRegressionAndVisibility.test.ts`):

### Contrato 1 — CRM e Persistência de Leads
- O avanço de lead para a etapa `orcado` **exige** proposta comercial ou arquivo técnico executivo vinculado.
- Dados de contato (CPF, telefone, WhatsApp, CEP) devem ser normalizados e higienizados na persistência.
- Leads pertencem a uma loja e só podem ser visualizados por operadores autorizados dessa loja ou por administradores da plataforma.

### Contrato 2 — Orçamentos e Cálculos Financeiros
- O valor contratado é calculado pela soma dos ambientes (Promob + Convencionais) subtraídos os descontos comerciais autorizados.
- **Regra dos Juros:** Em pagamentos parcelados ou mistos, as taxas de juros/acréscimos incidem **exclusivamente sobre a fatia a prazo**, nunca sobre o valor total geral ou sobre entradas/Pix.
- A margem líquida e o valor a repassar para a loja devem ser preservados com exatidão contábil.

### Contrato 3 — Contratos e Assinaturas Eletrônicas
- Todos os contratos gerados devem conter as **12 cláusulas jurídicas padrão** (objeto, definições, preço, financiamento, medição, prazos, preparação, montagem, garantia, rescisão, LGPD e foro).
- **Prazos Operacionais:** Prazos de fabricação e entrega são expressos estritamente em **dias úteis**, com contagem iniciada a partir da medição fina e aprovação do projeto executivo.
- O contrato possui hash imutável SHA-256 e token público único para assinatura em dispositivos móveis (`/assinar/:token` ou `?sign_token=:token`).

### Contrato 4 — Conversão de Leads em Pedidos do ERP
- Ao fechar um lead no CRM (`status = 'fechado'`), o pedido deve ser instanciado obrigatoriamente na etapa inicial:
  - `current_stage`: `'formalizacao_contratual'`
  - `contract_status`: `'formalizacao_pendente'`
- O pedido deve receber o snapshot integral dos dados da proposta, clientes, loja e timeline inicial de auditoria.

### Contrato 5 — Visibilidade e Métricas do ERP
- **Regra Fundamental de Visibilidade:** Pedidos aguardando assinatura formal no ERP **NÃO podem ser filtrados nem ocultados da esteira de produção**.
- É terminantemente proibido reintroduzir qualquer cláusula excludente como `AND (contract_status = 'assinado' OR current_stage <> 'formalizacao_contratual')` nas consultas de banco ou frontend.
- Os KPIs de pedidos ativos (`active_orders`) do ERP devem contabilizar rigorosamente todos os pedidos em andamento, inclusive os em formalização.

### Contrato 6 — Etapas Operacionais e Gating Documental
- A sequência de etapas do ERP segue estritamente a ordem linear:
  `formalizacao_contratual` → `medicao` → `projeto_aprovacao` → `producao` → `montagem` → `entrega_aceite` → `concluido`.
- **Bloqueios de Avanço (Gating):**
  - Para `medicao`: Requer contrato assinado eletronicamente ou termo físico anexado e confirmado.
  - Para `projeto_aprovacao`: Requer medição concluída (`medicaoDone` ou ficha anexada).
  - Para `producao`: Requer projeto técnico e aprovação formal do cliente.
  - Para `montagem`: Requer confirmação de produção concluída.
  - Para `entrega_aceite`: Requer fotos da montagem finalizada no imóvel.
  - Para `concluido`: Requer termo de aceite assinado ou confirmação formal do cliente.
- Visibilidade de um pedido não concede autorização para avançá-lo sem cumprimento do gating.

### Contrato 7 — Isolamento Multi-Tenant e Resiliência Anti-Wiping
- **Segurança de Acesso:**
  - Chamadas anônimas são rejeitadas com erro `UNAUTHORIZED`.
  - Operadores de uma loja não podem acessar pedidos ou leads de outra loja (`FORBIDDEN`).
  - Chamadas de RPC com `p_tenant_id` não podem contornar a autorização da sessão.
- **Anti-Wiping do Frontend:**
  - Falhas técnicas de rede, banco de dados ou RPC jamais devem resultar em lista vazia silenciosa (`orders: []`).
  - O frontend deve preservar em memória os pedidos carregados anteriormente, exibindo aviso de dados potencialmente desatualizados e botão explícito de tentar novamente.
  - Mensagens técnicas internas de SQL não devem ser expostas ao usuário final.

---

## 3. PROCESSO OBRIGATÓRIO PARA QUALQUER ALTERAÇÃO (CHECKLIST DE 14 PASSOS)

### Fase A: Antes de Modificar (Passos 1 a 5)
1. **Entender a solicitação:** Identificar o objetivo exato e as fronteiras do pedido do usuário.
2. **Identificar os arquivos envolvidos:** Localizar os arquivos específicos que realmente precisam de alteração.
3. **Mapear impactos colaterais:** Verificar quais módulos ou telas dependem dos arquivos a serem alterados.
4. **Identificar os testes existentes:** Rodar os testes da área envolvida antes de tocar no código para confirmar o estado verde.
5. **Criar ou atualizar testes do comportamento solicitado:** Se for uma nova regra ou correção, preparar o teste de regressão antes ou junto com a mudança.

### Fase B: Durante a Implementação (Passos 6 a 8)
6. **Modificar apenas o necessário:** Não realizar refatorações de estilo, renomeações globais ou reestruturações não solicitadas.
7. **Preservar interfaces e contratos:** Manter assinaturas de funções, tipos e contratos de dados já consumidos por outros módulos.
8. **Evitar dependências desnecessárias:** Não adicionar novas bibliotecas npm sem necessidade estrita e comprovada.

### Fase C: Após Implementar (Passos 9 a 14)
9. **Verificação de Tipos e Build:** Executar `PATH=$PATH:/Users/macos/.local/bin npm run build` (`tsc -b && vite build`) garantindo 0 erros.
10. **Execução de Todos os Testes:** Executar `PATH=$PATH:/Users/macos/.local/bin npm test` garantindo que todos os 72+ testes passem.
11. **Validação do Comportamento Solicitado:** Conferir que a demanda do usuário foi plenamente atendida no código e na integração.
12. **Auditoria de Arquivos Modificados:** Rodar `git status` e `git diff` para inspecionar cada linha alterada e garantir que nenhum arquivo fora do escopo foi modificado.
13. **Verificação das Regras de Negócio:** Confirmar que os 7 contratos permanentes continuam íntegros.
14. **Emissão do Resumo de Mudança:** Produzir o resumo de auditoria no formato padronizado antes de concluir a resposta.

---

## 4. POLÍTICA DE CONTROLE DE VERSÃO E PROTEÇÃO GITHUB

1. **Desenvolvimento via Branches:**
   - `main`: Branch de produção protegida. Apenas código testado e aprovado no CI pode ser integrado.
   - `develop` ou feature branches (`feat/*`, `fix/*`): Branches de trabalho para alterações.
2. **Pull Requests e Revisão:**
   - Nenhuma entrega direta deve sobrescrever proteções de branch.
   - Todo PR para `main` dispara o GitHub Actions Quality Gate.
3. **Bloqueio Automático no CI (`.github/workflows/ci.yml`):**
   - O merge é automaticamente bloqueado se qualquer etapa falhar:
     - `Verify Critical Protection Suites Exist` (impede remoção de suítes de segurança).
     - `Lint Codebase`.
     - `TypeScript TypeCheck & Build Bundle`.
     - `Run Vitest Unit & ERP Regression Tests` (72+ testes obrigatórios).

---

## 5. TEMPLATE OBRIGATÓRIO DE REVISÃO POR MUDANÇA

Ao finalizar qualquer implementação, o agente deve apresentar este resumo simples:

```markdown
### Resumo da Alteração Realizada
- **O que foi alterado:** [Resumo sucinto dos arquivos e funções modificados]
- **Funcionalidades potencialmente afetadas:** [Módulos com interface ou dependência com a mudança]
- **Testes executados:** [Comando executado e suítes cobertas]
- **Status dos testes:** [Quantidade aprovada, zero falhas]
- **Partes que não puderam ser testadas automaticamente:** [Ex.: comportamento visual específico, webhook de terceiro]
- **Veredito de Segurança:** [Pronto para publicação OU Exige revisão manual prévia]
```

