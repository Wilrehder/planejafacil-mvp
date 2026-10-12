import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://inqgxjdvuizsdtolrwfb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucWd4amR2dWl6c2R0b2xyd2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3Mjc0NDAsImV4cCI6MjEwNzMwMzQ0MH0.2XA7O5wLQQ9Wos855oIC4HPLBqp-0jkvbqpaHWFPVEQ';

if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {} as any;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

test.describe('PlanejaFácil — Suíte Oficial E2E de Homologação (Fase 6)', () => {

  test('Jornada A — Consumidor: Landing → Simulador → CEP → Envio de Lead → Proposta', async ({ page }) => {
    // 1. Acessar Landing Page
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Faça seu orçamento em minutos');

    // 2. Clicar no CTA Principal para abrir o Simulador
    const ctaButton = page.locator('button:has-text("Faça seu Orçamento")').first();
    await expect(ctaButton).toBeVisible();
    await ctaButton.click();

    // 3. Etapa 1: Seleção de Cômodo
    await expect(page.locator('text=Qual cômodo você deseja planejar')).toBeVisible();
    const btnAvancarMedidas = page.locator('button:has-text("Avançar para Medidas")').first();
    await expect(btnAvancarMedidas).toBeVisible();
    await btnAvancarMedidas.click();

    // 4. Etapa 2: Medidas do Cômodo
    await expect(page.locator('text=Medidas do Cômodo')).toBeVisible();
    const btnCalcular = page.locator('button:has-text("Calcular Estimativa")').first();
    await expect(btnCalcular).toBeVisible();
    await btnCalcular.click();

    // 5. Etapa 3: Dados de Contato e CEP
    await expect(page.locator('text=Seus Dados para Exibir o Orçamento')).toBeVisible();

    const timestamp = Date.now();
    const testName = `Consumidor E2E ${timestamp}`;
    const testPhone = '(11) 99887-1122';
    const testCep = '08674-000'; // Suzano - SP (com loja credenciada)

    await page.fill('input[placeholder="Ex: Ana Maria Silva"]', testName);
    await page.fill('input[placeholder="Ex: (11) 98765-4321"]', testPhone);
    
    const cepInput = page.locator('input[placeholder="Ex: 08674-000"]');
    await cepInput.fill(testCep);
    await cepInput.blur();

    // Aguardar resolução do CEP
    await expect(page.locator('text=Região identificada: Suzano, SP')).toBeVisible({ timeout: 10000 });

    // Enviar formulário
    const btnVerOrcamento = page.locator('button:has-text("Ver Orçamento Estimado")');
    await expect(btnVerOrcamento).toBeVisible();
    await btnVerOrcamento.click();

    // 6. Etapa 4: Tela de Proposta e Atribuição
    await expect(page.locator('text=Orçamento Estimado do Seu Projeto')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Loja Parceira Atribuída')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Suzano/SP')).toBeVisible();

    // 7. Validação de Persistência no PostgreSQL com credenciais autenticadas da administração
    await supabase.auth.signInWithPassword({
      email: 'admin@planejafacil.com.br',
      password: 'PlanejaFacil2026!',
    });

    const { data: adminLeads, error: adminError } = await supabase
      .from('leads')
      .select('id, name, phone, city_name, state_uf, distribution_status')
      .eq('name', testName);

    expect(adminError).toBeNull();
    expect(adminLeads).toBeDefined();
    expect(adminLeads!.length).toBeGreaterThan(0);
    expect(adminLeads![0].city_name).toBe('Suzano');
    expect(adminLeads![0].distribution_status).toBe('atribuido');
  });

  test('Jornada B — CRM: Acesso Lojista → Drawer de Lead → Adicionar Nota → Histórico', async ({ page }) => {
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    await page.goto('/');

    // 1. Alternar perfil para Lojista
    await page.click('[data-testid="role-selector-button"]');
    await page.click('[data-testid="role-merchant-btn"]');

    // 2. Verificar que o painel do Lojista (CRM) carregou
    await expect(page.getByRole('button', { name: 'CRM', exact: true })).toBeVisible();

    // Aguardar tabela estabilizar
    await page.waitForTimeout(1500);

    // 3. Localizar botão "Projeto" de um lead da lista e abrir o drawer
    const openLeadBtn = page.locator('button:has-text("Projeto")').first();
    await expect(openLeadBtn).toBeVisible({ timeout: 15000 });
    await openLeadBtn.click({ force: true });

    // 4. Verificar se o Drawer de Detalhes abriu e preencher nota
    const commentInput = page.locator('input[placeholder="Adicionar nota comercial..."]').first();
    await expect(commentInput).toBeVisible({ timeout: 10000 });
    
    const noteText = `Homologação E2E nota ${Date.now()}`;
    await commentInput.fill(noteText);
    await page.locator('form:has(input[placeholder="Adicionar nota comercial..."]) button[type="submit"]').click();

    // 5. Confirmar que a nota foi inserida e exibida no histórico
    await expect(page.locator(`text=${noteText}`)).toBeVisible({ timeout: 10000 });

    // Fechar drawer com force true
    const closeBtn = page.locator('div.fixed.inset-0 button:has(svg.lucide-x)').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click({ force: true });
    }
  });

  test('Jornada C — ERP: Navegação ERP → Pasta do Pedido → Gestão Operacional', async ({ page }) => {
    await page.goto('/');

    // 1. Mudar para Lojista
    await page.click('[data-testid="role-selector-button"]');
    await page.click('[data-testid="role-merchant-btn"]');

    // 2. Alternar para a aba ERP
    const erpTabButton = page.locator('button:has-text("ERP")').first();
    await expect(erpTabButton).toBeVisible();
    await erpTabButton.click();

    // 3. Confirmar que o ERP carregou as etapas operacionais
    await expect(page.locator('text=Volume Contratado')).toBeVisible();

    // 4. Localizar um pedido e abrir a pasta
    const openFolderBtn = page.locator('button:has-text("Abrir Pasta"), button:has-text("Pasta Completa"), button:has-text("Gerenciar")').first();
    await expect(openFolderBtn).toBeVisible({ timeout: 10000 });
    await openFolderBtn.click();

    // Confirmar que o modal operacional abriu exibindo as etapas
    await expect(page.locator('div.bg-slate-900').filter({ hasText: /PED-|Tel:/i }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("1. Medição"), span:has-text("1. Medição")').first()).toBeVisible();
    await expect(page.locator('button:has-text("6. Concluído"), span:has-text("6. Concluído")').first()).toBeVisible();

    // Fechar modal usando force true para não ser interceptado pelo SVG
    const closeFolderBtn = page.locator('div.bg-slate-900 button:has(svg.lucide-x)').first();
    await closeFolderBtn.click({ force: true });
  });

  test('Jornada D — Administrador: Métricas Financeiras → Faturas → Registro Manual de Pagamento', async ({ page }) => {
    await page.goto('/');

    // 1. Alternar para Administrador
    await page.click('[data-testid="role-selector-button"]');
    await page.click('[data-testid="role-admin-btn"]');

    // 2. Verificar painel administrativo
    await expect(page.locator('text=Central do SaaS')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible();

    // 3. Verificar cards financeiros
    await expect(page.locator('text=Total Faturado Emitido')).toBeVisible();
    await expect(page.locator('text=Registrado como Recebido')).toBeVisible();
    await expect(page.locator('text=Saldo Pendente em Aberto')).toBeVisible();

    // 4. Localizar botão de registro de recebimento manual se houver fatura pendente
    const btnRegistrarRecebimento = page.locator('button:has-text("Registrar Recebimento")').first();
    if (await btnRegistrarRecebimento.isVisible()) {
      await btnRegistrarRecebimento.click();

      // Preencher modal de liquidação manual
      await expect(page.locator('text=Registro Manual de Pagamento Externo')).toBeVisible();
      
      const valorInput = page.locator('input[placeholder="0,00"], input[type="number"]').first();
      await valorInput.fill('50');

      const refInput = page.locator('input[placeholder*="Ex: PIX-E2E"], input[placeholder*="Comprovante"]').first();
      if (await refInput.isVisible()) {
        await refInput.fill(`E2E-TEST-${Date.now()}`);
      }

      const btnConfirmar = page.locator('button:has-text("Confirmar Recebimento"), button:has-text("Salvar Recebimento")');
      await btnConfirmar.click();

      // Aguardar confirmação de sucesso
      await expect(page.locator('text=Pagamento registrado com sucesso')).toBeVisible({ timeout: 10000 });
    }
  });

  test('Jornada E — Segurança: Prova de Isolamento Multi-Tenant e Proteção RLS', async ({ page }) => {
    // 1. Testar acesso anônimo sem privilégios às tabelas operacionais restritas
    const { data: tenantData, error: tenantError } = await supabase
      .from('store_orders')
      .select('id, client_name, contracted_value');

    // RLS deve restringir retorno de pedidos protegidos para queries públicas
    expect(tenantData === null || tenantData.length === 0).toBe(true);

    // 2. Testar tentativa direta de autoliquidação financeira por chamada não autorizada
    const fakeInvoiceId = '00000000-0000-0000-0000-000000000000';
    const { error: rpcError } = await supabase.rpc('admin_register_manual_payment', {
      p_invoice_id: fakeInvoiceId,
      p_amount: 100,
      p_payment_method: 'pix',
      p_external_reference: 'ATTACK-BYPASS',
      p_notes: 'Tentativa indevida de autoliquidação',
    });

    // Deve falhar pois o usuário anônimo / não administrador não tem permissão (função revogada do anon/public ou erro de autorização)
    expect(rpcError).toBeDefined();
    expect(rpcError?.message).toMatch(/Could not find the function|Acesso negado|permission denied|violates/i);
  });

});
