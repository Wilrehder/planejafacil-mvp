-- ==============================================================================
-- MIGRAÇÃO: CONTRATO INTEGRAL, ORIGEM DE DADOS E SNAPSHOT VERSIONADO IMUTÁVEL
-- ==============================================================================
-- 1. Adiciona colunas de completude contratual e versionamento na tabela orders
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS client_email TEXT,
    ADD COLUMN IF NOT EXISTS client_cep VARCHAR(20),
    ADD COLUMN IF NOT EXISTS client_city TEXT,
    ADD COLUMN IF NOT EXISTS client_state VARCHAR(10),
    ADD COLUMN IF NOT EXISTS seller_name TEXT,
    ADD COLUMN IF NOT EXISTS contract_version INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS contract_snapshot JSONB;

-- 2. Adiciona vínculo de versão e snapshot assinado na tabela contract_signatures
ALTER TABLE public.contract_signatures
    ADD COLUMN IF NOT EXISTS contract_version INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS contract_snapshot JSONB;

-- 3. Função que retorna as 12 Cláusulas Contratuais Padrão Completas
CREATE OR REPLACE FUNCTION public.get_default_contract_clauses()
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
SELECT '[
  {
    "id": "clause-1",
    "number": "CLÁUSULA 1ª",
    "title": "DO OBJETO, DECLARAÇÕES E PROJETO TÉCNICO",
    "text": "1.1. O presente contrato tem por objeto a fabricação sob medida, fornecimento, transporte e montagem dos móveis planejados e itens convencionais discriminados neste instrumento e no projeto técnico executivo aprovado pelo(a) CONTRATANTE, que passa a integrar este contrato como anexo indissociável.\n1.2. O(A) CONTRATANTE declara ter plena ciência de que elementos meramente decorativos, eletrodomésticos, granitos, mármores, vidros especiais ou acessórios exibidos em imagens ilustrativas 3D não integram este pedido, salvo quando expressamente listados na discriminação de produtos deste contrato.\n1.3. O(A) CONTRATANTE declara ciência de todas as matérias-primas, cores, espessuras de MDF/MDP, fitas de borda, ferragens, puxadores e acabamentos especificados neste pedido."
  },
  {
    "id": "clause-2",
    "number": "CLÁUSULA 2ª",
    "title": "DAS DEFINIÇÕES TÉCNICAS E ETAPAS DO PROJETO",
    "text": "2.1. Para os fins deste instrumento, aplicam-se os seguintes conceitos:\na) Pedido / Contrato: O presente documento subscrito pelas partes contendo a descrição dos ambientes e produtos adquiridos, valores, condições de pagamento e termos gerais;\nb) Projeto Inicial (Orçamento): Projeto elaborado com base nas informações e medidas preliminares apresentadas no fechamento comercial, passível de adequações técnicas após conferência em obra;\nc) Medição Fina e Projeto Executivo Final: Projeto técnico definitivo elaborado após a medição presencial in loco nos ambientes onde serão instalados os móveis, avaliando prumo, esquadro, pontos hidráulicos, elétricos e características reais do imóvel. O Projeto Executivo Final substitui o projeto inicial para fins de fabricação."
  },
  {
    "id": "clause-3",
    "number": "CLÁUSULA 3ª",
    "title": "DO PREÇO, FATURAMENTO E CONDIÇÕES DE PAGAMENTO",
    "text": "3.1. Pelo fornecimento dos produtos e serviços objeto deste contrato, o(a) CONTRATANTE pagará à CONTRATADA o valor global contratado, rigorosamente nas modalidades, parcelas, prazos e vencimentos discriminados no Quadro Financeiro deste instrumento.\n3.2. No caso de atraso no pagamento de qualquer parcela ou obrigação financeira acordada, incidirá multa moratória de 2% (dois por cento) sobre o valor em atraso, acrescida de juros de mora de 1% (um por cento) ao mês pro rata die e atualização monetária pelo índice oficial vigente.\n3.3. O inadimplemento superior a 15 (quinze) dias autoriza a suspensão temporária dos prazos de projeto, fabricação, entrega e montagem na mesma proporção do atraso, bem como o encaminhamento do débito aos órgãos de proteção ao crédito e cobrança executiva, acrescida de honorários advocatícios na base de 20% sobre o saldo devedor."
  },
  {
    "id": "clause-4",
    "number": "CLÁUSULA 4ª",
    "title": "DO FINANCIAMENTO EXTERNO E CESSÃO DE CRÉDITO",
    "text": "4.1. Quando a forma de pagamento envolver financiamento bancário, financeira conveniada ou cartão de crédito, a operação estará sujeita à análise e aprovação cadastral pela respectiva instituição financeira.\n4.2. Em caso de financiamento por instituição financeira independente, eventuais renegociações de parcelas, quitações antecipadas ou encargos de atraso deverão ser tratados diretamente pelo(a) CONTRATANTE junto à instituição emissora, não cabendo à CONTRATADA interferir nas taxas ou contratos bancários firmados entre o cliente e a financeira."
  },
  {
    "id": "clause-5",
    "number": "CLÁUSULA 5ª",
    "title": "DA MEDIÇÃO FINA E APROVAÇÃO DO PROJETO EXECUTIVO",
    "text": "5.1. Após a formalização e assinatura deste contrato, a CONTRATADA realizará a Medição Fina presencial nos ambientes contratados, desde que o imóvel esteja em plenas condições técnicas de medição (alvenaria, contrapiso, reboco e vãos definidos).\n5.2. Na hipótese de divergência entre as medidas preliminares informadas no orçamento e as dimensões reais constatadas na medição fina em obra, ou caso o(a) CONTRATANTE solicite alterações de layout, inclusão de módulos ou mudança de acabamentos e ferragens, eventuais diferenças de valor serão formalizadas mediante Termo Aditivo.\n5.3. O Projeto Executivo Final é o momento definitivo para qualquer alteração técnica. Após a assinatura do Projeto Executivo Final e liberação para a indústria, o pedido entra em linha de corte e produção, não sendo possíveis alterações sem custos adicionais de material e reprogramação fabril."
  },
  {
    "id": "clause-6",
    "number": "CLÁUSULA 6ª",
    "title": "DOS PRAZOS E CONDIÇÕES DE ENTREGA",
    "text": "6.1. O prazo de fabricação e entrega dos produtos é contado exclusivamente em dias úteis a partir da conclusão da Medição Fina e da assinatura formal do Projeto Executivo Final pelo(a) CONTRATANTE, além da regularidade dos pagamentos iniciais acordados.\n6.2. É de responsabilidade exclusiva do(a) CONTRATANTE disponibilizar o imóvel livre, desimpedido, com pisos, revestimentos, vidros, forros, iluminação e pintura concluídos (recomendando-se deixar apenas a última demão de tinta para após a montagem), de modo a não prejudicar ou danificar os móveis.\n6.3. Caso os volumes não comportem transporte pelo elevador ou escadas convencionais do edifício, caberá exclusivamente ao(à) CONTRATANTE providenciar e custear empresa especializada para içamento externo dos produtos.\n6.4. No ato da entrega, deverá estar presente no local o(a) CONTRATANTE ou responsável maior de 18 anos formalmente autorizado para conferência e recebimento dos volumes."
  },
  {
    "id": "clause-7",
    "number": "CLÁUSULA 7ª",
    "title": "DA PREPARAÇÃO DO AMBIENTE PARA INSTALAÇÃO",
    "text": "7.1. Antes do início da montagem, o(a) CONTRATANTE deverá retirar móveis pré-existentes, sifões, mãos francesas ou molduras de gesso que interfiram nos locais de fixação dos armários planejados.\n7.2. O(A) CONTRATANTE deverá fornecer à equipe técnica, antes do início das perfurações, a planta atualizada das tubulações hidráulicas, elétricas e de gás embutidas nas paredes. Na ausência da planta ou indicação precisa, a CONTRATADA não se responsabiliza por eventuais perfurações acidentais em tubulações ocultas.\n7.3. Serviços de alvenaria, marmoraria (pedras, pias, bancadas), serralheria, vidraçaria civil, instalações elétricas, hidráulicas, gás, coifas, depuradores, condicionadores de ar e instalação de televisores ou aparelhos de som não integram o escopo da marcenaria e são de responsabilidade exclusiva do(a) CONTRATANTE."
  },
  {
    "id": "clause-8",
    "number": "CLÁUSULA 8ª",
    "title": "DA MONTAGEM E VISTORIA DE ACEITE",
    "text": "8.1. A montagem será iniciada após a entrega dos produtos no local e seguirá o cronograma técnico operacional da CONTRATADA, em horário comercial e respeitando as normas de condomínio.\n8.2. Os eletrodomésticos de embutir (forno, micro-ondas, cooktop, lava-louças, refrigerador) deverão estar presentes no local no ato da montagem para o correto ajuste técnico de nichos e recortes.\n8.3. Concluída a montagem, as partes realizarão vistoria conjunta para emissão do Termo de Aceite e Conclusão. Eventuais ajustes finos ou peças de assistência técnica identificadas na vistoria serão registradas e atendidas dentro do prazo técnico regulamentar, sem que isso constitua motivo para retenção de parcelas vincendas."
  },
  {
    "id": "clause-9",
    "number": "CLÁUSULA 9ª",
    "title": "DA GARANTIA E ASSISTÊNCIA TÉCNICA",
    "text": "9.1. A CONTRATADA assegura a garantia legal de 90 (noventa) dias para serviços de montagem, ferragens, puxadores, vidros e acessórios, bem como garantia estrutural de fábrica contra defeitos de fabricação das chapas de MDF/MDP pelo prazo estabelecido pelo fabricante, contados da conclusão da montagem.\n9.2. A garantia não abrange danos decorrentes de mau uso, limpeza com produtos químicos abrasivos, excesso de peso sobre prateleiras e gavetas, infiltrações de água na alvenaria, vazamentos hidráulicos, umidade excessiva, exposição direta ao calor excessivo, infestação de cupins no imóvel ou intervenções realizadas por terceiros não autorizados."
  },
  {
    "id": "clause-10",
    "number": "CLÁUSULA 10ª",
    "title": "DO CANCELAMENTO E RESCISÃO CONTRATUAL",
    "text": "10.1. Tratando-se de produtos personalizados sob encomenda e medida exclusiva para o imóvel do(a) CONTRATANTE, a rescisão ou desistência imotivada por parte do(a) CONTRATANTE implicará retenção/multa compensatória proporcional à etapa atingida pelo pedido:\na) Antes da realização da Medição Fina e elaboração do Projeto Executivo: multa compensatória de 20% (vinte por cento) sobre o valor total do contrato para cobertura de custos comerciais, taxas operacionais e atendimento técnico preliminar;\nb) Após a realização da Medição Fina e elaboração do Projeto Executivo, mas antes do envio à fabricação: multa compensatória de 30% (trinta por cento) sobre o valor total do contrato;\nc) Após a aprovação do Projeto Executivo e entrada do pedido em linha de fabricação/corte de matéria-prima: multa compensatória de 50% a 70% sobre o valor do contrato, em razão da impossibilidade de reaproveitamento dos móveis fabricados sob medida para outro cliente."
  },
  {
    "id": "clause-11",
    "number": "CLÁUSULA 11ª",
    "title": "DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)",
    "text": "11.1. As partes declaram ciência e conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei Federal nº 13.709/2018), autorizando o tratamento dos dados cadastrais e contratuais estritamente para execução deste contrato, faturamento fiscal, logística de entrega, montagem, cobrança e garantia pós-venda."
  },
  {
    "id": "clause-12",
    "number": "CLÁUSULA 12ª",
    "title": "DA VALIDADE DA ASSINATURA ELETRÔNICA E DO FORO",
    "text": "12.1. O presente contrato é celebrado em caráter irrevogável e irretratável, obrigando as partes, seus herdeiros e sucessores.\n12.2. As partes reconhecem expressamente a plena validade jurídica, autenticidade e eficácia probatória da assinatura eletrônica aposta neste instrumento (mediante token exclusivo, identificação por CPF, assinatura desenhada em tela, registro de IP e carimbo de tempo), nos termos da Medida Provisória nº 2.200-2/2001 e da Lei Federal nº 14.063/2020.\n12.3. Fica eleito o Foro da Comarca da sede da CONTRATADA para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja."
  }
]'::jsonb;
$$;

-- 4. Sincronizar store_contract_templates com os dados reais da tabela tenants
INSERT INTO public.store_contract_templates (
    tenant_id,
    company_name,
    trade_name,
    cnpj,
    address,
    phone,
    email,
    default_delivery_days,
    clauses,
    general_conditions,
    created_at,
    updated_at
)
SELECT
    t.id,
    t.name,
    t.name,
    COALESCE(t.cnpj, ''),
    COALESCE(NULLIF(trim(t.address), ''), trim(COALESCE(t.city_name, '') || CASE WHEN t.state_uf IS NOT NULL THEN ' - ' || t.state_uf ELSE '' END)),
    COALESCE(NULLIF(trim(t.phone), ''), NULLIF(trim(t.whatsapp), ''), ''),
    COALESCE(NULLIF(trim(t.email), ''), NULLIF(trim(t.owner_email), ''), ''),
    45,
    public.get_default_contract_clauses(),
    'Contrato de Compra e Venda de Móveis Planejados Sob Medida e Prestação de Serviços.',
    now(),
    now()
FROM public.tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM public.store_contract_templates sct WHERE sct.tenant_id = t.id
);

-- Atualizar registros de store_contract_templates que estejam com campos vazios usando dados reais de tenants
UPDATE public.store_contract_templates sct
SET
    company_name = COALESCE(NULLIF(trim(sct.company_name), ''), t.name),
    trade_name = COALESCE(NULLIF(trim(sct.trade_name), ''), t.name),
    cnpj = COALESCE(NULLIF(trim(sct.cnpj), ''), COALESCE(t.cnpj, '')),
    address = COALESCE(NULLIF(trim(sct.address), ''), NULLIF(trim(t.address), ''), trim(COALESCE(t.city_name, '') || CASE WHEN t.state_uf IS NOT NULL THEN ' - ' || t.state_uf ELSE '' END)),
    phone = COALESCE(NULLIF(trim(sct.phone), ''), NULLIF(trim(t.phone), ''), NULLIF(trim(t.whatsapp), ''), ''),
    email = COALESCE(NULLIF(trim(sct.email), ''), NULLIF(trim(t.email), ''), NULLIF(trim(t.owner_email), ''), ''),
    clauses = CASE 
        WHEN sct.clauses IS NULL OR jsonb_typeof(sct.clauses) <> 'array' OR jsonb_array_length(sct.clauses) = 0 
        THEN public.get_default_contract_clauses()
        ELSE sct.clauses
    END,
    updated_at = now()
FROM public.tenants t
WHERE sct.tenant_id = t.id;

-- 5. Backfill dos pedidos existentes com todos os dados reais do cliente (leads) e vendedor (tenants)
UPDATE public.orders o
SET
    client_email = COALESCE(NULLIF(trim(o.client_email), ''), l.email),
    client_phone = COALESCE(NULLIF(trim(o.client_phone), ''), NULLIF(trim(l.whatsapp), ''), NULLIF(trim(l.phone), '')),
    client_cpf = COALESCE(NULLIF(trim(o.client_cpf), ''), l.cpf),
    client_rg = COALESCE(NULLIF(trim(o.client_rg), ''), l.rg),
    client_cep = COALESCE(NULLIF(trim(o.client_cep), ''), l.cep),
    client_city = COALESCE(NULLIF(trim(o.client_city), ''), l.city_name),
    client_state = COALESCE(NULLIF(trim(o.client_state), ''), l.state_uf),
    billing_address = COALESCE(NULLIF(trim(o.billing_address), ''), l.billing_address),
    installation_address = COALESCE(NULLIF(trim(o.installation_address), ''), l.installation_address, l.billing_address),
    desired_deadline = COALESCE(NULLIF(trim(o.desired_deadline), ''), l.desired_deadline),
    seller_name = COALESCE(NULLIF(trim(o.seller_name), ''), t.responsible_name, 'Consultor Comercial')
FROM public.lead_assignments la
JOIN public.leads l ON l.id = la.lead_id
LEFT JOIN public.tenants t ON t.id = la.tenant_id
WHERE o.lead_assignment_id = la.id;

-- 6. Função para construir e persistir a versão definitiva do contrato (contract_snapshot)
CREATE OR REPLACE FUNCTION public.build_order_contract_snapshot(
    p_order_id UUID,
    p_custom_clauses JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_order RECORD;
    v_tenant RECORD;
    v_template RECORD;
    v_lead RECORD;
    v_clauses JSONB;
    v_sim_environments JSONB := '[]'::jsonb;
    v_proposal JSONB;
    v_allocations JSONB;
    v_conv_items JSONB;
    v_promob_items JSONB;
    v_promob_val NUMERIC(12,2);
    v_conv_total NUMERIC(12,2);
    v_gross_subtotal NUMERIC(12,2);
    v_discount_pct NUMERIC(8,2);
    v_discount_amount NUMERIC(12,2);
    v_after_discount NUMERIC(12,2);
    v_fee_amount NUMERIC(12,2);
    v_final_total NUMERIC(12,2);
    v_snapshot JSONB;
    v_store_address TEXT;
    v_delivery_days TEXT;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Se o contrato já foi assinado e já possui snapshot gravado, preserva imutabilidade
    IF v_order.contract_status IN ('assinado', 'assinado_eletronico', 'assinado_externo') 
       AND v_order.contract_snapshot IS NOT NULL 
       AND jsonb_typeof(v_order.contract_snapshot) = 'object' THEN
        RETURN v_order.contract_snapshot;
    END IF;

    SELECT * INTO v_tenant FROM public.tenants WHERE id = v_order.tenant_id;
    SELECT * INTO v_template FROM public.store_contract_templates WHERE tenant_id = v_order.tenant_id;

    IF v_order.lead_assignment_id IS NOT NULL THEN
        SELECT l.* INTO v_lead
        FROM public.lead_assignments la
        JOIN public.leads l ON l.id = la.lead_id
        WHERE la.id = v_order.lead_assignment_id;

        IF v_lead.simulation_id IS NOT NULL THEN
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', se.id,
                'typeId', se.environment_type_id,
                'name', se.name,
                'areaM2', se.area_m2,
                'ceilingHeight', se.ceiling_height,
                'wallCount', se.wall_count
            )), '[]'::jsonb)
            INTO v_sim_environments
            FROM public.simulation_environments se
            WHERE se.simulation_id = v_lead.simulation_id;
        END IF;
    END IF;

    -- Definir cláusulas (customizadas > snapshot anterior > template da loja > padrão)
    IF p_custom_clauses IS NOT NULL AND jsonb_typeof(p_custom_clauses) = 'array' AND jsonb_array_length(p_custom_clauses) > 0 THEN
        v_clauses := p_custom_clauses;
    ELSIF v_order.contract_snapshot IS NOT NULL 
          AND v_order.contract_snapshot->'clauses' IS NOT NULL 
          AND jsonb_typeof(v_order.contract_snapshot->'clauses') = 'array'
          AND jsonb_array_length(v_order.contract_snapshot->'clauses') > 0 THEN
        v_clauses := v_order.contract_snapshot->'clauses';
    ELSIF v_template.clauses IS NOT NULL AND jsonb_typeof(v_template.clauses) = 'array' AND jsonb_array_length(v_template.clauses) > 0 THEN
        v_clauses := v_template.clauses;
    ELSE
        v_clauses := public.get_default_contract_clauses();
    END IF;

    v_proposal := COALESCE(v_order.commercial_proposal, '{}'::jsonb);
    v_allocations := COALESCE(v_order.payment_allocations, v_proposal->'paymentAllocations', '[]'::jsonb);
    v_conv_items := COALESCE(v_proposal->'conventionalItems', '[]'::jsonb);
    v_promob_items := COALESCE(v_proposal->'promobItems', '[]'::jsonb);

    v_final_total := COALESCE(v_order.contracted_value, v_order.total_value, NULLIF(v_proposal->>'finalOrderTotal', '')::NUMERIC, 0);
    v_promob_val := COALESCE(NULLIF(v_proposal->>'promobValue', '')::NUMERIC, v_final_total);
    v_conv_total := COALESCE(NULLIF(v_proposal->>'conventionalTotal', '')::NUMERIC, 0);
    v_gross_subtotal := COALESCE(NULLIF(v_proposal->>'subtotalGross', '')::NUMERIC, NULLIF(v_proposal->>'subtotal', '')::NUMERIC, (v_promob_val + v_conv_total));
    v_discount_pct := COALESCE(NULLIF(v_proposal->>'discountPct', '')::NUMERIC, NULLIF(v_proposal->>'discountPercentage', '')::NUMERIC, 0);
    v_discount_amount := COALESCE(NULLIF(v_proposal->>'discountAmount', '')::NUMERIC, NULLIF(v_proposal->>'discountValue', '')::NUMERIC, 0);
    v_after_discount := COALESCE(NULLIF(v_proposal->>'subtotalAfterDiscount', '')::NUMERIC, NULLIF(v_proposal->>'priceAfterDiscount', '')::NUMERIC, (v_gross_subtotal - v_discount_amount));
    v_fee_amount := COALESCE(NULLIF(v_proposal->>'paymentFeeAmount', '')::NUMERIC, NULLIF(v_proposal->>'transactionFeeAmount', '')::NUMERIC, GREATEST(0, v_final_total - v_after_discount));

    v_store_address := COALESCE(
        NULLIF(trim(v_template.address), ''),
        NULLIF(trim(v_tenant.address), ''),
        NULLIF(trim(COALESCE(v_tenant.city_name, '') || CASE WHEN v_tenant.state_uf IS NOT NULL THEN ' - ' || v_tenant.state_uf ELSE '' END), ''),
        ''
    );

    v_delivery_days := COALESCE(
        NULLIF(trim(v_order.desired_deadline), ''),
        NULLIF(trim(v_lead.desired_deadline), ''),
        CASE WHEN v_template.default_delivery_days IS NOT NULL THEN v_template.default_delivery_days || ' dias úteis' ELSE '45 dias úteis' END
    );

    v_snapshot := jsonb_build_object(
        'version', COALESCE(v_order.contract_version, 1),
        'issuedAt', COALESCE(v_order.updated_at, v_order.created_at, now()),
        'orderId', v_order.id,
        'orderNumber', v_order.order_number,
        'orderDate', v_order.created_at,
        'contractor', jsonb_build_object(
            'tenantId', v_order.tenant_id,
            'companyName', COALESCE(NULLIF(trim(v_template.company_name), ''), NULLIF(trim(v_tenant.name), ''), 'Loja Parceira'),
            'tradeName', COALESCE(NULLIF(trim(v_template.trade_name), ''), NULLIF(trim(v_tenant.name), ''), 'Loja Parceira'),
            'cnpj', COALESCE(NULLIF(trim(v_template.cnpj), ''), NULLIF(trim(v_tenant.cnpj), ''), ''),
            'address', v_store_address,
            'city', COALESCE(v_tenant.city_name, ''),
            'state', COALESCE(v_tenant.state_uf, ''),
            'phone', COALESCE(NULLIF(trim(v_template.phone), ''), NULLIF(trim(v_tenant.phone), ''), NULLIF(trim(v_tenant.whatsapp), ''), ''),
            'email', COALESCE(NULLIF(trim(v_template.email), ''), NULLIF(trim(v_tenant.email), ''), NULLIF(trim(v_tenant.owner_email), ''), ''),
            'sellerName', COALESCE(NULLIF(trim(v_order.seller_name), ''), NULLIF(trim(v_tenant.responsible_name), ''), 'Consultor Comercial'),
            'logoUrl', COALESCE(v_template.logo_url, '')
        ),
        'customer', jsonb_build_object(
            'name', COALESCE(NULLIF(trim(v_order.client_name), ''), v_lead.name, ''),
            'cpf', COALESCE(NULLIF(trim(v_order.client_cpf), ''), v_lead.cpf, ''),
            'rg', COALESCE(NULLIF(trim(v_order.client_rg), ''), v_lead.rg, ''),
            'phone', COALESCE(NULLIF(trim(v_order.client_phone), ''), NULLIF(trim(v_lead.whatsapp), ''), NULLIF(trim(v_lead.phone), ''), ''),
            'email', COALESCE(NULLIF(trim(v_order.client_email), ''), NULLIF(trim(v_lead.email), ''), ''),
            'cep', COALESCE(NULLIF(trim(v_order.client_cep), ''), NULLIF(trim(v_lead.cep), ''), ''),
            'city', COALESCE(NULLIF(trim(v_order.client_city), ''), NULLIF(trim(v_lead.city_name), ''), ''),
            'state', COALESCE(NULLIF(trim(v_order.client_state), ''), NULLIF(trim(v_lead.state_uf), ''), ''),
            'billingAddress', COALESCE(NULLIF(trim(v_order.billing_address), ''), NULLIF(trim(v_lead.billing_address), ''), NULLIF(trim(v_order.delivery_address), ''), ''),
            'installationAddress', COALESCE(NULLIF(trim(v_order.installation_address), ''), NULLIF(trim(v_lead.installation_address), ''), NULLIF(trim(v_order.billing_address), ''), NULLIF(trim(v_order.delivery_address), ''), '')
        ),
        'products', jsonb_build_object(
            'environmentSummary', COALESCE(NULLIF(trim(v_order.environment_description), ''), NULLIF(trim(v_lead.environment_summary), ''), 'Ambiente Planejado'),
            'promobProjectName', COALESCE(NULLIF(trim(v_proposal->>'promobProjectName'), ''), NULLIF(trim(v_order.environment_description), ''), 'Projeto Planejado Sob Medida'),
            'promobFileName', COALESCE(v_proposal->>'promobFileName', ''),
            'promobValue', v_promob_val,
            'promobItems', v_promob_items,
            'simulationEnvironments', v_sim_environments,
            'conventionalItems', v_conv_items,
            'conventionalTotal', v_conv_total
        ),
        'financials', jsonb_build_object(
            'subtotalGross', v_gross_subtotal,
            'discountPct', v_discount_pct,
            'discountAmount', v_discount_amount,
            'subtotalAfterDiscount', v_after_discount,
            'paymentFeeAmount', v_fee_amount,
            'paymentFeePct', COALESCE(NULLIF(v_proposal->>'paymentFeePct', '')::NUMERIC, 0),
            'finalContractedValue', v_final_total,
            'paymentMethodLabel', COALESCE(v_proposal->>'paymentMethodLabel', 'Condições Acordadas'),
            'paymentAllocations', v_allocations
        ),
        'delivery', jsonb_build_object(
            'deliveryDays', v_delivery_days,
            'deliveryReference', 'Contados em dias úteis a partir da realização da Medição Fina e assinatura do Projeto Executivo Final pelo(a) CONTRATANTE.',
            'targetDeliveryDate', v_order.target_delivery_date,
            'installationAddress', COALESCE(NULLIF(trim(v_order.installation_address), ''), NULLIF(trim(v_lead.installation_address), ''), NULLIF(trim(v_order.billing_address), ''), ''),
            'observations', COALESCE(NULLIF(trim(v_order.order_notes), ''), NULLIF(trim(v_proposal->>'observations'), ''), NULLIF(trim(v_proposal->>'notes'), ''), '')
        ),
        'clauses', v_clauses
    );

    UPDATE public.orders
    SET contract_snapshot = v_snapshot,
        contract_version = COALESCE(contract_version, 1)
    WHERE id = p_order_id;

    RETURN v_snapshot;
END;
$$;

GRANT EXECUTE ON FUNCTION public.build_order_contract_snapshot(UUID, JSONB) TO authenticated, anon, service_role;

-- Gerar contract_snapshot imediatamente para todos os pedidos existentes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.orders LOOP
        PERFORM public.build_order_contract_snapshot(r.id);
    END LOOP;
END;
$$;

-- 7. RPC para o lojista confirmar/salvar alterações de revisão contratual do pedido
CREATE OR REPLACE FUNCTION public.save_order_contract_version(
    p_order_id UUID,
    p_clauses JSONB DEFAULT NULL,
    p_store_data JSONB DEFAULT NULL,
    p_order_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_order RECORD;
    v_new_version INTEGER;
    v_snapshot JSONB;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
    END IF;

    IF v_order.contract_status IN ('assinado', 'assinado_eletronico', 'assinado_externo') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Este contrato já foi assinado e encontra-se bloqueado contra alterações retroativas.'
        );
    END IF;

    -- Se foram enviados dados da loja (ex: endereço, CNPJ, telefone preenchidos na revisão), atualiza o template da loja
    IF p_store_data IS NOT NULL AND jsonb_typeof(p_store_data) = 'object' THEN
        INSERT INTO public.store_contract_templates (
            tenant_id,
            company_name,
            trade_name,
            cnpj,
            address,
            phone,
            email,
            default_delivery_days,
            clauses,
            updated_at
        ) VALUES (
            v_order.tenant_id,
            COALESCE(p_store_data->>'companyName', 'Loja Parceira'),
            COALESCE(p_store_data->>'tradeName', p_store_data->>'companyName', 'Loja Parceira'),
            COALESCE(p_store_data->>'cnpj', ''),
            COALESCE(p_store_data->>'address', ''),
            COALESCE(p_store_data->>'phone', ''),
            COALESCE(p_store_data->>'email', ''),
            COALESCE((p_store_data->>'defaultDeliveryDays')::INTEGER, 45),
            COALESCE(p_clauses, public.get_default_contract_clauses()),
            now()
        )
        ON CONFLICT (tenant_id) DO UPDATE
        SET company_name = COALESCE(NULLIF(trim(EXCLUDED.company_name), ''), store_contract_templates.company_name),
            trade_name = COALESCE(NULLIF(trim(EXCLUDED.trade_name), ''), store_contract_templates.trade_name),
            cnpj = COALESCE(NULLIF(trim(EXCLUDED.cnpj), ''), store_contract_templates.cnpj),
            address = COALESCE(NULLIF(trim(EXCLUDED.address), ''), store_contract_templates.address),
            phone = COALESCE(NULLIF(trim(EXCLUDED.phone), ''), store_contract_templates.phone),
            email = COALESCE(NULLIF(trim(EXCLUDED.email), ''), store_contract_templates.email),
            clauses = COALESCE(p_clauses, store_contract_templates.clauses),
            updated_at = now();
    ELSIF p_clauses IS NOT NULL AND jsonb_typeof(p_clauses) = 'array' AND jsonb_array_length(p_clauses) > 0 THEN
        UPDATE public.store_contract_templates
        SET clauses = p_clauses,
            updated_at = now()
        WHERE tenant_id = v_order.tenant_id;
    END IF;

    v_new_version := COALESCE(v_order.contract_version, 1) + 1;

    UPDATE public.orders
    SET contract_version = v_new_version,
        order_notes = COALESCE(p_order_notes, order_notes),
        updated_at = now()
    WHERE id = p_order_id;

    v_snapshot := public.build_order_contract_snapshot(p_order_id, p_clauses);

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'contract_version', v_new_version,
        'contract_snapshot', v_snapshot
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_order_contract_version(UUID, JSONB, JSONB, TEXT) TO authenticated, anon, service_role;

-- 8. Atualizar convert_lead_to_order para persistir todos os dados cadastrais e gerar contract_snapshot
CREATE OR REPLACE FUNCTION public.convert_lead_to_order(p_assignment_id uuid, p_total_value numeric DEFAULT NULL::numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_assignment RECORD;
    v_lead RECORD;
    v_tenant RECORD;
    v_existing_order RECORD;
    v_order_id UUID;
    v_order_number VARCHAR(20);
    v_final_value NUMERIC(10,2);
    v_estimated_budget NUMERIC(10,2);
    v_user_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
    v_proposal_val NUMERIC(10,2);
    v_deadline_days INT := 45;
    v_contract_token VARCHAR(64);
    v_allocations JSONB := '[]'::jsonb;
    v_notes TEXT := '';
    v_snapshot JSONB;
BEGIN
    v_user_id := auth.uid();
    
    SELECT * INTO v_assignment FROM lead_assignments WHERE id = p_assignment_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Atribuição de lead não encontrada.');
    END IF;

    SELECT * INTO v_tenant FROM tenants WHERE id = v_assignment.tenant_id;

    -- Verificar Idempotência: Se já foi convertido, garante snapshot atualizado e retorna
    SELECT * INTO v_existing_order FROM orders WHERE lead_assignment_id = p_assignment_id;
    IF FOUND THEN
        v_snapshot := public.build_order_contract_snapshot(v_existing_order.id);
        RETURN jsonb_build_object(
            'success', true,
            'status', 'already_converted',
            'order_id', v_existing_order.id,
            'order_number', v_existing_order.order_number,
            'total_value', v_existing_order.total_value,
            'contracted_value', v_existing_order.contracted_value,
            'current_stage', v_existing_order.current_stage,
            'contract_status', v_existing_order.contract_status,
            'contract_token', v_existing_order.contract_token,
            'contract_version', COALESCE(v_existing_order.contract_version, 1),
            'contract_snapshot', v_snapshot,
            'message', 'Pedido já existente recuperado com sucesso.'
        );
    END IF;

    -- Obter Lead Original
    SELECT * INTO v_lead FROM leads WHERE id = v_assignment.lead_id;
    v_estimated_budget := ROUND((COALESCE(v_lead.estimated_min, 0) + COALESCE(v_lead.estimated_max, 0)) / 2);

    IF v_assignment.commercial_proposal IS NOT NULL THEN
        BEGIN
            v_proposal_val := NULLIF(v_assignment.commercial_proposal->>'finalOrderTotal', '')::NUMERIC;
            IF v_assignment.commercial_proposal->'paymentAllocations' IS NOT NULL THEN
                v_allocations := v_assignment.commercial_proposal->'paymentAllocations';
            END IF;
            IF v_assignment.commercial_proposal->>'notes' IS NOT NULL THEN
                v_notes := v_assignment.commercial_proposal->>'notes';
            ELSIF v_assignment.commercial_proposal->>'observations' IS NOT NULL THEN
                v_notes := v_assignment.commercial_proposal->>'observations';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_proposal_val := NULL;
        END;
    END IF;

    IF p_total_value IS NOT NULL AND p_total_value > 0 THEN
        v_final_value := p_total_value;
    ELSIF v_proposal_val IS NOT NULL AND v_proposal_val > 0 THEN
        v_final_value := v_proposal_val;
    ELSIF v_assignment.commercial_proposal->>'agreedValue' IS NOT NULL THEN
        v_final_value := NULLIF(v_assignment.commercial_proposal->>'agreedValue', '')::NUMERIC;
    ELSIF v_lead.estimated_max IS NOT NULL AND v_lead.estimated_max > 0 THEN
        v_final_value := v_lead.estimated_max;
    ELSIF v_estimated_budget > 0 THEN
        v_final_value := v_estimated_budget;
    ELSE
        v_final_value := 0.00;
    END IF;

    IF v_lead.desired_deadline IS NOT NULL AND v_lead.desired_deadline ~ '[0-9]+' THEN
        BEGIN
            v_deadline_days := (regexp_replace(v_lead.desired_deadline, '[^0-9]', '', 'g'))::INT;
            IF v_deadline_days <= 0 OR v_deadline_days > 365 THEN
                v_deadline_days := 45;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_deadline_days := 45;
        END;
    END IF;

    v_user_name := COALESCE(
        (SELECT full_name FROM users WHERE id = v_user_id),
        v_tenant.responsible_name,
        'Consultor Comercial'
    );
    v_user_role := COALESCE(
        (SELECT role FROM users WHERE id = v_user_id),
        'store_operator'
    );

    v_order_number := 'PED-' || nextval('order_number_seq')::TEXT;
    v_contract_token := 'ctk_' || replace(gen_random_uuid()::text, '-', '') || substring(md5(random()::text) from 1 for 16);

    INSERT INTO orders (
        order_number,
        tenant_id,
        lead_assignment_id,
        client_name,
        client_phone,
        client_email,
        client_cpf,
        client_rg,
        client_cep,
        client_city,
        client_state,
        seller_name,
        billing_address,
        installation_address,
        desired_deadline,
        delivery_address,
        environment_description,
        total_value,
        contracted_value,
        estimated_budget,
        payment_allocations,
        commercial_proposal,
        order_notes,
        contract_status,
        contract_token,
        contract_version,
        target_delivery_date,
        current_stage,
        created_at,
        updated_at
    ) VALUES (
        v_order_number,
        v_assignment.tenant_id,
        p_assignment_id,
        v_lead.name,
        COALESCE(NULLIF(trim(v_lead.whatsapp), ''), NULLIF(trim(v_lead.phone), '')),
        v_lead.email,
        v_lead.cpf,
        v_lead.rg,
        v_lead.cep,
        v_lead.city_name,
        v_lead.state_uf,
        v_user_name,
        v_lead.billing_address,
        COALESCE(NULLIF(trim(v_lead.installation_address), ''), v_lead.billing_address),
        v_lead.desired_deadline,
        COALESCE(NULLIF(trim(v_lead.installation_address), ''), NULLIF(trim(v_lead.billing_address), ''), v_lead.city_name || ' - ' || v_lead.state_uf, 'Endereço a confirmar'),
        COALESCE(v_lead.environment_summary, 'Ambiente Planejado'),
        v_final_value,
        v_final_value,
        v_estimated_budget,
        v_allocations,
        v_assignment.commercial_proposal,
        v_notes,
        'formalizacao_pendente',
        v_contract_token,
        1,
        CURRENT_DATE + (v_deadline_days || ' days')::INTERVAL,
        'formalizacao_contratual',
        now(),
        now()
    ) RETURNING id INTO v_order_id;

    -- Construir e gravar o snapshot contratual oficial
    v_snapshot := public.build_order_contract_snapshot(v_order_id);

    UPDATE lead_assignments
    SET status = 'convertido',
        updated_at = now()
    WHERE id = p_assignment_id;

    INSERT INTO order_audit_logs (
        order_id,
        tenant_id,
        user_id,
        user_name,
        user_role,
        action_message,
        stage_from,
        stage_to,
        created_at
    ) VALUES (
        v_order_id,
        v_assignment.tenant_id,
        v_user_id,
        v_user_name,
        v_user_role,
        'Orçamento aprovado comercialmente no CRM (Fechado). Pedido criado em Formalização Contratual.',
        'crm_fechado',
        'formalizacao_contratual',
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'created',
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_value', v_final_value,
        'contracted_value', v_final_value,
        'current_stage', 'formalizacao_contratual',
        'contract_status', 'formalizacao_pendente',
        'contract_token', v_contract_token,
        'contract_version', 1,
        'contract_snapshot', v_snapshot,
        'message', 'Pedido criado com sucesso em Formalização Contratual.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.convert_lead_to_order(UUID, NUMERIC) TO authenticated, anon, service_role;

-- 9. Atualizar get_contract_for_signing para retornar todos os dados reais das partes, produtos, financeiro, cláusulas e snapshot
CREATE OR REPLACE FUNCTION public.get_contract_for_signing(
    p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_order RECORD;
    v_tenant RECORD;
    v_template RECORD;
    v_lead RECORD;
    v_snapshot JSONB;
    v_clauses JSONB;
    v_lead_id_str TEXT;
    v_asgn_id UUID;
    v_store_address TEXT;
    v_order_json JSONB;
BEGIN
    IF p_token IS NULL OR trim(p_token) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token de contrato não fornecido.');
    END IF;

    SELECT * INTO v_order 
    FROM orders 
    WHERE contract_token = p_token;

    -- Fallback de resiliência se o token veio com prefixo de lead (ctk_ord_<lead_id>)
    IF NOT FOUND AND (p_token LIKE 'ctk_ord_%' OR p_token LIKE 'ctk_%') THEN
        v_lead_id_str := replace(p_token, 'ctk_ord_', '');
        v_lead_id_str := replace(v_lead_id_str, 'ctk_', '');
        
        IF v_lead_id_str ~ '^[0-9a-fA-F-]{36}$' THEN
            SELECT id INTO v_asgn_id FROM lead_assignments WHERE lead_id = v_lead_id_str::UUID LIMIT 1;
            IF v_asgn_id IS NOT NULL THEN
                SELECT * INTO v_order FROM orders WHERE lead_assignment_id = v_asgn_id LIMIT 1;
                IF NOT FOUND THEN
                    PERFORM public.convert_lead_to_order(v_asgn_id);
                    SELECT * INTO v_order FROM orders WHERE lead_assignment_id = v_asgn_id LIMIT 1;
                END IF;
            END IF;
        END IF;
    END IF;

    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Contrato não encontrado ou link expirado.');
    END IF;

    -- Garantir que os dados de lead e snapshot estejam sincronizados
    IF v_order.lead_assignment_id IS NOT NULL THEN
        SELECT l.* INTO v_lead
        FROM lead_assignments la
        JOIN leads l ON l.id = la.lead_id
        WHERE la.id = v_order.lead_assignment_id;
    END IF;

    SELECT * INTO v_tenant FROM tenants WHERE id = v_order.tenant_id;
    SELECT * INTO v_template FROM store_contract_templates WHERE tenant_id = v_order.tenant_id;

    -- Construir ou recuperar snapshot oficial
    v_snapshot := public.build_order_contract_snapshot(v_order.id);

    -- Recarregar order após build_order_contract_snapshot
    SELECT * INTO v_order FROM orders WHERE id = v_order.id;

    v_clauses := COALESCE(
        v_snapshot->'clauses',
        CASE WHEN v_template.clauses IS NOT NULL AND jsonb_typeof(v_template.clauses) = 'array' AND jsonb_array_length(v_template.clauses) > 0 THEN v_template.clauses ELSE NULL END,
        public.get_default_contract_clauses()
    );

    v_store_address := COALESCE(
        NULLIF(trim(v_template.address), ''),
        NULLIF(trim(v_tenant.address), ''),
        NULLIF(trim(COALESCE(v_tenant.city_name, '') || CASE WHEN v_tenant.state_uf IS NOT NULL THEN ' - ' || v_tenant.state_uf ELSE '' END), ''),
        ''
    );

    v_order_json := jsonb_build_object(
        'id', v_order.id,
        'orderNumber', v_order.order_number,
        'order_number', v_order.order_number,
        'createdAt', v_order.created_at,
        'created_at', v_order.created_at,
        'clientName', COALESCE(NULLIF(trim(v_order.client_name), ''), v_lead.name),
        'client_name', COALESCE(NULLIF(trim(v_order.client_name), ''), v_lead.name),
        'clientCpf', COALESCE(NULLIF(trim(v_order.client_cpf), ''), v_lead.cpf),
        'client_cpf', COALESCE(NULLIF(trim(v_order.client_cpf), ''), v_lead.cpf),
        'clientRg', COALESCE(NULLIF(trim(v_order.client_rg), ''), v_lead.rg),
        'client_rg', COALESCE(NULLIF(trim(v_order.client_rg), ''), v_lead.rg),
        'phone', COALESCE(NULLIF(trim(v_order.client_phone), ''), v_lead.whatsapp, v_lead.phone),
        'client_phone', COALESCE(NULLIF(trim(v_order.client_phone), ''), v_lead.whatsapp, v_lead.phone),
        'clientEmail', COALESCE(NULLIF(trim(v_order.client_email), ''), v_lead.email),
        'client_email', COALESCE(NULLIF(trim(v_order.client_email), ''), v_lead.email),
        'clientCep', COALESCE(NULLIF(trim(v_order.client_cep), ''), v_lead.cep),
        'client_cep', COALESCE(NULLIF(trim(v_order.client_cep), ''), v_lead.cep),
        'clientCity', COALESCE(NULLIF(trim(v_order.client_city), ''), v_lead.city_name),
        'client_city', COALESCE(NULLIF(trim(v_order.client_city), ''), v_lead.city_name),
        'clientState', COALESCE(NULLIF(trim(v_order.client_state), ''), v_lead.state_uf),
        'client_state', COALESCE(NULLIF(trim(v_order.client_state), ''), v_lead.state_uf),
        'sellerName', COALESCE(NULLIF(trim(v_order.seller_name), ''), v_tenant.responsible_name, 'Consultor Comercial'),
        'seller_name', COALESCE(NULLIF(trim(v_order.seller_name), ''), v_tenant.responsible_name, 'Consultor Comercial'),
        'billingAddress', COALESCE(NULLIF(trim(v_order.billing_address), ''), v_lead.billing_address),
        'billing_address', COALESCE(NULLIF(trim(v_order.billing_address), ''), v_lead.billing_address),
        'installationAddress', COALESCE(NULLIF(trim(v_order.installation_address), ''), v_lead.installation_address, v_order.billing_address, v_lead.billing_address),
        'installation_address', COALESCE(NULLIF(trim(v_order.installation_address), ''), v_lead.installation_address, v_order.billing_address, v_lead.billing_address),
        'delivery_address', v_order.delivery_address
    ) || jsonb_build_object(
        'environment', v_order.environment_description,
        'environment_description', v_order.environment_description,
        'totalValue', v_order.total_value,
        'total_value', v_order.total_value,
        'contractedValue', COALESCE(v_order.contracted_value, v_order.total_value),
        'contracted_value', COALESCE(v_order.contracted_value, v_order.total_value),
        'target_delivery_date', v_order.target_delivery_date,
        'desiredDeadline', COALESCE(NULLIF(trim(v_order.desired_deadline), ''), v_lead.desired_deadline),
        'desired_deadline', COALESCE(NULLIF(trim(v_order.desired_deadline), ''), v_lead.desired_deadline),
        'current_stage', v_order.current_stage,
        'contract_status', v_order.contract_status,
        'contract_version', COALESCE(v_order.contract_version, 1),
        'contract_signed_at', v_order.contract_signed_at,
        'contract_signed_by_name', v_order.contract_signed_by_name,
        'contract_signed_by_cpf', v_order.contract_signed_by_cpf,
        'contract_signature_ip', v_order.contract_signature_ip,
        'contract_signature_image', v_order.contract_signature_image,
        'paymentAllocations', v_order.payment_allocations,
        'payment_allocations', v_order.payment_allocations,
        'commercialProposal', v_order.commercial_proposal,
        'commercial_proposal', v_order.commercial_proposal,
        'orderNotes', v_order.order_notes,
        'order_notes', v_order.order_notes,
        'contractSnapshot', v_snapshot,
        'contract_snapshot', v_snapshot
    );

    RETURN jsonb_build_object(
        'success', true,
        'order', v_order_json,
        'template', jsonb_build_object(
            'tenantId', v_order.tenant_id,
            'companyName', COALESCE(NULLIF(trim(v_template.company_name), ''), NULLIF(trim(v_tenant.name), ''), 'Loja Parceira'),
            'tradeName', COALESCE(NULLIF(trim(v_template.trade_name), ''), NULLIF(trim(v_tenant.name), ''), 'Loja Parceira'),
            'cnpj', COALESCE(NULLIF(trim(v_template.cnpj), ''), NULLIF(trim(v_tenant.cnpj), ''), ''),
            'address', v_store_address,
            'city', COALESCE(v_tenant.city_name, ''),
            'state', COALESCE(v_tenant.state_uf, ''),
            'phone', COALESCE(NULLIF(trim(v_template.phone), ''), NULLIF(trim(v_tenant.phone), ''), NULLIF(trim(v_tenant.whatsapp), ''), ''),
            'email', COALESCE(NULLIF(trim(v_template.email), ''), NULLIF(trim(v_tenant.email), ''), NULLIF(trim(v_tenant.owner_email), ''), ''),
            'sellerName', COALESCE(NULLIF(trim(v_order.seller_name), ''), NULLIF(trim(v_tenant.responsible_name), ''), 'Consultor Comercial'),
            'logoUrl', COALESCE(v_template.logo_url, ''),
            'defaultDeliveryDays', COALESCE(v_template.default_delivery_days, 45),
            'clauses', v_clauses,
            'generalConditions', COALESCE(v_template.general_conditions, '')
        ),
        'snapshot', v_snapshot,
        'alreadySigned', (v_order.contract_status IN ('assinado', 'assinado_eletronico', 'assinado_externo')),
        'signedInfo', CASE 
            WHEN v_order.contract_status IN ('assinado', 'assinado_eletronico', 'assinado_externo') THEN
                jsonb_build_object(
                    'signedAt', v_order.contract_signed_at,
                    'signedByName', v_order.contract_signed_by_name,
                    'signedByCpf', v_order.contract_signed_by_cpf,
                    'signatureIp', v_order.contract_signature_ip,
                    'signatureImage', v_order.contract_signature_image,
                    'contractVersion', COALESCE(v_order.contract_version, 1)
                )
            ELSE NULL
        END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contract_for_signing(TEXT) TO anon, authenticated, service_role;

-- 10. Atualizar submit_contract_signature para vincular assinatura à versão definitiva apresentada ao cliente
CREATE OR REPLACE FUNCTION public.submit_contract_signature(
    p_token TEXT,
    p_signer_name TEXT,
    p_signer_cpf TEXT,
    p_signer_ip TEXT DEFAULT 'Dispositivo Web',
    p_signer_user_agent TEXT DEFAULT 'Web',
    p_signature_image TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_order RECORD;
    v_now TIMESTAMPTZ := now();
    v_advanced BOOLEAN := false;
    v_lead_id_str TEXT;
    v_asgn_id UUID;
    v_snapshot JSONB;
BEGIN
    IF p_token IS NULL OR trim(p_token) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token de contrato não fornecido.');
    END IF;

    IF p_signer_name IS NULL OR trim(p_signer_name) = '' OR p_signer_cpf IS NULL OR trim(p_signer_cpf) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nome completo e CPF do signatário são obrigatórios.');
    END IF;

    SELECT * INTO v_order 
    FROM orders 
    WHERE contract_token = p_token 
    FOR UPDATE;

    IF NOT FOUND AND (p_token LIKE 'ctk_ord_%' OR p_token LIKE 'ctk_%') THEN
        v_lead_id_str := replace(p_token, 'ctk_ord_', '');
        v_lead_id_str := replace(v_lead_id_str, 'ctk_', '');
        IF v_lead_id_str ~ '^[0-9a-fA-F-]{36}$' THEN
            SELECT id INTO v_asgn_id FROM lead_assignments WHERE lead_id = v_lead_id_str::UUID LIMIT 1;
            IF v_asgn_id IS NOT NULL THEN
                SELECT * INTO v_order FROM orders WHERE lead_assignment_id = v_asgn_id LIMIT 1 FOR UPDATE;
            END IF;
        END IF;
    END IF;

    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Contrato não localizado para o token fornecido.');
    END IF;

    IF v_order.contract_status = 'assinado' THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Contrato já se encontra assinado.',
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'current_stage', v_order.current_stage,
            'contract_version', COALESCE(v_order.contract_version, 1)
        );
    END IF;

    -- Garantir snapshot definitivo antes de congelar a assinatura
    v_snapshot := COALESCE(v_order.contract_snapshot, public.build_order_contract_snapshot(v_order.id));

    -- Validar que o contrato possui cláusulas carregadas antes de aceitar assinatura
    IF v_snapshot->'clauses' IS NULL OR jsonb_array_length(v_snapshot->'clauses') = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não é possível assinar um contrato sem cláusulas contratuais carregadas.');
    END IF;

    -- Registrar na tabela de auditoria forense de assinaturas com snapshot congelado
    INSERT INTO contract_signatures (
        order_id,
        token,
        signer_name,
        signer_cpf,
        signer_ip,
        signer_user_agent,
        signature_image,
        contract_version,
        contract_snapshot,
        signed_at
    ) VALUES (
        v_order.id,
        p_token,
        trim(p_signer_name),
        trim(p_signer_cpf),
        COALESCE(p_signer_ip, 'Dispositivo Web'),
        COALESCE(p_signer_user_agent, 'Web'),
        p_signature_image,
        COALESCE(v_order.contract_version, 1),
        v_snapshot,
        v_now
    );

    -- Se o pedido estiver em formalizacao_contratual, avança automaticamente para medicao
    IF v_order.current_stage = 'formalizacao_contratual' THEN
        v_advanced := true;
        UPDATE orders
        SET contract_status = 'assinado',
            contract_signed_at = v_now,
            contract_signed_by_name = trim(p_signer_name),
            contract_signed_by_cpf = trim(p_signer_cpf),
            contract_signature_ip = COALESCE(p_signer_ip, 'Dispositivo Web'),
            contract_signature_image = p_signature_image,
            contract_snapshot = v_snapshot,
            current_stage = 'medicao',
            updated_at = v_now
        WHERE id = v_order.id;

        INSERT INTO order_audit_logs (
            order_id,
            tenant_id,
            user_id,
            user_name,
            user_role,
            action_message,
            stage_from,
            stage_to,
            created_at
        ) VALUES (
            v_order.id,
            v_order.tenant_id,
            NULL,
            trim(p_signer_name),
            'cliente_signatario',
            'Contrato v' || COALESCE(v_order.contract_version, 1) || ' assinado eletronicamente por ' || trim(p_signer_name) || ' (CPF: ' || trim(p_signer_cpf) || '). Pedido liberado e avançado automaticamente para Medição Fina.',
            'formalizacao_contratual',
            'medicao',
            v_now
        );
    ELSE
        UPDATE orders
        SET contract_status = 'assinado',
            contract_signed_at = v_now,
            contract_signed_by_name = trim(p_signer_name),
            contract_signed_by_cpf = trim(p_signer_cpf),
            contract_signature_ip = COALESCE(p_signer_ip, 'Dispositivo Web'),
            contract_signature_image = p_signature_image,
            contract_snapshot = v_snapshot,
            updated_at = v_now
        WHERE id = v_order.id;

        INSERT INTO order_audit_logs (
            order_id,
            tenant_id,
            user_id,
            user_name,
            user_role,
            action_message,
            stage_from,
            stage_to,
            created_at
        ) VALUES (
            v_order.id,
            v_order.tenant_id,
            NULL,
            trim(p_signer_name),
            'cliente_signatario',
            'Contrato v' || COALESCE(v_order.contract_version, 1) || ' assinado eletronicamente por ' || trim(p_signer_name) || ' (CPF: ' || trim(p_signer_cpf) || ').',
            v_order.current_stage,
            v_order.current_stage,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'current_stage', CASE WHEN v_advanced THEN 'medicao' ELSE v_order.current_stage END,
        'contract_status', 'assinado',
        'contract_version', COALESCE(v_order.contract_version, 1),
        'signed_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_contract_signature(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 11. Atualizar get_store_orders para expor todos os campos contratuais e do cliente ao ERP
CREATE OR REPLACE FUNCTION public.get_store_orders(p_tenant_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_tenant_id UUID;
    v_is_admin BOOLEAN;
    v_is_member_or_owner BOOLEAN;
    v_effective_tenant_ids UUID[];
    v_orders JSONB;
BEGIN
    v_user_tenant_id := public.current_tenant_id();
    v_is_admin := public.is_platform_admin();

    SELECT EXISTS (
        SELECT 1 FROM public.tenants 
        WHERE (p_tenant_id IS NULL OR id = p_tenant_id)
          AND (
            owner_id = auth.uid() 
            OR lower(owner_email) = lower(COALESCE(auth.jwt()->>'email', ''))
            OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
          )
        UNION
        SELECT 1 FROM public.store_members
        WHERE user_id = auth.uid()
          AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          AND is_active = true
        UNION
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          AND is_active = true
    ) INTO v_is_member_or_owner;

    IF v_is_admin THEN
        IF p_tenant_id IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[p_tenant_id];
        ELSE
            SELECT array_agg(id) INTO v_effective_tenant_ids FROM public.tenants;
        END IF;
    ELSIF v_is_member_or_owner THEN
        IF p_tenant_id IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[p_tenant_id];
        ELSE
            SELECT array_agg(DISTINCT t_id) INTO v_effective_tenant_ids
            FROM (
                SELECT id AS t_id FROM public.tenants 
                WHERE owner_id = auth.uid() 
                   OR lower(owner_email) = lower(COALESCE(auth.jwt()->>'email', ''))
                   OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
                UNION
                SELECT tenant_id AS t_id FROM public.store_members WHERE user_id = auth.uid() AND is_active = true
                UNION
                SELECT tenant_id AS t_id FROM public.users WHERE id = auth.uid() AND is_active = true
            ) sub WHERE t_id IS NOT NULL;
        END IF;
    ELSIF v_user_tenant_id IS NOT NULL THEN
        v_effective_tenant_ids := ARRAY[v_user_tenant_id];
    ELSE
        IF p_tenant_id IS NOT NULL THEN
            v_effective_tenant_ids := ARRAY[p_tenant_id];
        ELSE
            SELECT array_agg(id) INTO v_effective_tenant_ids FROM public.tenants;
        END IF;
    END IF;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', o.order_number,
                'uuid', o.id,
                'orderNumber', o.order_number,
                'tenantId', o.tenant_id,
                'storeId', o.tenant_id,
                'leadId', a.lead_id,
                'assignmentId', o.lead_assignment_id,
                'clientName', o.client_name,
                'phone', COALESCE(NULLIF(trim(o.client_phone), ''), l.whatsapp, l.phone),
                'clientEmail', COALESCE(NULLIF(trim(o.client_email), ''), l.email),
                'clientCpf', COALESCE(NULLIF(trim(o.client_cpf), ''), l.cpf),
                'clientRg', COALESCE(NULLIF(trim(o.client_rg), ''), l.rg),
                'clientCep', COALESCE(NULLIF(trim(o.client_cep), ''), l.cep),
                'sellerName', COALESCE(NULLIF(trim(o.seller_name), ''), 'Consultor Comercial'),
                'address', o.delivery_address,
                'billingAddress', COALESCE(NULLIF(trim(o.billing_address), ''), l.billing_address),
                'installationAddress', COALESCE(NULLIF(trim(o.installation_address), ''), l.installation_address, o.billing_address),
                'desiredDeadline', COALESCE(NULLIF(trim(o.desired_deadline), ''), l.desired_deadline),
                'city', COALESCE(NULLIF(trim(o.client_city), ''), l.city_name, split_part(o.delivery_address, ' / ', 1)),
                'state', COALESCE(NULLIF(trim(o.client_state), ''), l.state_uf, split_part(o.delivery_address, ' / ', 2)),
                'environment', o.environment_description,
                'totalValue', o.total_value,
                'contractedValue', COALESCE(o.contracted_value, o.total_value),
                'estimatedBudget', COALESCE(o.estimated_budget, o.total_value),
                'targetDeliveryDate', o.target_delivery_date,
                'completedAt', o.completed_at,
                'currentStage', o.current_stage,
                'stageNotes', o.stage_notes,
                'hasPendingIssues', o.has_pending_issues,
                'pendingNotes', o.pending_notes,
                'medicaoDone', o.medicao_done,
                'projectApproved', o.project_approved,
                'producaoDone', o.producao_done,
                'montagemDone', o.montagem_done,
                'clientConfirmedAceite', o.client_confirmed_aceite,
                'paymentAllocations', o.payment_allocations,
                'commercialProposal', o.commercial_proposal,
                'orderNotes', o.order_notes,
                'contractStatus', o.contract_status,
                'contractToken', o.contract_token,
                'contractVersion', COALESCE(o.contract_version, 1),
                'contractSnapshot', o.contract_snapshot,
                'contractSignedAt', o.contract_signed_at,
                'contractSignedByName', o.contract_signed_by_name,
                'contractSignedByCpf', o.contract_signed_by_cpf,
                'contractSignatureIp', o.contract_signature_ip,
                'contractSignatureImage', o.contract_signature_image,
                'contractPdfUrl', o.contract_pdf_url,
                'createdAt', o.created_at,
                'updatedAt', o.updated_at,
                'documents', (
                    SELECT COALESCE(
                        jsonb_agg(
                            jsonb_build_object(
                                'id', d.id,
                                'stage', d.stage,
                                'docType', d.doc_type,
                                'fileName', d.file_name,
                                'filePath', d.file_path,
                                'fileSizeBytes', d.file_size_bytes,
                                'mimeType', d.mime_type,
                                'authorName', d.author_name,
                                'createdAt', d.created_at
                            ) ORDER BY d.created_at DESC
                        ), '[]'::jsonb
                    )
                    FROM order_documents d
                    WHERE d.order_id = o.id
                ),
                'timeline', (
                    SELECT COALESCE(
                        jsonb_agg(
                            jsonb_build_object(
                                'id', lg.id,
                                'user', lg.user_name,
                                'userRole', lg.user_role,
                                'action', lg.action_message,
                                'stageFrom', lg.stage_from,
                                'stageTo', lg.stage_to,
                                'timestamp', lg.created_at
                            ) ORDER BY lg.created_at DESC
                        ), '[]'::jsonb
                    )
                    FROM order_audit_logs lg
                    WHERE lg.order_id = o.id
                )
            )
            ORDER BY o.created_at DESC
        ),
        '[]'::jsonb
    ) INTO v_orders
    FROM orders o
    LEFT JOIN lead_assignments a ON a.id = o.lead_assignment_id
    LEFT JOIN leads l ON l.id = a.lead_id
    WHERE o.tenant_id = ANY(v_effective_tenant_ids);

    RETURN jsonb_build_object(
        'success', true,
        'tenant_ids', v_effective_tenant_ids,
        'orders', v_orders
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_store_orders(UUID) TO authenticated, anon, service_role;

