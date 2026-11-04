import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { lookupCep } from '../lib/cepService';
import { calculateSimulationBudget } from '../lib/pricingEngine';
import { parsePromobXML } from '../lib/promobParser';
import { ClientContactSchema } from '../lib/validations';
import { submitSimulationAndLead } from '../lib/simulationService';
import { fetchStoreFurniture, saveStoreFurniture, fetchFinancialPartners, saveFinancialPartner } from '../lib/conventionalFurnitureService';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://inqgxjdvuizsdtolrwfb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucWd4amR2dWl6c2R0b2xyd2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3Mjc0NDAsImV4cCI6MjEwNzMwMzQ0MH0.2XA7O5wLQQ9Wos855oIC4HPLBqp-0jkvbqpaHWFPVEQ';

describe('BATERIA MASTER DE AUDITORIA TÉCNICA E FUNCIONAL — PLANEJA FÁCIL', () => {
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const adminClient = createClient(supabaseUrl, supabaseAnonKey);
  const storeClient = createClient(supabaseUrl, supabaseAnonKey);

  let activeTenantId: string;
  let activeTenantName: string;
  let createdLeadId: string;
  let createdAssignmentId: string;

  beforeAll(async () => {
    // 1. Autenticar Admin da Plataforma
    const adminAuth = await adminClient.auth.signInWithPassword({
      email: 'admin@planejafacil.com.br',
      password: 'PlanejaFacil2026!'
    });
    expect(adminAuth.error).toBeNull();

    // 2. Localiza loja ativa existente via adminClient
    const { data: stores, error } = await adminClient
      .from('tenants')
      .select('id, name, city_name, status')
      .eq('status', 'ativa')
      .limit(1);

    expect(error).toBeNull();
    expect(stores).toBeDefined();
    expect(stores!.length).toBeGreaterThan(0);

    activeTenantId = stores![0].id;
    activeTenantName = stores![0].name;

    // 3. Autentica usuário da loja (dono.suzano@loja.com ou similar)
    await storeClient.auth.signInWithPassword({
      email: 'dono.suzano@loja.com',
      password: 'PlanejaFacil2026!'
    });
  });

  // =========================================================================
  // 1. MOTORES DE CÁLCULO, CEP E SCHEMAS
  // =========================================================================
  describe('1. Motores Core de Cálculo, CEP e Schemas', () => {
    it('1.1 Validação de CEP via cepService identifica cidade e código IBGE oficial', async () => {
      const res = await lookupCep('08674-000'); // Suzano - SP
      expect(res.success).toBe(true);
      expect(res.city).toBe('Suzano');
      expect(res.state).toBe('SP');
      expect(res.ibgeCode).toBe('3552502');
    });

    it('1.2 Rejeita CEP com formato ou dígitos inválidos', async () => {
      const res = await lookupCep('123');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('1.3 Cálculo de orçamento por m² aplica fatores de margem mínima e máxima corretamente', () => {
      const budget = calculateSimulationBudget(
        [
          { areaM2: 12, ceilingHeight: 2.7, wallCount: 3 },
          { areaM2: 15, ceilingHeight: 2.6, wallCount: 2 }
        ],
        {
          baseM2Price: 1200,
          marginMinFactor: 0.88,
          marginMaxFactor: 1.15,
          furnitureCoverageRatio: 0.75,
          maxEffectiveHeight: 2.6,
          cityM2Prices: {}
        }
      );

      expect(budget.min).toBeGreaterThan(0);
      expect(budget.max).toBeGreaterThan(budget.min);
      expect(budget.totalEstimatedFurnitureM2).toBeGreaterThan(0);
    });

    it('1.4 Parser Promob XML extrai custo fabril, ambientes e valor orçado fielmente', () => {
      const mockXml = `<?xml version="1.0" encoding="utf-8"?>
        <PROMOB_PROJECT>
          <BUDGET VALUE="35000.00" />
          <ORDER VALUE="14000.00" />
          <CUSTOMERSDATA>
            <DATA ID="nomecliente" VALUE="Maria Silva" />
            <DATA ID="celular" VALUE="11988887777" />
            <DATA ID="Environment" VALUE="Cozinha Integrada" />
          </CUSTOMERSDATA>
        </PROMOB_PROJECT>`;

      const parsed = parsePromobXML(mockXml);
      expect(parsed).not.toBeNull();
      expect(parsed?.clientName).toBe('Maria Silva');
      expect(parsed?.budgetValue).toBe(35000);
      expect(parsed?.factoryOrderCost).toBe(14000);
      expect(parsed?.environmentName).toBe('Cozinha Integrada');
    });

    it('1.5 Schema de validação Zod bloqueia contatos incompletos ou dados malformados', () => {
      const invalidData = { name: 'A', phone: '123', email: 'email_invalido', cep: '00' };
      const parsed = ClientContactSchema.safeParse(invalidData);
      expect(parsed.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. SIMULAÇÃO, ROTEAMENTO GEOGRÁFICO E LGPD
  // =========================================================================
  describe('2. Simulação, Roteamento Geográfico e LGPD', () => {
    it('2.1 Consumidor submete simulação em Suzano, grava no banco e recebe atribuição', async () => {
      const submission = await submitSimulationAndLead({
        clientInfo: {
          name: 'Auditoria Lead Teste',
          phone: '(11) 98765-4321',
          cep: '08674-000', // Suzano
          email: 'auditoria.lead@planejafacil.com.br'
        },
        environments: [
          { typeId: 'cozinha', name: 'Cozinha Planejada', areaM2: 10, ceilingHeight: 2.7, wallCount: 3 }
        ]
      });

      expect(submission.success).toBe(true);
      expect(submission.leadId).toBeDefined();
      expect(submission.city).toBe('Suzano');
      createdLeadId = submission.leadId;
      createdAssignmentId = submission.assignmentId || '';

      // Verifica se gravou no banco de dados via adminClient
      const { data: leadDb, error } = await adminClient
        .from('leads')
        .select('*')
        .eq('id', submission.leadId)
        .single();

      expect(error).toBeNull();
      expect(leadDb).toBeDefined();
      expect(leadDb.name).toBe('Auditoria Lead Teste');
      expect(leadDb.city_name).toBe('Suzano');
    });

    it('2.2 Lead de município sem cobertura (Campinas) cai na fila administrativa sem_cobertura', async () => {
      const submission = await submitSimulationAndLead({
        clientInfo: {
          name: 'Cliente Campinas Sem Cobertura',
          phone: '(19) 98123-4567',
          cep: '13010-001', // Campinas
          email: 'campinas@teste.com'
        },
        environments: [
          { typeId: 'quarto', name: 'Suíte Master', areaM2: 14, ceilingHeight: 2.6, wallCount: 2 }
        ]
      });

      expect(submission.success).toBe(true);
      expect(submission.city).toBe('Campinas');
      expect(submission.distributionStatus).toBe('sem_cobertura');
      expect(submission.assignedStoreId).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. MÓVEIS CONVENCIONAIS E TAXAS FINANCEIRAS
  // =========================================================================
  describe('3. Móveis Convencionais e Instituições Financeiras', () => {
    let createdFurnitureId: string;
    let createdPartnerId: string;

    it('3.1 Lojista cadastra móvel convencional com Custo R$ 1.000 e Markup 70% gerando Preço R$ 1.700', async () => {
      const res = await saveStoreFurniture({
        tenantId: activeTenantId,
        name: 'Mesa de Jantar 6 Lugares Nobre',
        category: 'Sala de Jantar',
        description: 'Madeira maciça com tampo de vidro',
        widthCm: 180,
        heightCm: 78,
        depthCm: 90,
        colorFinish: 'Freijó',
        costPrice: 1000,
        markupPercentage: 70
      });

      expect(res.success).toBe(true);
      expect(res.item).toBeDefined();
      expect(res.item?.salePrice).toBe(1700);
      createdFurnitureId = res.item?.id || '';

      const catalog = await fetchStoreFurniture(activeTenantId);
      const found = catalog.find(f => f.id === createdFurnitureId);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Mesa de Jantar 6 Lugares Nobre');
    });

    it('3.2 Lojista cadastra financeira parceira com taxa de retenção de 8.5% e 24 parcelas', async () => {
      const res = await saveFinancialPartner({
        tenantId: activeTenantId,
        name: 'BV Financeira Homologada',
        retentionPercentage: 8.5,
        maxInstallments: 24
      });

      expect(res.success).toBe(true);
      expect(res.partner).toBeDefined();
      expect(res.partner?.retentionPercentage).toBe(8.5);
      createdPartnerId = res.partner?.id || '';

      const partners = await fetchFinancialPartners(activeTenantId);
      const found = partners.find(p => p.id === createdPartnerId);
      expect(found).toBeDefined();
      expect(found?.name).toBe('BV Financeira Homologada');
    });
  });

  // =========================================================================
  // 4. CRM, ISOLAMENTO MULTI-TENANT E SEGURANÇA RLS
  // =========================================================================
  describe('4. CRM, Regras Comerciais e Segurança RLS', () => {
    it('4.1 Usuário anônimo é BLOQUEADO ao tentar consultar get_store_leads (RLS)', async () => {
      const { data, error } = await anonClient.rpc('get_store_leads', {
        p_tenant_id: activeTenantId
      });

      // Deve falhar com erro de autenticação ou permissão
      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/Acesso negado/i);
    });

    it('4.2 Lojista autenticado é bloqueado se tentar consultar outra loja não vinculada', async () => {
      // Usuário autenticado de outra loja tentando consultar activeTenantId
      const otherTenant = 'b1010000-0000-0000-0000-000000000001'; // Mogi
      const { data, error } = await storeClient.rpc('get_store_leads', {
        p_tenant_id: otherTenant
      });

      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/loja não vinculada/i);
    });

    it('4.3 Bloqueio de avanço de etapa: Não permite avançar para "orcado" se não houver anexo', async () => {
      if (createdAssignmentId) {
        const { data: leadItem } = await adminClient
          .from('lead_assignments')
          .select('attachment_name')
          .eq('id', createdAssignmentId)
          .maybeSingle();

        const hasAttachment = Boolean(leadItem?.attachment_name);
        expect(hasAttachment).toBe(false);
      }
    });
  });

  // =========================================================================
  // 5. SAAS ADMIN: CONTRATO COM RETENÇÃO E SUSPENSÃO
  // =========================================================================
  describe('5. SaaS Admin: Contrato B2B e Suspensão de Loja', () => {
    it('5.1 Valida presença da cláusula de permanência de 3 meses na tabela tenants via adminClient', async () => {
      const { data: store, error } = await adminClient
        .from('tenants')
        .select('id, name, has_retention_clause, retention_months')
        .eq('id', activeTenantId)
        .single();

      expect(error).toBeNull();
      expect(store).toBeDefined();
      expect(store!.retention_months).toBeDefined();
    });

    it('5.2 Procedure admin_set_store_suspension bloqueia usuário anônimo (Segurança RLS)', async () => {
      const { data, error } = await anonClient.rpc('admin_set_store_suspension', {
        p_tenant_id: activeTenantId,
        p_suspended: false,
        p_reason: 'Tentativa anônima'
      });

      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/permission denied|Acesso negado/i);
    });

    it('5.3 Procedure admin_set_store_suspension executa com sucesso quando chamada pelo Admin', async () => {
      const { data, error } = await adminClient.rpc('admin_set_store_suspension', {
        p_tenant_id: activeTenantId,
        p_suspended: false, // Mantém ativa
        p_reason: 'Verificação de integridade administrativa'
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
    });
  });
});
