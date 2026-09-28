<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>{{ $dados->titulo }} — Relatório Executivo UESB</title>
    <style>
        @page {
            margin: 22mm 15mm 20mm 15mm;
        }

        body {
            font-family: DejaVu Sans, Helvetica, Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.35;
            color: #1e293b;
            margin: 0;
            padding: 0;
        }

        header {
            position: fixed;
            top: -18mm;
            left: 0;
            right: 0;
            height: 15mm;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 3px;
        }

        .header-table {
            width: 100%;
            border-collapse: collapse;
        }

        .header-table td {
            border: none;
            padding: 0;
            vertical-align: middle;
        }

        .instituicao-nome {
            font-size: 10.5pt;
            font-weight: bold;
            color: #0f172a;
            letter-spacing: -0.2px;
        }

        .sistema-nome {
            font-size: 7.5pt;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .badge-tipo {
            font-size: 7.5pt;
            color: #0284c7;
            font-weight: bold;
            background-color: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 3px;
            padding: 2px 6px;
            text-transform: uppercase;
        }

        .document-title-block {
            margin-top: 2px;
            margin-bottom: 10px;
        }

        .titulo {
            font-size: 14pt;
            font-weight: bold;
            color: #0f172a;
            margin: 0 0 2px 0;
            letter-spacing: -0.3px;
        }

        .subtitulo {
            font-size: 9pt;
            color: #0284c7;
            font-weight: 600;
            margin: 0 0 6px 0;
        }

        .metadata-bar {
            font-size: 7.5pt;
            color: #64748b;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 4px 8px;
            margin-bottom: 10px;
        }

        .conteudo {
            margin: 0;
        }

        /* KPI Cards */
        .kpi-grid {
            width: 100%;
            border-collapse: separate;
            border-spacing: 6px;
            margin: 6px -6px 12px -6px;
            page-break-inside: avoid;
        }

        .kpi-card {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
        }

        .kpi-card-title {
            font-size: 7.5pt;
            color: #64748b;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 2px;
        }

        .kpi-card-value {
            font-size: 13pt;
            font-weight: bold;
            color: #0f172a;
        }

        .kpi-card-sub {
            font-size: 7pt;
            color: #94a3b8;
            margin-top: 1px;
        }

        /* Tabelas */
        table.dados-tabela {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }

        table.dados-tabela tr {
            page-break-inside: avoid;
        }

        table.dados-tabela thead {
            display: table-header-group;
        }

        table.dados-tabela th {
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 5px 6px;
            text-align: left;
            font-size: 7.5pt;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }

        table.dados-tabela td {
            border: 1px solid #e2e8f0;
            padding: 4px 6px;
            font-size: 7.5pt;
            color: #334155;
        }

        table.dados-tabela tbody tr:nth-child(even) {
            background-color: #f8fafc;
        }

        /* Filtros */
        .filtros-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 3px solid #0284c7;
            border-radius: 4px;
            padding: 6px 8px;
            margin-bottom: 10px;
            font-size: 8pt;
            page-break-inside: avoid;
        }

        .filtros-titulo {
            font-weight: bold;
            font-size: 7.5pt;
            color: #0f172a;
            margin-bottom: 3px;
            text-transform: uppercase;
        }

        .filtro-item {
            display: inline-block;
            margin-right: 12px;
            margin-bottom: 2px;
            color: #475569;
        }

        .filtro-item strong {
            color: #1e293b;
        }

        .secao-titulo {
            font-size: 9.5pt;
            font-weight: bold;
            color: #0f172a;
            margin: 12px 0 6px 0;
            padding-bottom: 2px;
            border-bottom: 1px solid #e2e8f0;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .nota-executiva {
            background-color: #eff6ff;
            border: 1px dashed #93c5fd;
            border-radius: 4px;
            padding: 6px 10px;
            margin-top: 8px;
            margin-bottom: 12px;
            font-size: 7.5pt;
            color: #1e40af;
            page-break-inside: avoid;
        }

        /* Assinaturas */
        .assinaturas-box {
            margin-top: 20px;
            width: 100%;
            border-collapse: collapse;
            page-break-inside: avoid;
        }

        .assinaturas-box td {
            width: 50%;
            border: none;
            padding: 10px 20px;
            text-align: center;
            vertical-align: bottom;
        }

        .linha-assinatura {
            border-top: 1px solid #64748b;
            margin-top: 35px;
            padding-top: 4px;
            font-size: 8pt;
            font-weight: bold;
            color: #0f172a;
        }

        .cargo-assinatura {
            font-size: 7pt;
            color: #64748b;
        }

        footer {
            position: fixed;
            bottom: -15mm;
            left: 0;
            right: 0;
            height: 10mm;
            border-top: 1px solid #e2e8f0;
            padding-top: 3px;
            font-size: 7pt;
            color: #94a3b8;
        }

        .footer-table {
            width: 100%;
            border-collapse: collapse;
        }

        .footer-table td {
            border: none;
            padding: 0;
        }
    </style>
</head>
<body>
    <header>
        <table class="header-table">
            <tr>
                <td style="width: 70%;">
                    <div class="instituicao-nome">Universidade Estadual do Sudoeste da Bahia — UESB</div>
                    <div class="sistema-nome">UniEspaços &bull; Sistema de Gestão de Espaços Físicos e Acadêmicos</div>
                </td>
                <td style="width: 30%; text-align: right;">
                    <span class="badge-tipo">Síntese para Reunião</span>
                </td>
            </tr>
        </table>
    </header>

    <div class="document-title-block">
        <div class="titulo">{{ $dados->titulo }}</div>
        @if ($dados->subtitulo)
            <div class="subtitulo">{{ $dados->subtitulo }}</div>
        @endif
        <div class="metadata-bar">
            <strong>Emissão:</strong> {{ $dados->geradoEm->setTimezone("America/Bahia")->format("d/m/Y \\à\\s H:i") }} &nbsp;|&nbsp;
            <strong>Emissor:</strong> {{ $dados->geradoPor }} &nbsp;|&nbsp;
            <strong>Volume Analisado:</strong> {{ $dados->totalLinhas() }} registros consolidados
        </div>
    </div>

    @yield("conteudo")

    <footer>
        <table class="footer-table">
            <tr>
                <td style="text-align: left;">
                    UniEspaços UESB &bull; Documento analítico gerado eletronicamente para fins de acompanhamento executivo.
                </td>
                <td style="text-align: right; width: 90px;">
                </td>
            </tr>
        </table>
    </footer>

    <script type="text/php">
        if ( isset($pdf) ) {
            $font = $pdf->get_font_family();
            $size = $pdf->get_font_size();
            $pdf->set_font($font, "", 7.5);
            $pdf->page_text(510, 815, "Página " . $pdf->get_page_number() . " de " . $pdf->get_page_count(), [], 7.5, [0.58, 0.64, 0.72]);
        }
    </script>
</body>
</html>
