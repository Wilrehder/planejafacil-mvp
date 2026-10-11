import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether, Image, PageBreak
)

def build_proposal_pdf(filename):
    # A4 Page setup (210mm x 297mm) - Generous, elegant spacing
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm
    )

    story = []

    # Palette
    HEADER_BG = colors.HexColor('#0f081c')      # Studio Dark
    BRAND_GREEN = colors.HexColor('#16a34a')    # PlanejaFácil Green
    CARD_BG = colors.HexColor('#f8fafc')        # Clean slate card
    TEXT_DARK = colors.HexColor('#0f172a')      # Text dark
    TEXT_MUTED = colors.HexColor('#475569')     # Text muted
    PURPLE_ACCENT = colors.HexColor('#7c3aed')  # Accent purple
    BORDER_COLOR = colors.HexColor('#cbd5e1')   # Border
    HIGHLIGHT_BG = colors.HexColor('#f0fdf4')   # Light green highlight

    styles = getSampleStyleSheet()

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=TEXT_DARK,
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=TEXT_MUTED,
        spaceAfter=12
    )

    section_heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=TEXT_DARK,
        spaceBefore=12,
        spaceAfter=8
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.2,
        leading=14,
        textColor=TEXT_MUTED,
        spaceAfter=8
    )

    card_title_style = ParagraphStyle(
        'CardTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=TEXT_DARK,
        spaceAfter=3
    )

    card_desc_style = ParagraphStyle(
        'CardDesc',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.8,
        leading=12.5,
        textColor=TEXT_MUTED
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=TEXT_DARK
    )

    price_style = ParagraphStyle(
        'PriceVal',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13.5,
        textColor=BRAND_GREEN,
        spaceAfter=1
    )

    contract_body_style = ParagraphStyle(
        'ContractBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.8,
        leading=13,
        textColor=TEXT_MUTED,
        spaceAfter=6
    )

    sig_name_style = ParagraphStyle(
        'SigName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=TEXT_DARK
    )

    sig_role_style = ParagraphStyle(
        'SigRole',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=TEXT_MUTED
    )

    # Header Banner Helper
    def get_header_table():
        logo_path = '/Users/macos/Desktop/Projeto App Para Loja de Moveis MVP/public/new_code_studio_logo.png'
        logo_img = Image(logo_path, width=52 * mm, height=13.38 * mm)

        header_right_html = """
        <para align="right">
        <font color="#c4b5fd" size="9.5"><b>PROPOSTA COMERCIAL &amp; ACORDO DE SERVIÇOS</b></font><br/>
        <font color="#e9d5ff" size="8"><b>Cliente:</b> Adriano Jr. (PlanejaFácil) &nbsp;|&nbsp; <b>Data:</b> Outubro de 2026</font>
        </para>
        """

        htable = Table([[logo_img, Paragraph(header_right_html, styles['Normal'])]], colWidths=[90 * mm, 92 * mm])
        htable.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), HEADER_BG),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ]))
        return htable

    # ==================== PAGE 1 ====================
    story.append(get_header_table())
    story.append(Spacer(1, 10))

    story.append(Paragraph("Plataforma PlanejaFácil — Móveis Sob Medida", title_style))
    story.append(Paragraph("Proposta Comercial de Desenvolvimento e Acordo de Prestação de Serviços Tecnológicos", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=BORDER_COLOR, spaceBefore=0, spaceAfter=10))

    # 1. VISÃO GERAL
    story.append(Paragraph("1. VISÃO GERAL DO PROJETO", section_heading_style))
    story.append(Paragraph(
        "O <b>PlanejaFácil</b> é uma plataforma desenvolvida para facilitar a estimativa de preços de móveis sob medida para o consumidor e conectar esses clientes diretamente às lojas parceiras. A solução automatiza o primeiro contato, permitindo que o cliente simule seu projeto de forma simples e que a loja receba leads qualificados para a equipe de vendas.",
        body_style
    ))
    story.append(Spacer(1, 4))

    # 2. MÓDULOS DA PLATAFORMA
    story.append(Paragraph("2. MÓDULOS DA PLATAFORMA", section_heading_style))

    # Módulo 1 Card
    m1_title = Paragraph("<b>Portal Consumidor (Simulador)</b>", card_title_style)
    m1_desc = Paragraph(
        "O cliente final simula o orçamento dos móveis por ambiente (Cozinha, Quarto, Sala, etc.), define as metragens e escolhe os acabamentos desejados. Ao final, obtém uma estimativa de preço rápida e pode baixar a proposta em PDF.",
        card_desc_style
    )
    c1_table = Table([[m1_title], [m1_desc]], colWidths=[182 * mm])
    c1_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(c1_table)
    story.append(Spacer(1, 8))

    # Módulo 2 Card
    m2_title = Paragraph("<b>Portal do Lojista (CRM &amp; ERP de Vendas)</b>", card_title_style)
    m2_desc = Paragraph(
        "Painel completo com <b>CRM</b> para os lojistas gerenciarem leads internos (da plataforma) e externos em funil Kanban, além de sistema <b>ERP</b> para controle e acompanhamento dos pedidos das lojas parceiras.",
        card_desc_style
    )
    c2_table = Table([[m2_title], [m2_desc]], colWidths=[182 * mm])
    c2_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(c2_table)
    story.append(Spacer(1, 8))

    # Módulo 3 Card
    m3_title = Paragraph("<b>Painel Admin Master</b>", card_title_style)
    m3_desc = Paragraph(
        "Central de controle para o proprietário da plataforma cadastrar unidades parceiras, gerenciar a fila de distribuição de leads por região e acompanhar as métricas financeiras do negócio em tempo real.",
        card_desc_style
    )
    c3_table = Table([[m3_title], [m3_desc]], colWidths=[182 * mm])
    c3_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(c3_table)
    story.append(Spacer(1, 10))

    # 3. ESCOPO & CONDIÇÕES FINANCEIRAS
    story.append(Paragraph("3. ESCOPO TÉCNICO E CONDIÇÕES FINANCEIRAS", section_heading_style))
    story.append(Paragraph(
        "A solução será entregue como <b>Plataforma Web Responsiva &amp; PWA</b>, permitindo acesso em computadores, tablets e smartphones.<br/>"
        "O investimento total de desenvolvimento é de <b>R$ 8.500,00</b>, faturado em 3 parcelas conforme as entregas:",
        body_style
    ))
    story.append(Spacer(1, 4))

    # Payment Table
    pay_header_1 = Paragraph("<b>ETAPA DO PROJETO</b>", table_header_style)
    pay_header_2 = Paragraph("<b>MARCO DE LIBERAÇÃO DO PAGAMENTO</b>", table_header_style)
    pay_header_3 = Paragraph("<b>VALOR (R$)</b>", table_header_style)

    r1_col1 = Paragraph("<b>1ª Parcela — Sinal &amp; Início</b>", ParagraphStyle('R1', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.8, textColor=TEXT_DARK))
    r1_col2 = Paragraph("Pago na assinatura deste contrato para início do desenvolvimento", body_style)
    r1_col3 = Paragraph("<b>R$ 2.000,00</b>", price_style)

    r2_col1 = Paragraph("<b>2ª Parcela — Versão para Testes</b>", ParagraphStyle('R2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.8, textColor=TEXT_DARK))
    r2_col2 = Paragraph("Pago na entrega da versão funcional (homologação) para testes do cliente", body_style)
    r2_col3 = Paragraph("<b>R$ 2.000,00</b>", price_style)

    r3_col1 = Paragraph("<b>3ª Parcela — Entrega Final</b>", ParagraphStyle('R3', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.8, textColor=TEXT_DARK))
    r3_col2 = Paragraph("Pago na entrega e publicação do produto final concluído", body_style)
    r3_col3 = Paragraph("<b>R$ 4.500,00</b>", price_style)

    tot_col1 = Paragraph("<b>INVESTIMENTO TOTAL DESENVOLVIMENTO</b>", ParagraphStyle('Tot', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=TEXT_DARK))
    tot_col2 = Paragraph("<b>Faturado em 3 parcelas atreladas às entregas do projeto</b>", ParagraphStyle('Tot2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, textColor=TEXT_MUTED))
    tot_col3 = Paragraph("<b>R$ 8.500,00</b>", ParagraphStyle('Tot3', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10.5, textColor=BRAND_GREEN))

    pay_table_data = [
        [pay_header_1, pay_header_2, pay_header_3],
        [r1_col1, r1_col2, r1_col3],
        [r2_col1, r2_col2, r2_col3],
        [r3_col1, r3_col2, r3_col3],
        [tot_col1, tot_col2, tot_col3]
    ]

    pay_table = Table(pay_table_data, colWidths=[62 * mm, 80 * mm, 40 * mm])
    pay_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('LINEABOVE', (0, 0), (-1, 0), 1, TEXT_DARK),
        ('LINEBELOW', (0, 0), (-1, 0), 1, TEXT_DARK),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, -1), (-1, -1), HIGHLIGHT_BG),
        ('LINEABOVE', (0, -1), (-1, -1), 1.2, BRAND_GREEN),
        ('LINEBELOW', (0, -1), (-1, -1), 1.2, BRAND_GREEN),
    ]))

    story.append(pay_table)

    # PAGE BREAK -> Clean Page 2 Transition
    story.append(PageBreak())

    # ==================== PAGE 2 ====================
    story.append(get_header_table())
    story.append(Spacer(1, 10))

    # 4. MENSALIDADE E SUPORTE
    story.append(Paragraph("4. MENSALIDADE DE NUVEM, MANUTENÇÃO E SUPORTE TÉCNICO", section_heading_style))

    cloud_desc = Paragraph(
        "<b>Valor Mensal: R$ 650,00 / mês</b> (Permanência mínima de 6 meses a contar da entrega final).<br/>"
        "• <b>Serviços Inclusos:</b> Hospedagem em nuvem, manutenção do banco de dados, backups diários de segurança e suporte técnico.<br/>"
        "• <b>Capacidade &amp; Escala:</b> A mensalidade cobre a operação de até 100 lojas parceiras e 200 leads por mês. Conforme acordado com o proprietário, esse valor poderá ser revisto em caso de superlotação do banco de dados antes dessa margem.",
        body_style
    )

    cloud_box = Table([[cloud_desc]], colWidths=[182 * mm])
    cloud_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#faf5ff')),
        ('BOX', (0, 0), (-1, -1), 0.5, PURPLE_ACCENT),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))

    story.append(cloud_box)
    story.append(Spacer(1, 6))

    # 5. TERMOS DO ACORDO DE PRESTAÇÃO DE SERVIÇOS (Cláusula 6ª removed per audio request)
    story.append(Paragraph("5. TERMOS DO ACORDO DE PRESTAÇÃO DE SERVIÇOS", section_heading_style))

    clauses = [
        ("Cláusula 1ª — Do Objeto:", " O presente instrumento tem por objeto a prestação de serviços de desenvolvimento tecnológico para a criação e implantação da plataforma <b>PlanejaFácil (Web/PWA)</b>, contendo o Simulador Consumidor, Portal do Lojista e Painel Admin Master."),
        
        ("Cláusula 2ª — Do Prazo e Entregas:", " O período de <b>30 a 45 dias é estipulado como o prazo máximo de entrega</b> a contar da assinatura e pagamento do sinal. Fica expressamente estabelecido que a CONTRATADA poderá concluir e entregar a plataforma <b>antecipadamente</b> a este prazo. O sistema passará por etapa de testes e homologação antes do lançamento final."),
        
        ("Cláusula 3ª — Das Condições de Pagamento:", " O CONTRATANTE efetuará o pagamento do valor total de <b>R$ 8.500,00</b> conforme as 3 parcelas descritas na Seção 3 (R$ 2.000,00 no sinal, R$ 2.000,00 na versão de testes e R$ 4.500,00 na entrega final)."),
        
        ("Cláusula 4ª — Da Propriedade do Código-Fonte:", " Após a quitação integral do valor de desenvolvimento (R$ 8.500,00), a propriedade intelectual, base de dados e o <b>código-fonte da plataforma pertencerão 100% ao CONTRATANTE (Adriano Jr. / PlanejaFácil)</b>."),
        
        ("Cláusula 5ª — Da Garantia e Suporte:", " A CONTRATADA garante o suporte técnico e a correção de eventuais falhas durante a vigência do contrato. Solicitações de novas funcionalidades não previstas no escopo inicial estarão sujeitas a orçamento complementar de comum acordo.")
    ]

    for title, desc in clauses:
        story.append(Paragraph(f"<b>{title}</b> {desc}", contract_body_style))

    # Generous spacing before signature block for DocuSign signatures
    story.append(Spacer(1, 48))

    # 6. SIGNATURES VIA DOCUSIGN
    sig_line = HRFlowable(width="100%", thickness=0.75, color=TEXT_DARK, spaceBefore=0, spaceAfter=4)

    sig_col1 = [
        sig_line,
        Paragraph("<b>Wilson</b>", sig_name_style),
        Paragraph("New Code Studio &nbsp;|&nbsp; CONTRATADA", sig_role_style),
        Paragraph("<font color='#6b7280' size='7.5'>Assinatura via DocuSign</font>", sig_role_style)
    ]

    sig_col2 = [
        sig_line,
        Paragraph("<b>Adriano Jr.</b>", sig_name_style),
        Paragraph("PlanejaFácil &nbsp;|&nbsp; CONTRATANTE", sig_role_style),
        Paragraph("<font color='#6b7280' size='7.5'>Assinatura via DocuSign</font>", sig_role_style)
    ]

    sig_table = Table([[sig_col1, sig_col2]], colWidths=[86 * mm, 86 * mm])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ]))

    story.append(KeepTogether([sig_table]))

    doc.build(story)

if __name__ == '__main__':
    target_path = '/Users/macos/Desktop/Projeto App Para Loja de Moveis MVP/proposta_planejafacil_v3.pdf'
    build_proposal_pdf(target_path)
    alt_path = '/Users/macos/Desktop/Projeto App Para Loja de Moveis MVP/proposta_contrato_planejafacil.pdf'
    build_proposal_pdf(alt_path)
    print("PDF successfully updated: Clause 6 removed!")
