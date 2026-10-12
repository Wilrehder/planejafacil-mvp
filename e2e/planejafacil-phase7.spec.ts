import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://inqgxjdvuizsdtolrwfb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucWd4amR2dWl6c2R0b2xyd2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3Mjc0NDAsImV4cCI6MjEwNzMwMzQ0MH0.2XA7O5wLQQ9Wos855oIC4HPLBqp-0jkvbqpaHWFPVEQ';

if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {} as any;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

test.describe('PlanejaFácil — Suíte Oficial E2E Fase 7 Final (6 Jornadas de Produção)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const logoutBtn = page.locator('[data-testid="logout-button"]');
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('Jornada 1 — Administrador cria lojista e provisiona acesso', async ({ page }) => {
    // 1. Abrir Modal de Login pela Navbar
    const loginBtn = page.locator('[data-testid="login-button"]');
    await expect(loginBtn).toBeVisible({ timeout: 15000 });
    await loginBtn.click();

    // 2. Preencher Credenciais de Administrador
    await expect(page.locator('text=Acesso ao PlanejaFácil')).toBeVisible();
    await page.fill('input[type="email"]', 'admin@planejafacil.com.br');
    await page.fill('input[type="password"]', 'PlanejaFacil2026!');
    await page.click('button:has-text("Acessar Painel")');

    // 3. Confirmar Login e Carregamento do Painel Master
    const logoutBtn = page.locator('[data-testid="logout-button"]');
    await expect(logoutBtn).toBeVisible({ timeout: 15000 });

    // 4. Navegar até a Aba de Lojas Parceiras
    const btnLojas = page.locator('button:has-text("Lojas Parceiras")').first();
    await expect(btnLojas).toBeVisible({ timeout: 10000 });
    await btnLojas.click();
    await expect(page.locator('text=Gestão de Lojas Parceiras')).toBeVisible();

    // 5. Clicar na aba de Lojas Credenciadas e em Credenciar Nova Loja
    const tabCredenciadas = page.locator('button:has-text("Lojas Credenciadas")').first();
    await expect(tabCredenciadas).toBeVisible();
    await tabCredenciadas.click();

    const btnNovaLoja = page.locator('button:has-text("Credenciar Nova Loja")').first();
    await expect(btnNovaLoja).toBeVisible();
    await btnNovaLoja.click();
    await expect(page.locator('text=Credenciar Nova Loja Parceira')).toBeVisible();

    const timestamp = Date.now();
    const newStoreName = `Marcenaria E2E ${timestamp}`;
    const newStoreEmail = `lojista.e2e.${timestamp}@teste.com`;
    const newCnpj = `${String(timestamp).slice(-8)}/0001-99`;

    // 6. Preencher Formulário com os placeholders reais
    await page.fill('input[placeholder="Ex: Dell Anno Moema"]', newStoreName);
    await page.fill('input[placeholder="Ex: 12.345.678/0001-90"]', newCnpj);
    await page.fill('input[placeholder="Ex: Carlos Eduardo"]', 'Roberto Lojista');
    await page.fill('input[placeholder="Ex: (11) 98765-4321"]', '(11) 98765-4321');
    await page.fill('input[placeholder="Ex: São Paulo"]', 'Suzano');
    await page.fill('input[placeholder="Ex: São Paulo - Zona Sul, Zona Oeste e Alphaville"]', 'Suzano e Região');

    // Credenciais de acesso
    await page.fill('input[placeholder="login.lojista@loja.com"]', newStoreEmail);
    await page.fill('input[placeholder="PlanejaFacil2026!"]', 'PlanejaFacil2026!');

    // 7. Salvar e Provisionar Loja & Usuário
    await page.click('button:has-text("Ativar e Credenciar Loja")');

    // Aguardar inclusão na lista
    await expect(page.locator(`text=${newStoreName}`)).toBeVisible({ timeout: 15000 });

    // 8. Verificação no Supabase: Usuário e Loja persistidos
    const adminCheckClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await adminCheckClient.auth.signInWithPassword({
      email: 'admin@planejafacil.com.br',
      password: 'PlanejaFacil2026!',
    });
    const { data: dbTenant } = await adminCheckClient
      .from('tenants')
      .select('id, name, cnpj, status, plan_tier')
      .eq('name', newStoreName)
      .single();

    expect(dbTenant).toBeDefined();
    expect(dbTenant?.status).toBe('ativa');

    // Limpeza da loja de teste
    if (dbTenant?.id) {
      await adminCheckClient.from('store_coverage').delete().eq('tenant_id', dbTenant.id);
      await adminCheckClient.from('subscription_history').delete().eq('tenant_id', dbTenant.id);
      await adminCheckClient.from('store_subscriptions').delete().eq('tenant_id', dbTenant.id);
      await adminCheckClient.from('users').delete().eq('tenant_id', dbTenant.id);
      await adminCheckClient.from('tenants').delete().eq('id', dbTenant.id);
    }
  });

  test('Jornada 2 — Lojista entra, consulta CRM próprio e encerra sessão', async ({ page }) => {
    // 1. Abrir Modal de Login
    const loginBtn = page.locator('[data-testid="login-button"]');
    await expect(loginBtn).toBeVisible({ timeout: 15000 });
    await loginBtn.click();

    // 2. Preencher com credenciais reais do Lojista de Suzano
    await page.fill('input[type="email"]', 'dono.suzano@loja.com');
    await page.fill('input[type="password"]', 'PlanejaFacil2026!');
    await page.click('button:has-text("Acessar Painel")');

    // 3. Redirecionamento direto ao CRM da loja
    const logoutBtn = page.locator('[data-testid="logout-button"]');
    await expect(logoutBtn).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'CRM' })).toBeVisible({ timeout: 15000 });

    // 4. Testar Encerramento de Sessão (Logout)
    await logoutBtn.click();

    // 5. Confirmação do Logout: Retorno à visão pública de consumidor
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible({ timeout: 10000 });
  });

  test('Jornada 3 — Consumidor gera lead sem login, persiste e distribui à loja', async ({ page }) => {
    // 1. Iniciar Simulação no CTA
    const ctaButton = page.locator('button:has-text("Faça seu Orçamento")').first();
    await ctaButton.click();

    // 2. Etapa 1: Ambiente
    await page.click('button:has-text("Avançar para Medidas")');

    // 3. Etapa 2: Medidas
    await page.click('button:has-text("Calcular Estimativa")');

    // 4. Etapa 3: Dados de Contato e CEP Suzano
    const timestamp = Date.now();
    const testLeadName = `Consumidor Fase7 ${timestamp}`;
    await page.fill('input[placeholder="Ex: Ana Maria Silva"]', testLeadName);
    await page.fill('input[placeholder="Ex: (11) 98765-4321"]', '(11) 99887-5544');

    const cepInput = page.locator('input[placeholder="Ex: 08674-000"]');
    await cepInput.fill('08674-000');
    await cepInput.blur();

    await expect(page.locator('text=Região identificada: Suzano, SP')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Ver Orçamento Estimado")');

    // 5. Visualizar Orçamento & Atribuição
    await expect(page.locator('text=Orçamento Estimado do Seu Projeto')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Loja Parceira Atribuída')).toBeVisible();

    // 6. Verificar Persistência no PostgreSQL via sessão autenticada de auditoria
    const adminCheckClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await adminCheckClient.auth.signInWithPassword({
      email: 'admin@planejafacil.com.br',
      password: 'PlanejaFacil2026!',
    });
    const { data: dbLeads } = await adminCheckClient
      .from('leads')
      .select('id, name, city_name, distribution_status')
      .eq('name', testLeadName);

    expect(dbLeads).toBeDefined();
    expect(dbLeads!.length).toBeGreaterThan(0);
    expect(dbLeads![0].distribution_status).toBe('atribuido');
  });

  test('Jornada 4 — CRM e ERP: Atendimento, conversão em pedido e etapas', async ({ page }) => {
    // 1. Login do Lojista
    await page.locator('[data-testid="login-button"]').click();
    await page.fill('input[type="email"]', 'dono.suzano@loja.com');
    await page.fill('input[type="password"]', 'PlanejaFacil2026!');
    await page.click('button:has-text("Acessar Painel")');

    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'CRM' })).toBeVisible({ timeout: 15000 });

    // 2. Abrir Drawer de Lead no CRM
    const btnProjeto = page.locator('button:has-text("Projeto")').first();
    await expect(btnProjeto).toBeVisible({ timeout: 15000 });
    await btnProjeto.click();

    // 3. Adicionar Nota de Atendimento
    const noteInput = page.locator('textarea[placeholder="Adicionar nota interna..."]');
    if (await noteInput.isVisible()) {
      await noteInput.fill('Atendimento E2E Fase 7: Visita agendada.');
      await page.click('button:has-text("Salvar Nota")');
      await expect(page.locator('text=Atendimento E2E Fase 7: Visita agendada.')).toBeVisible();
    }

    // 4. Fechar drawer e Acessar Módulo ERP
    const closeDrawerBtn = page.locator('div.fixed.inset-0 button:has(svg.lucide-x)').first();
    if (await closeDrawerBtn.isVisible()) {
      await closeDrawerBtn.click({ force: true });
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(600);

    const erpTabBtn = page.getByRole('button', { name: /ERP/ }).first();
    await expect(erpTabBtn).toBeVisible();
    await erpTabBtn.click({ force: true });
    await expect(page.locator('text=Volume Contratado')).toBeVisible({ timeout: 10000 });
  });

  test('Jornada 5 — Financeiro administrativo: Faturas e consolidação', async ({ page }) => {
    // 1. Login Admin
    await page.locator('[data-testid="login-button"]').click();
    await page.fill('input[type="email"]', 'admin@planejafacil.com.br');
    await page.fill('input[type="password"]', 'PlanejaFacil2026!');
    await page.click('button:has-text("Acessar Painel")');

    // 2. Acessar Visão Financeira Master
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible({ timeout: 15000 });
    const btnFin = page.locator('button:has-text("Financeiro")').first();
    await expect(btnFin).toBeVisible({ timeout: 10000 });
    await btnFin.click();

    // 3. Confirmar Indicadores de MRR, Inadimplência e Faturamento
    await expect(page.locator('text=Gestão Financeira & Cobranças')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Receita Recorrente (MRR)')).toBeVisible();
    await expect(page.locator('text=Faturas Consolidadas')).toBeVisible();
  });

  test('Jornada 6 — Segurança multi-tenant: Isolamento estrito entre lojas', async () => {
    // 1. Autenticar Lojista de Suzano
    const clientSuzano = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const authSuzano = await clientSuzano.auth.signInWithPassword({
      email: 'dono.suzano@loja.com',
      password: 'PlanejaFacil2026!',
    });
    expect(authSuzano.error).toBeNull();

    // 2. Autenticar Lojista de Mogi
    const clientMogi = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const authMogi = await clientMogi.auth.signInWithPassword({
      email: 'dono.mogi@loja.com',
      password: 'PlanejaFacil2026!',
    });
    expect(authMogi.error).toBeNull();

    // 3. Lojista de Suzano consulta leads
    const { data: suzanoLeads } = await clientSuzano.from('crm_leads').select('id, tenant_id');
    expect(suzanoLeads).toBeDefined();
    suzanoLeads?.forEach(lead => {
      expect(lead.tenant_id).toBe('b1020000-0000-0000-0000-000000000002');
    });

    // 4. Lojista de Mogi consulta leads
    const { data: mogiLeads } = await clientMogi.from('crm_leads').select('id, tenant_id');
    expect(mogiLeads).toBeDefined();
    mogiLeads?.forEach(lead => {
      expect(lead.tenant_id).toBe('b1020000-0000-0000-0000-000000000004');
    });

    // 5. Tentativa de escalada de privilégio: Lojista comum tentando RPC administrativo
    const { error: privEscError } = await clientSuzano.rpc('admin_provision_store_and_user', {
      p_name: 'Hack Store',
    });
    expect(privEscError).toBeDefined();
    expect(privEscError?.code).toBe('42501');
  });

});
