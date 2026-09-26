import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether, Image
)

def create_pdf(filename):
    # A4 Page setup (210mm x 297mm)
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=8 * mm,
        bottomMargin=8 * mm
    )

    story = []

    # Palette
    HEADER_BG = colors.HexColor('#0f081c') # Sleek dark purple matching the New Code studio logo brand
    CARD_BG = colors.HexColor('#f8fafc')
    TEXT_DARK = colors.HexColor('#0f172a')
    TEXT_MUTED = colors.HexColor('#475569')
    PURPLE_ACCENT = colors.HexColor('#7c3aed')
    BORDER_COLOR = colors.HexColor('#e2e8f0')

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=TEXT_DARK,
        spaceAfter=2
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=TEXT_MUTED,
        spaceAfter=6
    )

    section_heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=TEXT_DARK,
        spaceBefore=5,
        spaceAfter=3
    )

    intro_body_style = ParagraphStyle(
        'IntroBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.2,
        leading=11.2,
        textColor=TEXT_MUTED,
        spaceAfter=6
    )

    pillar_title_style = ParagraphStyle(
        'PillarTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_DARK,
        spaceAfter=2
    )

    pillar_desc_style = ParagraphStyle(
        'PillarDesc',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.2,
        textColor=TEXT_MUTED
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=TEXT_DARK
    )

    col1_title_style = ParagraphStyle(
        'Col1Title',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11.5,
        textColor=TEXT_DARK,
        spaceAfter=2
    )

    price_style = ParagraphStyle(
        'PriceVal',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=12.5,
        textColor=TEXT_DARK,
        spaceAfter=1
    )

    price_monthly_style = ParagraphStyle(
        'PriceMonthlyVal',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=12.5,
        textColor=PURPLE_ACCENT,
        spaceAfter=1
    )

    contract_body_style = ParagraphStyle(
        'ContractBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.6,
        leading=10.5,
        textColor=TEXT_MUTED,
        spaceAfter=3.5
    )

    sig_name_style = ParagraphStyle(
        'SigName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11.5,
        textColor=TEXT_DARK
    )

    sig_role_style = ParagraphStyle(
        'SigRole',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=TEXT_MUTED
    )

    # 1. Header Banner with Official New Code Studio Logo
    logo_path = '/Users/macos/Desktop/Projeto App Para Loja de Moveis MVP/public/new_code_studio_logo.png'
    logo_img = Image(logo_path, width=46 * mm, height=11.83 * mm)

    header_right_html = """
    <para align="right">
    <font color="#c4b5fd" size="8.5"><b>PROPOSTA COMERCIAL EXECUTIVA</b></font><br/>
    <font color="#e9d5ff" size="7.5"><b>Cliente:</b> Adriano Jr. &nbsp;|&nbsp; <b>Data:</b> Agosto de 2026</font>
    </para>
    """

    header_table = Table([[
        logo_img,
        Paragraph(header_right_html, styles['Normal'])
    ]], colWidths=[93 * mm, 93 * mm])

    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HEADER_BG),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ]))

    story.append(header_table)
    story.append(Spacer(1, 8))

    # 2. Document Main Title
    story.append(Paragraph("Plataforma PlanejaFácil — Ecossistema SaaS para Móveis Planejados", title_style))
    story.append(Paragraph("Apresentação de solução tecnológica, infraestrutura e proposta de desenvolvimento.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceBefore=0, spaceAfter=6))

    # 3. Visão Geral e Apresentação do Produto
    story.append(Paragraph("SOBRE A PLATAFORMA", section_heading_style))
    story.append(Paragraph(
        "O <b>PlanejaFácil</b> é uma solução tecnológica completa (end-to-end) projetada para conectar consumidores finais que desejam orçar móveis planejados às lojas físicas parceiras credenciadas. A plataforma elimina a necessidade de medições complexas pelo cliente no primeiro contato e entrega estimativas precisas em menos de 2 minutos, funcionando como uma potente <b>máquina de captação e qualificação de leads B2B</b>.",
        intro_body_style
    ))

    # 4. Pilares da Solução (Cards de Escopo)
    p1 = Paragraph("<b>1. Simulador Interativo (Consumidor B2C)</b>", pillar_title_style)
    d1 = Paragraph("Interface ultra-simples e ágil. O consumidor seleciona os cômodos (Cozinha, Quarto, Sala, etc.), define a quantidade de paredes (A/B/C/D), indica os móveis desejados e escolhe os padrões de acabamento e qualidade. Ao final, gera uma estimativa de preço confiável e permite baixar a <b>Proposta Técnica em PDF</b>.", pillar_desc_style)

    p2 = Paragraph("<b>2. Painel do Lojista Parceiro (CRM B2B)</b>", pillar_title_style)
    d2 = Paragraph("Portal exclusivo para gerentes e consultores das lojas credenciadas (ex.: Smarth House). Recebe leads qualificados em tempo real filtrados por região/cidade, permite <b>alteração manual de status</b> (Novo, Em Atendimento, Orçado, Venda Realizada), detalhamento do projeto e exportação de relatórios.", pillar_desc_style)

    p3 = Paragraph("<b>3. Painel Master do Dono do SaaS (Admin)</b>", pillar_title_style)
    d3 = Paragraph("Central administrativa estratégica para gestão global do negócio. Permite o cadastro e controle de unidades parceiras, mapa interativo de distribuição de projetos pelo Brasil e <b>indicadores financeiros dinâmicos (MRR, ARR e ticket médio)</b>.", pillar_desc_style)

    pillars_table_data = [
        [p1, p2, p3],
        [d1, d2, d3]
    ]

    pillars_table = Table(pillars_table_data, colWidths=[62 * mm, 62 * mm, 62 * mm])
    pillars_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, BORDER_COLOR),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ]))

    story.append(pillars_table)
    story.append(Spacer(1, 6))

    # Section 1: Opções de Orçamento
    story.append(Paragraph("1. OPÇÕES DE ORÇAMENTO &amp; INVESTIMENTO", section_heading_style))
    story.append(Paragraph("Apresentamos duas alternativas comerciais para o desenvolvimento e implantação do projeto:", intro_body_style))

    opt1_col1 = Paragraph("<b>Opção 1 — Sistema Web &amp; PWA</b><br/><font color='#4b5563'>Plataforma web responsiva para computadores e smartphones, simulador interativo multi-ambientes, área do cliente/lojista e painel administrativo master.</font>", col1_title_style)
    opt1_col2 = Paragraph("<font size='10.5'><b>R$ 8.500,00</b></font><br/><font color='#6b7280' size='7'>Pagamento por etapas</font>", price_style)
    opt1_col3 = Paragraph("<font color='#7c3aed' size='10.5'><b>R$ 650,00</b></font><font color='#6b7280' size='7'> /mês</font><br/><font color='#6b7280' size='7'>Permanência min. 6 meses</font>", price_monthly_style)

    opt2_col1 = Paragraph("<b>Opção 2 — Aplicativo Mobile Nativo (Android &amp; iOS)</b><br/><font color='#4b5563'>Aplicativos publicados na Google Play Store e Apple App Store, notificações push integradas, gestão de contas de desenvolvedor e painel web administrativo master.</font>", col1_title_style)
    opt2_col2 = Paragraph("<font size='10.5'><b>R$ 16.500,00</b></font><br/><font color='#6b7280' size='7'>Pagamento por etapas</font>", price_style)
    opt2_col3 = Paragraph("<font color='#7c3aed' size='10.5'><b>R$ 1.300,00</b></font><font color='#6b7280' size='7'> /mês</font><br/><font color='#6b7280' size='7'>Inclusas licenças dev &amp; suporte</font>", price_monthly_style)

    options_data = [
        [
            Paragraph("MODALIDADE / ESCOPO", table_header_style),
            Paragraph("DESENVOLVIMENTO &amp;<br/>IMPLANTAÇÃO", table_header_style),
            Paragraph("MENSALIDADE<br/>(SUPORTE &amp; NUVEM)", table_header_style)
        ],
        [opt1_col1, opt1_col2, opt1_col3],
        [opt2_col1, opt2_col2, opt2_col3]
    ]

    options_table = Table(options_data, colWidths=[96 * mm, 45 * mm, 45 * mm])
    options_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 1, TEXT_DARK),
        ('LINEBELOW', (0, 0), (-1, 0), 1, TEXT_DARK),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f9fafb')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('LINEBELOW', (0, 1), (-1, 1), 0.5, BORDER_COLOR),
        ('LINEBELOW', (0, 2), (-1, 2), 1, TEXT_DARK),
    ]))

    story.append(options_table)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceBefore=0, spaceAfter=6))

    # Section 2: Condições Comerciais
    story.append(Paragraph("2. CONDIÇÕES COMERCIAIS", section_heading_style))

    conditions = [
        ("Forma de Pagamento (Desenvolvimento):", "O valor de implantação da opção escolhida será faturado em 3 parcelas: <b>40% de entrada na assinatura da proposta</b>, <b>30% na entrega da versão para testes/homologação</b> e <b>30% na entrega e publicação final</b>."),
        ("Escopo da Mensalidade &amp; Permanência Mínima:", "A mensalidade remunera a infraestrutura em nuvem, banco de dados, segurança, disponibilidade dos servidores e suporte técnico contínuo. Possui prazo de permanência mínima de 6 meses a contar da entrega oficial do sistema."),
        ("Reajuste por Volume &amp; Escala:", "A mensalidade base cobre a operação de <b>até 100 Lojas Parceiras ativas e até 20.000 leads/mês</b>. Caso a plataforma ultrapasse esse limite, haverá um reajuste de <b>até 50%</b> sobre o valor da mensalidade de suporte para cobrir os custos de upgrade de infraestrutura em nuvem, banco de dados e servidores expandidos."),
        ("Limite de Escopo &amp; Alterações Pós-Entrega:", "O valor acordado contempla integralmente o escopo descrito nesta proposta. <b>Após a entrega e publicação oficial do sistema</b>, solicitações de novas funcionalidades ou alterações extras estarão sujeitas a um novo orçamento."),
        ("Propriedade do Projeto:", "Após a quitação integral do valor de desenvolvimento, a propriedade intelectual, base de dados e código-fonte pertencerão integralmente ao contratante (Adriano Jr.)."),
        ("Prazos e Validade:", "Prazo estimado de entrega de 45 a 60 dias úteis para Web PWA ou 60 a 75 dias úteis para App Mobile Nativo. Proposta válida por 15 dias.")
    ]

    for title, body in conditions:
        story.append(Paragraph(f"<b>{title}</b> {body}", contract_body_style))

    story.append(Spacer(1, 8))

    # Signatures Section
    sig_line = HRFlowable(width="100%", thickness=0.75, color=TEXT_DARK, spaceBefore=0, spaceAfter=3)
    
    sig_col1 = [
        sig_line,
        Paragraph("<b>Wilson</b>", sig_name_style),
        Paragraph("New Code Studio &nbsp;|&nbsp; <font color='#6b7280'>DESENVOLVIMENTO &amp; PROPOSTA</font>", sig_role_style)
    ]

    sig_col2 = [
        sig_line,
        Paragraph("<b>Adriano Jr.</b>", sig_name_style),
        Paragraph("PlanejaFácil &nbsp;|&nbsp; <font color='#6b7280'>ACEITE COMERCIAL</font>", sig_role_style)
    ]

    sig_table = Table([[sig_col1, sig_col2]], colWidths=[88 * mm, 88 * mm])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
    ]))

    story.append(KeepTogether([sig_table]))

    doc.build(story)

if __name__ == '__main__':
    target_path = '/Users/macos/Desktop/Projeto App Para Loja de Moveis MVP/proposta_planejafacil_v3.pdf'
    create_pdf(target_path)
    print("PDF generated successfully at:", target_path)
