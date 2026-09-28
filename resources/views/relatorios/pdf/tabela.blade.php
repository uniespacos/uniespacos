@extends("relatorios.pdf.layout")

@section("conteudo")
    <div class="conteudo">
        {{-- 1. Quadro de Filtros Aplicados --}}
        @if (! empty($dados->filtrosAplicados))
            <div class="filtros-box">
                <div class="filtros-titulo">Escopo e Parâmetros da Análise</div>
                <div>
                    @foreach ($dados->filtrosAplicados as $chave => $valor)
                        <div class="filtro-item">
                            <strong>{{ $chave }}:</strong> {{ $valor }}
                        </div>
                    @endforeach
                </div>
            </div>
        @endif

        {{-- 2. Painel de Indicadores Consolidados (Sumário / KPIs) --}}
        @if (! empty($dados->sumario))
            <div class="secao-titulo">1. Painel de Indicadores Consolidados</div>
            @php
                $chavesSumario = array_keys($dados->sumario);
                $chunks = array_chunk($chavesSumario, 4);
            @endphp
            @foreach ($chunks as $chunk)
                <table class="kpi-grid">
                    <tr>
                        @foreach ($chunk as $chave)
                            <td class="kpi-card" style="width: {{ 100 / max(1, count($chunk)) }}%;">
                                <div class="kpi-card-title">{{ $chave }}</div>
                                <div class="kpi-card-value">{{ $dados->sumario[$chave] }}</div>
                            </td>
                        @endforeach
                    </tr>
                </table>
            @endforeach
        @endif

        {{-- 3. Tabela Analítica de Destaques / Amostragem Estratégica --}}
        <div class="secao-titulo">2. Destaques Analíticos do Período</div>

        <table class="dados-tabela">
            <thead>
                <tr>
                    @foreach ($dados->colunas as $coluna)
                        <th style="width: {{ $coluna->largura }}%;">{{ $coluna->rotulo }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @forelse ($linhasAmostra as $linha)
                    <tr>
                        @foreach ($dados->colunas as $coluna)
                            <td>{{ $linha[$coluna->chave] ?? "—" }}</td>
                        @endforeach
                    </tr>
                @empty
                    <tr>
                        <td colspan="{{ count($dados->colunas) }}" style="text-align: center; padding: 12px; color: #64748b;">
                            Nenhum registro localizado para os filtros informados.
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        @if ($totalOmitidas > 0)
            <div class="nota-executiva">
                <strong>Nota Executiva:</strong> Exibindo os <strong>{{ count($linhasAmostra) }} principais registros</strong> para visualização condensada em reunião (total de <strong>{{ $dados->totalLinhas() }}</strong> registros no período). Para acesso à base cadastral integral com todos os dados brutos, utilize a exportação em <strong>Planilha Excel (XLSX)</strong> ou <strong>CSV</strong>.
            </div>
        @endif

        {{-- 4. Quadro de Deliberação e Assinaturas Institucionais --}}
        <div class="secao-titulo" style="margin-top: 15px;">3. Deliberação & Validação Institucional</div>
        <table class="assinaturas-box">
            <tr>
                <td>
                    <div class="linha-assinatura">Gestão / Coordenação Responsável</div>
                    <div class="cargo-assinatura">UniEspaços &bull; UESB</div>
                </td>
                <td>
                    <div class="linha-assinatura">Direção Institucional / Colegiado</div>
                    <div class="cargo-assinatura">Apreciação em Reunião Executiva</div>
                </td>
            </tr>
        </table>
    </div>
@endsection
