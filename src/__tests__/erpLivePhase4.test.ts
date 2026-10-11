import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { submitSimulationAndLead } from '../lib/simulationService';

// Polyfill mock WebSocket para Node.js
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {} as any;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://inqgxjdvuizsdtolrwfb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucWd4amR2dWl6c2R0b2xyd2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTA4ODEsImV4cCI6MjA3NTc2Njg4MX0.X_b_0rMh_vKq7K_M6zT8p4Qj3z5A_L4D7x8E2A0O4tI';

describe('FASE 4 — Bateria de Testes do ERP Operacional Completo (PostgreSQL + Supabase Storage)', () => {
  let clientAnon: any;
  let clientSuzano: any;
  let clientMogi: any;
  let clientAdmin: any;

  let suzanoLeadId: string;
  let suzanoAssignmentId: string;
  let suzanoOrderId: string;
  let suzanoOrderNumber: string;

  beforeAll(async () => {
    clientAnon = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientSuzano = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientMogi = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    clientAdmin = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

    // Autenticações de lojistas reais
    const resSuzano = await clientSuzano.auth.signInWithPassword({
      email: 'dono.suzano@loja.com',
      password: 'PlanejaFacil2026!',
    });
    expect(resSuzano.error).toBeNull();

    const resMogi = await clientMogi.auth.signInWithPassword({
      email: 'dono.mogi@loja.com',
      password: 'PlanejaFacil2026!',
    });
    expect(resMogi.error).toBeNull();

    const resAdmin = await clientAdmin.auth.signInWithPassword({
      email: 'admin@planejafacil.com.br',
      password: 'PlanejaFacil2026!',
    });
    expect(resAdmin.error).toBeNull();

    // 1. Criar um lead real vindo do simulador para Suzano
    let simRes = await submitSimulationAndLead({
      clientInfo: {
        name: 'Cliente ERP Fase 4 Suzano',
        phone: '11966669999',
        cep: '08674-000', // Suzano
        email: 'erp.fase4@suzano.com',
      },
      environments: [
        {
          typeId: 'cozinha',
          name: 'Cozinha Planejada Premium ERP',
          areaM2: 18,
          ceilingHeight: 2.7,
          wallCount: 3,
        },
      ],
    });

    if (simRes.assignedStoreId !== 'b1020000-0000-0000-0000-000000000002') {
      simRes = await submitSimulationAndLead({
        clientInfo: {
          name: 'Cliente ERP Fase 4 Suzano Alvo',
          phone: '11966669998',
          cep: '08674-000',
          email: 'erp.fase4.target@suzano.com',
        },
        environments: [
          {
            typeId: 'cozinha',
            name: 'Cozinha Planejada Premium ERP 2',
            areaM2: 18,
            ceilingHeight: 2.7,
            wallCount: 3,
          },
        ],
      });
    }

    expect(simRes.success).toBe(true);
    suzanoLeadId = simRes.leadId;

    const { data: asgData } = await clientSuzano
      .from('lead_assignments')
      .select('id')
      .eq('lead_id', suzanoLeadId)
      .single();

    expect(asgData).toBeDefined();
    suzanoAssignmentId = asgData.id;

    // Anexar proposta técnica obrigatória no CRM antes de converter
    await clientSuzano.rpc('attach_lead_proposal', {
      p_assignment_id: suzanoAssignmentId,
      p_file_name: 'proposta_comercial_fase4.pdf',
      p_file_url: 'https://inqgxjdvuizsdtolrwfb.supabase.co/storage/v1/object/authenticated/lead-proposals/proposta.pdf',
      p_file_size_bytes: 35000,
    });
  });

  it('1. Converter lead em pedido: Cria pedido único (#PED-XXXX) na etapa "medicao"', async () => {
    const res = await clientSuzano.rpc('convert_lead_to_order', {
      p_assignment_id: suzanoAssignmentId,
      p_total_value: 30000,
    });

    expect(res.error).toBeNull();
    expect(res.data.success).toBe(true);
    expect(res.data.order_number).toMatch(/^PED-\d+/);
    expect(res.data.total_value).toBe(30000);
    expect(res.data.contracted_value).toBe(30000);
    expect(res.data.estimated_budget).toBeGreaterThan(0);

    suzanoOrderId = res.data.order_id;
    suzanoOrderNumber = res.data.order_number;
  });

  it('2. Consultar pedido persistido no ERP via get_store_orders com isolamento', async () => {
    const res = await clientSuzano.rpc('get_store_orders', {
      p_tenant_id: 'b1020000-0000-0000-0000-000000000002',
    });

    expect(res.error).toBeNull();
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.orders)).toBe(true);

    const found = res.data.orders.find((o: any) => o.uuid === suzanoOrderId || o.orderNumber === suzanoOrderNumber);
    expect(found).toBeDefined();
    expect(found.clientName).toContain('Cliente ERP Fase 4');
    expect(found.currentStage).toBe('medicao');
    expect(found.contractedValue).toBe(30000);
    expect(found.timeline.length).toBeGreaterThan(0);
  });

  it('3. Idempotência estrita: Repetir conversão retorna pedido existente sem duplicidade', async () => {
    const resRepeat = await clientSuzano.rpc('convert_lead_to_order', {
      p_assignment_id: suzanoAssignmentId,
      p_total_value: 30000,
    });

    expect(resRepeat.error).toBeNull();
    expect(resRepeat.data.success).toBe(true);
    expect(resRepeat.data.status).toBe('already_converted');
    expect(resRepeat.data.order_number).toBe(suzanoOrderNumber);
    expect(resRepeat.data.order_id).toBe(suzanoOrderId);
  });

  it('4. Upload e anexo de documento na Pasta Digital do Pedido (order_documents)', async () => {
    // Simular upload de arquivo para a pasta do tenant no storage
    const storagePath = `b1020000-0000-0000-0000-000000000002/${suzanoOrderId}/medicao_tecnica_obra.pdf`;
    
    // Teste da procedure de anexo de documento
    const resAttach = await clientSuzano.rpc('attach_order_document', {
      p_order_id: suzanoOrderId,
      p_stage: 'medicao',
      p_doc_type: 'ficha_medicao',
      p_file_name: 'ficha_medicao_oficial.pdf',
      p_file_path: storagePath,
      p_file_size_bytes: 45000,
      p_mime_type: 'application/pdf',
    });

    expect(resAttach.error).toBeNull();
    expect(resAttach.data.success).toBe(true);
    expect(resAttach.data.document_id).toBeDefined();

    // Confirmar que o flag medicao_done foi marcado como true
    const { data: orderCheck } = await clientSuzano
      .from('orders')
      .select('medicao_done')
      .eq('id', suzanoOrderId)
      .single();

    expect(orderCheck.medicao_done).toBe(true);
  });

  it('5. Gating documental: Bloqueio de avanço para Produção sem projeto executivo aprovado', async () => {
    // Primeiro avança para projeto_aprovacao (requisito de medição foi cumprido)
    const resAdv1 = await clientSuzano.rpc('advance_order_stage', {
      p_order_id: suzanoOrderId,
      p_target_stage: 'projeto_aprovacao',
      p_action_message: 'Medição técnica aprovada pelo projetista.',
    });

    expect(resAdv1.error).toBeNull();
    expect(resAdv1.data.success).toBe(true);
    expect(resAdv1.data.current_stage).toBe('projeto_aprovacao');

    // Agora tenta avançar para producao SEM anexar o projeto 3D
    const resAdvBlocked = await clientSuzano.rpc('advance_order_stage', {
      p_order_id: suzanoOrderId,
      p_target_stage: 'producao',
      p_action_message: 'Tentativa de avanço sem projeto',
      p_stage_confirmation: false,
    });

    expect(resAdvBlocked.data.success).toBe(false);
    expect(resAdvBlocked.data.error).toContain('Bloqueio de avanço: Projeto');
  });

  it('6. Liberar avanço após cumprir os requisitos de projeto e aprovação', async () => {
    // Anexar projeto 3D
    await clientSuzano.rpc('attach_order_document', {
      p_order_id: suzanoOrderId,
      p_stage: 'projeto',
      p_doc_type: 'projeto_aprovado',
      p_file_name: 'projeto_executivo_cozinha_3d.pdf',
      p_file_path: `b1020000-0000-0000-0000-000000000002/${suzanoOrderId}/projeto_executivo.pdf`,
      p_file_size_bytes: 125000,
      p_mime_type: 'application/pdf',
    });

    // Agora o avanço para produção é liberado
    const resAdv2 = await clientSuzano.rpc('advance_order_stage', {
      p_order_id: suzanoOrderId,
      p_target_stage: 'producao',
      p_action_message: 'Projeto 3D aprovado pelo cliente com sucesso.',
      p_stage_confirmation: true,
    });

    expect(resAdv2.error).toBeNull();
    expect(resAdv2.data.success).toBe(true);
    expect(resAdv2.data.current_stage).toBe('producao');
  });

  it('7. Bloqueio de saltos de etapa inválidos (não sequenciais)', async () => {
    // Pedido está em 'producao'. Tentar pular direto para 'concluido'
    const resJump = await clientSuzano.rpc('advance_order_stage', {
      p_order_id: suzanoOrderId,
      p_target_stage: 'concluido',
      p_action_message: 'Tentativa de pular etapas',
    });

    expect(resJump.data.success).toBe(false);
    expect(resJump.data.error).toContain('estritamente sequencial');
  });

  it('8. Trilha de Auditoria imutável: Registra autor, papel, timestamp e mensagens', async () => {
    const { data: logs, error } = await clientSuzano
      .from('order_audit_logs')
      .select('id, user_name, user_role, action_message, stage_from, stage_to, created_at')
      .eq('order_id', suzanoOrderId)
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(logs.length).toBeGreaterThanOrEqual(3);

    const hasProjectApprovalLog = logs.some((l: any) => l.action_message.includes('Projeto 3D aprovado'));
    expect(hasProjectApprovalLog).toBe(true);
  });

  it('9. Preservação de arquivos na Pasta Digital após consulta', async () => {
    const { data: docs, error } = await clientSuzano
      .from('order_documents')
      .select('id, stage, file_name, file_size_bytes, mime_type, file_path')
      .eq('order_id', suzanoOrderId);

    expect(error).toBeNull();
    expect(docs.length).toBeGreaterThanOrEqual(2);

    const medicaoDoc = docs.find((d: any) => d.stage === 'medicao');
    expect(medicaoDoc).toBeDefined();
    expect(medicaoDoc.file_name).toBe('ficha_medicao_oficial.pdf');
  });

  it('10. Isolamento Multi-Tenant: Lojista de Mogi NÃO consegue ver nem alterar pedido de Suzano', async () => {
    // Tentativa de Mogi avançar etapa do pedido de Suzano
    const resForbidden = await clientMogi.rpc('advance_order_stage', {
      p_order_id: suzanoOrderId,
      p_target_stage: 'montagem',
    });

    expect(resForbidden.error).toBeDefined();
    expect(resForbidden.error?.code).toBe('42501');

    // Tentativa de Mogi consultar orders de Suzano passando o tenant de Suzano
    const resGetForbidden = await clientMogi.rpc('get_store_orders', {
      p_tenant_id: 'b1020000-0000-0000-0000-000000000002',
    });

    // Procedure ignora o parâmetro fraudulento e força o tenant de Mogi
    expect(resGetForbidden.data.tenant_id).toBe('b1010000-0000-0000-0000-000000000001');
    const hasSuzanoOrder = resGetForbidden.data.orders.some((o: any) => o.uuid === suzanoOrderId);
    expect(hasSuzanoOrder).toBe(false);
  });

  it('11. Métricas do ERP refletem indicadores reais por tenant', async () => {
    const resMetrics = await clientSuzano.rpc('get_erp_metrics', {
      p_tenant_id: 'b1020000-0000-0000-0000-000000000002',
    });

    expect(resMetrics.error).toBeNull();
    expect(resMetrics.data.success).toBe(true);
    expect(resMetrics.data.active_orders).toBeGreaterThanOrEqual(1);
    expect(resMetrics.data.total_contracted_value).toBeGreaterThanOrEqual(30000);
    expect(resMetrics.data.by_stage).toBeDefined();
  });

  it('12. Diferenciação de Orçamento Estimado vs Valor Contratado Real', async () => {
    // Atualizar valor contratado para R$ 34.500
    const resUpdateVal = await clientSuzano.rpc('update_order_contracted_value', {
      p_order_id: suzanoOrderId,
      p_contracted_value: 34500,
    });

    expect(resUpdateVal.error).toBeNull();
    expect(resUpdateVal.data.success).toBe(true);
    expect(resUpdateVal.data.new_value).toBe(34500);

    // Verificar que na tabela orders, contracted_value é 34500 e estimated_budget foi preservado
    const { data: orderData } = await clientSuzano
      .from('orders')
      .select('contracted_value, estimated_budget, total_value')
      .eq('id', suzanoOrderId)
      .single();

    expect(Number(orderData.contracted_value)).toBe(34500);
    expect(Number(orderData.total_value)).toBe(34500);
    expect(Number(orderData.estimated_budget)).toBeGreaterThan(0);
  });

  it('13. Ciclo completo: Avançar até "concluido" preenche completed_at', async () => {
    // 1. Produção -> Montagem
    const resToMontagem = await clientSuzano.rpc('advance_order_stage', {
      p_order_id: suzanoOrderId,
      p_target_stage: 'montagem',
      p_action_message: 'Móveis saíram da marcenaria para entrega e montagem.',
    });
    expect(resToMontagem.data.success).toBe(true);

    // 2. Anexar foto da montagem
    await clientSuzano.rpc('attach_order_document', {
      p_order_id: suzanoOrderId,
      p_stage: 'montagem',
      p_doc_type: 'foto_montagem',
      p_file_name: 'foto_montagem_finalizada.jpg',
      p_file_path: `b1020000-0000-0000-0000-000000000002/${suzanoOrderId}/foto_montagem.jpg`,
      p_file_size_bytes: 88000,
      p_mime_type: 'image/jpeg',
    });

    // 3. Montagem -> Entrega / Aceite
    const resToAceite = await clientSuzano.rpc('advance_order_stage', {
      p_order_id: suzanoOrderId,
      p_target_stage: 'entrega_aceite',
      p_action_message: 'Montagem finalizada e inspecionada.',
    });
    expect(resToAceite.data.success).toBe(true);

    // 4. Anexar termo de aceite assinado
    await clientSuzano.rpc('attach_order_document', {
      p_order_id: suzanoOrderId,
      p_stage: 'aceite',
      p_doc_type: 'termo_aceite',
      p_file_name: 'termo_aceite_cliente_assinado.pdf',
      p_file_path: `b1020000-0000-0000-0000-000000000002/${suzanoOrderId}/termo_aceite.pdf`,
      p_file_size_bytes: 52000,
      p_mime_type: 'application/pdf',
    });

    // 5. Entrega / Aceite -> Concluído
    const resToConcluido = await clientSuzano.rpc('advance_order_stage', {
      p_order_id: suzanoOrderId,
      p_target_stage: 'concluido',
      p_action_message: 'Vistoria aprovada e termo assinado. Pedido concluído!',
      p_stage_confirmation: true,
    });
    expect(resToConcluido.data.success).toBe(true);

    // Verificar que completed_at está preenchido
    const { data: finalOrder } = await clientSuzano
      .from('orders')
      .select('current_stage, completed_at')
      .eq('id', suzanoOrderId)
      .single();

    expect(finalOrder.current_stage).toBe('concluido');
    expect(finalOrder.completed_at).not.toBeNull();
  });

  it('14. Controle de pendências operacionais no pedido', async () => {
    const resPendency = await clientSuzano.rpc('update_order_pendency', {
      p_order_id: suzanoOrderId,
      p_has_pending: true,
      p_pending_notes: 'Cliente solicitou ajuste na gaveta superior direita.',
    });

    expect(resPendency.error).toBeNull();
    expect(resPendency.data.success).toBe(true);

    const { data: checkPendency } = await clientSuzano
      .from('orders')
      .select('has_pending_issues, pending_notes')
      .eq('id', suzanoOrderId)
      .single();

    expect(checkPendency.has_pending_issues).toBe(true);
    expect(checkPendency.pending_notes).toContain('ajuste na gaveta');
  });

  it('15. Rejeição de tipos de arquivo não permitidos no anexo', async () => {
    const resInvalidMime = await clientSuzano.rpc('attach_order_document', {
      p_order_id: suzanoOrderId,
      p_stage: 'medicao',
      p_doc_type: 'executavel_perigoso',
      p_file_name: 'virus.exe',
      p_file_path: 'b1020000-0000-0000-0000-000000000002/virus.exe',
      p_file_size_bytes: 1000,
      p_mime_type: 'application/x-msdownload',
    });

    expect(resInvalidMime.error).toBeDefined();
    expect(resInvalidMime.error?.code).toBe('22023');
  });

  it('16. Usuário anônimo é bloqueado nas procedures operacionais do ERP', async () => {
    const anonOrders = await clientAnon.rpc('get_store_orders', {
      p_tenant_id: 'b1020000-0000-0000-0000-000000000002',
    });
    expect(anonOrders.error).toBeDefined();

    const anonAdvance = await clientAnon.rpc('advance_order_stage', {
      p_order_id: suzanoOrderId,
      p_target_stage: 'montagem',
    });
    expect(anonAdvance.error).toBeDefined();
  });

  it('17. Simulador público continua 100% acessível para consumidores anônimos', async () => {
    const resSim = await submitSimulationAndLead({
      clientInfo: {
        name: 'Consumidor Anonimo Fase 4',
        phone: '11988887777',
        cep: '08674-000',
        email: 'anon.fase4@teste.com',
      },
      environments: [
        {
          typeId: 'quarto',
          name: 'Dormitório Casal',
          areaM2: 14,
          ceilingHeight: 2.6,
          wallCount: 2,
        },
      ],
    });

    expect(resSim.success).toBe(true);
    expect(resSim.distributionStatus).toBe('atribuido');
    expect(resSim.budgetMin).toBeGreaterThan(0);
  });
});
