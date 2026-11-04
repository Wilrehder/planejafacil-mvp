# ROADMAP DE MELHORIAS E INSIGHTS DE PRODUTO — PLANEJA FÁCIL

Este documento consolida os insights identificados pela equipe multidisciplinar durante a auditoria técnica, priorizados por **Impacto no Negócio** e **Complexidade de Implementação**.

---

## 1. MATRIZ DE PRIORIZAÇÃO

```
   IMPACTO
     ▲
Alto │ [M01] Notificação WhatsApp Lead   [M02] PWA Offline Montador
     │ [M03] Conciliação PIX Automática  [M04] Motor 3D WebGL Realista
Médio│ [M05] Importador CSV Promob       [M06] Dark Mode Operacional
     │ [M07] Assinatura DocuSign/Gov.br  [M08] Multi-Empresas no mesmo CNPJ
     └────────────────────────────────────────────────────────► COMPLEXIDADE
                   Baixa                        Alta
```

---

## 2. DETALHAMENTO DAS OPORTUNIDADES IDENTIFICADAS

### [M01] Notificação Instantânea de Novo Lead via WhatsApp para o Vendedor
- **Problema:** Quando um lead é distribuído para a loja, o vendedor precisa estar com o painel aberto para notar o novo cartão no CRM.
- **Benefício:** Redução do tempo de primeiro contato de horas para menos de 5 minutos, aumentando em até 3x a taxa de conversão.
- **Prioridade:** **P1 (Alta)** | **Complexidade:** Baixa (Integração com Evolution API ou Z-API).
- **Recomendação Técnica:** Adicionar webhook no PostgreSQL (`AFTER INSERT ON lead_assignments`) disparando mensagem para o WhatsApp cadastrado do lojista.

### [M02] PWA Offline com Sincronização em Segundo Plano para o Montador
- **Problema:** Em prédios novos ou subsolos, os montadores frequentemente perdem sinal de internet ao tentar enviar fotos da montagem.
- **Benefício:** O montador tira as fotos normalmente; o app salva no IndexedDB local e faz upload automático assim que o aparelho recuperar sinal de internet.
- **Prioridade:** **P1 (Alta)** | **Complexidade:** Média (Service Worker + Workbox).
- **Recomendação Técnica:** Configurar plugin Vite PWA com cache persistente para rotas e fila de upload em background.

### [M03] Conciliação Automática de PIX via Webhooks Bancários
- **Problema:** A plataforma precisa de confirmação manual do pagamento da fatura B2B ou conciliação em lote.
- **Benefício:** Liquidação automática instantânea da mensalidade SaaS e desbloqueio imediato de lojas suspensas.
- **Prioridade:** **P2 (Média)** | **Complexidade:** Média (Integração com Mercado Pago, Asaas ou EFI).
- **Recomendação Técnica:** Criar Edge Function `api/webhooks/pix` assinada com HMAC para atualizar `invoices.status = 'pago'`.

### [M04] Pré-Visualização 3D Fotorrealista com Three.js / WebGL no Simulador
- **Problema:** A visualização atual do simulador é diagramática (isométrica 2.5D).
- **Benefício:** Efeito "UAU" imediato para o consumidor final, aumentando drasticamente o compartilhamento orgânico e o preenchimento de dados de contato.
- **Prioridade:** **P2 (Média)** | **Complexidade:** Alta (Three.js / React Three Fiber com modelos GLTF).
- **Recomendação Técnica:** Criar pipeline de texturas procedural para MDF (madeirados, grafite, linho) renderizados via WebGL.

### [M05] Importador em Lote de Móveis Convencionais via Excel / CSV
- **Problema:** Lojistas com mais de 50 produtos convencionais levam muito tempo cadastrando um a um no painel.
- **Benefício:** Cadastro do catálogo completo da loja em menos de 1 minuto.
- **Prioridade:** **P2 (Média)** | **Complexidade:** Baixa (PapaParse + bulk insert no Supabase).
- **Recomendação Técnica:** Adicionar botão "Importar Planilha" na aba de Móveis Convencionais com template pré-definido.

### [M06] Assinatura do Contrato B2B com Validação Gov.br ou Certificado Digital
- **Problema:** A assinatura digital atual é baseada em carimbo de IP e CPF do titular.
- **Benefício:** Segurança jurídica ampliada para contratos com cláusula de permanência mínima de 3 meses.
- **Prioridade:** **P3 (Baixa)** | **Complexidade:** Média.
- **Recomendação Técnica:** Integrar botão de login com a conta Gov.br para geração de selo prata/ouro de assinatura eletrônica avançada.
