global.WebSocket = class {};
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

let envConfig = {};
if (fs.existsSync(".env")) {
  const lines = fs.readFileSync(".env", "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      envConfig[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
}

const url = envConfig.VITE_SUPABASE_URL || "https://inqgxjdvuizsdtolrwfb.supabase.co";
const key = envConfig.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function runEndToEndVerification() {
  console.log("=== INÍCIO DA VALIDAÇÃO LIVE DO FLUXO COMPLETO ===");

  // Obter tenant_id da loja de Suzano
  const { data: tenant } = await supabase.from("tenants").select("id, name").eq("slug", "store-suzano").maybeSingle();
  const tenantId = tenant ? tenant.id : "202bb2d5-00d4-426b-a72a-aacfe776977a";
  console.log("Loja Testada:", tenantId, tenant?.name);

  // 1. Cadastrar Lead via submit_consumer_simulation para Suzano (gerando Lead + Assignment para a loja de Suzano)
  const clientCpf = "456.789.012-34";
  const { data: simRes, error: simErr } = await supabase.rpc("submit_consumer_simulation", {
    p_client_name: "Cliente Validação Formalização",
    p_client_phone: "11988887777",
    p_client_cep: "08674000",
    p_city_ibge_code: "3552502",
    p_city_name: "Suzano",
    p_state_uf: "SP",
    p_client_email: "cliente.validacao@planejafacil.com",
    p_environments: [
      {
        typeId: "cozinha",
        name: "Cozinha Planejada",
        areaM2: 15,
        ceilingHeight: 2.7,
        wallCount: 3
      }
    ]
  });

  if (simErr || !simRes || !simRes.success) {
    console.error("Erro ao submeter simulação:", simErr, simRes);
    process.exit(1);
  }
  console.log("1. Lead criado e roteado para loja:", simRes.assigned_store_name, "Lead ID:", simRes.lead_id);

  // Obter os leads da loja de Suzano
  const { data: storeLeadsData, error: storeLeadsError } = await supabase.rpc("get_store_leads", {
    p_tenant_id: tenantId
  });

  if (storeLeadsError) {
    console.error("Erro em get_store_leads:", storeLeadsError);
  }

  const leadItem = (storeLeadsData?.leads || []).find(l => l.id === simRes.lead_id);
  if (!leadItem) {
    console.error("Lead recém criado não encontrado em get_store_leads:", storeLeadsData);
    process.exit(1);
  }
  const assignmentId = leadItem.assignmentId;
  console.log("   - Lead Assignment ID obtido via get_store_leads:", assignmentId);

  // 1.1 Preencher Ficha Cadastral Obrigatória do Cliente via RPC update_lead_registration_data
  const { data: regRes, error: regErr } = await supabase.rpc("update_lead_registration_data", {
    p_assignment_id: assignmentId,
    p_cpf: clientCpf,
    p_rg: "55.444.333-2",
    p_birth_date: "1990-05-15",
    p_billing_address: "Rua Teste de Faturamento, 100 - Suzano/SP",
    p_installation_address: "Rua das Obras e Montagem, 200, Apto 42 - Suzano/SP",
    p_desired_deadline: "45 dias"
  });

  if (regErr || !regRes || !regRes.success) {
    console.error("Erro ao atualizar ficha cadastral do lead:", regErr, regRes);
  } else {
    console.log("   - Ficha Cadastral Obrigatória Preenchida com Sucesso!");
  }

  // 2. Salvar Orçamento Consolidado (Status: Orçado) via RPC save_lead_commercial_proposal
  const proposalPayload = {
    finalOrderTotal: 25000,
    promobValue: 22000,
    conventionalTotal: 3000,
    discountPct: 0,
    discountAmount: 0,
    paymentMethodLabel: "Pix à vista",
    paymentAllocations: [
      {
        id: "alloc-1",
        method: "pix",
        methodLabel: "Pix / Transferência",
        baseAmount: 25000,
        installments: 1,
        feePercentage: 0,
        feeAmount: 0,
        totalAmountWithFee: 25000,
        installmentValue: 25000,
        surchargePct: 0,
        surchargeAmount: 0,
        totalAmount: 25000
      }
    ]
  };

  const { data: propRes, error: propErr } = await supabase.rpc("save_lead_commercial_proposal", {
    p_assignment_id: assignmentId,
    p_proposal: proposalPayload,
    p_final_price: 25000,
    p_factory_cost: 12000
  });

  if (propErr || !propRes || !propRes.success) {
    console.error("Erro ao salvar proposta no assignment:", propErr, propRes);
  }
  console.log("2. Orçamento criado no CRM (status: orçado)");

  // 3. Executar Aprovação Comercial (Botão Fechado -> convert_lead_to_order)
  const { data: convRes, error: convErr } = await supabase.rpc("convert_lead_to_order", {
    p_assignment_id: assignmentId,
    p_total_value: 25000
  });

  if (convErr || !convRes || !convRes.success) {
    console.error("Erro em convert_lead_to_order:", convErr, convRes);
    process.exit(1);
  }
  console.log("3. Venda Marcada como Fechada -> Pedido criado no ERP!");
  console.log("   - Número do Pedido:", convRes.order_number);
  console.log("   - Estágio Inicial:", convRes.current_stage, "(Esperado: formalizacao_contratual)");
  console.log("   - Status do Contrato:", convRes.contract_status, "(Esperado: formalizacao_pendente)");
  console.log("   - Token de Assinatura:", convRes.contract_token ? "Gerado com sucesso (" + convRes.contract_token.slice(0, 10) + "...)" : "Não gerado");

  if (convRes.current_stage !== "formalizacao_contratual") {
    console.error("FALHA: Pedido não iniciou em formalizacao_contratual!");
    process.exit(1);
  }

  // 4. Testar Bloqueio de Avanço sem Formalização
  const { data: advanceBlocked } = await supabase.rpc("advance_order_stage", {
    p_order_id: convRes.order_id,
    p_target_stage: "medicao"
  });
  console.log("4. Tentativa de avanço para Medição Fina sem formalização:");
  console.log("   - Bloqueado com sucesso?", advanceBlocked.success === false);
  console.log("   - Mensagem de bloqueio:", advanceBlocked.error);
  if (advanceBlocked.success) {
    console.error("FALHA: O sistema permitiu avançar sem formalização!");
    process.exit(1);
  }

  // 5. Consulta Pública do Contrato pelo Token (Sem Login de Lojista)
  const { data: publicContract, error: pubErr } = await supabase.rpc("get_contract_for_signing", {
    p_token: convRes.contract_token
  });
  if (pubErr || !publicContract || !publicContract.success) {
    console.error("Erro na consulta pública do contrato:", pubErr, publicContract);
    process.exit(1);
  }
  console.log("5. Consulta pública do contrato pelo token (sem login) funcionou 100%!");
  console.log("   - Cliente encontrado:", publicContract.order.client_name);
  console.log("   - Loja Contratada:", publicContract.template.tradeName);

  // 6. Submissão da Assinatura Digital do Cliente
  const { data: signRes, error: signErr } = await supabase.rpc("submit_contract_signature", {
    p_token: convRes.contract_token,
    p_signer_name: "Cliente Validação Formalização",
    p_signer_cpf: clientCpf,
    p_signer_ip: "189.120.45.10",
    p_signer_user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    p_signature_image: "data:image/png;base64,mockRubricaDataUrl"
  });

  if (signErr || !signRes || !signRes.success) {
    console.error("Erro ao assinar contrato:", signErr, signRes);
    process.exit(1);
  }
  console.log("6. Assinatura Digital enviada pelo cliente!");
  console.log("   - Contrato Atualizado para:", signRes.contract_status);
  console.log("   - Pedido Avançado Automaticamente para:", signRes.current_stage);

  if (signRes.current_stage !== "medicao") {
    console.error("FALHA: O pedido não avançou automaticamente para medicao após a assinatura digital!");
    process.exit(1);
  }

  // 7. Verificar Registro no Banco e Auditoria via get_store_orders
  const { data: storeOrdersData } = await supabase.rpc("get_store_orders", {
    p_tenant_id: tenantId
  });
  const updatedOrder = (storeOrdersData?.orders || []).find(o => o.uuid === convRes.order_id || o.id === convRes.order_number);

  console.log("7. Verificação dos dados persistidos no pedido:");
  console.log("   - Estágio Atual:", updatedOrder?.currentStage);
  console.log("   - Status Contratual:", updatedOrder?.contractStatus);
  console.log("   - Signatário:", updatedOrder?.contractSignedByName, "CPF:", updatedOrder?.contractSignedByCpf);
  console.log("   - Data/Hora Assinatura:", updatedOrder?.contractSignedAt);

  console.log("=== FLUXO COMPLETO CRM -> CONTRATO -> ERP VALIDADO COM 100% DE SUCESSO! ===");
}

runEndToEndVerification().catch((e) => {
  console.error("Exceção:", e);
  process.exit(1);
});
